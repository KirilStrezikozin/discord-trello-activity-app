/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

/**
 * Returns whether the string value evaluates to true.
 * Truthy values are: "true", "yes", "on", any number other than zero.
 */
export function strToBoolean(s: string): boolean {
  const normalized = s.trim().toLowerCase();

  const num = Number(normalized);
  if (!isNaN(num)) {
    return num !== 0;
  }

  return normalized === "true" ||
    normalized === "yes" ||
    normalized === "on";
}