// Ported from the Keiyoushi "CosplayTele" extension:
// https://github.com/keiyoushi/extensions-source/tree/main/src/all/cosplaytele
// Licensed under the Apache License, Version 2.0. Only its built-in categories are here; the
// Kotlin version also fetches the site's tags.

import { fetchJSON, fetchPage, queryString, relativeUrl, unescapeEntities, type HTMLNode, type MangasPage, type Source } from "../../../sdk"

const baseUrl = "https://cosplaytele.com"
const popularLimit = 20

function parseList(document: HTMLNode): MangasPage {
  const mangas = document.select("main div.box").flatMap((e) => {
    const link = e.selectFirst("h5 a")
    return link ? [{ thumbnailUrl: e.selectFirst("img")?.absUrl("src") || undefined, title: link.text(), url: relativeUrl(link.absUrl("href")) }] : []
  })
  return { mangas, hasNextPage: document.selectFirst(".next.page-number") != null }
}

const categories: [string, string][] = [["All", ""], ["Cosplay Nude", "category/nude"], ["Cosplay Ero", "category/no-nude"], ["Cosplay", "category/cosplay"]]

const source: Source = {
  info: {
    id: "7395748658970167454", name: "CosplayTele", lang: "all", version: "1.0.2", baseUrl, supportsLatest: true, nsfw: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/cosplaytele/res/mipmap-xhdpi/ic_launcher.png",
  },

  async getPopularManga(page) {
    const posts = await fetchJSON<{ title: { rendered: string }; link: string; _embedded?: { "wp:featuredmedia"?: { source_url: string }[] } }[]>(
      `${baseUrl}/wp-json/wordpress-popular-posts/v1/popular-posts?${queryString([
        ["offset", page * popularLimit], ["limit", popularLimit], ["range", "last7days"], ["embed", "true"],
        ["_embed", "wp:featuredmedia"], ["_fields", "title,link,_embedded,_links.wp:featuredmedia"],
      ])}`)
    const mangas = posts.map((post) => ({ title: unescapeEntities(post.title.rendered), url: relativeUrl(post.link), thumbnailUrl: post._embedded?.["wp:featuredmedia"]?.[0]?.source_url }))
    return { mangas, hasNextPage: mangas.length >= popularLimit }
  },

  async getLatestUpdates(page) {
    return parseList((await fetchPage(`${baseUrl}/page/${page}/`)).document)
  },

  async searchManga(page, query, filters) {
    const category = filters.find((f) => f.id === "category")
    const path = category?.type === "select" ? category.options[category.selected]?.value : ""
    if (path) return parseList((await fetchPage(`${baseUrl}/${path}/page/${page}${query ? `?${queryString([["s", query]])}` : ""}`)).document)
    if (query) return parseList((await fetchPage(`${baseUrl}/page/${page}/?${queryString([["s", query]])}`)).document)
    return this.getLatestUpdates!(page)
  },

  async getMangaDetails(manga) {
    const { document } = await fetchPage(baseUrl + manga.url)
    const title = document.selectFirst(".entry-title")?.text()
    if (!title) throw new Error("Title is mandatory")
    const tags = document.select("#main a").filter((a) => /.*\/(tag|category)\/.*/.test(a.absUrl("href"))).map((a) => a.text())
    return { title, description: title, genres: tags, status: "completed" }
  },

  async getChapterList(manga) {
    const { document, url } = await fetchPage(baseUrl + manga.url)
    const date = /(\d{4})-(\d{2})-(\d{2})/.exec(document.selectFirst("time.updated")?.attr("datetime") ?? "")
    return [{ name: "Gallery", url: /^https?:\/\/[^/]+([^?#]*)/.exec(url)?.[1] ?? manga.url, dateUpload: date ? Date.UTC(Number(date[1]), Number(date[2]) - 1, Number(date[3])) : undefined }]
  },

  async getPageList(chapter) {
    return (await fetchPage(baseUrl + chapter.url)).document.select(".gallery-item img").map((img) => ({ url: img.absUrl("src") }))
  },

  getFilterList() {
    return [
      { type: "header", id: "h1", name: "NOTE: Only one filter will be applied!" },
      { type: "separator", id: "s1" },
      { type: "select", id: "category", name: "Category", options: categories.map(([label, value]) => ({ label, value })), selected: 0 },
    ]
  },
}

export default source
