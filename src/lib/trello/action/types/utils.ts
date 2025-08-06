/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import { z } from "zod";

import { MessageOptions } from "./base";
import { AttachmentPreviewsSchema } from "../schema";
import { defaultIconSizePixels } from "@/src/lib/options";

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