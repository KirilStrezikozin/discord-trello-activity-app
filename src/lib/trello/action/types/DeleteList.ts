/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import * as z from 'zod';

import {
  Action,
  getActionTypeFromSchema,
  MessageOptions
} from "./base";

import { EmbedBuilder } from "discord.js";
import { getMemberIcon } from "./utils";

export default class ActionDeleteList extends Action {
  public static override readonly schema = z.object({
    id: z.string().min(1),
    type: z.literal("deleteList"),

    data: z.object({
      list: z.object({
        id: z.string().min(1),
        name: z.string().min(1),
      }).readonly(),

      board: z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        shortLink: z.string(),
      }).readonly(),
    }).readonly(),
  }).readonly();

  public static override readonly type = getActionTypeFromSchema(this.schema);
  protected override data?: z.infer<typeof ActionDeleteList.schema>;

  protected override buildMessageInner(
    embed: EmbedBuilder, opts: MessageOptions
  ): EmbedBuilder {
    const name = opts.member
      ? `${opts.member?.username} has deleted a list`
      : "A list has been deleted";

    embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(this.data!.data.list.name)
      .setURL(`https://trello.com/c/${this.data!.data.board.shortLink}`)
      .setDescription("This cannot be undone.")
      .addFields({
        name: "Board",
        value: this.data!.data.board.name,
        inline: false
      })
      ;

    return embed;
  }
}