// Ported from the Keiyoushi "X-Manga" extension (v1.6.61):
// https://github.com/keiyoushi/extensions-source/tree/main/src/fr/scanhentaimenu
// Licensed under the Apache License, Version 2.0.
// The site left Madara for its own JSON API. Keiyoushi gave it a new ID (versionId 2), as entries
// saved by the Madara version can't open in this one.

import { fetchJSON, queryString, type Filter, type MangaStatus, type MangasPage, type Source } from "../../../sdk"

const baseUrl = "https://x-manga.org"
const imageHost = "https://reader.hentai.gifts"

interface MangaItem { title: string; slug: string; coverPath?: string | null }
interface Named { name: string }
interface MangaDetail extends MangaItem {
  description?: string | null
  status?: string | null
  genres?: Named[]
  authors?: Named[]
  artists?: Named[]
  tags?: Named[]
  chapters?: { id: string; chapterNumber?: number | null; title?: string | null; publishedAt?: string | null }[]
}

const statuses: Record<string, MangaStatus> = { ONGOING: "ongoing", COMPLETED: "completed", HIATUS: "onHiatus" }

const onImageHost = (path: string) => /^https?:\/\//.test(path) ? path : `${imageHost}${path.startsWith("/") ? "" : "/"}${path}`
const coverUrl = (path?: string | null) => !path ? undefined : path.startsWith("/covers/") ? baseUrl + path : onImageHost(path)
const names = (list?: Named[]) => (list ?? []).map((n) => n.name.trim()).filter(Boolean)

async function list(params: [string, string][]): Promise<MangasPage> {
  const data = await fetchJSON<{ mangas: MangaItem[]; pagination?: { current: number; totalPages: number } | null }>(`${baseUrl}/api/mangas?${queryString(params)}`)
  return {
    mangas: data.mangas.map((m) => ({ url: m.slug, title: m.title.trim(), thumbnailUrl: coverUrl(m.coverPath) })),
    hasNextPage: data.pagination ? data.pagination.current < data.pagination.totalPages : false,
  }
}

async function detail(slug: string): Promise<MangaDetail> {
  const { manga } = await fetchJSON<{ manga?: MangaDetail | null }>(`${baseUrl}/api/mangas/${slug}`)
  if (!manga) throw new Error(`Manga introuvable (${slug})`)
  return manga
}

const select = (id: string, name: string, choices: [string, string][]): Filter => ({ type: "select", id, name, options: choices.map(([label, value]) => ({ label, value })), selected: 0 })

const source: Source = {
  info: {
    id: "8214773311087111646", name: "X-Manga", lang: "fr", version: "1.2.0", baseUrl, supportsLatest: true, nsfw: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/fr/scanhentaimenu/res/mipmap-xhdpi/ic_launcher.png",
  },

  getPopularManga(page) {
    return list([["page", String(page)], ["sort", "views"]])
  },

  getLatestUpdates(page) {
    return list([["page", String(page)], ["sort", "latest"]])
  },

  searchManga(page, query, filters) {
    const params: [string, string][] = [["page", String(page)]]
    if (query.trim()) params.push(["search", query.trim()])
    for (const filter of filters) {
      const value = filter.type === "select" ? filter.options[filter.selected]?.value : filter.type === "text" ? filter.value.trim() : ""
      // The genre list and the free genre field both set "genre".
      if (value) params.push([filter.id === "genreText" ? "genre" : filter.id, value])
    }
    if (!params.some(([key]) => key === "sort") && !query.trim()) params.push(["sort", "latest"])
    return list(params)
  },

  async getMangaDetails(manga) {
    const m = await detail(manga.url)
    return {
      title: m.title.trim(),
      author: names(m.authors).join(", ") || undefined,
      artist: names(m.artists).join(", ") || undefined,
      description: m.description?.trim() || undefined,
      genres: [...new Set([...names(m.genres), ...names(m.tags)])],
      status: statuses[m.status?.toUpperCase() ?? ""] ?? "unknown",
      thumbnailUrl: coverUrl(m.coverPath),
    }
  },

  async getChapterList(manga) {
    return ((await detail(manga.url)).chapters ?? []).map((c) => {
      const number = c.chapterNumber != null ? String(c.chapterNumber) : undefined
      const fallback = number ? `Chapitre ${number}` : "Chapitre"
      const title = c.title?.trim()
      const name = !title ? fallback : number && !title.includes(number) && !/^chapitre/i.test(title) ? `${fallback}: ${title}` : title
      return { url: c.id, name, chapterNumber: c.chapterNumber ?? undefined, dateUpload: c.publishedAt ? Date.parse(c.publishedAt) || undefined : undefined }
    })
  },

  async getPageList(chapter) {
    const data = await fetchJSON<{ chapter?: { pages: { filePath: string }[] } | null }>(`${baseUrl}/api/mangas/read/${chapter.url}`)
    if (!data.chapter) throw new Error(`Chapitre introuvable (${chapter.url})`)
    return data.chapter.pages.map((p) => ({ url: onImageHost(p.filePath) }))
  },

  getMangaUrl(manga) {
    return `${baseUrl}/manga/${manga.url}`
  },

  getFilterList(): Filter[] {
    return [
      { ...select("sort", "Trier par", [["Dernières sorties", "latest"], ["Date d'ajout", "date"], ["Plus vues", "views"], ["Mieux notées", "rating"], ["Titre (A-Z)", "title"]]), listings: { popular: "views", latest: "latest" } } as Filter,
      select("format", "Format", [["Tous", ""], ["Manga", "MANGA"], ["Manhwa", "MANHWA"], ["Doujinshi", "DOUJINSHI"], ["One Shot", "ONE_SHOT"], ["Pornwha", "PORNHWA"]]),
      select("status", "Statut", [["Tous", ""], ["En cours", "ONGOING"], ["Terminé", "COMPLETED"], ["En pause", "HIATUS"]]),
      select("genre", "Genre", [["Tous", ""], ...["Action", "Adultère", "Adventure", "Comedy", "Drama", "Ecchi", "Fantasy", "Harem", "Isekai", "Mature", "Milf", "Romance", "Slice of Life", "Yuri"].map((g): [string, string] => [g, g])]),
      { type: "text", id: "genreText", name: "Genre personnalisé (ex. Romance)", value: "" },
      { type: "text", id: "tag", name: "Tag (ex. Au bureau, Hardcore, NTR)", value: "" },
    ]
  },
}

export default source
