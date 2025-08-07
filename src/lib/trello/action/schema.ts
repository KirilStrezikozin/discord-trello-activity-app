/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import * as z from 'zod';

/** Schema for parsing color values in hexadecimal format. */
export const ColorSchema = z.custom<`#${string}`>((val) => {
  return typeof val === "string" ? /^#(?:[0-9a-fA-F]{3,4}){1,2}$/.test(val) : false;
});

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

/** Schema of Trello board data. */
export const BoardSchema = z.looseObject({
  id: z.string().min(1),
  name: z.string().min(1),
  desc: z.string(),
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
  avatarHash: z.string().min(1),
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

  member: MemberSchema.nullish(),

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

const labelColorMap = {
  "green_light": "#baf3db",
  "green": "#4bce97",
  "green_dark": "#1f845a",
  "yellow_light": "#f8e6a0",
  "yellow": "#e2b203",
  "yellow_dark": "#946f00",
  "orange_light": "#ffe2bd",
  "orange": "#faa53d",
  "orange_dark": "#b65c02",
  "red_light": "#ffd2cc",
  "red": "#f87462",
  "red_dark": "#ca3521",
  "purple_light": "#dfd8fd",
  "purple": "#9f8fef",
  "purple_dark": "#6e5dc6",
  "blue_light": "#cce0ff",
  "blue": "#579dff",
  "blue_dark": "#0c66e4",
  "sky_light": "#c1f0f5",
  "sky": "#60c6d2",
  "sky_dark": "#1d7f8c",
  "lime_light": "#D3F1A7",
  "lime": "#94c748",
  "lime_dark": "#5b7f24",
  "pink_light": "#fdd0ec",
  "pink": "#e774bb",
  "pink_dark": "#ae4787",
  "black_light": "#dcdfe4",
  "black": "#8590a2",
  "black_dark": "#626f86",
} satisfies Record<string, z.infer<typeof ColorSchema>>;

/** Schema of allowed color names for a Trello label. */
export const LabelColorName = z.literal(
  Object.keys(labelColorMap) as unknown as keyof typeof labelColorMap
);

/** Transform schema from label color names to their hex values. */
export const LabelColorNameToHexColor = LabelColorName.transform((data) => {
  return labelColorMap[data];
});

const cardCoverColorMap = {
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
} satisfies Record<string, z.infer<typeof ColorSchema>>;

/** Schema of allowed color names for a Trello card cover. */
export const CardCoverColorName = z.literal(
  Object.keys(cardCoverColorMap) as unknown as keyof typeof cardCoverColorMap
);

/** Transform schema from card cover color names to their hex values. */
export const CardCoverColorNameToHexColor =
  CardCoverColorName.transform((data) => {
    return cardCoverColorMap[data];
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
  color: CardCoverColorName.nullable(),
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

/** Schema of Trello label data. */
export const LabelSchema = z.object({
  id: z.string().min(1),
  idBoard: z.string().min(1),
  idOrganization: z.string().min(1),
  name: z.string(),
  color: LabelColorName.nullable(),
  /** How many times the label has been used. */
  uses: z.number().nonnegative(),
}).readonly();

/** Schema of Trello card data. */
export const CardSchema = z.object({
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
  dueComplete: z.boolean(),
  pinned: z.boolean(),
  subscribed: z.boolean(),
  manualCoverAttachment: z.boolean(),
  idAttachmentCover: z.string().min(1).nullable(),
  idMembers: z.string().min(1).array(),
  idMembersVoted: z.string().min(1).array(),
  idLabels: z.string().min(1).array(),
  idList: z.string().min(1),
  dateLastActivity: z.iso.datetime({ precision: 3 }),
  due: z.iso.datetime({ precision: 3 }).nullable(),
  dueReminder: z.number().nullable(),

  labels: LabelSchema.array().readonly(),

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
}).readonly();

/** Schema of list cards data array. */
export const ListCardsSchema = CardSchema.array().readonly();

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

/** Schema of card checklist item. */
export const CardCheckListItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  nameData: z.looseObject({
    emoji: z.looseObject({}),
  }),
  pos: z.number(),
  state: z.literal(["complete", "incomplete"]),
  due: z.iso.datetime({ precision: 3 }).nullable(),
  dueReminder: z.number().nullable(),
  /** Member ID this checklist item is assigned to. */
  idMember: z.string().min(1).nullable(),
  idChecklist: z.string().min(1),
}).readonly();

/** Schema of card checklist items array. */
export const CardCheckListItemsSchema = CardCheckListItemSchema.array().readonly();

/** Schema of Trello list data. */
export const ListSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  closed: z.boolean(),
  color: z.string().nullable(),
  idBoard: z.string().min(1),
}).readonly();

/** Schema of an array of lists with an array of cards. */
export const BoardListsWithCardsSchema = z.array(
  ListSchema.def.innerType.extend({
    cards: CardSchema.array().readonly(),
  }).readonly()
).readonly();

/** Schema of comment reactions summary. */
export const CommentReactionsSummarySchema = z.array(
  z.object({
    count: z.number().positive(),
    id: z.string().min(1),
    emoji: z.object({
      native: z.string(),
      name: z.string(),
      shortName: z.string(),
    }).readonly(),
  }).readonly()
).readonly();

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