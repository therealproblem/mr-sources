// Ported from Keiyoushi's "comiciviewer" multisrc theme (Apache License 2.0):
// https://github.com/keiyoushi/extensions-source/tree/main/lib-multisrc/comiciviewer
// Japanese publishers' sites on Comici's viewer. Pages come as 4×4 grids of shuffled tiles,
// which the app puts back (host API 4). Chapters that need an account or a purchase are listed
// with a mark and read after logging in through the web view. Not here: the settings that hide
// those chapters.

import { extractNextJs, extractNextJsRsc, fetchJSON, fetchPage, queryString, tiledImageUrl, type Chapter, type Filter, type HTMLNode, type Manga, type MangasPage, type Source, type SourceInfo } from "../sdk"

export interface ComiciViewerOptions {
  info: SourceInfo
  /** More "Filter by" choices: [label, path]. */
  extraFilterOptions?: [string, string][]
}

interface SeriesSummary {
  id: string
  name: string
  description?: string | null
  author?: { name: string }[] | null
  images?: { url: string }[] | null
  tag?: { name: string }[] | null
  isCompleted?: boolean | null
}
interface Episode { id: string; title: string; datePublished?: number | null }
interface EpisodeAccess { episodeId: string; hasAccess: boolean; accessType: string }
interface DescriptionChild { text?: string | null; url?: string | null; children?: DescriptionChild[] | null }

const rankingPath = "/ranking/manga"
const searchPageSize = 24
const filterOptions: [string, string][] = [
  ["ランキング", rankingPath], ["更新順", "/series/list/up"], ["新作順", "/series/list/new"], ["読み切り", "/category/manga/oneShot"],
  ["完結", "/category/manga/complete"], ["月曜日", "/category/manga/day/1"], ["火曜日", "/category/manga/day/2"],
  ["水曜日", "/category/manga/day/3"], ["木曜日", "/category/manga/day/4"], ["金曜日", "/category/manga/day/5"],
  ["土曜日", "/category/manga/day/6"], ["日曜日", "/category/manga/day/7"], ["その他", "/category/manga/day/8"],
]

const resolveText = (child: DescriptionChild): string => {
  if (child.text != null) return child.text
  const inner = (child.children ?? []).map(resolveText).join("")
  return child.url ? `[${inner}](${child.url})` : inner
}

/** The `img` props somewhere in a React element. */
function findImg(value: unknown): { alt?: string; src?: string | null; srcSet?: string | null } | undefined {
  if (Array.isArray(value)) {
    for (const child of value) { const found = findImg(child); if (found) return found }
  } else if (value && typeof value === "object") {
    if ("src" in value) return value as { alt?: string; src?: string | null; srcSet?: string | null }
    for (const child of Object.values(value)) { const found = findImg(child); if (found) return found }
  }
  return undefined
}

export function comiciviewer(o: ComiciViewerOptions): Source {
  const { info } = o
  const baseUrl = info.baseUrl.replace(/\/$/, "")
  const apiUrl = `${baseUrl}/api`

  function summaryManga(summary: SeriesSummary): Manga {
    let description: string | undefined
    try {
      const nodes = summary.description?.trim() ? JSON.parse(summary.description) as { children: DescriptionChild[] }[] : []
      description = nodes.map((node) => node.children.map(resolveText).join("")).join("\n") || undefined
    } catch {
      description = summary.description ?? undefined
    }
    const author = summary.author?.map((a) => a.name).join(", ") || undefined
    return {
      url: summary.id,
      title: summary.name,
      author,
      artist: author,
      description,
      genres: summary.tag?.map((t) => t.name),
      thumbnailUrl: summary.images?.[0]?.url,
      status: summary.isCompleted ? "completed" : "ongoing",
    }
  }

  /** Series links come as /series/<hash>, /series/<hash>/new or /<magazine>/series/<hash>. */
  function seriesHash(url: string): string {
    const segments = url.replace(/^[a-z]+:\/\/[^/]+/i, "").replace(/[?#].*$/, "").split("/").filter(Boolean)
    const index = segments.indexOf("series")
    if (index < 0 || !segments[index + 1]) throw new Error(`Unrecognized series url: ${url}`)
    return segments[index + 1]
  }

  function listPage(document: HTMLNode): MangasPage {
    const mangas = document.select("div.series-list-item").flatMap((item): Manga[] => {
      const link = item.selectFirst("a.series-list-item-link")
      const title = item.selectFirst("div.series-list-item-h span[data-e2e=sliTitle]")?.text()
      if (!link || !title) return []
      return [{ url: seriesHash(link.absUrl("href")), title, thumbnailUrl: item.selectFirst("img.series-list-item-img")?.absUrl("src") || undefined }]
    })
    return { mangas, hasNextPage: document.selectFirst("a.g-pager-link.mode-active + a.g-pager-link") != null }
  }

  async function ranking(): Promise<MangasPage> {
    const response = await Honya.request({ url: `${baseUrl}${rankingPath}`, headers: { rsc: "1" } })
    if (response.status < 200 || response.status > 299) throw new Error(`HTTP ${response.status} for ${response.url}`)
    const isList = (value: unknown) => !!value && typeof value === "object" && (value as { className?: unknown }).className === "series-list mode-ranking"
    const result = (response.headers["content-type"] ?? "").includes("text/x-component")
      ? extractNextJsRsc<{ children?: unknown[] }>(response.body, isList)
      : extractNextJs<{ children?: unknown[] }>(Honya.parseHTML(response.body, response.url), isList)
    const mangas = (result?.children ?? []).flatMap((tuple): Manga[] => {
      const hash = Array.isArray(tuple) ? tuple[2] : undefined
      const img = findImg(tuple)
      if (typeof hash !== "string" || !img?.alt) return []
      const thumbnail = img.srcSet ? img.srcSet.split(", ").pop()?.split(" ")[0] : img.src ?? undefined
      return [{ url: hash, title: img.alt, thumbnailUrl: thumbnail ?? undefined }]
    })
    return { mangas, hasNextPage: false }
  }

  const seriesApiUrl = (path: string, hash: string) => `${apiUrl}/${path}?${queryString([["seriesHash", hash], ["episodeFrom", "1"], ["episodeTo", "9999"]])}`
  const hashOf = (manga: Manga) => manga.url.includes("/series/") ? manga.url.split("/series/")[1] : manga.url

  return {
    info: { ...info, supportsLatest: true },

    getPopularManga() {
      return ranking()
    },

    async getLatestUpdates(page) {
      return listPage((await fetchPage(`${baseUrl}/series/list/up/${page}`)).document)
    },

    async searchManga(page, query, filters) {
      if (query.trim()) {
        const result = (await fetchJSON<{ searchResult: { series: { total: number; series: SeriesSummary[] } } }>(
          `${apiUrl}/search?${queryString([["q", query], ["page", page], ["size", searchPageSize]])}`,
        )).searchResult.series
        return { mangas: result.series.map(summaryManga), hasNextPage: result.total > page * searchPageSize }
      }
      const category = filters.find((f) => f.id === "category")
      const path = category?.type === "select" ? category.options[category.selected]?.value ?? rankingPath : rankingPath
      if (path === rankingPath) return ranking()
      return listPage((await fetchPage(`${baseUrl}${path}/${page}`)).document)
    },

    async getMangaDetails(manga) {
      const { series } = await fetchJSON<{ series: { summary: SeriesSummary } }>(seriesApiUrl("episodes", hashOf(manga)))
      const { url: _, ...details } = summaryManga(series.summary)
      return details
    },

    async getChapterList(manga) {
      const hash = hashOf(manga)
      const [{ series }, access] = await Promise.all([
        fetchJSON<{ series: { episodes?: Episode[] } }>(seriesApiUrl("episodes", hash)),
        fetchJSON<{ seriesAccess: { episodeAccesses: EpisodeAccess[] } }>(seriesApiUrl("series/access", hash)),
      ])
      const accesses = new Map(access.seriesAccess.episodeAccesses.map((a) => [a.episodeId, a]))
      return (series.episodes ?? []).map((episode): Chapter => {
        const a = accesses.get(episode.id)
        const locked = a ? !a.hasAccess : false
        const needsLogin = locked && a?.accessType === "memberOnlyFree"
        return {
          url: episode.id,
          name: (needsLogin ? "➡️ " : locked ? "🔒 " : "") + episode.title,
          dateUpload: episode.datePublished ? episode.datePublished * 1000 : undefined,
          sourceData: needsLogin ? JSON.stringify({ login: true }) : undefined,
        }
      }).reverse()
    },

    async getPageList(chapter) {
      let memo: { login?: boolean } = {}
      try { memo = JSON.parse(chapter.sourceData ?? "{}") } catch { /* none */ }
      if (memo.login) throw new Error("This chapter is free but you need to log in via WebView and refresh the entry.")

      const { episode } = await fetchJSON<{ episode: { content: { type: string; viewerId?: string | null; url?: string | null }[]; contentId: number } }>(`${apiUrl}/episodes/${chapter.url}`)
      const viewerId = episode.content.find((c) => c.type === "viewer")?.viewerId
      if (!viewerId) {
        const images = episode.content.flatMap((c) => c.type === "image" && c.url ? [{ url: c.url }] : [])
        if (images.length === 0) throw new Error("Log in via WebView and purchase this chapter to read.")
        return images
      }

      let userId: string | undefined
      try { userId = (await fetchJSON<{ user?: { id: string } | null }>(`${apiUrl}/user/info`)).user?.id } catch { /* not logged in */ }
      // Like OkHttp's addQueryParameter with no value: "user-id" alone when logged out.
      const contentsInfo = (to: number) => `${apiUrl}/book/contentsInfo?${queryString([["comici-viewer-id", viewerId], ["contentId", episode.contentId]])}` +
        `&${userId ? `user-id=${encodeURIComponent(userId)}` : "user-id"}&page-from=0&page-to=${to}`
      const { totalPages } = await fetchJSON<{ totalPages: number }>(contentsInfo(0))
      const { result } = await fetchJSON<{ result: { imageUrl: string; scramble: string; sort: number }[] }>(contentsInfo(totalPages))

      return [...result].sort((a, b) => a.sort - b.sort).map((page) => {
        // The scramble lists, for each tile of the page counted column by column, the tile of
        // the served image it comes from; the app counts row by row.
        const tiles = JSON.parse(page.scramble) as number[]
        if (!Array.isArray(tiles) || tiles.length !== 16) return { url: page.imageUrl }
        const order = new Array<number>(16)
        tiles.forEach((source, destination) => {
          order[(destination % 4) * 4 + Math.floor(destination / 4)] = (source % 4) * 4 + Math.floor(source / 4)
        })
        return { url: tiledImageUrl(page.imageUrl, { columns: 4, rows: 4, order }) }
      })
    },

    getFilterList(): Filter[] {
      const choices = [...filterOptions, ...(o.extraFilterOptions ?? [])]
      return [{
        type: "select", id: "category", name: "Filter by", selected: 0,
        options: choices.map(([label, value]) => ({ label, value })),
        listings: { popular: rankingPath, latest: "/series/list/up" },
      }]
    },

    getMangaUrl(manga) {
      return `${baseUrl}/series/${hashOf(manga)}`
    },
  }
}
