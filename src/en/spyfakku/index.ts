// Ported from the Keiyoushi "SpyFakku" extension (v1.6.1):
// https://github.com/keiyoushi/extensions-source/tree/main/src/en/spyfakku
// Licensed under the Apache License, Version 2.0.
// Not ported: the Kotlin version turns off TLS certificate checks and solves Anubis challenges
// on "airdns" mirrors in a WebView; the site works without either today.

import { queryString, send, type Filter, type Manga, type MangasPage, type Source } from "../../../sdk"

const baseUrl = "https://hentalk.pw"
const api = `${baseUrl}/api`
// The Kotlin version points images at 127.0.0.1 and rewrites that to the site.
const imageBase = `${baseUrl}/image`

interface Tag { namespace: string; name: string }
interface Hentai { id: number; hash: string; title: string; thumbnail: number; pages: number; tags?: Tag[] }
interface ShortHentai { hash: string; title: string; thumbnail: number; description?: string | null; releasedAt?: string | null; createdAt?: string | null; tags?: Tag[] | null; size: number; pages: number }

const fullTitlePref = () => Rakuen.prefs.get("display_full_title") === true

function fullTitle(title: string, tags: Tag[] | null | undefined): string {
  const named = (namespace: string) => (tags ?? []).filter((t) => t.namespace === namespace && t.name.trim()).map((t) => t.name).join(" & ")
  const circle = named("circle"), artist = named("artist"), magazine = named("magazine")
  let text = circle ? `[${circle}${artist ? ` (${artist})` : ""}] ` : artist ? `[${artist}] ` : ""
  text += title
  return magazine ? `${text} (${magazine})` : text
}

const toManga = (h: Hentai): Manga => ({
  title: fullTitlePref() ? fullTitle(h.title, h.tags) : h.title,
  url: `/g/${h.id}?${h.pages}&hash=${h.hash}`,
  author: h.tags?.filter((t) => t.namespace === "circle").map((t) => t.name).join(", "),
  artist: h.tags?.filter((t) => t.namespace === "artist").map((t) => t.name).join(", "),
  genres: h.tags?.filter((t) => t.namespace === "tag").map((t) => t.name),
  thumbnailUrl: `${imageBase}/${h.hash}/${h.thumbnail}?type=cover`,
  status: "completed",
})

async function library(params: [string, string][]): Promise<MangasPage> {
  const data = JSON.parse((await send(`${api}/library?${queryString(params)}`)).body) as { archives: Hentai[]; page: number; limit: number; total: number }
  return { mangas: data.archives.map(toManga), hasNextPage: data.page * data.limit < data.total }
}

/** The API path for an entry: /g/<id>, also from the old /archive/<id>/… URLs. */
const apiPath = (url: string) => url.replace(/^\/archive\/(\d+)\/.*/, "/g/$1").split("?")[0]

/** Details from the API, else from the page's SvelteKit data (its values are indexed). */
async function shortHentai(url: string): Promise<ShortHentai> {
  const path = apiPath(url)
  const response = await Rakuen.request(api + path)
  if (response.status >= 200 && response.status < 300) return JSON.parse(response.body) as ShortHentai
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const page = await Rakuen.request(`${baseUrl}${path}/__data.json`)
      if (page.status < 200 || page.status > 299) continue
      const nodes = (JSON.parse(page.body) as { nodes: { data: unknown[] }[] }).nodes
      const data = nodes[nodes.length - 1].data
      const index = data[1] as Record<string, number>
      const value = <T>(key: string) => data[index[key]] as T
      const tagRefs = (value<number[]>("tags") ?? [])
      return {
        hash: value("hash"), title: value("title"), thumbnail: value("thumbnail"), description: value("description"),
        releasedAt: value("releasedAt"), createdAt: value("createdAt"), size: value("size"), pages: value("pages"),
        tags: tagRefs.length ? tagRefs.map((ref) => ({ namespace: data[ref + 2] as string, name: data[ref + 3] as string })) : null,
      }
    } catch { /* try again */ }
  }
  throw new Error("Failed to fetch details")
}

const readableSize = (size: number) =>
  size >= 300e6 ? `${(size / 1e9).toFixed(2)} GB` : size >= 1e5 ? `${(size / 1e6).toFixed(2)} MB` : size >= 1000 ? `${(size / 1000).toFixed(2)} kB` : `${size} B`

const releasedAt = (text: string | null | undefined) => (text ? Date.parse(`${text.slice(0, 19)}Z`) || undefined : undefined)

const source: Source = {
  info: {
    id: "6202325652827735606", name: "SpyFakku", lang: "en", version: "1.0.0", baseUrl, supportsLatest: true, nsfw: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/spyfakku/res/mipmap-xhdpi/ic_launcher.png",
    rateLimits: [{ host: "hentalk.pw", permits: 2, periodMs: 1000 }],
  },

  getPopularManga(page) {
    return library([["sort", "released_at"], ["page", String(page)]])
  },

  getLatestUpdates(page) {
    return library([["sort", "created_at"], ["page", String(page)]])
  },

  searchManga(page, query, filters) {
    if (filters.length === 0) filters = this.getFilterList!()
    const params: [string, string][] = []
    const terms = [query.trim()]
    for (const filter of filters) {
      if (filter.type === "sort") {
        const value = filter.options[filter.selected ?? 3].value
        params.push(["sort", value])
        if (value === "random") params.push(["seed", Math.random().toString(36).slice(2, 2 + 4 + Math.floor(Math.random() * 5))])
        params.push(["order", filter.ascending ? "asc" : "desc"])
      } else if (filter.type === "select" && filter.id === "limit") {
        params.push(["limit", filter.options[filter.selected].value])
      } else if (filter.type === "text" && filter.value) {
        for (const tag of filter.value.split(",").filter((t) => t.trim())) {
          const trimmed = tag.trim().replace(/ /g, "_")
          terms.push(`${trimmed.startsWith("-") ? "-" : ""}${filter.id}:${trimmed.replace(/^-/, "")}`)
        }
      }
    }
    params.push(["q", terms.join(" ")], ["page", String(page)])
    return library(params)
  },

  async getMangaDetails(manga) {
    const info = await shortHentai(manga.url)
    const named = (namespace: string) => (info.tags ?? []).filter((t) => t.namespace === namespace).map((t) => t.name)
    let description = info.description ? `${info.description}\n\n` : ""
    for (const [label, namespace, end] of [["Circles", "circle", "\n"], ["Publishers", "publisher", "\n"], ["Magazines", "magazine", "\n"], ["Events", "event", "\n\n"], ["Parodies", "parody", "\n"]]) {
      if (named(namespace).length) description += `${label}: ${named(namespace).join(", ")}${end}`
    }
    description += `Pages: ${info.pages}\n\n`
    const released = releasedAt(info.releasedAt)
    if (released) description += `Released: ${new Date(released).toUTCString()}\n`
    const added = info.createdAt ? Date.parse(`${info.createdAt.replace(" ", "T")}Z`) : NaN
    if (!Number.isNaN(added)) description += `Added: ${new Date(added).toUTCString()}\n`
    description += `Size: ${readableSize(info.size)}`
    const circles = named("circle")
    return {
      title: fullTitlePref() ? fullTitle(info.title, info.tags) : info.title,
      status: "completed",
      author: (circles.length ? circles : named("artist")).join(", ") || undefined,
      artist: named("artist").join(", ") || undefined,
      thumbnailUrl: `${imageBase}/${info.hash}/${info.thumbnail}?type=cover`,
      genres: named("tag"),
      description,
    }
  },

  async getChapterList(manga) {
    const info = await shortHentai(manga.url)
    const url = manga.url.includes("&") ? manga.url : `${manga.url}?${info.pages}&hash=${info.hash}`
    return [{ name: "Chapter", url, dateUpload: releasedAt(info.releasedAt) }]
  },

  async getPageList(chapter) {
    // /g/<id>?<pages>&hash=<hash> says everything needed.
    const match = /\?(\d+)&hash=(\w+)/.exec(chapter.url)
    if (match) return Array.from({ length: Number(match[1]) }, (_, i) => ({ url: `${imageBase}/${match[2]}/${i + 1}` }))
    const info = await shortHentai(chapter.url)
    return Array.from({ length: info.pages }, (_, i) => ({ url: `${imageBase}/${info.hash}/${i + 1}` }))
  },

  getFilterList(): Filter[] {
    const text = (id: string, name: string): Filter => ({ type: "text", id, name, value: "" })
    return [
      { type: "sort", id: "sort", name: "Sort by", options: [["Title", "title"], ["Relevance", "relevance"], ["Date Added", "created_at"], ["Date Released", "released_at"], ["Pages", "pages"], ["Random", "random"]].map(([label, value]) => ({ label, value })), selected: 3, ascending: false },
      { type: "select", id: "limit", name: "Per page", options: ["6", "12", "24", "36", "48"].map((v) => ({ label: v, value: v })), selected: 2 },
      { type: "separator", id: "s1" },
      { type: "header", id: "h1", name: "Separate tags with commas (,)" },
      { type: "header", id: "h2", name: "Prepend with dash (-) to exclude" },
      text("tag", "Tags"), text("artist", "Artists"), text("magazine", "Magazines"), text("publisher", "Publishers"),
      text("parody", "Parodies"), text("circle", "Circles"), text("event", "Events"),
    ]
  },
}

export default source
