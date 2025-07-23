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

import { EmbedBuilder } from "discord.js";
import { getMemberIcon } from "./utils";

export default class ActionCompletedCheckItem extends Action {
  static schema = z.object({
    id: z.string().min(1),
    type: z.literal("updateCheckItemStateOnCard"),

    data: z.object({
      checkItem: z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        state: z.literal("complete"),
        textData: z.looseObject({
          emoji: z.looseObject({}),
        }),
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

  public static type = this.schema.shape.type.value;
  private data?: z.infer<typeof ActionCompletedCheckItem.schema>;

  static override from(data: unknown): ActionBuildResult {
    const res = this.schema.safeParse(data);
    if (!res.success) {
      return {
        success: false,
        action: null,
      }
    }

    const action = new this();
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
      ? `${opts.member?.username} has marked an item in a checklist in a card as complete`
      : "An item has been marked as completed in a checklist in a card";

    embed = embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(this.data!.data.card.name)
      .setURL(`https://trello.com/c/${this.data!.data.card.shortLink}`)
      .addFields(
        {
          name: "Checlist Item",
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