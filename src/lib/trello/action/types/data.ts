/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import * as z from 'zod';
import * as log from "@/src/lib/log";

import { AxiosInstance } from "axios";
import { WebhookOptions } from "@/src/lib/options";
import { getLargestAttachmentPreview } from "./utils";
import { newTrelloAPIAxiosInstance } from "@/src/lib/utils/axios";

import {
  ActionMemberSchema,
  BoardListsWithCardsSchema,
  BoardSchema,
  CardAttachmentPreviewProxySchema,
  CardAttachmentSchema,
  CardCheckListItemsSchema,
  CardSchema,
  CommentReactionsSummarySchema,
  ListCardsSchema,
  ListSchema
} from "../schema";

/**
 * @class DataProperty
 * @description Represents a property holding additionally fetched data from,
 * for example, Trello servers. Data property classes that implement this
 * abstract class define a public `resolve` method to fetch and parse the data
 * they can hold.
 */
export abstract class DataProperty {
  protected opts: WebhookOptions;
  protected axiosInst: AxiosInstance;

  /**
   * Returns a new Axios instance as a helper to
   * fetch Trello data using its API.
   *
   * @param opts Webhook app options.
   * @returns New Axios instance.
   */
  protected static newAxiosInstance = newTrelloAPIAxiosInstance;

  /**
   * Fetches and parses data.
   */
  abstract resolve(params: Record<string, unknown>): Promise<void>;

  /**
   * Construct a new Data property instance.
   * @param opts Webhook app options to use for fetching requests.
   */
  constructor(opts: WebhookOptions) {
    this.opts = opts;
    this.axiosInst = DataProperty.newAxiosInstance(this.opts);
  }
}

/**
 * @class ActionCardDataProperty
 * @description Represents Trello action's card data.
 * Call `resolve` to fetch it.
 *
 * The corresponding relative Trello API URL(s):
 * 1. /actions/[actionId]/card
 */
export class ActionCardDataProperty extends DataProperty {
  /** Card data. Defined after a successful call to `resolve`. */
  public data?: z.infer<typeof CardSchema> = undefined;

  /**
   * Fetch action card data from Trello servers.
   * A successful call sets the public `data` property on this instance.
   *
   * The corresponding relative Trello API URL(s):
   * 1. /actions/[actionId]/card
   *
   * @param params The respective `actionId`.
   */
  public async resolve(params: {
    actionId: string
  }) {
    const { data } = await this.axiosInst(`/actions/${params.actionId}/card`);

    /* Parse and validate fetched data. */
    const res = CardSchema.safeParse(data);
    if (!res.success) {
      throw new Error(res.error.toString());
    }

    this.data = res.data;
  }
}

/**
 * @class CardAttachmentDataProperty
 * @description Represents Trello card attachment data.
 * Call `resolve` to fetch it.
 *
 * The corresponding relative Trello API URL(s):
 * 1. /cards/[cardId]/attachments/[attachmentId]
 * 2. /cards/[cardId]/attachments/[attachmentId]/previews/[previewId]/download/[fileName]
 */
export class CardAttachmentDataProperty extends DataProperty {
  private paramCardId?: string = undefined;

  /** Attachment data. Defined after a successful call to `resolve`. */
  public data?: z.infer<typeof CardAttachmentSchema> = undefined;
  /** Preview data. Defined after a successful call to `resolvePreview`. */
  public previewData?: z.infer<typeof CardAttachmentPreviewProxySchema> = undefined;

  /**
   * Fetch card attachment data from Trello servers.
   * A successful call sets the public `data` property on this instance.
   *
   * The corresponding relative Trello API URL(s):
   * 1. /cards/[cardId]/attachments/[attachmentId]
   *
   * @param params The respective `cardId` and `attachmentId`.
   */
  public async resolve(params: {
    cardId: string, attachmentId: string
  }) {
    const { data } = await this.axiosInst(
      `/cards/${params.cardId}/attachments/${params.attachmentId}`
    );

    /* Parse and validate fetched data. */
    const res = CardAttachmentSchema.safeParse(data);
    if (!res.success) {
      throw new Error(res.error.toString());
    }

    this.paramCardId = params.cardId;
    this.data = res.data;
  }

  /**
   * Resolve card attachment preview data.
   * Clients must wait for the `resolve` method to resolve first.
   * A successful call sets the public `previewData` property on this instance.
   *
   * The corresponding relative Trello API URL(s):
   * 1. /cards/[cardId]/attachments/[attachmentId]/previews/[previewId]/download/[fileName]
   *
   * API URL path parameters are set by `data` the call to `resolve` populated.
   */
  public async resolvePreview(): Promise<void> {
    if (this.data === undefined) {
      throw new Error(
        `${this.resolve.name}() not called or failed before call to ${this.resolvePreview.name}()`
      );
    }

    /* Resolve a proxy URL for the attachment preview, if attachment has
     * image previews. Proxy URL to our webhook app avoids Trello credentials
     * that would be otherwise required to request the attachment preview by
     * its URL directly, and message content should be publicly hosted. */
    const preview = getLargestAttachmentPreview(this.data!.previews);
    if (preview === null) return;

    /* Proxy URL is without credentials in search params to avoid
     * accidentally leaking them. Proxy endpoint should be generally
     * disabled if the webhook app is public, and anyone can get served. */
    const previewProxyUrl = new URL(
      `/api/proxy/trello/1/cards/${this.paramCardId!}/attachments/
${this.data!.id}/previews/${preview.id}/download/${this.data!.fileName}`,
      this.opts.originUrl
    );

    /* Fire a test HEAD request to our proxy endpoint to avoid missing an
     * image in the message in case there is an error. */
    try {
      await this.axiosInst.head(
        previewProxyUrl.toString(),
        {
          validateStatus: (status: number) => status === 200,
          allowAbsoluteUrls: true,
          params: {},
        },
      );

      /* Request to our proxy is OK at this point, save the URL. */
      this.previewData = {
        success: true,
        url: previewProxyUrl.toString(),
      };

    } catch (error) {
      /* Request to our proxy was not successful. */
      log.error(error);
      this.previewData = {
        success: false,
        url: undefined,
      };
    }
  }
}

/**
 * @class CardAttachmentDataProperty
 * @description Represents Trello card's list data.
 * Call `resolve` to fetch it.
 *
 * The corresponding relative Trello API URL(s):
 * 1. /cards/[cardId]/list
 */
export class CardListDataProperty extends DataProperty {
  public data?: z.infer<typeof ListSchema> = undefined;

  /**
   * Fetch card's list data from Trello servers.
   * A successful call sets the public `data` property on this instance.
   *
   * The corresponding relative Trello API URL(s):
   * 1. /cards/[cardId]/list
   *
   * @param params The respective `cardId`.
   */
  public async resolve(params: {
    cardId: string
  }) {
    const { data } = await this.axiosInst(
      `/cards/${params.cardId}/list`
    );

    /* Parse and validate fetched data. */
    const res = ListSchema.safeParse(data);
    if (!res.success) {
      throw new Error(res.error.toString());
    }

    this.data = res.data;
  }
}


/**
 * @class CardAttachmentDataProperty
 * @description Represents Trello comment's reactions summary data.
 * Call `resolve` to fetch it.
 *
 * The corresponding relative Trello API URL(s):
 * 1. /actions/[actionId]/reactionsSummary
 */
export class CommentReactionsSummaryDataProperty extends DataProperty {
  public data?: z.infer<typeof CommentReactionsSummarySchema> = undefined;

  /**
   * Fetch comment's reactions summary data from Trello servers.
   * A successful call sets the public `data` property on this instance.
   *
   * The corresponding relative Trello API URL(s):
   * 1. /actions/[actionId]/reactionsSummary
   *
   * @param params The respective `actionId`.
   */
  public async resolve(params: {
    actionId: string
  }): Promise<void> {
    const { data } = await this.axiosInst(
      `/actions/${params.actionId}/reactionsSummary`
    );

    /* Parse and validate fetched data. */
    const res = CommentReactionsSummarySchema.safeParse(data);
    if (!res.success) {
      throw new Error(res.error.toString());
    }

    this.data = res.data;
  }
}


/**
 * @class CheckListItemsDataProperty
 * @description Represents Trello checklist items data.
 * Call `resolve` to fetch it.
 *
 * The corresponding relative Trello API URL(s):
 * 1. /checklists/[checkListId]/checkItems
 */
export class CheckListItemsDataProperty extends DataProperty {
  public data?: z.infer<typeof CardCheckListItemsSchema> = undefined;

  /**
   * Fetch checklist items data from Trello servers.
   * A successful call sets the public `data` property on this instance.
   *
   * The corresponding relative Trello API URL(s):
   * 1. /checklists/[checkListId]/checkItems
   *
   * @param params The respective `checkListId`.
   */
  public async resolve(params: {
    checkListId: string
  }): Promise<void> {
    const { data } = await this.axiosInst(
      `/checklists/${params.checkListId}/checkItems`
    );

    /* Parse and validate fetched data. */
    const res = CardCheckListItemsSchema.safeParse(data);
    if (!res.success) {
      throw new Error(res.error.toString());
    }

    this.data = res.data;
  }
}


/**
 * @class ActionMemberDataProperty
 * @description Represents Trello action member data.
 * Call `resolve` to fetch it.
 *
 * The corresponding relative Trello API URL(s):
 * 1. /actions/[actionId]/member
 */
export class ActionMemberDataProperty extends DataProperty {
  public data?: z.infer<typeof ActionMemberSchema> = undefined;

  /**
   * Fetch Trello action member data from Trello servers.
   * A successful call sets the public `data` property on this instance.
   *
   * The corresponding relative Trello API URL(s):
   * 1. /actions/[actionId]/member
   *
   * @param params The respective `actionId`.
   */
  public async resolve(params: {
    actionId: string
  }) {
    const { data } = await this.axiosInst(
      `/actions/${params.actionId}/member`
    );

    /* Parse and validate fetched data. */
    const res = ActionMemberSchema.safeParse(data);
    if (!res.success) {
      throw new Error(res.error.toString());
    }

    this.data = res.data;
  }
}

/**
 * @class ListCardsDataProperty
 * @description Represents Trello list cards data.
 * Call `resolve` to fetch it.
 *
 * The corresponding relative Trello API URL(s):
 * 1. /lists/[listId]/cards
 */
export class ListCardsDataProperty extends DataProperty {
  public data?: z.infer<typeof ListCardsSchema> = undefined;

  /**
   * Fetch Trello list cards data from Trello servers.
   * A successful call sets the public `data` property on this instance.
   *
   * The corresponding relative Trello API URL(s):
   * 1. /lists/[listId]/cards
   *
   * @param params The respective `listId`.
   */
  public async resolve(params: {
    listId: string
  }) {
    const { data } = await this.axiosInst(`/lists/${params.listId}/cards`);

    /* Parse and validate fetched data. */
    const res = ListCardsSchema.safeParse(data);
    if (!res.success) {
      throw new Error(res.error.toString());
    }

    this.data = res.data;
  }
}

/**
 * @class BoardListsWithCardsDataProperty
 * @description Represents Trello board lists with cards data.
 * Call `resolve` to fetch it.
 *
 * The corresponding relative Trello API URL(s):
 * 1. /boards/[boardId]/lists
 */
export class BoardListsWithCardsDataProperty extends DataProperty {
  public data?: z.infer<typeof BoardListsWithCardsSchema> = undefined;

  /**
   * Fetch Trello board lists with cards data from Trello servers.
   * A successful call sets the public `data` property on this instance.
   *
   * The corresponding relative Trello API URL(s):
   * 1. /boards/[boardId]/lists
   *
   * @param params The respective `boardId`.
   */
  public async resolve(params: {
    boardId: string, filter?: Partial<{
      filter: "all" | "closed" | "none" | "open",
      cards: "all" | "closed" | "none" | "open",
    }>
  }) {
    const { data } = await this.axiosInst(
      `/boards/${params.boardId}/lists/`,
      {
        params: params.filter,
      },
    );

    /* Parse and validate fetched data. */
    const res = BoardListsWithCardsSchema.safeParse(data);
    if (!res.success) {
      throw new Error(res.error.toString());
    }

    this.data = res.data;
  }
}

/**
 * @class BoardDataProperty
 * @description Represents Trello board data.
 * Call `resolve` to fetch it.
 *
 * The corresponding relative Trello API URL(s):
 * 1. /boards/[boardId]
 */
export class BoardDataProperty extends DataProperty {
  public data?: z.infer<typeof BoardSchema> = undefined;

  /**
   * Fetch board data from Trello servers.
   * A successful call sets the public `data` property on this instance.
   *
   * The corresponding relative Trello API URL(s):
   * 1. /boards/[boardId]
   *
   * @param params The respective `boardId`.
   */
  public async resolve(params: {
    boardId: string
  }) {
    const { data } = await this.axiosInst(`/boards/${params.boardId}`);

    /* Parse and validate fetched data. */
    const res = BoardSchema.safeParse(data);
    if (!res.success) {
      throw new Error(res.error.toString());
    }

    this.data = res.data;
  }
}