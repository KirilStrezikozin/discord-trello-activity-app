/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import * as fs from "fs";

import { z } from "zod";
import { expect, vi } from "vitest";

import {
  ActionCardSchema,
  ActionMemberSchema,
  CardAttachmentSchema,
} from "@/src/lib/trello/action/schema";

import { WebhookOptions } from "@/src/lib/options";
import { Action, ActionWithData } from "@/src/lib/trello/action/types/base";
import { readJSONSync } from "./common";

const fetchDataPayloadsDirectory = "./test/lib/trello/action/types/_fetchDataPayloads/";

/**
 * Map of data property names and their mocked values that
 * an action implementing `ActionWithData` interface may assign in
 * the result of calling `fetchData`.
 */
const propertyMap = {
  actionCardData: ActionCardSchema,
  actionMemberData: ActionMemberSchema,
  cardAttachmentData: CardAttachmentSchema,
} as const;

/**
 * Map type of data property names and types of
 * property values inferred from Zod schemas they satisfy.
 */
type PropertyMap = {
  [K in keyof typeof propertyMap]: z.infer<(typeof propertyMap)[K]> | undefined;
};

/**
 * Array of possible property names on actions implementing `ActionWithData`.
 */
const propertyNames = Object.keys(propertyMap) as (keyof PropertyMap)[];

/**
 * Type of action implementing `ActionWithData` and having a property `P`.
 * Use in assertions for type narrowing.
 */
type ActionWithProperty<
  T extends ActionWithData & Action,
  P extends keyof PropertyMap,
> = T & {
  [K in P]: PropertyMap[K];
};

/**
 * Type guard that determines whether an action implementing `ActionWithData`
 * interface has an initialized data property of the given name.
 *
 * @param action Action instance.
 * @param propertyName One in `propertyNames`.
 */
function hasActionProperty<
  P extends keyof PropertyMap
>(
  action: ActionWithData & Action,
  propertyName: P,
): action is ActionWithProperty<typeof action, P> {
  return Object.prototype.hasOwnProperty.call(action, propertyName);
}

/**
 * Set the value of a data property on the given action instance
 * and return true. If the action does not have such property initialized,
 * do nothing and return false.
 *
 * @param action Action instance implementing `ActionWithData` interface.
 * @param propertyName One in `propertyNames`.
 * @param data Data assignable to the property named `propertyName`.
 */
function setActionPropertyIfExists<
  P extends keyof PropertyMap
>(
  action: ActionWithData & Action,
  propertyName: P,
  data: PropertyMap[P],
): boolean {
  if (hasActionProperty(action, propertyName)) {
    (action as Record<P, PropertyMap[P]>)[propertyName] = data;
    return true;
  }

  return false;
}

/**
 * Defines a mocked fetchData method on the given action instance that
 * implements ActionWithData interface and calls it.
 *
 * Mocked implementation directly assigns mocked values to action's properties
 * holding additional data (these properties must be initialized for detection,
 * `undefined` will suffice). These mocked values are determined by the contents
 * of JSON payloads in the "_fetchDataPayloads" directory.
 *
 * If `payloadIndex` is given, this function tries to find a mocked JSON
 * payload containing the index value as suffix in the filename. If no such file
 * is found, it ultimately tries to find the one with no index in the filename.
 * `payloadIndex` may be associated with the payload index of mocked
 * Trello activity data currently tested.
 *
 * @param action Action instance implementing ActionWithData interface.
 * @param actionTypeName Action type name.
 * @param payloadIndex Mocked JSON payload file index.
 *
 * @returns Result returned by calling fetchData.
 */
export async function callFor(
  action: ActionWithData & Action,
  actionTypeName: string,
  payloadIndex?: number,
): ReturnType<ActionWithData["fetchData"]> {
  using spiedFetchData = vi.spyOn(action, "fetchData")
    .mockImplementation(
      async () => {
        const set = propertyNames.some((propertyName) => {
          /* Try finding the mocked payload for `actionTypeName` for
           * the value of this `propertyName`, for the payload
           * of `payloadIndex` currently being tested. */

          const fileNameBase = `${fetchDataPayloadsDirectory}${actionTypeName}.${propertyName}.json`;
          const fileNameIndex = (payloadIndex !== undefined)
            ? `${fetchDataPayloadsDirectory}${actionTypeName}.${propertyName}.${payloadIndex}.json`
            : fileNameBase;

          let data: PropertyMap[typeof propertyName];
          const parse = (fileName: string) => propertyMap[propertyName].parse(
            readJSONSync(fileName)
          );

          if (fs.existsSync(fileNameIndex)) {
            data = parse(fileNameIndex);
          } else if (fs.existsSync(fileNameBase)) {
            data = parse(fileNameBase);
          } else {
            /* No mocked payload for `fetchData` for
             * this `propertyName` found, no-op. */
            return false;
          }

          return setActionPropertyIfExists(action, propertyName, data);
        });

        if (!set) {
          throw new Error(
            `Mocking fetchData has no effect on "${actionTypeName}" instance, \
index "${payloadIndex}". This is not allowed.`
          );
        }
      }
    );

  await action.fetchData(new WebhookOptions());
  expect(spiedFetchData).toHaveBeenCalledOnce();
  expect(spiedFetchData).toHaveResolved();
}