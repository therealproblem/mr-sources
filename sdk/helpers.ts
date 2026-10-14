// Helpers bundled into each extension that uses them, standing in for what a browser would
// have (URL, URLSearchParams) and for Mihon's `client.newCall(GET(url)).await().asJsoup()`.

import type { HTMLNode, HTTPRequest, HTTPResponse } from "./types"

/** Sends a request, throwing for a status outside 200–299. */
export async function send(request: string | HTTPRequest): Promise<HTTPResponse> {
  const response = await Rakuen.request(request)
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
  return Rakuen.parseHTML(response.body, response.url)
}

/** Mihon's `setUrlWithoutDomain`: an absolute URL's path, query and fragment. */
export function relativeUrl(url: string): string {
  const match = /^[a-z][a-z\d+.-]*:\/\/[^/?#]*(.*)$/i.exec(url)
  return match ? match[1] || "/" : url
}

/** A query string from name–value pairs, in order, repeats allowed. */
export function queryString(params: [string, string | number][]): string {
  return params.map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`).join("&")
}
