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
  CardCoverColorNameToHexColor,
  CardCoverWithSourceSchema
} from "../schema";

import { EmbedBuilder } from "discord.js";
import { CardCoverActionBase } from "./shared";
import { getMemberIcon } from "./utils";

export default class ActionChangedCardCoverProperties extends CardCoverActionBase {
  public static override readonly schema = z.object({
    id: z.string().min(1),
    type: z.literal("updateCard"),

    data: z.object({
      attachment: z.undefined(), /* For compat with the base's `data` prop. */

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
        old.idAttachment === curr.idAttachment
        && old.idUploadedBackground === curr.idUploadedBackground
        && old.plugin === curr.plugin
      );
    });

  public static override readonly type = getActionTypeFromSchema(this.schema);
  protected override data?: z.infer<typeof ActionChangedCardCoverProperties.schema>;

  protected override buildMessageInner(
    embed: EmbedBuilder, opts: MessageOptions
  ): EmbedBuilder {
    const name = opts.member
      ? `${opts.member?.username} has changed cover properties on a card`
      : "Cover properties have been changed on a card";

    const { old, card, list } = this.data!.data;
    const oldCover = old.cover;
    const cover = card.cover;

    embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(card.name)
      .setURL(`https://trello.com/c/${card.shortLink}`)
      .setDescription(`Card cover: ${this.getCoverDescription(cover)}.`)
      ;

    if (this.coverIsSolidColor(oldCover)) {
      embed.addFields({
        name: "Old Color",
        value: oldCover.color,
        inline: true,
      });
    }

    embed.addFields(
      {
        name: "Old Size",
        value: oldCover.size,
        inline: true,
      },
      {
        name: "Old Theme",
        value: oldCover.brightness,
        inline: true,
      }
    );

    if (this.coverIsSolidColor(cover)) {
      embed.addFields({
        name: "New Color",
        value: cover.color,
        inline: true,
      });
    }

    embed.addFields(
      {
        name: "New Size",
        value: cover.size,
        inline: true,
      },
      {
        name: "New Theme",
        value: cover.brightness,
        inline: true,
      }
    );

    const parsedEdgeColor = CardCoverColorNameToHexColor.safeParse(cover.color);
    if (parsedEdgeColor.success) {
      embed.setColor(parsedEdgeColor.data);
    }

    if (this.coverIsAttachmentPreview(cover)) {
      this.buildCoverAttachmentPreview(embed, cover, false);
    } else if (this.coverIsImage(cover)) {
      this.buildCoverImage(embed, cover, false);
    } else if (this.coverIsSetWithPlugin(cover)) {
      this.buildCoverSetWithPlugin(embed, cover);
    }

    embed.addFields({
      name: "List",
      value: list.name,
      inline: false,
    });

    return embed;
  }
}