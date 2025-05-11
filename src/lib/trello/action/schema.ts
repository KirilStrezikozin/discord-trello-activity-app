/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import { z } from "zod";
import { ColorSchema } from "../../color";

/* Webhook model schema of the webhook response from Trello.
 * Does not describe all possible fields.
 */
export const WebhookModelSchema = z.object({
  id: z.string().min(1),
  desription: z.string().nullable().optional(),
  idModel: z.string().min(1),
  callbackURL: z.string().min(1),
  active: z.boolean(),
}).passthrough();

/* Schema of the model the webhook for Trello is subscribed
 * to (e.g. a board, a card). See the link below for more information:
 * https://developer.atlassian.com/cloud/trello/guides/rest-api/webhooks/#creating-a-webhook
 */
export const ModelSchema = z.object({
  id: z.string().min(1),
}).passthrough();

/* Trello board schema if the model the webhook is subscribed to is a board. */
export const BoardModelSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  desc: z.string().nullable(),
  idOrganization: z.string().min(1),
  url: z.string().url(),
  shortUrl: z.string().url(),
  prefs: z.object({
    background: z.string().nullable(),
    backgroundColor: ColorSchema.nullable(),
    backgroundDarkColor: ColorSchema.nullable(),
    backgroundBottomColor: ColorSchema.nullable(),
    backgroundTopColor: ColorSchema.nullable(),
  }).passthrough(),
  labelNames: z.object({}).passthrough(),
}).passthrough();

/* Schema of the member who triggered an action in Trello. */
export const MemberSchema = z.object({
  id: z.string().min(1),
  avatarUrl: z.string().url(),
  fullName: z.string(),
  initials: z.string(),
  username: z.string().min(1),
}).passthrough();

/* Schema of the action object which describes what action in
 * Trello triggered the webhook.
 */
export const ActionSchema = z.object({
  id: z.string().min(1),
  type: z.string(),
  date: z.string(),
  idMemberCreator: z.string().min(1),
  data: z.object({}).passthrough(),
  display: z.object({
    translationKey: z.string().nullable().optional(),
  }).passthrough().nullable().optional(),
  memberCreator: MemberSchema.nullable().optional(),
}).passthrough();

export const WebhookRequestSchema = z.object({
  model: ModelSchema,
  action: ActionSchema,
  webhook: WebhookModelSchema,
}).strict();