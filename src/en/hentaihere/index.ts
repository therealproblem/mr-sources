// Ported from the Keiyoushi "HentaiHere" extension:
// https://github.com/keiyoushi/extensions-source/tree/main/src/en/hentaihere
// Licensed under the Apache License, Version 2.0.

import { fetchHTML, queryString, relativeUrl, type Filter, type HTMLNode, type Manga, type MangasPage, type Source } from "../../../sdk"

const baseUrl = "https://hentaihere.com"

const source: Source = {
  info: {
    id: "7266624490370375187",
    name: "HentaiHere",
    lang: "en",
    version: "1.0.1",
    baseUrl,
    supportsLatest: true,
    nsfw: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/hentaihere/res/mipmap-xhdpi/ic_launcher.png",
  },

  getPopularManga(page) {
    return this.searchManga(page, "", filterList())
  },

  async getLatestUpdates(page) {
    return parseMangaList(await fetchHTML(`${baseUrl}/browse/newest/page-${page}`))
  },

  async searchManga(page, query, filters) {
    if (query) {
      return parseMangaList(await fetchHTML(`${baseUrl}/search?${queryString([["q", query], ["page", page]])}`))
    }
    const choice = (id: string, options: [string, string][]) => {
      const filter = filters.find((f) => f.id === id)
      return filter?.type === "select" ? options[filter.selected]?.[0] ?? "" : ""
    }
    const sort = choice("sort", sorts) || "most-viewed"
    const alphabet = choice("alphabet", alphabets)
    const status = choice("status", statuses)
    const category = choice("category", categories)

    let path = category ? `/category/${category.replace(/^t/, "")}` : "/browse"
    if (status) path += `/${status}`
    if (alphabet) path += `/${alphabet}`
    path += `/${sort}`
    if (page > 1) path += `/page-${page}`
    return parseMangaList(await fetchHTML(baseUrl + path))
  },

  async getMangaDetails(manga) {
    return parseDetails(await fetchHTML(mangaUrl(manga)))
  },

  async getChapterList(manga) {
    const document = await fetchHTML(mangaUrl(manga))
    return document.select("#preview-chapter option").map((option) => {
      const name = option.text().replace(/\(latest\)$/, "").trim()
      const number = /Chapter\s+([\d.]+)/.exec(name)?.[1]
      return { url: relativeUrl(option.absUrl("data-read")), name, chapterNumber: number ? Number(number) : -1 }
    })
  },

  async getPageList(chapter) {
    const document = await fetchHTML(baseUrl + chapter.url)
    const data = document.selectFirst("script[data-reader-data]")?.data()
    const images: string[] = data ? JSON.parse(data).images : []
    return images.map((url) => ({ url }))
  },

  getFilterList() {
    return filterList()
  },
}

export default source

function parseMangaList(document: HTMLNode): MangasPage {
  const mangas = document.select("article.card[data-card]").map((element) => ({
    url: relativeUrl(element.selectFirst("a")!.absUrl("href")),
    title: element.selectFirst("h3")!.text(),
    thumbnailUrl: element.selectFirst("img")?.absUrl("src") || undefined,
  }))
  return { mangas, hasNextPage: document.selectFirst("a[rel=next]") != null }
}

function parseDetails(document: HTMLNode): Partial<Manga> {
  const details = document.select("dl[aria-label=Details]")[0]
  const detail = (label: string) => details?.selectFirst(`dt:contains(${label})`)?.nextElementSibling()?.text() || undefined
  const status = detail("Status")?.toLowerCase()
  return {
    title: document.selectFirst("h1#book-title")?.text(),
    author: detail("Artist") ?? detail("Author"),
    genres: document.select("ul[aria-label=Tags] a").map((a) => a.text()),
    status: status === "completed" ? "completed" : status === "ongoing" ? "ongoing" : "unknown",
    thumbnailUrl: document.selectFirst("meta[property=og:image]")?.attr("content") || undefined,
  }
}

/** Old entries stored `/m/<id>`; the site serves `/doujinshi/<id>` now. */
function mangaUrl(manga: Manga): string {
  return baseUrl + manga.url.replace(/^\/m\/(\d+)$/, "/doujinshi/$1")
}

const sorts: [string, string][] = [
  ["newest", "Newest"], ["most-viewed", "Most Read"], ["top-rated", "Highest Rated"], ["yesterday", "Top Yesterday"],
  ["last-week", "Top Last Week"], ["last-month", "Top Last Month"], ["alphabetical", "A to Z"],
]
const alphabets: [string, string][] = [["", "All"], ["0-9", "#"], ..."abcdefghijklmnopqrstuvwxyz".split("").map((c): [string, string] => [c, c.toUpperCase()])]
const statuses: [string, string][] = [["", "All"], ["ongoing", "Ongoing"], ["completed", "Completed"]]
const categories: [string, string][] = [
  ["", "All"],
  ["t34", "Adult"], ["t7", "Anal"], ["t372", "Beastiality"], ["t20", "Big Breasts"], ["t43", "Comedy"], ["t46", "Compilation"],
  ["t42", "Doujinshi"], ["t40", "Ecchi"], ["t6", "Fantasy"], ["t14", "Futanari"], ["t302", "Guro"], ["t31", "Harem"],
  ["t15", "Incest"], ["t2650", "Isekai (Otherworld)"], ["t2158", "Korean Comic"], ["t50", "Licensed"], ["t17", "Lolicon"],
  ["t30", "Mecha"], ["t2503", "No Penetration"], ["t33", "Oneshot"], ["t23", "Rape"], ["t567", "Reverse Harem"],
  ["t41", "Romance"], ["t432", "Scat"], ["t48", "School Life"], ["t5", "Sci-fi"], ["t32", "Serialized"], ["t44", "Shotacon"],
  ["t49", "Tragedy"], ["t47", "Uncensored"], ["t27", "Yaoi"], ["t28", "Yuri"],
]

function filterList(): Filter[] {
  const select = (id: string, name: string, options: [string, string][], selected = 0): Filter =>
    ({ type: "select", id, name, options: options.map(([value, label]) => ({ value, label })), selected })
  return [
    { type: "header", id: "note", name: "Filters below are ignored for text search." },
    select("sort", "Sort", sorts, 1),
    { type: "separator", id: "s1" },
    select("alphabet", "Starts With", alphabets),
    { type: "separator", id: "s2" },
    select("status", "Status", statuses),
    { type: "separator", id: "s3" },
    select("category", "Category", categories),
  ]
}
