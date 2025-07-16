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

export default class ActionAddCheckListToCard extends Action {
  static type = "addChecklistToCard";

  static schema = z.object({
    type: z.literal(ActionAddCheckListToCard.type),
    id: z.string().min(1),

    data: z.object({
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

  private data?: z.infer<typeof ActionAddCheckListToCard.schema>;

  static override from(data: unknown): ActionBuildResult {
    const res = ActionAddCheckListToCard.schema.safeParse(data);
    if (!res.success) {
      return {
        success: false,
        action: null,
      }
    }

    const action = new ActionAddCheckListToCard();
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
      ? `${opts.member?.username} has added a checklist to a card`
      : "A checklist has been added to a card";

    embed = embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(this.data!.data.card.name)
      .setURL(`https://trello.com/c/${this.data!.data.card.shortLink}`)
      .addFields({
        name: "Checklist Name",
        value: this.data!.data.checklist.name,
        inline: true
      })
      ;

    return embed;
  }
}