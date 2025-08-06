/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import { z } from "zod";

import {
  Action,
  getActionTypeFromSchema,
  MessageOptions
} from "./base";

import { EmbedBuilder } from "discord.js";
import { getMemberIcon } from "./utils";
import { WebhookOptions } from "@/src/lib/options";
import { BoardListsWithCardsDataProperty } from './data';

export default class ActionReopenedBoard extends Action {
  public static override readonly schema = z.object({
    id: z.string().min(1),
    type: z.literal("updateBoard"),

    data: z.object({
      old: z.object({
        closed: z.literal(true),
      }).readonly(),

      board: z.object({
        closed: z.literal(false),
        id: z.string().min(1),
        name: z.string().min(1),
        shortLink: z.string(),
      }).readonly(),
    }).readonly(),
  }).readonly();

  public static override readonly type = getActionTypeFromSchema(this.schema);
  protected override data?: z.infer<typeof ActionReopenedBoard.schema>;
  private boardListsWithCardsData?: BoardListsWithCardsDataProperty = undefined;

  /**
   * Fetches additional data to build a more descriptive message:
   *
   * 1. Trello board lists with cards data.
   *
   * @param opts Webhook app options.
   */
  public async fetchData(opts: WebhookOptions): Promise<void> {
    this.boardListsWithCardsData = new BoardListsWithCardsDataProperty(opts);

    /* Fetch open board lists with open cards. */
    await this.boardListsWithCardsData.resolve({
      boardId: this.data!.data.board.id,
      filter: {
        filter: "open",
        cards: "open",
      }
    });
  }

  protected override buildMessageInner(
    embed: EmbedBuilder, opts: MessageOptions
  ): EmbedBuilder {
    const name = opts.member
      ? `${opts.member?.username} has reopened a board`
      : "A board has been reopened";

    embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(this.data!.data.board.name)
      .setURL(`https://trello.com/c/${this.data!.data.board.shortLink}`)
      ;

    if (this.boardListsWithCardsData?.data) {
      /* `fetchData` should fetch open lists with open cards only using a
       * filter to avoid redundant `closed` state checks on lists and cards. */

      let totalOpenCards = 0;
      const totalOpenLists = this.boardListsWithCardsData.data.reduce(
        (accum, list) => {
          totalOpenCards += list.cards.length;
          return accum + 1;
        },
        0
      );

      embed.addFields(
        {
          name: "Total Open Lists",
          value: totalOpenLists.toString(),
          inline: false
        },
        {
          name: "Total Open Cards",
          value: totalOpenCards.toString(),
          inline: false
        }
      );
    }

    return embed;
  }
}