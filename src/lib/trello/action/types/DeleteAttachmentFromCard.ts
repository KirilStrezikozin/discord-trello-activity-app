/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import { z } from "zod";

import {
  getActionTypeFromSchema,
  MessageOptions
} from "./base";

import { EmbedBuilder } from "discord.js";
import { CardListActionBase } from "./shared";
import { getMemberIcon } from "./utils";

export default class ActionDeleteAttachmentFromCard extends CardListActionBase {
  public static override readonly schema = z.object({
    id: z.string().min(1),
    type: z.literal("deleteAttachmentFromCard"),

    data: z.object({
      attachment: z.object({
        id: z.string().min(1),
        name: z.string().min(1),
      }).readonly(),

      card: z.object({
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
    }).readonly(),
  }).readonly();

  public static override readonly type = getActionTypeFromSchema(this.schema);
  protected override data?: z.infer<typeof ActionDeleteAttachmentFromCard.schema>;

  protected override buildMessageInner(
    embed: EmbedBuilder, opts: MessageOptions
  ): EmbedBuilder {
    const name = opts.member
      ? `${opts.member?.username} has removed an attachment from a card`
      : "An attachment has been removed from a card";

    embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(this.data!.data.card.name)
      .setURL(`https://trello.com/c/${this.data!.data.card.shortLink}`)
      .setDescription("This cannot be undone.")
      .addFields({
        name: "Attachment Name",
        value: this.data!.data.attachment.name,
        inline: false
      })
      ;

    if (this.listData?.data) {
      embed.addFields({
        name: "List",
        value: this.listData.data.name,
        inline: false,
      });
    }

    return embed;
  }
}