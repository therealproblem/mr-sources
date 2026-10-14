// Based on the Keiyoushi "YellowNote" (小黄书) extension:
// https://github.com/keiyoushi/extensions-source/tree/main/src/all/yellownote
// Licensed under the Apache License, Version 2.0.
//
// xChina has since been redesigned: galleries moved from /photo/id-<id>.html to /photo/<id>, and
// their pages from /photo/id-<id>/<n>.html to /photo/<id>/<n>. This keeps the old URLs (what
// Mihon backups hold, so read progress carries over) and translates them when fetching.

import { fetchPage, queryString, type HTMLNode, type MangasPage, type Source } from "../../../sdk"

// [Mihon source ID, language, base URL]
const sites: [string, string, string][] = [
  ["170542391855030753", "zh-Hans", "https://xchina.co"],
  ["4899554363948814001", "zh-Hant", "https://tw.xchina.co"],
  ["6844007153169388830", "en", "https://en.xchina.co"],
  ["385228898502560286", "es", "https://es.xchina.co"],
  ["7263133157381353850", "ko", "https://kr.xchina.co"],
]

/** /photo/id-<id>.html → /photo/<id>; /photo/id-<id>/<n>.html → /photo/<id>/<n>. */
const sitePath = (url: string) => url.replace(/\/id-([0-9a-z]+)(\/\d+)?\.html$/i, "/$1$2")
/** The other way, for URLs the app keeps. */
const keptPath = (id: string, page?: number) => (page == null ? `/photo/id-${id}.html` : `/photo/id-${id}/${page}.html`)
const galleryId = (url: string) => /\/photo\/(?:id-)?([0-9a-z]+)/i.exec(url)?.[1] ?? ""

function makeSource([id, lang, baseUrl]: [string, string, string]): Source {
  async function parseList(url: string): Promise<MangasPage> {
    const { document } = await fetchPage(url)
    const mangas = document.select("a.group[href^=/photo/]").flatMap((link) => {
      const gallery = galleryId(link.attr("href"))
      const img = link.selectFirst("img")
      const title = link.selectFirst("div.mt-2")?.text() || img?.attr("alt")
      if (!gallery || !title) return []
      const count = link.selectFirst("span.absolute")?.text().replace(/\s*·\s*/, " + ")
      return [{ url: keptPath(gallery), title: `${title}${count ? `(${count})` : ""}`, thumbnailUrl: img?.absUrl("src") || undefined }]
    })
    const hasNextPage = document.select("a[rel=next], a[aria-label=Next]").length > 0
      || document.select("a").some((a) => /^(›|»|Next)$/.test(a.text().trim()) && !a.hasClass("cursor-not-allowed"))
    return { mangas, hasNextPage }
  }

  const listUrl = (path: string, page: number, params: [string, string][] = []) =>
    `${baseUrl}/${path}${page > 1 ? `/${page}` : ""}${params.length ? `?${queryString(params)}` : ""}`

  return {
    info: {
      id, name: "小黄书", lang, version: "1.0.1", baseUrl, supportsLatest: true, nsfw: true,
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/yellownote/res/mipmap-xhdpi/ic_launcher.png",
      // The image host blocks requests that don't look like a browser loading an image.
      imageHeaders: { Accept: "image/avif,image/webp,image/png,image/jpeg,*/*" },
    },

    getPopularManga(page) {
      return parseList(listUrl("photos", page, [["sort", "hot"]]))
    },

    getLatestUpdates(page) {
      return parseList(listUrl("photos", page))
    },

    searchManga(page, query, filters) {
      const value = (fid: string) => { const f = filters.find((x) => x.id === fid); return f?.type === "select" ? f.options[f.selected]?.value ?? "" : "" }
      if (query.trim()) return parseList(`${baseUrl}/search?${queryString([["q", query.trim()], ...(page > 1 ? [["page", String(page)] as [string, string]] : [])])}`)
      const sort = value("sort")
      return parseList(listUrl(value("category") || "photos", page, sort ? [["sort", sort]] : []))
    },

    async getMangaDetails(manga) {
      const { document } = await fetchPage(baseUrl + sitePath(manga.url))
      const header = document.selectFirst("main header")
      if (!header) throw new Error("The gallery page has changed.")
      const details = Object.fromEntries(header.select("dt").map((dt) => [dt.text(), dt.nextElementSibling()]))
      const issue = details["Issue"]?.text() ?? details["期号"]?.text()
      const count = header.select("dd").map((dd) => dd.text()).find((t) => /^\d+P/.test(t))
      const name = header.selectFirst("h1")?.text() ?? manga.title
      return {
        title: count ? `${name}(${count})` : name,
        author: header.select("a[href^=/actor/]").map((a) => a.text()).join(", ") || undefined,
        genres: [
          ...header.select("a[href^=/photo-series/]").map((a) => a.text()),
          ...header.select("a[href*=/tag/]").map((a) => a.text().replace(/^#/, "")),
        ],
        description: issue ? `Issue: ${issue}` : undefined,
        thumbnailUrl: document.selectFirst("main a[href^=/photoShow] img")?.absUrl("src") || manga.thumbnailUrl,
        status: "completed",
      }
    },

    async getChapterList(manga) {
      const gallery = galleryId(manga.url)
      const { document } = await fetchPage(baseUrl + sitePath(manga.url))
      const pages = document.select(`a[href^=/photo/${gallery}/]`).map((a) => Number(a.attr("href").split("/").pop())).filter(Number.isInteger)
      const maxPage = Math.max(1, ...pages)
      return Array.from({ length: maxPage }, (_, i) => maxPage - i).map((page) => ({ url: keptPath(gallery, page), name: `Page ${page}` }))
    },

    async getPageList(chapter) {
      const { document } = await fetchPage(baseUrl + sitePath(chapter.url))
      const quality = Honya.prefs.get("XChina::IMAGE_QUALITY") ?? "original"
      return document.select("main a[href^=/photoShow] img").map((img) => {
        const url = img.absUrl("src")
        return { url: quality === "original" ? url.replace(/_600x0\.webp$/, ".jpg") : url }
      })
    },

    getFilterList() {
      return [
        { type: "select", id: "sort", name: "Sort by", options: [["Last Update", ""], ["Popularity", "hot"], ["Comment Count", "comment"], ["Latest Comments", "recent"]].map(([label, value]) => ({ label, value })), selected: 0 },
        { type: "separator", id: "s1" },
        { type: "header", id: "h1", name: "These filters will be ignored when text search is active!" },
        { type: "select", id: "category", name: "Category", options: categories.map(([label, value]) => ({ label, value })), selected: 0 },
      ]
    },
  }
}

export default sites.map(makeSource)

const categories: [string, string][] = [
  ["All", ""],
  ["Taiwan Studios: JVID", "photo-series/637b2029d2347"],
  ["Taiwan Studios: Fantasy Factory", "photo-series/5f889afb37619"],
  ["Taiwan Studios: TPimage", "photo-series/5f7a0a80d3d66"],
  ["Chinese Studios: PANS", "photo-series/6310ce9b90056"],
  ["Chinese Studios: Wind sings", "photo-series/6666a7ac3ba9c"],
  ["Chinese Studios: Xing Se", "photo-series/64f44d99ce673"],
  ["Chinese Studios: Huang Fu", "photo-series/665f8bafab4bc"],
  ["Chinese Studios: Other Studios", "photo-series/665f7d787d681"],
  ["Chinese Studios: MetCN", "photo-series/5f1dcdeaee582"],
  ["Chinese Studios: Litu", "photo-series/5f1d784995865"],
  ["Chinese Studios: Midnight Project", "photo-series/638e5a60b1770"],
  ["Chinese Studios: Pandora", "photo-series/5f23c44cd66bd"],
  ["Chinese Studios: MISSLEG", "photo-series/5f2089564c6c2"],
  ["Chinese Studios: ISS", "photo-series/646c69b675f3d"],
  ["Chinese Studios: AISS", "photo-series/5f15f389e993e"],
  ["Chinese Studios: AU", "photo-series/5f60b98248a81"],
  ["Chinese Studios: Beijing Angel", "photo-series/622c7f95220a4"],
  ["Chinese Studios: Wuji Works", "photo-series/619a92aa1fa7a"],
  ["Chinese Studios: Pomelo", "photo-series/676c3e9b90749"],
  ["Chinese Studios: SK Silk", "photo-series/5f382ba894af4"],
  ["Chinese Studios: DDY", "photo-series/5f15f727df393"],
  ["Chinese Studios: Dongguan VGirls", "photo-series/5f22ea422221c"],
  ["Chinese Studios: YouMei", "photo-series/61b997728043b"],
  ["Others: AI Photos", "photo-series/6443d480eb757"],
  ["Korean Studios: Makemodel", "photo-series/665f81885f103"],
  ["Korean Studios: Pure Media", "photo-series/6224e755e21f4"],
  ["Korean Studios: Espacia Korea", "photo-series/665a2385a2367"],
  ["Korean Studios: Loozy", "photo-series/62888afad416b"],
  ["Japanese Studios: Graphis", "photo-series/6450b47c9db0b"],
  ["Japanese Studios: KUNI Scan", "photo-series/66f9665804471"],
  ["Japanese Studios: Weekly Post-Digital Photo", "photo-series/66e68b9c96ab0"],
  ["Japanese Studios: Morning SEXY", "photo-series/670d7142b3d88"],
  ["Japanese Studios: Prestige", "photo-series/670791f5f2f0f"],
  ["Japanese Studios: X-City", "photo-series/66fb8cca706ae"],
  ["Japanese Studios: FRIDAY", "photo-series/66659e2d94489"],
  ["Japanese Studios: Super Pose Book", "photo-series/62a0a15911f16"],
  ["Japanese Studios: Urabon", "photo-series/6692ea004cc75"],
  ["Japanese Studios: Escape", "photo-series/66603af933ec9"],
  ["Japanese Studios: Flash", "photo-series/672a2029d6a32"],
  ["Other Photos: Chinese Nude", "photo-series/64be21c972ca4"],
  ["Other Photos: Korean Nude", "photo-series/64be22b4a0fa0"],
  ["Other Photos: Taiwan Nude", "photo-series/64be21ef4cc51"],
  ["Other Photos: Other Regions", "photo-series/64be239ce73d4"],
  ["Xiuren: All", "photo-series/6660093348354"],
  ["Xiuren: Leaked", "photo-series/66600a3a227ee"],
  ["Xiuren: HuaYang", "photo-series/5fc4ce40386af"],
  ["Xiuren: MyGirl", "photo-series/5f1495dbda4de"],
  ["Xiuren: IMiss", "photo-series/5f71afc92d8ab"],
  ["Xiuren: MiiTao", "photo-series/5f1dd5a7ebe9a"],
  ["Xiuren: FEILIN", "photo-series/5f14a3105d3e8"],
  ["Xiuren: YouWu", "photo-series/60673bec9dd11"],
  ["Xiuren: WingS", "photo-series/63d435352808c"],
  ["Xiuren: RUISG", "photo-series/61263de287e2f"],
]
