/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import { expect, vi } from "vitest";

import { WebhookOptions } from "@/src/lib/options";
import { ActionWithData } from "@/src/lib/trello/action/types/base";

import VoteOnCard from "@/src/lib/trello/action/types/VoteOnCard";

/**
 * Defines a mocked fetchData method on the given VoteOnCard action
 * instance and calls it.
 *
 * @param action Instance of VoteOnCard action type.
 * @returns Void promise.
 */
export async function callForVoteOnCard(
  action: ActionWithData & VoteOnCard
): Promise<void> {
  using spiedFetchData = vi.spyOn(action, "fetchData")
    .mockImplementation(
      async () => {
        action["actionCardData"] = undefined;
      }
    );

  await action.fetchData(new WebhookOptions());
  expect(spiedFetchData).toHaveBeenCalledOnce();
  expect(spiedFetchData).toHaveResolved();
}

/**
 * Defines a mocked fetchData method on the given action instance that
 * implements ActionWithData interface and calls it.
 *
 * @param action ActionWithData-like instance of action type.
 * @returns Result returned by calling fetchData.
 */
export async function callFor(
  action: ActionWithData & (
    VoteOnCard
  )
): ReturnType<ActionWithData["fetchData"]> {
  if (action instanceof VoteOnCard) await callForVoteOnCard(action);
}