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

import {
  EmbedBuilder,
  MessagePayload,
  WebhookMessageCreateOptions
} from "discord.js";

export default class ActionMovedCardLower extends Action {
  static schema = z.object({
    type: z.literal("updateCard"),
    translationKey: z.literal("action_moved_card_lower"),

    data: z.object({
      old: z.object({
        pos: z.number(),
      }),

      card: z.object({
        pos: z.number(),
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

  private data?: z.infer<typeof ActionMovedCardLower.schema>;

  static override from(data: unknown): ActionBuildResult {
    const res = ActionMovedCardLower.schema.safeParse(data);
    if (!res.success) {
      return {
        success: false,
        action: null,
      }
    }

    const action = new ActionMovedCardLower();
    action.data = res.data;

    return {
      success: true,
      action: action,
    }
  }

  buildMessage(opts: MessageOptions): (string | MessagePayload | WebhookMessageCreateOptions) {
    const name = opts.member
      ? `${opts.member?.username} has moved a card lower in a list`
      : "A card has been moved lower in a list";

    const embed = new EmbedBuilder()
      .setColor(opts.board?.prefs?.backgroundColor ?? null)
      .setThumbnail(opts.thumbnailUrl ?? null)
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(this.data!.data.card.name)
      .setURL(`https://trello.com/c/${this.data!.data.card.shortLink}`)
      .setFields(
        { name: "In List", value: this.data!.data.list.name, inline: true },
      )
      .setTimestamp()
      .setFooter(opts.board?.name ? { text: opts.board?.name } : null)
      ;

    return { embeds: [embed] };
  }
}