/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import * as crypto from "crypto";
import { RequestError } from "./error";
import { getFullRequestUrl } from "./utils/url";
import { WebhookRequestSchema } from "./trello/action/schema";

export class RequestSignatureError extends RequestError {
  constructor() {
    super("Bad webhook request message signature", 401 /* Unauthorized. */);
    this.name = "RequestSignatureError";
  }
}

export class RequestSchemaError extends RequestError {
  constructor(public cause: string) {
    super(`Parsed webhook request body does not satisfy expected schema: ${cause}`, 422 /* Unprocessable content. */);
    this.name = "RequestSchemaError";
  }
}

export class RequestMediaTypeError extends RequestError {
  constructor() {
    super("Unsupported media type. 'application/json' is allowed only", 415 /* Unsupported media type. */);
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
 * @param bodyText Request body as string.
 * @param secret Trello webhook secret.
 *
 * @throws {RequestMediaTypeError} When message content type was refused.
 * @throws {RequestSchemaError} When request body does not satisfy the schema.
 * @throws {RequestSignatureError} When request signature verification failed.
 *
 * @returns Verified request data object constructed from request body.
 */
export async function verifiedRequestBody(
  request: Request, bodyText: string, secret: string
) {
  /* Check request content type. */
  if (request.headers.get("content-type") !== "application/json") {
    throw new RequestMediaTypeError();
  }

  /* Check request message signature. */
  const base64Digest = (data: string) => {
    return crypto.createHmac("sha1", secret).update(data).digest("base64");
  }

  /* https://developer.atlassian.com/cloud/trello/guides/rest-api/webhooks/#webhook-signatures */
  const payload = bodyText + getFullRequestUrl(request).toString();
  const wantHash = base64Digest(payload);
  const gotHash = request.headers.get("x-trello-webhook");

  if (gotHash !== wantHash) {
    throw new RequestSignatureError();
  }

  /* Parse and validate request body schema. */
  let obj: unknown;
  try {
    obj = JSON.parse(bodyText);
  } catch (error) {
    let cause = "unknown";
    if (error instanceof Error) {
      cause = error.message;
    }

    throw new RequestSchemaError(cause);
  }

  const res = WebhookRequestSchema.safeParse(obj);
  if (!res.success) {
    throw new RequestSchemaError(JSON.stringify(res.error.issues, null, 2));
  }

  return res.data;
}