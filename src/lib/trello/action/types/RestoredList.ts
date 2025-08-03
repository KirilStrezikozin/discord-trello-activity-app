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
import { WebhookOptions } from "@/src/lib/options";
import { ListCardsSchema } from "../schema";
import { newTrelloAPIAxiosInstance } from "@/src/lib/utils/axios";

export default class ActionRestoredList extends Action {
  public static override readonly schema = z.object({
    id: z.string().min(1),
    type: z.literal("updateList"),

    data: z.object({
      old: z.object({
        closed: z.literal(true),
      }).readonly(),

      list: z.object({
        closed: z.literal(false),
        id: z.string().min(1),
        name: z.string().min(1),
      }).readonly(),

      board: z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        shortLink: z.string(),
      }).readonly(),
    }).readonly(),
  }).readonly();

  public static override readonly type = getActionTypeFromSchema(this.schema);
  protected override data?: z.infer<typeof ActionRestoredList.schema>;
  private listCardsData?: z.infer<typeof ListCardsSchema> = undefined;

  /**
   * Fetches additional list information (total number of cards) to build
   * a more descriptive message.
   *
   * @param opts Webhook app options.
   */
  public async fetchData(opts: WebhookOptions): Promise<void> {
    const axiosInst = newTrelloAPIAxiosInstance(opts);

    const { data } = await axiosInst(`/lists/${this.data!.data.list.id}/cards`);

    const res = ListCardsSchema.safeParse(data);
    if (!res.success) {
      throw new Error(res.error.toString());
    }

    this.listCardsData = res.data;
  }

  protected override buildMessageInner(
    embed: EmbedBuilder, opts: MessageOptions
  ): EmbedBuilder {
    const name = opts.member
      ? `${opts.member?.username} has restored a list from archive`
      : "A list has been restored from archive";

    embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(this.data!.data.list.name)
      .setURL(`https://trello.com/c/${this.data!.data.board.shortLink}`)
      ;

    if (this.listCardsData) {
      embed.addFields({
        name: "Total Cards Restored with List",
        value: this.listCardsData.length.toString(),
        inline: false
      });
    }

    embed.addFields({
      name: "Board",
      value: this.data!.data.board.name,
      inline: false
    });

    return embed;
  }
}