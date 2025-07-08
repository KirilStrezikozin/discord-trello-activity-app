/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import * as fs from "fs";
import * as path from "path";

const payloadDirectory = "./test/lib/trello/action/types/_payloads/";

/**
 * Map of pre-made JSON payload names for all Trello action types described in
 * the project. Keys are action type names, values are payload file names.
 */
export const payloadNames: Map<string, string[]> = new Map();
fs.readdirSync(payloadDirectory)
  .forEach((value) => {
    /* Filter filenames starting with a capital letter. */
    if (!/^[A-Z]$/.test(value[0])) return;
    const fileName = path.parse(value).name;
    const typeName = path.parse(fileName).name;
    payloadNames.set(typeName, payloadNames.get(typeName) ?? []);
    payloadNames.get(typeName)!.push(fileName);
  });

/**
 * Map of pre-made JSON payloads for all Trello action types described in
 * the project. Keys are action type names, values are payload objects.
 */
export const payloads: Map<string, object[]> = new Map();
payloadNames.forEach((value, key) => {
  payloads.set(key, value.map((payloadName) => {
    const fileData = fs.readFileSync(
      payloadDirectory + payloadName + ".json", "utf-8"
    );

    try {
      return JSON.parse(fileData);
    } catch (error) {
      let message = "unknown";
      if (error instanceof Error) {
        message = error.message;
      }

      throw new Error(`Error parsing ${payloadName}.json, error: ${message}`);
    }
  }));
});

/**
 * Returns an iterable of pre-made JSON payloads for all Trello action types
 * described in the project except the ones grouped by the given type name.
 *
 * @param skipName - Action type name to skip.
 * @returns Iterable of pre-made JSON payloads.
 */
export function* getPayloadsExceptFor(skipName: string): Generator<object, void, unknown> {
  for (const [key, values] of payloads.entries()) {
    if (key === skipName) continue;
    for (const x of values) yield x;
  }
}

/**
 * Returns true if the given plain JSON-like objects are equal.
 * Checks for similar keys and values, recursively.
 */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export function areJSONObjectsEqual(a: any, b: any): boolean {
  if (a === b) return true;
  else if (typeof a !== typeof b) return false;
  else if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!areJSONObjectsEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;

  for (const key of aKeys) {
    if (!b.hasOwnProperty(key)) return false;
    if (!areJSONObjectsEqual(a[key], b[key])) return false;
  }

  return true;
}