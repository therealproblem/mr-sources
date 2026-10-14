// Ported from Keiyoushi's "iken" multisrc theme (Apache License 2.0):
// https://github.com/keiyoushi/extensions-source/tree/main/lib-multisrc/iken
// Not here: the genre filter (fetched from the site) and the view-count analytics calls.

import { fetchJSON, queryString, type Chapter, type Filter, type Manga, type MangaStatus, type MangasPage, type Source, type SourceInfo } from "../sdk"

interface PostDto {
  id: number
  slug: string
  postTitle: string
  postContent?: string | null
  isNovel?: boolean
  featuredImage?: string | null
  alternativeTitles?: string | null
  author?: string | null
  artist?: string | null
  seriesType?: string | null
  seriesStatus?: string | null
  genres?: { id: number; name: string }[]
  chapters?: ChapterDto[]
}
interface ChapterDto {
  id: number
  slug: string
  number: number | string
  title?: string | null
  createdAt: string
  isLocked?: boolean | null
  isTimeLocked?: boolean | null
  price?: number | null
  chapterPurchased?: boolean | null
  mangaPost?: { slug?: string | null } | null
}

const perPage = 18
const isNovel = (post: PostDto) => post.isNovel === true || post.seriesType?.toLowerCase() === "novel"
const statuses: Record<string, MangaStatus> = {
  ONGOING: "ongoing", COMING_SOON: "ongoing", MASS_RELEASED: "ongoing", COMPLETED: "completed", CANCELLED: "cancelled", DROPPED: "cancelled",
}
const sortOptions: [string, string][] = [["Last Chapter", "lastChapterAddedAt"], ["Views", "totalViews"], ["Added", "createdAt"], ["Chapters", "chaptersCount"], ["Title", "postTitle"]]

function toManga(post: PostDto): Manga {
  const description = [
    post.postContent ? Honya.parseHTML(`<body>${post.postContent.replace(/\n/g, "<br>")}</body>`).text() : "",
    post.alternativeTitles ? `Alternative Names: ${post.alternativeTitles}` : "",
  ].filter(Boolean).join("\n\n").trim()
  const type = ({ MANGA: "Manga", MANHUA: "Manhua", MANHWA: "Manhwa" } as Record<string, string>)[post.seriesType ?? ""]
  return {
    url: `${post.slug}#${post.id}`,
    title: post.postTitle,
    thumbnailUrl: post.featuredImage ?? undefined,
    author: post.author || undefined,
    artist: post.artist || undefined,
    description,
    genres: [...new Set([...(type ? [type] : []), ...(post.genres ?? []).map((g) => g.name)])],
    status: statuses[post.seriesStatus ?? ""] ?? "unknown",
  }
}

const isLocked = (c: ChapterDto) => c.isLocked === true || c.isTimeLocked === true || (c.chapterPurchased === false && (c.price ?? 0) !== 0)

function toChapter(c: ChapterDto, mangaSlug: string): Chapter {
  return {
    url: `/series/${mangaSlug || c.mangaPost?.slug}/${c.slug}#${c.id}`,
    name: `${isLocked(c) ? "🔒 " : ""}Chapter ${c.number}${c.title?.trim() ? ` - ${c.title}` : ""}`,
    dateUpload: Date.parse(c.createdAt) || undefined,
  }
}

export function iken(info: SourceInfo, options: { apiUrl?: string; sortPagesByFilename?: boolean } = {}): Source {
  const api = options.apiUrl ?? info.baseUrl.replace("https://", "https://api.")
  const showLocked = () => Honya.prefs.get("pref_show_locked_chapters") === true

  async function query(page: number, params: [string, string][]): Promise<MangasPage> {
    // Novels are left out; a page of only novels moves on to the next.
    for (let current = page; ; current++) {
      const data = await fetchJSON<{ posts: PostDto[]; totalCount: number }>(`${api}/api/query?${queryString([["page", current], ["perPage", perPage], ...params])}`)
      const mangas = data.posts.filter((p) => !isNovel(p)).map(toManga)
      const hasNextPage = data.totalCount > current * perPage
      if (mangas.length > 0 || !hasNextPage) return { mangas, hasNextPage }
    }
  }

  async function details(slug: string): Promise<{ totalChapterCount?: number; post: PostDto }> {
    const data = await fetchJSON<{ totalChapterCount?: number; post: PostDto }>(`${api}/api/post?${queryString([["postSlug", slug]])}`)
    if (isNovel(data.post)) throw new Error("Novels are unsupported")
    return data
  }

  return {
    info: { ...info, supportsLatest: true },

    getPopularManga(page) {
      return query(page, [["searchTerm", ""], ["orderBy", "totalViews"]])
    },

    getLatestUpdates(page) {
      return query(page, [["searchTerm", ""], ["orderBy", "lastChapterAddedAt"]])
    },

    searchManga(page, searchTerm, filters) {
      const params: [string, string][] = [["searchTerm", searchTerm.trim()]]
      for (const filter of filters) {
        if (filter.type === "select") params.push([filter.id, filter.options[filter.selected]?.value ?? ""])
      }
      return query(page, params)
    },

    async getMangaDetails(manga) {
      return toManga((await details(manga.url.split("#")[0])).post)
    },

    async getChapterList(manga) {
      const [slug, id] = manga.url.split("#")
      const data = await details(slug)
      let chapters = data.post.chapters ?? []
      // Long series list only some chapters with the post; the chapters endpoint has them all.
      if (id && (data.totalChapterCount ?? 0) > chapters.length) {
        const all = await fetchJSON<{ post: { chapters: ChapterDto[] } }>(`${api}/api/chapters?postId=${id}`)
        if (all.post.chapters.length > chapters.length) chapters = all.post.chapters
      }
      return chapters.filter((c) => showLocked() || !isLocked(c)).map((c) => toChapter(c, slug))
    },

    async getPageList(chapter) {
      const id = chapter.url.split("#")[1]
      if (!id) throw new Error("Refresh the chapter list.")
      const { chapter: data } = await fetchJSON<{ chapter: { images: { url: string; order?: number | null }[]; isPermanentlyLocked?: boolean; isLockedByCoins?: boolean; isShortLinkLocked?: boolean } }>(`${api}/api/chapter?chapterId=${id}`)
      if (data.isShortLinkLocked) throw new Error("Chapter locked (short link)")
      if (data.isLockedByCoins) throw new Error("Chapter locked (coins required)")
      if (data.isPermanentlyLocked) throw new Error("Chapter permanently locked")
      const fileNumber = (url: string) => Number(/\d+/.exec(url.split("/").pop() ?? "")?.[0] ?? Number.MAX_SAFE_INTEGER)
      const images = [...data.images].sort(options.sortPagesByFilename
        ? (a, b) => fileNumber(a.url) - fileNumber(b.url)
        : (a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER))
      return images.map((image) => ({ url: image.url.replace(/ /g, "%20") }))
    },

    getFilterList(): Filter[] {
      const select = (id: string, name: string, pairs: [string, string][]): Filter => ({ type: "select", id, name, options: pairs.map(([label, value]) => ({ label, value })), selected: 0 })
      return [
        select("seriesStatus", "Status", [["All", ""], ["Ongoing", "ONGOING"], ["Completed", "COMPLETED"], ["Cancelled", "CANCELLED"], ["Dropped", "DROPPED"], ["Coming Soon", "COMING_SOON"], ["Mass Released", "MASS_RELEASED"]]),
        select("seriesType", "Type", [["All", ""], ["Manga", "MANGA"], ["Manhua", "MANHUA"], ["Manhwa", "MANHWA"], ["Russian", "RUSSIAN"], ["Spanish", "SPANISH"]]),
        select("orderBy", "Sort By", sortOptions),
        select("orderDirection", "Sort Direction", [["Descending", "desc"], ["Ascending", "asc"]]),
      ]
    },
  }
}
