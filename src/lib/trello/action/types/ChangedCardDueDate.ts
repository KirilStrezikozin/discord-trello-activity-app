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
  EmbedBuilder,
  MessagePayload,
  WebhookMessageCreateOptions
} from "discord.js";

export default class ActionChangedCardDueDate extends Action {
  static schema = z.object({
    type: z.literal("updateCard"),

    data: z.object({
      old: z.object({
        due: z.string().datetime({ precision: 3 }),
      }),

      card: z.object({
        due: z.string().datetime({ precision: 3 }),
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

  private data?: z.infer<typeof ActionChangedCardDueDate.schema>;

  static override from(data: unknown): ActionBuildResult {
    const res = ActionChangedCardDueDate.schema.safeParse(data);
    if (!res.success) {
      return {
        success: false,
        action: null,
      }
    }

    const action = new ActionChangedCardDueDate();
    action.data = res.data;

    return {
      success: true,
      action: action,
    }
  }

  buildMessage(opts: MessageOptions): (string | MessagePayload | WebhookMessageCreateOptions) {
    const name = opts.member
      ? `${opts.member?.username} has changed a due date in a card`
      : "A due date has been changed in a card";

    const iconURL = opts.member ? `${opts.member?.avatarUrl}/60.png` : undefined;

    const embed = new EmbedBuilder()
      .setColor(opts.board?.prefs?.backgroundColor ?? null)
      .setThumbnail(opts.thumbnailUrl ?? null)
      .setAuthor({ name: name, iconURL: iconURL })
      .setTitle(this.data!.data.card.name)
      .setURL(`https://trello.com/c/${this.data!.data.card.shortLink}`)
      .setFields(
        { name: "Previous Due Date", value: this.data!.data.old.due, inline: true },
        { name: "New Due Date", value: this.data!.data.card.due, inline: true },
      )
      .setTimestamp()
      .setFooter(opts.board?.name ? { text: opts.board?.name } : null)
      ;

    return { embeds: [embed] };
  }
}