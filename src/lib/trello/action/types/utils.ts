/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import { z } from "zod";
import { MessageOptions } from "./base";
import { defaultIconSizePixels } from "@/src/lib/options";
import { AttachmentPreviewsSchema } from "../schema";

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
