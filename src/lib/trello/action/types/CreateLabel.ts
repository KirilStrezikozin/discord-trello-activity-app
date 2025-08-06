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

export default class ActionCreateLabel extends LabelActionBase {
  public static override readonly schema = z.object({
    id: z.string().min(1),
    type: z.literal("createLabel"),

    data: z.object({
      label: z.object({
        id: z.string().min(1),
        name: z.string(),
        color: LabelColorName.nullish(),
      }).readonly(),

      board: z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        shortLink: z.string(),
      }).readonly(),
    }).readonly(),
  }).readonly();

  public static override readonly type = getActionTypeFromSchema(this.schema);
  protected override data?: z.infer<typeof ActionCreateLabel.schema>;

  protected override buildMessageInner(
    embed: EmbedBuilder, opts: MessageOptions
  ): EmbedBuilder {
    const name = opts.member
      ? `${opts.member?.username} has created a new label`
      : "A new label has been created";

    embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(this.data!.data.label.name)
      .setURL(`https://trello.com/c/${this.data!.data.board.shortLink}`)
      ;

    this.buildLabelTextField(embed);
    this.buildLabelColorField(embed);
    this.buildBoardField(embed);
    this.buildLabelColor(embed);

    return embed;
  }
}