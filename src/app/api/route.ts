/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import { z } from "zod";
import * as log from "@/src/lib/log";

import { WebhookClient } from "discord.js";
import { RequestError } from "@/src/lib/error";
import { verifiedRequestBody } from "@/src/lib/crypto";
import { WebhookOptions } from "@/src/lib/options";

import ActionError from "@/src/lib/trello/action/types/error";

import {
  ActionWithData,
  MessageOptions
} from "@/src/lib/trello/action/types/base";

import {
  findActionFor,
  UnsupportedActivityError
} from "@/src/lib/trello/action/parse";

import {
  BoardModelSchema,
  WebhookRequestSchema
} from "@/src/lib/trello/action/schema";

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
export async function HEAD(_request: Request) {
  /* Upon Trello webhook creation, a HEAD HTTP request will be sent to our API server.
   * See https://developer.atlassian.com/cloud/trello/guides/rest-api/webhooks/#creating-a-webhook
   */
  return new Response(null, { status: 200 });
}

export async function POST(request: Request) {
  /* Read the request body and process webhook payload. */

  /* Extract options used by this route. */
  const sp = new URL(request.url).searchParams;
  const options = new WebhookOptions(sp, request);

  const bodyText = await request.text();
  log.log("Request payload:", bodyText || null);

  /* Try instantiating a Discord webhook client. */
  let discordClient: WebhookClient;
  try {
    discordClient = new WebhookClient({ url: options.webhookURL });
  } catch (error) {
    log.error(error);
    return new Response(
      "Error: could not instantiate a Discord client to communicate with",
      { status: options.suppressErrors ? 200 : 500 }
    );
  }

  let body: z.infer<typeof WebhookRequestSchema> | undefined;
  let board: z.infer<typeof BoardModelSchema> | undefined;
  let messageOptions: MessageOptions | undefined;

  try {
    /* Verify and parse the request body. */
    body = await verifiedRequestBody(request, bodyText, options.secret);

    /* If the model the webhook is subscribed to is a Trello board, Discord
     * message builder below gets more information about the activity. */
    board = BoardModelSchema.safeParse(body.model).data;

    /* Gather data for message builders to output a more descriptive content. */
    messageOptions = {
      member: body.action.memberCreator,
      board: (board) ? {
        id: board?.id,
        name: board?.name,
        prefs: {
          backgroundColor: board?.prefs.backgroundColor,
          backgroundDarkColor: board?.prefs.backgroundDarkColor,
          backgroundBottomColor: board?.prefs.backgroundBottomColor,
          backgroundTopColor: board?.prefs.backgroundTopColor,
        },
      } : null,
      thumbnailUrl: options.thumbnailURL,
      /* Our middleware has rewritten a request to /api, let the user know. */
      warningText: request.headers.get("x-from-middleware")
        ? "Incorrect webhook URL is used, see the guide." : null,
      iconSizePixels: options.iconSizePixels,
    };

    /* Try to find an Action type matching the Trello activity data.
     * `UnsupportedActivityError` will be thrown on failure. */
    const action = findActionFor({
      id: body.action.id,
      data: body.action.data,
      type: body.action.type,
      translationKey: body.action.display?.translationKey
    });

    if ("fetchData" in action) {
      await (action as ActionWithData).fetchData(options).catch((error) => {
        /* Fetching additional data is optional for action types, the message
         * would only be less descriptive on failure. Consequently, consume any
         * errors and do not consider them fatal. */
        log.error("action.fetchData:", error);
      });
    }

    /* Use the matched Action to build a Discord message from
     * Trello activity data it holds. Send the message. */
    await discordClient.send(action.buildMessage(messageOptions));

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
      status = options.suppressErrors ? 200 : 400;
    }

    else {
      message = "unknown error";
      status = options.suppressErrors ? 200 : 500;
    }

    /* Report and send API server error as a Discord messages. */
    if (options.sendErrors && error instanceof Error) {
      let actionData = undefined;
      if (error instanceof UnsupportedActivityError) {
        actionData = error.data;
      }

      const action = ActionError.from({ error: error, action: actionData });
      if (action.success) {
        /* Send a message describing the error to Discord.
         * In case `messageOptions` was assigned before the error was caught,
         * the sent message will be more descriptive. */
        await discordClient.send(
          action.action.buildMessage(messageOptions ?? {})
        );
      }
    }

    return new Response(`Error: ${message}`, { status: status });
  }

  return new Response("Success", { status: 200 });
}