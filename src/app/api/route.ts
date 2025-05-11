/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import { RequestMediaTypeError, verifiedRequestBody } from "@/src/lib/crypto";
import { sendMessage } from "@/src/lib/discord";

import * as log from "@/src/lib/log";

const TrelloWebhookSecret = process.env.TRELLO_WEBHOOK_SECRET || "";
const DiscordWebhookUrl = process.env.DISCORD_WEBHOOK_URL || "";

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
export async function HEAD(_request: Request) {
  /* Upon Trello webhook creation, a HEAD HTTP request will be sent to our API server.
   * See https://developer.atlassian.com/cloud/trello/guides/rest-api/webhooks/#creating-a-webhook
   */
  return new Response(null, { status: 200 });
}

export async function POST(request: Request) {
  /* Read the request body and process webhook payload. */

  try {
    /* Verify and parse the request body. */
    const body = await verifiedRequestBody(request, TrelloWebhookSecret);

    sendMessage(DiscordWebhookUrl, JSON.stringify(body.action.data, null, 2));

  } catch (error) {
    log.error(error);

    let message: string;
    let status: number;

    if (error instanceof RequestMediaTypeError) {
      message = error.message;
      status = 415;
    }

    else if (error instanceof Error) {
      message = error.message;
      status = 400;
    }

    else {
      message = "unknown error";
      status = 400;
    }

    return new Response(`Error: ${message}`, { status: status });
  }

  return new Response("Success", { status: 200 });
}