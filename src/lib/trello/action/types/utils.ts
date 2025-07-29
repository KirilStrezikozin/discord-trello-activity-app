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

import { MessageOptions } from "./base";
import { defaultIconSizePixels, WebhookOptions } from "@/src/lib/options";

import {
  AttachmentPreviewsSchema,
  CardAttachmentPreviewProxySchema,
} from "../schema";

/**
 * Returns an icon URL for a member who triggered the action.
 *
 * @param opts Options provide information about the action's context.
 * @param iconSizePixels Icon size in pixels. If not given, use the size set in
 * options. If not set in options, default value is defaultIconSizePixels.
 *
 * @returns Icon URL if avatarUrl is set in the given options.
 */
export function getMemberIcon(
  opts: MessageOptions, iconSizePixels?: number
): string | undefined;

/**
 * Returns a ready-to-use member icon URL.
 *
 * @param iconUrl Raw URL of the icon.
 * @param iconSizePixels Icon size in pixels. Default is set by defaultIconSizePixels.
 *
 * @returns Icon URL.
 */
export function getMemberIcon(iconUrl: string, iconSizePixels?: number): string;

export function getMemberIcon(
  opts: MessageOptions | string,
  iconSizePixels: number | undefined
): string | undefined {
  if (!iconSizePixels) {
    iconSizePixels = defaultIconSizePixels;
  }

  if (typeof opts === "string") {
    const iconUrl = opts;
    return `${iconUrl}/${iconSizePixels}.png`;
  }

  if (opts.iconSizePixels) {
    iconSizePixels = opts.iconSizePixels;
  }

  return (opts.member)
    ? `${opts.member?.avatarUrl}/${iconSizePixels}.png`
    : undefined;
}

/**
 * Returns a preview with the largest size in the given array of previews.
 *
 * @param previews Array of previews.
 * @returns The largest preview or `null` if the given array is empty.
 */
export function getLargestAttachmentPreview(
  previews: z.infer<typeof AttachmentPreviewsSchema>
):
  | (z.infer<typeof AttachmentPreviewsSchema> extends Readonly<(infer T)[]> ? T : never)
  | null {
  return previews.reduce((prev, curr) => {
    if (prev === null) return curr;
    return ((curr.width * curr.height) > (prev.width * prev.height))
      ? curr
      : prev
      ;
  }, previews.length ? previews[0] : null);
}

/**
 * Resolve and return a proxy URL for a card attachment preview URL.
 * Tests a HEAD request to the proxy to verify the resolved URL and
 * automatically logs an error on failure.
 *
 * @param opts Webhook options used.
 * @param data Trello card ID, attachment ID and filename, preview ID.
 *
 * @returns Promise with card attachment preview proxy data.
 */
export async function resolveAttachmentPreviewProxy(
  opts: WebhookOptions,
  data: {
    cardId: string,
    attachmentId: string,
    attachmentFileName: string,
    previewId: string,
  },
): Promise<z.infer<typeof CardAttachmentPreviewProxySchema>> {
  /* Proxy URL is without credentials in search params to avoid
   * accidentally leaking them. Proxy endpoint should be generally
   * disabled if the webhook app is public, and anyone can get served. */
  const previewProxyUrl = new URL(
    `/api/proxy/trello/1/cards/${data.cardId}/attachments/${data.attachmentId}/previews/${data.previewId}/download/${data.attachmentFileName}`,
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
    return {
      success: true,
      url: previewProxyUrl.toString(),
    };
  } catch (error) {
    /* Request to our proxy was not successful. */
    log.error(error);
    return {
      success: false,
      url: undefined,
    };
  }
}