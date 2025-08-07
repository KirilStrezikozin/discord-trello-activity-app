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
import { BoardActionBase } from './shared';
import { getMemberIcon } from "./utils";

export default class ActionMoveCardFromBoard extends BoardActionBase {
  public static override readonly schema = z.object({
    id: z.string().min(1),
    type: z.literal("moveCardFromBoard"),

    data: z.object({
      card: z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        idShort: z.number(),
      }).readonly(),

      boardTarget: z.object({
        id: z.string().min(1),
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
    }).readonly(),
  }).readonly();

  public static override readonly type = getActionTypeFromSchema(this.schema);
  protected override data?: z.infer<typeof ActionMoveCardFromBoard.schema>;

  /** @see `BoardActionBase.getBoardId()` */
  protected override getBoardId(): string {
    return this.data!.data.boardTarget.id;
  }

  protected override buildMessageInner(
    embed: EmbedBuilder, opts: MessageOptions
  ): EmbedBuilder {
    const name = opts.member
      ? `${opts.member?.username} has transferred a card to an external board`
      : "A card has been transferred to an external board";

    embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(this.data!.data.card.name)
      .setURL(`https://trello.com/c/${this.data!.data.board.shortLink}`)
      ;

    if (this.boardData?.data) {
      embed.addFields({
        name: "From Board",
        value: `[${this.boardData.data.name}](${this.boardData.data.url})`,
        inline: true
      });
    }

    embed.addFields(
      {
        name: "From List",
        value: this.data!.data.list.name,
        inline: true
      },
      {
        name: "To Board",
        value: this.data!.data.board.name,
        inline: false
      }
    );

    return embed;
  }
}