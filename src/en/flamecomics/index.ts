// Ported from the Keiyoushi "Flame Comics" extension (v1.6.1):
// https://github.com/keiyoushi/extensions-source/tree/main/src/en/flamecomics
// Licensed under the Apache License, Version 2.0.

import { fetchHTML, queryString, type Chapter, type Manga, type MangaStatus, type MangasPage, type Source } from "../../../sdk"

const baseUrl = "https://flamecomics.xyz"
const imagesUrl = (seriesId: number) => `https://cdn.flamecomics.xyz/uploads/images/series/${seriesId}`

interface SeriesDto {
  title: string
  altTitles?: string[] | null
  description?: string | null
  cover: string
  type: string
  tags?: string[] | null
  author?: string[] | null
  artist?: string[] | null
  status: string
  series_id?: number | null
  last_edit: number
  popularityRank?: number | null
}
interface ChapterDto { chapter: number | string; title?: string | null; release_date: number; series_id: number; token: string }

/** The site's Next.js data routes are keyed by its build ID, which changes with every deploy. */
let buildId: string | undefined
async function freshBuildId(): Promise<string> {
  const data = (await fetchHTML(baseUrl)).selectFirst("script#__NEXT_DATA__")?.data()
  const id = data ? (JSON.parse(data) as { buildId?: string }).buildId : undefined
  if (!id) throw new Error("Failed to find buildId")
  buildId = id
  return id
}

async function nextData<T>(path: string, params: [string, string][] = []): Promise<T> {
  const url = (id: string) => `${baseUrl}/_next/data/${id}/${path}${params.length ? `?${queryString(params)}` : ""}`
  let response = await Honya.request(url(buildId ?? await freshBuildId()))
  if (response.status === 404) response = await Honya.request(url(await freshBuildId()))
  if (response.status < 200 || response.status > 299) throw new Error(`HTTP ${response.status} for ${response.url}`)
  return (JSON.parse(response.body) as { pageProps: T }).pageProps
}

const toManga = (s: SeriesDto): Manga | undefined =>
  s.series_id == null ? undefined : { url: `/series/${s.series_id}`, title: s.title, thumbnailUrl: `${imagesUrl(s.series_id)}/${s.cover}?${s.last_edit}` }
const list = (series: SeriesDto[]): MangasPage => ({ mangas: series.map(toManga).filter((m): m is Manga => m != null), hasNextPage: false })
const browse = async () => (await nextData<{ series: SeriesDto[] }>("browse.json")).series
const normalize = (text: string) => text.toLowerCase().replace(/[^A-Za-z0-9 ]/g, "")
const seriesId = (url: string) => url.replace(/\/$/, "").split("/").pop() ?? ""

const statuses: Record<string, MangaStatus> = { ongoing: "ongoing", dropped: "cancelled", hiatus: "onHiatus", completed: "completed" }

const source: Source = {
  info: {
    id: "8531542650987673943", name: "Flame Comics", lang: "en", version: "1.0.2", baseUrl, supportsLatest: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/flamecomics/res/mipmap-xhdpi/ic_launcher.png",
    rateLimits: [{ host: "flamecomics.xyz", permits: 2, periodMs: 2000 }],
  },

  async getPopularManga() {
    const rank = (s: SeriesDto) => s.popularityRank ?? Number.MAX_SAFE_INTEGER
    return list((await browse()).sort((a, b) => rank(a) - rank(b)))
  },

  async getLatestUpdates() {
    return list((await nextData<{ allSeries: SeriesDto[] }>("latest.json")).allSeries)
  },

  async searchManga(_, query) {
    const needle = normalize(query)
    return list((await browse()).filter((s) => normalize(s.title).includes(needle)))
  },

  async getMangaDetails(manga) {
    const id = seriesId(manga.url)
    const { series } = await nextData<{ series: SeriesDto }>(`series/${id}.json`, [["id", id]])
    const synopsis = series.description ? Honya.parseHTML(`<body>${series.description}</body>`).text() : ""
    const alternatives = (series.altTitles ?? []).map((t) => t.trim()).filter(Boolean)
    const description = [synopsis, alternatives.length ? `Alternative Names:${alternatives.map((n) => `\n- ${n}`).join("")}` : ""].filter(Boolean).join("\n\n")
    return {
      ...toManga(series),
      url: undefined,
      description: description || undefined,
      genres: [...new Set([series.type, ...(series.tags ?? [])])],
      author: series.author?.join(", "),
      artist: series.artist?.join(", "),
      status: statuses[series.status.toLowerCase()] ?? "unknown",
    }
  },

  async getChapterList(manga) {
    const id = seriesId(manga.url)
    const { chapters } = await nextData<{ chapters: ChapterDto[] }>(`series/${id}.json`, [["id", id]])
    // The number sometimes comes as a string ("12.00").
    return chapters.map((c): Chapter => {
      const number = Number(c.chapter)
      return {
        url: `/series/${c.series_id}/${c.token}`,
        chapterNumber: Number.isFinite(number) ? number : undefined,
        dateUpload: Number(c.release_date) * 1000 || undefined,
        name: `Chapter ${Number.isFinite(number) ? String(number) : c.chapter}${c.title?.trim() ? ` - ${c.title}` : ""}`,
      }
    })
  },

  async getPageList(chapter) {
    const [, , id, token] = chapter.url.split("/")
    const { chapter: data } = await nextData<{ chapter: { release_date: number; series_id: number; token: string; images: Record<string, { name: string }> } }>(
      `series/${id}/${token}.json`, [["id", id], ["token", token]])
    return Object.values(data.images).map((image) => ({ url: `${imagesUrl(data.series_id)}/${data.token}/${image.name}?${data.release_date}` }))
  },
}

export default source
