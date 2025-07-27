/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import { z } from "zod";
import axios from "axios";
import * as log from "@/src/lib/log";

import {
  Action,
  MessageOptions
} from "./base";

import {
  ActionCardSchema,
  CardAttachmentPreviewProxySchema,
  CardAttachmentSchema,
  CardCoverColorNameToHexColor,
  CardCoverNoSourceSchema,
  CardCoverWithSourceSchema
} from "../schema";

import { EmbedBuilder } from "discord.js";
import { WebhookOptions } from "@/src/lib/options";
import { getMemberIcon, getLargestAttachmentPreview } from "./utils";

export default class ActionAddedCardCover extends Action {
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
  private actionCardData?: z.infer<typeof ActionCardSchema> = undefined;

  /**
   * Fetches additional information to build a more descriptive message.
   *
   * If `idAttachment` is set on card cover, fetches attachment data.
   * If `idUploadedBackground`, fetches action card data to retrieve
   * the URL of uploaded background.
   *
   * @param opts Webhook app options. `apiKey` and `token` must be set.
   */
  async fetchData(opts: WebhookOptions): Promise<void> {
    const actionId = this.data!.id;
    const { card } = this.data!.data;

    /* Axios instance as a helper to fetch Trello data using its API. */
    const axiosInst = axios.create({
      method: "get",
      baseURL: "https://api.trello.com/1/",
      timeout: 10000,
      responseType: "json",
      params: {
        "key": opts.apiKey,
        "token": opts.token,
      },
    });

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
        /* Proxy URL is without credentials in search params to avoid
         * accidentally leaking them. Proxy endpoint should be generally
         * disabled if the webhook app is public, and anyone can get served. */
        const previewProxyUrl = new URL(
          `/api/proxy/trello/1/cards/${card.id}/\
attachments/${card.cover.idAttachment}/previews/${preview?.id}/\
download/${this.cardAttachmentData.fileName}`,
          opts.originUrl
        );

        /* Fire a test HEAD request to our proxy endpoint to avoid missing an
         * image in the message in case there is an error. */
        try {
          await axios.head(
            previewProxyUrl.toString(),
            { validateStatus: (status: number) => status === 200 },
          );
          /* Request to our proxy is ok at this point, save the URL. */
          this.cardAttachmentPreviewProxy = {
            success: true,
            url: previewProxyUrl.toString(),
          };
        } catch (error) {
          /* Request to our proxy was not successful. */
          log.error(error);
          this.cardAttachmentPreviewProxy = {
            success: false,
            url: undefined,
          };
        }

      }

    } else if (card.cover.idUploadedBackground || card.cover.plugin) {
      /* Unsplash image is used as card cover or plugin set it, fetch card. */
      const { data } = await axiosInst(`/actions/${actionId}/card`);

      /* Parse and validate fetched data. */
      const res = ActionCardSchema.safeParse(data);
      if (!res.success) {
        throw new Error(res.error.toString());
      }

      this.actionCardData = res.data;

    } else {
      /* No attachment or uploaded background ID is set, no-op. */
      return;
    }
  }

  protected override buildMessageInner(
    embed: EmbedBuilder, opts: MessageOptions
  ): EmbedBuilder {
    const name = opts.member
      ? `${opts.member?.username} has added a cover to a card`
      : "A cover has been added to a card";

    embed
      .setAuthor({ name: name, iconURL: getMemberIcon(opts) })
      .setTitle(this.data!.data.card.name)
      .setURL(`https://trello.com/c/${this.data!.data.card.shortLink}`)
      ;

    const cover = this.data!.data.card.cover;

    if (cover.color) {
      embed
        .setDescription(
          cover.manualCoverAttachment
            ? "Solid color card cover."
            : "Solid color card cover automatically selected by Trello."
        )
        .addFields({
          name: "Cover Color",
          value: cover.color,
          inline: true,
        })
        ;

      const parsedEdgeColor = CardCoverColorNameToHexColor.safeParse(
        cover.color
      );

      if (parsedEdgeColor.success) {
        embed.setColor(parsedEdgeColor.data);
      }
    } else if (cover.idAttachment) {
      embed
        .setDescription(
          cover.manualCoverAttachment
            ? "Attachment preview as card cover."
            : "Attachment preview automatically selected by Trello as card cover."
        )
        ;

      if (this.cardAttachmentData) {
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
          embed.addFields({
            name: "Attachment Preview",
            value: "Could not load attachment image preview.",
            inline: false,
          });
        }
      }
    } else if (cover.idUploadedBackground) {
      embed
        .setDescription(
          cover.manualCoverAttachment
            ? "Unsplash image card cover."
            : "Unsplash image card cover automatically selected by Trello."
        )
        ;

      if (this.actionCardData
        && this.actionCardData.cover.idUploadedBackground) {
        embed
          .setColor(this.actionCardData.cover.edgeColor)
          .addFields({
            name: "Image Link",
            value: `[Open Link](${this.actionCardData.cover.sharedSourceUrl})`,
            inline: true,
          })
          ;

        const preview = getLargestAttachmentPreview(
          this.actionCardData.cover.scaled
        );

        if (preview) {
          embed.setImage(preview.url);
        } else {
          embed.addFields({
            name: "Image Preview",
            value: "Could not load image preview.",
            inline: false,
          });
        }

      }
    } else if (cover.plugin !== null) {
      embed
        .setDescription(
          cover.manualCoverAttachment
            ? "Card cover set with plugin."
            : "Card cover set with plugin automatically by Trello."
        )
        ;

      if (this.actionCardData && this.actionCardData.cover.idPlugin) {
        embed.setColor(this.actionCardData.cover.edgeColor);

        const preview = getLargestAttachmentPreview(
          this.actionCardData.cover.scaled
        );

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
    } else {
      /* Parsing will fail if the conditions above were not satisfied in the
       * first place, but this case still exists for clarity. */
      embed
        .setDescription(
          cover.manualCoverAttachment
            ? "Unknown card cover."
            : "Unknown card cover automatically selected by Trello."
        )
        ;
    }

    embed
      .addFields(
        {
          name: "Cover Size",
          value: cover.size,
          inline: true,
        },
        {
          name: "List",
          value: this.data!.data.list.name,
          inline: false,
        },
      )
      ;

    return embed;
  }
}