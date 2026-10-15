// Helpers bundled into each extension that uses them, standing in for what a browser would
// have (URL, URLSearchParams) and for Mihon's `client.newCall(GET(url)).await().asJsoup()`.

import type { HTMLNode, HTTPRequest, HTTPResponse } from "./types"

/** Sends a request, throwing for a status outside 200–299. */
export async function send(request: string | HTTPRequest): Promise<HTTPResponse> {
  const response = await Honya.request(request)
  if (response.status < 200 || response.status > 299) {
    throw new Error(`HTTP ${response.status} for ${response.url}`)
  }
  return response
}

export async function fetchText(request: string | HTTPRequest): Promise<string> {
  return (await send(request)).body
}

export async function fetchJSON<T = unknown>(request: string | HTTPRequest): Promise<T> {
  return JSON.parse(await fetchText(request)) as T
}

/** Fetches a page and parses it; `attr("abs:href")` resolves against the page's URL. */
export async function fetchHTML(request: string | HTTPRequest): Promise<HTMLNode> {
  const response = await send(request)
  return Honya.parseHTML(response.body, response.url)
}

/**
 * Mihon's `setUrlWithoutDomain`: an absolute URL's path, query and fragment, percent-decoded
 * as Mihon stores them (so a restored backup's URLs match).
 */
export function relativeUrl(url: string): string {
  const match = /^[a-z][a-z\d+.-]*:\/\/[^/?#]*(.*)$/i.exec(url)
  const path = match ? match[1] || "/" : url
  try { return decodeURI(path) } catch { return path }
}

/** A query string from name–value pairs, in order, repeats allowed. */
export function queryString(params: [string, string | number][]): string {
  return params.map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`).join("&")
}

/** An absolute URL for `path` against `base`, as a browser would resolve a link. */
export function absoluteUrl(path: string, base: string): string {
  if (/^[a-z][a-z\d+.-]*:/i.test(path)) return path
  const origin = /^[a-z][a-z\d+.-]*:\/\/[^/?#]*/i.exec(base)?.[0] ?? ""
  if (path.startsWith("//")) return (/^[a-z][a-z\d+.-]*:/i.exec(base)?.[0] ?? "https:") + path
  if (path.startsWith("/")) return origin + path
  const directory = base.replace(/[?#].*$/, "").replace(/[^/]*$/, "")
  return directory + path
}

/** A URL's (or path's) path segments, decoded, without empty ones. */
export function pathSegments(url: string): string[] {
  return relativeUrl(url).replace(/[?#].*$/, "").split("/").filter(Boolean).map((segment) => {
    try { return decodeURIComponent(segment) } catch { return segment }
  })
}

/** A URL's query parameters, decoded, in order. */
export function queryParams(url: string): [string, string][] {
  const query = /\?([^#]*)/.exec(url)?.[1] ?? ""
  return query.split("&").filter(Boolean).map((pair) => {
    const [name, value = ""] = pair.split("=")
    const decode = (text: string) => { try { return decodeURIComponent(text.replace(/\+/g, " ")) } catch { return text } }
    return [decode(name), decode(value)]
  })
}

export function queryParam(url: string, name: string): string | undefined {
  return queryParams(url).find(([key]) => key === name)?.[1]
}

const base64Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

/** Decodes standard or URL-safe base64, with or without padding. */
export function base64Decode(text: string): Uint8Array {
  const clean = text.replace(/[\s=]/g, "").replace(/-/g, "+").replace(/_/g, "/")
  const bytes = new Uint8Array(Math.floor((clean.length * 3) / 4))
  let buffer = 0, bits = 0, length = 0
  for (const char of clean) {
    const value = base64Alphabet.indexOf(char)
    if (value < 0) throw new Error(`not base64: ${char}`)
    buffer = (buffer << 6) | value
    bits += 6
    if (bits >= 8) {
      bits -= 8
      bytes[length++] = (buffer >> bits) & 0xff
    }
  }
  return bytes.subarray(0, length)
}

export function base64Encode(bytes: Uint8Array, options: { urlSafe?: boolean; padding?: boolean } = {}): string {
  let text = ""
  for (let i = 0; i < bytes.length; i += 3) {
    const chunk = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0)
    const count = Math.min(3, bytes.length - i)
    for (let j = 0; j < 4; j++) {
      text += j <= count ? base64Alphabet[(chunk >> (18 - 6 * j)) & 63] : (options.padding === false ? "" : "=")
    }
  }
  return options.urlSafe ? text.replace(/\+/g, "-").replace(/\//g, "_") : text
}

export function utf8Encode(text: string): Uint8Array {
  const bytes: number[] = []
  for (const char of text) {
    const code = char.codePointAt(0)!
    if (code < 0x80) bytes.push(code)
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 63))
    else if (code < 0x10000) bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63))
    else bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 63), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63))
  }
  return new Uint8Array(bytes)
}

export function utf8Decode(bytes: Uint8Array): string {
  let text = ""
  for (let i = 0; i < bytes.length;) {
    const byte = bytes[i++]
    let code: number
    if (byte < 0x80) code = byte
    else if (byte < 0xe0) code = ((byte & 31) << 6) | (bytes[i++] & 63)
    else if (byte < 0xf0) code = ((byte & 15) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63)
    else code = ((byte & 7) << 18) | ((bytes[i++] & 63) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63)
    text += String.fromCodePoint(code)
  }
  return text
}

/** `Date.parse`, but undefined rather than NaN. */
export function parseDate(text: string | undefined | null): number | undefined {
  if (!text) return undefined
  const time = Date.parse(text)
  return Number.isNaN(time) ? undefined : time
}

/** Today minus "3 days ago", "2 hours ago" and the like; undefined if it isn't one. */
export function parseRelativeDate(text: string | undefined | null, now = Date.now()): number | undefined {
  const match = /(\d+)\s*(second|sec|minute|min|hour|day|week|month|year)s?\s*ago/i.exec(text ?? "")
  if (!match) return undefined
  const unit: Record<string, number> = { second: 1e3, sec: 1e3, minute: 6e4, min: 6e4, hour: 36e5, day: 864e5, week: 6048e5, month: 2592e6, year: 31536e6 }
  return now - Number(match[1]) * unit[match[2].toLowerCase()]
}

/** `items.map(transform)`, at most `limit` at a time, in order. */
export async function mapLimit<T, R>(items: T[], limit: number, transform: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await transform(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

/** Sends a request and parses the HTML it gets, with the URL it ended up at. */
export async function fetchPage(request: string | HTTPRequest): Promise<{ document: HTMLNode; url: string }> {
  const response = await send(request)
  return { document: Honya.parseHTML(response.body, response.url), url: response.url }
}

/** A form body (`application/x-www-form-urlencoded`) and its Content-Type header. */
export function formBody(fields: [string, string][]): { body: string; headers: Record<string, string> } {
  return { body: queryString(fields), headers: { "Content-Type": "application/x-www-form-urlencoded" } }
}

const namedEntities: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " ", hearts: "♥", hellip: "…",
  mdash: "—", ndash: "–", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
}

/**
 * Jsoup's `Parser.unescapeEntities`: "&hearts;" becomes "♥". For text that arrives with its
 * entities still in it, like WordPress's `title.rendered` or a site that encodes them twice.
 */
export function unescapeEntities(text: string): string {
  return text.replace(/&(?:#(\d+)|#x([\da-f]+)|([a-z][a-z\d]*));/gi, (entity, decimal?: string, hex?: string, name?: string) => {
    if (name) return namedEntities[name] ?? (Honya.parseHTML(entity).text() || entity)
    const code = decimal ? Number(decimal) : parseInt(hex!, 16)
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity
  })
}

/** The image URL from the first of `data-cfsrc`, `data-src`, `data-lazy-src`, `srcset` and `src` it has. */
export function imgAttr(element: HTMLNode): string {
  if (element.hasAttr("data-cfsrc")) return element.absUrl("data-cfsrc")
  if (element.hasAttr("data-src")) return element.absUrl("data-src")
  if (element.hasAttr("data-lazy-src")) return element.absUrl("data-lazy-src")
  if (element.hasAttr("srcset")) return element.absUrl("srcset").split(" ")[0]
  return element.absUrl("src")
}
