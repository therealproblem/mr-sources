// Ported from the Keiyoushi "HentaiRead" extension:
// https://github.com/keiyoushi/extensions-source/tree/main/src/en/hentairead
// Licensed under the Apache License, Version 2.0.

import { base64Decode, fetchHTML, fetchJSON, queryString, relativeUrl, utf8Decode, type Filter, type HTMLNode, type MangasPage, type Source } from "../../../sdk"

const baseUrl = "https://hentairead.com"

function cover(img: HTMLNode): string {
  if (img.hasAttr("data-src")) return img.absUrl("data-src")
  if (img.hasAttr("data-lazy-src")) return img.absUrl("data-lazy-src")
  if (img.hasAttr("srcset")) return img.absUrl("srcset").split(" ")[0].replace(/,$/, "")
  if (img.hasAttr("data-cfsrc")) return img.absUrl("data-cfsrc")
  return img.absUrl("src")
}

async function mangasPage(url: string): Promise<MangasPage> {
  const document = await fetchHTML(url)
  const mangas = document.select(".manga-item").map((e) => {
    const link = e.selectFirst("a.manga-item__link")!
    const img = e.selectFirst("img")
    return { url: relativeUrl(link.absUrl("href")), title: link.ownText(), thumbnailUrl: img ? cover(img) : undefined }
  })
  return { mangas, hasNextPage: document.selectFirst("a[rel=next]") != null }
}

const page = (n: number) => (n === 1 ? "" : `page/${n}/`)
const capitalizeEach = (text: string) => text.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")

/** ">20" → 21-9999, "<=5" → 1-5, "10" → 10-10. */
function pageRange(query: string): [number, number] {
  const num = Number(query.replace(/\D/g, "")) || -1
  const clamp = (n = num) => Math.min(9999, Math.max(1, n))
  if (num < 0) return [1, 9999]
  switch (query[0]) {
    case "<": return [1, query[1] === "=" ? clamp() : clamp(num + 1)]
    case ">": return [clamp(query[1] === "=" ? num : num + 1), 9999]
    case "=": return query[1] === ">" ? [clamp(), 9999] : query[1] === "<" ? [1, clamp(9999)] : [clamp(), clamp()]
    default: return [clamp(), clamp()]
  }
}

async function tagId(tag: string, type: string): Promise<number | undefined> {
  const taxonomy = type.replace("artist", "manga_artist")
  const data = await fetchJSON<{ results: { id: number; text: string }[] }>(`${baseUrl}/wp-admin/admin-ajax.php?${queryString([["action", "search_manga_terms"], ["search", tag], ["taxonomy", taxonomy]])}`)
  return data.results.find((r) => r.text.toLowerCase() === tag.toLowerCase())?.id
}

const source: Source = {
  info: {
    id: "2299981010822511979", name: "HentaiRead", lang: "en", version: "1.0.0", baseUrl, supportsLatest: true, nsfw: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/hentairead/res/mipmap-xhdpi/ic_launcher.png",
  },

  getPopularManga(n) {
    return mangasPage(`${baseUrl}/hentai/${page(n)}?sortby=views`)
  },

  getLatestUpdates(n) {
    return mangasPage(`${baseUrl}/hentai/${page(n)}?sortby=new`)
  },

  async searchManga(n, query, filters) {
    if (filters.length === 0) filters = this.getFilterList!()
    const params: [string, string][] = [["s", query], ["title-type", "contains"]]
    for (const filter of filters) {
      if (filter.type === "checkboxes" && filter.id === "types") {
        filter.checked.forEach((value) => params.push(["categories[]", value]))
      } else if (filter.type === "text" && filter.value.trim()) {
        if (filter.id === "pages") {
          const [min, max] = pageRange(filter.value.trim())
          params.push(["pages", `${min}-${max}`])
        } else if (filter.id === "uploaded") {
          const first = filter.value.trim()[0]
          params.push(["release-type", first === ">" ? "after" : first === "<" ? "before" : "in"], ["release", filter.value.replace(/\D/g, "")])
        } else {
          for (const raw of filter.value.split(",").filter((t) => t.trim())) {
            const trimmed = raw.trim()
            const name = trimmed.replace(/^-/, "")
            const id = await tagId(name, filter.id)
            if (id == null) throw new Error(`${filter.name} not found: ${name}`)
            if (filter.id === "manga_tag") params.push([trimmed.startsWith("-") ? "excluding[]" : "including[]", String(id)])
            else params.push([`${filter.id}s[]`, String(id)])
          }
        }
      } else if (filter.type === "sort") {
        params.push(["sortby", filter.options[filter.selected ?? 0].value], ["order", filter.ascending ? "asc" : "desc"])
      }
    }
    return mangasPage(`${baseUrl}/page/${n}?${queryString(params)}`)
  },

  async getMangaDetails(manga) {
    const document = await fetchHTML(baseUrl + manga.url)
    const names = (path: string) => document.select(`a[href*=/${path}/] span:first-of-type`).map((s) => s.text()).join(", ")
    const circles = names("circle")
    const artists = names("artist")
    let description = ""
    for (const [label, path] of [["Characters", "characters"], ["Parodies", "parody"], ["Circles", "circle"], ["Convention", "convention"], ["Scanlators", "scanlator"]]) {
      const value = names(path)
      if (value) description += `${label}: ${capitalizeEach(value)}\n\n`
    }
    const alternatives = document.selectFirst(".manga-titles h2")?.text()
    if (alternatives) description += `Alternative Titles: \n${alternatives.split("|").map((t) => `- ${t.trim()}`).join("\n")}\n\n`
    description += `${document.select(".items-center:contains(pages:)").map((e) => e.text()).join(" ")}\n`
    return {
      title: document.selectFirst("h1")?.ownText(),
      thumbnailUrl: document.selectFirst("meta[property=og:image]")?.attr("content") || undefined,
      author: circles || artists || undefined,
      artist: artists || circles || undefined,
      genres: document.select("a[href*=/tag/] span:first-of-type").map((s) => s.text()),
      description,
      status: "completed",
    }
  },

  async getChapterList(manga) {
    const details = await this.getMangaDetails(manga)
    const scanlator = details.description?.includes("Scanlators") ? details.description.split("Scanlators: ")[1]?.split("\n")[0] : undefined
    return [{ url: manga.url, name: "Chapter", scanlator }]
  },

  async getPageList(chapter) {
    // A couple of non-English entries don't work this way.
    const url = `${chapter.url}english/p/1/`
    const document = await fetchHTML(url.startsWith("http") ? url : baseUrl + url)
    const extra = document.selectFirst("[id=single-chapter-js-extra]")?.data()
    const pageBase = extra ? JSON.parse(/= (\{[^;]+)/.exec(extra)?.[1] ?? "{}").baseUrl : undefined
    const before = document.selectFirst("[id=single-chapter-js-before]")?.data()
    const encoded = before ? /.(ey\S+).\s/.exec(before)?.[1] : undefined
    if (!encoded) throw new Error("Failed to find page list. Non-English entries are not supported.")
    const pages = JSON.parse(utf8Decode(base64Decode(encoded))) as { data: { chapter: { images: { src: string }[] } } }
    return pages.data.chapter.images.map((image) => ({ url: `${pageBase}/${image.src}` }))
  },

  getFilterList(): Filter[] {
    const text = (id: string, name: string): Filter => ({ type: "text", id, name, value: "" })
    return [
      { type: "sort", id: "sort", name: "Sort by", options: [["Latest", "new"], ["A-Z", "alphabet"], ["Rating", "rating"], ["Views", "views"]].map(([label, value]) => ({ label, value })), selected: 0, ascending: false },
      { type: "checkboxes", id: "types", name: "Types", options: [["Doujinshi", "4"], ["Manga", "52"], ["Artist CG", "4798"], ["Western", "36278"]].map(([label, value]) => ({ label, value })), checked: ["4", "52", "4798", "36278"] },
      { type: "separator", id: "s1" },
      { type: "header", id: "h1", name: "Separate tags with commas (,)" },
      { type: "header", id: "h2", name: "Prepend with dash (-) to exclude [ Only for 'Tags' ]" },
      text("manga_tag", "Tags"),
      { type: "separator", id: "s2" },
      text("artist", "Artists"), text("circle", "Circles"), text("character", "Characters"), text("collection", "Collections"),
      text("scanlator", "Scanlators"), text("convention", "Conventions"),
      { type: "separator", id: "s3" },
      { type: "header", id: "h3", name: "Filter by year uploaded, for example: (>2024)" },
      text("uploaded", "Uploaded"),
      { type: "separator", id: "s4" },
      { type: "header", id: "h4", name: "Filter by pages, for example: (>20)" },
      text("pages", "Pages"),
    ]
  },
}

export default source
