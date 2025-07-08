/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import { z } from "zod";

import {
  Action,
  ActionBuildResult,
  MessageOptions
} from "./base";

import {
  MessagePayload,
  WebhookMessageCreateOptions
} from "discord.js";

export default class ActionArchivedCard extends Action {
  static schema = z.object({
    type: z.literal("updateCard"),

    data: z.object({
      old: z.object({
        closed: z.literal(false),
      }),

      card: z.object({
        closed: z.literal(true),
        dateClosed: z.string().datetime({ precision: 3 }),
        id: z.string().min(1),
        name: z.string().min(1),
        idShort: z.number(),
        shortLink: z.string(),
      }),

      board: z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        shortLink: z.string(),
      }),

      list: z.object({
        id: z.string().min(1),
        name: z.string().min(1),
      }),
    }),
  });

  private data?: z.infer<typeof ActionArchivedCard.schema>;

  static override from(data: unknown): ActionBuildResult {
    const res = ActionArchivedCard.schema.safeParse(data);
    if (!res.success) {
      return {
        success: false,
        action: null,
      }
    }

    const action = new ActionArchivedCard();
    action.data = res.data;

    return {
      success: true,
      action: action,
    }
  }

  buildMessage(_opts: MessageOptions): (string | MessagePayload | WebhookMessageCreateOptions) {
    return "";
  }
}