// Ported from Keiyoushi's "zeistmanga" multisrc theme (Apache License 2.0):
// https://github.com/keiyoushi/extensions-source/tree/main/lib-multisrc/zeistmanga
// Blogger sites on the ZeistManga template: listings and chapters come from Blogger's JSON
// feeds, details and pages from the site's HTML. Options are named after the Kotlin members a
// site overrides. Not here: related manga.

import { fetchJSON, fetchPage, javaDateParser, mapLimit, queryString, relativeUrl, type Chapter, type Filter, type HTMLNode, type Manga, type MangaStatus, type MangasPage, type Source, type SourceInfo } from "../sdk"

export interface ZeistMangaOptions {
  info: SourceInfo
  supportsLatest?: boolean
  /** The Blogger label series are posted under. */
  mangaCategory?: string
  /** The label chapters are posted under. */
  chapterCategory?: string
  excludedCategories?: string[]
  popularMangaSelector?: string
  popularMangaSelectorTitle?: string
  popularMangaSelectorUrl?: string
  mangaDetailsSelector?: string
  mangaDetailsSelectorThumbnail?: string
  mangaDetailsSelectorDescription?: string
  mangaDetailsSelectorGenres?: string
  mangaDetailsSelectorAuthor?: string
  mangaDetailsSelectorArtist?: string
  mangaDetailsSelectorAltName?: string
  mangaDetailsSelectorStatus?: string
  mangaDetailsSelectorInfo?: string
  mangaDetailsSelectorInfoTitle?: string
  mangaDetailsSelectorInfoDescription?: string
  scriptSelector?: string
  pageListSelector?: string
  preferChapterUpdatedDate?: boolean
  supportsChapterFeed?: boolean
  useNewChapterFeed?: boolean
  useOldChapterFeed?: boolean
  hasFilters?: boolean
  hasStatusFilter?: boolean
  hasTypeFilter?: boolean
  hasLanguageFilter?: boolean
  hasGenreFilter?: boolean
  /** Kotlin's `dateFormat` for chapter dates; ISO dates work regardless. */
  chapterDateFormat?: { pattern: string; locale?: string }
}

interface Entry {
  title?: { $t: string }
  published?: { $t: string }
  updated?: { $t: string }
  category?: { term: string }[]
  link?: { rel: string; href: string }[]
  content?: { $t: string }
  "media$thumbnail"?: { url: string }
}
interface Feed {
  feed?: {
    "openSearch$totalResults"?: { $t: string }
    "openSearch$itemsPerPage"?: { $t: string }
    entry?: Entry[]
  }
}
/** Mihon's memo for a ZeistManga series: where its chapters are listed. */
interface FeedUrl { url: string; old: boolean; new: boolean; category: string }

const maxMangaResults = 20
const maxChapterResults = 150
const chapterChunk = 50

const statusWords: [MangaStatus, string[]][] = [
  ["ongoing", ["ongoing", "en curso", "en emisión", "em lançamento", "activo", "ativo", "lançando", "مستمر", "مستمرة"]],
  ["completed", ["completed", "completo", "finalizado", "مكتمل", "مكتملة"]],
  ["onHiatus", ["hiatus", "pausado"]],
  ["cancelled", ["cancelled", "dropped", "dropado", "abandonado", "cancelado"]],
]
const parseStatus = (text: string): MangaStatus => statusWords.find(([, words]) => words.includes(text.toLowerCase().trim()))?.[0] ?? "unknown"

const statusOptions: [string, string][] = [["All", ""], ["Ongoing", "Ongoing"], ["Completed", "Completed"], ["Dropped", "Dropped"], ["Upcoming", "Upcoming"], ["Hiatus", "Hiatus"], ["Cancelled", "Cancelled"]]
const typeOptions: [string, string][] = [["All", ""], ["Manga", "Manga"], ["Manhua", "Manhua"], ["Manhwa", "Manhwa"], ["Novel", "Novel"], ["Web Novel (JP)", "Web Novel (JP)"], ["Web Novel (KR)", "Web Novel (KR)"], ["Web Novel (CN)", "Web Novel (CN)"], ["Doujinshi", "Doujinshi"]]
const languageOptions: [string, string][] = [["All", ""], ["Indonesian", "Indonesian"], ["English", "English"]]
const genres = [
  "Action", "Adventure", "Comedy", "Crime", "Drama", "Ecchi", "Fantasy", "Harem", "Historical", "Horror", "Isekai", "Josei",
  "Magic", "Martial Arts", "Medical", "Military", "Music", "Mystery", "One Shot", "Police", "Psychological", "Reincarnation", "Revenge", "Romance",
  "School Life", "Sci-Fi", "Seinen", "Shounen", "Slice of Life", "Sports", "Supernatural", "Survival", "Thriller", "Time Travel", "Tragedy", "Vampire",
]
const options = (list: [string, string][]) => list.map(([label, value]) => ({ label, value }))

export function zeistmanga(o: ZeistMangaOptions): Source {
  const { info } = o
  const baseUrl = info.baseUrl.replace(/\/$/, "")
  const supportsLatest = o.supportsLatest ?? true
  const mangaCategory = o.mangaCategory ?? "Series"
  const chapterCategory = o.chapterCategory ?? "Chapter"
  const excluded = o.excludedCategories ?? ["Anime", "Novel", "Novela"]
  const supportsChapterFeed = o.supportsChapterFeed ?? true
  const useNewChapterFeed = o.useNewChapterFeed ?? false
  const useOldChapterFeed = o.useOldChapterFeed ?? false
  const dateParser = javaDateParser(o.chapterDateFormat?.pattern ?? "yyyy-MM-dd", o.chapterDateFormat?.locale ?? "en")
  const s = {
    popularMangaSelector: o.popularMangaSelector ?? "div.PopularPosts div.grid > figure",
    popularMangaSelectorTitle: o.popularMangaSelectorTitle ?? "figcaption > a",
    popularMangaSelectorUrl: o.popularMangaSelectorUrl ?? "figcaption > a",
    details: o.mangaDetailsSelector ?? ".grid.gtc-235fr",
    thumbnail: o.mangaDetailsSelectorThumbnail ?? "img",
    description: o.mangaDetailsSelectorDescription ?? "#synopsis",
    genres: o.mangaDetailsSelectorGenres ?? "div.mt-15 > a[rel=tag]",
    author: o.mangaDetailsSelectorAuthor ?? "span#author",
    artist: o.mangaDetailsSelectorArtist ?? "span#artist",
    altName: o.mangaDetailsSelectorAltName ?? "header > p",
    status: o.mangaDetailsSelectorStatus ?? "span[data-status]",
    info: o.mangaDetailsSelectorInfo ?? ".y6x11p",
    infoTitle: o.mangaDetailsSelectorInfoTitle ?? "strong",
    infoDescription: o.mangaDetailsSelectorInfoDescription ?? "span.dt",
    script: o.scriptSelector ?? "#clwd > script",
    pages: o.pageListSelector ?? "div.check-box div.separator",
  }

  /** `<base>/feeds/posts/default/-/<label>[/<more labels>]?alt=json`, and its query. */
  const feedUrl = (labels: string[], params: [string, string | number][] = []) =>
    `${baseUrl}/feeds/posts/default/-/${labels.map(encodeURIComponent).join("/")}?${queryString([["alt", "json"], ...params])}`

  const alternate = (entry: Entry) => entry.link?.find((l) => l.rel === "alternate")?.href ?? ""
  const withoutBase = (url: string) => url.startsWith(baseUrl) ? url.slice(baseUrl.length) : relativeUrl(url)

  function thumbnail(entry: Entry): string | undefined {
    const url = entry["media$thumbnail"]?.url
    if (url) return url.replace(/\/s.+?-c\//, "/w600/").replace(/=s(?!.*=s).+?-c$/, "=w600")
    const html = entry.content?.$t
    return html ? Honya.parseHTML(html).selectFirst("img")?.attr("src") || undefined : undefined
  }

  function feedPage(feed: Feed): MangasPage {
    const mangas = (feed.feed?.entry ?? [])
      .filter((e) => e.category?.some((c) => c.term === mangaCategory) && !e.category.some((c) => excluded.includes(c.term)))
      .flatMap((e): Manga[] => e.title ? [{ url: withoutBase(alternate(e)), title: e.title.$t, thumbnailUrl: thumbnail(e) }] : [])
    if (mangas.length === maxMangaResults + 1) return { mangas: mangas.slice(0, -1), hasNextPage: true }
    return { mangas, hasNextPage: false }
  }

  const startIndex = (page: number) => maxMangaResults * (page - 1) + 1

  async function latest(page: number): Promise<MangasPage> {
    return feedPage(await fetchJSON<Feed>(feedUrl([mangaCategory], [["orderby", "published"], ["max-results", maxMangaResults + 1], ["start-index", startIndex(page)]])))
  }

  function parseDate(text: string | undefined): number | undefined {
    if (!text) return undefined
    const iso = Date.parse(text)
    if (!Number.isNaN(iso) && text.includes("T")) return iso
    return dateParser(text) ?? (Number.isNaN(iso) ? undefined : iso)
  }

  // MARK: Chapter feeds

  const isValid = (memo: FeedUrl | undefined): memo is FeedUrl =>
    !!memo?.url && memo.old === useOldChapterFeed && memo.new === useNewChapterFeed && memo.category === chapterCategory

  function chapterFeedUrl(document: HTMLNode, title: string): string {
    if (useNewChapterFeed) return newChapterFeedUrl(document)
    if (useOldChapterFeed) return oldChapterFeedUrl(document)
    let feed: string
    try {
      const script = document.selectFirst(s.script)
      if (!script) {
        try { return oldChapterFeedUrl(document) } catch { return newChapterFeedUrl(document) }
      }
      const found = /clwd\.run\(["'](.*?)["']\)/.exec(script.html())?.[1]
      if (!found) throw new Error("Failed to find chapter feed")
      feed = found
    } catch {
      feed = title
    }
    return feedUrl([chapterCategory, ...feed.split("/").filter(Boolean)])
  }

  function oldChapterFeedUrl(document: HTMLNode): string {
    const src = document.selectFirst("#myUL > script")?.attr("src")
    const feed = /([^']+)\?/.exec(src ?? "")?.[1]
    if (!feed) throw new Error("Failed to find chapter feed")
    return `${baseUrl}${feed}?alt=json`
  }

  function newChapterFeedUrl(document: HTMLNode): string {
    let script = document.selectFirst(s.script)
    let pattern = /clwd\.run\(["'](.*?)["']\)/
    if (!script) {
      script = document.selectFirst("#latest > script")
      pattern = /label\s*=\s*'([^']+)'/
    }
    const feed = script ? pattern.exec(script.html())?.[1] : undefined
    if (!feed) throw new Error("Failed to find chapter feed")
    return feedUrl([feed], [["start-index", 1], ["max-results", 999999]])
  }

  async function chapters(url: string): Promise<Chapter[]> {
    const page = (start: number, max: number) => {
      const withoutPaging = url.replace(/([?&])(start-index|max-results)=[^&]*&?/g, "$1").replace(/[?&]$/, "")
      return fetchJSON<Feed>(`${withoutPaging}${withoutPaging.includes("?") ? "&" : "?"}start-index=${start}&max-results=${max}`)
    }
    const first = await page(1, maxChapterResults)
    if (!first.feed?.entry) throw new Error("Failed to parse from chapter API")
    const total = Number(first.feed["openSearch$totalResults"]?.$t) || maxChapterResults
    const perPage = Number(first.feed["openSearch$itemsPerPage"]?.$t) || chapterChunk
    const starts: number[] = []
    for (let start = first.feed.entry.length; start < total; start += perPage) starts.push(start + 1)
    const rest = await mapLimit(starts, 4, async (start) => (await page(start, perPage)).feed?.entry ?? [])
    return [...first.feed.entry, ...rest.flat()]
      .filter((e) => e.category?.some((c) => c.term === chapterCategory))
      .map((e): Chapter => {
        const updated = e.updated?.$t.trim(), published = e.published?.$t.trim()
        return { url: withoutBase(alternate(e)), name: e.title?.$t ?? "", dateUpload: parseDate(o.preferChapterUpdatedDate ? updated ?? published : published ?? updated) }
      })
  }

  // MARK: Details

  function details(document: HTMLNode): Partial<Manga> {
    const profile = document.selectFirst(s.details)
    if (!profile) throw new Error("Couldn't find the series details on its page.")
    let description = profile.select(s.description).map((e) => e.text()).join(" ")
    const alternative = profile.selectFirst(s.altName)?.text()
    if (alternative?.trim()) description += `\n\nAlternative names: ${alternative}`
    let author = profile.selectFirst(s.author)?.text()
    let artist = profile.selectFirst(s.artist)?.text()
    let status = parseStatus(profile.selectFirst(s.status)?.text() ?? "")
    for (const element of profile.select(s.info)) {
      const title = element.ownText().trim() || element.selectFirst(s.infoTitle)?.text().trim() || ""
      const text = element.select(s.infoDescription).map((e) => e.text()).join(" ").trim()
      if (status === "unknown" && ["Status", "Estado", "الحالة"].some((w) => title.includes(w))) status = parseStatus(text)
      else if (author === undefined && ["Author", "Autor", "Mangaka", "الكاتب", "Yazar"].some((w) => title.includes(w))) author = text
      else if (artist === undefined && ["Artist", "Artista", "الرسام", "Çizer"].some((w) => title.includes(w))) artist = text
    }
    return {
      thumbnailUrl: profile.selectFirst(s.thumbnail)?.absUrl("src") || undefined,
      description: description.trim() || undefined,
      genres: profile.select(s.genres).map((g) => g.text()),
      author,
      artist,
      status,
    }
  }

  return {
    info: { ...info, supportsLatest },

    async getPopularManga(page) {
      if (!supportsLatest) return latest(page)
      const { document } = await fetchPage(baseUrl)
      const mangas = document.select(s.popularMangaSelector).flatMap((element): Manga[] => {
        const title = element.selectFirst(s.popularMangaSelectorTitle)?.text()
        const href = element.selectFirst(s.popularMangaSelectorUrl)?.absUrl("href")
        if (!title || !href) return []
        return [{ url: relativeUrl(href), title, thumbnailUrl: element.selectFirst("img")?.absUrl("src") || undefined }]
      })
      return { mangas, hasNextPage: false }
    },

    getLatestUpdates: latest,

    async searchManga(page, query, filters) {
      if (query.trim()) {
        const url = feedUrl([mangaCategory], [["max-results", maxMangaResults + 1], ["start-index", startIndex(page)]])
        return feedPage(await fetchJSON<Feed>(`${url}&q=label:${mangaCategory}+${encodeURIComponent(query)}`))
      }
      const labels = [mangaCategory]
      for (const filter of filters) {
        if (filter.type === "select" && ["status", "type", "language"].includes(filter.id)) labels.push(filter.options[filter.selected]?.value ?? "")
        if (filter.type === "checkboxes" && filter.id === "genres") labels.push(...filter.checked)
      }
      return feedPage(await fetchJSON<Feed>(feedUrl(labels)))
    },

    async getMangaDetails(manga) {
      const { document } = await fetchPage(baseUrl + manga.url)
      const result = details(document)
      // Where the chapters are listed, kept as Mihon's memo is.
      try {
        const url = chapterFeedUrl(document, manga.title)
        result.sourceData = JSON.stringify({ feedUrl: { url, old: useOldChapterFeed, new: useNewChapterFeed, category: chapterCategory } satisfies FeedUrl })
      } catch { /* found again with the chapters */ }
      return result
    },

    async getChapterList(manga) {
      let memo: { feedUrl?: FeedUrl } = {}
      try { memo = JSON.parse(manga.sourceData ?? "{}") ?? {} } catch { /* none */ }
      if (supportsChapterFeed && isValid(memo.feedUrl)) return chapters(memo.feedUrl.url)
      const { document } = await fetchPage(baseUrl + manga.url)
      return chapters(chapterFeedUrl(document, manga.title))
    },

    async getPageList(chapter) {
      const { document } = await fetchPage(baseUrl + chapter.url)
      return document.select(s.pages).flatMap((e) => e.select("img[src]")).map((img) => ({ url: img.absUrl("src") }))
    },

    getFilterList(): Filter[] {
      if (!o.hasFilters) return []
      const list: Filter[] = [
        { type: "header", id: "warning", name: "Filters are ignored when searching by text" },
        { type: "separator", id: "separator" },
      ]
      if (o.hasStatusFilter ?? true) list.push({ type: "select", id: "status", name: "Status", options: options(statusOptions), selected: 0 })
      if (o.hasTypeFilter ?? true) list.push({ type: "select", id: "type", name: "Type", options: options(typeOptions), selected: 0 })
      if (o.hasLanguageFilter ?? true) list.push({ type: "select", id: "language", name: "Language", options: options(languageOptions), selected: 0 })
      if (o.hasGenreFilter ?? true) list.push({ type: "checkboxes", id: "genres", name: "Genre", options: genres.map((g) => ({ label: g, value: g })), checked: [] })
      return list
    },
  }
}
