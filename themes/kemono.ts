// Ported from Keiyoushi's "kemono" multisrc theme (Apache License 2.0):
// https://github.com/keiyoushi/extensions-source/tree/main/lib-multisrc/kemono
// Not here: the Kotlin theme's fallback to thumbnails when the file servers are unreachable.

import type { Chapter, Filter, Manga, MangasPage, Source, SourceInfo } from "../sdk"

interface CreatorDto { id: string; name: string; service: string; updated: string | number; favorited?: number }
interface FavoriteDto { id: string; service: string; faved_seq: number }
interface PostDto {
  id: string
  service: string
  user: string
  title: string
  added?: string
  published?: string
  edited?: string
  file: { name?: string; path?: string }
  attachments: { name?: string; path: string }[]
}

const creatorsPerPage = 50
const postsPerPage = 50
const prompt = "You can change how many posts to load in the extension's settings."
// The API only answers requests that say they accept CSS.
const apiHeaders = { Accept: "text/css" }

const serviceName = (service: string) =>
  ({ fanbox: "Pixiv Fanbox", subscribestar: "SubscribeStar", dlsite: "DLsite", onlyfans: "OnlyFans" } as Record<string, string>)[service]
    ?? service.charAt(0).toUpperCase() + service.slice(1)

const updatedDate = (creator: CreatorDto) =>
  typeof creator.updated === "string" ? Date.parse(`${creator.updated}Z`) || 0 : creator.updated * 1000

/** A post's images: its file and attachments with image extensions. */
function images(post: PostDto): string[] {
  const files = [...(post.file.path ? [{ name: post.file.name, path: post.file.path }] : []), ...post.attachments]
  const seen = new Set<string>()
  return files.filter((f) => /\.(png|jpe?g|gif|webp)$/i.test(f.path) && !seen.has(f.path) && seen.add(f.path))
    .map((f) => f.path + (f.name != null ? `?f=${encodeURIComponent(f.name)}` : ""))
}

const pad = (n: number) => String(n).padStart(2, "0")

function toChapter(post: PostDto, offsetHours: number): Chapter {
  const raw = post.edited ?? post.published ?? post.added
  const date = raw ? Date.parse(`${raw}Z`) - offsetHours * 3600_000 : NaN
  let name = post.title
  if (!name.trim()) {
    const d = new Date(date)
    name = `Post from ${Number.isNaN(date) ? "unknown date" : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} at ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`}`
  }
  return { url: `/${post.service}/user/${post.user}/post/${post.id}`, dateUpload: Number.isNaN(date) ? undefined : date, name, chapterNumber: -2 }
}

export function kemono(info: SourceInfo, types: string[]): Source {
  const baseUrl = info.baseUrl
  const api = `${baseUrl}/api/v1`
  const imgCdnUrl = baseUrl.replace("//", "//img.")

  let fileServersUnreachable = false

  // The creator list is large; keep it half an hour, as the Kotlin theme's cache does.
  let creators: { list: CreatorDto[]; at: number } | undefined
  async function allCreators(): Promise<CreatorDto[]> {
    if (!creators || Date.now() - creators.at > 30 * 60_000) {
      const response = await getWithRetry(`${api}/creators`)
      creators = { list: (JSON.parse(response) as CreatorDto[]).filter((c) => c.service.toLowerCase() !== "discord"), at: Date.now() }
    }
    return creators.list
  }

  async function getWithRetry(url: string): Promise<string> {
    let status = 0
    for (let attempt = 0; attempt < 5; attempt++) {
      const response = await Yomu.request({ url, headers: apiHeaders })
      if (response.status >= 200 && response.status < 300) return response.body
      status = response.status
      if (status === 429) await Yomu.sleep(10_000)
    }
    throw new Error(`HTTP error ${status}`)
  }

  const toManga = (c: CreatorDto): Manga => ({
    url: `/${c.service}/user/${c.id}`, title: c.name, author: serviceName(c.service), thumbnailUrl: `${imgCdnUrl}/icons/${c.service}/${c.id}`, description: prompt,
  })

  async function search(page: number, title = "", filters: Filter[] = [], sortBy: [string, string] = ["", ""]): Promise<MangasPage> {
    let sort = sortBy
    const included: string[] = []
    const excluded: string[] = []
    let favoritesOnly: boolean | undefined
    for (const filter of filters) {
      if (filter.type === "sort") sort = [filter.options[filter.selected ?? 0].value, filter.ascending ? "asc" : "desc"]
      if (filter.type === "tristates" && filter.id === "types") { included.push(...filter.included); excluded.push(...filter.excluded) }
      if (filter.type === "tristates" && filter.id === "favorites") favoritesOnly = filter.included.length ? true : filter.excluded.length ? false : undefined
    }

    let favorites: FavoriteDto[] = []
    if (favoritesOnly != null) {
      const response = await Yomu.request({ url: `${api}/account/favorites`, headers: apiHeaders })
      if (response.status < 200 || response.status > 299) {
        throw new Error(`Failed to fetch favorites: ${response.status === 401 ? "You are not logged in (log in through the web view)" : `HTTP error ${response.status}`}`)
      }
      favorites = (JSON.parse(response.body) as FavoriteDto[]).filter((f) => f.service.toLowerCase() !== "discord")
    }
    const favedSeq = new Map(favorites.map((f) => [f.id, f.faved_seq]))
    const matches = (await allCreators()).filter((c) => {
      const type = serviceName(c.service).toLowerCase()
      return (included.length === 0 || included.includes(type)) && !excluded.includes(type)
        && c.name.toLowerCase().includes(title.toLowerCase())
        && (favoritesOnly == null || favedSeq.has(c.id) === favoritesOnly)
    })

    const direction = sort[1] === "desc" ? -1 : 1
    const key: (c: CreatorDto) => number | string = (() => {
      switch (sort[0]) {
        case "pop": return (c: CreatorDto) => c.favorited ?? -1
        case "tit": return (c: CreatorDto) => c.name
        case "new": return (c: CreatorDto) => c.id
        case "fav":
          if (favoritesOnly !== true) throw new Error("Please check the 'Favorites Only' filter")
          return (c: CreatorDto) => favedSeq.get(c.id) ?? 0
        default: return updatedDate
      }
    })()
    const sorted = [...matches].sort((a, b) => { const x = key(a), y = key(b); return (x < y ? -1 : x > y ? 1 : 0) * direction })
    const from = (page - 1) * creatorsPerPage
    const to = Math.min(sorted.length, from + creatorsPerPage)
    return { mangas: sorted.slice(from, to).map(toManga), hasNextPage: to !== sorted.length }
  }

  return {
    info: { ...info, supportsLatest: true, rateLimits: info.rateLimits ?? [{ host: baseUrl.replace(/^https?:\/\//, ""), permits: 1, periodMs: 1000 }] },

    getPopularManga(page) {
      return search(page, "", [], ["pop", "desc"])
    },

    getLatestUpdates(page) {
      return search(page, "", [], ["lat", "desc"])
    },

    searchManga(page, query, filters) {
      return search(page, query, filters.length ? filters : this.getFilterList!())
    },

    async getMangaDetails(manga) {
      // The avatar lives on the image server.
      const thumbnail = manga.thumbnailUrl?.replace(/^https:\/\//, "").replace(/^[^/]*/, imgCdnUrl)
      return { thumbnailUrl: thumbnail ?? `${imgCdnUrl}/icons${manga.url.replace("/user", "")}` }
    },

    async getChapterList(manga) {
      const offsetHours = manga.author === "Pixiv Fanbox" || manga.author === "Fantia" ? 9 : 0
      const maxPosts = Math.min(Number(Yomu.prefs.get("POST_PAGES") ?? "1") || 1, 75) * postsPerPage
      const chapters: Chapter[] = []
      for (let offset = 0; offset < maxPosts; offset += postsPerPage) {
        const posts = JSON.parse(await getWithRetry(`${api}${manga.url}/posts?o=${offset}`)) as PostDto[]
        for (const post of posts) if (images(post).length) chapters.push(toChapter(post, offsetHours))
        if (posts.length !== postsPerPage) break
      }
      return chapters
    },

    async getPageList(chapter) {
      const { post } = JSON.parse(await getWithRetry(`${api}${chapter.url}`)) as { post: PostDto }
      const paths = images(post)
      // Full-size files redirect to file servers that are often unreachable, while the thumbnail
      // server works. Try one; if it can't be reached, use thumbnails for the rest of the session.
      if (!fileServersUnreachable && paths.length > 0 && Yomu.prefs.get("USE_LOW_RES_IMG") !== true) {
        const probe = await Yomu.request({ url: `${baseUrl}/data${paths[0]}`, method: "HEAD", timeoutMs: 8000 }).catch(() => undefined)
        if (!probe || probe.status >= 400) fileServersUnreachable = true
      }
      const lowRes = fileServersUnreachable || Yomu.prefs.get("USE_LOW_RES_IMG") === true
      return paths.map((path) => ({ url: `${baseUrl}/${lowRes ? "thumbnail/data" : "data"}${path}` }))
    },

    getFilterList(): Filter[] {
      const sorts: [string, string][] = [["Popularity", "pop"], ["Date Indexed", "new"], ["Date Updated", "lat"], ["Alphabetical Order", "tit"], ["Service", "serv"], ["Date Favorited", "fav"]]
      return [
        { type: "sort", id: "sort", name: "Sort by", options: sorts.map(([label, value]) => ({ label, value })), selected: 0, ascending: false },
        { type: "tristates", id: "types", name: "Types", options: types.map((t) => ({ label: t, value: t.toLowerCase() })), included: [], excluded: [] },
        { type: "tristates", id: "favorites", name: "Favorites", options: [{ label: "Favorites Only", value: "fav" }], included: [], excluded: [] },
      ]
    },
  }
}
