// Ported from the Keiyoushi "NineHentai" extension:
// https://github.com/keiyoushi/extensions-source/tree/main/src/en/ninehentai
// Licensed under the Apache License, Version 2.0.

import { fetchPage, parseRelativeDate, send, type Filter, type Manga, type MangasPage, type Source } from "../../../sdk"

const baseUrl = "https://9hentai.so"
// The API's image_server still points old galleries at a dead host.
const imageBaseUrl = "https://i.9hentai.so/images"
const coverUrl = (id: number) => `${imageBaseUrl}/${id}/cover.jpg`

interface BookDto { id: number; total_page: number; title: string }
interface Tag { id: number; name: string; type?: number }

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await send({ url: baseUrl + path, method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  return JSON.parse(response.body) as T
}

const toManga = (book: BookDto): Manga => ({ url: `/g/${book.id}`, title: book.title, thumbnailUrl: coverUrl(book.id) })
const fetchBook = async (id: number) => (await post<{ results: BookDto }>("/api/getBookByID", { id })).results

async function search(page: number, text = "", sort = 0, range = [0, 2000], included: Tag[] = [], excluded: Tag[] = []): Promise<MangasPage> {
  const response = await post<{ total_count: number; results: BookDto[] }>("/api/getBook", {
    // The API counts pages from 0.
    search: { text, page: page - 1, sort, pages: { range }, tag: { items: { included, excluded } } },
  })
  return { mangas: response.results.map(toManga), hasNextPage: response.total_count > page }
}

async function tags(names: string, type: number): Promise<Tag[]> {
  const found = await Promise.all(names.split(",").map((n) => n.trim()).filter(Boolean).map(async (name) =>
    (await post<{ results: Tag[] }>("/api/getTag", { tag_name: name, tag_type: type })).results[0]))
  return found.filter((t): t is Tag => t != null)
}

const source: Source = {
  info: {
    id: "7689490563697355048", name: "NineHentai", lang: "en", version: "1.0.0", baseUrl, supportsLatest: true, nsfw: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/ninehentai/res/mipmap-xhdpi/ic_launcher.png",
  },

  getPopularManga(page) {
    return search(page, "", 1)
  },

  getLatestUpdates(page) {
    return search(page)
  },

  async searchManga(page, query, filters) {
    if (query.startsWith("id:")) {
      const id = Number.parseInt(query.slice(3), 10)
      return Number.isNaN(id) ? { mangas: [], hasNextPage: false } : { mangas: [toManga(await fetchBook(id))], hasNextPage: false }
    }
    const text = (fid: string) => { const f = filters.find((x) => x.id === fid); return f?.type === "text" ? f.value.trim() : "" }
    const sortFilter = filters.find((f) => f.id === "sort")
    const sort = sortFilter?.type === "select" ? sortFilter.selected : 0
    const included: Tag[] = []
    const excluded: Tag[] = []
    if (text("included")) included.push(...await tags(text("included"), 1))
    if (text("excluded")) excluded.push(...await tags(text("excluded"), 1))
    for (const [fid, type] of [["group", 2], ["parody", 3], ["artist", 4], ["character", 5], ["category", 6]] as [string, number][]) {
      if (text(fid)) included.push(...await tags(text(fid), type))
    }
    const min = Number.parseInt(text("min_pages"), 10)
    const max = Number.parseInt(text("max_pages"), 10)
    return search(page, query, sort, [Number.isNaN(min) ? 0 : min, Number.isNaN(max) ? 2000 : max], included, excluded)
  },

  async getMangaDetails(manga) {
    const { document } = await fetchPage(baseUrl + manga.url)
    const info = document.selectFirst("div#bigcontainer")
    if (!info) return {}
    const field = (selector: string) => { const list = info.select(selector); return list.length ? list.map((e) => e.text()).join(", ") : undefined }
    const id = Number(manga.url.split("/g/")[1]?.split("/")[0])
    const description = [
      ["Alternative Title", field("h2")], ["Pages", field("div#info > div:contains(pages)")],
      ["Parody", field("div.field-name:contains(Parody:) a.tag")], ["Category", field("div.field-name:contains(Category:) a.tag")],
      ["Language", field("div.field-name:contains(Language:) a.tag")],
    ].flatMap(([label, value]) => (value ? [`${label}: ${value}`] : [])).join("\n\n")
    return {
      title: info.select("h1").map((h) => h.text()).join(" "),
      thumbnailUrl: Number.isInteger(id) ? coverUrl(id) : undefined,
      status: "completed",
      artist: field("div.field-name:contains(Artist:) a.tag"),
      author: field("div.field-name:contains(Group:) a.tag") ?? "Unknown circle",
      genres: info.select("div.field-name:contains(Tag:) a.tag").map((a) => a.text()),
      description,
    }
  },

  async getChapterList(manga) {
    const { document, url } = await fetchPage(baseUrl + manga.url)
    const time = document.select("div#info div time").map((t) => t.text()).join(" ")
    return [{ url: new RegExp("^https?://[^/]+(/[^?#]*)").exec(url)?.[1] ?? manga.url, name: "Chapter", dateUpload: parseRelativeDate(`${time} ago`) }]
  },

  async getPageList(chapter) {
    const id = Number(chapter.url.split("/g/")[1]?.split("/")[0])
    let total = (await fetchBook(id)).total_page
    // The last page is sometimes counted but missing.
    if ((await Yomu.request(`${imageBaseUrl}/${id}/preview/${total}t.jpg`)).status === 404) total--
    return Array.from({ length: total }, (_, i) => ({ url: `${imageBaseUrl}/${id}/${i + 1}.jpg` }))
  },

  getFilterList(): Filter[] {
    const text = (fid: string, name: string): Filter => ({ type: "text", id: fid, name, value: "" })
    return [
      { type: "header", id: "h1", name: "Search by id with \"id:\" in front of query" },
      { type: "separator", id: "s1" },
      { type: "select", id: "sort", name: "Sort by", options: ["Newest", "Popular Right now", "Most Fapped", "Most Viewed", "By Title"].map((label, i) => ({ label, value: String(i) })), selected: 0 },
      text("min_pages", "Minimum Pages"), text("max_pages", "Maximum Pages"), text("included", "Included Tags"), text("excluded", "Excluded Tags"),
      text("artist", "Artist"), text("group", "Group"), text("parody", "Parody"), text("character", "Character"), text("category", "Category"),
    ]
  },
}

export default source
