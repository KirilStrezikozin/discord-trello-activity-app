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

export default class ActionEnablePlugin extends Action {
  public static override readonly schema = z.object({
    id: z.string().min(1),
    type: z.literal("enablePlugin"),

    data: z.object({
      plugin: z.object({
        id: z.string().min(1),
        author: z.string(),
        name: z.string(),

        icon: z.object({
          url: z.url(),
        }).readonly(),

        listing: z.object({
          name: z.string(),
          description: z.string(),
          overview: z.string(),
        }).readonly(),
      }).readonly(),

      board: z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        shortLink: z.string(),
      }).readonly(),
    }).readonly(),
  }).readonly();

  public static override readonly type = getActionTypeFromSchema(this.schema);
  protected override data?: z.infer<typeof ActionEnablePlugin.schema>;

  protected override buildMessageInner(
    embed: EmbedBuilder, opts: MessageOptions
  ): EmbedBuilder {
    const name = opts.member
      ? `${opts.member?.username} has enabled a new plugin`
      : "A new plugin has been enabled";

    embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(this.data!.data.plugin.name)
      .setURL(`https://trello.com/c/${this.data!.data.board.shortLink}`)
      .setDescription(this.data!.data.plugin.listing.overview)
      .setImage(this.data!.data.plugin.icon.url)
      .addFields(
        {
          name: "Plugin Author",
          value: this.data!.data.plugin.author,
          inline: false
        },
        {
          name: "Board",
          value: this.data!.data.board.name,
          inline: false
        }
      )
      ;

    return embed;
  }
}