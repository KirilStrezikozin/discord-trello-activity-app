/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import * as fs from "fs";

import { expect, MockedFunction, vi } from "vitest";

import { WebhookOptions } from "@/src/lib/options";
import { Action, ActionWithData } from "@/src/lib/trello/action/types/base";
import { readJSONSync } from "./common";
import { DataProperty } from "@/src/lib/trello/action/types/data";
import { AxiosInstance } from "axios";

const fetchDataPayloadsDirectory = "./test/lib/trello/action/types/_fetchDataPayloads/";

/**
 * Map of data property names that an action implementing `ActionWithData`
 * interface may assign in the result of calling `fetchData`.
 */
const dataPropertyNames = [
  "cardData",
  "memberData",
  "cardAttachmentData",
  "cardAttachmentPreviewProxy",
  "listCardsData",
  "checkListItemsData",
  "boardListsWithCardsData",
  "commentReactionsSummaryData",
  "listData",
  "boardData",
] as const;

/**
 * If the given action instance has properties of type `DataProperty`,
 * mocks the responses of Axios requests they make internally to fetch data,
 * and finally calls `action.fetchData()` before restoring all mocked
 * implementations to their original ones.
 *
 * Action's Data properties must be initialized for detection, `undefined`
 * will suffice). The mocked response values are determined by the contents
 * of JSON payloads in the "_fetchDataPayloads" directory. If `payloadIndex` is
 * given, a mocked response value of that index will be used. `payloadIndex`
 * may be associated with the payload index of mocked Trello activity data
 * currently tested.
 *
 * @param action Action instance implementing ActionWithData interface.
 * @param actionTypeName Action type name.
 * @param payloadIndex Mocked response value index.
 */
export async function callFor(
  action: ActionWithData & Action,
  actionTypeName: string,
  opts: WebhookOptions,
  payloadIndex?: number,
): ReturnType<ActionWithData["fetchData"]> {
  /* First, check if the given action instance even has data properties. */
  const hasDataProperties = dataPropertyNames.some(
    (name) => Object.hasOwn(action, name)
  );

  const fileName = `${fetchDataPayloadsDirectory}${actionTypeName}.json`;
  const fileExists = fs.existsSync(fileName);

  /* Error-checking. */
  if (!hasDataProperties && fileExists) {
    throw new Error(
      `No data properties on ${actionTypeName}, \
but ${fileName} with mocked values exists`
    );
  } else if (hasDataProperties && !fileExists) {
    throw new Error(
      `Data properties exist on ${actionTypeName}, \
but ${fileName} with mocked values does not`
    );
  } else if (!hasDataProperties && !fileExists) {
    throw new Error(
      `Mocking fetchData has no effect on "${actionTypeName}" instance, \
index "${payloadIndex}". This is not allowed. Perhaps the private property was \
not initialized.`
    );
  }

  /* File with mocked values exists and data properties on action exist. */
  const data = readJSONSync(fileName);

  /* Swap the original implementation of the method data properties use
   * to create their Axios instances with our spy. */
  const methodName = "newAxiosInstance";
  const original = DataProperty[methodName];
  DataProperty[methodName] = vi.fn(original);
  const spy = DataProperty[methodName] as MockedFunction<typeof original>;

  /* Prepare a mocked Axios instance for the spy to give to data properties. */
  const mockedAxiosInstance = vi.fn((url: string) => {
    /* Dispatch mocked data based on the request URL. */
    const dataBlock = (
      payloadIndex !== undefined
      && Array.isArray(data)
      && data.length > payloadIndex
    ) ? data[payloadIndex][url] : data[url];

    if (dataBlock === undefined) {
      return Promise.reject(`${fileName} does not define property '${url}'`);
    }
    return Promise.resolve({ data: dataBlock });
  });

  /* Data properties use the default and head methods on the Axios instance.
   * Mock their implementations as one for simplicity. */
  Object.defineProperty(mockedAxiosInstance, "head", {
    value: mockedAxiosInstance,
    configurable: true,
    enumerable: false,
    writable: true,
  });

  await spy.withImplementation(
    /* Data properties will use the mocked Axios instance our spy returns. */
    () => mockedAxiosInstance as unknown as AxiosInstance,
    async () => {
      using fetchDataSpy = vi.spyOn(action, "fetchData");
      await action.fetchData(opts);
      expect(fetchDataSpy).toHaveResolved();
    }
  );
}