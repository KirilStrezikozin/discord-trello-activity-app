/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import { strToBoolean } from "./utils/conv";

export const IsDebug = process.env.DTAA_NDEBUG
  ? !strToBoolean(process.env.DTAA_NDEBUG) : true;

export function log(message?: unknown, ...optionalParams: unknown[]) {
  if (IsDebug) console.log("LOG:", message, ...optionalParams);
}

export function info(message?: unknown, ...optionalParams: unknown[]) {
  if (IsDebug) console.info("INFO:", message, ...optionalParams);
}

export function error(message?: unknown, ...optionalParams: unknown[]) {
  console.error("ERROR:", message, ...optionalParams);
}

export function warn(message?: unknown, ...optionalParams: unknown[]) {
  console.warn("WARN:", message, ...optionalParams);
}

export function trace(message?: unknown, ...optionalParams: unknown[]) {
  if (IsDebug) console.trace("TRACE:", message, ...optionalParams);
}