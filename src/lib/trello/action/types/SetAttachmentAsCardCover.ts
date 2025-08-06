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
import { AttachmentActionBase } from "./shared";
import { getMemberIcon } from "./utils";

export default class ActionSetAttachmentAsCardCover extends AttachmentActionBase {
  public static override readonly schema = z.object({
    id: z.string().min(1),
    type: z.literal("updateCard"),

    data: z.object({
      attachment: z.any(), /* For compat with the base's `data` prop. */

      old: z.object({
        idAttachmentCover: z.null(),
      }).readonly(),

      card: z.object({
        idAttachmentCover: z.string().min(1),
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
  protected override data?: z.infer<typeof ActionSetAttachmentAsCardCover.schema>
    & { readonly data: { attachment: never } }; /* Mute attachment, schema changed. */

  /** @see `AttachmentActionBase.getAttachmentId()` */
  protected override getAttachmentId(): string {
    return this.data!.data.card.idAttachmentCover;
  }

  protected override buildMessageInner(
    embed: EmbedBuilder, opts: MessageOptions
  ): EmbedBuilder {
    const name = opts.member
      ? `${opts.member?.username} has set an attachment as a card cover`
      : "An attachment has been set as a card cover";

    embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(this.data!.data.card.name)
      .setURL(`https://trello.com/c/${this.data!.data.card.shortLink}`)
      ;

    if (this.cardAttachmentData?.data) {
      this.buildAttachmentFields(
        embed,
        this.cardAttachmentData.data.url,
        this.cardAttachmentData.data,
        this.cardAttachmentData.previewData,
        false
      );
    }

    embed.addFields({
      name: "List",
      value: this.data!.data.list.name,
      inline: false
    });

    return embed;
  }
}