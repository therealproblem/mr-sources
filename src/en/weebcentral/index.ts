// Ported from the Keiyoushi "Weeb Central" extension (v1.6.25):
// https://github.com/keiyoushi/extensions-source/tree/main/src/en/weebcentral
// Licensed under the Apache License, Version 2.0.

import { fetchHTML, queryString, relativeUrl, type HTMLNode, type MangaStatus, type Source } from "../../../sdk"
import { filterList, queryParams } from "./filters"

const baseUrl = "https://weebcentral.com"
/** The search API ignores `limit` and always returns 32 entries. */
const fetchLimit = 32

const source: Source = {
  info: {
    id: "2131019126180322627", // Same as Mihon: md5("weeb central/en/1")
    name: "Weeb Central",
    lang: "en",
    version: "1.0.0",
    baseUrl,
    supportsLatest: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/weebcentral/res/mipmap-xhdpi/ic_launcher.png",
    rateLimits: [{ host: "weebcentral.com", permits: 1, periodMs: 2000 }],
    imageHeaders: { Accept: "image/avif,image/webp,*/*" },
  },

  // Popular / Latest / Search

  getPopularManga(page) {
    return this.searchManga(page, "", filterList("Popularity"))
  },

  getLatestUpdates(page) {
    return this.searchManga(page, "", filterList("Latest Updates"))
  },

  async searchManga(page, query, filters) {
    const text = query.replace(/[!#:(),-]/g, " ").trim()
    const params: [string, string | number][] = [
      ["text", text],
      ...queryParams(filters.length > 0 ? filters : filterList()),
      ["limit", fetchLimit],
      ["offset", (page - 1) * fetchLimit],
      ["display_mode", "Full Display"],
    ]
    const document = await fetchHTML(`${baseUrl}/search/data?${queryString(params)}`)

    const mangas = document.select("article > section > a").map((element) => {
      const title = element.selectFirst("div:not([class]):last-child")?.text()
      if (title == null) throw new Error("search result without a title")
      return { url: relativeUrl(element.attr("abs:href")), title, thumbnailUrl: cover(element) }
    })
    return { mangas, hasNextPage: document.selectFirst("button") != null }
  },

  // Details

  async getMangaDetails(manga) {
    const document = await fetchHTML(baseUrl + manga.url)

    const sections = document.select("section[x-data] > section")
    if (sections.length < 2) throw new Error("series page layout changed")
    const [info, body] = sections

    return {
      thumbnailUrl: cover(info) ?? manga.thumbnailUrl,
      author: info.select("ul > li:has(strong:contains(Author)) > span > a").map((a) => a.text()).join(", "),
      genres: info.select("ul > li:has(strong:contains(Tag),strong:contains(Type)) a").map((a) => a.text()),
      status: parseStatus(info.selectFirst("ul > li:has(strong:contains(Status)) > a")?.text()),
      title: body.selectFirst("h1")?.text(),
      description: description(body, document),
    }
  },

  // Chapters

  async getChapterList(manga) {
    // manga.url is /series/<id>/<slug>
    const id = manga.url.split("/").filter(Boolean)[1]
    if (!id) throw new Error(`unexpected series URL ${manga.url}`)
    const document = await fetchHTML(`${baseUrl}/series/${id}/full-chapter-list`)

    // Newest first.
    const elements = document.select("div[x-data] > a")
    return elements.map((element, index) => {
      const name = element.selectFirst("span.flex > span")?.text()
      if (name == null) throw new Error("chapter without a name")
      // Season-numbered series restart at 1 each season, so number them by position instead.
      const usesSeasons = /(Season|S)\s*\d+/i.test(name)
      const isOfficial = element.select("img").some((img) => img.attr("src").toLowerCase().includes("official"))
      const datetime = element.selectFirst("time[datetime]")?.attr("datetime")

      return {
        url: relativeUrl(element.attr("abs:href")),
        name,
        dateUpload: datetime ? Date.parse(datetime) || undefined : undefined,
        // Left out otherwise: the app reads it from the name.
        chapterNumber: usesSeasons ? elements.length - index : undefined,
        scanlator: isOfficial ? "Official" : "Unknown",
      }
    })
  },

  // Pages

  async getPageList(chapter) {
    const document = await fetchHTML(`${baseUrl}${chapter.url}/images?is_prev=False&reading_style=long_strip`)
    return document.select("section[x-data~=scroll] > img").map((img) => ({ url: img.attr("abs:src") }))
  },

  getFilterList() {
    return filterList()
  },
}

export default source

/** Prefers the `<source srcset>` cover (upgraded from "small" to "normal"), else `<img src>`. */
function cover(element: HTMLNode): string | undefined {
  const srcset = element.selectFirst("source")?.attr("srcset")
  if (srcset) return srcset.replaceAll("small", "normal")
  return element.selectFirst("img")?.attr("abs:src") || undefined
}

function parseStatus(text: string | undefined): MangaStatus {
  switch (text?.toLowerCase()) {
    case "ongoing": return "ongoing"
    case "complete": return "completed"
    case "hiatus": return "onHiatus"
    case "canceled": return "cancelled"
    default: return "unknown"
  }
}

function description(body: HTMLNode, document: HTMLNode): string {
  let text = ""

  const summary = body.selectFirst("li:has(strong:contains(Description)) > p")?.text()
  if (summary != null) {
    text += summary.replaceAll("NOTE: ", "\n\nNOTE: ")
  }

  const related = body.select("li:has(strong:contains(Related Series)) li")
  if (related.length > 0) {
    text += "\n\nRelated Series(s):"
    for (const series of related) {
      const link = series.selectFirst("a")
      if (!link) continue
      const relation = series.selectFirst("span")?.text() ?? ""
      text += `\n- [${link.text()}](${link.attr("abs:href")}) ${relation}`.trimEnd()
    }
  }

  const alternateTitles = body.select("li:has(strong:contains(Associated Name)) li")
  if (alternateTitles.length > 0) {
    text += "\n\nAssociated Name(s):"
    for (const title of alternateTitles) {
      text += `\n- ${title.text()}`
    }
  }

  const trackers = document.select("li:has(strong:contains(Track)) span[data-tip] > a")
  if (trackers.length > 0) {
    text += "\n\nTracker(s):"
    for (const tracker of trackers) {
      const name = tracker.parent()?.attr("data-tip") ?? ""
      text += `\n- [${name}](${tracker.attr("abs:href")})`
    }
  }

  return text.trim()
}
