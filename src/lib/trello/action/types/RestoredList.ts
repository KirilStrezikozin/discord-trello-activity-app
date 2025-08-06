/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import * as z from 'zod';

import {
  getActionTypeFromSchema,
  MessageOptions
} from "./base";

import { EmbedBuilder } from "discord.js";
import { ListCardsActionBase } from "./shared";
import { getMemberIcon } from "./utils";

export default class ActionRestoredList extends ListCardsActionBase {
  public static override readonly schema = z.object({
    id: z.string().min(1),
    type: z.literal("updateList"),

    data: z.object({
      old: z.object({
        closed: z.literal(true),
      }).readonly(),

      list: z.object({
        closed: z.literal(false),
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
  protected override data?: z.infer<typeof ActionRestoredList.schema>;

  protected override buildMessageInner(
    embed: EmbedBuilder, opts: MessageOptions
  ): EmbedBuilder {
    const name = opts.member
      ? `${opts.member?.username} has restored a list from archive`
      : "A list has been restored from archive";

    embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(this.data!.data.list.name)
      .setURL(`https://trello.com/c/${this.data!.data.board.shortLink}`)
      ;

    if (this.listCardsData?.data) {
      embed.addFields({
        name: "Total Cards Restored with List",
        value: this.listCardsData.data.length.toString(),
        inline: false
      });
    }

    embed.addFields({
      name: "Board",
      value: this.data!.data.board.name,
      inline: false
    });

    return embed;
  }
}