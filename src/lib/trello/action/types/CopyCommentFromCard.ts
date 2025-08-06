/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import { z } from "zod";

import {
  getActionTypeFromSchema,
  MessageOptions
} from "./base";

import { EmbedBuilder } from "discord.js";
import { ActionMemberActionBase } from "./shared";
import { getMemberIcon } from "./utils";

export default class ActionCopyCommentFromCard extends ActionMemberActionBase {
  public static override readonly schema = z.object({
    id: z.string().min(1),
    type: z.literal("copyCommentCard"),

    data: z.object({
      text: z.string(),
      idOriginalCommenter: z.string().min(1),

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

      cardSource: z.object({
        id: z.string().min(1),
        idShort: z.number(),
        name: z.string().min(1),
      }).readonly(),
    }).readonly(),
  }).readonly();

  public static override readonly type = getActionTypeFromSchema(this.schema);
  protected override data?: z.infer<typeof ActionCopyCommentFromCard.schema>;

  protected override buildMessageInner(
    embed: EmbedBuilder, opts: MessageOptions
  ): EmbedBuilder {
    const name = opts.member
      ? `${opts.member?.username} has copied a comment to a card`
      : "A comment has been copied to a card";

    embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(this.data!.data.card.name)
      .setURL(`https://trello.com/c/${this.data!.data.card.shortLink}`)
      .setDescription(this.data!.data.text.substring(0, 4096))
      .addFields({
        name: "From Card",
        value: this.data!.data.cardSource.name,
        inline: false
      })
      ;


    if (this.memberData?.data) {
      embed
        .addFields({
          name: "Original Comment From",
          value: `${this.memberData.data.fullName} (${this.memberData.data.username})`,
          inline: false
        })
        .setImage(getMemberIcon(this.memberData.data.avatarUrl))
        ;
    }

    return embed;
  }
}