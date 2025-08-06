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
import { CheckListActionBase } from "./shared";
import { getMemberIcon } from "./utils";

export default class ActionConvertToCardFromCheckItem extends CheckListActionBase {
  public static override readonly schema = z.object({
    id: z.string().min(1),
    type: z.literal("convertToCardFromCheckItem"),

    data: z.object({
      card: z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        idShort: z.number(),
        shortLink: z.string(),
      }).readonly(),

      checklist: z.object({
        id: z.string().min(1),
        name: z.string().min(1),
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

      cardSource: z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        idShort: z.number(),
        shortLink: z.string(),
      }).readonly(),
    }).readonly(),
  }).readonly();

  public static override readonly type = getActionTypeFromSchema(this.schema);
  protected override data?: z.infer<typeof ActionConvertToCardFromCheckItem.schema>;

  protected override buildMessageInner(
    embed: EmbedBuilder, opts: MessageOptions
  ): EmbedBuilder {
    const name = opts.member
      ? `${opts.member?.username} has converted a checklist item to a new card`
      : "A checklist item has been converted to a new card";

    embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(this.data!.data.card.name)
      .setURL(`https://trello.com/c/${this.data!.data.card.shortLink}`)
      .addFields({
        name: "From Checklist",
        value: this.data!.data.checklist.name,
        inline: true
      })
      ;

    if (this.checkListItemsData?.data) {
      this.buildTotalCompletedCheckItemsField(
        embed, this.checkListItemsData.data, true
      );
    }

    embed.addFields(
      {
        name: "From Card",
        value: this.data!.data.cardSource.name,
        inline: false
      },
      {
        name: "List",
        value: this.data!.data.list.name,
        inline: false
      },
    );

    return embed;
  }
}