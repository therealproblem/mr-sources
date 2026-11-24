// Ported from the Keiyoushi "Cocomic" extension (madara theme, v1.6.3):
// https://github.com/keiyoushi/extensions-source/tree/main/src/en/cocomic
// Licensed under the Apache License, Version 2.0.

import { base64Decode, utf8Decode, type Source } from "../../../sdk"
import { madara } from "../../../themes/madara"

const baseUrl = "https://cocomic.co"
const wwwroot = `${baseUrl}/www/wwwroot/`
const onCdn = (url: string) => url.replace(wwwroot, "https://cdn2.cocomic.co/")

const source = madara({
  info: {
    id: "3544369893051520689",
    name: "Cocomic",
    lang: "en",
    version: "1.2.3",
    baseUrl,
    nsfw: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/cocomic/res/mipmap-xhdpi/ic_launcher.png",
    rateLimits: [{ host: "cocomic.co", permits: 1, periodMs: 2000 }],
  },
  chapterMode: "MangaAjax",
  chapterListSelector: "li.wp-manga-chapter:not(.premium)",
  mangaDetailsSelectorTitle: "h1.asura-series-title",
  mangaDetailsSelectorAuthor: ".asura-chip-author .author-name-text",
  mangaDetailsSelectorArtist: ".asura-chip:has(.chip-label:containsOwn(Artist)) .chip-val",
  mangaDetailsSelectorStatus: ".asura-badge-status",
  mangaDetailsSelectorDescription: ".asura-synopsis-content",
  mangaDetailsSelectorThumbnail: "img.asura-poster-img",
  mangaDetailsSelectorGenre: "a.asura-genre-tag",
  altNameSelector: "p.asura-series-alt-title",
  seriesTypeSelector: ".asura-hero-badge-type",
  updatingRegex: /^(?:Updating|TBA)$/i,
  pageListParseSelector: "div.asura-stream-images img",
  // The series and reader pages carry the post ID only in the base64 `var manga` script.
  mangaId(document) {
    const src = document.selectFirst(`script#wp-manga-js-extra[src^="data:text/javascript;base64,"]`)?.attr("src")
    return src ? /"manga_id":"(\d+)"/.exec(utf8Decode(base64Decode(src.slice(src.indexOf(",") + 1))))?.[1] : undefined
  },
})

export default {
  ...source,

  // Reader images under the server's /www/wwwroot path are on the site or its cdn2 host. Kotlin
  // retries each on the site's 404; with no image hook, this asks cdn2 (not rate limited, unlike
  // the site) for the first one and uses that host for the chapter.
  // shortcut: assumes a chapter's images share a host (they share a folder); check each if mixed chapters turn up.
  async getPageList(chapter) {
    const pages = await source.getPageList(chapter)
    const first = pages.find((page) => page.url.startsWith(wwwroot))
    if (!first || (await Honya.request({ url: onCdn(first.url), method: "HEAD" })).status !== 200) return pages
    return pages.map((page) => ({ url: onCdn(page.url) }))
  },
} satisfies Source
