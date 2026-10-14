// Ported from the Keiyoushi "HDoujin" extension:
// https://github.com/keiyoushi/extensions-source/tree/main/src/all/hdoujin
// Licensed under the Apache License, Version 2.0.

import { formBody, queryString, send, type Filter, type Manga, type MangasPage, type Source } from "../../../sdk"

const baseUrl = "https://hdoujin.org"
const apiUrl = "https://api.hdoujin.org/books"
// The API answers 400 without these.
const headers = { Referer: `${baseUrl}/`, Origin: baseUrl }

// [Mihon source ID, language]
const languages: [string, string][] = [
  ["2220258354919443918", "all"], ["3677056573528884471", "en"], ["6580865433441960135", "es"],
  ["4628927315861565171", "ja"], ["8377507648400729012", "ko"], ["2603728112834757616", "zh"],
]
const siteLanguages: Record<string, string> = { en: "english", es: "spanish", ja: "japanese", ko: "korean", zh: "chinese" }

interface Entries { entries: { id: number; key: string; title: string; thumbnail: { path: string } }[]; limit: number; page: number; total: number }
interface MangaDetail {
  id: number
  key: string
  title: string
  title_short?: string
  created_at?: number
  updated_at?: number
  subtitle?: string
  subtitle_short?: string
  thumbnails: { base: string; main: { path: string }; entries: { path: string }[] }
  tags?: { name: string; namespace?: number }[]
}
type DataKey = { id?: number; size?: number; key?: string } | undefined
interface MangaData { data: { "0": DataKey; "780"?: DataKey; "980"?: DataKey; "1280"?: DataKey; "1600"?: DataKey } }

const pref = <T>(key: string, fallback: T): T => (Honya.prefs.get(key) as T | null | undefined) ?? fallback

async function json<T>(url: string): Promise<T> {
  return JSON.parse((await send({ url, headers })).body) as T
}

/**
 * Gallery data needs the clearance token the site's reader keeps in localStorage. Opening a
 * reader page in a hidden web view gets a new one.
 */
let clearance: string | null = null
async function withClearance(url: string, readerUrl: string, post = false): Promise<string> {
  clearance ??= await Honya.localStorage(`${baseUrl}/`, "clearance")
    ?? await Honya.loadInWebView(readerUrl, { waitForLocalStorage: "clearance" })
  if (!clearance) throw new Error("Open HDoujin in the web view to refresh its token, then try again.")
  const signed = `${url}${url.includes("?") ? "&" : "?"}crt=${encodeURIComponent(clearance)}`
  const form = formBody([])
  const response = await Honya.request(post ? { url: signed, method: "POST", headers: { ...headers, ...form.headers }, body: form.body } : { url: signed, headers })
  if (response.status === 400 || response.status === 403) {
    clearance = null
    throw new Error("Open HDoujin in the web view to refresh its token, then try again.")
  }
  if (response.status < 200 || response.status > 299) throw new Error(`HTTP error ${response.status}`)
  return response.body
}

/** The "always include/exclude" tag settings, as search terms: tag:"a,-b" female:"c". */
function tagPreference(): string {
  const split = (text: string) => text.split(",").map((t) => t.trim()).filter(Boolean)
  const tags = [...split(pref("pref_include_tags", "")), ...split(pref("pref_exclude_tags", "")).map((t) => `-${t}`)]
  const groups = new Map<string, Set<string>>()
  for (const tag of tags) {
    const bare = tag.replace(/^-/, "")
    const parts = bare.split(":")
    const group = parts.length >= 2 && parts[0].trim() ? parts[0] : "tag"
    const name = parts[parts.length - 1].trim()
    if (!groups.has(group)) groups.set(group, new Set())
    groups.get(group)!.add(tag.startsWith("-") ? `-${name}` : name)
  }
  return [...groups].map(([group, values]) => `${group}:"${[...values].join(",")}"`).join(" ")
}

function parseEntries(data: Entries): MangasPage {
  return {
    mangas: data.entries.map((e) => ({ url: `${e.id}/${e.key}`, title: e.title, thumbnailUrl: e.thumbnail.path })),
    hasNextPage: data.limit * data.page < data.total,
  }
}

const capitalizeEach = (text: string) => text.split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")

function toDetails(detail: MangaDetail): Partial<Manga> {
  const groups: Record<string, string[]> = { artists: [], circles: [], parodies: [], characters: [], uploaders: [], males: [], females: [], mixed: [], language: [], other: [], tags: [] }
  for (const tag of detail.tags ?? []) {
    switch (tag.namespace ?? 0) {
      case 1: groups.artists.push(tag.name); break
      case 2: groups.circles.push(tag.name); break
      case 3: groups.parodies.push(tag.name); break
      case 5: groups.characters.push(tag.name); break
      case 7: if (tag.name !== "anonymous") groups.uploaders.push(tag.name); break
      case 8: groups.males.push(`${tag.name} ♂`); break
      case 9: groups.females.push(`${tag.name} ♀`); break
      case 10: groups.mixed.push(tag.name); break
      case 11: groups.language.push(tag.name); break
      case 12: groups.other.push(tag.name); break
      default: groups.tags.push(tag.name)
    }
  }
  const join = (names: string[]) => names.map(capitalizeEach).join(", ")
  let description = ""
  for (const [label, names] of [["Circles", groups.circles], ["Uploaders", groups.uploaders], ["Parodies", groups.parodies], ["Characters", groups.characters]] as [string, string[]][]) {
    if (names.length) description += `${label}: ${join(names)}\n`
  }
  if (description) description += "\n"
  if (detail.created_at) description += `Posted: ${new Date(detail.created_at).toUTCString()}\n`
  description += `Pages: ${detail.thumbnails.entries.length}\n\n`
  const alternatives = [...new Set([detail.subtitle, detail.subtitle_short])].filter((t): t is string => !!t?.trim())
  if (alternatives.length) description += `Alternative Title(s): ${alternatives.map((t) => `\n- ${t}`).join(", ")}\n\n`

  const title = pref("pref_remove_additional", false)
    ? detail.title_short ?? detail.title.replace(/(\[[^\]]*]|[({][^)}]*[)}])/g, "").trim()
    : detail.title
  return {
    title,
    thumbnailUrl: detail.thumbnails.base + detail.thumbnails.main.path,
    author: join(groups.circles.length ? groups.circles : groups.artists),
    artist: join(groups.artists),
    genres: [...groups.artists, ...groups.circles, ...groups.parodies, ...groups.characters, ...groups.tags, ...groups.females, ...groups.males, ...groups.mixed, ...groups.other].map(capitalizeEach),
    description,
    status: "completed",
  }
}

function makeSource([id, lang]: [string, string]): Source {
  const siteLang = siteLanguages[lang] ?? lang
  const browseTerms = () => [...(lang !== "all" ? [`language:"^${siteLang}"`] : []), tagPreference()].filter(Boolean)
  const browse = async (params: [string, string][]) => {
    const terms = browseTerms()
    return parseEntries(await json<Entries>(`${apiUrl}?${queryString([...params, ...(terms.length ? [["s", terms.join(" ")] as [string, string]] : [])])}`))
  }

  return {
    info: {
      id, name: "HDoujin", lang, version: "1.0.1", baseUrl, supportsLatest: true, nsfw: true,
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/hdoujin/res/mipmap-xhdpi/ic_launcher.png",
      rateLimits: [{ host: "api.hdoujin.org", permits: 3, periodMs: 1000 }],
      imageHeaders: headers,
    },

    getPopularManga(page) {
      return browse([["sort", "8"], ["page", String(page)]])
    },

    getLatestUpdates(page) {
      return browse([["page", String(page)]])
    },

    async searchManga(page, query, filters) {
      if (filters.length === 0) filters = this.getFilterList!()
      const terms = [query.trim()]
      if (lang !== "all") terms.push(`language:"^${siteLang}$"`)
      const tagType = filters.find((f) => f.id === "tag_type")
      const includeAll = !(tagType?.type === "select" && tagType.selected === 1)
      const params: [string, string][] = []
      let path = ""
      for (const filter of filters) {
        if (filter.type === "select" && filter.id === "sort") {
          const value = filter.options[filter.selected]?.value
          if (value === "popular") path = "/popular"
          else if (value) params.push(["sort", value])
        } else if (filter.type === "checkboxes" && filter.id === "cat") {
          const sum = filter.options.filter((o) => filter.checked.includes(o.value)).reduce((total, o) => total + Number(o.value), 0)
          if (sum > 0) params.push(["cat", String(sum)])
        } else if (filter.type === "text") {
          const tags = filter.value.split(",").map((t) => t.trim()).filter(Boolean)
          if (tags.length === 0) continue
          if (filter.id === "pages") {
            terms.push(`pages:${tags.join(",")}`)
          } else if (includeAll) {
            // Tags inside one term are OR-ed (exclusions always apply); separate terms are AND-ed.
            tags.filter((t) => !t.startsWith("-")).forEach((t) => terms.push(`${filter.id}:"${t}"`))
            const excluded = tags.filter((t) => t.startsWith("-"))
            if (excluded.length) terms.push(`${filter.id}:"${excluded.join(",")}"`)
          } else {
            terms.push(`${filter.id}:"${tags.join(",")}"`)
          }
        }
      }
      if (query) terms.push(`title:"${query}"`)
      const s = terms.filter(Boolean).join(" ")
      if (s) params.push(["s", s])
      params.push(["page", String(page)])
      return parseEntries(await json<Entries>(`${apiUrl}${path}?${queryString(params)}`))
    },

    async getMangaDetails(manga) {
      return toDetails(await json<MangaDetail>(`${apiUrl}/detail/${manga.url}`))
    },

    async getChapterList(manga) {
      const detail = await json<MangaDetail>(`${apiUrl}/detail/${manga.url}`)
      return [{ url: `${detail.id}/${detail.key}`, name: "Chapter", dateUpload: detail.updated_at ?? detail.created_at }]
    },

    async getPageList(chapter) {
      const [entryId, entryKey] = chapter.url.split("/")
      const readerUrl = `${baseUrl}/g/${chapter.url}/read/1`
      const { data } = JSON.parse(await withClearance(`${apiUrl}/detail/${chapter.url}`, readerUrl, true)) as MangaData
      // The preferred resolution, else the nearest there is.
      const fallbacks: Record<string, (keyof MangaData["data"])[]> = {
        "1600": ["1600", "1280", "0", "980", "780"], "1280": ["1280", "1600", "0", "980", "780"],
        "980": ["980", "1280", "0", "1600", "780"], "780": ["780", "980", "0", "1280", "1600"], "0": ["0", "1600", "1280", "980", "780"],
      }
      const order = fallbacks[pref("pref_image_quality", "1280")] ?? fallbacks["1280"]
      const dataId = order.map((q) => data[q]?.id).find((v) => v != null)
      const publicKey = order.map((q) => data[q]?.key).find((v) => v != null)
      if (dataId == null || publicKey == null) throw new Error("No Images Found")
      const quality = (["1600", "1280", "980", "780"] as const).find((q) => data[q]?.id === dataId) ?? "0"
      const images = JSON.parse(await withClearance(`${apiUrl}/data/${entryId}/${entryKey}/${dataId}/${publicKey}/${quality}`, readerUrl)) as { base: string; entries: { path: string }[] }
      return images.entries.map((image) => ({ url: `${images.base}/${image.path}?w=${quality}` }))
    },

    getFilterList(): Filter[] {
      const text = (fid: string, name: string): Filter => ({ type: "text", id: fid, name, value: "" })
      return [
        { type: "select", id: "sort", name: "Sort by", options: [["Title", "2"], ["Pages", "3"], ["Date", ""], ["Views", "8"], ["Favourites", "9"], ["Popular This Week", "popular"]].map(([label, value]) => ({ label, value })), selected: 2 },
        { type: "checkboxes", id: "cat", name: "Categories", options: [{ label: "Manga", value: "2" }, { label: "Doujinshi", value: "4" }, { label: "Illustration", value: "8" }], checked: ["2", "4", "8"] },
        { type: "separator", id: "s1" },
        { type: "select", id: "tag_type", name: "Tags Include Type", options: [{ label: "AND", value: "and" }, { label: "OR", value: "or" }], selected: 0 },
        { type: "separator", id: "s2" },
        { type: "header", id: "h1", name: "Separate tags with commas (,)" },
        { type: "header", id: "h2", name: "Prepend with dash (-) to exclude" },
        text("tag", "Tags"), text("male", "Male Tags"), text("female", "Female Tags"), text("mixed", "Mixed Tags"), text("other", "Other Tags"),
        { type: "separator", id: "s3" },
        text("artist", "Artists"), text("parody", "Parodies"), text("character", "Characters"),
        { type: "separator", id: "s4" },
        text("reason", "Uploader"), text("circle", "Circles"), text("language", "Languages"),
        { type: "separator", id: "s5" },
        { type: "header", id: "h3", name: "Filter by pages, for example: (>20)" },
        text("pages", "Pages"),
      ]
    },
  }
}

export default languages.map(makeSource)
