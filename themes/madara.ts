// Ported from Keiyoushi's "madara" multisrc theme (Apache License 2.0):
// https://github.com/keiyoushi/extensions-source/tree/main/lib-multisrc/madara
// Both of its kinds: Madara, which lists through admin-ajax.php's madara_load_more, and
// MadaraNoAjax (`ajax: false`), which reads the archive pages. Options are named after the
// Kotlin members a site overrides. Not here: related manga and the view counts sent back to
// the site.

import { aesCbcDecrypt, base64Decode, evpBytesToKey, formBody, hexDecode, javaDateParser, parseRelativeOrAbsolute, queryString, relativeUrl, send, utf8Decode, utf8Encode, type Chapter, type Filter, type HTMLNode, type HTTPRequest, type Manga, type MangaStatus, type MangasPage, type Source, type SourceInfo } from "../sdk"

/** How a site lists a manga's chapters (Kotlin's `ChapterMode`). */
export type ChapterMode = "MangaPage" | "AdminAjax" | "MangaAjax" | "MangaAjaxPaginated" | "MangaAjaxQuery"

export interface MadaraOptions {
  info: SourceInfo
  /** Madara's AJAX listings (true, the default) or MadaraNoAjax's archive pages. */
  ajax?: boolean
  /** Keep the WordPress post ID as the manga's URL, as Mihon does by default. */
  supportsPostId?: boolean
  chapterMode?: ChapterMode
  mangaSubString?: string
  genreDirectory?: string
  /** Leave novels out of the listings. */
  filterNonMangaItems?: boolean
  supportsLatest?: boolean

  archiveSelector?: string
  searchCardSelector?: string
  archiveTitleSelector?: string
  archiveUrlSelector?: string
  mangaDetailsSelectorTitle?: string
  mangaDetailsSelectorAuthor?: string
  mangaDetailsSelectorArtist?: string
  mangaDetailsSelectorStatus?: string
  mangaDetailsSelectorDescription?: string
  mangaDetailsSelectorThumbnail?: string
  mangaDetailsSelectorGenre?: string
  mangaDetailsSelectorTag?: string
  seriesTypeSelector?: string
  altNameSelector?: string
  chapterListSelector?: string
  chapterNameSelector?: string
  chapterUrlSelector?: string
  chapterDateSelector?: string
  pageListParseSelector?: string
  filterGenresSelector?: string
  /** Kotlin's `chapterDateFormat`: a DateTimeFormatter pattern and locale. */
  chapterDateFormat?: { pattern: string; locale?: string }
  /** Instead of `chapterDateFormat`. */
  parseDate?: (text: string) => number | undefined

  // Madara (AJAX)
  pageSize?: number
  ajaxTemplate?: string

  // MadaraNoAjax
  nextPageSelector?: string
  orderQueryParameter?: string
  searchQueryParameter?: string
  popularOrder?: string
  latestOrder?: string
  /** Page N of an archive: /path/page/N/ by default. */
  archiveUrl?: (path: string, page: number, params: [string, string][]) => string
  /** Page N of a search: /page/N/?s=… by default. */
  searchUrl?: (page: number, params: [string, string][]) => string
}

/** A genre as the site links it, kept as filter data and in a manga's sourceData. */
interface GenreRoute {
  name: string
  slug: string
  path: string
}

/** Mihon's memo for a Madara manga, kept as its sourceData (a Mihon backup restores it). */
interface MangaMemo {
  path?: string
  genres?: GenreRoute[]
  id?: string
}

const statuses: [MangaStatus, string[]][] = [
  ["completed", ["completed", "completo", "completado", "concluído", "concluido", "finalizado", "achevé", "terminé", "hoàn thành", "مكتملة", "مكتمل", "已完结", "tamamlandı", "đã hoàn thành", "завершено", "tamamlanan", "complété"]],
  ["ongoing", ["ongoing", "on going", "updating", "продолжается", "em lançamento", "em andamento", "en cours", "ativo", "lançando", "đang tiến hành", "còn nữa", "devam ediyor", "in corso", "in arrivo", "مستمرة", "مستمر", "en curso", "emision", "curso", "en marcha", "publicandose", "publicándose", "en emision", "连载中", "đang làm", "em postagem", "devam eden", "em progresso", "atualizações semanais", "виходить", "đang ra"]],
  ["onHiatus", ["on hold", "hiatus", "pausado", "en espera", "durduruldu", "beklemede", "đang chờ", "متوقف", "en pause", "заморожено", "en attente", "tạm dừng"]],
  ["cancelled", ["canceled", "cancelled", "cancelado", "iptal edildi", "đã hủy", "ملغي", "abandonné", "заброшено", "annulé"]],
]
const toStatus = (text: string): MangaStatus => statuses.find(([, words]) => words.some((w) => text.toLowerCase().includes(w)))?.[0] ?? "unknown"
const isUpdating = (text: string) => /Updating|Atualizando/i.test(text)

/** The image URL in the first lazy-load attribute set, or the largest in a srcset. */
function imageFromElement(img: HTMLNode): string | undefined {
  for (const name of ["data-src", "data-lazy-src", "data-lzl-src", "data-cfsrc", "data-manga-src"]) {
    if (img.hasAttr(name)) return img.absUrl(name)
  }
  if (img.hasAttr("srcset")) {
    const candidates = img.attr("srcset").split(",").map((c) => c.trim().split(/\s+/, 2)).filter((c) => /^https?:\/\/\S+$/.test(c[0]))
    const sized = candidates.flatMap((c) => { const m = /^(\d+(?:\.\d+)?)[wx]$/.exec(c[1] ?? ""); return m ? [[c[0], Number(m[1])] as [string, number]] : [] })
    return sized.sort((a, b) => b[1] - a[1])[0]?.[0] ?? candidates.map((c) => c[0]).sort().pop()
  }
  return img.absUrl("src") || undefined
}

const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
/** "05 Oct 2024" or "October 5, 2024". */
export function parseEnglishDate(text: string): number | undefined {
  const dayFirst = /(\d{1,2})\s+([A-Za-z]{3})[A-Za-z]*\.?,?\s+(\d{4})/.exec(text)
  const monthFirst = /([A-Za-z]{3})[A-Za-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/.exec(text)
  const [day, month, year] = dayFirst ? [dayFirst[1], dayFirst[2], dayFirst[3]] : monthFirst ? [monthFirst[2], monthFirst[1], monthFirst[3]] : []
  const index = months.indexOf((month ?? "").toLowerCase())
  return index < 0 ? undefined : Date.UTC(Number(year), index, Number(day))
}

const orderOptions: [string, string][] = [["Relevance", ""], ["Latest", "latest"], ["A-Z", "alphabet"], ["Rating", "rating"], ["Trending", "trending"], ["Views", "views"], ["New", "new-manga"]]
const statusOptions: [string, string][] = [["Completed", "end"], ["Ongoing", "on-going"], ["Canceled", "canceled"], ["On Hold", "on-hold"]]
const adultOptions: [string, string][] = [["All", ""], ["None", "0"], ["Only", "1"]]
const genreConditionOptions: [string, string][] = [["OR", ""], ["AND", "1"]]
const options = (list: [string, string][]) => list.map(([label, value]) => ({ label, value }))
const xhr = { "X-Requested-With": "XMLHttpRequest" }

export function madara(options_: MadaraOptions): Source {
  const o = options_
  const { info } = o
  const baseUrl = info.baseUrl.replace(/\/$/, "")
  const ajax = o.ajax ?? true
  const supportsPostId = o.supportsPostId ?? true
  const chapterMode = o.chapterMode ?? "MangaPage"
  const subString = o.mangaSubString ?? "manga"
  const genreDirectory = o.genreDirectory ?? "manga-genre"
  const filterNonMangaItems = o.filterNonMangaItems ?? true
  const supportsLatest = o.supportsLatest ?? true
  const pageSize = o.pageSize ?? 25
  const archiveSelector = o.archiveSelector ?? "div.page-item-detail, .manga__item, .c-tabs-item__content"
  const archiveUrlSelector = o.archiveUrlSelector ?? ".post-title a"
  const nextPageSelector = o.nextPageSelector ?? "div.nav-previous, a.nextpostslink, #navigation-ajax"
  const orderParameter = o.orderQueryParameter ?? "m_orderby"
  const searchParameter = o.searchQueryParameter ?? "s"
  const archiveUrl = o.archiveUrl ?? ((path, page, params) => `${baseUrl}${path}${page > 1 ? `page/${page}/` : ""}${params.length ? `?${queryString(params)}` : ""}`)
  const searchUrl = o.searchUrl ?? ((page, params) => `${baseUrl}/${page > 1 ? `page/${page}/` : ""}?${queryString(params)}`)
  const dateFormat = o.chapterDateFormat ?? { pattern: "MMMM d, yyyy", locale: "en" }
  const formatParser = javaDateParser(dateFormat.pattern, dateFormat.locale ?? "en")
  const parseDate = o.parseDate ?? ((text: string) => formatParser(text) ?? (/^en\b/.test(dateFormat.locale ?? "en") ? parseEnglishDate(text) : undefined))

  // MARK: Requests

  async function get(url: string): Promise<{ document: HTMLNode; url: string; status: number }> {
    const response = await send(url)
    return { document: Honya.parseHTML(response.body, response.url), url: response.url, status: response.status }
  }

  async function post(url: string, fields: [string, string][], allowStatus = false): Promise<{ document: HTMLNode; status: number }> {
    const form = formBody(fields)
    const request: HTTPRequest = { url, method: "POST", body: form.body, headers: { ...form.headers, ...xhr } }
    const response = allowStatus ? await Honya.request(request) : await send(request)
    return { document: Honya.parseHTML(response.body, response.url), status: response.status }
  }

  const pathOf = (url: string) => relativeUrl(url).replace(/[?#].*$/, "")
  const sameUrl = (a: string, b: string) => {
    const clean = (url: string) => { try { return decodeURI(url.replace(/\/$/, "")) } catch { return url.replace(/\/$/, "") } }
    return clean(a) === clean(b)
  }
  const absolute = (path: string) => /^https?:\/\//.test(path) ? path : `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`

  // MARK: Manga identity: a post ID (with the path in the memo) or a path

  const memoOf = (manga: Pick<Manga, "sourceData">): MangaMemo => {
    try { return JSON.parse(manga.sourceData ?? "{}") ?? {} } catch { return {} }
  }
  const isPostId = (url: string) => /^\d+$/.test(url)
  const mangaId = (manga: Manga) => isPostId(manga.url) ? manga.url : memoOf(manga).id
  const memoPath = (manga: Manga) => memoOf(manga).path

  function documentMangaId(document: HTMLNode): string | undefined {
    return document.selectFirst("[id^=manga-chapters-holder]")?.attr("data-id")
      || document.selectFirst("input.rating-post-id")?.attr("value")
      || document.selectFirst("a[data-post]")?.attr("data-post")
      || /[?&]p=(\d+)/.exec(document.selectFirst("link[rel=shortlink]")?.attr("href") ?? "")?.[1]
      || undefined
  }

  function mangaUrl(manga: Manga): string {
    const path = memoPath(manga) ?? (isPostId(manga.url) ? undefined : manga.url)
    return path ? absolute(path) : `${baseUrl}/?p=${mangaId(manga) ?? manga.url}`
  }

  /** The manga's page, by its path while that still leads there, else by its post ID. */
  async function detailsDocument(manga: Manga): Promise<{ document: HTMLNode; url: string }> {
    let id = mangaId(manga)
    const path = memoPath(manga) ?? (isPostId(manga.url) ? undefined : manga.url)
    if (path) {
      const requested = absolute(path)
      const response = await Honya.request(requested)
      const ok = response.status >= 200 && response.status < 300
      const same = sameUrl(response.url, requested)
      if (ok && (same || !supportsPostId)) return { document: Honya.parseHTML(response.body, response.url), url: response.url }
      if (!ok && !supportsPostId) throw new Error(`HTTP ${response.status} for ${response.url}`)
      id ??= documentMangaId(Honya.parseHTML(response.body, response.url))
    }
    if (!id) throw new Error("This manga has no Madara post ID; refresh it from the source.")
    return get(`${baseUrl}/?p=${id}`)
  }

  // MARK: Listings

  function genreRoutes(elements: HTMLNode[]): GenreRoute[] {
    return elements.flatMap((element) => {
      const href = element.absUrl("href")
      const name = element.text()
      if (!href || !name) return []
      const path = pathOf(href)
      const slug = path.replace(/\/$/, "").split("/").pop()
      return slug ? [{ name, slug, path }] : []
    })
  }

  function archiveManga(element: HTMLNode, id: string): Manga | undefined {
    const link = element.selectFirst(archiveUrlSelector)
    const href = link?.absUrl("href")
    if (!link || !href) return undefined
    const path = pathOf(href)
    const img = element.selectFirst("img")
    return {
      url: supportsPostId && id ? id : path,
      title: (o.archiveTitleSelector ? element.selectFirst(o.archiveTitleSelector)?.text() : undefined) ?? link.text(),
      thumbnailUrl: img ? imageFromElement(img) : undefined,
      sourceData: JSON.stringify({ path } satisfies MangaMemo),
    }
  }

  function parseArchive(document: HTMLNode): Manga[] {
    return document.select(archiveSelector).flatMap((element) => {
      const id = supportsPostId ? element.attr("data-post-id") || element.selectFirst("[data-post-id]")?.attr("data-post-id") || "" : ""
      if (supportsPostId && !id) return []
      const manga = archiveManga(element, id)
      return manga ? [manga] : []
    })
  }

  // Madara: admin-ajax.php's madara_load_more, sorted or filtered.

  function ajaxBase(page: number): [string, string][] {
    const fields: [string, string][] = [
      ["action", "madara_load_more"], ["page", String(page - 1)], ["template", o.ajaxTemplate ?? "madara-core/content/content-archive"],
      ["vars[paged]", "1"], ["vars[template]", "archive"], ["vars[posts_per_page]", String(pageSize)], ["vars[post_type]", "wp-manga"],
      ["vars[post_status]", "publish"], ["vars[manga_archives_item_layout]", "big_thumbnail"],
    ]
    if (filterNonMangaItems) fields.push(["vars[meta_query][0][key]", "_wp_manga_chapter_type"], ["vars[meta_query][0][value]", "manga"])
    return fields
  }

  const sortBy = (key: string): [string, string][] => [["vars[orderby]", "meta_value_num"], ["vars[meta_key]", key], ["vars[order]", "DESC"]]

  async function ajaxList(page: number, fields: [string, string][]): Promise<MangasPage> {
    const { document } = await post(`${baseUrl}/wp-admin/admin-ajax.php`, [...ajaxBase(page), ...fields])
    const mangas = parseArchive(document)
    return { mangas, hasNextPage: mangas.length === pageSize }
  }

  function ajaxSearchFields(query: string, filters: Filter[]): [string, string][] {
    const fields: [string, string][] = []
    if (query.trim()) fields.push(["vars[s]", query])
    let meta = filterNonMangaItems ? 1 : 0
    let taxonomy = 0
    const genres = filters.flatMap((f) => f.id === "genres" && f.type === "checkboxes" ? f.checked : [])
    for (const filter of filters) {
      if (filter.type === "text" && filter.value.trim()) {
        const taxonomies: Record<string, string> = { author: "wp-manga-author", artist: "wp-manga-artist", year: "wp-manga-release" }
        if (!taxonomies[filter.id]) continue
        fields.push([`vars[tax_query][${taxonomy}][taxonomy]`, taxonomies[filter.id]], [`vars[tax_query][${taxonomy}][field]`, "name"], [`vars[tax_query][${taxonomy}][terms]`, filter.value])
        taxonomy++
      } else if (filter.id === "status" && filter.type === "checkboxes" && filter.checked.length) {
        fields.push([`vars[meta_query][${meta}][key]`, "_wp_manga_status"], [`vars[meta_query][${meta}][compare]`, "IN"])
        filter.checked.forEach((state, i) => fields.push([`vars[meta_query][${meta}][value][${i}]`, state]))
        meta++
      } else if (filter.id === "sort" && filter.type === "select") {
        switch (filter.options[filter.selected]?.value) {
          case "latest": fields.push(...sortBy("_latest_update")); break
          case "alphabet": fields.push(["vars[orderby]", "post_title"], ["vars[order]", "ASC"]); break
          case "rating":
            fields.push(
              ["vars[meta_query][query_average_reviews][key]", "_manga_avarage_reviews"], ["vars[meta_query][query_average_reviews][compare]", "EXISTS"],
              ["vars[meta_query][query_total_reviews][key]", "_manga_total_votes"], ["vars[meta_query][query_total_reviews][compare]", "EXISTS"],
              ["vars[orderby][query_average_reviews]", "DESC"], ["vars[orderby][query_total_reviews]", "DESC"],
            )
            break
          case "trending": fields.push(...sortBy("_wp_manga_week_views_value")); break
          case "views": fields.push(...sortBy("_wp_manga_views")); break
          case "new-manga": fields.push(["vars[orderby]", "date"], ["vars[order]", "DESC"]); break
        }
      } else if (filter.id === "adult" && filter.type === "select" && filter.selected !== 0) {
        fields.push([`vars[meta_query][${meta}][key]`, "manga_adult_content"], [`vars[meta_query][${meta}][compare]`, filter.selected === 1 ? "not exists" : "exists"])
        meta++
      } else if (filter.id === "genreCondition" && filter.type === "select" && filter.selected === 1 && genres.length) {
        fields.push([`vars[tax_query][${taxonomy}][operation]`, "AND"])
      } else if (filter.id === "genres" && genres.length) {
        fields.push([`vars[tax_query][${taxonomy}][taxonomy]`, "wp-manga-genre"], [`vars[tax_query][${taxonomy}][field]`, "slug"])
        genres.forEach((slug, i) => fields.push([`vars[tax_query][${taxonomy}][terms][${i}]`, slug]))
      }
    }
    return fields
  }

  // MadaraNoAjax: the archive pages, and the site's search.

  async function archivePage(page: number, order: string, path = `/${subString}/`, query = ""): Promise<MangasPage> {
    const params: [string, string][] = []
    if (order) params.push([orderParameter, order])
    if (query) params.push([searchParameter, query])
    const { document } = await get(archiveUrl(path, page, params))
    return { mangas: parseArchive(document), hasNextPage: document.selectFirst(nextPageSelector) != null }
  }

  async function htmlSearch(page: number, query: string): Promise<MangasPage> {
    // With post IDs, the search's later pages can't be told apart from the RSS feed's.
    if (page > 1 && supportsPostId) return { mangas: [], hasNextPage: false }
    const { document } = await get(searchUrl(page, [[searchParameter, query], ["post_type", "wp-manga"]]))
    const hasNextPage = !supportsPostId && document.selectFirst(nextPageSelector) != null
    const archived = parseArchive(document)
    if (archived.length) return { mangas: archived, hasNextPage }

    const cards = document.select(o.searchCardSelector ?? ".c-tabs-item__content").flatMap((element) => {
      const link = element.selectFirst(archiveUrlSelector)
      const href = link?.absUrl("href")
      if (!link || !href) return []
      const img = element.selectFirst("img")
      const title = (o.archiveTitleSelector ? element.selectFirst(o.archiveTitleSelector)?.text() : undefined) ?? link.text()
      return [{ title, path: pathOf(href), thumbnailUrl: img ? imageFromElement(img) : undefined }]
    })
    const card = (c: typeof cards[number], id: string): Manga => ({ url: id, title: c.title, thumbnailUrl: c.thumbnailUrl, sourceData: JSON.stringify({ path: c.path } satisfies MangaMemo) })
    if (!supportsPostId) return { mangas: cards.map((c) => card(c, c.path)), hasNextPage }

    const ids = await rssIds(query, cards.map((c) => c.path))
    const mangas: Manga[] = []
    for (const c of cards) {
      const id = ids.get(c.path) ?? await resolvePostId(absolute(c.path))
      if (id) mangas.push(card(c, id))
    }
    return { mangas, hasNextPage: false }
  }

  /** Post IDs for search results, from the search's RSS feed: path → ID. */
  async function rssIds(query: string, needed: string[]): Promise<Map<string, string>> {
    const ids = new Map<string, string>()
    for (let page = 1; page <= 20; page++) {
      const response = await Honya.request(`${baseUrl}/feed?${queryString([["post_type", "wp-manga"], ["s", query], ["paged", page]])}`)
      if (response.status < 200 || response.status > 299) break
      const items = [...response.body.matchAll(/<item>([\s\S]*?)<\/item>/g)]
      for (const [, item] of items) {
        const link = /<link>\s*(?:<!\[CDATA\[)?([^<\]]+)/.exec(item)?.[1]?.trim()
        const id = /<guid[^>]*>[^<]*[?&](?:amp;)?p=(\d+)/.exec(item)?.[1]
        if (link && id) ids.set(pathOf(link), id)
      }
      if (items.length === 0 || needed.every((path) => ids.has(path))) break
    }
    return ids
  }

  async function resolvePostId(url: string): Promise<string | undefined> {
    const head = await Honya.request({ url, method: "HEAD" })
    const shortlink = /<[^>]*[?&]p=(\d+)[^>]*>\s*;\s*rel="?shortlink"?/i.exec(head.headers["link"] ?? "")?.[1]
    if (shortlink) return shortlink
    const response = await Honya.request(url)
    return response.status < 300 ? documentMangaId(Honya.parseHTML(response.body, response.url)) : undefined
  }

  // MARK: Details and chapters

  function details(document: HTMLNode, pageUrl: string, id: string | undefined): Partial<Manga> {
    const names = (selector: string) => document.select(selector).map((e) => e.text()).filter((t) => !isUpdating(t)).join(", ") || undefined
    const descriptionElement = document.selectFirst(o.mangaDetailsSelectorDescription ?? "div.description-summary div.summary__content, div.summary_content div.post-content_item > h5 + div, div.summary_content div.manga-excerpt")
    const paragraphs = descriptionElement?.select("p") ?? []
    let description = paragraphs.length ? paragraphs.map((p) => p.text()).join("\n\n") : descriptionElement?.text()
    const alternative = document.selectFirst(o.altNameSelector ?? ".post-content_item:contains(Alt) .summary-content")?.ownText()
    if (alternative && !isUpdating(alternative)) description = [description, `Alternative Names: ${alternative}`].filter(Boolean).join("\n\n")
    const thumbnail = document.selectFirst(o.mangaDetailsSelectorThumbnail ?? "div.summary_image img")
    const statusElements = document.select(o.mangaDetailsSelectorStatus ?? "div.summary-content, div.summary-heading:contains(Status) + div")
    const routes = genreRoutes(document.select(o.mangaDetailsSelectorGenre ?? "div.genres-content a"))
    const genres = [
      ...routes.map((g) => g.name),
      ...document.select(o.mangaDetailsSelectorTag ?? "div.tags-content a").map((a) => a.text()),
      ...[document.selectFirst(o.seriesTypeSelector ?? ".post-content_item:contains(Type) .summary-content")?.text()].filter((t): t is string => !!t),
    ]
    const seen = new Set<string>()
    const memo: MangaMemo = { path: pathOf(pageUrl) }
    if (routes.length) memo.genres = routes
    if (id) memo.id = id
    return {
      title: document.selectFirst(o.mangaDetailsSelectorTitle ?? "div.post-title h3, div.post-title h1, #manga-title > h1")?.ownText() || undefined,
      author: names(o.mangaDetailsSelectorAuthor ?? "div.author-content > a, div.manga-authors > a"),
      artist: names(o.mangaDetailsSelectorArtist ?? "div.artist-content > a"),
      description,
      thumbnailUrl: thumbnail ? imageFromElement(thumbnail) : undefined,
      status: statusElements.length ? toStatus(statusElements[statusElements.length - 1].text()) : "unknown",
      genres: genres.filter((g) => !seen.has(g.toLowerCase()) && seen.add(g.toLowerCase())),
      sourceData: JSON.stringify(memo),
    }
  }

  function parseChapterList(document: HTMLNode, mangaPath: string): Chapter[] {
    return document.select(o.chapterListSelector ?? "li.wp-manga-chapter").flatMap((element): Chapter[] => {
      const link = element.selectFirst(o.chapterUrlSelector ?? "a")
      const href = link?.absUrl("href")
      const slug = href ? pathOf(href).replace(/\/$/, "").split("/").pop() : undefined
      if (!link || !slug) return []
      const date = element.selectFirst("img:not(.thumb)")?.attr("alt") || element.selectFirst("span a")?.attr("title") || element.selectFirst(o.chapterDateSelector ?? "span.chapter-release-date")?.text()
      return [{
        url: slug,
        name: (o.chapterNameSelector ? element.selectFirst(o.chapterNameSelector)?.text() : undefined) ?? link.text(),
        dateUpload: parseRelativeOrAbsolute(date, parseDate),
        sourceData: JSON.stringify({ mangaPath }),
      }]
    })
  }

  async function fetchChapters(mangaPath: string, id: string, mangaPage?: HTMLNode): Promise<Chapter[]> {
    const ajaxUrl = `${baseUrl}${mangaPath.replace(/\/$/, "")}/ajax/chapters/`
    switch (chapterMode) {
      case "MangaPage":
        if (!mangaPage) throw new Error("The manga page is needed for its chapters.")
        return parseChapterList(mangaPage, mangaPath)
      case "AdminAjax":
        return parseChapterList((await post(`${baseUrl}/wp-admin/admin-ajax.php`, [["action", "manga_get_chapters"], ["manga", id]])).document, mangaPath)
      case "MangaAjax":
        return parseChapterList((await post(ajaxUrl, [])).document, mangaPath)
      case "MangaAjaxPaginated": {
        const chapters: Chapter[] = []
        let last: string | undefined
        for (let page = 1; page < 500; page++) {
          const { document, status } = await post(`${ajaxUrl}?t=${page}`, [], true)
          if (status === 404) break
          if (status < 200 || status > 299) throw new Error(`HTTP ${status} for ${ajaxUrl}`)
          const list = parseChapterList(document, mangaPath)
          if (list.length === 0 || list[list.length - 1].url === last) break
          chapters.push(...list)
          last = list[list.length - 1].url
        }
        return chapters
      }
      case "MangaAjaxQuery": {
        const slug = mangaPath.replace(/\/$/, "").split("/").pop() ?? ""
        return parseChapterList((await post(`${baseUrl}/index.php`, [["manga-core", slug], ["manga_ajax", "1"], ["maction", "get_chapters"]])).document, mangaPath)
      }
    }
  }

  /**
   * The page list WP Manga Chapter Protector encrypts: CryptoJS's AES with a passphrase (the
   * nonce in the script) and a salt.
   */
  function protectedPages(protector: HTMLNode): string[] {
    const src = protector.attr("src")
    const script = src.startsWith("data:text/javascript;base64,") ? utf8Decode(base64Decode(src.slice(src.indexOf(",") + 1))) : protector.html()
    const between = (text: string, start: string, end: string) => {
      const from = text.indexOf(start)
      const rest = from < 0 ? text : text.slice(from + start.length)
      const to = rest.indexOf(end)
      return to < 0 ? rest : rest.slice(0, to)
    }
    const password = between(script, "wpmangaprotectornonce='", "';")
    const data = JSON.parse(between(script, "chapter_data='", "';").replaceAll("\\/", "/")) as { ct: string; s: string }
    const { key, iv } = evpBytesToKey(utf8Encode(password), hexDecode(data.s))
    const plain = utf8Decode(aesCbcDecrypt(base64Decode(data.ct), key, iv))
    // A JSON string of a JSON array of image URLs.
    const images = JSON.parse(JSON.parse(plain)) as unknown
    return Array.isArray(images) ? images.filter((url): url is string => typeof url === "string") : []
  }

  // MARK: Filters

  function filterList(data: unknown): Filter[] {
    const genres = Array.isArray(data) ? (data as GenreRoute[]).filter((g) => g?.name && g?.slug) : []
    const sort: Filter = { type: "select", id: "sort", name: "Order by", options: options(orderOptions), selected: 0, listings: ajax ? { popular: "views", latest: supportsLatest ? "latest" : undefined } : listings() }
    if (!ajax) {
      const list: Filter[] = [sort]
      if (genres.length) list.push({ type: "select", id: "genre", name: "Genre", options: [{ label: "All", value: "" }, ...genres.map((g) => ({ label: g.name, value: g.path }))], selected: 0 })
      return list
    }
    const list: Filter[] = [
      { type: "text", id: "author", name: "Author", value: "" },
      { type: "text", id: "artist", name: "Artist", value: "" },
      { type: "text", id: "year", name: "Year of Released", value: "" },
      { type: "checkboxes", id: "status", name: "Status", options: options(statusOptions), checked: [] },
      sort,
      { type: "select", id: "adult", name: "Adult content", options: options(adultOptions), selected: 0 },
    ]
    if (genres.length) {
      list.push(
        { type: "separator", id: "genresSeparator" },
        { type: "header", id: "genresHeader", name: "Genres may not work for all sources" },
        { type: "select", id: "genreCondition", name: "Genre condition", options: options(genreConditionOptions), selected: 0 },
        { type: "checkboxes", id: "genres", name: "Genres", options: genres.map((g) => ({ label: g.name, value: g.slug })), checked: [] },
      )
    }
    return list
  }

  /** Which of the order options give MadaraNoAjax's Popular and Latest. */
  function listings() {
    const has = (value: string) => orderOptions.some(([, v]) => v === value) ? value : undefined
    return { popular: has(o.popularOrder ?? "views"), latest: supportsLatest ? has(o.latestOrder ?? "latest") : undefined }
  }

  return {
    info: { ...info, supportsLatest },

    getPopularManga(page) {
      return ajax ? ajaxList(page, sortBy("_wp_manga_views")) : archivePage(page, o.popularOrder ?? "views")
    },

    getLatestUpdates(page) {
      return ajax ? ajaxList(page, sortBy("_latest_update")) : archivePage(page, o.latestOrder ?? "latest")
    },

    searchManga(page, query, filters) {
      if (ajax) return ajaxList(page, ajaxSearchFields(query, filters))
      const sort = filters.find((f) => f.id === "sort")
      const order = sort?.type === "select" ? sort.options[sort.selected]?.value ?? "" : ""
      const genre = filters.find((f) => f.id === "genre")
      const genrePath = genre?.type === "select" ? genre.options[genre.selected]?.value : undefined
      if (genrePath) return archivePage(page, order, genrePath, query.trim())
      return query.trim() ? htmlSearch(page, query) : archivePage(page, order)
    },

    async getMangaDetails(manga) {
      const { document, url } = await detailsDocument(manga)
      const id = supportsPostId ? mangaId(manga) ?? documentMangaId(document) : undefined
      return details(document, url, id)
    },

    async getChapterList(manga) {
      const id = supportsPostId ? mangaId(manga) : ""
      const path = memoPath(manga)
      if (chapterMode !== "MangaPage" && id !== undefined && path) return fetchChapters(path, id)
      const { document, url } = await detailsDocument(manga)
      const resolvedId = id ?? documentMangaId(document)
      if (resolvedId === undefined) throw new Error("This manga has no Madara post ID; refresh it from the source.")
      return fetchChapters(pathOf(url), resolvedId, document)
    },

    async getPageList(chapter) {
      // Chapters are slugs under the manga's path (kept in sourceData); older ones are whole URLs.
      let url: string
      if (/^https?:\/\//.test(chapter.url)) {
        url = chapter.url
      } else {
        let mangaPath: string | undefined
        try { mangaPath = JSON.parse(chapter.sourceData ?? "{}").mangaPath } catch { /* none */ }
        if (!mangaPath || chapter.url.includes("/")) throw new Error("Refresh the chapter list.")
        url = `${baseUrl}${mangaPath.replace(/\/$/, "")}/${chapter.url}/`
      }
      let { document } = await get(url)
      if (document.selectFirst("#single-pager") != null) {
        document = (await get(`${url}${url.includes("?") ? "&" : "?"}style=list`)).document
      }
      const protector = document.selectFirst("#chapter-protector-data")
      if (protector) return protectedPages(protector).map((image) => ({ url: image }))
      return document.select(o.pageListParseSelector ?? "div.page-break, li.blocks-gallery-item, .reading-content .text-left:not(:has(.blocks-gallery-item))").flatMap((element) => {
        const img = element.selectFirst("img")
        const src = img ? imageFromElement(img) : undefined
        return src ? [{ url: src }] : []
      })
    },

    getFilterList(data) {
      return filterList(data)
    },

    async fetchFilterData() {
      const { document } = await get(`${baseUrl}/${subString}/`)
      const links = document.select(o.filterGenresSelector ?? "div.genres").flatMap((e) => e.select(`a[href*='/${genreDirectory}/']`))
      const seen = new Set<string>()
      // Without the "(27)" counts some sites put in the link.
      return genreRoutes(links).filter((g) => !seen.has(g.slug) && seen.add(g.slug)).map((g) => ({ ...g, name: g.name.replace(/\s*\(\d+\)$/, "") }))
    },

    getMangaUrl(manga) {
      return mangaUrl(manga)
    },
  }
}
