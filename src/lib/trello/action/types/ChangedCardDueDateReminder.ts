/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import * as z from 'zod';
import * as log from "@/src/lib/log";

import {
  Action,
  getActionTypeFromSchema,
  MessageOptions
} from "./base";

import { EmbedBuilder } from "discord.js";
import { getMemberIcon } from "./utils";

export default class ActionChangedCardDueDateReminder extends Action {
  public static override readonly schema = z.object({
    id: z.string().min(1),
    type: z.literal("updateCard"),

    data: z.object({
      old: z.object({
        dueReminder: z.number().nullable(),
      }).readonly(),

      card: z.object({
        dueReminder: z.number().nullable(),
        id: z.string().min(1),
        name: z.string().min(1),
        idShort: z.number(),
        shortLink: z.string(),
      }).readonly(),

      board: z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        shortLink: z.string(),
      }).readonly(),

      list: z.object({
        id: z.string().min(1),
        name: z.string().min(1),
      }).readonly(),
    }).readonly(),
  }).readonly();

  public static override readonly type = getActionTypeFromSchema(this.schema);
  protected override data?: z.infer<typeof ActionChangedCardDueDateReminder.schema>;

  private dueReminderToStr(dueReminder: number | null) {
    if (dueReminder === null) return "Unknown";
    else if (dueReminder === -1) return "None";
    else if (dueReminder === 0) return "At time of due date";
    else if (dueReminder < 60) return `${dueReminder} minute(s) before`;
    else if (dueReminder < 60 * 24) return `${Math.round(dueReminder / 60)} hour(s) before`;
    else return `${Math.round(dueReminder / (60 * 24))} day(s) before`;
  }

  protected override buildMessageInner(
    embed: EmbedBuilder, opts: MessageOptions
  ): EmbedBuilder {
    const name = opts.member
      ? `${opts.member?.username} has changed a due date reminder in a card`
      : "A due date reminder has been changed in a card";

    embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(this.data!.data.card.name)
      .setURL(`https://trello.com/c/${this.data!.data.card.shortLink}`)
      ;

    try {
      embed.addFields(
        {
          name: "Previous reminder",
          value: this.dueReminderToStr(this.data!.data.old.dueReminder),
          inline: true
        },
        {
          name: "New reminder",
          value: this.dueReminderToStr(this.data!.data.card.dueReminder),
          inline: true
        }
      );
    } catch (error) {
      log.error(error);
    }

    return embed;
  }
}