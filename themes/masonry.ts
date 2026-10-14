// Ported from Keiyoushi's "masonry" multisrc theme (Apache License 2.0):
// https://github.com/keiyoushi/extensions-source/tree/main/lib-multisrc/masonry
// Its tag filter, which the Kotlin theme fetches from the site, isn't here.

import { absoluteUrl, fetchHTML, relativeUrl, type HTMLNode, type MangasPage, type Source, type SourceInfo } from "../sdk"

/** The first image attribute with a value (an empty srcset would resolve to the page itself). */
const imgAttr = (img: HTMLNode, baseUrl: string) => {
  for (const name of ["srcset", "data-cfsrc", "data-src", "data-lazy-src", "src"]) {
    const value = img.attr(name).trim().split(/\s+/)[0]
    if (value) return absoluteUrl(value, baseUrl)
  }
  return undefined
}

function parseList(document: HTMLNode, baseUrl: string): MangasPage {
  const mangas = document.select(".list-gallery:not(.static) figure:not(:has(a[href*=/video/]))").flatMap((figure) => {
    const a = figure.selectFirst("a")
    // The home page mixes in links to tag and model pages.
    if (!a || /^\/(tag|model|collection)s?\//.test(relativeUrl(a.absUrl("href")))) return []
    const img = figure.selectFirst("img")
    return [{ url: relativeUrl(a.absUrl("href")), title: a.attr("title"), thumbnailUrl: img ? imgAttr(img, baseUrl) : undefined }]
  })
  return { mangas, hasNextPage: document.selectFirst(".pagination-a li.next") != null }
}

const sorts: [string, string][] = [["Trending", "sort/trending"], ["Newest", "sort/newest"], ["Popular", "sort/popular"]]

export function masonry(info: SourceInfo): Source {
  const baseUrl = info.baseUrl
  return {
    info: { ...info, supportsLatest: true },

    async getPopularManga(page) {
      // The Kotlin theme starts at the home page, which now only lists tags and models.
      return parseList(await fetchHTML(page === 1 ? `${baseUrl}/archive/` : `${baseUrl}/archive/page/${page}/`), baseUrl)
    },

    async getLatestUpdates(page) {
      return parseList(await fetchHTML(`${baseUrl}/updates/sort/newest/mpage/${page}/`), baseUrl)
    },

    async searchManga(page, query, filters) {
      if (query) return parseList(await fetchHTML(`${baseUrl}/search/post/${encodeURIComponent(query.trim())}/mpage/${page}/`), baseUrl)
      const sort = filters.find((f) => f.id === "sort")
      const index = sort?.type === "select" ? sort.selected : 0
      // "Popular" is the updates page's default order.
      const part = index === 2 ? "" : sorts[index][1]
      return parseList(await fetchHTML(`${baseUrl}/updates/${part ? `${part}/mpage/${page}/` : `page/${page}/`}`), baseUrl)
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

    getFilterList() {
      return [
        { type: "header", id: "h1", name: "Filters ignored with text search" },
        { type: "separator", id: "s1" },
        { type: "select", id: "sort", name: "Sort by", options: sorts.map(([label, value]) => ({ label, value })), selected: 0 },
      ]
    },
  }
}
