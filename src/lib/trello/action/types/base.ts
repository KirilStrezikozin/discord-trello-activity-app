/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import { z } from "zod";
import { MemberSchema } from "../schema";
import { defaultIconSizePixels } from "@/src/lib/options";

import {
  ColorResolvable,
  EmbedBuilder,
} from "discord.js";

/**
 * Member represents a Trello member who triggered an action.
 */
export type Member = z.infer<typeof MemberSchema>;

/**
 * Message options represent options for Action message builders.
 */
export type MessageOptions = {
  member?: Member | null,
  board?: {
    name?: string | null,
    id?: string | null,
    prefs?: {
      background?: ColorResolvable | null,
      backgroundColor?: ColorResolvable | null,
      backgroundDarkColor?: ColorResolvable | null,
      backgroundBottomColor?: ColorResolvable | null,
      backgroundTopColor?: ColorResolvable | null,
    } | null,
  } | null,
  thumbnailUrl?: string | null,
  warningText?: string | null,
  iconSizePixels?: number | null,
};

/**
 * Returns an icon URL for a member who triggered the action.
 */
export function getMemberIcon(opts: MessageOptions): string | undefined {
  const iconSizePixels = opts.iconSizePixels ?? defaultIconSizePixels;
  return (opts.member)
    ? `${opts.member?.avatarUrl}/${iconSizePixels}.png`
    : undefined;
}

/**
 * The return type of functions that construct
 * Actions without throwing exceptions.
 */
export type ActionBuildResult = { success: true, action: Action } | { success: false, action: null };

/**
 * @class Action
 * @description Action holds Trello action (activity) data and provides a
 * message builder to build a Discord message describing the activity. It does
 * not represent a unit of Trello activity itself.
 *
 * Extend this abstract class to define custom Action types and specify how
 * they transform Trello activity data into Discord messages.
 *
 * Each Action type implements a static `from` method. It can be used to
 * provide data from activity that occurred in Trello and create an Action
 * instance. Use the `buildMessage` method on the Action instance to assemble
 * a message that can be sent in a Discord channel.
 *
 * See the submodules of this library for the full list of handled Trello
 * action types. This library may contain multiple descriptive Action
 * definitions with unique Discord message formatting per one such
 * action type. Full list of Trello action types can be found in
 * the Trello documentation:
 *
 * https://developer.atlassian.com/cloud/trello/guides/rest-api/action-types
 */
export abstract class Action {
  constructor() { }

  /**
   * Create an Action instance from the given Trello action data.
   *
   * @param data Trello action data.
   * @returns Action build result.
   */
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  static from(_data: unknown): ActionBuildResult {
    /* Return a status object instead of throwing errors, because exception
     * handling is much slower, and incoming Trello activity data needs to be
     * parsed against every known Action subclass type. Subclasses of Action
     * must also follow this principle. */
    return {
      success: false,
      action: null,
    }
  }

  /**
   * Inner Discord message builder. Override and implement on subclasses to
   * embed parsed Trello activity data. Returns the modified EmbedBuilder.
   */
  protected buildMessageInner(
    embed: EmbedBuilder,
    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    _opts: MessageOptions
  ): EmbedBuilder {
    return embed;
  }

  /**
   * Builds a Discord message from Trello activity
   * data assigned to this instance.
   *
   * @param opts Options provide information about the action's context.
   * @returns Message payload ready to be sent to a Discord channel.
   */
  buildMessage(opts: MessageOptions) {
    let embed = new EmbedBuilder()
      .setColor(opts.board?.prefs?.backgroundColor ?? null)
      .setThumbnail(opts.thumbnailUrl || null)
      .setFooter(opts.board?.name ? { text: opts.board?.name } : null)
      .setTimestamp()
      ;

    embed = this.buildMessageInner(embed, opts);

    if (opts.warningText) {
      embed = embed.addFields({ name: "Warning", value: opts.warningText });
    }

    return { embeds: [embed] };
  }
}