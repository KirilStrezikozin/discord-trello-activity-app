/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import { Action } from "./types/base";
import { ActionTypes } from "./types";

/**
 * Thrown if the webhook request contains Trello activity
 * data that cannot be handled.
 */
export class UnsupportedActivityError extends Error {
  constructor(public data: unknown) {
    super("Unsupported activity type");
    this.name = "UnsupportedActivityError";
    this.data = data;
  }
}

/**
 * Find the Action type in the library the schema of which is satisfied by the
 * given data. Otherwise, an error is thrown.
 *
 * @param data Trello activity data to find a matching Action type for.
 * @returns Matched Action type from the ones defined in the library on success.
 *
 * @throws {UnsupportedActivityError} When failed to find a matching Action.
 */
export function findActionFor(data: unknown): Action {
  for (const at of ActionTypes) {
    const ActionInferred = at as (typeof Action);

    /* If the given data satisfies Action's schema, we found a match! */
    const res = ActionInferred.from(data);
    if (res.success) {
      return res.action;
    }
  }

  throw new UnsupportedActivityError(data);
}