// Ported from Keiyoushi's "madara" multisrc theme (Apache License 2.0):
// https://github.com/keiyoushi/extensions-source/tree/main/lib-multisrc/madara
// Only what Madara sites without post IDs and without the AJAX chapter list need (MadaraNoAjax
// with chapters on the manga page), which is what Manhwa18.cc uses. Not here: post-ID URLs,
// the AJAX chapter modes, the chapter protector and the genre filter fetched from the site.

import { fetchPage, queryString, relativeUrl, type Chapter, type HTMLNode, type Manga, type MangaStatus, type MangasPage, type Source, type SourceInfo } from "../sdk"

export interface MadaraOptions {
  info: SourceInfo
  mangaSubString?: string
  archiveSelector?: string
  archiveUrlSelector?: string
  nextPageSelector?: string
  orderQueryParameter?: string
  searchQueryParameter?: string
  popularOrder?: string
  latestOrder?: string
  /** Page N of an archive or search: /path/page/N/ by default. */
  archiveUrl?: (path: string, page: number, params: [string, string][]) => string
  searchUrl?: (page: number, params: [string, string][]) => string
  mangaDetailsSelectorDescription?: string
  chapterListSelector?: string
  chapterDateSelector?: string
  pageListParseSelector?: string
  /** "05 Oct 2024" style dates by default, else Madara's "October 5, 2024". */
  parseDate?: (text: string) => number | undefined
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
  return img.absUrl("src")
}

/** "today", "3 days ago", or a date. */
function relativeOrAbsolute(text: string, parse: (text: string) => number | undefined): number | undefined {
  const lower = text.toLowerCase()
  const startOfDay = new Date(); startOfDay.setUTCHours(0, 0, 0, 0)
  if (["today", "hoje", "hoy"].some((w) => lower.startsWith(w))) return startOfDay.getTime()
  if (["yesterday", "ontem", "ayer"].some((w) => lower.startsWith(w))) return startOfDay.getTime() - 864e5
  const amount = Number(/\d+/.exec(lower)?.[0])
  const units: [RegExp, number][] = [[/year|año|ano/, 31536e6], [/month|mes/, 2592e6], [/week|semana/, 6048e5], [/day|día|dia/, 864e5], [/hour|hora/, 36e5], [/min/, 6e4], [/sec|segundo/, 1e3]]
  const unit = units.find(([pattern]) => pattern.test(lower))
  if (Number.isFinite(amount) && unit && /ago|atrás|hace/.test(lower)) return Date.now() - amount * unit[1]
  return parse(text)
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

export function madara(options: MadaraOptions): Source {
  const { info } = options
  const baseUrl = info.baseUrl
  const subString = options.mangaSubString ?? "manga"
  const archiveSelector = options.archiveSelector ?? "div.page-item-detail, .manga__item, .c-tabs-item__content"
  const archiveUrlSelector = options.archiveUrlSelector ?? ".post-title a"
  const nextPageSelector = options.nextPageSelector ?? "div.nav-previous, a.nextpostslink, #navigation-ajax"
  const orderParameter = options.orderQueryParameter ?? "m_orderby"
  const searchParameter = options.searchQueryParameter ?? "s"
  const archiveUrl = options.archiveUrl ?? ((path, page, params) => `${baseUrl}${path}${page > 1 ? `page/${page}/` : ""}${params.length ? `?${queryString(params)}` : ""}`)
  const searchUrl = options.searchUrl ?? ((page, params) => `${baseUrl}/${page > 1 ? `page/${page}/` : ""}?${queryString(params)}`)
  const parseDate = options.parseDate ?? parseEnglishDate

  function parseArchive(document: HTMLNode): Manga[] {
    return document.select(archiveSelector).flatMap((element) => {
      const link = element.selectFirst(archiveUrlSelector)
      const href = link?.absUrl("href")
      if (!link || !href) return []
      const img = element.selectFirst("img")
      return [{ url: relativeUrl(href), title: link.text(), thumbnailUrl: img ? imageFromElement(img) : undefined }]
    })
  }

  async function archivePage(page: number, order: string, path = `/${subString}/`, query = ""): Promise<MangasPage> {
    const params: [string, string][] = []
    if (order) params.push([orderParameter, order])
    if (query) params.push([searchParameter, query])
    const { document } = await fetchPage(archiveUrl(path, page, params))
    return { mangas: parseArchive(document), hasNextPage: document.selectFirst(nextPageSelector) != null }
  }

  async function search(page: number, query: string): Promise<MangasPage> {
    const { document } = await fetchPage(searchUrl(page, [[searchParameter, query], ["post_type", "wp-manga"]]))
    let mangas = parseArchive(document)
    if (mangas.length === 0) {
      mangas = document.select(".c-tabs-item__content").flatMap((card) => {
        const link = card.selectFirst(archiveUrlSelector)
        if (!link?.absUrl("href")) return []
        const img = card.selectFirst("img")
        return [{ url: relativeUrl(link.absUrl("href")), title: link.text(), thumbnailUrl: img ? imageFromElement(img) : undefined }]
      })
    }
    return { mangas, hasNextPage: document.selectFirst(nextPageSelector) != null }
  }

  function details(document: HTMLNode): Partial<Manga> {
    const names = (selector: string) => document.select(selector).map((e) => e.text()).filter((t) => !isUpdating(t)).join(", ") || undefined
    const descriptionElement = document.selectFirst(options.mangaDetailsSelectorDescription ?? "div.description-summary div.summary__content, div.summary_content div.post-content_item > h5 + div, div.summary_content div.manga-excerpt")
    const paragraphs = descriptionElement?.select("p") ?? []
    let description = paragraphs.length ? paragraphs.map((p) => p.text()).join("\n\n") : descriptionElement?.text()
    const alternative = document.selectFirst(".post-content_item:contains(Alt) .summary-content")?.ownText()
    if (alternative && !isUpdating(alternative)) description = [description, `Alternative Names: ${alternative}`].filter(Boolean).join("\n\n")
    const thumbnail = document.selectFirst("div.summary_image img")
    const statusElements = document.select("div.summary-content, div.summary-heading:contains(Status) + div")
    const genres = [
      ...document.select("div.genres-content a").map((a) => a.text()),
      ...document.select("div.tags-content a").map((a) => a.text()),
      ...[document.selectFirst(".post-content_item:contains(Type) .summary-content")?.text()].filter((t): t is string => !!t),
    ]
    const seen = new Set<string>()
    return {
      title: document.selectFirst("div.post-title h3, div.post-title h1, #manga-title > h1")?.ownText(),
      author: names("div.author-content > a, div.manga-authors > a"),
      artist: names("div.artist-content > a"),
      description,
      thumbnailUrl: thumbnail ? imageFromElement(thumbnail) : undefined,
      status: statusElements.length ? toStatus(statusElements[statusElements.length - 1].text()) : "unknown",
      genres: genres.filter((g) => !seen.has(g.toLowerCase()) && seen.add(g.toLowerCase())),
    }
  }

  return {
    info: { ...info, supportsLatest: true },

    getPopularManga(page) {
      return archivePage(page, options.popularOrder ?? "views")
    },

    getLatestUpdates(page) {
      return archivePage(page, options.latestOrder ?? "latest")
    },

    searchManga(page, query, filters) {
      const sort = filters.find((f) => f.id === "sort")
      const order = sort?.type === "select" ? sort.options[sort.selected]?.value ?? "" : ""
      return query.trim() ? search(page, query) : archivePage(page, order)
    },

    async getMangaDetails(manga) {
      return details((await fetchPage(baseUrl + manga.url)).document)
    },

    async getChapterList(manga) {
      const { document, url } = await fetchPage(baseUrl + manga.url)
      const mangaPath = relativeUrl(url).split("?")[0]
      return document.select(options.chapterListSelector ?? "li.wp-manga-chapter").flatMap((element): Chapter[] => {
        const link = element.selectFirst("a")
        const href = link?.absUrl("href")
        const slug = href?.split(/[?#]/)[0].replace(/\/$/, "").split("/").pop()
        if (!link || !slug) return []
        const date = element.selectFirst("img:not(.thumb)")?.attr("alt") || element.selectFirst("span a")?.attr("title") || element.selectFirst(options.chapterDateSelector ?? "span.chapter-release-date")?.text()
        return [{ url: slug, name: link.text(), dateUpload: date ? relativeOrAbsolute(date, parseDate) : undefined, sourceData: JSON.stringify({ mangaPath }) }]
      })
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
      let { document } = await fetchPage(url)
      if (document.selectFirst("#single-pager") != null) {
        document = (await fetchPage(`${url}${url.includes("?") ? "&" : "?"}style=list`)).document
      }
      if (document.selectFirst("#chapter-protector-data")) throw new Error("This chapter is protected in a way this source doesn't support yet.")
      return document.select(options.pageListParseSelector ?? "div.page-break, li.blocks-gallery-item, .reading-content .text-left:not(:has(.blocks-gallery-item))").flatMap((element) => {
        const img = element.selectFirst("img")
        const src = img ? imageFromElement(img) : undefined
        return src ? [{ url: src }] : []
      })
    },

    getFilterList() {
      const has = (value: string) => orderOptions.some(([, v]) => v === value) ? value : undefined
      return [{ type: "select", id: "sort", name: "Order by", options: orderOptions.map(([label, value]) => ({ label, value })), selected: 0, listings: { popular: has(options.popularOrder ?? "views"), latest: has(options.latestOrder ?? "latest") } }]
    },
  }
}
