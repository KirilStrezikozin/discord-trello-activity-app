/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import { WebhookClient } from "discord.js";
import { RequestError } from "@/src/lib/error";
import { verifiedRequestBody } from "@/src/lib/crypto";

import ActionError from "@/src/lib/trello/action/types/error";

import {
  findActionFor,
  UnsupportedActivityError
} from "@/src/lib/trello/action/parse";

import * as log from "@/src/lib/log";
import { BoardModelSchema } from "@/src/lib/trello/action/schema";

const TrelloWebhookSecret = process.env.TRELLO_WEBHOOK_SECRET ?? "";
const DiscordWebhookUrl = process.env.DISCORD_WEBHOOK_URL ?? "";

/**
 * True when catchable server errors should be
 * sent to discord in a special message format.
 */
const ErrorsAsDiscordMessages = Boolean(process.env.ERRORS_AS_DISCORD_MESSAGES);

/**
 * True when catchable server error codes should be
 * suppressed to avoid request retries.
 */
const SuppressErrors = Boolean(process.env.SUPPRESS_ERRORS);

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
export async function HEAD(_request: Request) {
  /* Upon Trello webhook creation, a HEAD HTTP request will be sent to our API server.
   * See https://developer.atlassian.com/cloud/trello/guides/rest-api/webhooks/#creating-a-webhook
   */
  return new Response(null, { status: 200 });
}

export async function POST(request: Request) {
  /* Read the request body and process webhook payload. */

  /* Try instantiating a Discord webhook client. */
  let discordClient: WebhookClient;
  try {
    discordClient = new WebhookClient({ url: DiscordWebhookUrl });
  } catch (error) {
    log.error(error);
    return new Response(
      "Error: could not instantiate a Discord client to communicate with",
      { status: SuppressErrors ? 200 : 500 }
    );
  }

  try {
    /* Verify and parse the request body. */
    const body = await verifiedRequestBody(request, TrelloWebhookSecret);

    /* Try to find an Action type matching the Trello activity data.
     * `UnsupportedActivityError` will be thrown on failure. */
    const action = findActionFor({
      data: body.action.data,
      type: body.action.type,
      translationKey: body.action.display?.translationKey
    });

    /* If the model the webhook is subscribed to is a Trello board, Discord
     * message builder below gets more information about the activity. */
    const board = BoardModelSchema.safeParse(body.model).data;

    /* Use the matched Action to build a Discord message from
     * Trello activity data it holds. Send the message. */
    await discordClient.send(action.buildMessage({
      member: body.action.memberCreator,
      board: {
        id: board?.id,
        name: board?.name,
        prefs: {
          backgroundColor: board?.prefs.backgroundColor,
          backgroundDarkColor: board?.prefs.backgroundDarkColor,
          backgroundBottomColor: board?.prefs.backgroundBottomColor,
          backgroundTopColor: board?.prefs.backgroundTopColor,
        },
      },
    }));

  } catch (error) {
    log.error(error);

    let message: string;
    let status: number; /* Error status code or 200 if `SuppressErrors` is true. */

    if (error instanceof RequestError) {
      message = error.message;
      /* Authentication and request verification errors are not suppressed.
       * Trello will retry the request with a backoff delay. */
      status = error.statusCode;
    }

    else if (error instanceof Error) {
      message = error.message;
      status = SuppressErrors ? 200 : 400;
    }

    else {
      message = "unknown error";
      status = SuppressErrors ? 200 : 500;
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
        await discordClient.send(action.action.buildMessage({}));
      }
    }


    return new Response(`Error: ${message}`, { status: status });
  }

  return new Response("Success", { status: 200 });
}