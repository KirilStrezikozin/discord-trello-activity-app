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

export default class ActionUpdateLabelName extends LabelActionBase {
  public static override readonly schema = z.object({
    id: z.string().min(1),
    type: z.literal("updateLabel"),

    data: z.object({
      old: z.strictObject({
        name: z.string(),
      }).readonly(),

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
  protected override data?: z.infer<typeof ActionUpdateLabelName.schema>;

  protected override buildMessageInner(
    embed: EmbedBuilder, opts: MessageOptions
  ): EmbedBuilder {
    const name = opts.member
      ? `${opts.member?.username} has changed a label name`
      : "A label name has been changed";

    embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(this.data!.data.label.name || "Unnamed Label")
      .setURL(`https://trello.com/c/${this.data!.data.board.shortLink}`)
      .addFields({
        name: "Old Label Text",
        value: this.data!.data.old.name,
        inline: true
      })
      ;

    this.buildLabelTextField(embed, "New Label Text", true);
    this.buildLabelColorField(embed);
    this.buildBoardField(embed);
    this.buildLabelColor(embed);

    return embed;
  }
}