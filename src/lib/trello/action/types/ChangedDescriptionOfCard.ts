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
  MessageOptions
} from "./base";

import { EmbedBuilder } from "discord.js";
import { getMemberIcon } from "./utils";

export default class ActionChangedDescriptionOfCard extends Action {
  public static override readonly schema = z.object({
    id: z.string().min(1),
    type: z.literal("updateCard"),

    data: z.object({
      old: z.object({
        desc: z.string(),
      }).readonly(),

      card: z.object({
        desc: z.string(),
        id: z.string().min(1),
        name: z.string().min(1),
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

  public static override readonly type = this.schema.def.innerType.shape.type.value;
  protected override data?: z.infer<typeof ActionChangedDescriptionOfCard.schema>;

  protected override buildMessageInner(
    embed: EmbedBuilder, opts: MessageOptions
  ): EmbedBuilder {
    const name = opts.member
      ? `${opts.member?.username} has changed description of a card`
      : "Card description has been changed";

    embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(this.data!.data.card.name)
      .setURL(`https://trello.com/c/${this.data!.data.card.shortLink}`)
      .setDescription(this.data!.data.card.desc.substring(0, 4096))
      .addFields({
        name: "List",
        value: this.data!.data.list.name,
        inline: true
      })
      ;

    return embed;
  }
}