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

export default class ActionDeleteLabel extends Action {
  public static override readonly schema = z.object({
    id: z.string().min(1),
    type: z.literal("deleteLabel"),

    data: z.object({
      label: z.object({
        id: z.string().min(1),
      }).readonly(),

      board: z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        shortLink: z.string(),
      }).readonly(),
    }).readonly(),
  }).readonly();

  public static override readonly type = getActionTypeFromSchema(this.schema);
  protected override data?: z.infer<typeof ActionDeleteLabel.schema>;

  protected override buildMessageInner(
    embed: EmbedBuilder, opts: MessageOptions
  ): EmbedBuilder {
    const name = opts.member
      ? `${opts.member?.username} has deleted a label`
      : "A label has been deleted";

    embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle("Label Deleted")
      .setURL(`https://trello.com/c/${this.data!.data.board.shortLink}`)
      .setDescription("This cannot be undone.")
      .addFields({
        name: "Board",
        value: this.data!.data.board.name,
        inline: false
      })
      ;

    return embed;
  }
}