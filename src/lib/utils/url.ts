/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

/**
 * Get the full URL of the incoming request.
 *
 * If the request is coming through a proxy, returns the URL to the proxy's
 * host, with the search and the hash copied from the URL of the incoming
 * request. Otherwise, the URL property of the request.
 *
 * @param request The request to get the full URL of.
 * @returns The full URL.
 */
export function getFullRequestUrl(request: Request): URL {
  const url = new URL(request.url);
  const proxyHost = request.headers.get("x-forwarded-host");

  if (!proxyHost) {
    return url;
  }

  const protocol = request.headers.get("x-forwarded-proto") || "https";
  const proxyURL = new URL(`${protocol}://${proxyHost}`);

  const originalURL = new URL(url.pathname + url.search + url.hash, proxyURL);
  return originalURL;
}