/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import { EmbedBuilder, WebhookClient } from "discord.js";

// TODO: since we use discord.js library, message sending can happen directly
// from webhook request handler, because it is quite high-level already. But do
// have utilities to assemble the embed.
export function sendMessage(url: string, data: string) {
  const embedWithJSON = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle("Stuff happened")
    .setDescription("Action performed in Trello")
    .addFields({
      name: "Display data",
      value: `\`\`\`json\n${data.substring(0, 500)}\n\`\`\``,
    })
    .setTimestamp()
    .setFooter({ text: "Some footer text here" });

  // TODO: do not create the client here.
  const webhookClient = new WebhookClient({ url: url });
  webhookClient.send({ embeds: [embedWithJSON] });
}