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

/** Schema of fetched card data for a Trello action. */
export const ActionCardSchema = z.object({
  id: z.string().min(1),
  address: z.string().nullable(),

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

  cover: z.object({}),
  idMembers: z.string().min(1).array(),
  idMembersVoted: z.string().min(1).array(),
  dateLastActivity: z.iso.datetime({ precision: 3 }),
}).readonly();

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