// Ported from the Keiyoushi "HentaiNexus" extension (v1.6.20):
// https://github.com/keiyoushi/extensions-source/tree/main/src/en/hentainexus
// Licensed under the Apache License, Version 2.0.

import { base64Decode, fetchPage, queryString, relativeUrl, type Filter, type HTMLNode, type Manga, type MangasPage, type Source } from "../../../sdk"

const baseUrl = "https://hentainexus.com"
const popularNowPath = "/explore/hot"

function parseList(document: HTMLNode, url: string): MangasPage {
  const mangas = document.select(".container .column").map((e) => ({
    url: relativeUrl(e.selectFirst("a")!.absUrl("href")),
    title: e.selectFirst(".card-header-title")!.text(),
    thumbnailUrl: e.selectFirst(".card-image img")?.absUrl("src") || undefined,
  }))
  const isPopularNow = relativeUrl(url).split("?")[0] === popularNowPath
  return { mangas, hasNextPage: isPopularNow || document.selectFirst("a.pagination-next[href]") != null }
}

async function list(url: string) {
  const { document, url: finalUrl } = await fetchPage(url)
  return parseList(document, finalUrl)
}

function details(document: HTMLNode): Partial<Manga> {
  const table = document.selectFirst(".view-page-details")
  if (!table) throw new Error("The gallery page has changed.")
  const people = [...table.select("td.viewcolumn:contains(Author) + td a"), ...table.select("td.viewcolumn:contains(Artist) + td a")].map((a) => a.ownText())
  const lines: string[] = []
  for (const key of ["Circle", "Event", "Magazine", "Parody", "Publisher", "Pages", "Favorites"]) {
    const cell = table.selectFirst(`td.viewcolumn:contains(${key}) + td`)
    if (!cell) continue
    lines.push(`${key}: ${cell.ownText() || cell.selectFirst("a")?.ownText() || ""}`)
  }
  const about = table.selectFirst("td.viewcolumn:contains(Description) + td")?.text()
  return {
    title: document.selectFirst("h1.title")?.text(),
    author: [...new Set(people)].join(", ") || undefined,
    description: (lines.join("\n") + (about != null ? `\n\n${about}` : "")).trim(),
    genres: table.select("span.tag a").map((a) => a.text().replace(/\s*\([\d,]+\)$/, "")),
    status: "completed",
    thumbnailUrl: document.selectFirst("figure.image img")?.attr("src") || undefined,
  }
}

/** The reader's data, as the site's own script decrypts it. */
function decrypt(encoded: string): string {
  const data = base64Decode(encoded)
  const hostname = "hentainexus.com"
  for (let i = 0; i < hostname.length; i++) data[i] ^= hostname.charCodeAt(i)
  const keyStream = data.subarray(0, 64)
  const ciphertext = data.subarray(64)
  const digest = Array.from({ length: 256 }, (_, i) => i)
  let primeIdx = 0
  for (let i = 0; i < 64; i++) {
    primeIdx ^= keyStream[i]
    for (let j = 0; j < 8; j++) primeIdx = primeIdx & 1 ? (primeIdx >>> 1) ^ 12 : primeIdx >>> 1
  }
  primeIdx &= 7
  let key = 0
  for (let i = 0; i < 256; i++) {
    key = (key + digest[i] + keyStream[i % 64]) % 256;
    [digest[i], digest[key]] = [digest[key], digest[i]]
  }
  const q = [2, 3, 5, 7, 11, 13, 17, 19][primeIdx]
  let k = 0, n = 0, p = 0, xorKey = 0
  let out = ""
  for (let i = 0; i < ciphertext.length; i++) {
    k = (k + q) % 256
    n = (p + digest[(n + digest[k]) % 256]) % 256
    p = (p + k + digest[k]) % 256;
    [digest[k], digest[n]] = [digest[n], digest[k]]
    xorKey = digest[(n + digest[(k + digest[(xorKey + p) % 256]) % 256]) % 256]
    out += String.fromCharCode(ciphertext[i] ^ xorKey)
  }
  return out
}

/** Splits on commas outside double quotes. */
function splitTerms(text: string): string[] {
  const tokens: string[] = []
  let current = ""
  let quoted = false
  for (const ch of text) {
    if (ch === "\"") { quoted = !quoted; current += ch } else if (ch === "," && !quoted) { if (current.trim()) tokens.push(current.trim()); current = "" } else current += ch
  }
  if (current.trim()) tokens.push(current.trim())
  return tokens
}

const advancedFilters: [string, string, string][] = [
  ["tags", "Tags", "tag"], ["artists", "Artists", "artist"], ["authors", "Authors", "author"], ["circles", "Circles", "circle"],
  ["events", "Events", "event"], ["parodies", "Parodies", "parody"], ["magazines", "Magazines", "magazine"], ["publishers", "Publishers", "publisher"],
]

const source: Source = {
  info: {
    id: "7719798645438596394", name: "HentaiNexus", lang: "en", version: "1.0.0", baseUrl, supportsLatest: true, nsfw: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/hentainexus/res/mipmap-xhdpi/ic_launcher.png",
    rateLimits: [{ host: "hentainexus.com", permits: 1, periodMs: 1000 }],
  },

  getLatestUpdates(page) {
    return list(baseUrl + (page > 1 ? `/page/${page}` : ""))
  },

  getPopularManga(page) {
    return page > 1 ? this.searchManga(page - 1, "sort:popular", []) : list(baseUrl + popularNowPath)
  },

  async searchManga(page, query, filters) {
    if (query.startsWith("id:")) {
      const id = query.slice(3)
      const { document } = await fetchPage(`${baseUrl}/view/${id}`)
      return { mangas: [{ ...details(document), url: `/view/${id}`, title: details(document).title ?? id }], hasNextPage: false }
    }
    const offsetFilter = filters.find((f) => f.id === "offset")
    const actualPage = page + (offsetFilter?.type === "text" ? Number.parseInt(offsetFilter.value, 10) || 0 : 0)
    const combined = advancedFilters.flatMap(([id, , key]) => {
      const filter = filters.find((f) => f.id === id)
      if (filter?.type !== "text") return []
      return splitTerms(filter.value).map((token) => `${token.startsWith("-") ? "-" : ""}${key}:${token.replace(/^-/, "")} `)
    }).join("")
    return list(`${baseUrl}${actualPage > 1 ? `/page/${actualPage}` : ""}?${queryString([["q", (combined + query).trim()]])}`)
  },

  async getMangaDetails(manga) {
    return details((await fetchPage(baseUrl + manga.url)).document)
  },

  async getChapterList(manga) {
    const { document, url } = await fetchPage(baseUrl + manga.url)
    const published = document.selectFirst(".view-page-details td.viewcolumn:contains(Published) + td")?.text()
    const id = url.split("?")[0].replace(/\/$/, "").split("/").pop()
    return [{ url: `/read/${id}`, name: "Chapter", dateUpload: published ? Date.parse(`${published} UTC`) || undefined : undefined }]
  },

  async getPageList(chapter) {
    const { document } = await fetchPage(baseUrl + chapter.url)
    const script = document.select("script").map((s) => s.data()).find((data) => data.includes("initReader"))
    if (!script) throw new Error("Could not find initReader script; the page structure may have changed")
    const encoded = script.split("initReader(\"")[1].split("\",")[0]
    const images = (JSON.parse(decrypt(encoded)) as Record<string, string>[]).filter((item) => item.type === "image")
    if (images.length === 0) return []
    const format = (Honya.prefs.get("pref_image_format") as string | null) ?? "webp"
    const field = format === "source" ? "image_source" : format === "avif" ? "image_avif" : "image_fallback"
    if (images[0][field] == null) throw new Error(`Selected quality '${format}' is not available. Log in or choose another quality.`)
    return images.map((image) => ({ url: image[field] }))
  },

  getFilterList(): Filter[] {
    return [
      { type: "header", id: "h1", name: "Separate items with commas (,). Prepend with dash (-) to exclude. Surround items with multiple words with double quotes (\")." },
      ...advancedFilters.map(([id, name]): Filter => ({ type: "text", id, name, value: "" })),
      { type: "separator", id: "s1" },
      { type: "text", id: "offset", name: "Offset results by # pages", value: "" },
    ]
  },
}

export default source
