/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import * as z from 'zod';

import {
  Action,
  getActionTypeFromSchema,
  MessageOptions
} from "./base";

import { EmbedBuilder } from "discord.js";
import { getMemberIcon } from "./utils";
import { LabelColorName, LabelColorNameToHexColor } from "../schema";

export default class ActionAddLabelToCard extends Action {
  public static override readonly schema = z.object({
    id: z.string().min(1),
    type: z.literal("addLabelToCard"),

    data: z.object({
      value: LabelColorName.nullable(),
      text: z.string(),

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

      label: z.object({
        id: z.string().min(1),
        name: z.string(),
        color: LabelColorName.nullish(),
      }).readonly(),
    }).readonly(),
  }).readonly();

  public static override readonly type = getActionTypeFromSchema(this.schema);
  protected override data?: z.infer<typeof ActionAddLabelToCard.schema>;

  protected override buildMessageInner(
    embed: EmbedBuilder, opts: MessageOptions
  ): EmbedBuilder {
    const name = opts.member
      ? `${opts.member?.username} has added a label to a card`
      : "A label has been added to a card";

    embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(this.data!.data.card.name)
      .setURL(`https://trello.com/c/${this.data!.data.card.shortLink}`)
      .addFields(
        {
          name: "Label Text",
          value: this.data!.data.text,
          inline: false
        },
        {
          name: "Label Color",
          value: this.data!.data.value ? this.data!.data.value : "None",
          inline: false
        },
      )
      ;

    const labelColor = this.data!.data.label.color;
    if (labelColor) {
      const parsedLabelColor = LabelColorNameToHexColor.safeParse(labelColor);
      if (parsedLabelColor.success) {
        embed.setColor(parsedLabelColor.data);
      }
    }

    return embed;
  }
}