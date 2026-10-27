// Ported from Keiyoushi's "yiimadara" multisrc theme (Apache License 2.0):
// https://github.com/keiyoushi/extensions-source/tree/main/lib-multisrc/yiimadara
// Yii2 sites that copy Madara's markup. Options are named after the Kotlin members a site
// overrides. Not here: related manga, which the app doesn't offer, and deep links.

import { fetchHTML, javaDateParser, queryString, relativeUrl, type Chapter, type Filter, type HTMLNode, type Manga, type MangaStatus, type MangasPage, type Source, type SourceInfo } from "../sdk"

/** Kotlin's `RawEntries`: what listings do with the untranslated raws mixed into them. */
export type RawEntries = "show" | "hide" | "only"

export interface YiiMadaraOptions {
  info: SourceInfo
  /** The catalog, sorted with ?orderby=. */
  directoryPath?: string
  /** Paginate as /<path>/page/<n> instead of /<path>/<n>. */
  pageSegment?: boolean
  trailingSlash?: boolean
  searchParam?: string
  /** The Category filter's listings; null when the site has none. */
  completedPath?: string | null
  rawPath?: string | null
  /** Hidden in "en" and the only entries in "ko" by default, except in the raw listing itself. */
  rawEntries?: RawEntries
  /** No orderby is the latest updates order; orderby=latest is the newest series. */
  sortOptions?: [string, string][]
  /**
   * The Genre filter's [name, path] pairs, for a site that doesn't link its genre pages
   * (Kotlin's `genres` with `supportsFilterFetching = false`). Left out, they're fetched.
   */
  genres?: [string, string][]
}

const defaultSortOptions: [string, string][] = [["Default", ""], ["Trending", "trending"], ["Newest", "latest"], ["Rating", "rating"], ["A-Z", "alphabet"]]

// "09 Oct 2026" or "09 Oct 26"
const longDate = javaDateParser("dd MMM yyyy", "en")
const shortDate = javaDateParser("dd MMM yy", "en")
const parseChapterDate = (text: string | undefined) => text ? longDate(text) ?? shortDate(text) : undefined

const imgUrl = (img: HTMLNode | null) => img ? img.absUrl("data-src") || img.absUrl("src") || undefined : undefined
const isRaw = (manga: Manga) => manga.url.replace(/\/+$/, "").endsWith("-raw") || / raw$/i.test(manga.title)

export function yiiMadara(o: YiiMadaraOptions): Source {
  const { info } = o
  const baseUrl = info.baseUrl.replace(/\/$/, "")
  const directoryPath = o.directoryPath ?? "manga"
  const completedPath = o.completedPath === undefined ? "completed" : o.completedPath
  const rawPath = o.rawPath ?? null
  const rawEntries = o.rawEntries ?? (info.lang === "en" ? "hide" : info.lang === "ko" ? "only" : "show")
  const sortOptions = o.sortOptions ?? defaultSortOptions
  const get = (url: string) => fetchHTML({ url, headers: { Referer: `${baseUrl}/` } })

  function listUrl(path: string, page: number, order: string): string {
    const url = `${baseUrl}/${path}${o.pageSegment ? "/page" : ""}/${page}${o.trailingSlash ? "/" : ""}`
    return order ? `${url}?${queryString([["orderby", order]])}` : url
  }

  function parseList(document: HTMLNode, rawListing = false): MangasPage {
    const mangas = document.select("div.page-item, div.page-item-detail, div.home-item, div.manga-item").flatMap((element): Manga[] => {
      const link = element.selectFirst("h3 a")
      if (!link) return []
      return [{ url: relativeUrl(link.absUrl("href")), title: link.text(), thumbnailUrl: imgUrl(element.selectFirst("img")) }]
    })
    const kept = rawEntries === "show" || rawListing ? mangas : mangas.filter((manga) => isRaw(manga) === (rawEntries === "only"))
    return { mangas: kept, hasNextPage: document.selectFirst("#blog-pager li.next a") != null }
  }

  async function listing(path: string, page: number, order: string): Promise<MangasPage> {
    return parseList(await get(listUrl(path, page, order)), path === rawPath)
  }

  function details(document: HTMLNode): Partial<Manga> {
    // Rows are a .summary-heading/.summary-content pair or a <b> label followed by the value;
    // some sites put Status and Type under the cover instead, as .minfo with the value in <i>.
    const info = (label: string): HTMLNode[] => {
      const startsWithLabel = (text: string) => text.toLowerCase().startsWith(label.toLowerCase())
      const item = document.select(".post-content_item").find((e) => {
        const head = e.children().find((c) => c.is(".summary-heading") || c.is("b"))
        return head ? startsWithLabel(head.text()) : false
      })
      if (!item) return document.select(".minfo").find((e) => startsWithLabel(e.ownText()))?.children().filter((c) => c.is("i")) ?? []
      const content = item.children().filter((c) => c.is(".summary-content"))
      return content.length > 0 ? content : item.children().filter((c) => !c.is("b"))
    }
    const value = (elements: HTMLNode[]): string | undefined => {
      const text = elements.map((e) => e.text()).join(" ")
      return text && text !== "Updating" && text !== "N/A" ? text : undefined
    }
    const names = (elements: HTMLNode[]): string[] => {
      const links = elements.flatMap((e) => e.select("a"))
      const list = links.length > 0 ? links.map((a) => a.text()) : [value(elements)]
      return list.filter((name): name is string => !!name && name !== "Updating")
    }
    const heading = document.selectFirst(".post-title h1")
    const synopsisBlock = document.selectFirst(".dsct, .ss-manga, .post-content_item .entry-content")
    const synopsis = synopsisBlock
      ? (synopsisBlock.select("p").length > 0 ? synopsisBlock.select("p") : [synopsisBlock]).map((p) => p.text().trim()).filter(Boolean).join("\n\n")
      : ""
    const alternative = value(info("Alternative"))
    const type = value(info("Type"))
    const statusText = info("Status").map((e) => e.text()).join(" ").toLowerCase()
    const status: MangaStatus = statusText === "ongoing" ? "ongoing" : statusText === "completed" ? "completed" : "unknown"
    return {
      // Some sites put an "18+" badge inside the heading.
      title: heading ? heading.ownText().trim() || heading.text() : undefined,
      thumbnailUrl: imgUrl(document.selectFirst(".summary_image img")),
      author: names(info("Author")).join(", ") || undefined,
      artist: names(info("Artist")).join(", ") || undefined,
      genres: [...names(info("Genre")), ...(type ? [type] : [])],
      status,
      description: [synopsis, alternative ? `Alternative names: ${alternative}` : ""].filter(Boolean).join("\n\n") || undefined,
    }
  }

  // Sources previously on the Madara theme stored only the chapter slug, with the manga path in sourceData.
  function chapterUrl(chapter: Chapter): string {
    if (chapter.url.startsWith("/")) return baseUrl + chapter.url
    let mangaPath: unknown
    try { mangaPath = JSON.parse(chapter.sourceData ?? "{}").mangaPath } catch { /* none */ }
    if (typeof mangaPath !== "string" || !mangaPath) throw new Error("Refresh the chapter list.")
    return `${baseUrl}${mangaPath.replace(/\/+$/, "")}/${chapter.url}`
  }

  function filterList(data: unknown): Filter[] {
    const genres = o.genres ?? (Array.isArray(data) ? (data as unknown[]).filter((g): g is [string, string] => Array.isArray(g) && typeof g[0] === "string" && typeof g[1] === "string") : [])
    const categories: [string, string][] = []
    if (completedPath) categories.push(["Completed", completedPath])
    if (rawPath) categories.push(["Raw", rawPath])
    const select = (id: string, name: string, pairs: [string, string][]): Extract<Filter, { type: "select" }> => ({ type: "select", id, name, options: pairs.map(([label, value]) => ({ label, value })), selected: 0 })
    const has = (order: string) => sortOptions.some(([, value]) => value === order) ? order : undefined
    const list: Filter[] = [{ type: "header", id: "note", name: "Ignored when using text search; Genre takes priority over Category" }]
    if (genres.length > 0) list.push(select("genre", "Genre", [["All", ""], ...genres]))
    if (categories.length > 0) list.push(select("category", "Category", [["All", ""], ...categories]))
    list.push({ ...select("sort", "Sort by", sortOptions), listings: { popular: has("trending"), latest: has("") } })
    return list
  }

  const source: Source = {
    info: { ...info, supportsLatest: true },

    getPopularManga(page) {
      return listing(directoryPath, page, "trending")
    },

    getLatestUpdates(page) {
      return listing(directoryPath, page, "")
    },

    async searchManga(page, query, filters) {
      if (query.trim()) {
        // Search fails with HTTP 500 on ASCII apostrophes.
        const params = queryString([[o.searchParam ?? "q", query.replace(/'/g, "’")], ["page", page]])
        return parseList(await get(`${baseUrl}/search${o.trailingSlash ? "/" : ""}?${params}`))
      }
      const selected = (id: string) => { const f = filters.find((x) => x.id === id); return f?.type === "select" ? f.options[f.selected]?.value ?? "" : "" }
      // The genre takes priority over the category.
      return listing(selected("genre") || selected("category") || directoryPath, page, selected("sort"))
    },

    async getMangaDetails(manga) {
      return details(await get(baseUrl + manga.url))
    },

    async getChapterList(manga) {
      const document = await get(baseUrl + manga.url)
      return document.select("ul.row-content-chapter li").flatMap((element): Chapter[] => {
        const link = element.selectFirst("a")
        if (!link) return []
        return [{ url: relativeUrl(link.absUrl("href")), name: link.text(), dateUpload: parseChapterDate(element.selectFirst(".chapter-time")?.text()) }]
      })
    },

    async getPageList(chapter) {
      const document = await get(chapterUrl(chapter))
      return document.select(".read-content img").flatMap((img) => { const url = imgUrl(img); return url ? [{ url }] : [] })
    },

    getFilterList(data) {
      return filterList(data)
    },
  }

  // The genres the home page links, by name.
  if (!o.genres) {
    source.fetchFilterData = async () => {
      const seen = new Set<string>()
      const genres = (await get(baseUrl)).select("a[href*=genre/]").flatMap((a): [string, string][] => {
        const path = (/^[a-z][a-z\d+.-]*:\/\/[^/?#]*([^?#]*)/i.exec(a.absUrl("href"))?.[1] ?? "").replace(/^\/+|\/+$/g, "")
        return path && !seen.has(path) && seen.add(path) ? [[a.text(), path]] : []
      })
      return genres.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)
    }
  }
  return source
}
