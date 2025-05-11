/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import { Action } from "./types/base";

import AddCheckListToCard from "./types/AddCheckListToCard";
import AddMemberToCard from "./types/AddMemberToCard";
import AddedCardDueDate from "./types/AddedCardDueDate";
import AddedCardStartDate from "./types/AddedCardStartDate";
import ChangedCardDueDate from "./types/ChangedCardDueDate";
import ChangedCardDueDateReminder from "./types/ChangedCardDueDateReminder";
import ChangedCardStartDate from "./types/ChangedCardStartDate";
import ChangedDescriptionOfCard from "./types/ChangedDescriptionOfCard";
import CompletedCheckItem from "./types/CompletedCheckItem";
import CreateCard from "./types/CreateCard";
import CreateCheckItem from "./types/CreateCheckItem";
import DeletedCheckItem from "./types/DeletedCheckItem";
import MarkedCheckItemIncomplete from "./types/MarkedCheckItemIncomplete";
import MoveCardFromListToList from "./types/MoveCardFromListToList";
import MovedCardHigher from "./types/MovedCardHigher";
import MovedCardLower from "./types/MovedCardLower";
import MovedCheckItemHigher from "./types/MovedCheckItemHigher";
import MovedCheckItemLower from "./types/MovedCheckItemLower";
import RemoveCheckListFromCard from "./types/RemoveCheckListFromCard";
import RemoveMemberFromCard from "./types/RemoveMemberFromCard";
import RemovedCardDueDate from "./types/RemovedCardDueDate";
import RemovedCardStartDate from "./types/RemovedCardStartDate";
import RenamedCard from "./types/RenamedCard";
import RenamedCheckItem from "./types/RenamedCheckItem";

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
 * List of all Action types in the library.
 */
export const ActionTypes = [
  AddCheckListToCard,
  AddMemberToCard,
  AddedCardDueDate,
  AddedCardStartDate,
  ChangedCardDueDate,
  ChangedCardDueDateReminder,
  ChangedCardStartDate,
  ChangedDescriptionOfCard,
  CompletedCheckItem,
  CreateCard,
  CreateCheckItem,
  DeletedCheckItem,
  MarkedCheckItemIncomplete,
  MoveCardFromListToList,
  MovedCardHigher,
  MovedCardLower,
  MovedCheckItemHigher,
  MovedCheckItemLower,
  RemoveCheckListFromCard,
  RemoveMemberFromCard,
  RemovedCardDueDate,
  RemovedCardStartDate,
  RenamedCard,
  RenamedCheckItem,
];

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