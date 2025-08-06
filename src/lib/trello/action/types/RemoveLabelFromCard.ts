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
import { getMemberIcon } from "./utils";
import { LabelActionBase } from './shared';
import { LabelColorName } from "../schema";

export default class ActionRemoveLabelFromCard extends LabelActionBase {
  public static override readonly schema = z.object({
    id: z.string().min(1),
    type: z.literal("removeLabelFromCard"),

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
  protected override data?: z.infer<typeof ActionRemoveLabelFromCard.schema>;

  protected override buildMessageInner(
    embed: EmbedBuilder, opts: MessageOptions
  ): EmbedBuilder {
    const name = opts.member
      ? `${opts.member?.username} has removed a label from a card`
      : "A label has been removed from a card";

    embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(this.data!.data.card.name)
      .setURL(`https://trello.com/c/${this.data!.data.card.shortLink}`)
      ;

    this.buildLabelTextField(embed);
    this.buildLabelColorField(embed);
    this.buildLabelColor(embed);

    return embed;
  }
}