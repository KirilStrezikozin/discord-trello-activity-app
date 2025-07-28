/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import { getFullRequestUrl, strToBoolean } from "./utils";

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
  /**
   * Option values storage. Option names match URL search parameter names.
   */
  private options = {
    apiKey: "",
    token: "",
    secret: "",
    webhookURL: "",
    thumbnailURL: "",
    sendErrors: false,
    suppressErrors: false,
    iconSizePixels: defaultIconSizePixels,
    originUrl: "",
    useProxy: false,
  };

  /**
   * Record of options, boolean values of each determines whether it can only
   * be set with environment variables or directly.
   */
  private optionsEnvOnly: Record<
    keyof typeof this.options, boolean
  > = {
      apiKey: false,
      token: false,
      secret: false,
      webhookURL: false,
      thumbnailURL: false,
      sendErrors: false,
      suppressErrors: false,
      iconSizePixels: false,
      originUrl: true,
      useProxy: true,
    };

  /**
   * Environment variable names corresponding to option names.
   */
  private optionEnvNames: Record<keyof typeof this.options, string> = {
    apiKey: "DTAA_TRELLO_API_KEY",
    token: "DTAA_TRELLO_TOKEN",
    secret: "DTAA_TRELLO_SECRET",
    webhookURL: "DTAA_DISCORD_WEBHOOK_URL",
    thumbnailURL: "DTAA_DISCORD_MSG_THUMB_URL",
    sendErrors: "DTAA_WEBHOOK_SEND_ERRORS_TO_DISCORD",
    suppressErrors: "DTAA_WEBHOOK_SUPPRESS_ERRORS",
    iconSizePixels: "DTAA_DISCORD_MSG_ICON_SIZE_PX",
    originUrl: "DTAA_ORIGIN_URL",
    useProxy: "DTAA_USE_PROXY",
  };

  /** Trello API key. */
  public get apiKey() {
    return this.options.apiKey;
  }

  /** Trello token. */
  public get token() {
    return this.options.token;
  }

  /** Trello webhook secret. */
  public get secret() {
    return this.options.secret;
  }

  /** Discord webhook URL. */
  public get webhookURL() {
    return this.options.webhookURL;
  }

  /**
   * Discord message thumbnail URL.
   * See https://discordjs.guide/popular-topics/display-components.html#thumbnail
   */
  public get thumbnailURL() {
    return this.options.thumbnailURL;
  }

  /**
   * True when catchable server errors should be
   * sent to discord in a special message format.
   */
  public get sendErrors() {
    return this.options.sendErrors;
  }

  /**
   * True when catchable server error codes should be
   * suppressed to avoid request retries.
   */
  public get suppressErrors() {
    return this.options.suppressErrors;
  }

  /**
   * Desired icon size for a Discord message in pixels.
   */
  public get iconSizePixels() {
    return this.options.iconSizePixels;
  }

  /**
   * Resolved origin URL of this webhook server.
   */
  public get originUrl() {
    return this.options.originUrl;
  }

  /**
   * Whether the proxy endpoint to host static Trello image content is used.
   */
  public get useProxy() {
    return this.options.useProxy;
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
  constructor(values: Partial<typeof this.options>, request?: Request);
  constructor(values: URLSearchParams, request?: Request);

  constructor(
    values?: Partial<typeof this.options> | URLSearchParams, request?: Request
  ) {
    /* Helper to assign all option values from the given object that has the
     * same keys but values are nullish or strings. */
    const setValues = (
      newRawValues: Record<keyof typeof this.options, string | null | undefined>
    ) => {
      for (const key in this.options) {
        const typedKey = key as keyof typeof this.options;

        const oldValue = this.options[typedKey];
        const newRawValue = newRawValues[typedKey];

        if (typeof newRawValue === typeof oldValue) {
          /* Type matches, assign directly. */
          this.setOption(typedKey, newRawValue as typeof oldValue);
        }

        else if (newRawValue === null || newRawValue === undefined) {
          /* Skip partial values. */
        }

        else if (typeof oldValue === "number") {
          /* Parse number from string. */
          const num = Number(newRawValue);
          if (!isNaN(num)) this.setOption(typedKey, num);
        }

        else if (typeof oldValue === "boolean") {
          /* Parse boolean from string. */
          this.setOption(typedKey, strToBoolean(newRawValue));
        }

        else {
          throw new Error(
            "WebhookOptions, setValues: outdated options type inference logic"
          );
        }
      }
    };

    /* Collect env variable values and assign options to them. */
    const envValues = {} as Parameters<typeof setValues>[0];
    for (const key in this.options) {
      const typedKey = key as keyof typeof this.options;
      envValues[typedKey] = process.env[this.optionEnvNames[typedKey]];
    }
    setValues(envValues);

    if (values instanceof URLSearchParams) {
      /* The given values are URL search params, assign options. */
      const spValues = {} as Parameters<typeof setValues>[0];
      for (const key in this.options) {
        const typedKey = key as keyof typeof this.options;
        /* Skip options set only with env vars. */
        if (this.optionsEnvOnly[typedKey]) continue;
        spValues[typedKey] = values.get(typedKey);
      }
      setValues(spValues);

    } else if (values) {
      /* The given values mimic the options object, assign options directly. */
      for (const key in values) {
        const typedKey = key as keyof typeof values;
        const value = values[typedKey];
        /* Skip unset options and the ones set only with env vars. */
        if (value === undefined || this.optionsEnvOnly[typedKey]) continue;
        this.setOption(typedKey, value);
      }
    }

    if (request && !this.options.originUrl) {
      /* Set the origin URL option if the request to read one from is given,
       * and it is not already set by env var. */
      this.setOption("originUrl", getFullRequestUrl(request).origin);
    }
  }
};