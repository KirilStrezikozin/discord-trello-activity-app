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

export default class ActionRenamedCard extends Action {
  static schema = z.object({
    type: z.literal("updateCard"),

    data: z.object({
      old: z.object({
        name: z.string().min(1),
      }),

      card: z.object({
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

  private data?: z.infer<typeof ActionRenamedCard.schema>;

  static override from(data: unknown): ActionBuildResult {
    const res = ActionRenamedCard.schema.safeParse(data);
    if (!res.success) {
      return {
        success: false,
        action: null,
      }
    }

    const action = new ActionRenamedCard();
    action.data = res.data;

    return {
      success: true,
      action: action,
    }
  }

  buildMessage(opts: MessageOptions): (string | MessagePayload | WebhookMessageCreateOptions) {
    const name = opts.member
      ? `${opts.member?.username} has renamed a card`
      : "A card has been renamed";

    const embed = new EmbedBuilder()
      .setColor(opts.board?.prefs?.backgroundColor ?? null)
      .setThumbnail(opts.thumbnailUrl ?? null)
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(this.data!.data.card.name)
      .setURL(`https://trello.com/c/${this.data!.data.card.shortLink}`)
      .setFields(
        { name: "Previous Name", value: this.data!.data.old.name, inline: true },
        { name: "New Name", value: this.data!.data.card.name, inline: true },
      )
      .setTimestamp()
      .setFooter(opts.board?.name ? { text: opts.board?.name } : null)
      ;

    return { embeds: [embed] };
  }
}