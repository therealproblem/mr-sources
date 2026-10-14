// Ported from the Keiyoushi "FoamGirl" extension:
// https://github.com/keiyoushi/extensions-source/tree/main/src/all/foamgirl
// Licensed under the Apache License, Version 2.0.

import { fetchHTML, queryString, relativeUrl, type HTMLNode, type MangasPage, type Source } from "../../../sdk"

const baseUrl = "https://foamgirl.net"

function parseList(document: HTMLNode): MangasPage {
  const mangas = document.select(".update_area .i_list").map((e) => ({
    thumbnailUrl: e.select("img")[0]?.attr("data-original") || undefined,
    title: e.select("a.meta-title").map((a) => a.text()).join(" "),
    url: relativeUrl(e.select("a")[0]?.attr("href") ?? ""),
  }))
  return { mangas, hasNextPage: document.selectFirst("a.next") != null }
}

const source: Source = {
  info: {
    id: "5874068195320206396", name: "FoamGirl", lang: "all", version: "1.0.1", baseUrl, supportsLatest: false, nsfw: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/foamgirl/res/mipmap-xhdpi/ic_launcher.png",
    rateLimits: [{ host: "foamgirl.net", permits: 3, periodMs: 1000 }],
  },

  async getPopularManga(page) {
    return parseList(await fetchHTML(`${baseUrl}/page/${page}`))
  },

  async searchManga(page, query) {
    return parseList(await fetchHTML(`${baseUrl}/page/${page}?${queryString([["post_type", "post"], ["s", query]])}`))
  },

  async getMangaDetails() {
    return {}
  },

  async getChapterList(manga) {
    const document = await fetchHTML(baseUrl + manga.url)
    const date = /(\d{4})\.(\d{1,2})\.(\d{1,2})/.exec(document.select("span.image-info-time").map((s) => s.text()).join(" "))
    return [{
      url: relativeUrl(document.select("link[rel=canonical]")[0]?.absUrl("href") ?? manga.url),
      chapterNumber: 0,
      name: "GALLERY",
      dateUpload: date ? Date.UTC(Number(date[1]), Number(date[2]) - 1, Number(date[3])) : undefined,
    }]
  },

  async getPageList(chapter) {
    const pages: { url: string }[] = []
    let document = await fetchHTML(baseUrl + chapter.url)
    for (;;) {
      document.select(".imageclick-imgbox").forEach((e) => pages.push({ url: e.absUrl("href") }))
      const next = document.selectFirst(".page-numbers[title=Next page]")?.absUrl("href")
      if (!next || !/\d+_\d+/.test(next)) break
      document = await fetchHTML(next)
    }
    return pages
  },
}

export default source
