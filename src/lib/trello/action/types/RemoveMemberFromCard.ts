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

export default class ActionRemoveMemberFromCard extends Action {
  public static readonly schema = z.object({
    id: z.string().min(1),
    type: z.literal("removeMemberFromCard"),

    data: z.object({
      idMember: z.string().min(1),
      deactivated: z.boolean(),

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

      member: z.object({
        id: z.string().min(1),
        name: z.string().min(1),
      }),
    }),
  });

  public static readonly type = this.schema.shape.type.value;
  private data?: z.infer<typeof ActionRemoveMemberFromCard.schema>;

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
      ? `${opts.member?.username} has removed a member from a card`
      : "A member has been removed from a card";

    embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(this.data!.data.card.name)
      .setURL(`https://trello.com/c/${this.data!.data.card.shortLink}`)
      .addFields({
        name: "Full Name",
        value: this.data!.data.member.name,
        inline: true
      })
      .setImage(getMemberIcon(opts) ?? null)
      ;

    return embed;
  }
}