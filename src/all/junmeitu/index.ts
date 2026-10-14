// Ported from the Keiyoushi "Junmeitu" extension:
// https://github.com/keiyoushi/extensions-source/tree/main/src/all/junmeitu
// Licensed under the Apache License, Version 2.0.

import { fetchPage, mapLimit, relativeUrl, send, type Filter, type HTMLNode, type MangasPage, type Source } from "../../../sdk"

const baseUrl = "https://meijuntu.com"

const lazySrc = (img: HTMLNode) => img.absUrl("data-original") || img.absUrl("data-src") || img.absUrl("data-lazy-src") || img.absUrl("src")

async function parseList(url: string): Promise<MangasPage> {
  const { document } = await fetchPage(url)
  const mangas = document.select(".pic-list > ul > li").map((e) => ({
    title: e.select("p").map((p) => p.text()).join(" "),
    thumbnailUrl: e.select("img")[0]?.absUrl("src") || undefined,
    url: relativeUrl(e.select("a")[0]?.absUrl("href") ?? ""),
  }))
  return { mangas, hasNextPage: document.selectFirst("span + a  + a") != null }
}

/** A page's image, from its HTML or from the site's JSON for it. */
async function imageOf(url: string): Promise<string> {
  const response = await send(url)
  if ((response.headers["content-type"] ?? "").includes("application/json") || /[?&]ajax=1(&|$)/.test(response.url)) {
    const pic = (JSON.parse(response.body) as { pic: string }).pic
    const img = Honya.parseHTML(`<body>${pic}</body>`, baseUrl).selectFirst("img")
    if (!img) throw new Error("Image not found in AJAX response")
    return img.absUrl("src")
  }
  const img = Honya.parseHTML(response.body, response.url).selectFirst(".pictures img")
  if (!img) throw new Error("Image not found in HTML response")
  return lazySrc(img)
}

const categories: [string, string][] = [["beauty", "6"], ["handsome", "5"], ["news", "30"], ["street", "32"]]
const sorts: [string, string][] = [["default", "index"], ["hot", "hot"]]

const source: Source = {
  info: {
    id: "4721197766605490540", name: "Junmeitu", lang: "all", version: "1.0.0", baseUrl, supportsLatest: true, nsfw: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/junmeitu/res/mipmap-xhdpi/ic_launcher.png",
  },

  getLatestUpdates(page) {
    return parseList(`${baseUrl}/beauty/index-${page}.html`)
  },

  getPopularManga(page) {
    return parseList(`${baseUrl}/beauty/hot-${page}.html`)
  },

  searchManga(page, query, filters) {
    const text = (id: string) => { const f = filters.find((x) => x.id === id); return f?.type === "text" ? f.value : "" }
    const select = (id: string) => { const f = filters.find((x) => x.id === id); return f?.type === "select" ? f.selected : 0 }
    const category = categories[select("category")]
    const sort = sorts[select("sort")]
    let url: string
    if (query) url = `${baseUrl}/search/${encodeURIComponent(query)}-${page}.html`
    else if (text("tag")) url = `${baseUrl}/tags/${text("tag")}-${category[1]}-${page}.html`
    else if (text("model")) url = `${baseUrl}/model/${text("model")}-${page}.html`
    else if (text("group")) url = `${baseUrl}/xzjg/${text("group")}-${page}.html`
    else if (select("category") !== 0) url = `${baseUrl}/${category[0]}/${sort[1]}-${page}.html`
    else if (select("sort") !== 0) url = `${baseUrl}/${category[0]}/${sort[1]}-${page}.html`
    else url = `${baseUrl}/beauty/index-${page}.html`
    return parseList(url)
  },

  async getMangaDetails(manga) {
    const { document } = await fetchPage(baseUrl + manga.url)
    return {
      title: document.selectFirst(".news-title, .title")?.text(),
      description: `${document.select(".news-info, .picture-details").map((e) => e.text()).join(" ")}\n${document.select(".introduce").map((e) => e.text()).join(" ")}`,
      genres: document.select(".relation_tags > a").map((a) => a.text()),
      status: "completed",
    }
  },

  async getChapterList(manga) {
    const { document, url } = await fetchPage(baseUrl + manga.url)
    const href = document.selectFirst(".position a:last-child")?.absUrl("href")
    const date = /(\d{4})-(\d{2})-(\d{2})/.exec(document.select(".base-info span:contains(日期)").map((s) => s.text()).join(" ").split("日期:")[1] ?? "")
    return [{
      url: relativeUrl(href || url),
      name: "Gallery",
      dateUpload: date ? Date.UTC(Number(date[1]), Number(date[2]) - 1, Number(date[3])) : undefined,
    }]
  },

  async getPageList(chapter) {
    const { document, url } = await fetchPage(baseUrl + chapter.url)
    const newsBody = document.selectFirst(".news-body")
    if (newsBody) return newsBody.select("img").map((img) => ({ url: lazySrc(img) }))

    const numPages = Number(document.select(".pages > a:nth-last-of-type(2)").map((a) => a.text()).join(""))
      || Math.max(1, ...document.select(".pages a").map((a) => Number(a.text())).filter(Number.isInteger))
    const [path, query = ""] = url.replace(/^https?:\/\/[^/]+/, "").split("?")
    const segments = path.split("/").filter(Boolean)
    const slug = (segments[segments.length - 1] ?? "").replace(/\.html$/, "").replace(/-[^-]*$/, "")
    const origin = /^https?:\/\/[^/]+/.exec(url)?.[0] ?? baseUrl

    let first: string | undefined
    let pageUrls: string[]
    const script = document.select("script").map((s) => s.data()).find((data) => data.includes("pc_cid"))
    if (script) {
      const categoryId = script.split("pc_cid = ")[1]?.split(";")[0].trim()
      const contentId = script.split("pc_id = ")[1]?.split(";")[0].trim()
      const ajaxSegments = [...segments]
      ajaxSegments[0] = `ajax_${segments[0] ?? "beauty"}`
      const params = query.split("&").filter((p) => p && !/^(ajax|catid|conid)=/.test(p))
      const ajaxUrl = (n: number) => {
        const parts = [...ajaxSegments]
        parts[parts.length - 1] = `${slug}-${n}.html`
        return `${origin}/${parts.join("/")}?${[...params, "ajax=1", `catid=${categoryId}`, `conid=${contentId}`].join("&")}`
      }
      const firstImage = document.selectFirst(".pictures img")
      first = firstImage ? lazySrc(firstImage) : undefined
      pageUrls = Array.from({ length: numPages }, (_, i) => ajaxUrl(i + 1))
    } else {
      pageUrls = Array.from({ length: numPages }, (_, i) => {
        const parts = [...segments]
        parts[parts.length - 1] = `${slug}${i > 0 ? `-${i + 1}` : ""}.html`
        return `${origin}/${parts.join("/")}${query ? `?${query}` : ""}`
      })
    }
    return mapLimit(pageUrls, 6, async (pageUrl, index) => ({ url: index === 0 && first ? first : await imageOf(pageUrl) }))
  },

  getFilterList(): Filter[] {
    return [
      { type: "header", id: "h1", name: "NOTE: Ignored if using text search!" },
      { type: "header", id: "h2", name: "NOTE: Filter are weird for this extension!" },
      { type: "separator", id: "s1" },
      { type: "text", id: "tag", name: "Tag", value: "" },
      { type: "text", id: "model", name: "Model", value: "" },
      { type: "text", id: "group", name: "Group", value: "" },
      { type: "select", id: "category", name: "Category", options: categories.map(([label, value]) => ({ label, value })), selected: 0 },
      { type: "select", id: "sort", name: "Sort", options: sorts.map(([label, value]) => ({ label, value })), selected: 0 },
    ]
  },
}

export default source
