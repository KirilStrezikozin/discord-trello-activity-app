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

export default class ActionChangedCardDueDateReminder extends Action {
  static schema = z.object({
    type: z.literal("updateCard"),

    data: z.object({
      old: z.object({
        dueReminder: z.number().nullable(),
      }),

      card: z.object({
        dueReminder: z.number().nullable(),
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

  private data?: z.infer<typeof ActionChangedCardDueDateReminder.schema>;

  static override from(data: unknown): ActionBuildResult {
    const res = ActionChangedCardDueDateReminder.schema.safeParse(data);
    if (!res.success) {
      return {
        success: false,
        action: null,
      }
    }

    const action = new ActionChangedCardDueDateReminder();
    action.data = res.data;

    return {
      success: true,
      action: action,
    }
  }

  private dueReminderToStr(dueReminder: number | null) {
    if (dueReminder === null) return "Unknown";
    else if (dueReminder === -1) return "None";
    else return [
      "At time of due date",
      "5 minutes before",
      "10 minutes before",
      "15 minutes before",
      "1 hour before",
      "2 hours before",
      "1 day before",
      "2 days before",
    ][dueReminder];
  }

  protected buildMessageInner(
    embed: EmbedBuilder, opts: MessageOptions
  ): EmbedBuilder {
    const name = opts.member
      ? `${opts.member?.username} has changed a due date reminder in a card`
      : "A due date reminder has been changed in a card";

    embed = embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(this.data!.data.card.name)
      .setURL(`https://trello.com/c/${this.data!.data.card.shortLink}`)
      .addFields(
        {
          name: "Previous reminder",
          value: this.dueReminderToStr(this.data!.data.old.dueReminder),
          inline: true
        },
        {
          name: "New reminder",
          value: this.dueReminderToStr(this.data!.data.card.dueReminder),
          inline: true
        },
      )
      ;

    return embed;
  }
}