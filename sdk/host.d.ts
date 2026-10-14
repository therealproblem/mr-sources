// What the app provides to extensions: the `Rakuen` global and `console`. Extensions run in
// JavaScriptCore, not a browser or Node, so there's no fetch, DOM, URL, setTimeout or atob.
// The app's side is `Core/Extensions/JSRuntime.swift`; host API version 1.

import type { HTMLNode, HTTPRequest, HTTPResponse, PrefValue } from "./types"

declare global {
  const Rakuen: {
    /** The host API version the app provides. */
    readonly apiVersion: number
    /**
     * Sends a request through the app, which adds its User-Agent and cookies, applies
     * `info.rateLimits` and gets past Cloudflare challenges. Every status resolves; only a
     * failed connection rejects. `fetchText` and `fetchHTML` throw on error statuses.
     */
    request(request: string | HTTPRequest): Promise<HTTPResponse>
    /** Parses HTML natively. Relative links resolve against `baseUrl` (default `info.baseUrl`). */
    parseHTML(html: string, baseUrl?: string): HTMLNode
    /** The source's own settings. A Mihon backup restores its source's settings here. */
    readonly prefs: {
      get(key: string): PrefValue | null | undefined
      /** null or undefined removes the setting. */
      set(key: string, value: PrefValue | null | undefined): void
    }
    log(level: "debug" | "info" | "warn" | "error", message: string): void
  }

  /** Writes to the app's log (Console.app, category "Extension <name>"). */
  const console: {
    log(...values: unknown[]): void
    info(...values: unknown[]): void
    debug(...values: unknown[]): void
    warn(...values: unknown[]): void
    error(...values: unknown[]): void
  }
}

export {}
