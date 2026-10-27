// Ported from the Keiyoushi "ManhuaTop" extension (v1.6.57):
// https://github.com/keiyoushi/extensions-source/tree/main/src/en/manhuatop
// Licensed under the Apache License, Version 2.0.
// The site left Madara for its own JSON API. Not here: related manga, which the app doesn't offer.

import { fetchHTML, fetchJSON, mapLimit, queryString, unescapeEntities, type Chapter, type Filter, type HTMLNode, type Manga, type MangaStatus, type MangasPage, type Source } from "../../../sdk"

const baseUrl = "https://manhuatop.org"
const headers = { Referer: `${baseUrl}/` }
const chaptersPerPage = 30

interface CardDto { title: string; path: string; thumbnail?: string | null; status?: string | null }
interface ChapterDto { slug: string; title: string; extra?: string | null; date?: string | null; path?: string | null }

const statuses: Record<string, MangaStatus> = { "on-going": "ongoing", end: "completed", "on-hold": "onHiatus", canceled: "cancelled" }
const sortOptions: [string, string][] = [
  ["Default", ""], ["Latest Update", "latest_update"], ["Newest", "newest"], ["Title", "title"], ["Highest Rated", "rating"], ["Most Viewed", "views"],
  ["Trending This Week", "trending-week"], ["Trending This Month", "trending-month"], ["Trending This Year", "trending-year"],
]

/** A path as the API wants it: percent-encoded, whether or not it was stored decoded. */
function encodedPath(path: string): string {
  try { return encodeURI(decodeURI(path)) } catch { return path }
}

/** The API takes the path (and query) of the page it serves. */
function api<T>(endpoint: string, path: string, resource?: string): Promise<T> {
  return fetchJSON<T>({ url: `${baseUrl}/api/${endpoint}?${queryString([...(resource ? [["resource", resource] as [string, string]] : []), ["path", path]])}`, headers })
}

// Entries saved by the Madara version keep the WordPress post ID, with the path in sourceData.
function mangaPath(manga: Manga): string {
  if (manga.url.startsWith("/")) return manga.url
  let path: unknown
  try { path = JSON.parse(manga.sourceData ?? "{}").path } catch { /* none */ }
  if (typeof path !== "string" || !path) throw new Error("This entry has no page path; migrate it to ManhuaTop again.")
  return path
}

function chapterUrl(chapter: Chapter): string {
  // Chapters saved before Madara's post IDs keep the whole path.
  if (chapter.url.startsWith("/")) return baseUrl + chapter.url
  let path: unknown
  try { path = JSON.parse(chapter.sourceData ?? "{}").mangaPath } catch { /* none */ }
  if (typeof path !== "string" || !path) throw new Error("Refresh the chapter list.")
  return `${baseUrl}${path.replace(/\/?$/, "/")}${chapter.url}/`
}

/** Jsoup's `wholeText`: the text with the line breaks it has in the page. */
function wholeText(element: HTMLNode): string {
  return unescapeEntities(element.html().replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|h\d)>/gi, "$&\n").replace(/<[^>]*>/g, ""))
}

function details(document: HTMLNode): Partial<Manga> {
  // "Updating" is the site's placeholder value.
  const metadata = (name: string) => document.select(".metadata-list dt").filter((dt) => dt.ownText() === name)
    .flatMap((dt) => dt.nextElementSibling()?.select("a") ?? []).map((a) => a.text()).filter((t) => t && t !== "Updating")
  const seen = new Set<string>()
  const genres = [...metadata("Type"), ...document.select(".genre-chips a, .tags-chips a").map((a) => a.text())]
    .filter((g) => !seen.has(g.toLowerCase()) && seen.add(g.toLowerCase()))
  const statusText = document.selectFirst(".detail-stats .status-badge")?.text().toLowerCase()
  const status: MangaStatus = statusText === "ongoing" ? "ongoing" : statusText === "completed" ? "completed" : statusText === "on hold" ? "onHiatus" : statusText === "canceled" ? "cancelled" : "unknown"
  const rating = document.selectFirst(".detail-stats .card-rating")?.text().trim()
  const info = [rating ? `★ ${rating}` : "", document.selectFirst(".detail-stats span[title$=views]")?.text().trim() ?? "", metadata("Release")[0] ?? ""].filter(Boolean).join(" · ")
  const synopsisElement = document.selectFirst(".rich-content.synopsis")
  const synopsis = synopsisElement ? wholeText(synopsisElement).split("\n").map((line) => line.trim()).join("\n").replace(/\n{3,}/g, "\n\n").trim() : ""
  const alternatives = document.selectFirst("p.alternative-title")?.text().trim()
  const altTitles = alternatives ? `**Alternative titles:**\n${alternatives.split(" / ").map((t) => `- ${t}`).join("\n")}` : ""
  return {
    title: document.selectFirst("h1#manga-title")?.text(),
    thumbnailUrl: document.selectFirst(".detail-cover img")?.absUrl("src") || undefined,
    author: metadata("Author").join(", ") || undefined,
    artist: metadata("Artist").join(", ") || undefined,
    genres,
    status,
    description: [info, synopsis, altTitles].filter(Boolean).join("\n\n") || undefined,
  }
}

async function chapterPage(path: string, page: number): Promise<{ items: ChapterDto[]; total: number }> {
  return api("reader", `${encodedPath(path)}?${queryString([["tab", "chapters"], ["chapter_page", page]])}`, "chapters")
}

const source: Source = {
  info: {
    id: "1903782575226230108", name: "ManhuaTop", lang: "en", version: "1.2.0", baseUrl, supportsLatest: true, nsfw: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/manhuatop/res/mipmap-xhdpi/ic_launcher.png",
    rateLimits: [{ host: "manhuatop.org", permits: 2, periodMs: 1000 }],
  },

  getPopularManga(page) {
    return source.searchManga(page, "", [{ type: "select", id: "sort", name: "Sort by", options: [{ label: "", value: "trending-week" }], selected: 0 }])
  },

  getLatestUpdates(page) {
    return source.searchManga(page, "", [{ type: "select", id: "sort", name: "Sort by", options: [{ label: "", value: "latest_update" }], selected: 0 }])
  },

  async searchManga(page, query, filters): Promise<MangasPage> {
    const keyword = query.trim()
    if (keyword.length === 1) throw new Error("Search query must be at least 2 characters")
    const params: [string, string][] = []
    let path: string
    if (keyword) {
      path = `/search/${encodeURIComponent(keyword)}/`
      if (page > 1) params.push(["page", String(page)])
    } else {
      path = `/series/${page > 1 ? `page/${page}/` : ""}`
    }
    for (const filter of filters) {
      if (filter.type === "select" && filter.options[filter.selected]?.value) params.push([filter.id, filter.options[filter.selected].value])
      if (filter.type === "checkboxes" && filter.id === "genre" && filter.checked.length > 0) {
        if (filter.checked.length > 10) throw new Error("Select up to 10 genres")
        params.push(["genre", filter.checked.join(",")])
      }
    }
    const discovery = await api<{ items: CardDto[]; hasMore: boolean }>("discovery", params.length ? `${path}?${queryString(params)}` : path)
    return {
      mangas: discovery.items.map((card) => ({ url: card.path, title: card.title, thumbnailUrl: card.thumbnail ?? undefined, status: statuses[card.status ?? ""] ?? "unknown" })),
      hasNextPage: discovery.hasMore,
    }
  },

  async getMangaDetails(manga) {
    return details(await fetchHTML({ url: baseUrl + mangaPath(manga), headers }))
  },

  async getChapterList(manga) {
    const path = mangaPath(manga)
    const first = await chapterPage(path, 1)
    const pages = Math.ceil(first.total / chaptersPerPage)
    const rest = await mapLimit(Array.from({ length: Math.max(0, pages - 1) }, (_, i) => i + 2), 4, (page) => chapterPage(path, page))
    const seen = new Set<string>()
    return [first, ...rest].flatMap((data) => data.items)
      // The site shows these as "Reader link unavailable", and lists some chapters twice.
      .filter((c) => c.path != null && !seen.has(c.path) && seen.add(c.path))
      .map((c): Chapter => ({
        url: c.slug,
        name: [c.title, c.extra?.trim() ? c.extra : undefined].filter(Boolean).join(" - "),
        dateUpload: (c.date && Date.parse(c.date)) || undefined,
        sourceData: JSON.stringify({ mangaPath: path }),
      }))
  },

  async getPageList(chapter) {
    const path = encodedPath(chapterUrl(chapter).slice(baseUrl.length))
    const images: string[] = []
    for (let page = 1; ; page++) {
      const data = await api<{ images: { url: string }[]; hasMore: boolean }>("reader", page > 1 ? `${path}?content_page=${page}` : path, "content")
      images.push(...data.images.map((image) => image.url))
      if (!data.hasMore) break
    }
    return images.map((url) => ({ url }))
  },

  getFilterList(data) {
    const select = (id: string, name: string, pairs: [string, string][]): Extract<Filter, { type: "select" }> => ({ type: "select", id, name, options: pairs.map(([label, value]) => ({ label, value })), selected: 0 })
    const genres = Array.isArray(data) ? (data as unknown[]).filter((g): g is [string, string] => Array.isArray(g) && typeof g[0] === "string" && typeof g[1] === "string") : []
    const list: Filter[] = [
      // The default is relevance for a text search and Latest Update otherwise.
      { ...select("sort", "Sort by", sortOptions), listings: { popular: "trending-week", latest: "latest_update" } },
      select("manga_type", "Type", [["All types", ""], ["Manhwa", "Manhwa"], ["Manga", "Manga"], ["Manhua", "Manhua"], ["Webtoons", "Webtoons"]]),
      select("status", "Status", [["All statuses", ""], ["Ongoing", "on-going"], ["Completed", "end"], ["On hold", "on-hold"], ["Canceled", "canceled"]]),
    ]
    if (genres.length > 0) list.push({ type: "checkboxes", id: "genre", name: "Genres (any of, up to 10)", options: genres.map(([label, value]) => ({ label, value })), checked: [] })
    return list
  },

  async fetchFilterData() {
    const terms: { id: string; name: string; count: number }[] = []
    for (let page = 1; ; page++) {
      const data = await fetchJSON<{ terms: { id: string; name: string; count: number }[]; hasMore: boolean }>({ url: `${baseUrl}/api/genres?page=${page}`, headers })
      terms.push(...data.terms)
      if (!data.hasMore) break
    }
    // The site lists genres with no titles.
    return terms.filter((t) => t.count > 0).map((t): [string, string] => [t.name, t.id]).sort((a, b) => a[0].toLowerCase() < b[0].toLowerCase() ? -1 : a[0].toLowerCase() > b[0].toLowerCase() ? 1 : 0)
  },

  getMangaUrl(manga) {
    return baseUrl + mangaPath(manga)
  },
}

export default source
