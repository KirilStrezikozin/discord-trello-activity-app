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
  MessageOptions
} from "./base";

import {
  EmbedBuilder,
  MessagePayload,
  WebhookMessageCreateOptions
} from "discord.js";

export default class ActionMarkedCheckItemIncomplete extends Action {
  static schema = z.object({
    type: z.literal("updateCheckItemStateOnCard"),
    translationKey: z.literal("action_marked_checkitem_incomplete"),

    data: z.object({
      checkItem: z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        state: z.literal("incomplete"),
        textData: z.object({
          emoji: z.object({}).passthrough()
        }).passthrough(),
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

      checklist: z.object({
        id: z.string().min(1),
        name: z.string().min(1),
      }),
    }),
  });

  private data?: z.infer<typeof ActionMarkedCheckItemIncomplete.schema>;

  static override from(data: unknown): ActionBuildResult {
    const res = ActionMarkedCheckItemIncomplete.schema.safeParse(data);
    if (!res.success) {
      return {
        success: false,
        action: null,
      }
    }

    const action = new ActionMarkedCheckItemIncomplete();
    action.data = res.data;

    return {
      success: true,
      action: action,
    }
  }

  buildMessage(opts: MessageOptions): (string | MessagePayload | WebhookMessageCreateOptions) {
    const name = opts.member
      ? `${opts.member?.username} has marked an item in a checklist in a card as incomplete`
      : "An item has been marked as incompleted in a checklist in a card";

    const iconURL = opts.member ? `${opts.member?.avatarUrl}/60.png` : undefined;

    const embed = new EmbedBuilder()
      .setColor(opts.board?.prefs?.backgroundColor ?? null)
      .setThumbnail(opts.thumbnailUrl ?? null)
      .setAuthor({ name: name, iconURL: iconURL })
      .setTitle(this.data!.data.card.name)
      .setURL(`https://trello.com/c/${this.data!.data.card.shortLink}`)
      .setFields(
        { name: "Checlist Item", value: this.data!.data.checkItem.name, inline: true },
        { name: "Checlist", value: this.data!.data.checklist.name, inline: true },
      )
      .setTimestamp()
      .setFooter({ text: opts.board?.name ?? "" })
      ;

    return { embeds: [embed] };
  }
}