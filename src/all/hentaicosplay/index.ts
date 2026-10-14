// Ported from the Keiyoushi "Hentai Cosplay" extension:
// https://github.com/keiyoushi/extensions-source/tree/main/src/all/hentaicosplay
// Licensed under the Apache License, Version 2.0. Its tag filter, which the Kotlin version
// fetches from the site, isn't here.

import { fetchPage, relativeUrl, type HTMLNode, type MangasPage, type Source } from "../../../sdk"

const baseUrl = "https://hentai-cosplay-xxx.com"
/** Listing dates, kept for the chapter. */
const dates = new Map<string, string>()

function parseList(document: HTMLNode): MangasPage {
  const httpsCover = (img: HTMLNode | null) => img?.absUrl("src").replace("http://", "https://") || undefined
  if (document.selectFirst("div.image-list-item") == null) {
    const mangas = document.select("#entry_list > li > a[href*=/image/]").map((a) => {
      const url = relativeUrl(a.absUrl("href"))
      const posted = a.selectFirst("span.posted")?.text()
      if (posted) dates.set(url, posted)
      return { url, thumbnailUrl: httpsCover(a.selectFirst("img")), title: a.selectFirst("span:not(.posted)")?.text() ?? "" }
    })
    return { mangas, hasNextPage: document.selectFirst("a.paginator_page[rel=next]") != null }
  }
  const mangas = document.select("div.image-list-item:has(a[href*=/image/])").map((e) => {
    const url = relativeUrl(e.selectFirst("a")!.absUrl("href"))
    const posted = e.selectFirst(".image-list-item-regist-date")?.text()
    if (posted) dates.set(url, posted)
    return { url, thumbnailUrl: httpsCover(e.selectFirst("img")), title: e.select(".image-list-item-title").map((t) => t.text()).join(" ") }
  })
  return { mangas, hasNextPage: document.selectFirst("div.wp-pagenavi > a[rel=next]") != null }
}

const list = async (url: string) => parseList((await fetchPage(url)).document)

const source: Source = {
  info: {
    id: "3422463439145930309", name: "Hentai Cosplay", lang: "all", version: "1.0.1", baseUrl, supportsLatest: true, nsfw: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/hentaicosplay/res/mipmap-xhdpi/ic_launcher.png",
  },

  getPopularManga(page) {
    return list(`${baseUrl}/ranking/page/${page}/`)
  },

  getLatestUpdates(page) {
    return list(`${baseUrl}/search/page/${page}/`)
  },

  searchManga(page, query) {
    return list(query ? `${baseUrl}/search/keyword/${encodeURIComponent(query.trim()).replace(/%20/g, "+")}/page/${page}/` : `${baseUrl}/search/page/${page}/`)
  },

  async getMangaDetails(manga) {
    const { document } = await fetchPage(baseUrl + manga.url)
    return { genres: document.select("#detail_tag a[href*=/tag/]").map((a) => a.text()), status: "completed" }
  },

  async getChapterList(manga) {
    const date = /(\d{4})\/(\d{1,2})\/(\d{1,2})/.exec(dates.get(manga.url) ?? "")
    return [{
      name: "Gallery",
      url: manga.url.replace("/image/", "/story/"),
      dateUpload: date ? Date.UTC(Number(date[1]), Number(date[2]) - 1, Number(date[3])) : undefined,
    }]
  },

  async getPageList(chapter) {
    const { document } = await fetchPage(baseUrl + chapter.url)
    return document.select("amp-img[src*=upload]:not(.related-thumbnail)").map((img) => ({ url: img.attr("src") }))
  },
}

export default source
