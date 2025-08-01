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

import {
  CardSchema,
  CardAttachmentPreviewProxySchema,
  CardAttachmentSchema,
  CardCoverColorNameToHexColor,
  CardCoverNoSourceSchema,
  CardCoverWithSourceSchema
} from "../schema";

import { EmbedBuilder } from "discord.js";
import { WebhookOptions } from "@/src/lib/options";
import { newTrelloAPIAxiosInstance } from "@/src/lib/utils/axios";

import {
  getMemberIcon,
  getLargestAttachmentPreview,
  resolveAttachmentPreviewProxy
} from "./utils";

export default class ActionAddedCardCover extends Action implements ActionWithData {
  public static override readonly schema = z.object({
    id: z.string().min(1),
    type: z.literal("updateCard"),

    data: z.object({
      old: z.object({
        cover: CardCoverNoSourceSchema,
      }).readonly(),

      card: z.object({
        cover: CardCoverWithSourceSchema,
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
  protected override data?: z.infer<typeof ActionAddedCardCover.schema>;
  private cardAttachmentData?: z.infer<typeof CardAttachmentSchema> = undefined;
  private cardAttachmentPreviewProxy?: z.infer<typeof CardAttachmentPreviewProxySchema> = undefined;
  private cardData?: z.infer<typeof CardSchema> = undefined;

  /**
   * Fetches additional information to build a more descriptive message.
   *
   * If `idAttachment` is set on card cover, fetches attachment data.
   * If `idUploadedBackground`, fetches action card data to retrieve
   * the URL of uploaded background.
   *
   * @param opts Webhook app options.
   */
  public async fetchData(opts: WebhookOptions): Promise<void> {
    const actionId = this.data!.id;
    const { card } = this.data!.data;

    const axiosInst = newTrelloAPIAxiosInstance(opts);

    if (card.cover.idAttachment) {
      /* Attachment is used as card cover, fetch attachment data. */
      const { data } = await axiosInst(
        `/cards/${card.id}/attachments/${card.cover.idAttachment}`,
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
            attachmentId: card.cover.idAttachment,
            attachmentFileName: this.cardAttachmentData.fileName,
            previewId: preview.id,
          }
        );
      }

    } else if (card.cover.idUploadedBackground || card.cover.plugin) {
      /* Unsplash image is used as card cover or plugin set it, fetch card. */
      const { data } = await axiosInst(`/actions/${actionId}/card`);

      /* Parse and validate fetched data. */
      const res = CardSchema.safeParse(data);
      if (!res.success) {
        throw new Error(res.error.toString());
      }

      this.cardData = res.data;

    } else {
      /* No attachment or uploaded background ID is set, no-op. */
      return;
    }
  }

  private coverDescription(
    data: z.infer<typeof CardCoverWithSourceSchema>
  ): string {
    return (
      (data.color) ? "Solid Color"
        : (data.idAttachment) ? "Attachment Preview"
          : (data.idUploadedBackground) ? "Unsplash Image"
            : (data.plugin) ? "Set with Plugin"
              : "Unknown"
    );
  }

  protected override buildMessageInner(
    embed: EmbedBuilder, opts: MessageOptions
  ): EmbedBuilder {
    const name = opts.member
      ? `${opts.member?.username} has added a cover to a card`
      : "A cover has been added to a card";

    const { card, list } = this.data!.data;
    const { cover } = card;
    const coverDesc = this.coverDescription(cover);

    embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(card.name)
      .setURL(`https://trello.com/c/${card.shortLink}`)
      .setDescription(
        (cover.manualCoverAttachment)
          ? `Card cover: ${coverDesc}.`
          : `Card cover selected automatically by Trello: ${coverDesc}.`
      )
      ;

    if (cover.color) {
      embed.addFields({
        name: "Cover Color",
        value: cover.color,
        inline: true,
      });

      const parsedEdgeColor = CardCoverColorNameToHexColor.safeParse(cover.color);
      if (parsedEdgeColor.success) {
        embed.setColor(parsedEdgeColor.data);
      }

    } else if (cover.idAttachment && this.cardAttachmentData) {
      const attachment = this.cardAttachmentData;

      if (attachment.edgeColor) {
        embed.setColor(attachment.edgeColor);
      }

      embed.addFields({
        name: "Attachment Link",
        value: `[Open Link](${attachment.url})`,
        inline: true,
      });

      const previewProxy = this.cardAttachmentPreviewProxy;
      if (previewProxy?.success) {
        embed.setImage(previewProxy.url);
      } else {
        /* Attachment card cover should be previewable, which means that,
         * in this case, we had an error with resolving a proxy URL. */
        embed.addFields({
          name: "Attachment Preview",
          value: "Could not load attachment image preview.",
          inline: false,
        });
      }

    } else if (
      cover.idUploadedBackground
      && this.cardData
      && this.cardData.cover.idUploadedBackground
    ) {
      embed
        .setColor(this.cardData.cover.edgeColor)
        .addFields({
          name: "Image Link",
          value: `[Open Link](${this.cardData.cover.sharedSourceUrl})`,
          inline: true,
        })
        ;

      const preview = getLargestAttachmentPreview(this.cardData.cover.scaled);

      if (preview) {
        embed.setImage(preview.url);
      } else {
        /* Shared background card cover should always be previewable. */
        embed.addFields({
          name: "Image Preview",
          value: "Could not load image preview.",
          inline: false,
        });
      }

    } else if (
      cover.plugin !== null
      && this.cardData && this.cardData.cover.idPlugin
    ) {
      embed.setColor(this.cardData.cover.edgeColor);

      const preview = getLargestAttachmentPreview(this.cardData.cover.scaled);

      /* Plugin-set card covers are the least reliable. Preview URL could be
       * unique per plugin, as such no proxy logic as with shared background
       * is used here. Simply pass the preview URL and ignore if it cannot be
       * rendered. */
      if (preview) {
        embed.setImage(preview.url);
      } else {
        embed.addFields({
          name: "Cover Preview",
          value: "Could not load cover image preview.",
          inline: false,
        });
      }
    }

    embed.addFields(
      {
        name: "Cover Size",
        value: cover.size,
        inline: true,
      },
      {
        name: "List",
        value: list.name,
        inline: false,
      },
    );

    return embed;
  }
}