/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import {
  Action,
  ActionBuildResult,
  MessageOptions
} from "./base";

import {
  EmbedBuilder,
  MessagePayload,
  WebhookMessageCreateOptions
} from "discord.js";

import { AppSourceUrl } from "@/src/lib/constants";

/**
 * @class ActionError
 * @description Error action is a custom Action type to report and send API
 * server errors as Discord messages. This technique is applied to inform
 * webhook users of unhandled Trello action types.
 */
export class ActionError extends Action {
  private data?: { name: string, message: string, action: unknown };

  static override from(data: { error: Error, action: unknown }): ActionBuildResult {
    const action = new ActionError();
    action.data = {
      name: data.error.name,
      message: data.error.message,
      action: data.action
    };

    return {
      success: true,
      action: action,
    };
  }

  buildMessage(opts: MessageOptions): (string | MessagePayload | WebhookMessageCreateOptions) {
    const name = opts.member ? `Activity from ${opts.member?.username} detected` : "Activity author unavailable";
    const iconURL = opts.member ? `${opts.member?.avatarUrl}/60.png` : undefined;

    const embed = new EmbedBuilder()
      .setColor("#DC143C")
      .setThumbnail(opts.thumbnailUrl ?? null)
      .setAuthor({ name: name, iconURL: iconURL })
      .setTitle("Internal Error")
      .setDescription("Failed to process Trello activity, error occurred.")
      .setFields(
        { name: "Error", value: `\`\`\`json\n${JSON.stringify(this.data!, null, 2)}\n\`\`\`` },
        { name: "See source code", value: `[Gitlab ↗](<${AppSourceUrl}>)` },
      )
      .setTimestamp()
      .setFooter({ text: opts.board?.name ?? "Board information unavailable" })
      ;

    return { embeds: [embed] };
  }
}