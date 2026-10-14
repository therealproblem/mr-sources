// Ported from the Keiyoushi "Kiutaku" extension:
// https://github.com/keiyoushi/extensions-source/tree/main/src/all/kiutaku
// Licensed under the Apache License, Version 2.0.

import { fetchHTML, queryString, relativeUrl, type HTMLNode, type MangasPage, type Source } from "../../../sdk"

const baseUrl = "https://kiutaku.com"
const offset = (page: number) => (page - 1) * 20

function parseList(document: HTMLNode): MangasPage {
  const mangas = document.select("div.blog > div.items-row").map((e) => ({
    url: relativeUrl(e.selectFirst("a.item-link")!.absUrl("href")),
    thumbnailUrl: e.selectFirst("img")?.absUrl("src") || undefined,
    title: e.selectFirst("h2")?.text() ?? "Cosplay",
  }))
  return { mangas, hasNextPage: document.selectFirst("nav > a.pagination-next:not([disabled])") != null }
}

const source: Source = {
  info: {
    id: "3040035304874076216", name: "Kiutaku", lang: "all", version: "1.0.0", baseUrl, supportsLatest: true, nsfw: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/kiutaku/res/mipmap-xhdpi/ic_launcher.png",
    // The image host (mitaku.net) refuses a kiutaku.com Referer.
    imageHeaders: { Referer: "" },
  },

  async getPopularManga(page) {
    return parseList(await fetchHTML(`${baseUrl}/hot?start=${offset(page)}`))
  },

  async getLatestUpdates(page) {
    return parseList(await fetchHTML(`${baseUrl}/?start=${offset(page)}`))
  },

  async searchManga(page, query) {
    return parseList(await fetchHTML(`${baseUrl}/?${queryString([["search", query], ["start", offset(page)]])}`))
  },

  async getMangaDetails(manga) {
    const document = await fetchHTML(baseUrl + manga.url)
    return {
      title: document.selectFirst("div.article-header")?.text(),
      genres: document.selectFirst("div.article-tags")?.select("a.tag > span").map((s) => s.text().replace(/^#+/, "")),
      status: "completed",
    }
  },

  async getChapterList(manga) {
    const document = await fetchHTML(baseUrl + manga.url)
    return document.select("nav.pagination:first-of-type a").map((a) => ({
      url: relativeUrl(a.absUrl("href")),
      name: `Page ${a.text()}`,
      chapterNumber: Number(a.text()) || 1,
    })).reverse()
  },

  async getPageList(chapter) {
    return (await fetchHTML(baseUrl + chapter.url)).select("div.article-fulltext img[src]").map((img) => ({ url: img.absUrl("src") }))
  },
}

export default source
