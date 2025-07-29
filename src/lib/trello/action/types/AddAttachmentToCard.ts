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
import { newTrelloAPIAxiosInstance } from "@/src/lib/utils";
import { WebhookOptions } from "@/src/lib/options";

import {
  CardAttachmentPreviewProxySchema,
  CardAttachmentSchema,
} from "../schema";

import {
  getLargestAttachmentPreview,
  getMemberIcon,
  resolveAttachmentPreviewProxy,
} from "./utils";

export default class ActionAddAttachmentToCard extends Action implements ActionWithData {
  public static override readonly schema = z.object({
    id: z.string().min(1),
    type: z.literal("addAttachmentToCard"),

    data: z.object({
      attachment: z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        url: z.url(),
        previewUrl: z.url().optional(),
        previewUrl2x: z.url().optional(),
      }).readonly(),

      card: z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        idShort: z.number(),
        shortLink: z.string(),
      }).readonly(),

      list: z.object({
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

  public static override readonly type = this.schema.def.innerType.shape.type.value;
  protected override data?: z.infer<typeof ActionAddAttachmentToCard.schema>;
  private cardAttachmentData?: z.infer<typeof CardAttachmentSchema> = undefined;
  private cardAttachmentPreviewProxy?: z.infer<typeof CardAttachmentPreviewProxySchema> = undefined;

  /**
   * Fetches additional information to build a more descriptive message.
   *
   * If `previewUrl` is set on card attachment, fetches attachment data and
   * resolves its preview URL through our proxy endpoint.
   *
   * @param opts Webhook app options.
   */
  public async fetchData(opts: WebhookOptions): Promise<void> {
    const { card, attachment } = this.data!.data;

    /* Attachment without preview, no-op. */
    if (!attachment.previewUrl) return;

    const axiosInst = newTrelloAPIAxiosInstance(opts);

    /* Attachment is used as card cover, fetch attachment data. */
    const { data } = await axiosInst(
      `/cards/${card.id}/attachments/${attachment.id}`,
    );

    /* Parse and validate fetched data. */
    const res = CardAttachmentSchema.safeParse(data);
    if (!res.success) {
      throw new Error(res.error.toString());
    }

    this.cardAttachmentData = res.data;

    /* Resolve a proxy URL for the attachment preview, if attachment has
     * image previews. Proxy URL to our webhook app avoids Trello credentials
     * that would be otherwise required to request the attachment preview by
     * its URL directly, and message content should be publicly hosted. */
    const preview = getLargestAttachmentPreview(
      this.cardAttachmentData.previews
    );
    if (preview) {
      this.cardAttachmentPreviewProxy = await resolveAttachmentPreviewProxy(
        opts,
        {
          cardId: card.id,
          attachmentId: attachment.id,
          attachmentFileName: this.cardAttachmentData.fileName,
          previewId: preview.id,
        }
      );
    }

  }

  protected override buildMessageInner(
    embed: EmbedBuilder, opts: MessageOptions
  ): EmbedBuilder {
    const name = opts.member
      ? `${opts.member?.username} has added an attachment to a card`
      : "An attachment has been added to a card";

    embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(this.data!.data.card.name)
      .setURL(`https://trello.com/c/${this.data!.data.card.shortLink}`)
      .addFields(
        {
          name: "Attachment Name",
          value: this.data!.data.attachment.name,
          inline: false
        },
        {
          name: "Attachment Link",
          value: `[Open Link](${this.data!.data.attachment.url})`,
          inline: false
        },
        {
          name: "List",
          value: this.data!.data.list.name,
          inline: true
        }
      )
      ;

    if (this.cardAttachmentData?.edgeColor) {
      embed.setColor(this.cardAttachmentData.edgeColor);
    }

    const previewProxy = this.cardAttachmentPreviewProxy;
    if (previewProxy?.success) {
      embed.setImage(previewProxy.url);
    } else if (previewProxy) {
      /* Not every attachment is previewable. If previewProxy is set though,
       * then the only option is that proxy URL resolution failed. */
      embed.addFields({
        name: "Attachment Preview",
        value: "Could not load attachment image preview.",
        inline: false,
      });
    }

    return embed;
  }
}