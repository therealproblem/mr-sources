// Ported from the Keiyoushi "XGMN" (性感美女) extension (v1.4.4):
// https://github.com/keiyoushi/extensions-source/tree/main/src/all/xgmn
// Licensed under the Apache License, Version 2.0.
// The Kotlin version opens each image's page lazily; this reads each page of the gallery once.

import { fetchPage, mapLimit, queryString, relativeUrl, type HTMLNode, type MangasPage, type Source } from "../../../sdk"

const baseUrl = "http://xgmn8.vip"
/** The site moves between domains; the first page it redirects to says where it is now. */
let current: string | undefined
const origin = (url: string) => /^https?:\/\/[^/]+/.exec(url)?.[0]

async function load(path: string) {
  const page = await fetchPage(`${current ?? baseUrl}${path}`)
  current ??= origin(page.url)
  return page
}

function parseList(document: HTMLNode): MangasPage {
  const page = Number(document.selectFirst(".current")?.text())
  const last = Number(document.selectFirst(".pagination strong")?.text())
  const mangas = document.select(".related_box").flatMap((box) => {
    const a = box.selectFirst("a")
    return a ? [{ thumbnailUrl: box.selectFirst("img")?.absUrl("src") || undefined, title: a.attr("title"), url: relativeUrl(a.absUrl("href")) }] : []
  })
  return { mangas, hasNextPage: Number.isFinite(page) && page < last }
}

const categories: [string, string][] = [
  ["秀人网", "Xiuren/"], ["美媛馆", "MyGirl/"], ["尤物馆", "YouWu/"], ["爱蜜社", "IMiss/"], ["蜜桃社", "MiiTao/"], ["优星馆", "Uxing/"],
  ["嗲囡囡", "FeiLin/"], ["魅妍社", "MiStar/"], ["兔几盟", "Tukmo/"], ["影私荟", "WingS/"], ["星乐园", "LeYuan/"], ["顽味生活", "Taste/"],
  ["模范学院", "MFStar/"], ["花の颜", "Huayan/"], ["御女郎", "DKGirl/"], ["网红馆", "Candy/"], ["尤蜜荟", "YouMi/"], ["薄荷叶", "MintYe/"],
  ["瑞丝馆", "Micat/"], ["模特联盟", "Mtmeng/"], ["花漾", "HuaYang/"], ["星颜社", "XingYan/"], ["画语界", "XiaoYu/"], ["推女郎", "Tuigirl/"],
  ["尤果网", "Ugirls/"], ["青豆客", "Tgod/"], ["头条女神", "TouTiao/"], ["果团网", "Girlt/"], ["喵糖映画", "Mtcos/"], ["爱尤物", "Aiyouwu/"],
  ["波萝社", "BoLoli/"], ["猎女神", "Slady/"], ["尤蜜", "YouMei/"], ["潘多拉", "Pdl/"], ["Artgravia", "Artgravia/"], ["DJAWA", "DJAWA/"],
  ["丝袜美腿", "Siwameitui/"], ["美腿宝贝", "LEGBABY/"], ["蜜丝", "MissLeg/"], ["妖精社", "YaoJingShe/"], ["性感尤物", "Xgyw/"],
  ["国产美女", "Guochanmeinv/"], ["港台美女", "Gangtaimeinv/"], ["日韩美女", "Rihanmeinv/"], ["欧美美女", "Oumeimeinv/"],
  ["丝袜美腿", "Siwameitui/"], ["内衣尤物", "Neiyiyouwu/"], ["Cosplay", "Cosplay/"],
]

const source: Source = {
  info: {
    id: "2870097240566002663", name: "性感美女", lang: "all", version: "1.0.0", baseUrl, supportsLatest: true, nsfw: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/xgmn/res/mipmap-xhdpi/ic_launcher.png",
  },

  async getPopularManga() {
    return parseList((await load("/top.html")).document)
  },

  async getLatestUpdates() {
    return parseList((await load("/new.html")).document)
  },

  async searchManga(page, query, filters) {
    if (query.trim()) {
      const { document } = await load(`/plus/search/index.asp?${queryString([["keyword", query], ["p", page]])}`)
      const currentPage = Number(document.selectFirst(".current")?.text())
      const mangas = document.select(".node > p > a").map((a) => ({
        title: a.text(),
        url: relativeUrl(a.absUrl("href")),
        thumbnailUrl: `${current ?? baseUrl}/uploadfile/pic/${/\d+(?=\.html)/.exec(a.absUrl("href"))?.[0]}.jpg`,
      }))
      return { mangas, hasNextPage: currentPage < document.select(".list .pagination a").length }
    }
    const category = filters.find((f) => f.id === "category")
    const path = category?.type === "select" ? category.options[category.selected].value : categories[0][1]
    return parseList((await load(`/${path}${page > 1 ? `page_${page}.html` : ""}`)).document)
  },

  async getMangaDetails(manga) {
    const { document } = await load(manga.url)
    return { author: document.selectFirst(".item-2")?.text().split("模特：")[1], status: "completed" }
  },

  async getChapterList(manga) {
    const { document } = await load(manga.url)
    const date = /(\d{4})\.(\d{2})\.(\d{2})/.exec(document.selectFirst(".item-1")?.text().split("更新：")[1] ?? "")
    return [{
      url: relativeUrl(document.selectFirst(".current")?.absUrl("href") ?? manga.url),
      name: document.selectFirst(".article-title")?.text() ?? "Gallery",
      chapterNumber: 1,
      // Shanghai midnight.
      dateUpload: date ? Date.UTC(Number(date[1]), Number(date[2]) - 1, Number(date[3])) - 8 * 3600_000 : undefined,
    }]
  },

  async getPageList(chapter) {
    const { document } = await load(chapter.url)
    const prefix = (document.selectFirst(".current")?.absUrl("href") ?? "").replace(/\.html$/, "")
    const total = Number(/\d+(?=P)/.exec(document.selectFirst(".article-title")?.text() ?? "")?.[0]) || 0
    const imagesOf = (doc: HTMLNode) => doc.select(".article-content p > img").filter((img) => img.parent()?.outerHtml().split(">")[0].includes("center"))
    const perPage = Math.max(1, imagesOf(document).length)
    const subPages = Array.from({ length: Math.ceil(total / perPage) }, (_, i) => i)
    const images = await mapLimit(subPages, 4, async (i) => imagesOf(i === 0 ? document : (await fetchPage(`${prefix}_${i}.html`)).document))
    // Images are served from the current domain too.
    return images.flat().slice(0, total || undefined).map((img) => ({ url: `${current ?? baseUrl}/${img.absUrl("src").replace(/^https?:\/\/[^/]+\//, "")}` }))
  },

  getFilterList() {
    return [{ type: "select", id: "category", name: "分类（搜索时无效）", options: categories.map(([label, value]) => ({ label, value })), selected: 0 }]
  },
}

export default source
