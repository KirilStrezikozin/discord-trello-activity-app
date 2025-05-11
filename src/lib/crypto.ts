/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import * as crypto from "crypto";
import { getFullRequestUrl } from "./utils";
import { WebhookRequestSchema } from "./trello/actions/schema";

export class RequestSignatureError extends Error {
  constructor() {
    super("Bad webhook request message signature");
    this.name = "RequestSignatureError";
  }
}

export class RequestSchemaError extends Error {
  constructor(public cause: string) {
    super(`Parsed webhook request body does not satisfy expected schema: ${cause}`);
    this.name = "RequestSchemaError";
  }
}

export class RequestMediaTypeError extends Error {
  constructor() {
    super("Unsupported media type. 'application/json' is allowed only");
    this.name = "RequestMediaTypeError";
  }
}

/**
 * Verify webhook request signature and schema. Returns a valid body object on
 * success and throws an error otherwise.
 *
 * Verification is carried out in three steps:
 *  1. Content type. Checks whether the
 *     request content type is application/json.
 *  1. Signature. Recreates a base64 digest of request's
 *     message hash and compares it with the X-Trello-Webhook request header.
 *  2. Schema. Validates that the request body can be parsed from JSON and
 *     satisfies expected response schema.
 *
 * @param request The request to verify.
 * @param secret Trello webhook secret.
 *
 * @throws {RequestMediaTypeError} When message content type was refused.
 * @throws {RequestSchemaError} When request body does not satisfy the schema.
 * @throws {RequestSignatureError} When request signature verification failed.
 *
 * @returns Verified request data object constructed from request body.
 */
export async function verifiedRequestBody(request: Request, secret: string) {
  /* Check request content type. */
  if (request.headers.get("content-type") !== "application/json") {
    throw new RequestMediaTypeError();
  }

  /* Check request message signature. */
  const base64Digest = (data: string) => {
    return crypto.createHmac("sha1", secret).update(data).digest("base64");
  }

  const body = await request.text();

  /* https://developer.atlassian.com/cloud/trello/guides/rest-api/webhooks/#webhook-signatures */
  const payload = body + getFullRequestUrl(request);
  const wantHash = base64Digest(payload);
  const gotHash = request.headers.get("x-trello-webhook");

  if (gotHash !== wantHash) {
    throw new RequestSignatureError();
  }

  /* Parse and validate request body schema. */
  try {
    return WebhookRequestSchema.parse(JSON.parse(body));
  } catch (error) {
    let cause = "unknown";
    if (error instanceof Error) {
      cause = error.message;
    }

    throw new RequestSchemaError(cause);
  }
}