// Ported from the Keiyoushi "OSOSEDKI" extension:
// https://github.com/keiyoushi/extensions-source/tree/main/src/all/ososedki
// Licensed under the Apache License, Version 2.0. The Kotlin version retries a missing
// 1280px image at 604px; that fallback isn't here.

import { fetchHTML, fetchJSON, queryString, type HTMLNode, type MangasPage, type Source } from "../../../sdk"

const baseUrl = "https://ososedki.com"
const photoUrl = (albumId: string) => `${baseUrl}/photos/${albumId}`
const imgSrc = (img: HTMLNode | null) => (img ? (img.hasAttr("data-src") ? img.absUrl("data-src") : img.hasAttr("src") ? img.absUrl("src") : undefined) : undefined)
const albumIdOf = (url: string) => {
  const segments = url.replace(/^https?:\/\/[^/]+/, "").split(/[/?#]/).map((s) => s.trim())
  const id = segments[segments.indexOf("photos") + 1]
  return segments.includes("photos") && /^-?\d+_\d+$/.test(id ?? "") ? id : undefined
}
const tags = (document: HTMLNode, selector: string) => [...new Set(document.select(selector).map((a) => a.text().trim()).filter(Boolean))]

async function albums(page: number, type?: string, value?: string): Promise<MangasPage> {
  const data = await fetchJSON<{ html: string; hasMore?: boolean }>(`${baseUrl}/api/albums?${queryString([["page", page], ...(type && value ? [["type", type], ["value", value]] as [string, string][] : [])])}`)
  const document = Rakuen.parseHTML(`<body>${data.html}</body>`, baseUrl)
  const mangas = document.select("article.gallery-item:has(a.gallery-link)").flatMap((item) => {
    const albumId = albumIdOf(item.selectFirst("a.gallery-link")?.absUrl("href") ?? "")
    if (!albumId) return []
    const title = item.selectFirst("h3")?.text().trim() || item.selectFirst("img.gallery-img")?.attr("alt").split(" nude.")[0].trim()
    if (!title) return []
    return [{ url: albumId, title, thumbnailUrl: imgSrc(item.selectFirst("img.gallery-img")), author: item.selectFirst("span.badge:not(.bg-dark)")?.text().trim() || undefined, status: "completed" as const }]
  })
  return { mangas, hasNextPage: data.hasMore ?? false }
}

const source: Source = {
  info: {
    id: "703138310497011533", name: "OSOSEDKI", lang: "all", version: "1.0.0", baseUrl, supportsLatest: true, nsfw: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/ososedki/res/mipmap-xhdpi/ic_launcher.png",
  },

  getPopularManga(page) {
    return albums(page, "top", "1")
  },

  getLatestUpdates(page) {
    return albums(page)
  },

  searchManga(page, query) {
    return query.trim() ? albums(page, "search", query.trim()) : this.getPopularManga(page)
  },

  async getMangaDetails(manga) {
    const document = await fetchHTML(photoUrl(manga.url))
    const models = tags(document, "a[href^=/model/]")
    const cosplays = tags(document, "a[href^=/cosplay/]")
    const fandoms = tags(document, "a[href^=/fandom/]")
    const title = [models[0], cosplays[0], fandoms[0]].filter(Boolean).join(" - ")
      || document.selectFirst("h1")?.text().trim().replace(/\s*\(\d+\s+leaked\s+photos\)\s+from\s+Onlyfans,\s+Patreon\s+and\s+Fansly\s*$/i, "").trim()
    if (!title) throw new Error(`Title is missing for album id: ${manga.url}`)
    const ids = /^(-?\d+)_(\d+)$/.exec(manga.url)
    return {
      title,
      thumbnailUrl: ids ? `${baseUrl}/images/albums/${ids[1]}/${ids[2]}.webp` : imgSrc(document.selectFirst("img.gallery-img")) ?? document.selectFirst("meta[property=og:image]")?.attr("content"),
      author: models.join(", ") || undefined,
      artist: cosplays.join(", ") || undefined,
      genres: [...new Set([...models, ...cosplays, ...fandoms])],
      status: "completed",
    }
  },

  async getChapterList(manga) {
    const document = await fetchHTML(photoUrl(manga.url))
    const jsonLd = document.select("script[type=application/ld+json]").map((s) => s.data()).find((d) => d.includes("\"datePublished\":\""))
    const published = jsonLd ? /"datePublished":"([^"]+)"/.exec(jsonLd)?.[1] : undefined
    return [{ url: manga.url, name: "Gallery", chapterNumber: 0, dateUpload: published ? Date.parse(published) || undefined : undefined }]
  },

  async getPageList(chapter) {
    const document = await fetchHTML(photoUrl(chapter.url))
    const pageNumber = (url: string) => Number(url.split("/").pop()?.split(".")[0]) || Number.MAX_SAFE_INTEGER
    const urls = [...new Set(document.select("#photos a[href^=/images/], #photos a[href^=https://ososedki.com/images/]").map((a) => a.absUrl("href")).filter(Boolean))]
    return urls.sort((a, b) => pageNumber(a) - pageNumber(b)).map((url) => ({ url }))
  },
}

export default source
