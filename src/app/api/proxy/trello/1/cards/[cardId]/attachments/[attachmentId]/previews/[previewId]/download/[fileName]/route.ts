/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import * as log from "@/src/lib/log";

import axios, { AxiosHeaders, AxiosError } from "axios";
import { WebhookOptions } from "@/src/lib/options";

/**
 * Proxy serves publicly accessible static image content for Trello card
 * attachment previews by piping requests to Trello servers.
 */
export async function GET(
  request: Request,
  { params }: {
    params: Promise<{
      cardId: string,
      attachmentId: string,
      previewId: string,
      fileName: string
    }>
  },
) {
  const { cardId, attachmentId, previewId, fileName } = await params;

  /* Extract options used by this route. */
  const sp = new URL(request.url).searchParams;
  const options = new WebhookOptions(sp, request);

  try {
    const trelloResponse = await axios.get(
      `https://api.trello.com/1/cards/${cardId}/attachments/${attachmentId}/previews/${previewId}/download/${fileName}`,
      {
        validateStatus: (status: number) => status === 200,
        responseType: "stream", /* Do not buffer data. */
        headers: {
          Authorization: `OAuth oauth_consumer_key="${options.apiKey}", oauth_token="${options.token}"`,
        },
      }
    )

    if (!(trelloResponse.headers instanceof AxiosHeaders)) {
      throw new Error("Could not reconstruct headers");
    }

    const trelloHeaders = trelloResponse.headers as AxiosHeaders;

    /* Normalize HTTP header names to CamelCase. */
    trelloHeaders.normalize(true);

    /* Collect the necessary headers. */
    const headers: Record<string, string> = {};
    [
      "Content-Type",
      "Content-Length",
      "Last-Modified",
      "Etag",
      "Accept-Ranges",
    ].forEach((headerName) => {
      if (trelloHeaders.has(headerName)) {
        headers[headerName] = trelloHeaders.get(headerName)!.toString();
      }
    });

    /* Pipe Trello response data stream into our route's response. */
    return new Response(
      trelloResponse.data,
      {
        headers: {
          ...headers,
          "Cache-Control": "public, max-age=86400",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );

  } catch (error) {
    let status: number;
    let message: string;

    if (error instanceof AxiosError) {
      if (error.response) {
        /* Response with a status code other than the allowed one. */
        status = error.response.status;
        message = error.response.data;
      } else if (error.request) {
        /* Request was made but it had no response. */
        log.error(error);
        message = "No response";
        status = 500;
      } else {
        /* Error during request setup. */
        log.error(error);
        message = error.message || "Unknown error";
        status = 500;
      }
    } else if (error instanceof Error) {
      /* Error during request setup. */
      log.error(error);
      message = error.message || "Unknown error";
      status = 500;
    } else {
      log.error(error);
      message = "Unknown error";
      status = 500;
    }

    return new Response(message, { status: status });
  }
}