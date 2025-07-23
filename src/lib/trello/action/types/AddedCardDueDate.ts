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

import { EmbedBuilder } from "discord.js";
import { getMemberIcon } from "./utils";

export default class ActionAddedCardDueDate extends Action {
  static schema = z.object({
    id: z.string().min(1),
    type: z.literal("updateCard"),

    data: z.object({
      old: z.object({
        due: z.null(),
      }),

      card: z.object({
        due: z.iso.datetime({ precision: 3 }),
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

  public static type = this.schema.shape.type.value;
  private data?: z.infer<typeof ActionAddedCardDueDate.schema>;

  static override from(data: unknown): ActionBuildResult {
    const res = this.schema.safeParse(data);
    if (!res.success) {
      return {
        success: false,
        action: null,
      }
    }

    const action = new this();
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
      ? `${opts.member?.username} has added a due date in a card`
      : "A due date has been added in a card";

    embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(this.data!.data.card.name)
      .setURL(`https://trello.com/c/${this.data!.data.card.shortLink}`)
      .addFields({
        name: "Due Date",
        value: this.data!.data.card.due,
        inline: true
      })
      ;

    return embed;
  }
}