// Ported from the Keiyoushi "Xiutaku" extension:
// https://github.com/keiyoushi/extensions-source/tree/main/src/all/xiutaku
// Licensed under the Apache License, Version 2.0.

import { fetchPage, fetchHTML, queryString, type HTMLNode, type MangasPage, type Source } from "../../../sdk"

const baseUrl = "https://xiutaku.com"

function parseList(document: HTMLNode): MangasPage {
  const mangas = document.select(".blog > div").flatMap((e) => {
    const link = e.selectFirst(".item-content .item-link")
    if (!link) return []
    return [{ title: link.text(), thumbnailUrl: e.selectFirst("img")?.absUrl("src") || undefined, url: link.absUrl("href").replace(baseUrl, "") }]
  })
  return { mangas, hasNextPage: document.selectFirst(".pagination-next:not([disabled])") != null }
}

/** "13:45 2-7-2024" */
function parseDate(text: string | undefined): number | undefined {
  const match = /(\d{1,2}):(\d{2})\s+(\d{1,2})-(\d{1,2})-(\d{4})/.exec(text ?? "")
  return match ? Date.UTC(Number(match[5]), Number(match[4]) - 1, Number(match[3]), Number(match[1]), Number(match[2])) : undefined
}

const source: Source = {
  info: {
    id: "6520733892888572506", name: "Xiutaku", lang: "all", version: "1.0.0", baseUrl, supportsLatest: true, nsfw: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/xiutaku/res/mipmap-xhdpi/ic_launcher.png",
    rateLimits: [{ host: "xiutaku.com", permits: 10, periodMs: 1000 }],
  },

  async getPopularManga(page) {
    return parseList(await fetchHTML(`${baseUrl}/hot?start=${20 * (page - 1)}`))
  },

  async getLatestUpdates(page) {
    return parseList(await fetchHTML(`${baseUrl}/?start=${20 * (page - 1)}`))
  },

  async searchManga(page, query) {
    return parseList(await fetchHTML(`${baseUrl}/?${queryString([["search", query], ["start", 20 * (page - 1)]])}`))
  },

  async getMangaDetails(manga) {
    const document = await fetchHTML(baseUrl + manga.url)
    const title = document.selectFirst(".article-header")?.text()
    if (!title) throw new Error("Title is mandatory")
    return {
      title,
      description: document.selectFirst(".article-info:not(:has(small))")?.text(),
      genres: document.selectFirst(".article-tags")?.select(".tags > .tag").map((t) => t.text().replace(/^#/, "")),
      status: "completed",
    }
  },

  async getChapterList(manga) {
    const { document, url } = await fetchPage(baseUrl + manga.url)
    const dateUpload = parseDate(document.selectFirst(".article-info > small")?.text().replace(/^🕒/, ""))
    const maxPage = Number(document.selectFirst(".pagination-list > span:last-child > a")?.text()) || 1
    const base = url.split("?")[0].replace(baseUrl, "")
    return Array.from({ length: maxPage }, (_, i) => maxPage - i).map((page) => ({ url: `${base}?page=${page}`, name: `Page ${page}`, dateUpload }))
  },

  async getPageList(chapter) {
    return (await fetchHTML(baseUrl + chapter.url)).select(".article-fulltext img").map((img) => ({ url: img.absUrl("src") }))
  },
}

export default source
