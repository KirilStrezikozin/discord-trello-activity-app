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
import { AttachmentActionBase } from "./shared";
import { getMemberIcon } from "./utils";

export default class ActionAddAttachmentToCard extends AttachmentActionBase {
  public static override readonly schema = z.object({
    id: z.string().min(1),
    type: z.literal("addAttachmentToCard"),

    data: z.object({
      attachment: z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        url: z.url(),
        previewUrl: z.url().optional(),
        previewUrl2x: z.url().optional(),
      }).readonly(),

      card: z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        idShort: z.number(),
        shortLink: z.string(),
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
  protected override data?: z.infer<typeof ActionAddAttachmentToCard.schema>;

  protected override buildMessageInner(
    embed: EmbedBuilder, opts: MessageOptions
  ): EmbedBuilder {
    const name = opts.member
      ? `${opts.member?.username} has added an attachment to a card`
      : "An attachment has been added to a card";

    embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(this.data!.data.card.name)
      .setURL(`https://trello.com/c/${this.data!.data.card.shortLink}`)
      .addFields({
        name: "Attachment Name",
        value: this.data!.data.attachment.name,
        inline: false
      })
      ;

    this.buildAttachmentFields(
      embed,
      this.data!.data.attachment.url,
      this.cardAttachmentData?.data,
      this.cardAttachmentData?.previewData,
      false
    );

    embed.addFields({
      name: "List",
      value: this.data!.data.list.name,
      inline: false
    });

    return embed;
  }
}