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
import { ActionMemberActionBase } from './shared';
import { getMemberIcon } from "./utils";

export default class ActionAddMemberToCard extends ActionMemberActionBase {
  public static override readonly schema = z.object({
    id: z.string().min(1),
    type: z.literal("addMemberToCard"),

    data: z.object({
      idMember: z.string().min(1),

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

      member: z.object({
        id: z.string().min(1),
        name: z.string().min(1),
      }).readonly(),
    }).readonly(),
  }).readonly();

  public static override readonly type = getActionTypeFromSchema(this.schema);
  protected override data?: z.infer<typeof ActionAddMemberToCard.schema>;

  protected override buildMessageInner(
    embed: EmbedBuilder, opts: MessageOptions
  ): EmbedBuilder {
    const name = opts.member
      ? `${opts.member?.username} has added a member to a card`
      : "A member has been added to a card";

    embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(this.data!.data.card.name)
      .setURL(`https://trello.com/c/${this.data!.data.card.shortLink}`)
      .addFields({
        name: "Full Name",
        value: this.data!.data.member.name,
        inline: true
      })
      ;


    if (this.memberData?.data) {
      embed
        .addFields({
          name: "Username",
          value: this.memberData.data.username,
          inline: true
        })
        .setImage(getMemberIcon(this.memberData.data.avatarUrl))
        ;
    }

    return embed;
  }
}