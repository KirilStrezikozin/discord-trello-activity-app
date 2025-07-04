/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import * as fs from "fs";

const payloadDirectory = "./test/lib/trello/action/types/_payloads/";

/**
 * All pre-made JSON payloads for all Trello action types described in the
 * project. Each element is a tuple, where the first element is an action type
 * name, the second is the JSON payload ready for parsing.
 */
export const payloads: [string, object][] = fs.readdirSync(payloadDirectory)
  .filter((filePath) => (/^[A-Z]$/.test(filePath[0])))
  .map((filePath) => {
    const name = filePath.replace(/\.[^\.]*$/, "");
    const fileData = fs.readFileSync(payloadDirectory + filePath, "utf-8");

    try {
      const payload = JSON.parse(fileData);
      return [name, payload];
    } catch (error) {
      let message = "unknown";
      if (error instanceof Error) {
        message = error.message;
      }

      throw new Error(
        `Error parsing payload content for ${name}, error: ${message}`
      );
    }
  });

/**
 * Get a list of pre-made JSON payloads for all Trello action types described in
 * the project except the name of the given one.
 *
 * Each element in the returned list is a tuple, where the first element is an
 * action type name, the second is the JSON payload ready for parsing.
 *
 * @param skipName - Action type name to skip.
 * @returns - List of pre-made JSON payloads.
 */
export function getPayloadsExceptFor(skipName: string): [string, object][] {
  return payloads.filter(([name]) => name !== skipName);
}