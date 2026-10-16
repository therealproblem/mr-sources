// Ported from the Keiyoushi "MangaPill" extension:
// https://github.com/keiyoushi/extensions-source/tree/main/src/en/mangapill
// Licensed under the Apache License, Version 2.0.

import { fetchHTML, queryString, relativeUrl, type HTMLNode, type Manga, type Source } from "../../../sdk"

const baseUrl = "https://mangapill.com"
const genres = ["Action", "Adventure", "Cars", "Comedy", "Dementia", "Demons", "Drama", "Ecchi", "Fantasy", "Game", "Harem", "Hentai", "Historical", "Horror", "Josei", "Kids", "Magic", "Martial Arts", "Mecha", "Military", "Music", "Mystery", "Parody", "Police", "Psychological", "Romance", "Samurai", "School", "Sci-Fi", "Seinen", "Shoujo", "Shoujo Ai", "Shounen", "Shounen Ai", "Slice of Life", "Space", "Sports", "Super Power", "Supernatural", "Thriller", "Vampire", "Yaoi", "Yuri"]

function toManga(element: HTMLNode): Manga[] {
  const link = element.selectFirst("a[href^='/manga/']")
  const title = element.selectFirst("div.line-clamp-2")?.text()
  return link && title ? [{ url: relativeUrl(link.absUrl("href")), title, thumbnailUrl: element.selectFirst("img")?.attr("data-src") || undefined }] : []
}

const source: Source = {
  info: {
    id: "8448310129093543312", name: "MangaPill", lang: "en", version: "1.0.0", baseUrl, supportsLatest: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/mangapill/res/mipmap-xhdpi/ic_launcher.png",
  },

  // The homepage's "Trending Mangas" section.
  async getPopularManga() {
    const document = await fetchHTML(`${baseUrl}/`)
    return { mangas: document.select("div:has(h4:contains(Trending)) > .grid > div:not([class])").flatMap(toManga), hasNextPage: false }
  },

  async getLatestUpdates() {
    const document = await fetchHTML(`${baseUrl}/chapters`)
    return { mangas: document.select(".grid > div:not([class])").flatMap(toManga), hasNextPage: false }
  },

  async searchManga(page, query, filters) {
    const params: [string, string | number][] = [["page", page], ["q", query]]
    for (const filter of filters) {
      if (filter.type === "checkboxes") for (const genre of filter.checked) params.push(["genre", genre])
      if (filter.type === "select") params.push([filter.id, filter.options[filter.selected]?.value ?? ""])
    }
    const document = await fetchHTML(`${baseUrl}/search?${queryString(params)}`)
    return { mangas: document.select(".grid > div:not([class])").flatMap(toManga), hasNextPage: document.selectFirst("a.btn.btn-sm") != null }
  },

  async getMangaDetails(manga) {
    const document = await fetchHTML(baseUrl + manga.url)
    const status = document.select("div.container > div:first-child > div:last-child > div:nth-child(3) > div:nth-child(2) > div").map((e) => e.text()).join(" ").toLowerCase()
    return {
      genres: document.select("a[href*=genre]").map((a) => a.text()),
      status: status.includes("publishing") ? "ongoing" : status.includes("finished") ? "completed" : "unknown",
      description: document.select("div.container > div:first-child > div:last-child > div:nth-child(2) > p").map((p) => p.text()).join(" ") || undefined,
      thumbnailUrl: document.selectFirst("div.container > div:first-child > div:first-child > img")?.attr("data-src") || undefined,
    }
  },

  async getChapterList(manga) {
    const document = await fetchHTML(baseUrl + manga.url)
    return document.select("#chapters > div > a").map((a) => ({ url: relativeUrl(a.absUrl("href")), name: a.text() }))
  },

  async getPageList(chapter) {
    const document = await fetchHTML(baseUrl + chapter.url)
    return document.select("picture img").map((img) => ({ url: img.attr("data-src") }))
  },

  getFilterList() {
    const options = (pairs: [string, string][]) => pairs.map(([label, value]) => ({ label, value }))
    return [
      { type: "header", id: "note", name: "NOTE: Ignored if using text search!" },
      { type: "separator", id: "sep" },
      { type: "select", id: "status", name: "Status", options: options([["All", ""], ["Publishing", "publishing"], ["Finished", "finished"], ["On Hiatus", "on hiatus"], ["Discontinued", "discontinued"], ["Not yet Published", "not yet published"]]), selected: 0 },
      { type: "select", id: "type", name: "Type", options: options([["All", ""], ["Manga", "manga"], ["Novel", "novel"], ["One-Shot", "one-shot"], ["Doujinshi", "doujinshi"], ["Manhwa", "manhwa"], ["Manhua", "manhua"], ["Oel", "oel"]]), selected: 0 },
      // Mihon's genre filter is tri-state but only sends included genres.
      { type: "checkboxes", id: "genre", name: "Genres", options: genres.map((g) => ({ label: g, value: g })), checked: [] },
    ]
  },
}

export default source
