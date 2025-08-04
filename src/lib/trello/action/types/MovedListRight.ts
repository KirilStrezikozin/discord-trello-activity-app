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
  getActionTypeFromSchema,
  MessageOptions
} from "./base";

import { EmbedBuilder } from "discord.js";
import { getMemberIcon } from "./utils";

export default class ActionMovedListRight extends Action {
  public static override readonly schema = z.object({
    id: z.string().min(1),
    type: z.literal("updateList"),

    data: z.object({
      old: z.object({
        pos: z.number(),
      }).readonly(),

      list: z.object({
        pos: z.number(),
        id: z.string().min(1),
        name: z.string().min(1),
      }).readonly(),

      board: z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        shortLink: z.string(),
      }).readonly(),
    }).readonly(),
  }).readonly()
    .refine((data) => data.data.list.pos > data.data.old.pos);

  public static override readonly type = getActionTypeFromSchema(this.schema);
  protected override data?: z.infer<typeof ActionMovedListRight.schema>;

  protected override buildMessageInner(
    embed: EmbedBuilder, opts: MessageOptions
  ): EmbedBuilder {
    const name = opts.member
      ? `${opts.member?.username} has moved a list right in a board`
      : "A list has been moved right in a board";

    embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(this.data!.data.list.name)
      .setURL(`https://trello.com/c/${this.data!.data.board.shortLink}`)
      .addFields({
        name: "In Board",
        value: this.data!.data.board.name,
        inline: true
      })
      ;

    return embed;
  }
}