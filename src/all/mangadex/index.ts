// Ported from the Keiyoushi "MangaDex" extension:
// https://github.com/keiyoushi/extensions-source/tree/main/src/all/mangadex
// Licensed under the Apache License, Version 2.0.
//
// Safe for work, unlike the Kotlin extension, whose content rating setting reaches erotica and
// pornographic titles: every listing, search and chapter feed here asks only for safe and
// suggestive ones (MangaDex's own default), and a title rated higher that a Mihon backup
// brings in is refused rather than shown.
//
// Settings restored from a Mihon backup apply, under the same keys: content rating (within
// safe and suggestive), original languages, cover quality, first volume covers, data saver,
// port 443, blocked groups and uploaders, and the title and description options.
//
// What the app can't do yet: Mihon renews a chapter's MangaDex@Home address when it expires,
// per image; here a chapter left open for over 15 minutes is reopened instead.

import { mapLimit, parseDate, queryString, type Chapter, type Manga, type MangaStatus, type MangasPage, type Source } from "../../../sdk"
import { apiDate, demographics, filterList, queryParams, safeRatings, tagGroups } from "./filters"

const baseUrl = "https://mangadex.org"
const apiUrl = "https://api.mangadex.org"
const cdnUrl = "https://uploads.mangadex.org"
const mangaLimit = 20
const latestChapterLimit = 100
/** The API refuses an `offset + limit` past this. */
const resultWindow = 10_000
const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/
/** MDv3's "no group", still on old chapters. */
const legacyNoGroupId = "00e03853-1b96-4f41-9542-c71b8692033b"
/** Azuki, Bilibili, Comikey, INKR, MangaHot and MANGA Plus: official chapters hosted elsewhere, left out of Latest. */
const externalGroups = [
  "5fed0576-8b94-4f9a-b6a7-08eecd69800d",
  "06a9fecb-b608-4f19-b93c-7caab06b7f44",
  "8d8ecf83-8d42-4f8c-add8-60963f9f28d9",
  "caa63201-4a17-4b7f-95ff-ed884a2b7e60",
  "319c1b10-cbd0-4f55-a46e-c4ee17e65139",
  "4f1de6a2-f0c5-4ac5-bce5-02c7dbb67deb",
]
const oneShotTag = "0234a31e-a729-4e28-9d6a-3f87c4966b9e"
const anthologyTag = "51d83883-4103-437c-b4b1-731cb73d786c"
const romanizedLanguages: Record<string, string> = { ja: "ja-ro", ko: "ko-ro", zh: "zh-ro", "zh-hk": "zh-ro" }
/** A pasted MangaDex link's first path segment, and the search it stands for (Mihon's deep links). */
const linkPrefixes: Record<string, string> = { manga: "id:", title: "id:", chapter: "ch:", group: "grp:", author: "author:", user: "usr:", list: "list:" }

// [Mihon source ID, language]
const languages: [string, string][] = [
  ["4638673959522768501", "af"],
  ["987803387023224960", "sq"],
  ["3339599426223341161", "ar"],
  ["9127464796236242233", "az"],
  ["1553736397938752611", "eu"],
  ["3601180820582582605", "be"],
  ["4150470519566206911", "bn"],
  ["5463447640980279236", "bg"],
  ["1347402746269051958", "my"],
  ["5860541308324630662", "ca"],
  ["5148895169070562838", "zh-Hans"],
  ["1493666528525752601", "zh-Hant"],
  ["2072928884077964642", "cv"],
  ["8548374501079910130", "hr"],
  ["3578612018159256808", "cs"],
  ["425785191804166217", "da"],
  ["6750440049024086587", "nl"],
  ["2499283573021220255", "en"],
  ["2819252027406613931", "eo"],
  ["8773024089257004344", "et"],
  ["8578871918181236609", "fil"],
  ["8254121249433835847", "fi"],
  ["4505830566611664829", "fr"],
  ["8952567078513962586", "ka"],
  ["5098537545549490547", "de"],
  ["3260701926561129943", "el"],
  ["1424273154577029558", "he"],
  ["6840513937945146538", "hi"],
  ["4284949320785450865", "hu"],
  ["3686775439235747344", "ga"],
  ["3807502156582598786", "id"],
  ["1952071260038453057", "it"],
  ["1411768577036936240", "ja"],
  ["1573550798452063564", "jv"],
  ["8884149958776527952", "kk"],
  ["3285208643537017688", "ko"],
  ["764587568075398530", "la"],
  ["737986167355114438", "lt"],
  ["1471784905273036181", "ms"],
  ["5967745367608513818", "mn"],
  ["954368055061084457", "ne"],
  ["4872213291993424667", "no"],
  ["3781216447842245147", "fa"],
  ["8033579885162383068", "pl"],
  ["2655149515337070132", "pt-BR"],
  ["5189216366882819742", "pt"],
  ["4774459486579224459", "ro"],
  ["2098905203823335614", "ru"],
  ["3507378005483435886", "sr"],
  ["2875503798326600410", "sk"],
  ["4938773340256184018", "es-419"],
  ["6400665728063187402", "es"],
  ["1145824452519314725", "sv"],
  ["4273071356706429527", "ta"],
  ["6886894829142702925", "te"],
  ["1713554459881080228", "th"],
  ["3846770256925560569", "tr"],
  ["5779037855201976894", "uk"],
  ["72800122520214493", "ur"],
  ["2838715564514827672", "uz"],
  ["9194073792736219759", "vi"],
]

/** MangaDex's code where it differs from the language's; settings keys end with it too. */
const dexLanguages: Record<string, string> = { "zh-Hans": "zh", "zh-Hant": "zh-hk", fil: "tl", "pt-BR": "pt-br", "es-419": "es-la" }

type Params = [string, string | number][]
/** Some empty localized strings come back as `[]`. */
type LocalizedString = Record<string, string> | never[]
interface Relationship { id: string; type: string; attributes?: { name?: string; username?: string; fileName?: string; locale?: string } }
interface Entity<A> { id: string; type: string; attributes?: A; relationships?: Relationship[] }
interface Collection<T> { data: T[]; limit: number; offset: number; total: number }
interface MangaAttributes {
  title: LocalizedString
  altTitles?: LocalizedString[]
  description?: LocalizedString
  originalLanguage?: string | null
  lastVolume?: string | null
  lastChapter?: string | null
  contentRating?: string | null
  publicationDemographic?: string | null
  status?: string | null
  tags?: Entity<{ group: string }>[]
}
interface ChapterAttributes {
  title?: string | null
  volume?: string | null
  chapter?: string | null
  pages: number
  publishAt: string
  updatedAt: string
  readableAt: string
  externalUrl?: string | null
  isUnavailable?: boolean
}
type MangaEntity = Entity<MangaAttributes>
type ChapterEntity = Entity<ChapterAttributes>
/** The aggregate endpoint's volumes and chapters, keyed by number ("none" without one); `[]` when empty. */
type Aggregate = Record<string, { chapters?: Record<string, { chapter: string }> | never[] }> | never[]

const many = (name: string, values: string[]): [string, string][] => values.map((value) => [name, value])

/** GETs an API path, throwing with MangaDex's explanation for an error status. */
async function request(path: string, params: Params = []) {
  const response = await Honya.request(apiUrl + path + (params.length > 0 ? `?${queryString(params)}` : ""))
  if (response.status < 200 || response.status > 299) {
    let detail: string | undefined
    try { detail = JSON.parse(response.body).errors?.[0]?.detail } catch { /* not JSON */ }
    throw new Error(detail ? `MangaDex: ${detail}` : `HTTP ${response.status} for ${response.url}`)
  }
  return response
}

async function api<T>(path: string, params: Params = []): Promise<T> {
  return JSON.parse((await request(path, params)).body) as T
}

/** A list, empty for the 204 No Content some empty results give. */
async function collection<T>(path: string, params: Params): Promise<Collection<T>> {
  const response = await request(path, params)
  if (response.status === 204 || !response.body) return { data: [], limit: 0, offset: 0, total: 0 }
  return JSON.parse(response.body) as Collection<T>
}

const hasNext = (list: Collection<unknown>) => list.offset + list.limit < Math.min(list.total, resultWindow)

function makeSource([id, lang]: [string, string]): Source {
  const dexLang = dexLanguages[lang] ?? lang
  const pref = <T>(key: string, fallback: T): T => (Honya.prefs.get(`${key}_${dexLang}`) as T | null | undefined) ?? fallback
  const contentRating = () => {
    const ratings = pref<string[]>("contentRating", safeRatings).filter((rating) => safeRatings.includes(rating))
    return ratings.length > 0 ? ratings : safeRatings
  }
  const originalLanguages = () => pref<string[]>("originalLanguage", [])
  /** With zh-hk for zh, as MangaDex files manhua under both. */
  const originalLanguageParams = () => many("originalLanguage[]", originalLanguages().flatMap((code) => (code === "zh" ? ["zh", "zh-hk"] : [code])))
  const uuids = (key: string) => pref(key, "").split(",").map((text) => text.trim()).filter((text) => isUuid(text))
  const filters = () => filterList({ contentRating: contentRating(), originalLanguages: originalLanguages() })

  async function mangasPage(params: Params): Promise<MangasPage> {
    const list = await collection<MangaEntity>("/manga", params)
    return { mangas: await toMangas(list.data), hasNextPage: hasNext(list) }
  }

  async function toMangas(data: MangaEntity[]): Promise<Manga[]> {
    const firstCovers = await firstVolumeCovers(data)
    return data.map((manga) => basicManga(manga, firstCovers.get(manga.id) ?? coverFileName(manga)))
  }

  /** The titles of a page of chapters, in the order their chapters came (Latest, an uploader's chapters). */
  async function mangasFromChapters(page: number, extra: Params): Promise<MangasPage> {
    const chapters = await collection<ChapterEntity>("/chapter", [
      ["offset", latestChapterLimit * (page - 1)],
      ["limit", latestChapterLimit],
      ["translatedLanguage[]", dexLang],
      ["order[publishAt]", "desc"],
      ["includeFutureUpdates", "0"],
      ["includeFuturePublishAt", "0"],
      ["includeEmptyPages", "0"],
      ...extra,
      ...originalLanguageParams(),
      ...many("contentRating[]", contentRating()),
      ...many("excludedGroups[]", [...new Set([...externalGroups, ...uuids("blockedGroups")])]),
      ...many("excludedUploaders[]", uuids("blockedUploader")),
    ])
    const ids = [...new Set(chapters.data.flatMap((chapter) => (chapter.relationships ?? []).filter((r) => r.type === "manga").map((r) => r.id)))]
    if (ids.length === 0) return { mangas: [], hasNextPage: hasNext(chapters) }

    const list = await collection<MangaEntity>("/manga", [
      ["includes[]", "cover_art"],
      ["limit", ids.length],
      ...many("contentRating[]", contentRating()),
      ...many("ids[]", ids),
    ])
    const byId = new Map(list.data.map((manga) => [manga.id, manga]))
    return { mangas: await toMangas(ids.flatMap((id) => byId.get(id) ?? [])), hasNextPage: hasNext(chapters) }
  }

  /** The cover of each title's first volume in its original language, if that setting is on. */
  async function firstVolumeCovers(mangas: MangaEntity[]): Promise<Map<string, string>> {
    const covers = new Map<string, string>()
    if (!pref("tryUsingFirstVolumeCover", false)) return covers
    const withLanguage = mangas.filter((manga) => manga.attributes?.originalLanguage)
    if (withLanguage.length === 0) return covers
    const locales = [...new Set(withLanguage.map((manga) => manga.attributes!.originalLanguage!))]
    try {
      const list = await collection<Entity<{ fileName?: string; locale?: string }>>("/cover", [
        ["order[volume]", "asc"],
        ...many("manga[]", withLanguage.map((manga) => manga.id)),
        ...many("locales[]", locales),
        ["limit", Math.min(withLanguage.length * locales.length, 100)],
        ["offset", 0],
      ])
      for (const manga of withLanguage) {
        const fileName = list.data.find((cover) =>
          cover.attributes?.locale === manga.attributes!.originalLanguage &&
          cover.relationships?.some((r) => r.type === "manga" && r.id === manga.id),
        )?.attributes?.fileName
        if (fileName) covers.set(manga.id, fileName)
      }
    } catch {
      // Mihon falls back to the main cover too.
    }
    return covers
  }

  function basicManga(manga: MangaEntity, fileName: string | undefined): Manga {
    const attributes = manga.attributes!
    const titles = localized(attributes.title)
    const altTitles = (attributes.altTitles ?? []).map(localized)
    const altTitle = (code: string) => {
      const values = Object.values(altTitles.find((title) => title[code] != null) ?? {})
      return values.length === 1 ? values[0] : undefined
    }
    const mainTitle = Object.values(titles)[0]
    const candidates = pref("preferExtensionLangTitle", true)
      ? [altTitle(dexLang), mainTitle, altTitle("en")]
      : [mainTitle, altTitle(dexLang), altTitle("en")]
    const title = titles[dexLang] ?? candidates.find((candidate) => candidate != null) ?? ""

    return {
      url: `/manga/${manga.id}`,
      title: removeEntities(title),
      thumbnailUrl: fileName ? `${cdnUrl}/covers/${manga.id}/${fileName}${pref("thumbnailQuality", "")}` : undefined,
    }
  }

  function fullManga(manga: MangaEntity, volumes: Aggregate, firstCover: string | undefined): Manga {
    const attributes = manga.attributes!
    const relationships = manga.relationships ?? []
    const names = (type: string) => [...new Set(relationships.filter((r) => r.type === type).flatMap((r) => r.attributes?.name ?? []))]

    // Tags in group order, each group sorted, then what isn't a genre but is worth showing.
    const tagIds = (attributes.tags ?? []).map((tag) => [tag.id, tag.attributes?.group] as const)
    const genres = tagGroups.flatMap((group) => group.tags
      .filter((tag) => tagIds.some(([id, tagGroup]) => id === tag.value && tagGroup === group.id))
      .map((tag) => tag.label)
      .sort((a, b) => a.localeCompare(b)))
    const demographic = demographics[attributes.publicationDemographic ?? ""]
    if (demographic) genres.push(demographic)
    if (attributes.contentRating && attributes.contentRating !== "safe") {
      genres.push(`Content rating: ${attributes.contentRating.charAt(0).toUpperCase()}${attributes.contentRating.slice(1)}`)
    }
    const originalLanguage = attributes.originalLanguage ? languageName(attributes.originalLanguage, dexLang) : undefined
    if (originalLanguage) genres.push(originalLanguage)

    const description: string[] = []
    const descriptions = localized(attributes.description ?? [])
    const text = descriptions[dexLang] ?? descriptions.en
    if (text) description.push(removeEntitiesAndMarkdown(text))
    if (pref("altTitlesInDesc", false)) {
      const romanized = romanizedLanguages[attributes.originalLanguage ?? ""] ?? ""
      const altTitles = (attributes.altTitles ?? []).map(localized)
        .filter((title) => title[dexLang] != null || title[romanized] != null)
        .flatMap((title) => (Object.values(title).length === 1 ? Object.values(title) : []))
        .filter((title) => title)
      if (altTitles.length > 0) description.push(removeEntities(`Alternative titles:\n${altTitles.map((title) => `• ${title}`).join("\n")}`))
    }
    if (pref("finalChapterInDesc", true)) {
      const final = [attributes.lastVolume && `Vol.${attributes.lastVolume}`, attributes.lastChapter && `Ch.${attributes.lastChapter}`].filter(Boolean)
      if (final.length > 0) description.push(removeEntities(`Final chapter:\n${final.join(" ")}`))
    }

    return {
      ...basicManga(manga, firstCover ?? coverFileName(manga)),
      author: names("author").join(", "),
      artist: names("artist").join(", "),
      description: description.join("\n\n"),
      genres,
      status: publicationStatus(attributes, volumes),
    }
  }

  return {
    info: {
      id,
      name: "MangaDex",
      lang,
      version: "1.0.0",
      baseUrl,
      supportsLatest: true,
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/mangadex/res/mipmap-xhdpi/ic_launcher.png",
      rateLimits: [{ host: "api.mangadex.org", permits: 3, periodMs: 1000 }],
    },

    // Popular / Latest / Search

    /** The most followed titles created in the last 30 days, as on MangaDex's home page. */
    getPopularManga(page) {
      const startOfDay = Math.floor(Date.now() / 864e5) * 864e5
      return mangasPage([
        ["order[followedCount]", "desc"],
        ["availableTranslatedLanguage[]", dexLang],
        ["limit", mangaLimit],
        ["offset", mangaLimit * (page - 1)],
        ["includes[]", "cover_art"],
        ...many("contentRating[]", contentRating()),
        ...originalLanguageParams(),
        ["createdAtSince", apiDate(startOfDay - 30 * 864e5)],
      ])
    },

    getLatestUpdates(page) {
      return mangasFromChapters(page, [])
    },

    async searchManga(page, query, filterValues) {
      const chosen = filterValues.length > 0 ? filterValues : filters()
      query = query.trim()
      const link = /^https?:\/\/(?:[^/?#]*\.)?mangadex\.(?:org|dev)\/([^/?#]+)/i.exec(query)
      const linkPrefix = link ? linkPrefixes[link[1].toLowerCase()] : undefined
      const linkId = uuidPattern.exec(query)?.[0]
      if (linkPrefix && linkId) query = linkPrefix + linkId

      if (query.startsWith("ch:")) {
        const chapter = await api<{ data: ChapterEntity }>(`/chapter/${query.slice(3)}`)
        const mangaId = chapter.data.relationships?.find((r) => r.type === "manga")?.id
        if (!mangaId) throw new Error("That chapter has no title.")
        query = `id:${mangaId}`
      }
      if (query.startsWith("id:")) {
        const mangaId = query.slice(3)
        if (!uuidPattern.test(mangaId)) throw new Error("Not a valid manga ID")
        return mangasPage([["ids[]", mangaId], ["includes[]", "cover_art"], ...many("contentRating[]", safeRatings)])
      }
      if (query.startsWith("usr:")) {
        return mangasFromChapters(page, [["uploader", query.slice(4)]])
      }
      if (query.startsWith("list:")) {
        const list = await api<{ data: Entity<unknown> }>(`/list/${query.slice(5)}`)
        const ids = (list.data.relationships ?? []).filter((r) => r.type === "manga").map((r) => r.id)
        if (ids.length === 0) throw new Error("No series in the list")
        const pageIds = ids.slice(mangaLimit * (page - 1), mangaLimit * page)
        if (pageIds.length === 0) return { mangas: [], hasNextPage: false }
        const result = await mangasPage([
          ["limit", mangaLimit],
          ["offset", 0],
          ["includes[]", "cover_art"],
          ...many("ids[]", pageIds),
          ...queryParams(chosen, dexLang),
        ])
        return { mangas: result.mangas, hasNextPage: ids.length > mangaLimit * page }
      }

      const params: Params = [["limit", mangaLimit], ["offset", mangaLimit * (page - 1)], ["includes[]", "cover_art"]]
      if (query.startsWith("grp:")) {
        const groupId = query.slice(4)
        if (!uuidPattern.test(groupId)) throw new Error("Not a valid group ID")
        params.push(["group", groupId])
      } else if (query.startsWith("author:")) {
        const authorId = query.slice(7)
        if (!uuidPattern.test(authorId)) throw new Error("Not a valid author ID")
        params.push(["authorOrArtist", authorId])
      } else if (query) {
        params.push(["title", query.replace(/\s/g, " ")])
      }
      return mangasPage([...params, ...queryParams(chosen, dexLang)])
    },

    // Details

    async getMangaDetails(manga) {
      const mangaId = uuidFrom(manga.url)
      const [details, volumes] = await Promise.all([
        api<{ data: MangaEntity }>(`/manga/${mangaId}`, [["includes[]", "cover_art"], ["includes[]", "author"], ["includes[]", "artist"]]),
        // The chapters in this language, to tell a finished title from one whose last chapter is out.
        api<{ volumes?: Aggregate }>(`/manga/${mangaId}/aggregate`, [["translatedLanguage[]", dexLang]]).then((a) => a.volumes ?? [], () => []),
      ])
      refuseExplicit(details.data)
      const firstCover = (await firstVolumeCovers([details.data])).get(details.data.id)
      return fullManga(details.data, volumes, firstCover)
    },

    // Chapters

    async getChapterList(manga) {
      const mangaId = uuidFrom(manga.url)
      const feed = (offset: number) => collection<ChapterEntity>(`/manga/${mangaId}/feed`, [
        ["includes[]", "scanlation_group"],
        ["includes[]", "user"],
        ["limit", 500],
        ["offset", offset],
        ["translatedLanguage[]", dexLang],
        ["order[volume]", "desc"],
        ["order[chapter]", "desc"],
        ["includeFuturePublishAt", "0"],
        ["includeEmptyPages", "0"],
        ...many("contentRating[]", safeRatings),
        ...many("excludedGroups[]", uuids("blockedGroups")),
        ...many("excludedUploaders[]", uuids("blockedUploader")),
        ["includeUnavailable", pref("includeUnavailable", false) ? "1" : "0"],
      ])

      const first = await feed(0)
      if (first.total === 0) {
        // Explicit titles have no chapters here; say so rather than empty a restored entry.
        refuseExplicit((await api<{ data: MangaEntity }>(`/manga/${mangaId}`)).data)
      }
      const offsets: number[] = []
      for (let offset = first.offset + (first.limit || 500); offset < first.total; offset += first.limit || 500) offsets.push(offset)
      const rest = await mapLimit(offsets, 3, feed)
      return [first, ...rest]
        .flatMap((list) => list.data)
        .filter((chapter) => !isInvalid(chapter.attributes!))
        .map(toChapter)
    },

    // Pages

    async getPageList(chapter) {
      const chapterId = uuidFrom(chapter.url)
      const atHome = await api<{ baseUrl: string; chapter: { hash: string; data: string[]; dataSaver: string[] } }>(
        `/at-home/server/${chapterId}`,
        pref("usePort443", false) ? [["forcePort443", "true"]] : [],
      )
      const { hash, data, dataSaver } = atHome.chapter
      return pref("dataSaverV5", false)
        ? dataSaver.map((file) => ({ url: `${atHome.baseUrl}/data-saver/${hash}/${file}` }))
        : data.map((file) => ({ url: `${atHome.baseUrl}/data/${hash}/${file}` }))
    },

    getFilterList() {
      return filters()
    },
  }
}

export default languages.map(makeSource)

const isUuid = (text: string) => new RegExp(`^${uuidPattern.source}$`).test(text)

/** The UUID ending a manga or chapter URL; older MangaDex URLs have none. */
function uuidFrom(url: string): string {
  if (!uuidPattern.test(url)) throw new Error("This entry uses an old MangaDex address. Migrate it from MangaDex to MangaDex to update it.")
  return url.slice(url.lastIndexOf("/") + 1)
}

function refuseExplicit(manga: MangaEntity) {
  const rating = manga.attributes?.contentRating
  if (rating && !safeRatings.includes(rating)) throw new Error(`MangaDex rates this title ${rating}, which this source doesn't show.`)
}

function localized(value: LocalizedString | undefined | null): Record<string, string> {
  return value && !Array.isArray(value) ? value : {}
}

function coverFileName(manga: MangaEntity): string | undefined {
  return manga.relationships?.find((r) => r.type === "cover_art")?.attributes?.fileName
}

/** Mihon's status, upgraded to completed once the final chapter (or a oneshot's only one) is out in this language. */
function publicationStatus(attributes: MangaAttributes, volumes: Aggregate): MangaStatus {
  const statuses: Record<string, MangaStatus> = { ongoing: "ongoing", cancelled: "cancelled", completed: "publishingFinished", hiatus: "onHiatus" }
  const status = statuses[attributes.status ?? ""] ?? "unknown"
  const chapters = Object.values(volumes).flatMap((volume) => Object.values(volume.chapters ?? {}).map((chapter) => chapter.chapter))
  const tags = (attributes.tags ?? []).map((tag) => tag.id)
  const isOneShot = tags.includes(oneShotTag) && !tags.includes(anthologyTag)
  const noVolume = Array.isArray(volumes) ? undefined : volumes.none

  if ((status === "publishingFinished" || status === "cancelled") && attributes.lastChapter != null && chapters.includes(attributes.lastChapter)) return "completed"
  if (isOneShot && noVolume?.chapters && !Array.isArray(noVolume.chapters) && noVolume.chapters.none != null) return "completed"
  return status
}

/** External chapters with no pages, or with the one page saying they were taken down. */
function isInvalid(attributes: ChapterAttributes): boolean {
  return attributes.externalUrl != null && (attributes.pages === 0 || (attributes.pages === 1 && attributes.updatedAt !== attributes.readableAt))
}

function toChapter(chapter: ChapterEntity): Chapter {
  const attributes = chapter.attributes!
  const relationships = chapter.relationships ?? []
  const groups = relationships
    .filter((r) => r.type === "scanlation_group" && r.id !== legacyNoGroupId)
    .flatMap((r) => r.attributes?.name ?? [])
    .join(" & ")
  const users = relationships.filter((r) => r.type === "user").flatMap((r) => r.attributes?.username ?? [])
  const scanlator = groups || (users.length > 0 ? `Uploaded by ${users.join(" & ")}` : "") || "No Group"

  const name: string[] = []
  if (attributes.volume) name.push(`Vol.${attributes.volume}`)
  if (attributes.chapter) name.push(`Ch.${attributes.chapter}`)
  if (attributes.title) {
    if (name.length > 0) name.push("-")
    name.push(attributes.title)
  }
  if (name.length === 0) name.push("Oneshot")

  return {
    url: `/chapter/${chapter.id}`,
    name: removeEntities(name.join(" ")),
    dateUpload: parseDate(attributes.publishAt),
    scanlator: (attributes.isUnavailable ? "UNAVAILABLE - " : "") + scanlator,
  }
}

/** "Japanese", in the source's language where the runtime knows it. */
function languageName(code: string, locale: string): string | undefined {
  try {
    const name = new Intl.DisplayNames([locale, "en"], { type: "language" }).of(code)
    return name && name !== code ? name.charAt(0).toLocaleUpperCase(locale) + name.slice(1) : undefined
  } catch {
    return undefined
  }
}

const namedEntities: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " ", hearts: "♥", hellip: "…",
  mdash: "—", ndash: "–", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
}

/** Jsoup's `Parser.unescapeEntities`: "&hearts;" becomes "♥". */
function removeEntities(text: string): string {
  return text.replace(/&(?:#(\d+)|#x([\da-f]+)|([a-z][a-z\d]*));/gi, (entity, decimal?: string, hex?: string, name?: string) => {
    if (name) return namedEntities[name] ?? (Honya.parseHTML(entity).text() || entity)
    const code = decimal ? Number(decimal) : parseInt(hex!, 16)
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity
  })
}

/** Also drops the links and emphasis of MangaDex's Markdown, and what follows a "---" rule. */
function removeEntitiesAndMarkdown(text: string): string {
  return removeEntities(text)
    .split("\n---")[0]
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/\*+\s*([^*]*)\s*\*+/g, "$1")
    .replace(/_+\s*([^_]*)\s*_+/g, "$1")
    .trim()
}
