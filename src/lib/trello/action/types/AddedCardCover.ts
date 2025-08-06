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

import {
  CardCoverNoSourceSchema,
  CardCoverWithSourceSchema,
} from "../schema";

import { EmbedBuilder } from "discord.js";
import { CardCoverActionBase } from "./shared";
import { getMemberIcon } from "./utils";

export default class ActionAddedCardCover extends CardCoverActionBase {
  public static override readonly schema = z.object({
    id: z.string().min(1),
    type: z.literal("updateCard"),

    data: z.object({
      attachment: z.undefined(), /* For compat with the base's `data` prop. */

      old: z.object({
        cover: CardCoverNoSourceSchema,
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
    .refine((data) => [
      data.data.old.cover.color,
      data.data.old.cover.idAttachment,
      data.data.old.cover.idUploadedBackground,
      data.data.old.cover.plugin
    ].filter(prop => prop).length === 0
    );

  public static override readonly type = getActionTypeFromSchema(this.schema);
  protected override data?: z.infer<typeof ActionAddedCardCover.schema>;

  protected override buildMessageInner(
    embed: EmbedBuilder, opts: MessageOptions
  ): EmbedBuilder {
    const name = opts.member
      ? `${opts.member?.username} has added a cover to a card`
      : "A cover has been added to a card";

    const { card, list } = this.data!.data;
    const { cover } = card;

    const coverDesc = this.getCoverDescription(cover);

    embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(card.name)
      .setURL(`https://trello.com/c/${card.shortLink}`)
      .setDescription(
        (cover.manualCoverAttachment)
          ? `Card cover: ${coverDesc}.`
          : `Card cover selected automatically by Trello: ${coverDesc}.`
      )
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