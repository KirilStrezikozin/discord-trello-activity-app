/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import { NextRequest, NextResponse } from "next/server";
import * as log from "./lib/log";

export function middleware(request: NextRequest) {
  /* Rewrite requests to the static home page other than GET to the /api route.
   * Notify about a possibly misconfigured webhook url setting in Trello.
   *
   * This helps avoid a confusing issue with silently unhandled incoming Trello
   * activity when the user forgot that the webhook url should end with "/api",
   * and POST requests land at statically-generated root page instead.
   */
  if (request.method !== "GET") {
    log.warn(`WARNING: Wrong webhook URL has been set. Redirecting ${request.method} to /api`);

    const response = NextResponse.rewrite(new URL("/api", request.url));
    /* Let the /api route know the response is rewritten. */
    response.headers.set("x-from-middleware", "true");
    return response;
  }
}

export const config = {
  matcher: '/',
};