// Ported from the Keiyoushi "JJCOS" extension:
// https://github.com/keiyoushi/extensions-source/tree/main/src/all/jjcos
// Licensed under the Apache License, Version 2.0.

import { fetchJSON, fetchPage, queryString, type MangasPage, type Source } from "../../../sdk"

const baseUrl = "https://jjcos.com"
const pageSize = 20

interface PostDto { title: string; link: string; feature?: string; content?: string }

/** This source keeps its paths percent-encoded, as the Kotlin version stores them. */
function encodedPath(link: string): string {
  const clean = link.trim().split("?")[0].split("#")[0]
  const absolute = /^https?:\/\//.test(clean) ? clean : `${baseUrl}${clean.startsWith("/") ? "" : "/"}${clean}`
  const path = /^https?:\/\/[^/]+(\/[^?#]*)?/.exec(absolute)?.[1] || "/"
  return encodeURI(decodeURI(path.replace(/ /g, "%20")))
}

function toPage(posts: PostDto[], page: number): MangasPage {
  const start = (Math.max(1, page) - 1) * pageSize
  if (start >= posts.length) return { mangas: [], hasNextPage: false }
  const end = Math.min(posts.length, start + pageSize)
  const mangas = posts.slice(start, end).map((post) => {
    if (!post.title.trim()) throw new Error(`Missing title in ${post.link}`)
    return { title: post.title.trim(), thumbnailUrl: post.feature, status: "completed" as const, url: encodedPath(post.link) }
  })
  return { mangas, hasNextPage: end < posts.length }
}

const index = (page: number, query?: string) =>
  fetchJSON<{ posts: PostDto[] }>(`${baseUrl}/api/index.html?${queryString([["page", page], ...(query?.trim() ? [["query", query] as [string, string]] : [])])}`)

const source: Source = {
  info: {
    id: "5763134940669279175", name: "JJCOS", lang: "all", version: "1.0.0", baseUrl, supportsLatest: false, nsfw: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/jjcos/res/mipmap-xhdpi/ic_launcher.png",
  },

  async getPopularManga(page) {
    return toPage((await index(page)).posts, page)
  },

  async searchManga(page, query) {
    const { posts } = await index(page, query)
    const needle = query.trim().toLowerCase()
    return toPage(needle ? posts.filter((p) => p.title.toLowerCase().includes(needle) || p.content?.toLowerCase().includes(needle)) : posts, page)
  },

  async getMangaDetails(manga) {
    const { document } = await fetchPage(baseUrl + manga.url)
    const title = document.selectFirst("h1.fh5co-article-title")?.text().replace(/ - JJCOS$/, "").trim()
    if (!title) throw new Error("Title is mandatory")
    return {
      title,
      thumbnailUrl: document.selectFirst("#post-content img, article img")?.absUrl("src") || undefined,
      genres: [...new Set(document.select(".tag-container a.tag").map((a) => a.text().replace(/^#/, "").trim()).filter(Boolean))],
      status: "completed",
    }
  },

  async getChapterList(manga) {
    const { document, url } = await fetchPage(baseUrl + manga.url)
    const raw = document.selectFirst("meta[property=article:published_time]")?.attr("content") ?? document.selectFirst(".breadcrumb-item.date-overlay")?.text()
    const date = /(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2}))?/.exec(raw ?? "")
    return [{
      url: encodedPath(url),
      name: "Gallery",
      dateUpload: date ? new Date(Number(date[1]), Number(date[2]) - 1, Number(date[3]), Number(date[4] ?? 0), Number(date[5] ?? 0), Number(date[6] ?? 0)).getTime() : undefined,
    }]
  },

  async getPageList(chapter) {
    const { document } = await fetchPage(baseUrl + chapter.url)
    const urls = document.select("#post-content img, article #post-content img, article p img").map((img) => (img.absUrl("src") || img.absUrl("data-src")).trim()).filter(Boolean)
    return [...new Set(urls)].map((url) => ({ url }))
  },
}

export default source
