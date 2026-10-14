// Ported from the Keiyoushi "MissKon" extension (v1.6.5):
// https://github.com/keiyoushi/extensions-source/tree/main/src/all/misskon
// Licensed under the Apache License, Version 2.0.

import { fetchHTML, relativeUrl, type HTMLNode, type MangasPage, type Source } from "../../../sdk"

const baseUrl = "https://misskon.com"

function mangaFrom(e: HTMLNode) {
  const title = e.selectFirst(".post-box-title")!
  return { title: title.text(), thumbnailUrl: e.selectFirst(".post-thumbnail img")?.absUrl("data-src") || undefined, url: relativeUrl(title.selectFirst("a")!.absUrl("href")) }
}
const items = (document: HTMLNode) => document.select("article.item-list").map(mangaFrom)

const source: Source = {
  info: {
    id: "492049561920540214", name: "MissKon", lang: "all", version: "1.0.0", baseUrl, supportsLatest: true, nsfw: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/misskon/res/mipmap-xhdpi/ic_launcher.png",
    rateLimits: [{ host: "misskon.com", permits: 10, periodMs: 1000 }],
  },

  async getPopularManga() {
    return { mangas: items(await fetchHTML(`${baseUrl}/top3/`)), hasNextPage: false }
  },

  async getLatestUpdates(page) {
    const document = await fetchHTML(`${baseUrl}/page/${page}`)
    return { mangas: items(document), hasNextPage: document.selectFirst(".current + a.page") != null }
  },

  async searchManga(page, query, filters) {
    const category = filters.find((f) => f.id === "category")
    const path = category?.type === "select" && category.selected > 0 ? category.options[category.selected].value : undefined
    const document = await fetchHTML(path ? baseUrl + path : `${baseUrl}/page/${page}/?s=${encodeURIComponent(query).replace(/%20/g, "+")}`)
    return { mangas: items(document), hasNextPage: document.selectFirst("div.content > div.pagination > span.current + a") != null }
  },

  async getMangaDetails(manga) {
    const post = (await fetchHTML(baseUrl + manga.url)).selectFirst("article > .post-inner")
    if (!post) throw new Error("The gallery page has changed.")
    return { title: post.select(".post-title").map((t) => t.text()).join(" "), genres: post.select(".post-tag > a").map((a) => a.text()), status: "completed" }
  },

  async getChapterList(manga) {
    const document = await fetchHTML(baseUrl + manga.url)
    const image = document.selectFirst(".entry img")?.absUrl("data-src") ?? ""
    const full = /\/(\d{4})\/(\d{2})\/(\d{2})\//.exec(image)
    const month = /\/(\d{4})\/(\d{2})\//.exec(image)
    const dateUpload = full ? Date.UTC(Number(full[1]), Number(full[2]) - 1, Number(full[3])) : month ? Date.UTC(Number(month[1]), Number(month[2]) - 1, 1) : undefined
    const links = document.select("div.page-link:first-of-type a.post-page-numbers")
    const maxPage = Number(links[links.length - 1]?.text()) || 1
    return Array.from({ length: maxPage }, (_, i) => maxPage - i).map((page) => ({ url: `${manga.url}/${page}`, name: `Page ${page}`, dateUpload }))
  },

  async getPageList(chapter) {
    return (await fetchHTML(baseUrl + chapter.url)).select("div.post-inner > div.entry > p > img").map((img) => ({ url: img.absUrl("data-src") }))
  },

  getFilterList() {
    return [
      { type: "header", id: "h1", name: "NOTE: Unable to further search in the category!" },
      { type: "separator", id: "s1" },
      { type: "select", id: "category", name: "Category", options: categories.map(([label, value]) => ({ label, value })), selected: 0 },
    ]
  },
}

export default source

const categories: [string, string][] = [
  ["unselected", ""],
  ["Top 3 days", "/top3/"],
  ["Top 7 days", "/top7/"],
  ["Top 30 days", "/top30/"],
  ["Top 60 days", "/top60/"],
  ["Chinese:[MTCos] 喵糖映画", "/tag/mtcos/"],
  ["Chinese:BoLoli", "/tag/bololi/"],
  ["Chinese:CANDY", "/tag/candy/"],
  ["Chinese:FEILIN", "/tag/feilin/"],
  ["Chinese:FToow", "/tag/ftoow/"],
  ["Chinese:GIRLT", "/tag/girlt/"],
  ["Chinese:HuaYan", "/tag/huayan/"],
  ["Chinese:HuaYang", "/tag/huayang/"],
  ["Chinese:IMISS", "/tag/imiss/"],
  ["Chinese:ISHOW", "/tag/ishow/"],
  ["Chinese:JVID", "/tag/jvid/"],
  ["Chinese:KelaGirls", "/tag/kelagirls/"],
  ["Chinese:Kimoe", "/tag/kimoe/"],
  ["Chinese:LegBaby", "/tag/legbaby/"],
  ["Chinese:MF", "/tag/mf/"],
  ["Chinese:MFStar", "/tag/mfstar/"],
  ["Chinese:MiiTao", "/tag/miitao/"],
  ["Chinese:MintYe", "/tag/mintye/"],
  ["Chinese:MISSLEG", "/tag/missleg/"],
  ["Chinese:MiStar", "/tag/mistar/"],
  ["Chinese:MTMeng", "/tag/mtmeng/"],
  ["Chinese:MyGirl", "/tag/mygirl/"],
  ["Chinese:PartyCat", "/tag/partycat/"],
  ["Chinese:QingDouKe", "/tag/qingdouke/"],
  ["Chinese:RuiSG", "/tag/ruisg/"],
  ["Chinese:SLADY", "/tag/slady/"],
  ["Chinese:TASTE", "/tag/taste/"],
  ["Chinese:TGOD", "/tag/tgod/"],
  ["Chinese:TouTiao", "/tag/toutiao/"],
  ["Chinese:TuiGirl", "/tag/tuigirl/"],
  ["Chinese:Tukmo", "/tag/tukmo/"],
  ["Chinese:UGIRLS", "/tag/ugirls/"],
  ["Chinese:UGIRLS - Ai You Wu App", "/tag/ugirls-ai-you-wu-app/"],
  ["Chinese:UXING", "/tag/uxing/"],
  ["Chinese:WingS", "/tag/wings/"],
  ["Chinese:XiaoYu", "/tag/xiaoyu/"],
  ["Chinese:XingYan", "/tag/xingyan/"],
  ["Chinese:XIUREN", "/tag/xiuren/"],
  ["Chinese:XR Uncensored", "/tag/xr-uncensored/"],
  ["Chinese:YouMei", "/tag/youmei/"],
  ["Chinese:YouMi", "/tag/youmi/"],
  ["Chinese:YouMi尤蜜", "/tag/youmiapp/"],
  ["Chinese:YouWu", "/tag/youwu/"],
  ["Korean:AG", "/tag/ag/"],
  ["Korean:Bimilstory", "/tag/bimilstory/"],
  ["Korean:BLUECAKE", "/tag/bluecake/"],
  ["Korean:CreamSoda", "/tag/creamsoda/"],
  ["Korean:DJAWA", "/tag/djawa/"],
  ["Korean:Espacia Korea", "/tag/espacia-korea/"],
  ["Korean:Fantasy Factory", "/tag/fantasy-factory/"],
  ["Korean:Fantasy Story", "/tag/fantasy-story/"],
  ["Korean:Glamarchive", "/tag/glamarchive/"],
  ["Korean:HIGH FANTASY", "/tag/high-fantasy/"],
  ["Korean:KIMLEMON", "/tag/kimlemon/"],
  ["Korean:KIREI", "/tag/kirei/"],
  ["Korean:KiSiA", "/tag/kisia/"],
  ["Korean:Korean Realgraphic", "/tag/korean-realgraphic/"],
  ["Korean:Lilynah", "/tag/lilynah/"],
  ["Korean:Lookas", "/tag/lookas/"],
  ["Korean:Loozy", "/tag/loozy/"],
  ["Korean:Moon Night Snap", "/tag/moon-night-snap/"],
  ["Korean:Paranhosu", "/tag/paranhosu/"],
  ["Korean:PhotoChips", "/tag/photochips/"],
  ["Korean:Pure Media", "/tag/pure-media/"],
  ["Korean:PUSSYLET", "/tag/pussylet/"],
  ["Korean:SAINT Photolife", "/tag/saint-photolife/"],
  ["Korean:SWEETBOX", "/tag/sweetbox/"],
  ["Korean:UHHUNG MAGAZINE", "/tag/uhhung-magazine/"],
  ["Korean:UMIZINE", "/tag/umizine/"],
  ["Korean:WXY ENT", "/tag/wxy-ent/"],
  ["Korean:Yo-U", "/tag/yo-u/"],
  ["Other:AI Generated", "/tag/ai-generated/"],
  ["Other:Cosplay", "/tag/cosplay/"],
  ["Other:JP", "/tag/jp/"],
  ["Other:JVID", "/tag/jvid/"],
  ["Other:Patreon", "/tag/patreon/"],
]
