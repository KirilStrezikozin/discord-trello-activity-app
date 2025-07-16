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

export default class ActionMovedCheckItemHigher extends Action {
  static schema = z.object({
    id: z.string().min(1),
    type: z.literal("updateCheckItem"),
    translationKey: z.literal("action_moved_checkitem_higher"),

    data: z.object({
      old: z.object({
        pos: z.number(),
      }),

      checkItem: z.object({
        pos: z.number(),
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

  private data?: z.infer<typeof ActionMovedCheckItemHigher.schema>;

  static override from(data: unknown): ActionBuildResult {
    const res = ActionMovedCheckItemHigher.schema.safeParse(data);
    if (!res.success) {
      return {
        success: false,
        action: null,
      }
    }

    const action = new ActionMovedCheckItemHigher();
    action.data = res.data;

    return {
      success: true,
      action: action,
    }
  }

  protected buildMessageInner(
    embed: EmbedBuilder, opts: MessageOptions
  ): EmbedBuilder {
    const name = opts.member
      ? `${opts.member?.username} has moved an item higher in a checklist in a card`
      : "An item has been moved higher in a checklist in a card";

    embed = embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(this.data!.data.card.name)
      .setURL(`https://trello.com/c/${this.data!.data.card.shortLink}`)
      .addFields(
        {
          name: "Checklist Item",
          value: this.data!.data.checkItem.name,
          inline: true
        },
        {
          name: "Checlist",
          value: this.data!.data.checklist.name,
          inline: true
        },
      )
      ;

    return embed;
  }
}