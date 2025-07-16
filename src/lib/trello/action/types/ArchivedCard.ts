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
  ActionBuildResult,
  getMemberIcon,
  MessageOptions
} from "./base";

import { EmbedBuilder } from "discord.js";

export default class ActionArchivedCard extends Action {
  static schema = z.object({
    id: z.string().min(1),
    type: z.literal("updateCard"),

    data: z.object({
      old: z.object({
        closed: z.literal(false),
      }),

      card: z.object({
        closed: z.literal(true),
        dateClosed: z.string().datetime({ precision: 3 }),
        id: z.string().min(1),
        name: z.string().min(1),
        idShort: z.number(),
        shortLink: z.string(),
      }),

      board: z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        shortLink: z.string(),
      }),

      list: z.object({
        id: z.string().min(1),
        name: z.string().min(1),
      }),
    }),
  });

  public static type = this.schema.shape.type.value;
  private data?: z.infer<typeof ActionArchivedCard.schema>;

  static override from(data: unknown): ActionBuildResult {
    const res = ActionArchivedCard.schema.safeParse(data);
    if (!res.success) {
      return {
        success: false,
        action: null,
      }
    }

    const action = new ActionArchivedCard();
    action.data = res.data;

    return {
      success: true,
      action: action,
    }
  }

  protected override buildMessageInner(
    embed: EmbedBuilder, opts: MessageOptions
  ): EmbedBuilder {
    const name = opts.member
      ? `${opts.member?.username} has archived a card`
      : "A card has been archived";

    embed = embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(this.data!.data.card.name)
      .setURL(`https://trello.com/c/${this.data!.data.card.shortLink}`)
      .setDescription("The card will no longer appear on the board. It can be restored from the board menu.")
      .addFields({
        name: "List",
        value: this.data!.data.list.name,
        inline: true
      })
      ;

    return embed;
  }
}