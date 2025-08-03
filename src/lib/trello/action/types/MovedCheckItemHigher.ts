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
  getActionTypeFromSchema,
  MessageOptions
} from "./base";

import { EmbedBuilder } from "discord.js";
import { getMemberIcon } from "./utils";

export default class ActionMovedCheckItemHigher extends Action {
  public static override readonly schema = z.object({
    id: z.string().min(1),
    type: z.literal("updateCheckItem"),
    translationKey: z.literal("action_moved_checkitem_higher"),

    data: z.object({
      old: z.object({
        pos: z.number(),
      }).readonly(),

      checkItem: z.object({
        pos: z.number(),
        id: z.string().min(1),
        name: z.string().min(1),
        state: z.literal("incomplete").or(z.literal("complete")),
        textData: z.object({}),
      }).readonly(),

      card: z.object({
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

      checklist: z.object({
        id: z.string().min(1),
        name: z.string().min(1),
      }).readonly(),
    }).readonly(),
  }).readonly();

  public static override readonly type = getActionTypeFromSchema(this.schema);
  protected override data?: z.infer<typeof ActionMovedCheckItemHigher.schema>;

  protected override buildMessageInner(
    embed: EmbedBuilder, opts: MessageOptions
  ): EmbedBuilder {
    const name = opts.member
      ? `${opts.member?.username} has moved an item higher in a checklist in a card`
      : "An item has been moved higher in a checklist in a card";

    embed
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
          name: "Checklist",
          value: this.data!.data.checklist.name,
          inline: true
        },
      )
      ;

    return embed;
  }
}