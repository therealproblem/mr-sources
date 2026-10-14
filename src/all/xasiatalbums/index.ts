// Ported from the Keiyoushi "Xasiat Albums" extension:
// https://github.com/keiyoushi/extensions-source/tree/main/src/all/xasiatalbums
// Licensed under the Apache License, Version 2.0.

import { fetchPage, queryString, relativeUrl, type MangasPage, type Source } from "../../../sdk"

const baseUrl = "https://www.xasiat.com"
const itemsPerPage = 12
// For pages and the site's API; images are fetched without it (the CDN can refuse it).
const headers = { "X-Requested-With": "XMLHttpRequest" }

/** The site's "async block" listing, shared by popular, latest, search and categories. */
async function block(path: string, blockId: string, page: number, params: [string, string][]): Promise<MangasPage> {
  const from = String((page - 1) * itemsPerPage + 1)
  const query: [string, string][] = [
    ["mode", "async"], ["function", "get_block"], ["block_id", blockId], ["from", from],
    ...(blockId.includes("search") ? [["from_albums", from] as [string, string]] : []),
    ...params,
    ["_", String(Date.now())],
  ]
  const { document } = await fetchPage({ url: `${baseUrl}/${path.replace(/^\/|\/$/g, "")}/?${queryString(query)}`, headers })
  const seen = new Set<string>()
  const mangas = document.select(".list-albums .item a[href]").flatMap((link) => {
    const href = link.absUrl("href")
    if (!href || !href.includes("/albums/")) return []
    const url = relativeUrl(href)
    if (seen.has(url)) return []
    seen.add(url)
    const img = link.selectFirst("img")
    return [{ url, title: link.attr("title") || img?.attr("alt") || "", thumbnailUrl: img ? img.absUrl("data-original") || img.absUrl("src") : undefined, status: "completed" as const }]
  })
  const hasNextPage = document.select(".pagination a[href], .pages a[href], .pager a[href]").some((a) => /next/i.test(a.text())) || mangas.length >= itemsPerPage
  return { mangas, hasNextPage }
}

const source: Source = {
  info: {
    id: "7187893778775685546", name: "XAsiat Albums", lang: "all", version: "1.0.1", baseUrl, supportsLatest: true, nsfw: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/xasiatalbums/res/mipmap-xhdpi/ic_launcher.png",
  },

  getPopularManga(page) {
    return block("albums/", "list_albums_common_albums_list", page, [["sort_by", "album_viewed_week"]])
  },

  getLatestUpdates(page) {
    return block("albums/", "list_albums_common_albums_list", page, [["sort_by", "post_date"]])
  },

  searchManga(page, query, filters) {
    if (query.trim()) return block("search/search/", "list_albums_albums_list_search_result", page, [["q", query]])
    const category = filters.find((f) => f.id === "category")
    if (category?.type === "select" && category.selected > 0) return block(category.options[category.selected].value, "list_albums_common_albums_list", page, [])
    return this.getLatestUpdates!(page)
  },

  async getMangaDetails(manga) {
    const { document } = await fetchPage({ url: baseUrl + manga.url, headers })
    return {
      title: document.selectFirst(".entry-title")?.text(),
      description: document.selectFirst("meta[property=og:description]")?.attr("content") ?? "",
      thumbnailUrl: document.selectFirst("meta[property=og:image]")?.attr("content") || undefined,
      genres: document.select(".info-content a").filter((a) => a.text().trim() && a.absUrl("href").includes("/albums/")).map((a) => a.text().trim()),
      status: "completed",
    }
  },

  async getChapterList(manga) {
    const { url } = await fetchPage({ url: baseUrl + manga.url, headers })
    return [{ url: url.startsWith(baseUrl) ? url.slice(baseUrl.length) : url, name: "Photobook" }]
  },

  async getPageList(chapter) {
    const { document } = await fetchPage({ url: chapter.url.startsWith("http") ? chapter.url : baseUrl + chapter.url, headers })
    // Every image is on the album page, as links to /get_image/…; related albums are /albums/ links.
    const urls = document.select("a.item[href], a[href*='/get_image/']").map((a) => a.absUrl("href")).filter((url) => url.includes("/get_image/"))
    return [...new Set(urls)].map((url) => ({ url }))
  },

  getFilterList() {
    return [
      { type: "header", id: "h1", name: "Tags from the site's albums" },
      { type: "separator", id: "s1" },
      { type: "select", id: "category", name: "Category", options: categories.map(([label, value]) => ({ label, value })), selected: 0 },
    ]
  },
}

export default source

const categories: [string, string][] = [
  ["None", ""],
  ["Allgravure", "albums/tags/allgravure"],
  ["Amateur", "albums/categories/amateur3"],
  ["Artgravia", "albums/tags/artgravia"],
  ["Bejean On Line", "albums/tags/bejean-on-line"],
  ["Big Comic Spirits", "albums/tags/big-comic-spirits"],
  ["Bikini", "albums/tags/bikini"],
  ["Black", "albums/tags/black"],
  ["Bluecake", "albums/tags/bluecake"],
  ["Bunny", "albums/tags/bunny"],
  ["China & Taiwan", "albums/categories/china-taiwan"],
  ["Cosplay", "albums/tags/cosplay"],
  ["Djawa", "albums/tags/djawa"],
  ["Espacia Korea", "albums/tags/espacia-korea"],
  ["Fantia", "albums/tags/fantia"],
  ["Flash", "albums/tags/flash"],
  ["Friday", "albums/tags/friday"],
  ["Friday Digital Photobook", "albums/tags/friday-digital-photobook"],
  ["Friday Gold", "albums/tags/friday-gold"],
  ["Gals", "albums/tags/gals"],
  ["Girls", "albums/tags/girls"],
  ["Girlz-High", "albums/tags/girlz-high"],
  ["Graphis", "albums/tags/graphis"],
  ["Gravure Idols", "albums/categories/gravure-idols"],
  ["Japan", "albums/tags/japan"],
  ["Japanese", "albums/tags/japanese"],
  ["JAV & AV Models", "albums/categories/jav"],
  ["JAV Amateur", "albums/categories/jav-amateur"],
  ["JVID", "albums/tags/jvid"],
  ["Korean", "albums/tags/korean"],
  ["Leehee Express", "albums/tags/leehee-express"],
  ["Loozy", "albums/tags/loozy"],
  ["Lovepop", "albums/tags/lovepop"],
  ["Maid", "albums/tags/maid"],
  ["Night", "albums/tags/night"],
  ["Nude", "albums/tags/nude"],
  ["Onlyfans", "albums/tags/onlyfans"],
  ["Patreon", "albums/tags/patreon"],
  ["Photobook", "albums/tags/photobook"],
  ["Pure Media", "albums/tags/pure-media"],
  ["School", "albums/tags/school"],
  ["Shonen Magazine", "albums/tags/shonen-magazine"],
  ["Shonen Sunday", "albums/tags/shonen-sunday"],
  ["South Korea", "albums/categories/korea"],
  ["Southeast Asia", "albums/categories/southeast-asia"],
  ["Summertime", "albums/tags/summertime"],
  ["Swimsuit", "albums/tags/swimsuit"],
  ["Teen", "albums/tags/teen"],
  ["Tiny Body", "albums/tags/tiny-body"],
  ["Uniform", "albums/tags/uniform"],
  ["Weekly Playboy", "albums/tags/weekly-playboy"],
  ["Western Girls", "albums/categories/western-girls"],
  ["Xiaoyu", "albums/tags/xiaoyu"],
  ["Xiuren", "albums/tags/xiuren"],
  ["Yanmaga Web", "albums/tags/yanmaga-web"],
  ["Young Champion", "albums/tags/young-champion"],
  ["Young Jump", "albums/tags/young-jump"],
  ["Young Magazine", "albums/tags/young-magazine"],
  ["Yuuhui", "albums/tags/yuuhui"],
]
