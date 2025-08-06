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

export default class ActionChangedDescriptionOfBoard extends Action {
  public static override readonly schema = z.object({
    id: z.string().min(1),
    type: z.literal("updateBoard"),

    data: z.object({
      old: z.object({
        desc: z.string(),
      }).readonly(),

      board: z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        shortLink: z.string(),
        desc: z.string(),
      }).readonly(),
    }).readonly(),
  }).readonly();

  public static override readonly type = getActionTypeFromSchema(this.schema);
  protected override data?: z.infer<typeof ActionChangedDescriptionOfBoard.schema>;

  protected override buildMessageInner(
    embed: EmbedBuilder, opts: MessageOptions
  ): EmbedBuilder {
    const name = opts.member
      ? `${opts.member?.username} has changed description of a board`
      : "Board description has been changed";

    embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(this.data!.data.board.name)
      .setURL(`https://trello.com/c/${this.data!.data.board.shortLink}`)
      .setDescription(this.data!.data.board.desc.substring(0, 4096))
      ;

    return embed;
  }
}