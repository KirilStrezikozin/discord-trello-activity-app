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

export default class ActionDeletedCheckItem extends Action {
  static schema = z.object({
    type: z.literal("deleteCheckItem"),

    data: z.object({
      checkItem: z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        state: z.literal("incomplete").or(z.literal("complete")),
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

  private data?: z.infer<typeof ActionDeletedCheckItem.schema>;

  static override from(data: unknown): ActionBuildResult {
    const res = ActionDeletedCheckItem.schema.safeParse(data);
    if (!res.success) {
      return {
        success: false,
        action: null,
      }
    }

    const action = new ActionDeletedCheckItem();
    action.data = res.data;

    return {
      success: true,
      action: action,
    }
  }

  buildMessage(opts: MessageOptions): (string | MessagePayload | WebhookMessageCreateOptions) {
    const name = opts.member
      ? `${opts.member?.username} has deleted an item in a checklist in a card`
      : "An item has been deleted in a checklist in a card";

    const embed = new EmbedBuilder()
      .setColor(opts.board?.prefs?.backgroundColor ?? null)
      .setThumbnail(opts.thumbnailUrl ?? null)
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(this.data!.data.card.name)
      .setURL(`https://trello.com/c/${this.data!.data.card.shortLink}`)
      .setFields(
        { name: "Checklist Item", value: this.data!.data.checkItem.name, inline: true },
        { name: "Checlist", value: this.data!.data.checklist.name, inline: true },
      )
      .setTimestamp()
      .setFooter(opts.board?.name ? { text: opts.board?.name } : null)
      ;

    return { embeds: [embed] };
  }
}