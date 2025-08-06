/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import * as z from 'zod';

import {
  getActionTypeFromSchema,
  MessageOptions
} from "./base";

import { EmbedBuilder } from "discord.js";
import { CommentActionBase } from "./shared";
import { getMemberIcon } from "./utils";

export default class ActionUpdateComment extends CommentActionBase {
  public static override readonly schema = z.object({
    id: z.string().min(1),
    type: z.literal("updateComment"),

    data: z.object({
      action: z.object({
        id: z.string().min(1),
        text: z.string(),
      }).readonly(),

      old: z.object({
        text: z.string(),
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
    }).readonly(),
  }).readonly();

  public static override readonly type = getActionTypeFromSchema(this.schema);
  protected override data?: z.infer<typeof ActionUpdateComment.schema>;

  protected override buildMessageInner(
    embed: EmbedBuilder, opts: MessageOptions
  ): EmbedBuilder {
    const name = opts.member
      ? `${opts.member?.username} has updated a comment on a card`
      : "A comment has been updated on a card";

    embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(this.data!.data.card.name)
      .setURL(`https://trello.com/c/${this.data!.data.card.shortLink}`)
      .addFields(
        {
          name: "Old",
          value: this.data!.data.old.text.substring(0, 1024),
          inline: true
        },
        {
          name: "New",
          value: this.data!.data.action.text.substring(0, 1024),
          inline: true
        }
      )
      ;

    if (this.commentReactionsSummaryData?.data) {
      this.buildCommentReactionsSummaryField(
        embed, this.commentReactionsSummaryData.data, false
      );
    }

    if (this.listData?.data) {
      embed.addFields({
        name: "List",
        value: this.listData.data.name,
        inline: false,
      });
    }

    return embed;
  }
}