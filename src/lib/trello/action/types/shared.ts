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

import * as z from 'zod';

import { Mixin } from '@/src/lib/mixin';

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
} from "../schema";

import {
  ActionCardDataProperty,
  ActionMemberDataProperty,
  CardAttachmentDataProperty,
  CardListDataProperty,
  CheckListItemsDataProperty,
  CommentReactionsSummaryDataProperty,
  ListCardsDataProperty
} from './data';

import { EmbedBuilder } from "discord.js";
import { WebhookOptions } from "@/src/lib/options";
import { getLargestAttachmentPreview } from "./utils";

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
 * @class ActionCardActionBase
 *
 * @description Intermediate base class for action types that need to fetch
 * Trello action's card data.
 *
 * Populates `cardData` property.
 */
export class ActionCardActionBase extends Action implements ActionWithData {
  protected static readonly _schema = z.object({
    id: z.string().min(1),
  }).readonly();

  protected override data?: z.infer<typeof ActionCardActionBase._schema>;
  protected cardData?: ActionCardDataProperty = undefined;

  /**
   * Fetches additional data to build a more descriptive message:
   *
   * 1. Trello action's card data.
   *
   * @param opts Webhook app options.
   */
  public async fetchData(opts: WebhookOptions): Promise<void> {
    this.cardData = new ActionCardDataProperty(opts);

    /* Fetch card data. */
    await this.cardData.resolve({ actionId: this.data!.id });
  }
}

/**
 * @class AttachmentActionBase
 *
 * @description Intermediate base class for action types that need to fetch
 * Trello card's attachment data and, optionally, its preview.
 *
 * Populates `cardAttachmentData` property.
 */
export class AttachmentActionBase extends Action implements ActionWithData {
  protected static readonly _schema = z.object({
    data: z.object({
      attachment: z.object({
        id: z.string().min(1),
      }).readonly(),

      card: z.object({
        id: z.string().min(1),
      }).readonly(),
    }).readonly(),
  }).readonly();

  protected override data?: z.infer<typeof AttachmentActionBase._schema>;
  protected cardAttachmentData?: CardAttachmentDataProperty = undefined;

  /**
   * Internal helper to fetch attachment ID. Override on subclasses instead of
   * repeating attachment data fetching in `fetchData` if schema changes.
   */
  protected getAttachmentId(): string {
    return this.data!.data.attachment.id;
  }

  /**
   * Fetches additional information to build a more descriptive message:
   *
   * 1. Attachment data and resolves its preview URL through our proxy endpoint.
   *
   * @param opts Webhook app options.
   */
  public async fetchData(opts: WebhookOptions): Promise<void> {
    const { card } = this.data!.data;

    this.cardAttachmentData = new CardAttachmentDataProperty(opts);

    /* Fetch attachment data. */
    await this.cardAttachmentData.resolve(
      { cardId: card.id, attachmentId: this.getAttachmentId() }
    );

    /* Fetch attachment preview data. */
    await this.cardAttachmentData.resolvePreview();
  }

  protected buildAttachmentFields(
    embed: EmbedBuilder,
    attachmentUrl: string,
    attachment: z.infer<typeof CardAttachmentSchema> | undefined,
    previewProxy: z.infer<typeof CardAttachmentPreviewProxySchema> | undefined,
    inline: boolean,
  ) {
    if (attachment?.edgeColor) {
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

export type CardCoverSolidColor = CardCoverWithSource & { color: z.infer<typeof CardCoverColorName> };
export type CardCoverAttachmentPreview = CardCoverWithSource & { idAttachment: string };
export type CardCoverImage = CardCoverWithSource & { idUploadedBackground: string };
export type CardCoverSetWithPlugin = CardCoverWithSource & { plugin: { [x: string]: unknown } };

/**
 * @class CardCoverActionBase
 *
 * @description Intermediate base class for action types that
 * work with card covers and need to fetch action's card data,
 * card attachment data and its preview.
 *
 * Populates `cardData` and `cardAttachmentData` property.
 *
 * @extends ActionCardActionBase
 * @mixes AttachmentActionBase
 */
export class CardCoverActionBase extends Mixin(
  AttachmentActionBase, /* Mix-in */
  ActionCardActionBase /* Base */
) {
  protected static override readonly _schema = z.object({
    ...shape(super["_schema"]),
    ...shape(this.mixin["_schema"]),

    data: z.object({
      /* See comment at the top of the file for tips on nested action base
       * extensions. Here, we propagate the `attachment` key. */
      ...shape(shape(this.mixin["_schema"]).data),

      /* Promote to `any`, so that subclasses can change it to `undefined`. */
      attachment: z.any(),

      card: z.object({
        ...shape(shape(shape(this.mixin["_schema"]).data).card),

        cover: CardCoverWithSourceSchema,
        id: z.string().min(1),
      }).readonly(),
    }).readonly(),
  }).readonly();

  protected override data?: z.infer<typeof CardCoverActionBase._schema>;

  /** @see `AttachmentActionBase.getAttachmentId()` */
  protected override getAttachmentId(): string {
    return this.data!.data.card.cover.idAttachment!;
  }

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
    const { card } = this.data!.data;

    if (card.cover.idAttachment) {
      /* Attachment is used as card cover,
       * fetch attachment data and resolve its preview. */

      /* `getAttachmentId` is overridden, so can safely call mixin's
       * `fetchData` implementation, which uses a different schema: */
      await CardCoverActionBase.mixin.prototype.fetchData.call(this, opts);

    } else if (card.cover.idUploadedBackground || card.cover.plugin) {
      /* Unsplash image is used as card cover or plugin set it,
       * fetch action's card data. */
      await super.fetchData(opts);
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
      this.buildAttachmentFields(
        embed,
        this.cardAttachmentData.data!.url,
        this.cardAttachmentData.data!,
        /* Attachment cover should always be previewable, which means that,
         * in this case, we had an error resolving the proxy URL. */
        this.cardAttachmentData.previewData ?? { success: false, url: undefined },
        true
      );
    }
  }

  protected buildCoverImage(
    embed: EmbedBuilder,
    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    _cover: CardCoverImage,
  ) {
    const cardData = this.cardData?.data;
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
    const cardData = this.cardData?.data;
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
 * @class CheckListActionBase
 *
 * @description Intermediate base class for action types that
 * need to fetch Trello checklist items data.
 *
 * Populates `checkListItemsData` property.
 */
export class CheckListActionBase extends Action implements ActionWithData {
  protected static readonly _schema = z.object({
    data: z.object({
      checklist: z.object({
        id: z.string().min(1),
      }).readonly(),
    }).readonly(),
  }).readonly();

  protected override data?: z.infer<typeof CheckListActionBase._schema>;
  protected checkListItemsData?: CheckListItemsDataProperty = undefined;

  /**
   * Fetches additional data to build a more descriptive message:
   *
   * 1. Trello checklist items data.
   *
   * @param opts Webhook app options.
   */
  public async fetchData(opts: WebhookOptions): Promise<void> {
    this.checkListItemsData = new CheckListItemsDataProperty(opts);

    /* Fetch checklist items data. */
    await this.checkListItemsData.resolve(
      { checkListId: this.data!.data.checklist.id }
    );
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
 * @class CardListActionBase
 *
 * @description Intermediate base class for action types that
 * need to fetch Trello card's list data.
 *
 * Populates `listData` property.
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
  protected listData?: CardListDataProperty = undefined;

  /**
   * Fetches additional data to build a more descriptive message:
   *
   * 1. Trello card's list data.
   *
   * @param opts Webhook app options.
   */
  public async fetchData(opts: WebhookOptions): Promise<void> {
    this.listData = new CardListDataProperty(opts);

    /* Fetch card's list data. */
    await this.listData.resolve({ cardId: this.data!.data.card.id });
  }
}

/**
 * @class CommentActionBase
 *
 * @description Intermediate base class for action types that
 * work with card comments and need to fetch comment's reactions summary
 * and card's list (typically not bundled in comment action types' payloads).
 *
 * Populates `listData` and `commentReactionsSummaryData` property.
 *
 * @extends CardListActionBase
 */
export class CommentActionBase extends CardListActionBase {
  protected static override readonly _schema = z.object({
    ...shape(super["_schema"]),

    data: z.object({
      ...shape(shape(super["_schema"]).data),

      action: z.object({
        id: z.string().min(1),
      }).readonly(),
    }).readonly(),
  }).readonly();

  protected override data?: z.infer<typeof CommentActionBase._schema>;
  protected commentReactionsSummaryData?: CommentReactionsSummaryDataProperty = undefined;

  /**
   * Fetches additional data to build a more descriptive message:
   *
   * 1. Card comment's reactions summary.
   * 2. Card's list.
   *
   * @param opts Webhook app options.
   */
  public override async fetchData(opts: WebhookOptions): Promise<void> {
    await super.fetchData(opts); /* Fetch `listData`. */

    this.commentReactionsSummaryData =
      new CommentReactionsSummaryDataProperty(opts);

    /* Fetch card comment's reactions summary data. */
    await this.commentReactionsSummaryData.resolve(
      { actionId: this.data!.data.action.id }
    );
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
 * @class VoteActionBase
 *
 * @description Intermediate base class for action types that
 * work with votes on Trello cards.
 *
 * Populates `cardData` property.
 *
 * @extends CardActionBase
 */
export class VoteActionBase extends ActionCardActionBase {
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

/**
 * @class ActionMemberActionBase
 *
 * @description Intermediate base class for action types that need to fetch
 * Trello action's member data.
 *
 * Populates `memberData` property.
 */
export class ActionMemberActionBase extends Action implements ActionWithData {
  protected static readonly _schema = z.object({
    id: z.string().min(1),
  }).readonly();

  protected override data?: z.infer<typeof ActionMemberActionBase._schema>;
  protected memberData?: ActionMemberDataProperty = undefined;

  /**
   * Fetches additional data to build a more descriptive message:
   *
   * 1. Trello action's member data.
   *
   * @param opts Webhook app options.
   */
  public async fetchData(opts: WebhookOptions): Promise<void> {
    this.memberData = new ActionMemberDataProperty(opts);

    /* Fetch member data. */
    await this.memberData.resolve({ actionId: this.data!.id });
  }
}

/**
 * @class ListCardsActionBase
 *
 * @description Intermediate base class for action types that need to fetch
 * Trello list cards data.
 *
 * Populates `listCardsData` property.
 */
export class ListCardsActionBase extends Action implements ActionWithData {
  protected static readonly _schema = z.object({
    data: z.object({
      list: z.object({
        id: z.string().min(1),
      }).readonly(),
    }).readonly(),
  }).readonly();

  protected override data?: z.infer<typeof ListCardsActionBase._schema>;
  protected listCardsData?: ListCardsDataProperty = undefined;

  /**
   * Fetches additional data to build a more descriptive message:
   *
   * 1. Trello list cards data.
   *
   * @param opts Webhook app options.
   */
  public async fetchData(opts: WebhookOptions): Promise<void> {
    this.listCardsData = new ListCardsDataProperty(opts);

    /* Fetch list cards data. */
    await this.listCardsData.resolve({ listId: this.data!.data.list.id });
  }
}