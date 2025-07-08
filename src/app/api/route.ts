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
import { WebhookOptions } from "@/src/lib/options";
import { strToBoolean } from "@/src/lib/utils";

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
  const options = new WebhookOptions({
    secret: sp.get("secret"),
    webhookURL: sp.get("webhookURL"),
    thumbnailURL: sp.get("thumbnailURL"),
    sendErrors: (v => v ? strToBoolean(v) : null)(sp.get("sendErrors")),
    suppressErrors: (v => v ? strToBoolean(v) : null)(sp.get("suppressErrors")),
    iconSizePixels: (v => {
      const num = Number(v);
      if (!isNaN(num)) return num;
      return null;
    })(sp.get("iconSizePixels")),
  });

  if (log.IsDebug) {
    log.log("LOG: Request payload:", await request.text() || null);
  }

  /* Try instantiating a Discord webhook client. */
  let discordClient: WebhookClient;
  try {
    discordClient = new WebhookClient({ url: options.webhookURL });
  } catch (error) {
    log.error("ERROR:", error);
    return new Response(
      "Error: could not instantiate a Discord client to communicate with",
      { status: options.suppressErrors ? 200 : 500 }
    );
  }

  try {
    /* Verify and parse the request body. */
    const body = await verifiedRequestBody(request, options.secret);

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
      thumbnailUrl: options.thumbnailURL,
      /* Our middleware has rewritten a request to /api, let the user know. */
      errorText: request.headers.get("x-from-middleware")
        ? "Wrong webhook URL is used, see the guide" : null,
      iconSizePixels: options.iconSizePixels,
    }));

  } catch (error) {
    log.error("ERROR:", error);

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

    /* Report and send API server error as a Discord messages.
     * Response status code is not consumed for Trello to sense the
     * error and ultimately retry a request. */
    if (options.sendErrors && error instanceof Error) {
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