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

export default class ActionRenamedList extends Action {
  public static override readonly schema = z.object({
    id: z.string().min(1),
    type: z.literal("updateList"),

    data: z.object({
      old: z.object({
        name: z.string().min(1),
      }).readonly(),

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
  protected override data?: z.infer<typeof ActionRenamedList.schema>;

  protected override buildMessageInner(
    embed: EmbedBuilder, opts: MessageOptions
  ): EmbedBuilder {
    const name = opts.member
      ? `${opts.member?.username} has renamed a list`
      : "A list has been renamed";

    embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(this.data!.data.list.name)
      .setURL(`https://trello.com/c/${this.data!.data.board.shortLink}`)
      .addFields(
        {
          name: "Previous Name",
          value: this.data!.data.old.name,
          inline: true
        },
        {
          name: "New Name",
          value: this.data!.data.list.name,
          inline: true
        },
        {
          name: "Board",
          value: this.data!.data.board.name,
          inline: false
        }
      )
      ;

    return embed;
  }
}