/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import * as z from 'zod';

import {
  Action,
  getActionTypeFromSchema,
  MessageOptions
} from "./base";

import { EmbedBuilder } from "discord.js";
import { getMemberIcon } from "./utils";
import { MemberSchema } from '../schema';

export default class ActionAddMemberToBoard extends Action {
  public static override readonly schema = z.object({
    id: z.string().min(1),
    type: z.literal("addMemberToBoard"),

    data: z.object({
      memberType: z.string(),
      idMemberAdded: z.string().min(1),

      board: z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        shortLink: z.string(),
      }).readonly(),
    }).readonly(),

    member: MemberSchema,
  }).readonly();

  public static override readonly type = getActionTypeFromSchema(this.schema);
  protected override data?: z.infer<typeof ActionAddMemberToBoard.schema>;

  protected override buildMessageInner(
    embed: EmbedBuilder, opts: MessageOptions
  ): EmbedBuilder {
    const name = opts.member
      ? `${opts.member?.username} has added a member to a board`
      : "A member has been added to a board";

    embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(this.data!.member.fullName)
      .setURL(`https://trello.com/c/${this.data!.data.board.shortLink}`)
      .addFields(
        {
          name: "Full Name",
          value: this.data!.member.fullName,
          inline: true
        },
        {
          name: "Username",
          value: this.data!.member.username,
          inline: true
        },
        {
          name: "Board",
          value: this.data!.data.board.name,
          inline: false
        },
      )
      .setImage(getMemberIcon(this.data!.member.avatarUrl))
      ;

    return embed;
  }
}