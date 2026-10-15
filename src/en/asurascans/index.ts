// Ported from the Keiyoushi "Asura Scans" extension (v1.6.69):
// https://github.com/keiyoushi/extensions-source/tree/main/src/en/asurascans
// Licensed under the Apache License, Version 2.0.
// Its genre and creator filters, which the Kotlin version fetches from the site, aren't here.

import { fetchJSON, fetchPage, queryString, type Chapter, type Filter, type HTMLNode, type Manga, type MangaStatus, type Source } from "../../../sdk"

const baseUrl = "https://asurascans.com"
const api = "https://api.asurascans.com/api"
const perPage = 20
const randomSuffix = /-[a-z0-9]{8}$/

/**
 * Astro islands keep their props as JSON where every value is wrapped as [type, value];
 * unwrap them back to plain JSON.
 */
function unwrapAstro(value: unknown): unknown {
  if (Array.isArray(value)) {
    if (value.length === 0) return null
    if (value.length === 1 && Number.isInteger(value[0])) return null
    if (value.length === 2 && Number.isInteger(value[0])) return unwrapAstro(value[1])
    return value.map(unwrapAstro)
  }
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, unwrapAstro(v)]))
  return value
}

function astroProp<T>(document: HTMLNode, ...keys: string[]): T {
  const prop = document.selectFirst(keys.map((k) => `[props*=${k}]`).join(""))?.attr("props")
  if (!prop) throw new Error(`Unable to find prop with ${keys.join(", ")}`)
  return unwrapAstro(JSON.parse(prop)) as T
}

/** The slug in /series/<slug>, /comics/<slug> or the old /manga/<id>-<slug>/. */
function mangaSlug(url: string): string {
  if (url.includes("/series/")) return url.split("/series/")[1].split("/")[0]
  if (url.includes("/comics/")) return url.split("/comics/")[1].split("/")[0]
  if (url.includes("/manga/")) return /^\/manga\/(\d+-)?([^/]+)\/?$/.exec(url)?.[2] ?? url.split("/manga/")[1].split("/")[0]
  return url.replace(/^\/+|\/+$/g, "")
}

/** The site's current URL slug (with its random suffix), kept in sourceData. */
function publicSlug(sourceData: string | undefined, key: string): string | undefined {
  try { return JSON.parse(sourceData ?? "{}")[key] } catch { return undefined }
}

async function seriesPage(manga: Manga) {
  const url = `${baseUrl}/comics/${publicSlug(manga.sourceData, "slug") ?? mangaSlug(manga.url)}`
  const first = await Honya.request(url)
  // Without its random suffix, the URL redirects to the current one.
  if (first.status < 200 || first.status > 299) return fetchPage(url.replace(randomSuffix, ""))
  return { document: Honya.parseHTML(first.body, first.url), url: first.url }
}

interface MangaDto { public_url: string; slug: string; title: string; cover?: string; coverUrl?: string }
interface Details { title: string; coverUrl: string; author?: string | null; artist?: string | null; description?: string | null; rating?: number | null; bookmarkCount?: number | null; type?: string | null; popularityRank?: number | null; alternativeTitles?: string | null; genres?: { name: string }[] | null; status?: string | null }
interface ChapterDto { number: number; title?: string | null; created_at?: string; is_premium?: boolean; is_locked?: boolean; early_access_until?: string | null; series_slug?: string | null }
interface PageDto { url: string; tiles?: number[] | null; tile_cols?: number | null; tile_rows?: number | null }

const statuses: Record<string, MangaStatus> = { ongoing: "ongoing", completed: "completed", hiatus: "onHiatus", dropped: "cancelled", axed: "cancelled" }
const compact = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n))
const isLocked = (c: ChapterDto) => c.is_premium === true || c.is_locked === true || (c.early_access_until ? Date.parse(c.early_access_until) > Date.now() : false)
const lastSegment = (path: string) => path.replace(/\/$/, "").split("/").pop() ?? ""

const sorts: [string, string][] = [["Latest Update", "latest"], ["Popular", "popular"], ["Rating", "rating"], ["A-Z", "title"], ["Newest", "update"]]

const source: Source = {
  info: {
    id: "6247824327199706550", name: "Asura Scans", lang: "en", version: "1.0.2", baseUrl, supportsLatest: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/asurascans/res/mipmap-xhdpi/ic_launcher.png",
    rateLimits: [{ host: "asurascans.com", permits: 2, periodMs: 2000 }, { host: "api.asurascans.com", permits: 2, periodMs: 2000 }],
  },

  getPopularManga(page) {
    return this.searchManga(page, "", [{ type: "sort", id: "sort", name: "", options: sorts.map(([label, value]) => ({ label, value })), selected: 1, ascending: false }])
  },

  getLatestUpdates(page) {
    return this.searchManga(page, "", [{ type: "sort", id: "sort", name: "", options: sorts.map(([label, value]) => ({ label, value })), selected: 0, ascending: false }])
  },

  async searchManga(page, query, filters) {
    const params: [string, string][] = [["offset", String((page - 1) * perPage)], ["limit", String(perPage)]]
    if (query.trim()) params.push(["search", query])
    for (const filter of filters) {
      if (filter.type === "sort") params.push(["sort", filter.options[filter.selected ?? 0].value], ["order", filter.ascending ? "asc" : "desc"])
      if (filter.type === "select" && filter.options[filter.selected]?.value) params.push([filter.id, filter.options[filter.selected].value])
      if (filter.type === "text" && filter.id === "min_chapters" && filter.value.trim()) params.push(["min_chapters", filter.value.trim()])
    }
    const result = await fetchJSON<{ data?: MangaDto[]; meta?: { has_more?: boolean } }>(`${api}/series?${queryString(params)}`)
    const mangas = (result.data ?? []).map((m) => ({
      // The old URL form, which existing library entries use.
      url: `/series/${m.slug}`,
      title: m.title,
      thumbnailUrl: m.cover ?? m.coverUrl,
      sourceData: JSON.stringify({ slug: lastSegment(m.public_url) }),
    }))
    return { mangas, hasNextPage: result.meta?.has_more ?? false }
  },

  async getMangaDetails(manga) {
    const { document } = await seriesPage(manga)
    const d = astroProp<Details>(document, "title", "description")
    const { publicUrl } = astroProp<{ publicUrl: string; seriesSlug: string }>(document, "publicUrl")
    const metadata = [
      d.popularityRank != null ? `Rank: #${d.popularityRank}` : "",
      d.rating != null ? `Rating: ${d.rating.toFixed(2)}` : "",
      d.bookmarkCount != null ? `Bookmarks: ${compact(d.bookmarkCount)}` : "",
    ].filter(Boolean).join(" • ")
    const about = d.description ? Honya.parseHTML(`<body>${d.description}</body>`).text() : ""
    const alternatives = (d.alternativeTitles ?? "").split(d.alternativeTitles?.includes("•") ? "•" : ",").map((t) => t.trim()).filter(Boolean)
    return {
      title: d.title,
      thumbnailUrl: d.coverUrl,
      author: d.author ?? undefined,
      artist: d.artist ?? undefined,
      description: [metadata, about, alternatives.length ? `Alternative Titles:\n${alternatives.map((t) => `- ${t}`).join("\n")}` : ""].filter(Boolean).join("\n\n"),
      genres: [...(d.type ? [d.type.charAt(0).toUpperCase() + d.type.slice(1)] : []), ...(d.genres ?? []).map((g) => g.name)],
      status: statuses[d.status?.toLowerCase() ?? ""] ?? "unknown",
      sourceData: JSON.stringify({ slug: lastSegment(publicUrl) }),
    }
  },

  async getChapterList(manga) {
    const { document } = await seriesPage(manga)
    const { publicUrl } = astroProp<{ publicUrl: string }>(document, "publicUrl")
    const slug = lastSegment(publicUrl)
    const hidePremium = (Honya.prefs.get("pref_hide_premium_chapters") as boolean | null) ?? true
    const chapters = astroProp<{ chapters?: ChapterDto[] }>(document, "chapters").chapters ?? []
    return chapters.filter((c) => !(hidePremium && isLocked(c))).map((c): Chapter => {
      const number = String(c.number)
      return {
        url: `/series/${c.series_slug}/chapter/${number}`,
        sourceData: JSON.stringify({ mangaSlug: slug }),
        name: `${isLocked(c) ? "🔒 " : ""}Chapter ${number}${c.title ? ` - ${c.title}` : ""}`,
        dateUpload: c.created_at ? Date.parse(c.created_at) || undefined : undefined,
      }
    })
  },

  async getPageList(chapter) {
    const slug = publicSlug(chapter.sourceData, "mangaSlug")
    if (!slug) throw new Error("Refresh the chapter list.")
    const { document } = await fetchPage(`${baseUrl}/comics/${slug}/chapter/${chapter.url.split("/chapter/")[1]}`)
    let pages: PageDto[] = []
    try { pages = astroProp<{ pages: PageDto[] }>(document, "pages").pages ?? [] } catch { /* premium */ }
    if (pages.length === 0) throw new Error("This chapter needs an Asura Scans subscription.")
    // Scrambled pages carry their tile order in the fragment, which the app uses to put them back.
    return pages.map((p) => ({
      url: p.tiles?.length ? `${p.url}#${JSON.stringify({ tiles: p.tiles, tileCols: p.tile_cols ?? 4, tileRows: p.tile_rows ?? 5 })}` : p.url,
    }))
  },

  getFilterList(): Filter[] {
    const select = (id: string, name: string, pairs: [string, string][]): Filter => ({ type: "select", id, name, options: pairs.map(([label, value]) => ({ label, value })), selected: 0 })
    return [
      { type: "sort", id: "sort", name: "Sort By", options: sorts.map(([label, value]) => ({ label, value })), selected: 0, ascending: false, listings: { popular: "popular", latest: "latest" } },
      select("status", "Status", [["All", ""], ["Ongoing", "ongoing"], ["Completed", "completed"], ["Hiatus", "hiatus"], ["Dropped", "dropped"], ["Axed", "axed"]]),
      select("type", "Type", [["All", ""], ["Manhwa", "manhwa"], ["Manhua", "manhua"], ["Mangatoon", "manga"]]),
      { type: "text", id: "min_chapters", name: "Min Chapters", value: "" },
    ]
  },
}

export default source
