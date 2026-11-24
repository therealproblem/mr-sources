// Ported from Keiyoushi's "mangabox" multisrc theme (Apache License 2.0):
// https://github.com/keiyoushi/extensions-source/tree/main/lib-multisrc/mangabox
// Not here: the "merge split images" setting, the per-image CDN fallback interceptor and the
// "Force Modern Layout" setting (`legacy` is per source instead of per mirror).

import { fetchHTML, parseDate, queryString, relativeUrl, type Chapter, type Filter, type Manga, type MangasPage, type MangaStatus, type Source, type SourceInfo } from "../sdk"

interface ApiChapter { chapter_name?: string | null; chapter_slug?: string | null; chapter_num?: number | null; updated_at?: string | null }

const genres: [string, string][] = [["All", "all"],["4-Koma", "4-koma"],["Action", "action"],["Adaptation", "adaptation"],["Adult", "adult"],["Adventure", "adventure"],["Age gap", "age-gap"],["Ai art", "ai-art"],["Aliens", "aliens"],["Animals", "animals"],["Anthology", "anthology"],["Artbook", "artbook"],["Avant garde", "avant-garde"],["Award winning", "award-winning"],["Beasts", "beasts"],["Boys love", "boys-love"],["Blackmail", "blackmail"],["Bloody", "bloody"],["Bodyswap", "bodyswap"],["Brocon/Siscon", "brocon-siscon"],["Cars", "cars"],["Cartoon", "cartoon"],["Cheating infidelity", "cheating-infidelity"],["Childhood friends", "childhood-friends"],["College life", "college-life"],["Comedy", "comedy"],["Comic", "comic"],["Contest winning", "contest-winning"],["Cooking", "cooking"],["Creators", "creators"],["Crime", "crime"],["Crossdressing", "crossdressing"],["Cultivation", "cultivation"],["Death game", "death-game"],["Degeneratemc", "degeneratemc"],["Delinquents", "delinquents"],["Dementia", "dementia"],["Demons", "demons"],["Doujinshi", "doujinshi"],["Drama", "drama"],["Ecchi", "ecchi"],["Employee", "employee"],["Erotica", "erotica"],["Fan colored", "fan-colored"],["Fantasy", "fantasy"],["Female protagonists", "female-protagonists"],["Fetish", "fetish"],["Full color", "full-color"],["Game", "game"],["Gender bender", "gender-bender"],["Genderswap", "genderswap"],["Ghosts", "ghosts"],["Girls love", "girls-love"],["Gore", "gore"],["Gourmet", "gourmet"],["Graphic novel", "graphic-novel"],["Gyaru", "gyaru"],["Harem", "harem"],["Heartwarming", "heartwarming"],["Hentai", "hentai"],["Historical", "historical"],["Horror", "horror"],["Imageset", "imageset"],["Incest", "incest"],["Informative", "informative"],["Isekai", "isekai"],["Iyashikei", "iyashikei"],["Josei", "josei"],["Kids", "kids"],["Korean", "korean"],["Liexing", "liexing"],["Loli", "loli"],["Long strip", "long-strip"],["Mafia", "mafia"],["Magic", "magic"],["Magical girls", "magical-girls"],["Mahou shoujo", "mahou-shoujo"],["Male protagonists", "male-protagonists"],["Manga", "manga"],["Mangatoon", "mangatoon"],["Manhua", "manhua"],["Manhwa", "manhwa"],["Martial arts", "martial-arts"],["Master servant", "master-servant"],["Mature", "mature"],["Mecha", "mecha"],["Medical", "medical"],["Military", "military"],["Monsters", "monsters"],["Monster girls", "monster-girls"],["Murim", "murim"],["Music", "music"],["Mystery", "mystery"],["Netorare", "netorare"],["Netori", "netori"],["Ninja", "ninja"],["Non human", "non-human"],["Office", "office"],["Office workers", "office-workers"],["Official colored", "official-colored"],["Old people", "old-people"],["Omegaverse", "omegaverse"],["One shot", "one-shot"],["Others", "others"],["Overpowered", "overpowered"],["Parody", "parody"],["Philosophical", "philosophical"],["Ping ping jun", "ping-ping-jun"],["Police", "police"],["Pornographic", "pornographic"],["Post apocalyptic", "post-apocalyptic"],["Psychological", "psychological"],["Reincarnation", "reincarnation"],["Revenge", "revenge"],["Reverse", "reverse"],["Reverse harem", "reverse-harem"],["Romance", "romance"],["Royal family", "royal-family"],["Royalty", "royalty"],["Samurai", "samurai"],["School", "school"],["School life", "school-life"],["Sci fi", "sci-fi"],["Science fiction", "science-fiction"],["Seinen", "seinen"],["Self published", "self-published"],["Sexual violence", "sexual-violence"],["Shota", "shota"],["Shoujo", "shoujo"],["Shoujo ai", "shoujo-ai"],["Shounen", "shounen"],["Shounen ai", "shounen-ai"],["Showbiz", "showbiz"],["Slice of life", "slice-of-life"],["Smut", "smut"],["Sm bdsm", "sm-bdsm"],["Soft yaoi", "soft-yaoi"],["Space", "space"],["Sports", "sports"],["Spy", "spy"],["Step family", "step-family"],["Super power", "super-power"],["Superhero", "superhero"],["Supernatural", "supernatural"],["Survival", "survival"],["Suspense", "suspense"],["System", "system"],["Teacher student", "teacher-student"],["Thriller", "thriller"],["Time travel", "time-travel"],["Traditional games", "traditional-games"],["Tragedy", "tragedy"],["Transmigration", "transmigration"],["Vampires", "vampires"],["Video games", "video-games"],["Villainess", "villainess"],["Violence", "violence"],["Virtual reality", "virtual-reality"],["Web comic", "web-comic"],["Webtoons", "webtoons"],["Western", "western"],["Wuxia", "wuxia"],["Xianxia", "xianxia"],["Yaoi", "yaoi"],["Yuri", "yuri"],["Zombies", "zombies"]]
const filterIds: Record<string, string> = {
  "newest/all": "1", "newest/completed": "2", "newest/ongoing": "3",
  "latest/all": "4", "latest/completed": "5", "latest/ongoing": "6",
  "topview/all": "7", "topview/completed": "8", "topview/ongoing": "9",
}

/** Mangakakalot's change_alias: the slug its search path expects. */
function normalizeSearchQuery(query: string): string {
  return query.toLowerCase()
    .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, "a").replace(/[èéẹẻẽêềếệểễ]/g, "e").replace(/[ìíịỉĩ]/g, "i")
    .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, "o").replace(/[ùúụủũưừứựửữ]/g, "u").replace(/[ỳýỵỷỹ]/g, "y").replace(/đ/g, "d")
    .replace(/[!@%^*()+=<>?/,.:;' "&#[\]~\-_]|$/g, "_").replace(/_+_/g, "_").replace(/^_+|_+$/g, "")
}

function parseStatus(text: string): MangaStatus {
  return text.includes("Ongoing") ? "ongoing" : text.includes("Completed") ? "completed" : "unknown"
}

/**
 * `legacy`: the site still has the old layout (lists of `list-truyen-item-wrap`, `/search/story/`);
 * otherwise the 2026 one (a `div.grid` of cards, `/search?q=`). Upstream keys it by mirror.
 */
export function mangabox(info: SourceInfo, options: { mangaSlug?: (manga: Manga) => string; legacy?: boolean } = {}): Source {
  const { baseUrl } = info
  const legacy = options.legacy ?? false
  const defaultSlug = (manga: Manga) => manga.url.replace(/\/+$/, "").split("/").pop() ?? ""
  const slugOf = (manga: Manga) => manga.sourceData || (options.mangaSlug ?? defaultSlug)(manga)

  async function list(url: string, selector: string, nextSelector: string): Promise<MangasPage> {
    const document = await fetchHTML(url)
    const mangas = document.select(selector).flatMap((element): Manga[] => {
      const link = element.selectFirst("h3 a")
      if (!link) return []
      // The path alone, so entries still match after the site's domain moves.
      const manga: Manga = { url: relativeUrl(link.absUrl("href")), title: link.text(), thumbnailUrl: element.selectFirst("img")?.absUrl("src") || undefined }
      return [{ ...manga, sourceData: (options.mangaSlug ?? defaultSlug)(manga) }]
    })
    return { mangas, hasNextPage: document.selectFirst(nextSelector) != null }
  }

  // SwiftSoup has no :is(), so it is spelled out.
  const listSelector = legacy ? "div.truyen-list > div.list-truyen-item-wrap:has(a[data-id]), div.comic-list > .list-comic-item-wrap:has(a[data-id])" : "div.grid > div.group"
  const listNext = legacy ? "div.group_page, div.group-page a:not([href]) + a:not(:contains(Last))" : "nav[aria-label=Pagination] a[aria-label*=Next], nav[aria-label=Pagination] a:contains(Next)"
  const searchSelector = legacy ? ".panel_story_list .story_item, div.list-truyen-item-wrap, div.list-comic-item-wrap" : listSelector
  const searchNext = legacy ? "a.page_select + a:not(.page_last), a.page-select + a:not(.page-last)" : listNext
  const latest = (page: number) => list(`${baseUrl}/manga-list/latest-manga?page=${page}`, listSelector, listNext)

  return {
    info: { supportsLatest: true, ...info },

    getPopularManga(page) {
      return list(`${baseUrl}/manga-list/hot-manga?page=${page}`, listSelector, listNext)
    },

    getLatestUpdates: latest,

    searchManga(page, query, filters) {
      const value = (id: string) => {
        const filter = filters.find((f) => f.id === id)
        return filter?.type === "select" ? filter.options[filter.selected]?.value : undefined
      }
      if (!legacy) {
        if (query.trim()) return list(`${baseUrl}/search?${queryString([["q", query.trim()], ["page", page]])}`, searchSelector, searchNext)
        const params: [string, string | number][] = []
        const status = value("status"), genre = value("genre"), sort = value("sort")
        if (status && status !== "all") params.push(["status", status])
        if (genre && genre !== "all") params.push(["genres", genre])
        if (!params.length && (!sort || sort === "latest")) return latest(page)
        if (sort) params.push(["sort", sort])
        return list(`${baseUrl}/search?${queryString([...params, ["page", page]])}`, searchSelector, searchNext)
      }
      if (query.trim()) return list(`${baseUrl}/search/story/${encodeURIComponent(normalizeSearchQuery(query))}?page=${page}`, searchSelector, searchNext)
      const id = filterIds[`${value("sort") ?? "latest"}/${value("status") ?? "all"}`]
      return list(`${baseUrl}/genre/${value("genre") ?? "all"}?${queryString([...(id ? [["filter", id] as [string, string]] : []), ["page", page]])}`, searchSelector, searchNext)
    },

    async getMangaDetails(manga) {
      const slug = slugOf(manga)
      const document = await fetchHTML(`${baseUrl}/manga/${slug}`)
      const main = legacy ? "div.manga-info-top, div.panel-story-info" : "div.relative.overflow-hidden:has(h1)"
      const infoElement = document.selectFirst(main)
      if (!infoElement && document.selectFirst("body")?.text().startsWith("REDIRECT :")) throw new Error("Source URL has changed")
      const title = infoElement?.selectFirst("h1, h2")?.text() ?? manga.title
      const summary = document.selectFirst(legacy ? "div#noidungm, div#panel-story-info-description, div#contentBox" : "div.prose-summary")
      // shortcut: text() runs the new layout's paragraphs together (Kotlin's wholeText keeps the blank line); HTMLNode has no wholeText.
      const text = legacy ? summary?.ownText() : summary?.text()
      let description = (text ?? "").replace(new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} summary:\\s`), "")
      const altName = document.selectFirst(legacy ? ".story-alternative, tr:has(.info-alternative) h2" : `${main} h1 + p`)?.ownText()
      if (altName) description = description ? `${description}\n\nAlternative Name: ${altName}` : `Alternative Name: ${altName}`
      const genreLinks = !legacy ? infoElement?.select("a[href^=/genre/]") ?? []
        : infoElement?.selectFirst("div.manga-info-top li:contains(genres)")?.select("a") ?? infoElement?.select("td:containsOwn(genres) + td a") ?? []
      return {
        url: `/manga/${slug}`,
        title,
        author: infoElement?.select(legacy ? "li:contains(author) a, td:containsOwn(author) + td a" : "aside span:containsOwn(Author) + span").map((a) => a.text()).join(", ") || undefined,
        status: parseStatus(infoElement?.select(legacy ? "li:contains(status), td:containsOwn(status) + td" : "aside span:containsOwn(Status) + span").map((e) => e.text()).join(" ") ?? ""),
        genres: genreLinks.map((a) => a.text()),
        description: description || undefined,
        thumbnailUrl: document.selectFirst(legacy ? "div.manga-info-pic img, span.info-image img" : `${main} img`)?.absUrl("src") || undefined,
        sourceData: slug,
      }
    },

    async getChapterList(manga): Promise<Chapter[]> {
      const slug = slugOf(manga)
      const response = await Honya.request(`${baseUrl}/api/manga/${slug}/chapters?limit=-1`)
      let result: { success?: boolean; data?: { chapters?: ApiChapter[] } }
      try { result = JSON.parse(response.body) } catch { return [] }
      if (!result.success) return []
      return (result.data?.chapters ?? []).flatMap((c) => c.chapter_slug ? [{
        // Absolute, as Mihon stores it.
        url: `${baseUrl}/manga/${slug}/${c.chapter_slug}`,
        name: c.chapter_name || "Chapter",
        chapterNumber: c.chapter_num ?? 0,
        scanlator: baseUrl.replace("https://", ""),
        // "2025-12-22 19:57:22" is UTC; Date.parse wants it as ISO 8601.
        dateUpload: parseDate(/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(c.updated_at ?? "") ? `${c.updated_at!.replace(" ", "T")}Z` : c.updated_at),
      }] : [])
    },

    async getPageList(chapter) {
      // Chapters keep the domain they were listed on; read them from the current one.
      const path = relativeUrl(chapter.url)
      const document = await fetchHTML(path.startsWith("/manga/") || !chapter.url.startsWith("http") ? baseUrl + path : chapter.url)
      if (!legacy) return document.select("div[data-page] > img").map((img) => ({ url: img.absUrl("src") }))
      const script = document.select("script").map((s) => s.data()).filter((d) => d.includes("cdns =")).join("\n")
      const array = (name: string) => {
        const match = new RegExp(`${name}\\s*=\\s*\\[([^\\]]+)]`).exec(script)
        return match ? match[1].split(",").map((s) => s.trim().replace(/^"|"$/g, "").replace(/\\\//g, "/").replace(/\/$/, "")) : []
      }
      const cdns = [...array("cdns"), ...array("backupImage")]
      const images = array("chapterImages")
      // ponytail: always the first CDN; Mihon retries the others per image when one fails.
      if (images.length > 0 && cdns.length > 0) {
        const origin = /^https?:\/\/[^/]+/.exec(cdns[0])?.[0] ?? cdns[0]
        return images.map((path) => ({ url: origin + `/${path}`.replace(/\/\/+/g, "/") }))
      }
      return document.select("div.container-chapter-reader > img").map((img) => ({ url: img.absUrl("src") }))
    },

    getFilterList(): Filter[] {
      const options = (pairs: [string, string][]) => pairs.map(([label, value]) => ({ label, value }))
      return [
        { type: "header", id: "note", name: "NOTE: Ignored if using text search!" },
        { type: "separator", id: "sep" },
        {
          type: "select", id: "sort", name: "Order by", selected: 0, listings: { latest: "latest" },
          options: options(legacy ? [["Latest", "latest"], ["Newest", "newest"], ["Top read", "topview"]]
            : [["Latest", "latest"], ["Newest", "newest"], ["Top read", "views"], ["A → Z", "az"], ["Chapters", "chapters"], ["Most followed", "follows"], ["Top rated", "rating"]]),
        },
        { type: "select", id: "status", name: "Status", options: options([["ALL", "all"], ["Completed", "completed"], ["Ongoing", "ongoing"]]), selected: 0 },
        { type: "select", id: "genre", name: "Category", options: options(genres), selected: 0 },
      ]
    },
  }
}
