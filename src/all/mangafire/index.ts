// Ported from the Keiyoushi "MangaFire" extension (v1.6.34):
// https://github.com/keiyoushi/extensions-source/tree/main/src/all/mangafire
// Licensed under the Apache License, Version 2.0.

import { send, type Chapter, type Filter, type FilterOption, type Manga, type MangaStatus, type MangasPage, type Source } from "../../../sdk"
import { signedUrl } from "./vrf"

const baseUrl = "https://mangafire.to"
const headers = { Accept: "application/json" }

// [Mihon source ID, language]
const languages: [string, string][] = [
  ["6084907896154116083", "en"],
  ["8098539940032331958", "es"],
  ["3849324770075062403", "es-419"],
  ["6228021941803932286", "fr"],
  ["524110931382140732", "ja"],
  ["758400875161895515", "pt"],
  ["7842137233968841729", "pt-BR"],
]

interface ApiResponse<T> { items?: T[]; meta?: { lastPage?: number; hasNext?: boolean } }
interface Poster { small?: string; medium?: string; large?: string }
interface MangaDto { hid: string; slug?: string; title: string; poster?: Poster }
interface MangaDetailsDto extends MangaDto {
  type?: string
  status?: string
  synopsisHtml?: string
  authors?: { title: string }[]
  artists?: { title: string }[]
  genres?: { title: string }[]
  themes?: { title: string }[]
}
interface ChapterDto { id: number; number: number; name?: string; createdAt?: number; type?: string }
interface VolumeDto { id: number; number: number; name?: string; chapterCount: number; language: string }

/** GETs a signed API URL, explaining the captcha MangaFire sometimes asks for. */
async function api<T>(path: string, params: [string, string][] = []): Promise<T> {
  const response = await Rakuen.request({ url: signedUrl(baseUrl, path, params), headers })
  if (response.status === 403 && response.body.includes("captcha_required")) {
    throw new Error("MangaFire is asking for a captcha. Open MangaFire in the web view, solve it, then try again.")
  }
  if (response.status < 200 || response.status > 299) throw new Error(`HTTP ${response.status} for ${response.url}`)
  return JSON.parse(response.body) as T
}

function makeSource([id, lang]: [string, string]): Source {
  const langCode = lang === "es-419" ? "es-la" : lang === "pt-BR" ? "pt-br" : lang
  const pref = <T>(key: string, fallback: T): T => (Rakuen.prefs.get(key) as T | null | undefined) ?? fallback
  const contentRating = () => pref<string[]>("pref_content_rating", [])

  async function titles(params: [string, string][]): Promise<MangasPage> {
    const data = await api<ApiResponse<MangaDto>>("/api/titles", params)
    return { mangas: (data.items ?? []).map(toManga), hasNextPage: data.meta?.hasNext ?? false }
  }

  async function allChapters(hid: string): Promise<ChapterDto[]> {
    const page = (n: number) => api<ApiResponse<ChapterDto>>(`/api/titles/${hid}/chapters`, [
      ["language", langCode], ["sort", "number"], ["order", "desc"], ["page", String(n)], ["limit", "200"],
    ])
    const first = await page(1)
    const lastPage = first.meta?.lastPage ?? 1
    const rest = await Promise.all(Array.from({ length: Math.max(0, lastPage - 1) }, (_, i) => page(i + 2)))
    return [first, ...rest].flatMap((data) => data.items ?? [])
  }

  return {
    info: {
      id,
      name: "MangaFire",
      lang,
      version: "1.0.0",
      baseUrl,
      supportsLatest: true,
      nsfw: true,
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/mangafire/res/mipmap-xhdpi/ic_launcher.png",
      rateLimits: [{ host: "mangafire.to", permits: 2, periodMs: 1000 }],
    },

    getPopularManga(page) {
      return titles([["order[views_30d]", "desc"], ["page", String(page)], ["limit", "50"], ...contentRating().map((r): [string, string] => ["content_rating[]", r])])
    },

    getLatestUpdates(page) {
      return titles([["order[chapter_updated_at]", "desc"], ["page", String(page)], ["limit", "50"], ...contentRating().map((r): [string, string] => ["content_rating[]", r])])
    },

    async searchManga(page, query, filters) {
      if (filters.length === 0) filters = filterList(contentRating())
      const params: [string, string][] = []
      if (query.trim()) params.push(["keyword", query.trim()])
      params.push(["page", String(page)], ["limit", "50"])

      const author = filters.find((f) => f.id === "author")
      const authorQuery = author?.type === "text" ? author.value.trim() : ""
      if (authorQuery) {
        const tags = await api<{ data?: { id: number; type: string }[] }>("/api/tags", [["keyword", authorQuery]])
        const match = tags.data?.find((tag) => tag.type === "author" || tag.type === "artist")
        if (!match) return { mangas: [], hasNextPage: false }
        params.push(["authors[]", String(match.id)])
      }
      for (const filter of filters) params.push(...filterParams(filter))
      return titles(params)
    },

    async getMangaDetails(manga) {
      const data = await api<{ data: MangaDetailsDto }>(`/api/titles/${hid(manga.url)}`)
      return toDetails(data.data)
    },

    async getChapterList(manga) {
      const id = hid(manga.url)
      let showVolumes = pref("show_as_volumes", false)
      let chapters: Chapter[] = []
      if (showVolumes) {
        const volumes = (await api<ApiResponse<VolumeDto>>(`/api/titles/${id}/volumes`)).items ?? []
        if (volumes.length > 0) {
          chapters = volumes.filter((v) => v.language === langCode).map((v) => volumeChapter(v, manga.url))
        } else {
          showVolumes = false
        }
      }
      if (!showVolumes) {
        chapters = (await allChapters(id)).map((c) => toChapter(c, manga.url, langCode))
      }
      if (!showVolumes && pref("merge_chapters", false)) {
        const preferOfficial = pref("prefer_official", true)
        const isOfficial = (c: Chapter) => c.scanlator?.toLowerCase() === "official"
        const seen = new Set<number | undefined>()
        chapters = [...chapters]
          .sort((a, b) => Number(preferOfficial ? !isOfficial(a) : isOfficial(a)) - Number(preferOfficial ? !isOfficial(b) : isOfficial(b)))
          .filter((c) => (seen.has(c.chapterNumber) ? false : (seen.add(c.chapterNumber), true)))
          .sort((a, b) => (b.chapterNumber ?? 0) - (a.chapterNumber ?? 0))
      }
      return chapters
    },

    async getPageList(chapter) {
      const segments = chapter.url.split("/").filter(Boolean)
      const last = segments[segments.length - 1]
      let path: string
      if (segments.includes("volume")) {
        path = `/api/volumes/${last}`
      } else {
        const chapterId = Number(last.split("-")[0])
        if (!Number.isInteger(chapterId)) throw new Error("Refresh the chapter list.")
        path = `/api/chapters/${chapterId}`
      }
      const data = await api<{ data: { pages: { url: string }[] } }>(path)
      return data.data.pages.map((p) => ({ url: p.url }))
    },

    getFilterList() {
      return filterList(contentRating())
    },
  }
}

export default languages.map(makeSource)

/** The title's hid: from /title/<hid>-<slug>, or the old /manga/<slug>.<hid>. */
function hid(url: string): string {
  const last = url.replace(/\/$/, "").split("/").pop() ?? ""
  if (last.includes(".")) return last.slice(last.lastIndexOf(".") + 1)
  if (last.includes("-")) return last.slice(0, last.indexOf("-"))
  return last
}

function toManga(dto: MangaDto): Manga {
  return {
    url: `/title/${dto.hid}${dto.slug ? `-${dto.slug}` : ""}`,
    title: dto.title,
    thumbnailUrl: dto.poster?.large ?? dto.poster?.medium ?? dto.poster?.small,
  }
}

function toDetails(dto: MangaDetailsDto): Partial<Manga> {
  const statuses: Record<string, MangaStatus> = { releasing: "ongoing", finished: "completed", on_hiatus: "onHiatus", discontinued: "cancelled" }
  return {
    title: dto.title,
    thumbnailUrl: dto.poster?.large ?? dto.poster?.medium ?? dto.poster?.small,
    author: dto.authors?.map((a) => a.title).join(", "),
    artist: dto.artists?.map((a) => a.title).join(", "),
    description: dto.synopsisHtml ? Rakuen.parseHTML(`<body>${dto.synopsisHtml}</body>`).text() : undefined,
    genres: [
      ...(dto.type ? [dto.type.charAt(0).toUpperCase() + dto.type.slice(1)] : []),
      ...(dto.genres ?? []).map((g) => g.title),
      ...(dto.themes ?? []).map((t) => t.title),
    ],
    status: statuses[dto.status?.toLowerCase() ?? ""] ?? "unknown",
  }
}

const chapterNumberPattern = /(?<=\b(?:ch(?:\.|apter)?|ep(?:\.|isode)?)\s?)\d+(?:\.\d+)?/i

function toChapter(dto: ChapterDto, mangaUrl: string, langCode: string): Chapter {
  const number = String(dto.number)
  let chapterNumber = dto.number
  let name = `Ch. ${number}`
  if (dto.name?.trim()) {
    const extracted = Number(chapterNumberPattern.exec(dto.name)?.[0])
    if (Number.isFinite(extracted) && chapterNumberPattern.test(dto.name)) {
      chapterNumber = extracted
      name = dto.name
    } else {
      name = `Ch. ${number} - ${dto.name}`
    }
  }
  return {
    url: `${mangaUrl}/${dto.id}-chapter-${number}-${langCode}`,
    name,
    chapterNumber,
    scanlator: dto.type ?? "Unknown",
    dateUpload: dto.createdAt ? dto.createdAt * 1000 : undefined,
  }
}

function volumeChapter(dto: VolumeDto, mangaUrl: string): Chapter {
  return {
    url: `${mangaUrl}/volume/${dto.id}`,
    name: `Vol. ${dto.number}${dto.name?.trim() ? ` - ${dto.name}` : ""}`,
    chapterNumber: dto.number,
    scanlator: `${dto.chapterCount} chapters`,
  }
}

// Filters: the extension's own `id`s are the query parameter each one sets.

const options = (pairs: [string, string][]): FilterOption[] => pairs.map(([label, value]) => ({ label, value }))
const sorts: [string, string][] = [
  ["Latest update", "chapter_updated_at:desc"], ["Best match", "relevance:desc"], ["Recently added", "created_at:desc"],
  ["Title (A–Z)", "title:asc"], ["Title (Z–A)", "title:desc"], ["Year (newest)", "year:desc"], ["Year (oldest)", "year:asc"],
  ["Highest rated", "score:desc"], ["Most viewed · 7 days", "views_7d:desc"], ["Most viewed · 30 days", "views_30d:desc"],
  ["Most viewed · all time", "views_total:desc"], ["Most followed", "follows_total:desc"],
]

function filterList(contentRating: string[]): Filter[] {
  return [
    { type: "checkboxes", id: "content_rating[]", name: "Content Rating", options: options([["Safe", "safe"], ["Suggestive", "suggestive"], ["Erotica", "erotica"], ["Pornographic", "pornographic"]]), checked: contentRating },
    { type: "separator", id: "s1" },
    { type: "checkboxes", id: "types[]", name: "Type", options: options([["Manga", "manga"], ["Manhwa", "manhwa"], ["Manhua", "manhua"], ["Other", "other"]]), checked: [] },
    { type: "separator", id: "s2" },
    { type: "select", id: "genres_mode", name: "Genre and theme match mode", options: options([["AND", "and"], ["OR", "or"]]), selected: 0 },
    { type: "tristates", id: "genres", name: "Genres", options: options(genres), included: [], excluded: [] },
    { type: "separator", id: "s3" },
    { type: "checkboxes", id: "theme_ids[]", name: "Themes", options: options(themes), checked: [] },
    { type: "separator", id: "s4" },
    { type: "checkboxes", id: "statuses[]", name: "Status", options: options([["Releasing", "releasing"], ["Finished", "finished"], ["On Hiatus", "on_hiatus"], ["Discontinued", "discontinued"], ["Not Yet Released", "not_yet_released"]]), checked: [] },
    { type: "separator", id: "s5" },
    { type: "text", id: "author", name: "Author / Artist", value: "" },
    { type: "text", id: "year_from", name: "Release year (From)", value: "" },
    { type: "text", id: "year_to", name: "Release year (To)", value: "" },
    { type: "text", id: "min_chap", name: "Minimum chapters", value: "" },
    { type: "separator", id: "s6" },
    { type: "select", id: "sort", name: "Sort by", options: options(sorts), selected: 1 },
  ]
}

function filterParams(filter: Filter): [string, string][] {
  switch (filter.type) {
    case "checkboxes":
      return filter.options.filter((o) => filter.checked.includes(o.value)).map((o) => [filter.id, o.value])
    case "tristates":
      return filter.options.flatMap((o): [string, string][] =>
        filter.included.includes(o.value) ? [["genres_in[]", o.value]] : filter.excluded.includes(o.value) ? [["genres_ex[]", o.value]] : [])
    case "select":
      if (filter.id === "genres_mode") {
        const mode = filter.options[filter.selected]?.value ?? "and"
        return [["genres_mode", mode], ["theme_mode", mode]]
      }
      if (filter.id === "sort") {
        const [field, order] = (filter.options[filter.selected]?.value ?? "chapter_updated_at:desc").split(":")
        return [[`order[${field}]`, order]]
      }
      return []
    case "text": {
      const number = Number.parseInt(filter.value, 10)
      if (filter.id === "min_chap") return number > 0 ? [["min_chap", String(number)]] : []
      if (filter.id === "year_from" || filter.id === "year_to") return Number.isNaN(number) ? [] : [[filter.id, String(number)]]
      return []
    }
    default:
      return []
  }
}

const genres: [string, string][] = [
  ["Action", "1"], ["Adult", "268929"], ["Adventure", "78"], ["Avant Garde", "3"], ["Boys Love", "4"], ["Comedy", "5"],
  ["Crime", "268921"], ["Demons", "77"], ["Drama", "6"], ["Ecchi", "7"], ["Fantasy", "79"], ["Girls Love", "9"],
  ["Gourmet", "10"], ["Harem", "11"], ["Hentai", "268930"], ["Historical", "268922"], ["Horror", "530"], ["Isekai", "13"],
  ["Iyashikei", "531"], ["Josei", "15"], ["Kids", "532"], ["Magic", "539"], ["Magical Girls", "268923"], ["Mahou Shoujo", "533"],
  ["Martial Arts", "534"], ["Mature", "268931"], ["Mecha", "19"], ["Medical", "268924"], ["Military", "535"], ["Music", "21"],
  ["Mystery", "22"], ["Parody", "23"], ["Philosophical", "268925"], ["Psychological", "536"], ["Reverse Harem", "25"],
  ["Romance", "26"], ["School", "73"], ["Sci-Fi", "28"], ["Seinen", "537"], ["Shoujo", "30"], ["Shounen", "31"],
  ["Slice of Life", "538"], ["Smut", "268932"], ["Space", "33"], ["Sports", "34"], ["Super Power", "75"], ["Superhero", "268926"],
  ["Supernatural", "76"], ["Suspense", "37"], ["Thriller", "38"], ["Tragedy", "268927"], ["Vampire", "39"], ["Wuxia", "268928"],
]

const themes: [string, string][] = [
  ["Aliens", "268933"], ["Animals", "268934"], ["Cooking", "268935"], ["Crossdressing", "268936"], ["Delinquents", "268937"],
  ["Demons", "268938"], ["Genderswap", "268939"], ["Ghosts", "268940"], ["Gyaru", "268941"], ["Harem", "268942"],
  ["Incest", "268943"], ["Loli", "268944"], ["Mafia", "268945"], ["Magic", "268946"], ["Martial Arts", "268947"],
  ["Military", "268948"], ["Monster Girls", "268949"], ["Monsters", "268950"], ["Music", "268951"], ["Ninja", "268952"],
  ["Office Workers", "268953"], ["Police", "268954"], ["Post-Apocalyptic", "268955"], ["Reincarnation", "268956"],
  ["Reverse Harem", "268957"], ["Samurai", "268958"], ["School Life", "268959"], ["Shota", "268960"], ["Supernatural", "268961"],
  ["Survival", "268962"], ["Time Travel", "268963"], ["Traditional Games", "268964"], ["Vampires", "268965"],
  ["Video Games", "268966"], ["Villainess", "268967"], ["Virtual Reality", "268968"], ["Zombies", "268969"],
]
