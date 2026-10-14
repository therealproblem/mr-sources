// Ported from the Keiyoushi "EveriaClub (unoriginal)" extension:
// https://github.com/keiyoushi/extensions-source/tree/main/src/all/everiaclubcom
// Licensed under the Apache License, Version 2.0.

import { fetchHTML, queryString, relativeUrl, type HTMLNode, type MangasPage, type Source } from "../../../sdk"

const baseUrl = "https://www.everiaclub.com"

const imgSrc = (img: HTMLNode) => ["data-original", "data-lazy-src", "data-src", "src"].map((a) => (img.hasAttr(a) ? img.attr(a) : "")).find(Boolean)
const decode = (text: string) => Honya.parseHTML(`<body>${text.replace(/</g, "&lt;")}</body>`).text()

function mangaFrom(a: HTMLNode) {
  const img = a.selectFirst("img")
  return { url: relativeUrl(a.absUrl("href")), thumbnailUrl: img ? imgSrc(img) : undefined, title: decode(img?.attr("title") ?? "") }
}

async function parseList(url: string): Promise<MangasPage> {
  const document = await fetchHTML(url)
  return { mangas: document.select(".mainleft .leftp > a").map(mangaFrom), hasNextPage: document.selectFirst("li:has(span.current) + li > a") != null }
}

const categories: [string, string][] = [["Any", ""], ["Gravure", "Gravure.html"], ["Japan", "Japan.html"], ["Korea", "Korea.html"], ["Thailand", "Thailand.html"], ["Chinese", "Chinese.html"], ["Cosplay", "Cosplay.html"]]

const source: Source = {
  info: {
    id: "8698756602692547891", name: "EveriaClub (unoriginal)", lang: "all", version: "1.0.0", baseUrl, supportsLatest: true, nsfw: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/everiaclubcom/res/mipmap-xhdpi/ic_launcher.png",
  },

  getLatestUpdates(page) {
    return parseList(`${baseUrl}/?page=${page}`)
  },

  async getPopularManga() {
    return { mangas: (await fetchHTML(baseUrl)).select(".mainright li a").map(mangaFrom), hasNextPage: false }
  },

  searchManga(page, query, filters) {
    const tag = filters.find((f) => f.id === "tag")
    const category = filters.find((f) => f.id === "category")
    if (tag?.type === "text" && tag.value.trim()) return parseList(`${baseUrl}/tags/${encodeURIComponent(tag.value)}/${page}`)
    if (category?.type === "select" && category.selected !== 0) return parseList(`${baseUrl}/${category.options[category.selected].value}?page=${page}`)
    if (query.trim()) return parseList(`${baseUrl}/search/?${queryString([["keyword", query], ["page", page]])}`)
    return parseList(`${baseUrl}/?page=${page}`)
  },

  async getMangaDetails(manga) {
    const document = await fetchHTML(baseUrl + manga.url)
    return { genres: document.select("div.end span:contains(Tags:) ~ a > p.tags").map((p) => p.ownText()), status: "completed" }
  },

  async getChapterList(manga) {
    return [{ url: manga.url, name: "Gallery", chapterNumber: 1 }]
  },

  async getPageList(chapter) {
    const document = await fetchHTML(baseUrl + chapter.url)
    return document.select(".mainleft img").flatMap((img) => { const src = imgSrc(img); return src ? [{ url: src }] : [] })
  },

  getFilterList() {
    return [
      { type: "header", id: "h1", name: "NOTE: Only one filter will be applied!" },
      { type: "separator", id: "s1" },
      { type: "text", id: "tag", name: "Tag", value: "" },
      { type: "select", id: "category", name: "Category", options: categories.map(([label, value]) => ({ label, value })), selected: 0 },
    ]
  },
}

export default source
