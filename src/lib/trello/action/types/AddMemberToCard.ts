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
  MessageOptions
} from "./base";

import { EmbedBuilder } from "discord.js";
import { ActionMemberSchema } from "../schema";
import { WebhookOptions } from "@/src/lib/options";
import { newTrelloAPIAxiosInstance } from "@/src/lib/utils";
import { getMemberIcon } from "./utils";

export default class ActionAddMemberToCard extends Action {
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

  public static override readonly type = this.schema.def.innerType.shape.type.value;
  protected override data?: z.infer<typeof ActionAddMemberToCard.schema>;
  private actionMemberData?: z.infer<typeof ActionMemberSchema> = undefined;

  /**
   * Fetches additional member information (member avatar URL) to build
   * a more descriptive message.
   *
   * @param opts Webhook app options.
   */
  async fetchData(opts: WebhookOptions): Promise<void> {
    const axiosInst = newTrelloAPIAxiosInstance(opts);

    const { data } = await axiosInst(`/actions/${this.data!.id}/member`);

    const res = ActionMemberSchema.safeParse(data);
    if (!res.success) {
      throw new Error(res.error.toString());
    }

    this.actionMemberData = res.data;
  }

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