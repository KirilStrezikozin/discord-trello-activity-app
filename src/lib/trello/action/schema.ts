/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import { z } from "zod";
import { ColorSchema } from "../../color";

/**
 * Webhook model schema of the webhook response from Trello.
 * Does not describe all possible fields.
 */
export const WebhookModelSchema = z.object({
  id: z.string().min(1),
  desription: z.string().nullish(),
  idModel: z.string().min(1),
  callbackURL: z.string().min(1),
  active: z.boolean(),
}).readonly();

/**
 * Schema of the model the webhook for Trello is subscribed
 * to (e.g. a board, a card). See the link below for more information:
 * https://developer.atlassian.com/cloud/trello/guides/rest-api/webhooks/#creating-a-webhook
 */
export const ModelSchema = z.looseObject({
  id: z.string().min(1),
}).readonly();

/** Trello board schema if the model the webhook is subscribed to is a board. */
export const BoardModelSchema = z.looseObject({
  id: z.string().min(1),
  name: z.string().min(1),
  desc: z.string().nullable(),
  idOrganization: z.string().min(1),
  url: z.url(),
  shortUrl: z.url(),

  prefs: z.looseObject({
    background: z.string().nullish(),
    backgroundColor: ColorSchema.nullish(),
    backgroundDarkColor: ColorSchema.nullish(),
    backgroundBottomColor: ColorSchema.nullish(),
    backgroundTopColor: ColorSchema.nullish(),
  }).readonly(),

  labelNames: z.looseObject({}).readonly(),
}).readonly();

/** Schema of the member who triggered an action in Trello. */
export const MemberSchema = z.looseObject({
  id: z.string().min(1),
  avatarUrl: z.url(),
  fullName: z.string(),
  initials: z.string(),
  username: z.string().min(1),
}).readonly();

/**
 * Schema of the action object which describes what action in
 * Trello triggered the webhook.
 */
export const ActionSchema = z.object({
  id: z.string().min(1),
  type: z.string(),
  date: z.iso.datetime({ precision: 3 }),
  idMemberCreator: z.string().min(1),

  data: z.looseObject({}).readonly(),

  display: z.looseObject({
    translationKey: z.string().nullish(),
  }).nullish().readonly(),

  memberCreator: MemberSchema.nullish(),
}).readonly();

/** Schema of attachment or card cover image previews. */
export const AttachmentPreviewsSchema = z.array(
  z.object({
    id: z.string().min(1),
    scaled: z.boolean(),
    url: z.url(),
    bytes: z.number(),
    height: z.number(),
    width: z.number(),
  }).readonly()
).readonly();

const CardAttachmentBaseSchema = z.object({
  id: z.string().min(1),
  bytes: z.number().nullable(),
  date: z.iso.datetime({ precision: 3 }),
  /** For image attachments, the extracted edge color. */
  edgeColor: ColorSchema.nullish(),
  /** The ID of the member who added the attachment. */
  idMember: z.string().min(1),
  /** Whether the attachment was uploaded. */
  isUpload: z.boolean(),
  mimeType: z.string(),
  name: z.string(),
  previews: AttachmentPreviewsSchema,
  url: z.url(),
  pos: z.number(),
  fileName: z.string(),
}).readonly();

/** Schema of fetched attachment data for a Trello card. */
export const CardAttachmentSchema = CardAttachmentBaseSchema.or(
  CardAttachmentBaseSchema.array().length(1).readonly().transform(
    data => data[0]
  )
);

/** Schema of allowed color names for a Trello card cover. */
export const CardCoverColorName = z.literal([
  "green",
  "yellow",
  "orange",
  "red",
  "purple",
  "blue",
  "sky",
  "lime",
  "pink",
  "black",
]);

/** Transform schema from card cover color names to their hex values. */
export const CardCoverColorNameToHexColor =
  CardCoverColorName.transform((data) => {
    const m: { [K in typeof data]: z.infer<typeof ColorSchema> } = {
      "green": "#4bce97",
      "yellow": "#e2b203",
      "orange": "#faa53d",
      "red": "#f87462",
      "purple": "#9f8fef",
      "blue": "#579dff",
      "sky": "#60c6d2",
      "lime": "#94c748",
      "pink": "#e774bb",
      "black": "#8590a2",
    };
    return m[data];
  });

const CardCoverBaseSchema = z.object({
  color: z.null().optional(),
  idAttachment: z.null().optional(),
  idUploadedBackground: z.null().optional(),
  size: z.literal(["full", "normal"]),
  brightness: z.literal(["light", "dark"]),
  idPlugin: z.null().optional(),
});

/**
 * Schema of Trello card cover data with no card cover source set.
 * Card cover sources, `color`, `idAttachment`, and `idUploadedBackground`,
 * are all null.
 */
export const CardCoverNoSourceSchema = CardCoverBaseSchema.omit({
  "idPlugin": true
}).extend({
  /**
   * Whether the card cover image was selected automatically by Trello,
   * or manually by the user.
   */
  manualCoverAttachment: z.boolean(),
  /** Not null if the card cover is set by a plugin. */
  plugin: z.looseObject({}).nullish().readonly(),
}).readonly();


/**
 * Schema of Trello card cover data with the card cover source set.
 * One of `color`, `idAttachment`, `idUploadedBackground`,
 * or `plugin` is not null.
 */
export const CardCoverWithSourceSchema = CardCoverNoSourceSchema.def.innerType.extend({
  /** Not null if the card cover is a solid color. */
  color: z.string().min(1).nullable(),
  /** Not null if the card cover is a user-uploaded card attachment. */
  idAttachment: z.string().min(1).nullable(),
  /** Not null if the card cover is a Trello-uploaded Unsplash background. */
  idUploadedBackground: z.string().min(1).nullable(),
}).readonly()
  .refine((data) => (
    [
      data.color,
      data.idAttachment,
      data.idUploadedBackground,
      data.plugin
    ].filter(prop => prop).length === 1
  ),
    {
      error: "Expected a single source for a Trello card cover",
      path: [
        "color",
        "idAttachment",
        "idUploadedBackground",
        "plugin",
      ],
    }
  );

/** Schema of fetched card data for a Trello action. */
export const ActionCardSchema = z.object({
  id: z.string().min(1),
  address: z.string().nullish(),

  badges: z.object({
    votes: z.number().nullish(),
    checkItems: z.number().nullish(),
    checkItemsChecked: z.number().nullish(),
    comments: z.number().nullish(),
    attachments: z.number().nullish(),
    dueComplete: z.boolean().nullish(),
  }).readonly(),

  name: z.string().min(1),
  desc: z.string(),
  idShort: z.number(),
  shortLink: z.string(),
  url: z.url(),
  closed: z.boolean(),

  cover: z.union([
    CardCoverBaseSchema,
    CardCoverBaseSchema.extend({
      color: z.string().min(1),
    }),
    CardCoverBaseSchema.extend({
      idAttachment: z.string().min(1),
      /** Extracted card cover image edge color. */
      edgeColor: ColorSchema,
      /** Card cover previews. */
      scaled: AttachmentPreviewsSchema,
    }),
    CardCoverBaseSchema.extend({
      idUploadedBackground: z.string().min(1),
      /** Extracted card cover image edge color. */
      edgeColor: ColorSchema,
      /** Card cover previews. */
      scaled: AttachmentPreviewsSchema,
      /** URL of shared card cover source, such as an Unsplash image. */
      sharedSourceUrl: z.url(),
    }),
    CardCoverBaseSchema.extend({
      /** Extracted card cover image edge color. */
      edgeColor: ColorSchema,
      /** Card cover previews. */
      scaled: AttachmentPreviewsSchema,
      idPlugin: z.string().min(1),
    }),
  ]).readonly(),

  idMembers: z.string().min(1).array(),
  idMembersVoted: z.string().min(1).array(),
  dateLastActivity: z.iso.datetime({ precision: 3 }),
}).readonly();

/** Schema of proxied card attachment preview. */
export const CardAttachmentPreviewProxySchema = z.union([
  z.object({
    success: z.literal(false),
    url: z.undefined(),
  }).readonly(),
  z.object({
    success: z.literal(true),
    url: z.url(),
  }).readonly(),
]);

/** Schema of fetched member data for a Trello action. */
export const ActionMemberSchema = z.object({
  id: z.string().min(1),
  avatarHash: z.string().min(1),
  avatarUrl: z.url(),
  bio: z.string(),
  fullName: z.string(),
  initials: z.string(),
  url: z.url(),
  username: z.string().min(1),
  status: z.string().nullish(),
  email: z.email().nullish(),
}).readonly();

export const WebhookRequestSchema = z.strictObject({
  model: ModelSchema,
  action: ActionSchema,
  webhook: WebhookModelSchema,
}).readonly();