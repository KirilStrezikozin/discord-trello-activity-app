/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

const IsDevelopment = process.env.NODE_ENV === "development";

export function log(message?: unknown, ...optionalParams: unknown[]) {
  if (IsDevelopment) console.log(message, ...optionalParams);
}

export function info(message?: unknown, ...optionalParams: unknown[]) {
  if (IsDevelopment) console.info(message, ...optionalParams);
}

export function error(message?: unknown, ...optionalParams: unknown[]) {
  if (IsDevelopment) console.error(message, ...optionalParams);
}

export function warn(message?: unknown, ...optionalParams: unknown[]) {
  if (IsDevelopment) console.warn(message, ...optionalParams);
}

export function trace(message?: unknown, ...optionalParams: unknown[]) {
  if (IsDevelopment) console.trace(message, ...optionalParams);
}