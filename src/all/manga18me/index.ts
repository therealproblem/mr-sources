// Ported from the Keiyoushi "Manga18Me" extension (v1.4.3):
// https://github.com/keiyoushi/extensions-source/tree/main/src/all/manga18me
// Licensed under the Apache License, Version 2.0.

import { fetchHTML, queryString, relativeUrl, type Filter, type HTMLNode, type MangasPage, type Source } from "../../../sdk"

const baseUrl = "https://manga18.me"
const headers = { Referer: `${baseUrl}/` }

function makeSource([id, lang]: [string, string]): Source {
  const get = (url: string) => fetchHTML({ url, headers })

  function parseList(document: HTMLNode): MangasPage {
    let entries = document.select("div.page-item-detail")
    const hasNextPage = document.selectFirst(".next") != null
    if (lang === "en") {
      // Leave out raws unless they were asked for.
      const heading = document.selectFirst("div.section-heading h1")?.text().toLowerCase() ?? ""
      const canonical = document.selectFirst("div.canonical")?.attr("href") ?? ""
      entries = entries.filter((e) => heading.includes("raw") || canonical.includes("raw") || !(e.selectFirst("div.item-thumb.wleft a")?.attr("href") ?? "").includes("raw"))
    }
    const mangas = entries.map((e) => ({
      url: relativeUrl(e.selectFirst("a")?.absUrl("href") ?? ""),
      title: e.selectFirst("div.item-thumb.wleft img")?.attr("alt") ?? "",
      thumbnailUrl: e.selectFirst("img")?.absUrl("src") || undefined,
    }))
    return { mangas, hasNextPage }
  }

  return {
    info: {
      id, name: "Manga18.me", lang, version: "1.0.0", baseUrl, supportsLatest: true, nsfw: true,
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/manga18me/res/mipmap-xhdpi/ic_launcher.png",
      imageHeaders: headers,
    },

    async getPopularManga(page) {
      return parseList(await get(`${baseUrl}/manga/${page}?orderby=trending`))
    },

    async getLatestUpdates(page) {
      return parseList(await get(`${baseUrl}/manga/${page}?orderby=latest`))
    },

    async searchManga(page, query, filters) {
      if (query) return parseList(await get(`${baseUrl}/search?${queryString([["q", query], ["page", page]])}`))
      const value = (fid: string) => { const f = filters.find((x) => x.id === fid); return f?.type === "select" ? f.options[f.selected]?.value ?? "" : "" }
      const isChecked = (fid: string) => filters.some((x) => x.id === fid && x.type === "checkboxes" && x.checked.length > 0)
      const genre = value("genre") || "manga"
      const path = isChecked("raw") ? "raw" : isChecked("completed") ? "completed" : genre !== "manga" ? `genre/${genre}` : genre
      const sort = value("sort")
      return parseList(await get(`${baseUrl}/${path}/${page}${sort ? `?orderby=${sort}` : ""}`))
    },

    async getMangaDetails(manga) {
      const document = await get(baseUrl + manga.url)
      const info = document.selectFirst("div.post_content")
      let description = ""
      const summary = document.selectFirst("div.ss-manga")?.text()
      if (summary && summary !== "N/A") description += `${summary}\n`
      const alternative = info?.selectFirst("div.post-content_item.wleft:contains(Alternative) div.summary-content")?.text()
      if (alternative && alternative !== "Updating") {
        description += "Alternative Names:\n" + alternative.split(/[/;]/).map((alt) => `- ${alt.trim()}\n`).join("")
      }
      const status = info?.selectFirst("div.post-content_item.wleft:contains(Status) div.summary-content")?.text()
      const artist = info?.selectFirst("div.href-content.artist-content > a")?.text()
      return {
        title: document.select("div.post-title.wleft > h1").map((h) => h.text()).join(" "),
        description,
        status: status === "Ongoing" ? "ongoing" : status === "Completed" ? "completed" : "unknown",
        author: artist && artist !== "Updating" ? artist : undefined,
        artist: artist && artist !== "Updating" ? artist : undefined,
        genres: info?.select("div.href-content.genres-content > a[href*=/manga-list/]").map((a) => a.text()),
        thumbnailUrl: document.selectFirst("div.summary_image > img")?.absUrl("src") || undefined,
      }
    },

    async getChapterList(manga) {
      const document = await get(baseUrl + manga.url)
      return document.select("ul.row-content-chapter.wleft .a-h.wleft").map((e) => {
        const link = e.selectFirst("a")
        return { url: relativeUrl(link?.absUrl("href") ?? ""), name: link?.text() ?? "", dateUpload: parseDayMonthYear(e.selectFirst("span")?.text()) }
      })
    },

    async getPageList(chapter) {
      const images = (await get(baseUrl + chapter.url)).select("div.read-content.wleft img")
      if (images.length === 0) throw new Error("Unable to find script with image data")
      return images.map((img) => ({ url: img.attr("src") }))
    },

    getFilterList() {
      const select = (fid: string, name: string, pairs: [string, string][]): Filter => ({ type: "select", id: fid, name, options: pairs.map(([label, value]) => ({ label, value })), selected: 0 })
      return [
        { type: "header", id: "note", name: "The filter is ignored when using text search." },
        select("genre", "Genre", genres),
        select("sort", "Sort", [["Latest", "latest"], ["A-Z", "alphabet"], ["Rating", "rating"], ["Trending", "trending"]]),
        { type: "checkboxes", id: "raw", name: "Raw", options: [{ label: "Raw", value: "on" }], checked: [] },
        { type: "checkboxes", id: "completed", name: "Completed", options: [{ label: "Completed", value: "on" }], checked: [] },
      ]
    },
  }
}

export default ([["1353606378087565589", "all"], ["6244055465910932489", "en"]] as [string, string][]).map(makeSource)

/** "05 Oct 2024" */
function parseDayMonthYear(text: string | undefined): number | undefined {
  const match = /(\d{1,2})\s+([A-Za-z]{3})\w*\s+(\d{4})/.exec(text ?? "")
  if (!match) return undefined
  const month = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(match[2].toLowerCase())
  return month < 0 ? undefined : new Date(Number(match[3]), month, Number(match[1])).getTime()
}

const genres: [string, string][] = [
  ["Manga", "manga"], ["Drama", "drama"], ["Mature", "mature"], ["Romance", "romance"], ["Adult", "adult"], ["Hentai", "hentai"],
  ["Comedy", "comedy"], ["Ecchi", "ecchi"], ["School Life", "school-life"], ["Shounen", "shounen"], ["Slice of Life", "slice-of-life"],
  ["Seinen", "seinen"], ["Yuri", "yuri"], ["Action", "action"], ["Fantasy", "fantasy"], ["Harem", "harem"], ["Supernatural", "supernatural"],
  ["Sci-Fi", "sci-fi"], ["Isekai", "isekai"], ["Shoujo", "shoujo"], ["Horror", "horror"], ["Psychological", "psychological"],
  ["Smut", "smut"], ["Tragedy", "tragedy"], ["Raw", "raw"], ["Historical", "historical"], ["Adventure", "adventure"],
  ["Martial Arts", "martial-arts"], ["Manhwa", "manhwa"], ["Manhua", "manhua"], ["Mystery", "mystery"], ["BL", "bl"], ["Yaoi", "yaoi"],
  ["Gender Bender", "gender-bender"], ["Thriller", "thriller"], ["Josei", "josei"], ["Sports", "sports"], ["GL", "gl"],
  ["Family", "family"], ["Magic", "magic"],
]
