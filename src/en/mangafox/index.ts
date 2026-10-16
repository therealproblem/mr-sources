// Ported from the Keiyoushi "MangaFox" extension:
// https://github.com/keiyoushi/extensions-source/tree/main/src/en/mangafox
// Licensed under the Apache License, Version 2.0.
// ponytail: Artist, Rating and Release-year filters left out; add them like Author if asked.

import { fetchHTML, queryString, relativeUrl, type HTMLNode, type Manga, type MangasPage, type MangaStatus, type Source } from "../../../sdk"

const baseUrl = "https://fanfox.net"
const mobileUrl = "https://m.fanfox.net"
const cookie = "isAdult=1"
const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
const genres: [string, string][] = [["Action", "1"], ["Adventure", "2"], ["Comedy", "3"], ["Drama", "4"], ["Fantasy", "5"], ["Martial Arts", "6"], ["Shounen", "7"], ["Horror", "8"], ["Supernatural", "9"], ["Harem", "10"], ["Psychological", "11"], ["Romance", "12"], ["School Life", "13"], ["Shoujo", "14"], ["Mystery", "15"], ["Sci-fi", "16"], ["Seinen", "17"], ["Tragedy", "18"], ["Ecchi", "19"], ["Sports", "20"], ["Slice of Life", "21"], ["Mature", "22"], ["Shoujo Ai", "23"], ["Webtoons", "24"], ["Doujinshi", "25"], ["One Shot", "26"], ["Smut", "27"], ["Yaoi", "28"], ["Josei", "29"], ["Historical", "30"], ["Shounen Ai", "31"], ["Gender Bender", "32"], ["Adult", "33"], ["Yuri", "34"], ["Mecha", "35"], ["Lolicon", "36"], ["Shotacon", "37"]]

const page = (url: string, headers: Record<string, string> = {}) => fetchHTML({ url, headers: { Cookie: cookie, ...headers } })

function toManga(element: HTMLNode): Manga[] {
  const link = element.selectFirst("a")
  return link ? [{ url: relativeUrl(link.absUrl("href")), title: link.attr("title"), thumbnailUrl: link.selectFirst("img")?.absUrl("src") || undefined }] : []
}

async function list(url: string, selector: string): Promise<MangasPage> {
  const document = await page(url)
  return { mangas: document.select(selector).flatMap(toManga), hasNextPage: document.selectFirst(".pager-list-left a.active + a + a") != null }
}

/** "Today", "5 minutes ago", "Yesterday" or "Oct 16,2021". */
function parseChapterDate(text: string): number | undefined {
  const midnight = new Date()
  midnight.setHours(0, 0, 0, 0)
  if (text.includes("Today") || text.includes(" ago")) return midnight.getTime()
  if (text.includes("Yesterday")) return midnight.getTime() - 864e5
  const match = /([A-Za-z]{3})\w*\s+(\d{1,2}),\s*(\d{4})/.exec(text)
  const month = match ? months.indexOf(match[1].toLowerCase()) : -1
  return match && month >= 0 ? new Date(Number(match[3]), month, Number(match[2])).getTime() : undefined
}

function parseStatus(text = ""): MangaStatus {
  return text.includes("Ongoing") ? "ongoing" : text.includes("Completed") ? "completed" : "unknown"
}

const source: Source = {
  info: {
    id: "6484561431658238800", name: "MangaFox", lang: "en", version: "1.0.0", baseUrl, supportsLatest: true,
    rateLimits: [{ host: "fanfox.net", permits: 1, periodMs: 1000 }, { host: "m.fanfox.net", permits: 1, periodMs: 1000 }],
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/mangafox/res/mipmap-xhdpi/ic_launcher.png",
  },

  getPopularManga(p) {
    return list(`${baseUrl}/directory/${p !== 1 ? `${p}.html` : ""}`, "ul.manga-list-1-list li")
  },

  getLatestUpdates(p) {
    return list(`${baseUrl}/directory/${p !== 1 ? `${p}.html` : ""}?latest`, "ul.manga-list-1-list li")
  },

  searchManga(p, query, filters) {
    const params: [string, string | number][] = [["page", p], ["title", query]]
    const included: string[] = []
    const excluded: string[] = []
    for (const filter of filters) {
      if (filter.type === "select") params.push([filter.id, filter.options[filter.selected]?.value ?? ""])
      else if (filter.type === "text") params.push([filter.id, filter.value])
      else if (filter.type === "tristates") { included.push(...filter.included); excluded.push(...filter.excluded) }
    }
    params.push(["genres", included.join(",")], ["nogenres", excluded.join(",")], ["sort", ""], ["stype", "1"])
    return list(`${baseUrl}/search?${queryString(params)}`, "ul.manga-list-4-list li")
  },

  async getMangaDetails(manga) {
    const document = await page(baseUrl + manga.url)
    const info = document.selectFirst(".detail-info-right")
    if (!info) throw new Error("The series page has changed.")
    return {
      author: info.select(".detail-info-right-say a").map((a) => a.text()).join(", ") || undefined,
      genres: info.select(".detail-info-right-tag-list a").map((a) => a.text()),
      description: info.selectFirst("p.fullcontent")?.text(),
      status: parseStatus(info.selectFirst(".detail-info-right-title-tip")?.text()),
      thumbnailUrl: document.selectFirst(".detail-info-cover-img")?.absUrl("src") || undefined,
    }
  },

  async getChapterList(manga) {
    const document = await page(baseUrl + manga.url)
    return document.select("ul.detail-main-list li a").map((a) => {
      const lines = a.select(".detail-main-list-main p")
      return { url: relativeUrl(a.absUrl("href")), name: lines[0]?.text() ?? a.attr("title"), dateUpload: parseChapterDate(lines[lines.length - 1]?.text() ?? "") }
    })
  },

  // The mobile site's "roll" reader lists every page at once when readway=2.
  async getPageList(chapter) {
    const document = await page(mobileUrl + chapter.url.replace("/manga/", "/roll_manga/"), { Cookie: `readway=2; ${cookie}`, Referer: `${mobileUrl}/` })
    return document.select("#viewer img").map((img) => ({ url: img.absUrl("data-original") }))
  },

  getFilterList() {
    const options = (pairs: [string, string][]) => pairs.map(([label, value]) => ({ label, value }))
    const method = options([["contain", "cw"], ["begin", "bw"], ["end", "ew"]])
    return [
      { type: "text", id: "name", name: "Name", value: "" },
      { type: "select", id: "type", name: "Type", options: options([["Any", "0"], ["Japanese Manga", "1"], ["Korean Manhwa", "2"], ["Chinese Manhua", "3"], ["European Manga", "4"], ["American Manga", "5"], ["HongKong Manga", "6"], ["Other Manga", "7"]]), selected: 0 },
      { type: "select", id: "st", name: "Completed Series", options: options([["Either", "0"], ["Yes", "2"], ["No", "1"]]), selected: 0 },
      { type: "select", id: "author_method", name: "Author method", options: method, selected: 0 },
      { type: "text", id: "author", name: "Author", value: "" },
      { type: "tristates", id: "genres", name: "Genre", options: options(genres), included: [], excluded: [] },
    ]
  },
}

export default source
