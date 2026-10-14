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
    /**
     * What the site keeps in the app's web view `localStorage` under `key` (Mihon's
     * `getLocalStorage`), or null. Some sites hand out tokens there once visited in the web view.
     */
    localStorage(url: string, key: string): Promise<string | null>
    /**
     * Opens `url` in a hidden web view (sharing the visible one's cookies and storage), for sites
     * whose scripts have to run to issue a token. With `waitForLocalStorage`, resolves with that
     * key's value as soon as the page sets it; otherwise after `timeoutMs` (default 15 s, max 60 s).
     */
    loadInWebView(url: string, options?: { waitForLocalStorage?: string; timeoutMs?: number }): Promise<string | null>
    /** Waits `milliseconds` (at most a minute); scripts have no setTimeout. */
    sleep(milliseconds: number): Promise<void>
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
