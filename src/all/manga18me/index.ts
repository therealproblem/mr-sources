// Ported from the Keiyoushi "Manga18Me" extension (yiimadara theme, v1.6.0):
// https://github.com/keiyoushi/extensions-source/tree/main/src/all/manga18me
// Licensed under the Apache License, Version 2.0.
// The site moved to a Yii frontend; the port follows Keiyoushi's YiiMadara theme
// (https://github.com/keiyoushi/extensions-source/tree/main/lib-multisrc/yiimadara).
// Not here: related manga, which the app doesn't offer.

import { fetchHTML, queryString, relativeUrl, type Chapter, type Filter, type FilterOption, type HTMLNode, type Manga, type MangaStatus, type MangasPage, type Source } from "../../../sdk"

const baseUrl = "https://manga18.me"
const headers = { Referer: `${baseUrl}/` }
const directoryPath = "manga"
const rawPath = "manhwa-raw"

function makeSource([id, lang]: [string, string]): Source {
  const get = (url: string) => fetchHTML({ url, headers })

  function listUrl(path: string, page: number): string {
    return `${baseUrl}/${path}/${page}`
  }

  function parseList(document: HTMLNode, path: string): MangasPage {
    // Untranslated raws are mixed into every listing; leave them out of "en" listings
    // unless the listing itself is the raw one.
    const hideRaw = lang === "en" && path !== rawPath
    const mangas = document.select("div.page-item, div.page-item-detail, div.home-item, div.manga-item").flatMap((element) => {
      const link = element.selectFirst("h3 a")
      if (!link) return []
      const manga = {
        url: relativeUrl(link.absUrl("href")),
        title: link.text(),
        thumbnailUrl: imageOf(element.selectFirst("img")),
      }
      return hideRaw && isRaw(manga) ? [] : [manga]
    })
    return { mangas, hasNextPage: document.selectFirst("#blog-pager li.next a") != null }
  }

  function details(document: HTMLNode): Partial<Manga> {
    // Rows are a .summary-heading/.summary-content pair, or a <b> label followed by the value.
    const info = (label: string): HTMLNode[] => {
      const item = document.select(".post-content_item").find((e) => {
        const head = e.children().find((c) => c.is(".summary-heading") || c.is("b"))
        return head?.text().toLowerCase().startsWith(label) ?? false
      })
      if (item) {
        const content = item.children().filter((c) => c.is(".summary-content"))
        return content.length > 0 ? content : item.children().filter((c) => !c.is("b"))
      }
      const minfo = document.select(".minfo").find((e) => e.ownText().toLowerCase().startsWith(label))
      return minfo?.children().filter((c) => c.is("i")) ?? []
    }
    const value = (elements: HTMLNode[]): string | undefined => {
      const text = elements.map((e) => e.text()).join(", ")
      return text && text !== "Updating" && text !== "N/A" ? text : undefined
    }
    const names = (elements: HTMLNode[]): string | undefined => {
      const links = elements.flatMap((e) => e.select("a"))
      const text = links.length > 0 ? links.map((a) => a.text()).join(", ") : elements.map((e) => e.text()).join(", ")
      return text && text !== "Updating" ? text : undefined
    }
    const heading = document.selectFirst(".post-title h1")
    const genreLinks = info("Genre").flatMap((e) => e.select("a"))
    const type = value(info("Type"))
    const statusText = info("Status").map((e) => e.text()).join(" ").toLowerCase()
    const status: MangaStatus = statusText === "ongoing" ? "ongoing" : statusText === "completed" ? "completed" : "unknown"
    const synopsisBlock = document.selectFirst(".dsct, .ss-manga, .post-content_item .entry-content")
    const synopsis = synopsisBlock
      ? (synopsisBlock.select("p").length > 0 ? synopsisBlock.select("p") : [synopsisBlock]).map((p) => p.text()).filter(Boolean).join("\n\n") || undefined
      : undefined
    const alternative = value(info("Alternative"))
    return {
      title: heading ? heading.ownText() || heading.text() : undefined,
      thumbnailUrl: imageOf(document.selectFirst(".summary_image img")),
      author: names(info("Author")),
      artist: names(info("Artist")),
      genres: [...(genreLinks.length > 0 ? genreLinks.map((a) => a.text()) : names(info("Genre")) ? [names(info("Genre"))!] : []), ...(type ? [type] : [])],
      status,
      description: [synopsis, alternative ? `Alternative names: ${alternative}` : undefined].filter(Boolean).join("\n\n") || undefined,
    }
  }

  return {
    info: {
      id, name: "Manga18.me", lang, version: "1.0.4", baseUrl, supportsLatest: true, nsfw: true,
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/manga18me/res/mipmap-xhdpi/ic_launcher.png",
      imageHeaders: headers,
    },

    async getPopularManga(page) {
      return parseList(await get(`${listUrl(directoryPath, page)}?orderby=trending`), directoryPath)
    },

    async getLatestUpdates(page) {
      return parseList(await get(listUrl(directoryPath, page)), directoryPath)
    },

    async searchManga(page, query, filters) {
      if (query.trim()) {
        // Search fails with HTTP 500 on ASCII apostrophes.
        return parseList(await get(`${baseUrl}/search?${queryString([["q", query.replaceAll("'", "’")], ["page", String(page)]])}`), "search")
      }
      const selected = (fid: string) => { const f = filters.find((x) => x.id === fid); return f?.type === "select" ? f.options[f.selected]?.value ?? "" : "" }
      // The genre takes priority over the category.
      const path = selected("genre") || selected("category") || directoryPath
      const sort = selected("sort")
      return parseList(await get(`${listUrl(path, page)}${sort ? `?orderby=${sort}` : ""}`), path)
    },

    async getMangaDetails(manga) {
      return details(await get(baseUrl + manga.url))
    },

    async getChapterList(manga) {
      const document = await get(baseUrl + manga.url)
      return document.select("ul.row-content-chapter li").flatMap((element): Chapter[] => {
        const link = element.selectFirst("a")
        if (!link) return []
        return [{
          url: relativeUrl(link.absUrl("href")),
          name: link.text(),
          dateUpload: parseChapterDate(element.selectFirst(".chapter-time")?.text()),
        }]
      })
    },

    async getPageList(chapter) {
      const document = await get(baseUrl + chapter.url)
      return document.select(".read-content img").map((img) => ({ url: img.absUrl("data-src") || img.absUrl("src") }))
    },

    getFilterList(): Filter[] {
      const select = (fid: string, name: string, pairs: [string, string][]): Filter => ({ type: "select", id: fid, name, options: pairs.map(([label, value]) => ({ label, value })), selected: 0 })
      return [
        { type: "header", id: "note", name: "Ignored when using text search; Genre takes priority over Category" },
        select("genre", "Genre", [["All", ""], ...genres]),
        select("category", "Category", [["All", ""], ["Completed", "completed"], ["Raw", rawPath]]),
        { type: "select", id: "sort", name: "Sort by", options: [["Default", ""], ["Trending", "trending"], ["Newest", "latest"], ["Rating", "rating"], ["A-Z", "alphabet"]].map(([label, value]) => ({ label, value })), selected: 0, listings: { popular: "trending", latest: "" } },
      ]
    },
  }
}

export default ([["1353606378087565589", "all"], ["6244055465910932489", "en"]] as [string, string][]).map(makeSource)

function imageOf(img: HTMLNode | null): string | undefined {
  return img ? img.absUrl("data-src") || img.absUrl("src") || undefined : undefined
}

function isRaw(manga: { url: string; title: string }): boolean {
  return manga.url.replace(/\/$/, "").endsWith("-raw") || / raw$/i.test(manga.title)
}

/** "09 Oct 2026" or "09 Oct 26" */
function parseChapterDate(text: string | undefined): number | undefined {
  const match = /(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2,4})/.exec(text ?? "")
  if (!match) return undefined
  const month = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(match[2].toLowerCase())
  if (month < 0) return undefined
  const year = Number(match[3])
  return Date.UTC(year < 100 ? 2000 + year : year, month, Number(match[1]))
}

// The site doesn't link its genre pages anywhere, so the filter's genres are this list.
const genres: [string, string][] = [
  ["Action", "genre/action"], ["Adult", "genre/adult"], ["Adventure", "genre/adventure"], ["BL", "genre/bl"], ["Comedy", "genre/comedy"],
  ["Drama", "genre/drama"], ["Ecchi", "genre/ecchi"], ["Family", "genre/family"], ["Fantasy", "genre/fantasy"], ["Gender Bender", "genre/gender-bender"],
  ["GL", "genre/gl"], ["Harem", "genre/harem"], ["Hentai", "genre/hentai"], ["Historical", "genre/historical"], ["Horror", "genre/horror"],
  ["Isekai", "genre/isekai"], ["Josei", "genre/josei"], ["Magic", "genre/magic"], ["Manhua", "genre/manhua"], ["Manhwa", "genre/manhwa"],
  ["Martial Arts", "genre/martial-arts"], ["Mature", "genre/mature"], ["Mystery", "genre/mystery"], ["Psychological", "genre/psychological"],
  ["Romance", "genre/romance"], ["School Life", "genre/school-life"], ["Sci-Fi", "genre/sci-fi"], ["Seinen", "genre/seinen"], ["Shoujo", "genre/shoujo"],
  ["Shounen", "genre/shounen"], ["Slice of Life", "genre/slice-of-life"], ["Smut", "genre/smut"], ["Sports", "genre/sports"],
  ["Supernatural", "genre/supernatural"], ["Thriller", "genre/thriller"], ["Tragedy", "genre/tragedy"], ["Uncensored", "genre/uncensored"],
  ["Yaoi", "genre/yaoi"], ["Yuri", "genre/yuri"],
]
