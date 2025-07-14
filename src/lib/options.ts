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
  private options = {
    apiKey: "",
    token: "",
    secret: "",
    webhookURL: "",
    thumbnailURL: "",
    sendErrors: false,
    suppressErrors: false,
    iconSizePixels: defaultIconSizePixels,
  };

  private optionEnvNames:
    { [K in keyof typeof this.options]: string }
    = {
      apiKey: "DTAA_TRELLO_API_KEY",
      token: "DTAA_TRELLO_TOKEN",
      secret: "DTAA_TRELLO_SECRET",
      webhookURL: "DTAA_DISCORD_WEBHOOK_URL",
      thumbnailURL: "DTAA_DISCORD_MSG_THUMB_URL",
      sendErrors: "DTAA_WEBHOOK_SEND_ERRORS_TO_DISCORD",
      suppressErrors: "DTAA_WEBHOOK_SUPPRESS_ERRORS",
      iconSizePixels: "DTAA_DISCORD_MSG_ICON_SIZE_PX",
    };

  /** Trello API key. */
  public get apiKey(): string {
    return this.options.apiKey;
  }

  /** Trello token. */
  public get token(): string {
    return this.options.token;
  }

  /** Trello webhook secret. */
  public get secret(): string {
    return this.options.secret;
  }

  /** Discord webhook URL. */
  public get webhookURL(): string {
    return this.options.webhookURL;
  }

  /**
   * Discord message thumbnail URL.
   * See https://discordjs.guide/popular-topics/display-components.html#thumbnail
   */
  public get thumbnailURL(): string {
    return this.options.thumbnailURL;
  }

  /**
   * True when catchable server errors should be
   * sent to discord in a special message format.
   */
  public get sendErrors(): boolean {
    return this.options.sendErrors;
  }

  /**
   * True when catchable server error codes should be
   * suppressed to avoid request retries.
   */
  public get suppressErrors(): boolean {
    return this.options.suppressErrors;
  }

  /**
   * Returns the desired icon size for a Discord message in pixels.
   */
  public get iconSizePixels(): number {
    return this.options.iconSizePixels;
  }

  /**
   * Modify individual option value.
   * @param key Option name.
   * @param value New option value.
   */
  private setOption<K extends keyof typeof this.options>(
    key: K, value: (typeof this.options)[K]
  ): void {
    this.options[key] = value;
  }

  constructor();
  constructor(values: typeof this.options);
  constructor(values: URLSearchParams);

  constructor(values?: typeof this.options | URLSearchParams) {
    /* Helper to assign all option values from the given object that has the
     * same keys but values are nullish or strings. */
    const setValues = (newRawValues: {
      [K in keyof typeof this.options]: string | null | undefined
    }) => {
      for (const key in this.options) {
        const typedKey = key as keyof typeof this.options;

        const oldValue = this.options[typedKey];
        const newRawValue = newRawValues[typedKey];

        if (typeof newRawValue === typeof oldValue) {
          /* Type matches, assign directly. */
          this.setOption(typedKey, newRawValue as typeof oldValue);
        }

        else if (typeof oldValue === "number") {
          /* Parse number from string. */
          const num = Number(newRawValue);
          if (!isNaN(num)) this.setOption(typedKey, num);
        }

        else if (typeof oldValue === "boolean" && newRawValue) {
          /* Parse boolean from string. */
          this.setOption(typedKey, strToBoolean(newRawValue));
        }

        else if (newRawValue === null || newRawValue === undefined) {
          /* Skip partial values. */
          return;
        }

        else {
          throw new Error(
            "WebhookOptions, setValues: outdated options type inference logic"
          );
        }
      }
    };

    /* Collect env variable values and assign options to them. */
    const envValues = {} as { [K in keyof typeof this.options]: string | undefined };
    for (const key in this.options) {
      const typedKey = key as keyof typeof this.options;
      envValues[typedKey] = process.env[this.optionEnvNames[typedKey]];
    }
    setValues(envValues);

    if (values instanceof URLSearchParams) {
      /* The given values are URL search params, assign options. */
      const spValues = {} as { [K in keyof typeof this.options]: string | null };
      for (const key in this.options) {
        const typedKey = key as keyof typeof this.options;
        spValues[typedKey] = values.get(typedKey);
      }
      setValues(spValues);

    } else if (values) {
      /* The given values mimic the options object, assign options directly. */
      for (const key in values) {
        const typedKey = key as keyof typeof values;
        this.setOption(typedKey, values[typedKey]);
      }
    }

    /* Options have been set to env vars only at this point. */
  }
};