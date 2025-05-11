/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

/**
 * Get the full URL of the incoming request. If the request is coming through
 * a proxy, returns the initial URL to the proxy's host. Otherwise, the URL
 * property of the request.
 *
 * @param request The request to get the full URL of.
 * @returns The full URL, including protocol, host and path.
 */
export function getFullRequestUrl(request: Request) {
  const proxyHost = request.headers.get("x-forwarded-host");

  if (!proxyHost) {
    return request.url;
  }

  const url = new URL(request.url);
  const protocol = request.headers.get("x-forwarded-proto") || "https";

  return `${protocol}://${proxyHost}${url.pathname}`;

}