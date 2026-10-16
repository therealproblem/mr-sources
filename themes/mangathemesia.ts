// Ported from Keiyoushi's "mangathemesia" multisrc theme (Apache License 2.0), formerly
// WPMangaStream and WPMangaReader:
// https://github.com/keiyoushi/extensions-source/tree/main/lib-multisrc/mangathemesia
// Options are named after the Kotlin members a site overrides. Not here: MangaThemesiaAlt's
// random URL parts, the paid-chapter setting, related manga and the view counts sent back to
// the site.

import { base64Decode, fetchPage, javaDateParser, queryString, relativeUrl, utf8Decode, type Chapter, type Filter, type HTMLNode, type Manga, type MangaStatus, type MangasPage, type Source, type SourceInfo } from "../sdk"

export interface MangaThemesiaOptions {
  info: SourceInfo
  supportsLatest?: boolean
  mangaUrlDirectory?: string
  /** Kotlin's `datePattern`, read in the source's language and then in English. */
  datePattern?: string
  /** Kotlin's `dateFormat`, when a site sets its locale too. */
  chapterDateFormat?: { pattern: string; locale?: string }
  projectPageString?: string
  hasProjectPage?: boolean

  seriesDetailsSelector?: string
  seriesTitleSelector?: string
  seriesArtistSelector?: string
  seriesAuthorSelector?: string
  seriesDescriptionSelector?: string
  seriesAltNameSelector?: string
  seriesGenreSelector?: string
  seriesTypeSelector?: string
  seriesStatusSelector?: string
  seriesThumbnailSelector?: string
  altNamePrefix?: string
  pageSelector?: string
  searchMangaSelector?: string
  searchMangaNextPageSelector?: string
  chapterListSelector?: string
}

const selector = (template: string, words: string[]) => words.map((word) => template.replaceAll("%s", word)).join(", ")

const defaults = {
  seriesDetailsSelector: "div.bigcontent, div.animefull, div.main-info, div.postbody",
  seriesTitleSelector: ".entry-title, .ts-breadcrumb li:last-child span",
  seriesArtistSelector: selector(
    ".infotable tr:contains(%s) td:last-child, .tsinfo .imptdt:contains(%s) i, .fmed b:contains(%s)+span, span:contains(%s)",
    ["artist", "Artiste", "Artista", "الرسام", "الناشر", "İllüstratör", "Çizer", "Sanatçı", "นักวาด"],
  ),
  seriesAuthorSelector: selector(
    ".infotable tr:contains(%s) td:last-child, .tsinfo .imptdt:contains(%s) i, .fmed b:contains(%s)+span, span:contains(%s)",
    ["Author", "Auteur", "autor", "المؤلف", "Mangaka", "seniman", "Pengarang", "Yazar", "ผู้แต่ง", "นักเขียน"],
  ),
  seriesDescriptionSelector: ".desc, .entry-content[itemprop=description]",
  seriesAltNameSelector: ".alternative, .wd-full:contains(alt) span, .alter, .seriestualt, " +
    selector(".infotable tr:contains(%s) td:last-child", ["Alternative", "Alternatif", "الأسماء الثانوية"]),
  seriesGenreSelector: "div.gnr a, .mgen a, .seriestugenre a, " + selector("span:contains(%s)", ["genre", "التصنيف"]),
  seriesTypeSelector: selector(
    ".infotable tr:contains(%s) td:last-child, .tsinfo .imptdt:contains(%s) i, .tsinfo .imptdt:contains(%s) a, .fmed b:contains(%s)+span, span:contains(%s) a",
    ["type", "ประเภท", "النوع", "tipe", "Türü"],
  ) + ", a[href*=type\\=]",
  seriesStatusSelector: selector(
    ".infotable tr:contains(%s) td:last-child, .tsinfo .imptdt:contains(%s) i, .fmed b:contains(%s)+span span:contains(%s)",
    ["status", "Statut", "Durum", "連載状況", "Estado", "الحالة", "حالة العمل", "สถานะ", "stato", "Statüsü"],
  ),
  seriesThumbnailSelector: ".infomanga > div[itemprop=image] img, .thumb img",
  pageSelector: "div#readerarea img",
  searchMangaSelector: ".utao .uta .imgu, .listupd .bs .bsx, .listo .bs .bsx",
  searchMangaNextPageSelector: "div.pagination .next, div.hpage .r",
  chapterListSelector: "div.bxcl li, div.cl li, #chapterlist li, ul li:has(div.chbox):has(div.eph-num)",
}

const statusWords: [MangaStatus, string[]][] = [
  ["ongoing", [
    "مستمرة", "en curso", "ongoing", "on going", "new season", "mass released", "ativo", "en cours", "en cours de publication",
    "đang tiến hành", "em lançamento", "онгоінг", "publishing", "devam ediyor", "em andamento",
    "in corso", "güncel", "berjalan", "продолжается", "updating", "lançando", "in arrivo",
    "emision", "en emision", "مستمر", "curso", "en marcha", "publicandose", "publicando",
    "连载中", "devam etmekte", "連載中",
  ]],
  ["completed", [
    "completed", "completo", "complété", "fini", "achevé", "terminé", "tamamlandı", "đã hoàn thành",
    "hoàn thành", "مكتملة", "завершено", "finished", "finalizad", "completata", "one-shot",
    "bitti", "tamat", "completado", "concluído", "完結", "concluido", "已完结", "bitmiş",
  ]],
  ["cancelled", ["canceled", "cancelled", "cancelado", "cancellato", "cancelados", "dropped", "discontinued", "abandonné"]],
  ["onHiatus", ["hiatus", "on hold", "season end", "pausado", "en espera", "en pause", "en attente", "hiato"]],
]
const parseStatus = (text: string | undefined): MangaStatus => {
  if (!text) return "unknown"
  const lower = text.toLowerCase()
  return statusWords.find(([, words]) => words.some((w) => lower.includes(w.toLowerCase())))?.[0] ?? "unknown"
}

const statusOptions: [string, string][] = [["All", ""], ["Ongoing", "ongoing"], ["Completed", "completed"], ["Hiatus", "hiatus"], ["Dropped", "dropped"]]
const typeOptions: [string, string][] = [["All", ""], ["Manga", "Manga"], ["Manhwa", "Manhwa"], ["Manhua", "Manhua"], ["Comic", "Comic"]]
const orderOptions: [string, string][] = [["Default", ""], ["A-Z", "title"], ["Z-A", "titlereverse"], ["Latest Update", "update"], ["Latest Added", "latest"], ["Popular", "popular"]]
const projectOptions: [string, string][] = [["Show all manga", ""], ["Show only project manga", "project-filter-on"]]
const options = (list: [string, string][]) => list.map(([label, value]) => ({ label, value }))
const removeEmptyPlaceholder = (text: string | undefined) => !text?.trim() || ["-", "N/A", "n/a", "Unknown"].includes(text) ? undefined : text

/** The image URL from the first of `data-lazy-src`, `data-src`, `data-cfsrc` and `src` it has. */
function imgAttr(element: HTMLNode | null | undefined): string {
  if (!element) return ""
  if (element.hasAttr("data-lazy-src")) return element.absUrl("data-lazy-src")
  if (element.hasAttr("data-src")) return element.absUrl("data-src")
  if (element.hasAttr("data-cfsrc")) return element.absUrl("data-cfsrc")
  return element.absUrl("src")
}

/** Jsoup's `Elements.attr`: the first element's that has it. */
const firstAttr = (elements: HTMLNode[], name: string) => elements.find((e) => e.hasAttr(name))?.attr(name) ?? ""

interface GenreData {
  name: string
  value: string
}

export function mangathemesia(o: MangaThemesiaOptions): Source {
  const { info } = o
  const baseUrl = info.baseUrl.replace(/\/$/, "")
  const lang = info.lang === "all" ? "en" : info.lang
  const directory = o.mangaUrlDirectory ?? "/manga"
  const s = { ...defaults, ...Object.fromEntries(Object.entries(o).filter(([key, value]) => key in defaults && value !== undefined)) } as typeof defaults
  const datePattern = o.chapterDateFormat?.pattern ?? o.datePattern ?? "MMMM d, yyyy"
  const localDate = javaDateParser(datePattern, o.chapterDateFormat?.locale ?? lang)
  const usDate = javaDateParser(datePattern, "en-US")
  const parseDate = (text: string | undefined) => text ? localDate(text) ?? usDate(text) : undefined
  const altNamePrefix = o.altNamePrefix ?? "Alternative Names: "

  function searchUrl(page: number, query: string, filters: Filter[]): string {
    let path = directory
    const params: [string, string][] = []
    if (query) params.push(["title", query])
    params.push(["page", String(page)])
    for (const filter of filters) {
      const selected = filter.type === "select" ? filter.options[filter.selected]?.value ?? "" : ""
      switch (filter.id) {
        case "status": params.push(["status", selected]); break
        case "type": params.push(["type", selected]); break
        case "order": params.push(["order", selected]); break
        case "genres":
          if (filter.type === "tristates") {
            for (const value of filter.included) params.push(["genre[]", value])
            for (const value of filter.excluded) params.push(["genre[]", `-${value}`])
          }
          break
        case "author": if (filter.type === "text" && filter.value) params.push(["author", filter.value]); break
        case "year": if (filter.type === "text" && filter.value) params.push(["yearx", filter.value]); break
        case "project": if (selected === "project-filter-on") path = o.projectPageString ?? "/project"; break
      }
    }
    return `${baseUrl}${path.replace(/\/$/, "")}/?${queryString(params)}`
  }

  async function search(page: number, query: string, filters: Filter[]): Promise<MangasPage> {
    const { document } = await fetchPage(searchUrl(page, query, filters))
    const mangas = document.select(s.searchMangaSelector).flatMap((element): Manga[] => {
      const links = element.select("a")
      const href = firstAttr(links, "href")
      if (!href) return []
      return [{ url: relativeUrl(links.find((a) => a.hasAttr("href"))!.absUrl("href") || href), title: firstAttr(links, "title"), thumbnailUrl: imgAttr(element.selectFirst("img")) || undefined }]
    })
    const next = s.searchMangaNextPageSelector ? document.selectFirst(s.searchMangaNextPageSelector) : null
    return { mangas, hasNextPage: next != null }
  }

  const orderFilter = (value: string): Filter => ({ type: "select", id: "order", name: "", options: options(orderOptions), selected: orderOptions.findIndex(([, v]) => v === value) })

  function details(document: HTMLNode): Partial<Manga> {
    const details = document.selectFirst(s.seriesDetailsSelector)
    if (!details) return {}
    let description = details.selectFirst(s.seriesDescriptionSelector)?.text() || undefined
    const altName = details.selectFirst(s.seriesAltNameSelector)?.ownText()
    if (altName?.trim()) {
      const names = altName.split(/[|/•,;]/).map((name) => `- ${name.trim()}`).join("\n")
      description = (description ? `${description}\n\n` : "") + `${altNamePrefix}\n${names}`.trim()
    }
    const genres = details.select(s.seriesGenreSelector).map((g) => g.text())
    const type = details.selectFirst(s.seriesTypeSelector)?.ownText()
    if (type?.trim()) genres.push(type)
    return {
      title: details.selectFirst(s.seriesTitleSelector)?.text() || undefined,
      artist: removeEmptyPlaceholder(details.selectFirst(s.seriesArtistSelector)?.ownText()),
      author: removeEmptyPlaceholder(details.selectFirst(s.seriesAuthorSelector)?.ownText()),
      description,
      genres: genres.map((genre) => {
        const lower = genre.toLocaleLowerCase(lang).trim()
        return lower.charAt(0).toLocaleUpperCase(lang) + lower.slice(1)
      }).filter(Boolean),
      status: parseStatus(details.selectFirst(s.seriesStatusSelector)?.text()),
      thumbnailUrl: imgAttr(details.select(s.seriesThumbnailSelector)[0]) || undefined,
    }
  }

  function chapters(document: HTMLNode): Chapter[] {
    const list = document.select(s.chapterListSelector).flatMap((element): Chapter[] => {
      const links = element.select("a")
      const link = links.find((a) => a.hasAttr("href"))
      if (!link) return []
      const numbered = element.select(".lch a, .chapternum").map((e) => e.text()).join(" ").trim()
      return [{ url: relativeUrl(link.absUrl("href")), name: numbered || links[0].text(), dateUpload: parseDate(element.selectFirst(".chapterdate")?.text()) }]
    })
    // The newest gets the series' "Updated On" date when chapters have none.
    if (list.length && list[0].dateUpload === undefined) {
      const updated = document.select(".listinfo time[itemprop=dateModified], .fmed:contains(update) time, span:contains(update) time").find((t) => t.hasAttr("datetime"))?.attr("datetime")
      const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(updated ?? "")
      if (match) list[0].dateUpload = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    }
    return list
  }

  function pages(document: HTMLNode): { url: string }[] {
    const html = document.select(s.pageSelector).map(imgAttr).filter(Boolean)
    if (html.length) return html.map((url) => ({ url }))
    // Some sites load their pages from a script: "ts_reader.run({" in base64, or in the page.
    const script = document.selectFirst("script[src^=data:text/javascript;base64,dHNfcmVhZGVyLnJ1bih7]")
    const text = script ? utf8Decode(base64Decode(script.attr("src").split("base64,")[1] ?? "")) : document.outerHtml()
    const json = /["']?(?:images|imageUrls)["']?\s*[:=]\s*(\[.*?])/.exec(text)?.[1]
    let images: unknown = []
    try { images = JSON.parse(json ?? "[]") } catch { /* none */ }
    return (Array.isArray(images) ? images : []).filter((url): url is string => typeof url === "string")
      .map((url) => ({ url: url.startsWith("/") ? baseUrl + url : url }))
  }

  return {
    info: { ...info, supportsLatest: o.supportsLatest ?? true },

    getPopularManga(page) {
      return search(page, "", [orderFilter("popular")])
    },

    getLatestUpdates(page) {
      return search(page, "", [orderFilter("update")])
    },

    searchManga(page, query, filters) {
      return search(page, query, filters)
    },

    async getMangaDetails(manga) {
      return details((await fetchPage(baseUrl + manga.url)).document)
    },

    async getChapterList(manga) {
      return chapters((await fetchPage(baseUrl + manga.url)).document)
    },

    async getPageList(chapter) {
      return pages((await fetchPage(baseUrl + chapter.url)).document)
    },

    getFilterList(data) {
      const genres = Array.isArray(data) ? (data as GenreData[]).filter((g) => g?.name && g?.value !== undefined) : []
      const filters: Filter[] = [
        { type: "text", id: "author", name: "Author", value: "" },
        { type: "text", id: "year", name: "Year", value: "" },
        { type: "select", id: "status", name: "Status", options: options(statusOptions), selected: 0 },
        { type: "select", id: "type", name: "Type", options: options(typeOptions), selected: 0 },
        { type: "select", id: "order", name: "Sort By", options: options(orderOptions), selected: 0, listings: { popular: "popular", latest: o.supportsLatest === false ? undefined : "update" } },
      ]
      if (genres.length) {
        filters.push(
          { type: "header", id: "genresHeader", name: "Exclude genres by tapping twice" },
          { type: "tristates", id: "genres", name: "Genre", options: genres.map((g) => ({ label: g.name, value: g.value })), included: [], excluded: [] },
        )
      }
      if (o.hasProjectPage) {
        filters.push(
          { type: "separator", id: "projectSeparator" },
          { type: "header", id: "projectHeader", name: `Project filter: ${info.name}'s own translations only; other filters are ignored` },
          { type: "select", id: "project", name: "Filter Project", options: options(projectOptions), selected: 0 },
        )
      }
      return filters
    },

    async fetchFilterData() {
      const { document } = await fetchPage(`${baseUrl}${directory.replace(/\/$/, "")}/`)
      return document.selectFirst("ul.genrez")?.select("li").flatMap((li): GenreData[] => {
        const name = li.selectFirst("label")?.text()
        const value = li.selectFirst("input[type=checkbox]")?.attr("value")
        return name && value !== undefined ? [{ name, value }] : []
      }) ?? []
    },
  }
}
