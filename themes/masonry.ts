// Ported from Keiyoushi's "masonry" multisrc theme (Apache License 2.0):
// https://github.com/keiyoushi/extensions-source/tree/main/lib-multisrc/masonry
// Its tag filter, which the Kotlin theme fetches from the site, isn't here.

import { absoluteUrl, fetchHTML, queryString, relativeUrl, type Filter, type HTMLNode, type Manga, type MangasPage, type Source, type SourceInfo } from "../sdk"

/** The first image attribute with a value (an empty srcset would resolve to the page itself). */
const imgAttr = (img: HTMLNode, baseUrl: string) => {
  for (const name of ["srcset", "data-cfsrc", "data-src", "data-lazy-src", "src"]) {
    const value = img.attr(name).trim().split(/\s+/)[0]
    if (value) return absoluteUrl(value, baseUrl)
  }
  return undefined
}

function mangaFrom(figure: HTMLNode, baseUrl: string): Manga[] {
  const a = figure.selectFirst("a")
  // Some galleries have no title; the card then shows only the models.
  const title = a?.attr("title") || figure.select("a[href*=/model/]").map((m) => m.text()).join(", ")
  // Search results can mix in links to tag and model pages.
  if (!a || !title || /^\/(tag|model|collection)s?\//.test(relativeUrl(a.absUrl("href")))) return []
  const img = figure.selectFirst("img")
  return [{ url: relativeUrl(a.absUrl("href")), title, thumbnailUrl: img ? imgAttr(img, baseUrl) : undefined }]
}

export function masonry(info: SourceInfo): Source {
  const baseUrl = info.baseUrl

  /** The site's grid API, which its listings and filter panel load from, 20 a page. */
  async function grid(page: number, content: string, sort: string): Promise<MangasPage> {
    const figures = (await fetchHTML(`${baseUrl}/gridapi/?${queryString([["content", content], ["sort", sort], ["mpage", page]])}`)).select("figure")
    return { mangas: figures.filter((f) => !f.selectFirst(".icon-play")).flatMap((f) => mangaFrom(f, baseUrl)), hasNextPage: figures.length >= 20 }
  }

  return {
    info: { ...info, supportsLatest: true },

    getPopularManga: (page) => grid(page, "updates", "trending"),

    getLatestUpdates: (page) => grid(page, "updates", "newest"),

    async searchManga(page, query, filters) {
      if (query.trim()) {
        const document = await fetchHTML(`${baseUrl}/search/post/${encodeURIComponent(query.trim())}/mpage/${page}/`)
        const mangas = document.select(".list-gallery:not(.static) figure:not(:has(.icon-play))").flatMap((f) => mangaFrom(f, baseUrl))
        return { mangas, hasNextPage: document.selectFirst(".pagination-a li.next") != null }
      }
      const value = (id: string) => {
        const filter = filters.find((f) => f.id === id)
        return (filter?.type === "select" && filter.options[filter.selected]?.value) || "0"
      }
      // Same field order as the site's filter panel.
      return grid(page, JSON.stringify({ content: "pix", quality: value("quality"), label: "0", ord: value("order") }), "filter")
    },

    async getMangaDetails(manga) {
      const document = await fetchHTML(baseUrl + manga.url)
      const links = document.selectFirst("p.link-btn")
      return {
        artist: links?.select("a[href*=/model/]").map((a) => a.text()).join(", ") || undefined,
        genres: links?.select("a[href*=/tag/]").map((a) => a.text()),
        author: links?.selectFirst("a")?.text(),
        description: document.selectFirst("#content > p")?.text(),
        status: "completed",
      }
    },

    async getChapterList(manga) {
      return [{ name: "Gallery", url: manga.url }]
    },

    async getPageList(chapter) {
      return (await fetchHTML(baseUrl + chapter.url)).select(".list-gallery a[href^=https://cdn.]").map((a) => ({ url: a.absUrl("href") }))
    },

    getFilterList(): Filter[] {
      const options = (pairs: [string, string][]) => pairs.map(([label, value]) => ({ label, value }))
      return [
        { type: "header", id: "h1", name: "Filters ignored with text search" },
        { type: "separator", id: "s1" },
        // Popular and Latest come from the updates grid, which none of these give.
        { type: "select", id: "order", name: "Order", options: options([["Any Order", "0"], ["Popular", "popular"], ["Newest", "newest"]]), selected: 0, listings: {} },
        { type: "select", id: "quality", name: "Quality", options: options([["All Quality", "0"], ["HD", "hd"]]), selected: 0 },
      ]
    },
  }
}
