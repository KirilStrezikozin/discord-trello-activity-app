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

import {
  ActionCardSchema,
  CardAttachmentSchema,
  CardCoverColorNameToHexColor,
  CardCoverNoSourceSchema,
  CardCoverWithSourceSchema
} from "../schema";

import { EmbedBuilder } from "discord.js";
import { WebhookOptions } from "@/src/lib/options";
import { RequestError } from "@/src/lib/error";
import { getMemberIcon, getSmallestAttachmentPreview } from "./utils";

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
    const cover = this.data!.data.card.cover;

    const fetchDataInner = async (url: string): Promise<unknown> => {
      const resp = await fetch(
        url, { method: 'GET', headers: { 'Accept': 'application/json' } }
      );

      if (resp.status != 200) {
        throw new RequestError(
          "Failed to fetch card for an action or attachment for a card",
          resp.status
        );
      }

      return resp.json();
    }

    if (cover.idAttachment) {
      const data = await fetchDataInner(
        `https://api.trello.com/1/cards/${this.data!.data.card.id}\
/attachments/${cover.idAttachment}?key=${opts.apiKey}&token=${opts.token}`
      );

      const res = CardAttachmentSchema.safeParse(data);
      if (!res.success) {
        throw new Error(res.error.toString());
      }
      this.cardAttachmentData = res.data;

    } else if (cover.idUploadedBackground || cover.plugin) {
      const data = await fetchDataInner(
        `https://api.trello.com/1/actions/${this.data!.id}\
/card?key=${opts.apiKey}&token=${opts.token}`
      );

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

        embed
          .addFields({
            name: "Attachment Link",
            value: `[Open Link](${attachment.url})`,
            inline: true,
          })
          .setImage(
            getSmallestAttachmentPreview(
              attachment.previews
            )?.url ?? null
          )
          ;
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
          .setImage(
            getSmallestAttachmentPreview(
              this.actionCardData.cover.scaled
            )?.url ?? null
          )
          ;
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
        embed
          .setColor(this.actionCardData.cover.edgeColor)
          .setImage(
            getSmallestAttachmentPreview(
              this.actionCardData.cover.scaled
            )?.url ?? null
          )
          ;
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