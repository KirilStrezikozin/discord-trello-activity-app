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
import { WebhookOptions } from "@/src/lib/options";
import { ActionMemberSchema } from "../schema";
import { RequestError } from "@/src/lib/error";
import { getMemberIcon } from "./utils";

export default class ActionAddMemberToCard extends Action {
  public static readonly schema = z.object({
    id: z.string().min(1),
    type: z.literal("addMemberToCard"),

    data: z.object({
      idMember: z.string().min(1),

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
  private data?: z.infer<typeof ActionAddMemberToCard.schema>;
  private actionMemberData?: z.infer<typeof ActionMemberSchema>;

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

  /**
   * Fetches additional member information
   * (member avatar URL) to build a more descriptive message.
   * @param opts Webhook app options. `apiKey` and `token` must be set.
   */
  async fetchData(opts: WebhookOptions): Promise<void> {
    try {
      const resp = await fetch(
        `https://api.trello.com/1/actions/${this.data!.id}\
          /member?key=${opts.apiKey}&token=${opts.token}`,
        { method: 'GET', headers: { 'Accept': 'application/json' } }
      );

      if (resp.status != 200) {
        throw new RequestError(
          "Failed to fetch member for an action", resp.status
        );
      }

      const data = await resp.json();
      console.log(data);

      const res = ActionMemberSchema.safeParse(data);
      if (!res.success) {
        throw new Error(res.error.toString());
      }

      this.actionMemberData = res.data;

    } catch (error) {
      throw error;
    }
  }

  protected buildMessageInner(
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


    if (this.actionMemberData) {
      embed
        .addFields({
          name: "Username",
          value: this.actionMemberData.username,
          inline: true
        })
        .setImage(getMemberIcon(this.actionMemberData.avatarUrl))
        ;
    }

    return embed;
  }
}