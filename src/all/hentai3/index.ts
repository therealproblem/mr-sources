// Ported from the Keiyoushi "3Hentai" extension (v1.6.6):
// https://github.com/keiyoushi/extensions-source/tree/main/src/all/hentai3
// Licensed under the Apache License, Version 2.0.

import { fetchPage, queryString, relativeUrl, type Filter, type HTMLNode, type MangasPage, type Source } from "../../../sdk"

const baseUrl = "https://3hentai.net"

// [Mihon source ID, language, the site's language name]
const languages: [string, string, string][] = [
  ["6915411826598362561", "all", ""], ["7819216870104067677", "en", "english"], ["2859097949969075077", "ja", "japanese"],
  ["1633661983859923604", "ko", "korean"], ["6260479722543828095", "zh", "chinese"],
  ["373755159908438683", "es", "spanish"], ["1132983959765816866", "pt", "Portuguese"], ["49558592523574241", "id", "indonesian"],
  ["7615826761003926053", "jv", "javanese"], ["3940534831604021485", "tl", "tagalog"], ["6096870058125388335", "vi", "vietnamese"],
  ["3039466073711396152", "th", "thai"], ["3523364768003208635", "my", "burmese"], ["359674482170560410", "tr", "turkish"],
  ["4917651850397277037", "ru", "russian"], ["3501213105339612791", "uk", "ukrainian"], ["7940950215101782907", "pl", "polish"],
  ["7057309244033446342", "de", "german"], ["419728421305339582", "it", "italian"],
  ["4290439286788644779", "fr", "french"], ["7640863230103182507", "nl", "dutch"], ["3862668659803323645", "cs", "czech"],
  ["8643172240389130297", "hu", "hungarian"], ["2158865776377405902", "bg", "bulgarian"], ["8884989104958593922", "is", "icelandic"],
  ["5003216810967182175", "la", "latin"], ["1533969146563051444", "ar", "arabic"],
]

const shortTitle = (title: string) => (Honya.prefs.get("full_title") === true ? title : title.replace(/(\[[^\]]*]|[({][^)}]*[)}])/g, "").trim())
const capitalizeEach = (text: string) => text.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
const imageOf = (img: HTMLNode) => img.attr("data-src") || img.absUrl("src")

async function parseList(url: string): Promise<MangasPage> {
  const { document } = await fetchPage(url)
  const mangas = document.select("a[href*=/d/]").flatMap((a) => {
    const title = a.selectFirst("div.title")?.ownText()
    if (title == null) return []
    return [{ title: shortTitle(title), url: relativeUrl(a.absUrl("href")), thumbnailUrl: a.selectFirst("img:not([class])")?.absUrl("src") }]
  })
  return { mangas, hasNextPage: document.selectFirst("a[rel=next]") != null }
}

const textFilters: [string, string, string, string][] = [
  ["tags", "Tags", "tags", ""], ["male_tags", "Male Tags", "tags", "male"], ["female_tags", "Female Tags", "tags", "female"],
  ["series", "Series", "series", ""], ["characters", "Characters", "characters", ""], ["artist", "Artists", "artist", ""],
  ["groups", "Groups", "groups", ""], ["language", "Languages", "language", ""], ["page", "Pages", "page", ""],
]

function makeSource([id, lang, searchLang]: [string, string, string]): Source {
  return {
    info: {
      id, name: "3Hentai", lang, version: "1.0.3", baseUrl, supportsLatest: true, nsfw: true,
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/hentai3/res/mipmap-xhdpi/ic_launcher.png",
    },

    getPopularManga(page) {
      return parseList(searchLang ? `${baseUrl}/language/${searchLang}/${page > 1 ? page : ""}?sort=popular` : `${baseUrl}/search?q=pages%3A>0&page=${page}&sort=popular`)
    },

    getLatestUpdates(page) {
      return parseList(searchLang ? `${baseUrl}/language/${searchLang}/${page}` : `${baseUrl}/search?q=pages%3A>0&page=${page}`)
    },

    searchManga(page, query, filters) {
      let sort = ""
      let tags = ""
      for (const filter of filters) {
        if (filter.type === "select" && filter.id === "sort") sort = filter.options[filter.selected]?.value ?? ""
        if (filter.type !== "text") continue
        const spec = textFilters.find(([fid]) => fid === filter.id)
        if (!spec) continue
        const [, , type, specific] = spec
        for (const raw of filter.value.split(",").map((t) => t.trim()).filter(Boolean)) {
          const tag = raw.toLowerCase()
          if (tag.startsWith("-")) tags += "-"
          tags += type
          tags += type === "page" ? `:${tag}` : `:'${tag.replace(/^-/, "")}${specific ? ` (${specific})` : ""}' `
        }
      }
      const language = searchLang ? `language:${searchLang}` : ""
      return parseList(`${baseUrl}/search?${queryString([["q", `${query} ${language} ${tags}`], ...(page > 1 ? [["page", String(page)] as [string, string]] : []), ["sort", sort]])}`)
    },

    async getMangaDetails(manga) {
      const { document } = await fetchPage(baseUrl + manga.url)
      const names = (path: string) => document.select(`a[href*=/${path}/]`).map((a) => a.text()).join(", ")
      const groups = names("groups")
      const artists = names("artists")
      let description = ""
      for (const [label, path] of [["Characters", "characters"], ["Series", "series"], ["Groups", "groups"], ["Languages", "language"]]) {
        const value = names(path)
        if (value) description += `${label}: ${capitalizeEach(value)}\n\n`
      }
      description += `${document.select("div.tag-container:contains(pages:)").map((e) => e.text()).join(" ")}\n`
      const firstImage = document.selectFirst("img")
      return {
        title: shortTitle(document.select("h1").map((h) => h.text()).join(" ")),
        author: groups || artists || undefined,
        artist: artists || groups || undefined,
        genres: document.select("a[href*=/tags/]").map((a) => {
          const tag = capitalizeEach(a.text())
          return tag.includes("male") ? tag.replace("(female)", "♀").replace("(male)", "♂") : `${tag} ◊`
        }),
        description,
        thumbnailUrl: firstImage ? imageOf(firstImage) : undefined,
        status: "completed",
      }
    },

    async getChapterList(manga) {
      const { document, url } = await fetchPage(baseUrl + manga.url)
      const time = document.select("time")[0]?.attr("datetime")
      return [{ name: "Chapter", url: relativeUrl(url), dateUpload: time ? Date.parse(time) || undefined : undefined }]
    },

    async getPageList(chapter) {
      const { document } = await fetchPage(baseUrl + chapter.url)
      return document.select("img:not([class], [src*=thumb], [src*=cover])").map((img) => ({ url: img.absUrl("src").replace(/t(?=\.)/, "") }))
    },

    getFilterList(): Filter[] {
      return [
        { type: "select", id: "sort", name: "Sort by", options: [["Recent", ""], ["Popular: All Time", "popular"], ["Popular: Week", "popular-7d"], ["Popular: Today", "popular-24h"]].map(([label, value]) => ({ label, value })), selected: 0, listings: { popular: "popular", latest: "" } },
        { type: "separator", id: "s1" },
        { type: "header", id: "h1", name: "Separate tags with commas (,). Prepend with dash (-) to exclude." },
        { type: "header", id: "h2", name: "Use 'Male Tags' or 'Female Tags' for specific categories. 'Tags' searches all categories." },
        ...textFilters.filter(([fid]) => fid !== "page").map(([fid, name]): Filter => ({ type: "text", id: fid, name, value: "" })),
        { type: "separator", id: "s2" },
        { type: "header", id: "h3", name: "Filter by pages, for example: (>20)" },
        { type: "text", id: "page", name: "Pages", value: "" },
      ]
    },
  }
}

export default languages.map(makeSource)
