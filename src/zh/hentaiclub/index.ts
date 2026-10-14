// Ported from the Keiyoushi "Shenshi Huisuo" (绅士会所) extension:
// https://github.com/keiyoushi/extensions-source/tree/main/src/zh/hentaiclub
// Licensed under the Apache License, Version 2.0.

import { fetchHTML, fetchPage, relativeUrl, type MangasPage, type Source } from "../../../sdk"

const baseUrl = "https://www.hentaiclub.net"

async function parseList(url: string): Promise<MangasPage> {
  const document = await fetchHTML(url)
  const mangas = document.select("div.item").map((e) => {
    const img = e.selectFirst("img.item-img")
    return {
      url: relativeUrl(e.selectFirst("a.item-link")!.absUrl("href")),
      title: e.selectFirst(".item-link-text")!.text(),
      thumbnailUrl: img ? img.absUrl("data-original") || img.absUrl("src") : undefined,
    }
  })
  return { mangas, hasNextPage: mangas.length >= 24 }
}

const source: Source = {
  info: {
    id: "8618065660246087865", name: "绅士会所", lang: "zh", version: "1.0.0", baseUrl, supportsLatest: false, nsfw: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/zh/hentaiclub/res/mipmap-xhdpi/ic_launcher.png",
    rateLimits: [{ host: "www.hentaiclub.net", permits: 2, periodMs: 1000 }],
  },

  getPopularManga(page) {
    return parseList(page === 1 ? `${baseUrl}/` : `${baseUrl}/page/${page}/`)
  },

  async searchManga(page, query, filters) {
    if (query.trim()) {
      const search = `${baseUrl}/search/${encodeURIComponent(query.trim())}`
      return parseList(page > 1 ? `${search}/${page}/` : `${search}/`)
    }
    const tag = filters.find((f) => f.id === "tag")
    if (tag?.type === "text" && tag.value.trim()) {
      const base = `${baseUrl}/tag/${encodeURIComponent(tag.value.trim())}/`
      return parseList(page > 1 ? `${base}${page}/` : base)
    }
    const sort = filters.find((f) => f.id === "sort")
    if (sort?.type === "select" && sort.selected > 0) return parseList(`${baseUrl}/sort/${sort.options[sort.selected].value}.html`)
    return this.getPopularManga(page)
  },

  async getMangaDetails(manga) {
    const { document, url } = await fetchPage(baseUrl + manga.url)
    const content = document.selectFirst(".content")
    const tags = content?.select("a[href*=/tag/]") ?? []
    const views = /浏览[：:]\s*(\d+)次/.exec(content?.text() ?? "")?.[1]
    return {
      title: (document.selectFirst("title")?.text() ?? "").split(" - 绅士会所")[0],
      thumbnailUrl: content?.selectFirst("div.post-item[data-src]")?.absUrl("data-src") || undefined,
      author: tags[0]?.text(),
      genres: tags.map((a) => a.text()),
      description: views ? `浏览量：${views}次` : undefined,
      status: url.includes("/r18/") ? "completed" : "ongoing",
    }
  },

  async getChapterList(manga) {
    return [{ url: manga.url, name: "章节 1" }]
  },

  async getPageList(chapter) {
    return (await fetchHTML(baseUrl + chapter.url)).select("div.post-item[data-src]").map((e) => ({ url: e.absUrl("data-src") }))
  },

  getFilterList() {
    return [
      { type: "select", id: "sort", name: "分类", options: [{ label: "全部", value: "" }, { label: "R-15", value: "r15" }, { label: "R-18", value: "r18" }], selected: 0 },
      { type: "text", id: "tag", name: "标签 (输入标签名)", value: "" },
    ]
  },
}

export default source
