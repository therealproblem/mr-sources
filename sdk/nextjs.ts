// Next.js page data, read the way Keiyoushi's `extractNextJs` reads it (keiyoushi/utils/NextJs.kt,
// Apache License 2.0): the React Server Components (flight) payload of an App Router page, in
// its `self.__next_f.push(...)` scripts or as a `text/x-component` response (sent for an `rsc: 1`
// header), or a Pages Router page's `__NEXT_DATA__` JSON. References between chunks (`$1`,
// `$L2`, `$Q3:path`…) are resolved before the search.

import type { HTMLNode } from "./types"

type JSONValue = null | boolean | number | string | JSONValue[] | { [key: string]: JSONValue }

/** The first object or array in a flight response body that `predicate` accepts. */
export function extractNextJsRsc<T = unknown>(body: string, predicate: (value: unknown) => boolean): T | undefined {
  const chunks = new Map<string, string>()
  const models = new Map<string, JSONValue>()
  for (const payload of rscPayloads(body, chunks, models)) {
    const found = find(resolve(payload, chunks, models, new Set()), predicate)
    if (found !== undefined) return found as T
  }
  return undefined
}

/** The first object or array in a page's Next.js data that `predicate` accepts. */
export function extractNextJs<T = unknown>(document: HTMLNode, predicate: (value: unknown) => boolean): T | undefined {
  const chunks = new Map<string, string>()
  const models = new Map<string, JSONValue>()
  const payloads: JSONValue[] = []
  for (const script of document.select("script:not([src])")) {
    const data = script.data()
    if (!data.includes("self.__next_f.push")) continue
    const raw = /self\.__next_f\.push\(\s*(\[[\s\S]*\])\s*\)\s*;?\s*$/.exec(data)?.[1]
    try {
      const content = (JSON.parse(raw ?? "null") as JSONValue[] | null)?.[1]
      if (typeof content === "string") payloads.push(...rscPayloads(content, chunks, models))
    } catch { /* not flight data */ }
  }
  if (payloads.length === 0) {
    try {
      const root = JSON.parse(document.selectFirst("script#__NEXT_DATA__")?.data() ?? "null") as { props?: { pageProps?: JSONValue } } | null
      if (root) payloads.push(...[root.props?.pageProps, root as JSONValue].filter((v): v is JSONValue => v != null))
    } catch { /* none */ }
  }
  for (const payload of payloads) {
    const found = find(resolve(payload, chunks, models, new Set()), predicate)
    if (found !== undefined) return found as T
  }
  return undefined
}

function find(value: JSONValue, predicate: (value: unknown) => boolean): JSONValue | undefined {
  if (value === null || typeof value !== "object") return undefined
  if (predicate(value)) return value
  for (const child of Array.isArray(value) ? value : Object.values(value)) {
    const found = find(child, predicate)
    if (found !== undefined) return found
  }
  return undefined
}

/** Each `<hex id>:<row>` of a flight body: JSON rows, and `T<hex length>,` text rows. */
function rscPayloads(body: string, chunks: Map<string, string>, models: Map<string, JSONValue>): JSONValue[] {
  const results: JSONValue[] = []
  let position = 0
  while (position < body.length) {
    const colon = body.indexOf(":", position)
    if (colon < 0) break
    const id = body.slice(position, colon)
    if (!id || !/^[\da-f]+$/i.test(id)) { position++; continue }
    position = colon + 1
    if (position >= body.length) break
    if (body[position] === "T") {
      // Text: its length is in UTF-8 bytes.
      const comma = body.indexOf(",", position)
      if (comma < 0) break
      const byteLength = parseInt(body.slice(position + 1, comma), 16)
      if (Number.isNaN(byteLength)) break
      let bytes = 0
      const start = position = comma + 1
      while (position < body.length && bytes < byteLength) {
        const code = body.charCodeAt(position)
        if (code < 0x80) bytes += 1
        else if (code < 0x800) bytes += 2
        else if (code >= 0xd800 && code <= 0xdbff) { bytes += 4; position++ }
        else bytes += 3
        position++
      }
      const text = body.slice(start, position)
      chunks.set(id, text)
      try { results.push(JSON.parse(text)) } catch { /* plain text */ }
    } else {
      const [value, end] = jsonAt(body, position)
      if (value !== undefined) {
        results.push(value)
        models.set(id, value)
      }
      position = end
    }
  }
  return results
}

/** The JSON value starting at `start`, by bracket depth, and where it ends. */
function jsonAt(body: string, start: number): [JSONValue | undefined, number] {
  let depth = 0, inString = false, escaped = false
  const parse = (end: number): JSONValue | undefined => { try { return JSON.parse(body.slice(start, end)) } catch { return undefined } }
  for (let i = start; i < body.length;) {
    const char = body[i++]
    if (escaped) { escaped = false; continue }
    if (char === "\\" && inString) { escaped = true; continue }
    if (char === "\"") { inString = !inString; continue }
    if (inString) continue
    if (char === "{" || char === "[") depth++
    else if ((char === "}" || char === "]") && --depth === 0) return [parse(i), i]
    if (depth === 0 && /\s/.test(char)) return [parse(i - 1), i]
  }
  return [undefined, body.length]
}

/** React Flight's `$` markers resolved: references, dates, big ints, maps, sets and lazy rows. */
function resolve(value: JSONValue, chunks: Map<string, string>, models: Map<string, JSONValue>, resolving: Set<string>): JSONValue {
  if (Array.isArray(value)) return value.map((v) => resolve(v, chunks, models, resolving))
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolve(v, chunks, models, resolving)]))
  }
  if (typeof value !== "string" || !value.startsWith("$") || value.length < 2) return value
  if (value === "$undefined") return null
  if (["$Infinity", "$-Infinity", "$NaN", "$-0"].includes(value)) return value.slice(1)
  const marker = value[1]
  if (marker === "$") return value.slice(1)
  if (marker === "D" || marker === "n") return value.slice(2)
  if (marker === "Q") return resolveMap(value.slice(2), chunks, models, resolving) ?? value
  if (marker === "W") return resolveSet(value.slice(2), chunks, models, resolving) ?? value
  if (marker === "L" || marker === "@") return resolveModel(value.slice(2), chunks, models, resolving) ?? value
  return resolveModel(value.slice(1), chunks, models, resolving) ?? value
}

function resolveModel(reference: string, chunks: Map<string, string>, models: Map<string, JSONValue>, resolving: Set<string>): JSONValue | undefined {
  const [id, ...path] = reference.split(":")
  if (path.length === 0 && chunks.has(id)) return chunks.get(id)!
  if (resolving.has(id) || !models.has(id)) return undefined
  const guard = new Set(resolving).add(id)
  let value: JSONValue | undefined = models.get(id)!
  for (const segment of path) {
    if (typeof value === "string" && value.startsWith("$")) value = resolve(value, chunks, models, guard)
    value = walk(value, segment)
    if (value === undefined) return undefined
  }
  return resolve(value, chunks, models, guard)
}

/** Indexes into a value by one path segment; React elements are `["$", type, key, props]`. */
function walk(value: JSONValue, segment: string): JSONValue | undefined {
  if (Array.isArray(value)) {
    if (value.length >= 4 && value[0] === "$") {
      const named = { type: 1, key: 2, props: 3 }[segment]
      if (named !== undefined) return value[named]
    }
    const index = Number(segment)
    return Number.isInteger(index) ? value[index] : undefined
  }
  if (value !== null && typeof value === "object") return value[segment]
  return undefined
}

function resolveMap(id: string, chunks: Map<string, string>, models: Map<string, JSONValue>, resolving: Set<string>): JSONValue | undefined {
  const entries = models.get(id)
  if (resolving.has(id) || !Array.isArray(entries)) return undefined
  const resolved = resolve(entries, chunks, models, new Set(resolving).add(id)) as JSONValue[]
  return Object.fromEntries(resolved.filter((pair): pair is JSONValue[] => Array.isArray(pair) && pair.length === 2)
    .map(([key, value]) => [typeof key === "string" ? key : JSON.stringify(key), value]))
}

function resolveSet(id: string, chunks: Map<string, string>, models: Map<string, JSONValue>, resolving: Set<string>): JSONValue | undefined {
  const values = models.get(id)
  if (resolving.has(id) || !Array.isArray(values)) return undefined
  return resolve(values, chunks, models, new Set(resolving).add(id))
}
