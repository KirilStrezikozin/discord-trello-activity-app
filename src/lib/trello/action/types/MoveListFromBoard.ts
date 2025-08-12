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
import { BoardAndListCardsActionBase } from './shared';
import { getMemberIcon } from "./utils";

export default class ActionMoveListFromBoard extends BoardAndListCardsActionBase {
  public static override readonly schema = z.object({
    id: z.string().min(1),
    type: z.literal("moveListFromBoard"),

    data: z.object({
      list: z.object({
        id: z.string().min(1),
        name: z.string().min(1),
      }).readonly(),

      boardTarget: z.object({
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
  protected override data?: z.infer<typeof ActionMoveListFromBoard.schema>;

  /** @see `BoardActionBase.getBoardId()` */
  protected override getBoardId(): string {
    return this.data!.data.boardTarget.id;
  }

  protected override buildMessageInner(
    embed: EmbedBuilder, opts: MessageOptions
  ): EmbedBuilder {
    const name = opts.member
      ? `${opts.member?.username} has transferred a list to an external board`
      : "A list has been transferred to an external board";

    embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(this.data!.data.list.name)
      .setURL(`https://trello.com/c/${this.data!.data.board.shortLink}`)
      .addFields({
        name: "From Board",
        value: this.data!.data.board.name,
        inline: true
      })
      ;

    if (this.listCardsData?.data) {
      embed.addFields({
        name: "Total Cards in List",
        value: this.listCardsData.data.length.toString(),
        inline: true
      });
    }

    if (this.boardData?.data) {
      embed.addFields({
        name: "To Board",
        value: `[${this.boardData.data.name}](${this.boardData.data.url})`,
        inline: false
      });
    }

    return embed;
  }
}