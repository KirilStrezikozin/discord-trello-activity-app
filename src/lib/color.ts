/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import { z } from "zod";

/**
 * Schema for parsing color values in hexadecimal format.
 */
export const ColorSchema = z.custom<`#${string}`>((val) => {
  return typeof val === "string" ? /^#(?:[0-9a-fA-F]{3,4}){1,2}$/.test(val) : false;
});

/**
 * Represents color value in hexadecimal format.
 */
export type Color = z.infer<typeof ColorSchema>;