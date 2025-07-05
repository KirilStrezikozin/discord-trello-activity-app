/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import { strToBoolean } from "./utils";

export const IsDebug = process.env.NDEBUG
  ? !strToBoolean(process.env.NDEBUG) : true;

export function log(message?: unknown, ...optionalParams: unknown[]) {
  if (IsDebug) console.log(message, ...optionalParams);
}

export function info(message?: unknown, ...optionalParams: unknown[]) {
  if (IsDebug) console.info(message, ...optionalParams);
}

export function error(message?: unknown, ...optionalParams: unknown[]) {
  console.error(message, ...optionalParams);
}

export function warn(message?: unknown, ...optionalParams: unknown[]) {
  console.warn(message, ...optionalParams);
}

export function trace(message?: unknown, ...optionalParams: unknown[]) {
  if (IsDebug) console.trace(message, ...optionalParams);
}