// What an extension gives the app, and the data they pass each other. The app's side is
// `Core/Extensions/ScriptModels.swift`; names follow Mihon's so ports stay recognisable.

/** Describes the source. The build script copies it into the repository's index.json. */
export interface SourceInfo {
  /**
   * Mihon's ID for the same source, as a decimal string (a JavaScript number can't hold all
   * 63 bits). Matching it is what lets manga restored from a Mihon backup find this source.
   * Mihon computes it from the name and language (the build script checks it), but some
   * extensions override it after a rename: copy the `id` from the Kotlin source when it does.
   */
  id: string
  name: string
  /** ISO 639-1 code ("en"), or "all" for a multi-language source. */
  lang: string
  /** Bump it for every release; the app offers an update when it's newer. */
  version: string
  baseUrl: string
  supportsLatest?: boolean
  nsfw?: boolean
  /** Absolute URL. Left out, the build script uses an icon.png beside index.ts. */
  icon?: string
  /** Other Mihon source IDs this source stands in for, such as a renamed or merged one. */
  aliases?: string[]
  /** Like Keiyoushi's `rateLimit(permits, period)`: requests to `host` the app lets through. */
  rateLimits?: { host: string; permits: number; periodMs: number }[]
  /** Sent with page image requests. Referer defaults to `baseUrl`. */
  imageHeaders?: Record<string, string>
}

/**
 * The extension's default export. The app calls these; each runs in the extension's own
 * JavaScript context with only the `Rakuen` global (see host.d.ts) to reach the outside.
 */
export interface Source {
  info: SourceInfo
  getPopularManga(page: number): Promise<MangasPage>
  /** Needed when `info.supportsLatest` is true. */
  getLatestUpdates?(page: number): Promise<MangasPage>
  /** `filters` is `getFilterList()`'s list as the user set it, or empty. */
  searchManga(page: number, query: string, filters: Filter[]): Promise<MangasPage>
  /** Return the whole manga or only what changed; the URL always stays. */
  getMangaDetails(manga: Manga): Promise<Partial<Manga>>
  /** Newest first, like Mihon. */
  getChapterList(manga: Manga): Promise<Chapter[]>
  getPageList(chapter: Chapter): Promise<Page[]>
  /** Synchronous, asked for once. */
  getFilterList?(): Filter[]
}

export interface Manga {
  /**
   * Relative to `baseUrl` (Mihon's `setUrlWithoutDomain`), and the same as the Mihon
   * extension stores, or restored library entries won't open.
   */
  url: string
  title: string
  /** Absolute, or relative to `baseUrl`. */
  thumbnailUrl?: string
  author?: string
  artist?: string
  description?: string
  genres?: string[]
  status?: MangaStatus
  /** Anything the extension wants kept with the manga (Mihon's memo); passed back untouched. */
  sourceData?: string
}

export type MangaStatus = "unknown" | "ongoing" | "completed" | "licensed" | "publishingFinished" | "cancelled" | "onHiatus"

export interface Chapter {
  /** Relative to `baseUrl`, and the same as the Mihon extension stores. */
  url: string
  name: string
  /** Milliseconds since 1970, as `Date.parse` gives. */
  dateUpload?: number
  /** Leave it out to have the app read it from the name, as Mihon does. */
  chapterNumber?: number
  scanlator?: string
  sourceData?: string
}

export interface Page {
  /** The image: absolute, or relative to `baseUrl`. */
  url: string
}

export interface MangasPage {
  mangas: Manga[]
  hasNextPage: boolean
}

export interface FilterOption {
  label: string
  /** What the extension sends; also how a choice is remembered. */
  value: string
}

/** Mihon's filter kinds, as plain data. `id` is the extension's own key for each. */
export type Filter =
  | { type: "header"; id: string; name: string }
  | { type: "separator"; id: string; name?: string }
  | { type: "text"; id: string; name: string; value: string }
  | { type: "select"; id: string; name: string; options: FilterOption[]; selected: number }
  | { type: "checkboxes"; id: string; name: string; options: FilterOption[]; checked: string[] }
  | { type: "tristates"; id: string; name: string; options: FilterOption[]; included: string[]; excluded: string[] }
  | { type: "sort"; id: string; name: string; options: FilterOption[]; selected?: number; ascending: boolean }

export interface HTTPRequest {
  /** Absolute, or relative to `baseUrl`. */
  url: string
  method?: string
  headers?: Record<string, string>
  body?: string
}

export interface HTTPResponse {
  status: number
  /** Where the request ended up, after redirects. */
  url: string
  /** Lowercased names. */
  headers: Record<string, string>
  body: string
}

/** An element from `Rakuen.parseHTML`: Jsoup's calls, as Mihon extensions use them. */
export interface HTMLNode {
  readonly tagName: string
  select(cssQuery: string): HTMLNode[]
  selectFirst(cssQuery: string): HTMLNode | null
  text(): string
  ownText(): string
  html(): string
  outerHtml(): string
  /** `attr("abs:href")` gives the attribute as an absolute URL. Missing attributes are "". */
  attr(name: string): string
  hasAttr(name: string): boolean
  parent(): HTMLNode | null
  children(): HTMLNode[]
}

export type PrefValue = string | number | boolean | string[]
