/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import { WebhookClient } from "discord.js";
import { RequestMediaTypeError, verifiedRequestBody } from "@/src/lib/crypto";

import { ActionError } from "@/src/lib/trello/action/types/error";

import * as log from "@/src/lib/log";

const TrelloWebhookSecret = process.env.TRELLO_WEBHOOK_SECRET ?? "";
const DiscordWebhookUrl = process.env.DISCORD_WEBHOOK_URL ?? "";

/**
 * True when catchable server errors should be
 * sent to discord in a special message format.
 */
const ErrorsAsDiscordMessages = Boolean(process.env.ERRORS_AS_DISCORD_MESSAGES);

/**
 * Thrown if the webhook request contains Trello activity
 * data that cannot be handled.
 */
class UnsupportedActivityError extends Error {
  constructor(public data: unknown) {
    super("Unsupported activity type");
    this.name = "UnsupportedActivityError";
    this.data = data;
  }
}

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
export async function HEAD(_request: Request) {
  /* Upon Trello webhook creation, a HEAD HTTP request will be sent to our API server.
   * See https://developer.atlassian.com/cloud/trello/guides/rest-api/webhooks/#creating-a-webhook
   */
  return new Response(null, { status: 200 });
}

export async function POST(request: Request) {
  /* Read the request body and process webhook payload. */
  const discordClient = new WebhookClient({ url: DiscordWebhookUrl });

  try {
    /* Verify and parse the request body. */
    const body = await verifiedRequestBody(request, TrelloWebhookSecret);

    // const action = ActionMoveCardFromListToList.from(body.action.data);
    //
    // if (action.success) {
    //   const board = BoardModelSchema.safeParse(body.model).data;
    //
    //   discordClient.send(action.action.buildMessage({
    //     member: body.action.memberCreator,
    //     board: {
    //       id: board?.id,
    //       name: board?.name,
    //     },
    //   }));
    // }

    // TODO: add and use activity handlers (Actions).

    throw new UnsupportedActivityError({
      data: body.action.data,
      type: body.action.type,
      translationKey: body.action.display?.translationKey
    });

  } catch (error) {
    log.error(error);

    let message: string;
    let status: number;

    if (error instanceof RequestMediaTypeError) {
      message = error.message;
      status = 415; /* Unsupported content-type. */
    }

    else if (error instanceof Error) {
      message = error.message;
      status = 400;
    }

    else {
      message = "unknown error";
      status = 400;
    }

    /* Report and send API server error as a Discord messages.
     * Response status code is not consumed for Trello to sense the
     * error and ultimately retry a request. */
    if (ErrorsAsDiscordMessages && error instanceof Error) {
      let actionData = undefined;
      if (error instanceof UnsupportedActivityError) {
        actionData = error.data;
      }

      const action = ActionError.from({ error: error, action: actionData });
      if (action.success) {
        discordClient.send(action.action.buildMessage({}));
      }
    }


    return new Response(`Error: ${message}`, { status: status });
  }

  return new Response("Success", { status: 200 });
}