/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import { strToBoolean } from "./utils";

/**
 * Default size of an icon for a Discord message in pixels.
 */
export const defaultIconSizePixels = 60;

/**
 * @class WebhookOptions
 * @description Webhook app options used across the project. Default-constructed
 * values are read from environment variables. One can optionally provide values
 * to overwrite the defaults.
 */
export class WebhookOptions {
  private options: {
    secret?: string | null,
    webhookURL?: string | null,
    thumbnailURL?: string | null,
    sendErrors?: boolean | null,
    suppressErrors?: boolean | null,
    iconSizePixels?: number | null
  };

  /** Trello webhook secret. */
  public get secret(): string {
    return this.options.secret ?? "";
  }

  /** Discord webhook URL. */
  public get webhookURL(): string {
    return this.options.webhookURL ?? "";
  }

  /**
   * Discord message thumbnail URL.
   * See https://discordjs.guide/popular-topics/display-components.html#thumbnail
   */
  public get thumbnailURL(): string {
    return this.options.thumbnailURL ?? "";
  }

  /**
   * True when catchable server errors should be
   * sent to discord in a special message format.
   */
  public get sendErrors(): boolean {
    return this.options.sendErrors ?? false;
  }

  /**
   * True when catchable server error codes should be
   * suppressed to avoid request retries.
   */
  public get suppressErrors(): boolean {
    return this.options.suppressErrors ?? false;
  }

  /**
    * Returns the desired icon size for a Discord message in pixels.
   */
  public get iconSizePixels(): number {
    return this.options.iconSizePixels ?? defaultIconSizePixels;
  }

  constructor(values?: typeof this.options) {
    this.options = {
      secret: process.env.TRELLO_WEBHOOK_SECRET
        || values?.secret,

      webhookURL: process.env.DISCORD_WEBHOOK_URL
        || values?.webhookURL,

      thumbnailURL: process.env.DISCORD_MESSAGE_THUMBNAIL_URL
        || values?.thumbnailURL,

      sendErrors: process.env.ERRORS_AS_DISCORD_MESSAGES
        ? strToBoolean(process.env.ERRORS_AS_DISCORD_MESSAGES)
        : values?.sendErrors,

      suppressErrors: process.env.SUPPRESS_ERRORS
        ? strToBoolean(process.env.SUPPRESS_ERRORS)
        : values?.suppressErrors,

      iconSizePixels: ((env) => {
        const num = Number(env);
        if (!isNaN(num)) return num;
        return null;
      })(process.env.DISCORD_MESSAGE_ICON_SIZE_PIXELS)
    };
  }
};