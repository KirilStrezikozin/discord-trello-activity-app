/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import axios from "axios";
import { WebhookOptions } from "./options";

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

/**
 * Returns whether the string value evaluates to true.
 * Truthy values are: "true", "yes", "on", any number other than zero.
 */
export function strToBoolean(s: string): boolean {
  const normalized = s.trim().toLowerCase();

  const num = Number(normalized);
  if (!isNaN(num)) {
    return num !== 0;
  }

  return normalized === "true" ||
    normalized === "yes" ||
    normalized === "on";
}

/**
 * Returns a new Axios instance as a helper to fetch Trello data using its API.
 *
 * @param opts Webhook app options.
 * @returns New Axios instance.
 */
export function newTrelloAPIAxiosInstance(opts: WebhookOptions) {
  return axios.create({
    method: "get",
    baseURL: "https://api.trello.com/1/",
    timeout: 10000,
    responseType: "json",
    params: {
      "key": opts.apiKey,
      "token": opts.token,
    },
  });
}