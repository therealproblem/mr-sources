// Ported from the Keiyoushi "Only The Best Hentai" extension:
// https://github.com/keiyoushi/extensions-source/tree/main/src/en/onlythebesthentai
// Licensed under the Apache License, Version 2.0. Its taxonomy filters, which the Kotlin
// version fetches from the site, aren't here.

import { queryString, relativeUrl, send, type HTMLNode, type MangasPage, type Source } from "../../../sdk"

const baseUrl = "https://onlythebesthentai.com"

/** The page, unless the site's bot check answered instead. */
async function load(url: string): Promise<{ document: HTMLNode; url: string }> {
  const response = await send(url)
  const head = response.body.slice(0, 512)
  if (head.includes("One moment, please") || head.includes("wsidchk")) {
    throw new Error("Bot protection detected. Open this source in the web view to pass the check, then try again.")
  }
  return { document: Honya.parseHTML(response.body, response.url), url: response.url }
}

async function parseList(url: string): Promise<MangasPage> {
  const { document } = await load(url)
  const mangas = document.select("article.post").flatMap((e) => {
    const a = e.selectFirst(".blog-entry-title a, .entry-title a")
    if (!a) return []
    return [{ url: relativeUrl(a.absUrl("href")), title: a.text().replace(/\s*\[\d+]\s*$/, "").trim(), thumbnailUrl: e.selectFirst(".nv-post-thumbnail-wrap img")?.absUrl("src") || undefined }]
  })
  return { mangas, hasNextPage: document.selectFirst("a.next.page-numbers") != null }
}

const tagsLabeled = (document: HTMLNode, label: string) =>
  document.select(`.manga-tags-container:has(.manga-tags-label:containsOwn(${label})) .tag-button`).map((e) => e.text())

/** The largest image in a srcset, else src. */
function bestImage(img: HTMLNode): string {
  const best = img.attr("srcset").split(",").map((entry) => entry.trim().split(/\s+/))
    .filter((parts) => parts[0])
    .sort((a, b) => (Number(b[1]?.replace(/w$/, "")) || 0) - (Number(a[1]?.replace(/w$/, "")) || 0))[0]
  return best?.[0] || img.absUrl("src")
}

const source: Source = {
  info: {
    id: "5862792365006156918", name: "Only The Best Hentai", lang: "en", version: "1.0.1", baseUrl, supportsLatest: false, nsfw: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/onlythebesthentai/res/mipmap-xhdpi/ic_launcher.png",
  },

  getPopularManga(page) {
    return parseList(`${baseUrl}/${page > 1 ? `page/${page}/` : ""}`)
  },

  searchManga(page, query) {
    if (query.trim()) return parseList(`${baseUrl}/?${queryString([["s", query], ...(page > 1 ? [["paged", String(page)] as [string, string]] : [])])}`)
    return this.getPopularManga(page)
  },

  async getMangaDetails(manga) {
    const { document } = await load(baseUrl + manga.url)
    const lines: string[] = []
    const parodies = tagsLabeled(document, "Parody")
    if (parodies.length) lines.push(`Parody: ${parodies.join(", ")}`)
    const characters = tagsLabeled(document, "Characters")
    if (characters.length) lines.push(`Characters: ${characters.join(", ")}`)
    const pages = document.select(".manga-tags-container:has(.manga-tags-label:containsOwn(Pages))")[0]?.text().replace(/\D/g, "")
    if (pages) lines.push(`Pages: ${pages}`)
    const body = document.selectFirst(".manga-info p")?.text().replace(/^Description:/, "").trim()
    return {
      title: document.selectFirst("h1.manga-title")?.text(),
      thumbnailUrl: document.selectFirst(".manga-box .manga-img img")?.absUrl("src") || undefined,
      genres: tagsLabeled(document, "Tags"),
      author: tagsLabeled(document, "Artist").join(", ") || undefined,
      description: (lines.join("\n") + (body ? `${lines.length ? "\n\n" : ""}${body}` : "")).trim(),
      status: "completed",
    }
  },

  async getChapterList(manga) {
    const { document, url } = await load(baseUrl + manga.url)
    const pageCount = document.select(".manga-tags-container").map((c) => {
      const label = c.selectFirst(".manga-tags-label")?.text()
      return label?.startsWith("Pages") ? Number(c.text().replace(/\D/g, "")) || undefined : undefined
    }).find((n) => n != null)
    const published = document.selectFirst("meta[property=article:published_time]")?.attr("content")
    return [{
      url: relativeUrl(url),
      name: pageCount != null ? `Chapter [${pageCount} pages]` : "Chapter",
      chapterNumber: 1,
      dateUpload: published ? Date.parse(published) || undefined : undefined,
    }]
  },

  async getPageList(chapter) {
    const { document } = await load(baseUrl + chapter.url)
    return document.select(".manga-gallery-wrapper figure.wp-block-image img").map((img) => ({ url: bestImage(img) }))
  },
}

export default source
