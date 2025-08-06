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

export default class ActionMarkedCheckItemIncomplete extends CheckListActionBase {
  public static override readonly schema = z.object({
    id: z.string().min(1),
    type: z.literal("updateCheckItemStateOnCard"),

    data: z.object({
      checkItem: z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        state: z.literal("incomplete"),
        textData: z.object({}),
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

      checklist: z.object({
        id: z.string().min(1),
        name: z.string().min(1),
      }).readonly(),
    }).readonly(),
  }).readonly();

  public static override readonly type = getActionTypeFromSchema(this.schema);
  protected override data?: z.infer<typeof ActionMarkedCheckItemIncomplete.schema>;

  protected override buildMessageInner(
    embed: EmbedBuilder, opts: MessageOptions
  ): EmbedBuilder {
    const name = opts.member
      ? `${opts.member?.username} has marked an item in a checklist in a card as incompleted`
      : "An item has been marked as incompleted in a checklist in a card";

    embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(this.data!.data.card.name)
      .setURL(`https://trello.com/c/${this.data!.data.card.shortLink}`)
      .addFields(
        {
          name: "Checklist Item",
          value: this.data!.data.checkItem.name,
          inline: false
        },
        {
          name: "Checklist",
          value: this.data!.data.checklist.name,
          inline: true
        },
      )
      ;

    if (this.checkListItemsData?.data) {
      this.buildTotalCompletedCheckItemsField(
        embed, this.checkListItemsData.data, true
      );
    }

    return embed;
  }
}