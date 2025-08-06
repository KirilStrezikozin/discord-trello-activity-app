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
import { CardCoverWithSourceSchema } from "../schema";
import { CardCoverActionBase } from "./shared";
import { getMemberIcon } from "./utils";

export default class ActionChangedCardCover extends CardCoverActionBase {
  public static override readonly schema = z.object({
    id: z.string().min(1),
    type: z.literal("updateCard"),

    data: z.object({
      attachment: z.any(), /* For compatibility with the base's `data` prop. */

      old: z.object({
        cover: CardCoverWithSourceSchema,
      }).readonly(),

      card: z.object({
        cover: CardCoverWithSourceSchema,
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
  }).readonly()
    .refine((data) => {
      const old = data.data.old.cover;
      const curr = data.data.card.cover;
      return (
        old.idAttachment !== curr.idAttachment
        || old.idUploadedBackground !== curr.idUploadedBackground
        || old.plugin !== curr.plugin
      );
    });

  public static override readonly type = getActionTypeFromSchema(this.schema);
  protected override data?: z.infer<typeof ActionChangedCardCover.schema>;

  protected override buildMessageInner(
    embed: EmbedBuilder, opts: MessageOptions
  ): EmbedBuilder {
    const name = opts.member
      ? `${opts.member?.username} has changed a cover on a card`
      : "A cover has been changed on a card";

    const { old, card, list } = this.data!.data;
    const oldCover = old.cover;
    const cover = card.cover;

    const oldCoverDesc = this.getCoverDescription(oldCover);
    const currCoverDesc = this.getCoverDescription(cover);

    embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(card.name)
      .setURL(`https://trello.com/c/${card.shortLink}`)
      .setDescription(`Card cover: ${currCoverDesc}.`)
      .addFields({
        name: "Old Card Cover",
        value: oldCoverDesc,
        inline: false,
      })
      ;

    if (this.coverIsSolidColor(cover)) {
      this.buildCoverSolidColor(embed, cover);
    } else if (this.coverIsAttachmentPreview(cover)) {
      this.buildCoverAttachmentPreview(embed, cover);
    } else if (this.coverIsImage(cover)) {
      this.buildCoverImage(embed, cover);
    } else if (this.coverIsSetWithPlugin(cover)) {
      this.buildCoverSetWithPlugin(embed, cover);
    }

    embed.addFields(
      {
        name: "Cover Size",
        value: cover.size,
        inline: true,
      },
      {
        name: "List",
        value: list.name,
        inline: false,
      },
    );

    return embed;
  }
}