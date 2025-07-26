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
  ActionWithData,
  MessageOptions
} from "./base";

import { EmbedBuilder } from "discord.js";
import { WebhookOptions } from "@/src/lib/options";
import { ActionCardSchema } from "../schema";
import { RequestError } from "@/src/lib/error";
import { getMemberIcon } from "./utils";

export default class ActionVoteOnCard extends Action implements ActionWithData {
  public static override readonly schema = z.object({
    id: z.string().min(1),
    type: z.literal("voteOnCard"),

    data: z.object({
      voted: z.literal(true),

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

  public static override readonly type = this.schema.def.innerType.shape.type.value;
  protected override data?: z.infer<typeof ActionVoteOnCard.schema>;
  private actionCardData?: z.infer<typeof ActionCardSchema> = undefined;

  /**
   * Fetches additional card information
   * (total number of votes) to build a more descriptive message.
   * @param opts Webhook app options. `apiKey` and `token` must be set.
   */
  async fetchData(opts: WebhookOptions): Promise<void> {
    const resp = await fetch(
      `https://api.trello.com/1/actions/${this.data!.id}\
/card?key=${opts.apiKey}&token=${opts.token}`,
      { method: 'GET', headers: { 'Accept': 'application/json' } }
    );

    if (resp.status != 200) {
      throw new RequestError(
        "Failed to fetch card for an action", resp.status
      );
    }

    const data = await resp.json();

    const res = ActionCardSchema.safeParse(data);
    if (!res.success) {
      throw new Error(res.error.toString());
    }

    this.actionCardData = res.data;
  }

  protected override buildMessageInner(
    embed: EmbedBuilder, opts: MessageOptions
  ): EmbedBuilder {
    const name = opts.member
      ? `${opts.member?.username} has voted on a card`
      : "A card has been voted on";

    embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(this.data!.data.card.name)
      .setURL(`https://trello.com/c/${this.data!.data.card.shortLink}`)
      ;

    if (this.actionCardData) {
      embed
        .addFields({
          name: "Total Votes",
          value: this.actionCardData.idMembersVoted.length.toString(),
          inline: false
        })
        ;
    }

    return embed;
  }
}