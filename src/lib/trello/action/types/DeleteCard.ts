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

export default class ActionDeleteCard extends Action {
  public static override readonly schema = z.object({
    id: z.string().min(1),
    type: z.literal("deleteCard"),

    data: z.object({
      card: z.object({
        id: z.string().min(1),
        idShort: z.number(),
        shortLink: z.string(),
      }).readonly(),

      board: z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        shortLink: z.string(),
      }).readonly(),

      list: z.object({
        id: z.string().min(1),
        name: z.string().min(1),
      }).readonly(),
    }).readonly(),
  }).readonly();

  public static override readonly type = getActionTypeFromSchema(this.schema);
  protected override data?: z.infer<typeof ActionDeleteCard.schema>;

  protected override buildMessageInner(
    embed: EmbedBuilder, opts: MessageOptions
  ): EmbedBuilder {
    const name = opts.member
      ? `${opts.member?.username} has deleted a card`
      : "A card has been deleted";

    embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle("Card Deleted")
      .setURL(`https://trello.com/c/${this.data!.data.board.shortLink}`)
      .setDescription("This cannot be undone.")
      .addFields({
        name: "List before the card got archived",
        value: this.data!.data.list.name,
        inline: true
      })
      ;

    return embed;
  }
}