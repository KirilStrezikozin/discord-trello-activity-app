/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import * as log from "./lib/log";

import { WebhookOptions } from "./lib/options";
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { method } = request;
  const { pathname, searchParams } = request.nextUrl;

  /* Extract options used by this route. */
  const options = new WebhookOptions(searchParams, request);

  /* Block requests to proxy endpoints if proxy use is disabled.
   *
   * Even though `searchParams` are passed to `options` creation above,
   * `options.useProxy` should only be set with an environment variable.
   */
  if (!options.useProxy && pathname.match(/^\/api\/proxy.*/)) {
    return new Response("This proxy endpoint is disabled", { status: 403 });
  }

  /* Rewrite requests to the static home page other than GET to the /api route.
   * Notify about a possibly misconfigured webhook url setting in Trello.
   *
   * This helps avoid a confusing issue with silently unhandled incoming Trello
   * activity when the user forgot that the webhook url should end with "/api",
   * and POST requests land at statically-generated root page instead.
   */
  if (pathname === "/" && method !== "GET") {
    log.warn(`Wrong webhook URL has been set. Redirecting ${request.method} to /api`);

    const response = NextResponse.rewrite(new URL(
      /* Ensure search and hash is propagated down the line. */
      "/api" + request.nextUrl.search + request.nextUrl.hash, /* path */
      request.nextUrl.origin /* base */
    ));

    /* Let the /api route know the response is rewritten. */
    response.headers.set("x-from-middleware", "true");
    return response;
  }
}

export const config = {
  matcher: '/(.*)',
};