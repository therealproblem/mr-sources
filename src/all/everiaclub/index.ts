// Ported from the Keiyoushi "Everia.club" extension:
// https://github.com/keiyoushi/extensions-source/tree/main/src/all/everiaclub
// Licensed under the Apache License, Version 2.0. Its tag filter, which the Kotlin version
// fetches from the site, isn't here.

import { fetchPage, mapLimit, queryString, relativeUrl, send, type HTMLNode, type MangasPage, type Source } from "../../../sdk"

const baseUrl = "https://everia.club"

const imgSrc = (img: HTMLNode) => img.attr("data-lazy-src") || img.attr("data-src") || img.attr("src")
const decode = (text: string) => Yomu.parseHTML(`<body>${text}</body>`).text()

interface WPPost { link: string; title: { rendered: string }; _embedded?: { "wp:featuredmedia"?: { source_url: string }[] } }

async function posts(params: [string, string][]): Promise<MangasPage> {
  const response = await send(`${baseUrl}/wp-json/wp/v2/posts?${queryString(params)}`)
  const total = Number(response.headers["x-wp-totalpages"]) || 0
  const page = Number(params.find(([k]) => k === "page")?.[1]) || 0
  const mangas = (JSON.parse(response.body) as WPPost[]).map((post) => ({
    title: decode(post.title.rendered), url: relativeUrl(post.link), thumbnailUrl: post._embedded?.["wp:featuredmedia"]?.[0]?.source_url,
  }))
  return { mangas, hasNextPage: page < total }
}

const imagesOf = (document: HTMLNode) => document.select(".entry-content img").filter((img) => !img.parent()?.is("noscript")).map(imgSrc)

const categories: [string, string][] = [["Any", ""], ["China", "42"], ["Cosplay", "7"], ["Japan", "2"], ["Korea", "11"], ["Thailand", "1984"]]

const source: Source = {
  info: {
    id: "7698513740234984368", name: "Everia.club", lang: "all", version: "1.0.0", baseUrl, supportsLatest: true, nsfw: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/everiaclub/res/mipmap-xhdpi/ic_launcher.png",
  },

  async getPopularManga() {
    const { document } = await fetchPage(baseUrl)
    const mangas = document.select(".wli_popular_posts-class li").map((e) => {
      const img = e.selectFirst("img")
      return { thumbnailUrl: img ? imgSrc(img) : undefined, title: e.select("h3").map((h) => h.text()).join(" "), url: relativeUrl(e.select("h3 > a")[0]?.absUrl("href") ?? "") }
    })
    return { mangas, hasNextPage: false }
  },

  getLatestUpdates(page) {
    return posts([["page", String(page)], ["per_page", "20"], ["_embed", "wp:featuredmedia"]])
  },

  searchManga(page, query, filters) {
    const params: [string, string][] = [["page", String(page)], ["per_page", "20"], ["_embed", "wp:featuredmedia"]]
    if (query) params.push(["search", query])
    const category = filters.find((f) => f.id === "category")
    if (category?.type === "select" && category.selected !== 0) params.push(["categories", category.options[category.selected].value])
    return posts(params)
  },

  async getMangaDetails(manga) {
    const { document } = await fetchPage(baseUrl + manga.url)
    const title = document.select(".entry-title").map((e) => e.text()).join(" ")
    return { title, description: title, genres: document.select(".post-tags > a").map((a) => a.text()), status: "completed" }
  },

  async getChapterList(manga) {
    const { document, url } = await fetchPage(baseUrl + manga.url)
    const canonical = document.selectFirst("link[rel=\"canonical\"]")?.attr("href") || url
    const date = /(\d{4})\/(\d{2})\/(\d{2})/.exec(canonical)
    return [{ url: relativeUrl(canonical), chapterNumber: -2, name: "Gallery", dateUpload: date ? Date.UTC(Number(date[1]), Number(date[2]) - 1, Number(date[3])) : undefined }]
  },

  async getPageList(chapter) {
    const { document } = await fetchPage(baseUrl + chapter.url)
    const links = [...new Set(document.select(".page-links a.post-page-numbers").map((a) => a.absUrl("href")))]
    const others = await mapLimit(links, 3, async (link) => { try { return imagesOf((await fetchPage(link)).document) } catch { return [] } })
    const urls = [...new Set([imagesOf(document), ...others].flat())]
    return urls.filter((url) => url && !url.startsWith("data:image")).map((url) => ({ url }))
  },

  getFilterList() {
    return [
      { type: "header", id: "h1", name: "NOTE: Category filter can be combined with search." },
      { type: "separator", id: "s1" },
      { type: "select", id: "category", name: "Category", options: categories.map(([label, value]) => ({ label, value })), selected: 0 },
    ]
  },
}

export default source
