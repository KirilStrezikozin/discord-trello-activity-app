/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import { expect, describe, test } from "vitest";

import { findActionFor } from "@/src/lib/trello/action/parse";
import CreateCard from "@/src/lib/trello/action/types/CreateCard";

import payload from "./_payloads/CreateCard.json";
import { getPayloadsExceptFor } from "./common";

describe("CreateCard", () => {
  test("parse empty payload", () => {
    const res = CreateCard.from({});
    expect(res.success, "Parsing empty payload should fail").toBeFalsy();
  });

  test("parse", () => {
    const res = CreateCard.from(payload);
    expect(res.success, "Pre-made JSON payload should parse").toBeTruthy();
  });

  test("find and parse", () => {
    const res = findActionFor(payload);
    expect(
      res,
      "Pre-made JSON payload should resolve to a correct action type"
    ).toBeInstanceOf(CreateCard);
  });

  test("parse wrong payloads", () => {
    getPayloadsExceptFor("CreateCard").forEach(([, payload]) => {
      const res = CreateCard.from(payload);
      expect(res.success, "Parsing wrong payload should fail").toBeFalsy();
    });
  });
});