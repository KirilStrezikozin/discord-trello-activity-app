/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import { expect, describe, test, vi } from "vitest";

import { ActionTypes } from "@/src/lib/trello/action/types";
import { findActionFor } from "@/src/lib/trello/action/parse";
import { OptionNames, WebhookOptions } from "@/src/lib/options";

import {
  Action,
  ActionWithData,
  getActionTypeFromSchema
} from "@/src/lib/trello/action/types/base";

import * as fetchDataMocks from "./fetchDataMocks";

import {
  allTypeNames,
  areJSONObjectsEqual,
  messages,
  payloads
} from "./common";

test("No duplicate type names", () => {
  const set = new Set(ActionTypes.map((ActionType) => ActionType.name));
  expect(set, "Duplicate type names found").toHaveLength(ActionTypes.length);
});

for (const ActionTypeName of allTypeNames.values()) {
  const ActionTypeMaybeUndefined = ActionTypes.find(
    (ActionType) => ActionType.name === `Action${ActionTypeName}`
  );

  const myPayloads = payloads.get(ActionTypeName) ?? [];
  const myMessages = messages.get(ActionTypeName) ?? [];

  describe.skipIf(ActionTypeMaybeUndefined === undefined)(ActionTypeName, () => {
    const ActionType = ActionTypeMaybeUndefined!;

    describe("Properties", () => {
      test("Type matches Type in Schema", () => {
        const schemaTyped = ActionType.schema as (
          Parameters<typeof getActionTypeFromSchema>[0]
        );

        expect(
          ActionType.type,
          `Property "type" should match the value of "type" in "schema"`
        ).toStrictEqual(
          Array.from(schemaTyped.def.innerType.shape.type.values.values())[0]
        );
      });
    });

    describe("Parsing", () => {
      test("Empty payload", () => {
        const res = ActionType.from({});
        expect(res.success, "Parsing empty payload should fail").toBeFalsy();
      });

      describe.runIf(myPayloads.length)("Direct", () => {
        myPayloads.forEach((payload, index) => {
          test(`Payload ${index}`, () => {
            const res = ActionType.from(payload);
            if (res.success) return;
            expect(
              res.success,
              `Pre-made JSON payload should parse, issues:\n${JSON.stringify(res.issues, null, 2)}`
            ).toBeTruthy();
          });
        });
      });

      describe.runIf(myPayloads.length)("Find type", () => {
        myPayloads.forEach((payload, index) => {
          test(`Payload ${index}`, () => {
            const res = findActionFor(payload);
            expect(
              res,
              "Pre-made JSON payload should resolve to a correct action type"
            ).toBeInstanceOf(ActionType);
          });
        });
      });

      test("Wrong payloads", () => {
        for (const [payloadName, notMyPayloads] of payloads.entries()) {
          if (payloadName === ActionTypeName) continue;

          notMyPayloads.forEach((notMyPayload, index) => {
            const res = ActionType.from(notMyPayload);
            expect(
              res.success,
              `Against ${payloadName}.${index}: Parsing wrong payload should fail`
            ).toBeFalsy();
          });
        };
      });
    });

    describe.runIf(myPayloads.length)("Build message", () => {
      /* Mock webhook app options. */
      const opts: Partial<Record<OptionNames, unknown>> = {
        "originUrl": "https://example.com",
      };

      myPayloads.forEach((payload, index) => {
        const message = (index >= myMessages.length) ? null : myMessages[index];

        test.skipIf(message === null)(
          `Payload & Message: ${index}`,
          async () => {
            const res = ActionType.from(payload);
            const action = res.action!;

            if ("fetchData" in action) {
              await fetchDataMocks.callFor(
                action as (ActionWithData & Action),
                ActionTypeName,
                opts as WebhookOptions,
                /* Mock wants to know which payload we use (in case a
                 * different effect of fetchData was desired for it). */
                index,
              );
            }

            const builtMessage = action.buildMessage({});

            expect(
              builtMessage?.embeds?.length,
              "Messsage should be an embed"
            ).toBeTruthy();

            const embed = builtMessage!.embeds![0];
            embed.setTimestamp(null); /* Ensure no timestamp value present. */

            const cleanEmbed = JSON.parse(JSON.stringify(embed.toJSON()));

            expect(cleanEmbed).toSatisfy(
              value => areJSONObjectsEqual(value, message),
              `Expected built message content to match:\n${JSON.stringify(message, null, 2)}`
            );
          }
        );
      });
    });
  });
}