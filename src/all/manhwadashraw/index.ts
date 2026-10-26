// Ported from the Keiyoushi "Manhwa-raw" extension (madara theme, v1.6.3):
// https://github.com/keiyoushi/extensions-source/tree/main/src/all/manhwadashraw
// Licensed under the Apache License, Version 2.0.
// Its search, which the theme can't express, is here; the theme handles everything else.

import { fetchPage, relativeUrl, type HTMLNode, type Manga, type MangasPage, type Source } from "../../../sdk"
import { madara } from "../../../themes/madara"

const baseUrl = "https://manhwa-raw.com"

const options = {
  info: {
    id: "5617855959190673282",
    name: "Manhwa-raw",
    lang: "all",
    version: "1.1.3",
    baseUrl,
    nsfw: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/manhwadashraw/res/mipmap-xhdpi/ic_launcher.png",
  },
  ajax: false,
  chapterDateFormat: { pattern: "dd/MM/yyyy", locale: "en" },
  mangaDetailsSelectorStatus: "div.post-content_item:contains(Status) > div.summary-content",
  mangaDetailsSelectorDescription: "div.post-content_item:contains(Summary) div.summary-container",
  pageListParseSelector: "div.page-break img.wp-manga-chapter-img",
}

const source = madara(options)

// The site answers WordPress search (?s=) with HTTP 410 and serves results from
// /search/<token>/<slug>/ instead, the token coming from the homepage search form.
let searchToken: string | undefined

async function fetchSearchToken(): Promise<string> {
  const { document } = await fetchPage(baseUrl)
  const token = document.selectFirst("input[name=mbk_token]")?.attr("value")
  if (!token) throw new Error("Unable to find the search token on the homepage.")
  searchToken = token
  return token
}

const source_: Source = {
  ...source,
  async searchManga(page, query, filters) {
    if (!query.trim()) return source.searchManga(page, query, filters)
    const slug = toSearchSlug(query)
    if (slug === "") return { mangas: [], hasNextPage: false }
    const token = page > 1 && searchToken ? searchToken : await fetchSearchToken()
    const { document } = await fetchPage(`${baseUrl}/search/${token}/${slug}/${page > 1 ? `page/${page}/` : ""}`)
    return { mangas: parseArchive(document), hasNextPage: document.selectFirst("div.nav-previous, a.nextpostslink, #navigation-ajax") != null }
  },
}

export default source_

/** Same transformation as the site's own search form script. */
function toSearchSlug(query: string): string {
  return query.toLowerCase().trim().normalize("NFD").replace(DIACRITICS, "").replace(NON_SLUG_CHARS, "-").replace(/^-+|-+$/g, "")
}

const DIACRITICS = /\p{M}/gu
const NON_SLUG_CHARS = /[^a-z0-9]+/g

// The madara theme's archive parsing, which lives inside its closure: post IDs and their paths.
function parseArchive(document: HTMLNode): Manga[] {
  return document.select("div.page-item-detail, .manga__item, .c-tabs-item__content").flatMap((element) => {
    const id = element.attr("data-post-id") || element.selectFirst("[data-post-id]")?.attr("data-post-id")
    if (!id) return []
    const link = element.selectFirst(".post-title a")
    const href = link?.absUrl("href")
    if (!link || !href) return []
    const img = element.selectFirst("img")
    return [{
      url: id,
      title: link.text(),
      thumbnailUrl: img ? imageFromElement(img) : undefined,
      sourceData: JSON.stringify({ path: relativeUrl(href).replace(/[?#].*$/, "") }),
    }]
  })
}

/** The image URL in the first lazy-load attribute set, or the largest in a srcset. */
function imageFromElement(img: HTMLNode): string | undefined {
  for (const name of ["data-src", "data-lazy-src", "data-lzl-src", "data-cfsrc", "data-manga-src"]) {
    if (img.hasAttr(name)) return img.absUrl(name)
  }
  if (img.hasAttr("srcset")) {
    const candidates = img.attr("srcset").split(",").map((c) => c.trim().split(/\s+/, 2)).filter((c) => /^https?:\/\/\S+$/.test(c[0]))
    const sized = candidates.flatMap((c) => { const m = /^(\d+(?:\.\d+)?)[wx]$/.exec(c[1] ?? ""); return m ? [[c[0], Number(m[1])] as [string, number]] : [] })
    return sized.sort((a, b) => b[1] - a[1])[0]?.[0] ?? candidates.map((c) => c[0]).sort().pop()
  }
  return img.absUrl("src") || undefined
}
