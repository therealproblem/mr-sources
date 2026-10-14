// Ported from the Keiyoushi "4KHD" extension (v1.6.4):
// https://github.com/keiyoushi/extensions-source/tree/main/src/all/fourkhd
// Licensed under the Apache License, Version 2.0.

import { queryParam, queryString, relativeUrl, send, type MangasPage, type Source } from "../../../sdk"

const baseUrl = "https://www.4khd.com"
const pageSize = 20

interface PostDto {
  id?: number
  date?: string
  link?: string
  title?: { rendered?: string }
  content?: { rendered?: string }
  jetpack_featured_media_url?: string
  _embedded?: { "wp:featuredmedia"?: { source_url?: string }[]; "wp:term"?: { name?: string }[][] }
}

const htmlText = (html: string) => Yomu.parseHTML(`<body>${html}</body>`).text().trim()
const isImage = (url: string) => /\.(?:jpe?g|png|webp|gif|avif)(?:$|\?)/i.test(url)
const linkPath = (post: PostDto) => (post.link ? /^https?:\/\/[^/]+([^?#]*)/.exec(post.link)?.[1] : undefined) || "/"
const postData = (id: number | undefined) => (id != null ? JSON.stringify({ post_id: id }) : undefined)

function imageUrls(html: string): string[] {
  if (!html.trim()) return []
  const document = Yomu.parseHTML(`<body>${html}</body>`, baseUrl)
  const root = document.selectFirst(".entry-content.wp-block-post-content, .entry-content") ?? document
  const unique = (urls: string[]) => [...new Map(urls.map((url) => [url.split("?")[0], url])).values()]
  const images = root.select("img[data-src], img[data-lazy-src], img[src]").flatMap((img) => {
    const url = [img.absUrl("data-src"), img.absUrl("data-lazy-src"), img.absUrl("src")].map((u) => u.trim()).find(isImage)
    return url ? [url] : []
  })
  return images.length ? unique(images) : unique(root.select("a[href]").map((a) => a.absUrl("href").trim()).filter(isImage))
}

const thumbnail = (post: PostDto) => post.jetpack_featured_media_url ?? post._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? imageUrls(post.content?.rendered ?? "")[0]
const genres = (post: PostDto) => [...new Set((post._embedded?.["wp:term"] ?? []).flat().map((t) => t.name ?? "").filter(Boolean))]

/**
 * www.4khd.com now answers with a page that sends browsers to whichever of its mirrors responds.
 * Do the same: read its list of mirrors and keep the first one whose API answers.
 */
let mirror: string | undefined
async function posts(params: [string, string][]): Promise<{ posts: PostDto[]; totalPages?: number }> {
  const query = queryString(params)
  let response = await send(`${mirror ?? baseUrl}/index.php?${query}`)
  if (response.body.trimStart().startsWith("<")) {
    const sites = /const sites = \[([^\]]*)\]/.exec(response.body)?.[1].match(/https?:\/\/[^'"\s,]+/g) ?? []
    for (const site of sites) {
      const attempt = await Yomu.request(`${site.replace(/\/+$/, "")}/index.php?${query}`).catch(() => undefined)
      if (attempt && attempt.status === 200 && !attempt.body.trimStart().startsWith("<")) {
        mirror = site.replace(/\/+$/, "")
        response = attempt
        break
      }
    }
  }
  const body = JSON.parse(response.body) as PostDto | PostDto[]
  return { posts: Array.isArray(body) ? body : [body], totalPages: Number(response.headers["x-wp-totalpages"]) || undefined }
}

async function listing(page: number, extra: [string, string][]): Promise<MangasPage> {
  const result = await posts([["rest_route", "/wp/v2/posts"], ["page", String(page)], ["per_page", String(pageSize)], ["_embed", "1"], ...extra])
  const mangas = result.posts.flatMap((post) => {
    const path = linkPath(post)
    if (path === "/") return []
    return [{ title: htmlText(post.title?.rendered ?? ""), thumbnailUrl: thumbnail(post), genres: genres(post), status: "completed" as const, url: path, sourceData: postData(post.id) }]
  })
  return { mangas, hasNextPage: page < (result.totalPages ?? page) }
}

/** The API request for a gallery: by its post ID when known, else by the slug in its path. */
async function postFor(path: string, sourceData?: string): Promise<PostDto> {
  let postId = Number(queryParam(path, "post_id")) || undefined
  if (postId == null && sourceData) {
    try { postId = JSON.parse(sourceData).post_id } catch { /* not ours */ }
  }
  const bare = path.split("?")[0]
  const slug = /\/([^/]+)\.html(?:\/\d+)?\/?$/.exec(bare)?.[1] ?? bare.replace(/\/$/, "").split("/").pop()?.split(".html")[0] ?? ""
  const params: [string, string][] = [["rest_route", postId != null ? `/wp/v2/posts/${postId}` : "/wp/v2/posts"], ["_embed", "1"]]
  if (postId == null) params.push(slug ? ["slug", slug] : ["search", bare.replace(/^\/+|\/+$/g, "").split("/").pop() || bare])
  const post = (await posts(params)).posts[0]
  if (!post) throw new Error("Missing post details from API")
  return post
}

const source: Source = {
  info: {
    id: "6501663152246384585", name: "4KHD", lang: "all", version: "1.0.0", baseUrl, supportsLatest: true, nsfw: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/fourkhd/res/mipmap-xhdpi/ic_launcher.png",
  },

  getPopularManga(page) {
    return listing(page, [["orderby", "modified"]])
  },

  getLatestUpdates(page) {
    return listing(page, [["orderby", "date"]])
  },

  searchManga(page, query) {
    return listing(page, [["orderby", "date"], ...(query.trim() ? [["search", query] as [string, string]] : [])])
  },

  async getMangaDetails(manga) {
    const post = await postFor(manga.url, manga.sourceData)
    return { title: htmlText(post.title?.rendered ?? ""), genres: genres(post), thumbnailUrl: thumbnail(post), status: "completed", sourceData: postData(post.id) }
  },

  async getChapterList(manga) {
    const post = await postFor(manga.url, manga.sourceData)
    return [{ url: relativeUrl(linkPath(post)), sourceData: postData(post.id), chapterNumber: 1, name: "Gallery", dateUpload: post.date ? Date.parse(post.date) || undefined : undefined }]
  },

  async getPageList(chapter) {
    const post = await postFor(chapter.url, chapter.sourceData)
    return imageUrls(post.content?.rendered ?? "").map((url) => ({ url }))
  },
}

export default source
