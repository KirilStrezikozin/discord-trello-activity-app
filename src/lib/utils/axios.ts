/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import axios from "axios";
import { WebhookOptions } from "../options";

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