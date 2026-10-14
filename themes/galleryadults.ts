// Ported from Keiyoushi's "galleryadults" multisrc theme (Apache License 2.0):
// https://github.com/keiyoushi/extensions-source/tree/main/lib-multisrc/galleryadults
// Sites built on it set the options below, as the Kotlin extensions override the theme.

import {
  formBody, imgAttr, mapLimit, parseDate, parseRelativeDate, queryString, relativeUrl, send,
  type Filter, type HTMLNode, type Manga, type MangasPage, type Source, type SourceInfo,
} from "../sdk"

export const LANGUAGE_MULTI = ""
export const LANGUAGE_SPEECHLESS = "speechless"
export const languageSlugs: Record<string, string> = {
  en: "english", ja: "japanese", zh: "chinese", ko: "korean", es: "spanish", fr: "french", de: "german", ru: "russian", all: LANGUAGE_MULTI,
}

export interface GalleryAdultsOptions {
  info: SourceInfo
  /** The site's language slug ("english"), or "" for every language. */
  mangaLang: string
  useIntermediateSearch?: boolean
  supportAdvancedSearch?: boolean
  supportSpeechless?: boolean
  basicSearchKey?: string
  intermediateSearchKey?: string
  mangaTitleSelector?: string
  popularMangaSelector?: string
  mangaUrl?: (element: HTMLNode) => string | undefined
  mangaThumbnail?: (element: HTMLNode) => string | undefined
  /** The language slug of a listed gallery, to leave out other languages. */
  mangaLangOf?: (element: HTMLNode) => string
  idPrefixUri?: string
  mangaDetailInfoSelector?: string
  cover?: (element: HTMLNode) => string | undefined
  infoSelector: (tag: string) => string
  infoTagName?: (element: HTMLNode) => string
  galleryId?: (element: HTMLNode) => string
  totalPages?: (element: HTMLNode) => string
  thumbnailSelector?: string
  pageUri?: string
  /** Open each page for its image instead of turning thumbnails into full images. */
  parsingImagePageByPage?: boolean
  /** Throws if a page's HTML says something's wrong (IMHentai's "Overload"). */
  checkPage?: (html: string) => void
}

export function galleryAdults(options: GalleryAdultsOptions): Source {
  const { info, mangaLang } = options
  const baseUrl = info.baseUrl
  const host = baseUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "")
  const supportsLatest = info.supportsLatest ?? true
  const useIntermediateSearch = options.useIntermediateSearch ?? false
  const useBasicSearch = !useIntermediateSearch
  const supportAdvancedSearch = options.supportAdvancedSearch ?? false
  const supportSpeechless = options.supportSpeechless ?? false
  const titleSelector = options.mangaTitleSelector ?? ".caption"
  const listSelector = options.popularMangaSelector ?? "div.thumb"
  const nextPageSelector = ".pagination li.active + li:not(.disabled), a[rel='next']"
  const idPrefixUri = options.idPrefixUri ?? "gallery"
  const detailSelector = options.mangaDetailInfoSelector ?? ".gallery_top"
  const thumbnailSelector = options.thumbnailSelector ?? ".gallery_thumb"
  const pageUri = options.pageUri ?? "g"
  const xhrHeaders = { "X-Requested-With": "XMLHttpRequest" }

  const shortTitle = () => Rakuen.prefs.get("pref_short_title") === true
  const fullTitle = (element: HTMLNode, selector: string) => element.selectFirst(selector)?.text()
  const mangaTitle = (element: HTMLNode, selector = titleSelector) => {
    const title = fullTitle(element, selector)
    return title && shortTitle() ? title.replace(/(\[[^\]]*]|[({][^)}]*[)}])/g, "").trim() : title
  }
  const mangaUrl = options.mangaUrl ?? ((e: HTMLNode) => e.selectFirst(".inner_thumb a")?.absUrl("href"))
  const mangaThumbnail = options.mangaThumbnail ?? ((e: HTMLNode) => { const img = e.selectFirst(".inner_thumb img"); return img ? imgAttr(img) : undefined })
  const mangaLangOf = options.mangaLangOf ?? (() => mangaLang)
  const cover = options.cover ?? ((e: HTMLNode) => { const img = e.selectFirst(".cover img"); return img ? imgAttr(img) : undefined })
  const infoTagName = options.infoTagName ?? ((e: HTMLNode) => e.ownText())
  const inputValue = (e: HTMLNode, id: string) => e.select(`input[id=${id}]`)[0]?.attr("value") ?? ""
  const galleryId = options.galleryId ?? ((e: HTMLNode) => inputValue(e, "gallery_id"))
  const totalPages = options.totalPages ?? ((e: HTMLNode) => inputValue(e, "load_pages"))

  const addPageUri = (url: string, page: number) => `${url.replace(/^\/+|\/+$/g, "")}${url.includes("?") ? "&" : "/?"}page=${page}`
  const popularMangaUrl = `${baseUrl}/${mangaLang ? `language/${mangaLang}/` : ""}${supportsLatest ? "popular" : ""}`
  const latestUpdatesUrl = `${baseUrl}/${mangaLang ? `language/${mangaLang}` : ""}`

  async function load(url: string) {
    const response = await send(url)
    options.checkPage?.(response.body)
    return { document: Rakuen.parseHTML(response.body, response.url), url: response.url }
  }

  function listItem(element: HTMLNode): Manga | undefined {
    const title = mangaTitle(element)
    const url = mangaUrl(element)
    if (!title || !url) return undefined
    return { title, url: relativeUrl(url), thumbnailUrl: mangaThumbnail(element) || undefined }
  }

  function parseList(document: HTMLNode): MangasPage {
    const mangas = document.select(listSelector).map(listItem).filter((m): m is Manga => m != null)
    return { mangas, hasNextPage: document.selectFirst(nextPageSelector) != null }
  }

  function parseSearch(document: HTMLNode, url: string): MangasPage {
    if (url.includes("/login/") && document.select("input[value=Login]").length > 0) {
      throw new Error("Log in through the web view to see favorites.")
    }
    const hasNextPage = document.selectFirst(nextPageSelector) != null
    const unfiltered = document.select(listSelector).flatMap((element) => {
      const item = listItem(element)
      return item ? [{ item, lang: mangaLangOf(element) }] : []
    })
    let results = unfiltered.filter(({ lang }) => !mangaLang || lang === LANGUAGE_SPEECHLESS || lang === mangaLang)
    // At least one title when this page only has other languages.
    if (results.length === 0 && hasNextPage) results = unfiltered.slice(0, 1)
    return { mangas: results.map(({ item }) => item), hasNextPage }
  }

  function getInfo(element: HTMLNode, tag: string): string[] {
    return element.select(options.infoSelector(tag))
      .flatMap((e) => [infoTagName(e), e.select(".split_tag").map((s) => s.text()).join(" ").replace(/^\| /, "").trim()])
      .filter((text) => text.trim() !== "")
      .sort()
  }

  function parseDetails(document: HTMLNode): Partial<Manga> {
    const info = document.selectFirst(detailSelector)
    if (!info) throw new Error("The gallery page has changed.")
    const description = [
      ...["Parodies", "Characters", "Groups", "Languages", "Categories", "Category"].flatMap((tag) => {
        const values = getInfo(info, tag)
        return values.length ? [`**${tag}**: ${values.join(", ")}`] : []
      }),
      ...[
        ["Pages", totalPages(document)],
        ["Alternative title", info.selectFirst("h1 + h2, .subtitle")?.ownText()],
        ["Full title", shortTitle() ? fullTitle(info, "h1") : undefined],
      ].flatMap(([label, value]) => (value?.trim() ? [`**${label}**: ${value}`] : [])),
    ].join("\n\n")
    const artists = getInfo(info, "Artists")
    return {
      title: mangaTitle(info, "h1"),
      thumbnailUrl: cover(info),
      genres: getInfo(info, "Tags"),
      author: (artists.length ? artists : getInfo(info, "Groups")).join(", ") || undefined,
      description,
      status: "completed",
    }
  }

  async function getMangaById(id: string): Promise<Manga> {
    const { document } = await load(`${baseUrl}/${idPrefixUri}/${id}`)
    return { ...parseDetails(document), title: mangaTitle(document.selectFirst(detailSelector)!, "h1") ?? id, url: `/${idPrefixUri}/${id}/` }
  }

  const sortOrders: [string, string][] = [["Popular", "pp"], ["Latest", "lt"], ...(useIntermediateSearch || supportAdvancedSearch ? [["Downloads", "dl"], ["Top Rated", "tr"]] as [string, string][] : [])]
  const categories: [string, string][] = [["Manga", "m"], ["Doujinshi", "d"], ["Western", "w"], ["Image Set", "i"], ["Artist CG", "a"], ["Game CG", "g"]]
  const languageFlags: [string, string][] = [["english", "en"], ["japanese", "jp"], ["spanish", "es"], ["french", "fr"], ["korean", "kr"], ["german", "de"], ["russian", "ru"]]
  const advancedKeys: [string, string][] = [["tags", "tag"], ["parodies", "parody"], ["artists", "artist"], ["characters", "character"], ["groups", "group"]]

  // "word word, other" → "word+word,other", the site's syntax: + for exact phrases, comma for AND.
  const searchTerms = (query: string) => [query].filter((t) => t.trim())
    .map((t) => t.trim().replace(/(?<!,)\s+/g, "+").replace(/ /g, ""))
    .map((t) => encodeURIComponent(t).replace(/%2B/gi, "+").replace(/%2C/gi, ","))
    .join(",")

  function flags(filters: Filter[], sort: number): [string, string][] {
    const categoryFilter = filters.find((f) => f.id === "categories")
    const checked = categoryFilter?.type === "checkboxes" ? categoryFilter.checked : categories.map(([, uri]) => uri)
    return [
      ...sortOrders.map(([, uri], index): [string, string] => [uri, index === sort ? "1" : "0"]),
      ...categories.map(([, uri]): [string, string] => [uri, checked.includes(uri) ? "1" : "0"]),
      ...languageFlags.map(([slug, uri]): [string, string] => [uri, mangaLang === slug || mangaLang === LANGUAGE_MULTI ? "1" : "0"]),
    ]
  }

  return {
    info: { ...info, supportsLatest },

    async getPopularManga(page) {
      return parseList((await load(addPageUri(popularMangaUrl, page))).document)
    },

    async getLatestUpdates(page) {
      return parseList((await load(addPageUri(latestUpdatesUrl, page))).document)
    },

    async searchManga(page, query, filters) {
      if (/^\d+$/.test(query.trim())) return { mangas: [await getMangaById(query.trim())], hasNextPage: false }
      const checked = (id: string) => filters.some((f) => f.id === id && f.type === "checkboxes" && f.checked.length > 0)
      const sortFilter = filters.find((f) => f.id === "sort")
      const sort = sortFilter?.type === "select" ? sortFilter.selected : 0

      if (checked("random")) {
        const { document, url } = await load(`${baseUrl}/random/`)
        const id = url.replace(/\/$/, "").split("/").pop()
        return { mangas: [{ title: mangaTitle(document, "h1") ?? "", url: `/${idPrefixUri}/${id}/`, thumbnailUrl: cover(document) }], hasNextPage: false }
      }

      const advanced = advancedKeys.flatMap(([id, key]) => {
        const filter = filters.find((f) => f.id === id)
        if (filter?.type !== "text" || !filter.value.trim()) return []
        return filter.value.trim().replace(/(?<!,)\s+/g, "+").replace(/ /g, "").split(",").flatMap((term) => {
          const match = /^(-?)"?(.+)"?/.exec(term)
          return match ? [`${match[1] ? "-" : "%2B"}${key}:"${encodeURIComponent(match[2]).replace(/%2B/gi, "+")}"`] : []
        })
      })

      let url: string
      if (supportSpeechless && checked("speechless")) {
        url = `${baseUrl}/language/${LANGUAGE_SPEECHLESS}${sort === 0 ? "/popular" : ""}`
      } else if (supportAdvancedSearch && advanced.length > 0) {
        url = `${baseUrl}/advsearch/?${queryString(flags(filters, sort))}&key=${advanced.join("+")}`
      } else if (useIntermediateSearch) {
        url = `${baseUrl}/search/?${queryString(flags(filters, sort))}&${options.intermediateSearchKey ?? "key"}=${searchTerms(query)}`
      } else if (useBasicSearch && query.trim()) {
        url = `${baseUrl}/search/?${options.basicSearchKey ?? "q"}=${searchTerms(query)}${sort === 0 ? "&sort=popular" : ""}`
      } else if (sort === 1) {
        url = latestUpdatesUrl
      } else {
        url = popularMangaUrl
      }
      const result = await load(addPageUri(url, page))
      return parseSearch(result.document, result.url)
    },

    async getMangaDetails(manga) {
      return parseDetails((await load(baseUrl + manga.url)).document)
    },

    async getChapterList(manga) {
      const { document, url } = await load(baseUrl + manga.url)
      const info = document.selectFirst(detailSelector)
      const uploaded = document.selectFirst(".uploaded")?.ownText()
      return [{
        url: relativeUrl(url).replace(/[?#].*$/, ""),
        name: "Chapter",
        scanlator: info ? getInfo(info, "Groups").join(", ") || undefined : undefined,
        dateUpload: parseDate(uploaded) ?? parseRelativeDate(uploaded),
      }]
    },

    async getPageList(chapter) {
      const { document } = await load(baseUrl + chapter.url)
      const loadDir = inputValue(document, "load_dir")
      const loadId = inputValue(document, "load_id")
      const id = galleryId(document)
      const serverNumber = inputValue(document, "load_server")
      const server = serverNumber ? `m${serverNumber}.${host}` : (cover(document) ?? "").replace(/^https?:\/\//, "").replace(/\/.*$/, "")
      const imagesUri = `https://${server}/${loadDir}/${loadId}`

      // {"1":"j,1100,1148","2":"p,728,689",...}: page → extension letter, width, height.
      const script = document.select("script").map((s) => s.data()).find((data) => data.includes("$.parseJSON('"))
      const json = script?.split("$.parseJSON('")[1]?.split("');")[0]?.trim()
      if (json) {
        try {
          const images = JSON.parse(json) as Record<string, string>
          const extensions: Record<string, string> = { p: "png", b: "bmp", g: "gif", w: "webp" }
          return Object.entries(images).map(([page, value]) => ({ url: `${imagesUri}/${page}.${extensions[String(value).split(",")[0]] ?? "jpg"}` }))
        } catch {
          // Fall through to the thumbnails.
        }
      }

      const total = Number(totalPages(document)) || 0
      if (options.parsingImagePageByPage) {
        const pageUrls = Array.from({ length: total }, (_, i) => `${baseUrl}/${pageUri}/${id}/${i + 1}/`)
        return mapLimit(pageUrls, 6, async (pageUrl) => {
          const page = (await load(pageUrl)).document.selectFirst("img#gimg, img#fimg, img#readerImg")
          return { url: page ? imgAttr(page) : "" }
        })
      }

      const thumbnails = document.select(`${thumbnailSelector} a`).flatMap((a) => { const img = a.selectFirst("img"); return img ? [imgAttr(img)] : [] })
      if (total > thumbnails.length) {
        const token = document.select("[name=csrf-token]")[0]?.attr("content") ?? ""
        const form = formBody([
          ["u_id", id], ["g_id", loadId], ["img_dir", loadDir], ["visible_pages", String(thumbnails.length)],
          ["total_pages", String(total)], ["type", "2"],
          ...(token ? [["_token", token] as [string, string]] : []),
          ...(serverNumber ? [["server", serverNumber] as [string, string]] : []),
        ])
        const response = await send({ url: `${baseUrl}/inc/thumbs_loader.php`, method: "POST", headers: { ...xhrHeaders, ...form.headers }, body: form.body })
        const more = Rakuen.parseHTML(response.body, response.url).select("a").flatMap((a) => { const img = a.selectFirst("img"); return img ? [imgAttr(img)] : [] })
        if (more.length > 0) {
          thumbnails.push(...more)
        } else {
          // Guess the rest: they're numbered in order.
          const first = document.select(`${thumbnailSelector} img`)[0]
          const extension = first ? imgAttr(first).split(".").pop() : "jpg"
          for (let i = thumbnails.length + 1; i <= total; i++) thumbnails.push(`${imagesUri}/${i}t.${extension}`)
        }
      }
      return thumbnails.map((url) => ({ url: thumbnailToFull(url) }))
    },

    getFilterList() {
      const filters: Filter[] = []
      if (useIntermediateSearch) filters.push({ type: "header", id: "hint", name: "HINT: Separate search term with comma (,)" })
      filters.push({ type: "select", id: "sort", name: "Sort By", options: sortOrders.map(([label, value]) => ({ label, value })), selected: 0 })
      if (useIntermediateSearch || supportAdvancedSearch) {
        filters.push({ type: "separator", id: "s1" })
        filters.push({ type: "checkboxes", id: "categories", name: "Categories", options: categories.map(([label, value]) => ({ label, value })), checked: categories.map(([, uri]) => uri) })
      }
      if (supportAdvancedSearch) {
        filters.push(
          { type: "separator", id: "s2" },
          { type: "header", id: "advanced", name: "Advanced filters will ignore query search. Separate terms by comma (,) and precede term with minus (-) to exclude." },
          ...advancedKeys.map(([id]): Filter => ({ type: "text", id, name: id.charAt(0).toUpperCase() + id.slice(1), value: "" })),
        )
      }
      filters.push({ type: "separator", id: "s3" })
      if (supportSpeechless) filters.push({ type: "checkboxes", id: "speechless", name: "Speechless", options: [{ label: "Show speechless items only", value: "on" }], checked: [] })
      filters.push({ type: "checkboxes", id: "random", name: "Random", options: [{ label: "Random manga", value: "on" }], checked: [] })
      return filters
    },
  }
}

/** Thumbnail URLs end in "t.<ext>"; full images are the same without the t. */
function thumbnailToFull(url: string): string {
  const extension = url.split(".").pop()
  return url.replace(`t.${extension}`, `.${extension}`)
}
