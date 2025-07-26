/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import * as fs from "fs";
import * as path from "path";

export const typesDirectory = "./src/lib/trello/action/types/";
export const payloadsDirectory = "./test/lib/trello/action/types/_payloads/";
export const messagesDirectory = "./test/lib/trello/action/types/_messages/";

/**
 * Creates a map, where each key specifies a Trello action type, and values are
 * lists of filenames the names of which start with the type name.
 *
 * @param dirPath Directory path to read filenames from.
 * @returns A new map.
 */
function mapFileNamesToTypes(dirPath: string): Map<string, string[]> {
  const map: ReturnType<typeof mapFileNamesToTypes> = new Map();

  fs.readdirSync(dirPath)
    .forEach((value) => {
      /* Filter filenames starting with a capital letter. */
      if (!/^[A-Z]$/.test(value[0])) return;

      const fileName = path.parse(value).name;
      const typeName = path.parse(fileName).name;

      if (map.get(typeName) === undefined) {
        map.set(typeName, []);
      }

      map.get(typeName)!.push(fileName);
    });

  return map;
}

/**
 * Creates a map, where each key specifies a Trello action type, and values are
 * lists of objects representing JSON payloads parsed from files the names of
 * which are determined by concatenating the given directory path and filenames
 * in the given map.
 */
function readJSONWithMap(
  dirPath: string, map: ReturnType<typeof mapFileNamesToTypes>
): Map<string, object[]> {
  const JSONMap: ReturnType<typeof readJSONWithMap> = new Map();

  map.forEach((value, key) => {
    JSONMap.set(key, value.map((JSONFileName) => {
      const fileData = fs.readFileSync(
        dirPath + JSONFileName + ".json", "utf-8"
      );

      try {
        return JSON.parse(fileData);
      } catch (error) {
        let message = "unknown";
        if (error instanceof Error) {
          message = error.message;
        }

        throw new Error(`Error parsing ${JSONFileName}.json, error: ${message}`);
      }
    }));
  });

  return JSONMap;
}

/**
 * Map of action type names for all Trello action types described in
 * the project. Keys and values are action type names.
 */
export const typeNames = mapFileNamesToTypes(typesDirectory);

/**
 * Map of pre-made JSON payload names for all Trello action types described in
 * the project. Keys are action type names, values are payload file names.
 */
export const payloadNames = mapFileNamesToTypes(payloadsDirectory);

/**
 * Map of pre-made JSON payloads for all Trello action types described in
 * the project. Keys are action type names, values are payload objects.
 */
export const payloads = readJSONWithMap(payloadsDirectory, payloadNames);

/**
 * Map of pre-made JSON message content filenames for all Trello action types
 * described in the project. Keys are action type names, values are message
 * content file names.
 */
export const messageNames = mapFileNamesToTypes(messagesDirectory);

/**
 * Map of pre-made JSON message contents for all Trello action types described
 * in the project. Keys are action type names, values are objects representing
 * message content.
 */
export const messages = readJSONWithMap(messagesDirectory, messageNames);

/**
 * Set of all action type names described in the project, both defined
 * (types implemented) and those featuring only pre-made JSON payload and/or
 * pre-made JSON messsage content for testing.
 */
export const allTypeNames = new Set<
  typeof typeNames extends Map<infer K, unknown> ? K : never
>([
  ...typeNames.keys(),
  ...payloadNames.keys(),
  ...messageNames.keys(),
]);

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