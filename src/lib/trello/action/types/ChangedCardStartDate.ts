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
  getMemberIcon,
  MessageOptions
} from "./base";

import { EmbedBuilder } from "discord.js";

export default class ActionChangedCardStartDate extends Action {
  static schema = z.object({
    id: z.string().min(1),
    type: z.literal("updateCard"),

    data: z.object({
      old: z.object({
        start: z.string().datetime({ precision: 3 }),
      }),

      card: z.object({
        start: z.string().datetime({ precision: 3 }),
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

  private data?: z.infer<typeof ActionChangedCardStartDate.schema>;

  static override from(data: unknown): ActionBuildResult {
    const res = ActionChangedCardStartDate.schema.safeParse(data);
    if (!res.success) {
      return {
        success: false,
        action: null,
      }
    }

    const action = new ActionChangedCardStartDate();
    action.data = res.data;

    return {
      success: true,
      action: action,
    }
  }

  protected buildMessageInner(
    embed: EmbedBuilder, opts: MessageOptions
  ): EmbedBuilder {
    const name = opts.member
      ? `${opts.member?.username} has changed a start date in a card`
      : "A start date has been changed in a card";

    embed = embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(this.data!.data.card.name)
      .setURL(`https://trello.com/c/${this.data!.data.card.shortLink}`)
      .addFields(
        {
          name: "Previous Start Date",
          value: this.data!.data.old.start,
          inline: true
        },
        {
          name: "New Start Date",
          value: this.data!.data.card.start,
          inline: true
        },
      )
      ;

    return embed;
  }
}