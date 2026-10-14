// Ported from the Keiyoushi "Buon Dua" extension (v1.6.11):
// https://github.com/keiyoushi/extensions-source/tree/main/src/all/buondua
// Licensed under the Apache License, Version 2.0.

import { fetchPage, mapLimit, queryParam, queryString, relativeUrl, type HTMLNode, type MangasPage, type Source } from "../../../sdk"

const baseUrl = "https://buondua.com"
const splitPages = () => (Honya.prefs.get("pref_split_pages") as boolean | null) ?? true

async function parseList(url: string): Promise<MangasPage> {
  const { document } = await fetchPage(url)
  const mangas = document.select(".blog > div").flatMap((e) => {
    const link = e.selectFirst(".item-content .item-link")
    return link ? [{ thumbnailUrl: e.selectFirst("img")?.absUrl("src") || undefined, title: link.text(), url: relativeUrl(link.absUrl("href")) }] : []
  })
  return { mangas, hasNextPage: document.selectFirst(".pagination-next:not([disabled])") != null }
}

/** The gallery's last page, from the "next" link of its pagination. */
function lastPage(document: HTMLNode): number {
  const links = document.select("nav.pagination:first-of-type a.pagination-next")
  const href = links[links.length - 1]?.absUrl("href")
  return (href?.startsWith("http") && Number(queryParam(href, "page"))) || 1
}

const withPage = (url: string, page: number) => {
  const [path, query = ""] = url.split("?")
  const params = query.split("&").filter((p) => p && !p.startsWith("page="))
  return `${path}?${[...params, `page=${page}`].join("&")}`
}

/** "13:45 02-07-2024" */
function parseDate(text: string | undefined): number | undefined {
  const match = /(\d{1,2}):(\d{2})\s+(\d{1,2})-(\d{1,2})-(\d{4})/.exec(text ?? "")
  return match ? new Date(Number(match[5]), Number(match[4]) - 1, Number(match[3]), Number(match[1]), Number(match[2])).getTime() : undefined
}

const pageImages = (document: HTMLNode) => document.select(".article-fulltext img").map((img) => img.absUrl("src"))

const source: Source = {
  info: {
    id: "1435103006121310663", name: "Buon Dua", lang: "all", version: "1.0.1", baseUrl, supportsLatest: true, nsfw: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/buondua/res/mipmap-xhdpi/ic_launcher.png",
    rateLimits: [{ host: "buondua.com", permits: 10, periodMs: 1000 }],
  },

  getLatestUpdates(page) {
    return parseList(`${baseUrl}/?start=${20 * (page - 1)}`)
  },

  getPopularManga(page) {
    return parseList(`${baseUrl}/hot?start=${20 * (page - 1)}`)
  },

  searchManga(page, query, filters) {
    const tag = filters.find((f) => f.id === "tag")
    if (query) return parseList(`${baseUrl}/?${queryString([["search", query], ["start", 20 * (page - 1)]])}`)
    if (tag?.type === "text" && tag.value) return parseList(`${baseUrl}/tag/${tag.value}&start=${20 * (page - 1)}`)
    return this.getPopularManga(page)
  },

  async getMangaDetails(manga) {
    const { document } = await fetchPage(baseUrl + manga.url)
    const info = document.select(".article-info > strong").map((s) => s.text()).join(" ").replace("Buondua", "").trim()
    const password = document.select("code").map((c) => c.text()).join(" ")
    const links = document.select(".article-links a[href]").map((a) => `[${a.text()}](${a.attr("href")})`).join("\n")
    return {
      title: document.selectFirst(".article-header")?.text().replace(/ - \( Page \d+ \/ \d+ \)/, "").trim(),
      description: [info, links, password].filter((part) => part.trim()).join("\n\n"),
      genres: document.selectFirst(".article-tags")?.select(".tags > .tag").map((t) => t.text().split("#").pop() ?? ""),
    }
  },

  async getChapterList(manga) {
    const { document, url } = await fetchPage(baseUrl + manga.url)
    const dateUpload = parseDate(document.selectFirst(".article-info > small")?.text())
    if (!splitPages()) return [{ chapterNumber: 0, url: relativeUrl(url), name: "Gallery", dateUpload }]
    const max = lastPage(document)
    return Array.from({ length: max }, (_, i) => max - i).map((page) => ({
      url: relativeUrl(withPage(url, page)), name: `Page ${page}`, chapterNumber: page, dateUpload,
    }))
  },

  async getPageList(chapter) {
    const { document, url } = await fetchPage(baseUrl + chapter.url)
    if (splitPages()) return pageImages(document).map((src) => ({ url: src }))
    const pages = Array.from({ length: lastPage(document) }, (_, i) => i + 1)
    const images = await mapLimit(pages, 4, async (page) => (page === 1 ? pageImages(document) : pageImages((await fetchPage(withPage(url, page))).document)))
    return images.flat().map((src) => ({ url: src }))
  },

  getFilterList() {
    return [
      { type: "header", id: "h1", name: "NOTE: Ignored if using text search!" },
      { type: "separator", id: "s1" },
      { type: "text", id: "tag", name: "Tag ID", value: "" },
    ]
  },
}

export default source
