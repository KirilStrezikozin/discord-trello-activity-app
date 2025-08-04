/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

/*
 * Guidelines for defining a shared base for action types to extend from.
 * =====================================================================
 *
 * The lowest base class is `Action`. Its `schema` and `data` are of ambiguous
 * types, which allows their types to be easily overwritten by a subclass of
 * `Action` to actually fit the parsing needs.
 *
 * If certain subclasses of the `Action` base class would benefit from reusing
 * common pieces of code, such as but not limited to, identical implementation
 * of `fetchData` and/or message building blocks that could be called from
 * `buildMessageInner`, one can extend the lowest base `Action` and define a
 * new and more complete base with methods and properties ready to be reused by
 * its direct subclasses.
 *
 * There is no limit to how nested this hierarchy of base classes could be
 * (for example, Action -> AttachmentActionBase -> CardCoverActionBase ->
 * AddedCardCover has 2 intermediate bases, each building up upon the previous
 * one). The only requirement is that `schema` and `data` properties must
 * extend the same property of their parent class (see usage of `shape`
 * function in this file) for their types to remain compatible.
 */

import { z } from "zod";

import {
  Action,
  ActionWithData,
} from "./base";

import {
  CardSchema,
  CardAttachmentPreviewProxySchema,
  CardAttachmentSchema,
  CardCoverColorNameToHexColor,
  CardCoverWithSourceSchema,
  CardCoverColorName,
  CardCheckListItemsSchema,
  CommentReactionsSummarySchema,
  ListSchema
} from "../schema";

import { EmbedBuilder } from "discord.js";
import { WebhookOptions } from "@/src/lib/options";
import { newTrelloAPIAxiosInstance } from "@/src/lib/utils/axios";

import {
  getLargestAttachmentPreview,
  resolveAttachmentPreviewProxy
} from "./utils";

/**
 * Returns Zod shape of the given Zod read-only object schema.
 */
function shape<
  T extends z.ZodReadonly<z.ZodObject>
>(
  schema: T
): T["def"]["innerType"]["shape"] {
  return schema.def.innerType.shape;
}

/**
 * Base class for action types for Trello attachment updates that share
 * additional data fetching and message building steps.
 */
export class AttachmentActionBase extends Action implements ActionWithData {
  protected static readonly _schema = z.object({
    data: z.object({
      attachment: z.object({
        id: z.string().min(1),
        previewUrl: z.url().optional(),
      }).readonly(),

      card: z.object({
        id: z.string().min(1),
      }).readonly(),
    }).readonly(),
  }).readonly();

  protected override data?: z.infer<typeof AttachmentActionBase._schema>;

  protected cardAttachmentData?: z.infer<typeof CardAttachmentSchema> = undefined;
  protected cardAttachmentPreviewProxy?: z.infer<typeof CardAttachmentPreviewProxySchema> = undefined;

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

  protected buildAttachmentPreview(
    embed: EmbedBuilder,
    attachment: z.infer<typeof CardAttachmentSchema>,
    attachmentUrl: string,
    previewProxy: z.infer<typeof CardAttachmentPreviewProxySchema> | undefined,
    inline: boolean,
  ) {
    if (attachment.edgeColor) {
      embed.setColor(attachment.edgeColor);
    }

    embed.addFields({
      name: "Attachment Link",
      value: `[Open Link](${attachmentUrl})`,
      inline: inline,
    });

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
  }
}

export type CardCoverWithSource = z.infer<typeof CardCoverWithSourceSchema>;

export type CardCoverSolidColor = CardCoverWithSource & {
  color: z.infer<typeof CardCoverColorName>
};

export type CardCoverAttachmentPreview = CardCoverWithSource & {
  idAttachment: string
};

export type CardCoverImage = CardCoverWithSource & {
  idUploadedBackground: string
};

export type CardCoverSetWithPlugin = CardCoverWithSource & {
  plugin: { [x: string]: unknown }
};

/**
 * Base class for action types for Trello card cover changes that share
 * additional data fetching and message building steps.
 */
export class CardCoverActionBase extends AttachmentActionBase implements ActionWithData {
  protected static override readonly _schema = z.object({
    ...shape(super["_schema"]),
    id: z.string().min(1),

    data: z.object({
      /* See comment at the top of the file for tips on nested action base
       * extensions. Here, we propagate the `attachment` key. */
      ...shape(shape(super["_schema"]).data),

      card: z.object({
        ...shape(shape(shape(super["_schema"]).data).card),

        cover: CardCoverWithSourceSchema,
        id: z.string().min(1),
        name: z.string().min(1),
        idShort: z.number(),
        shortLink: z.string(),
      }).readonly(),
    }).readonly(),
  }).readonly();

  protected override data?: z.infer<typeof CardCoverActionBase._schema>;

  protected cardAttachmentData?: z.infer<typeof CardAttachmentSchema> = undefined;
  protected cardAttachmentPreviewProxy?: z.infer<typeof CardAttachmentPreviewProxySchema> = undefined;
  protected cardData?: z.infer<typeof CardSchema> = undefined;

  /**
   * Fetches additional information to build a more descriptive message.
   *
   * If `idAttachment` is set on card cover, fetches attachment data.
   * If `idUploadedBackground`, fetches action card data to retrieve
   * the URL of uploaded background.
   *
   * @param opts Webhook app options.
   */
  public override async fetchData(opts: WebhookOptions): Promise<void> {
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

  protected getCoverDescription(cover: CardCoverWithSource) {
    return (
      this.coverIsSolidColor(cover) ? "Solid Color"
        : this.coverIsSetWithPlugin(cover) ? "Set with Plugin"
          : this.coverIsAttachmentPreview(cover) ? "Attachment Preview"
            : this.coverIsImage(cover) ? "Unsplash Image"
              : "Unknown"
    );
  }

  protected coverIsSolidColor(cover: CardCoverWithSource):
    cover is CardCoverSolidColor {
    return cover.color !== null;
  }

  protected coverIsAttachmentPreview(cover: CardCoverWithSource):
    cover is CardCoverAttachmentPreview {
    return cover.idAttachment !== null;
  }

  protected coverIsImage(cover: CardCoverWithSource):
    cover is CardCoverImage {
    return cover.idUploadedBackground !== null;
  }

  protected coverIsSetWithPlugin(cover: CardCoverWithSource):
    cover is CardCoverSetWithPlugin {
    return cover.plugin !== null;
  }

  protected buildCoverSolidColor(
    embed: EmbedBuilder,
    cover: CardCoverSolidColor,
  ) {
    embed.addFields({
      name: "Cover Color",
      value: cover.color,
      inline: true,
    });

    const parsedEdgeColor = CardCoverColorNameToHexColor.safeParse(cover.color);
    if (parsedEdgeColor.success) {
      embed.setColor(parsedEdgeColor.data);
    }
  }

  protected buildCoverAttachmentPreview(
    embed: EmbedBuilder,
    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    _card: CardCoverAttachmentPreview,
  ) {
    if (this.cardAttachmentData) {
      this.buildAttachmentPreview(
        embed,
        this.cardAttachmentData,
        this.cardAttachmentData.url,
        /* Attachment cover should always be previewable, which means that,
         * in this case, we had an error resolving the proxy URL. */
        this.cardAttachmentPreviewProxy ?? { success: false, url: undefined },
        true
      );
    }
  }

  protected buildCoverImage(
    embed: EmbedBuilder,
    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    _cover: CardCoverImage,
  ) {
    const cardData = this.cardData;
    if (!cardData || !cardData.cover.idUploadedBackground) return;

    embed
      .setColor(cardData.cover.edgeColor)
      .addFields({
        name: "Image Link",
        value: `[Open Link](${cardData.cover.sharedSourceUrl})`,
        inline: true,
      })
      ;

    const preview = getLargestAttachmentPreview(cardData.cover.scaled);

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
  }

  protected buildCoverSetWithPlugin(
    embed: EmbedBuilder,
    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    _cover: CardCoverSetWithPlugin,
  ) {
    const cardData = this.cardData;
    if (!cardData || !cardData.cover.idPlugin) return;

    embed.setColor(cardData.cover.edgeColor);

    const preview = getLargestAttachmentPreview(cardData.cover.scaled);

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
}

/**
 * Base class for action types for Trello card checklist changes that share
 * additional data fetching and message building steps.
 */
export class CheckListActionBase extends Action implements ActionWithData {
  protected static readonly _schema = z.object({
    data: z.object({
      checklist: z.object({
        id: z.string().min(1),
        name: z.string().min(1),
      }).readonly(),
    }).readonly(),
  }).readonly();

  protected override data?: z.infer<typeof CheckListActionBase._schema>;
  protected checkListItemsData?: z.infer<typeof CardCheckListItemsSchema> = undefined;

  /**
   * Fetches additional checklist information (checklist items) to build
   * a more descriptive message.
   *
   * @param opts Webhook app options.
   */
  public async fetchData(opts: WebhookOptions): Promise<void> {
    const axiosInst = newTrelloAPIAxiosInstance(opts);

    const { data } = await axiosInst(
      `/checklists/${this.data!.data.checklist.id}/checkItems`
    );

    const res = CardCheckListItemsSchema.safeParse(data);
    if (!res.success) {
      throw new Error(res.error.toString());
    }

    this.checkListItemsData = res.data;
  }

  protected buildTotalCompletedCheckItemsField(
    embed: EmbedBuilder,
    checkItems: z.infer<typeof CardCheckListItemsSchema>,
    inline: boolean,
    name: string = "Completed Checkitems",
  ) {
    const totalItems = checkItems.length;
    const completedItems = checkItems.reduce(
      (acc, item) => item.state === "complete" ? acc + 1 : acc, 0
    );

    embed.addFields({
      name: name,
      value: `${completedItems}/${totalItems}`,
      inline: inline
    });
  }
}

/**
 * Base class for action types that need to fetch Trello card's list data.
 */
export class CardListActionBase extends Action implements ActionWithData {
  protected static readonly _schema = z.object({
    data: z.object({
      card: z.object({
        id: z.string().min(1),
      }).readonly(),
    }).readonly(),
  }).readonly();

  protected override data?: z.infer<typeof CardListActionBase._schema>;
  protected listData?: z.infer<typeof ListSchema> = undefined;

  /**
   * Fetches additional card information (card's list) to build
   * a more descriptive message.
   *
   * @param opts Webhook app options.
   */
  public async fetchData(opts: WebhookOptions): Promise<void> {
    const axiosInst = newTrelloAPIAxiosInstance(opts);

    const { data } = await axiosInst(
      `/cards/${this.data!.data.card.id}/list`
    );

    const res = ListSchema.safeParse(data);
    if (!res.success) {
      throw new Error(res.error.toString());
    }

    this.listData = res.data;
  }
}

/**
 * Base class for action types for Trello comment updated that share
 * additional data fetching and message building steps.
 */
export class CommentActionBase extends CardListActionBase {
  protected static readonly _schema = z.object({
    data: z.object({
      action: z.object({
        id: z.string().min(1),
      }).readonly(),

      card: z.object({
        id: z.string().min(1),
      }).readonly(),
    }).readonly(),
  }).readonly();

  protected override data?: z.infer<typeof CommentActionBase._schema>;
  protected commentReactionsSummaryData?: z.infer<typeof CommentReactionsSummarySchema> = undefined;

  /**
   * Fetches additional comment information to build
   * a more descriptive message:
   *
   *   - Card comment reaction summary.
   *   - Card's list.
   *
   * @param opts Webhook app options.
   */
  public override async fetchData(opts: WebhookOptions): Promise<void> {
    await super.fetchData(opts); /* Fetch `listData`. */

    const axiosInst = newTrelloAPIAxiosInstance(opts);

    const { data } = await axiosInst(
      `/actions/${this.data!.data.action.id}/reactionsSummary`
    );

    const res = CommentReactionsSummarySchema.safeParse(data);
    if (!res.success) {
      throw new Error(res.error.toString());
    }

    this.commentReactionsSummaryData = res.data;
  }

  protected buildCommentReactionsSummaryField(
    embed: EmbedBuilder,
    reactionsSummary: z.infer<typeof CommentReactionsSummarySchema>,
    inline: boolean,
  ) {
    const summary = reactionsSummary.reduce(
      (accum, reaction) => {
        accum.totalCount += reaction.count;
        accum.concat += reaction.emoji.native;
        return accum;
      },
      {
        totalCount: 0,
        concat: "",
      }
    );

    embed.addFields({
      name: "Comment Reactions",
      value: `${summary.totalCount} (${summary.concat})`,
      inline: inline
    });
  }
}

/**
 * Base class for action types for Trello votes that share
 * additional data fetching and message building steps.
 */
export class VoteActionBase extends Action implements ActionWithData {
  protected static readonly _schema = z.object({
    id: z.string().min(1),
  }).readonly();

  protected override data?: z.infer<typeof VoteActionBase._schema>;
  protected cardData?: z.infer<typeof CardSchema> = undefined;

  /**
   * Fetches additional card information (total number of votes) to build
   * a more descriptive message.
   *
   * @param opts Webhook app options.
   */
  public async fetchData(opts: WebhookOptions): Promise<void> {
    const axiosInst = newTrelloAPIAxiosInstance(opts);

    const { data } = await axiosInst(`/actions/${this.data!.id}/card`);

    const res = CardSchema.safeParse(data);
    if (!res.success) {
      throw new Error(res.error.toString());
    }

    this.cardData = res.data;
  }

  protected buildTotalVotesField(
    embed: EmbedBuilder, cardData: z.infer<typeof CardSchema>, inline: boolean
  ) {
    embed.addFields({
      name: "Total Votes",
      value: cardData.idMembersVoted.length.toString(),
      inline: inline
    });
  }
}