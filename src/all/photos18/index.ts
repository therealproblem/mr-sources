// Ported from the Keiyoushi "Photos18" extension:
// https://github.com/keiyoushi/extensions-source/tree/main/src/all/photos18
// Licensed under the Apache License, Version 2.0. Its category filter, which the Kotlin version
// fetches from the site, isn't here.

import { fetchHTML, queryString, type HTMLNode, type MangasPage, type Source } from "../../../sdk"

const baseUrl = "https://www.photos18.com"
const withLang = () => (Honya.prefs.get("ZH_HANT") === true ? baseUrl : `${baseUrl}/zh-hans`)

function parseList(document: HTMLNode): MangasPage {
  const items = document.selectFirst("#videos")?.children() ?? []
  const mangas = items.flatMap((item) => {
    const body = item.selectFirst(".card-body")
    const link = body?.selectFirst("a")
    if (!body || !link) return []
    const label = body.selectFirst("label")?.ownText()
    return [{
      url: link.attr("href").replace(/^\/zh-hans/, ""),
      title: link.ownText(),
      thumbnailUrl: baseUrl + (item.selectFirst("img")?.attr("src") ?? ""),
      genres: label ? [label] : [],
      status: "completed" as const,
    }]
  })
  const next = document.selectFirst(".next")
  return { mangas, hasNextPage: next != null && !next.hasClass("disabled") }
}

const sorts: [string, string][] = [["Latest", "created"], ["Popular", "hits"], ["Trend", "views"], ["Recommended", "score"], ["Best", "likes"]]

const source: Source = {
  info: {
    id: "225835804698740720", name: "Photos18", lang: "all", version: "1.0.2", baseUrl, supportsLatest: true, nsfw: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/photos18/res/mipmap-xhdpi/ic_launcher.png",
  },

  async getPopularManga(page) {
    return parseList(await fetchHTML(`${withLang()}/sort/views?page=${page}`))
  },

  async getLatestUpdates(page) {
    return parseList(await fetchHTML(`${withLang()}/?page=${page}`))
  },

  async searchManga(page, query, filters) {
    const sort = filters.find((f) => f.id === "sort")
    const sortValue = sort?.type === "select" ? sort.options[sort.selected]?.value : "views"
    return parseList(await fetchHTML(`${withLang()}?${queryString([["q", query], ["page", page], ["sort", sortValue ?? "views"]])}`))
  },

  async getMangaDetails() {
    return {}
  },

  async getChapterList(manga) {
    return [{ url: manga.url, name: "Gallery", chapterNumber: 0 }]
  },

  async getPageList(chapter) {
    const content = (await fetchHTML(baseUrl + chapter.url)).selectFirst("#content")
    if (!content) throw new Error("The gallery page has changed.")
    return content.select("img").map((img) => ({ url: img.attr("src") }))
  },

  getFilterList() {
    return [{ type: "select", id: "sort", name: "Sort by", options: sorts.map(([label, value]) => ({ label, value })), selected: 2, listings: { popular: "views", latest: "created" } }]
  },
}

export default source
