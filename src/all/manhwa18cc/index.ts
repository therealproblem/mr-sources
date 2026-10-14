// Ported from the Keiyoushi "Manhwa18.cc" extension (madara theme, v1.6.10):
// https://github.com/keiyoushi/extensions-source/tree/main/src/all/manhwa18cc
// Licensed under the Apache License, Version 2.0.

import { queryString } from "../../../sdk"
import { madara } from "../../../themes/madara"

const baseUrl = "https://manhwa18.cc"

// [Mihon source ID, language]
const languages: [string, string][] = [["4841602236575491202", "en"], ["6864643444164576223", "ko"], ["993336618407081332", "all"]]

export default languages.map(([id, lang]) => madara({
  info: {
    id, name: "Manhwa18.cc", lang, version: "1.0.1", baseUrl, nsfw: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/manhwa18cc/res/mipmap-xhdpi/ic_launcher.png",
  },
  mangaSubString: lang === "ko" ? "raw" : "webtoons",
  archiveSelector: lang === "en" ? "div.manga-item:not(:has(h3 a[title$='Raw']))" : lang === "ko" ? "div.manga-item:has(h3 a[title$='Raw'])" : "div.manga-item",
  archiveUrlSelector: "div.manga-item div.data a",
  nextPageSelector: "ul.pagination li.next a",
  orderQueryParameter: "orderby",
  searchQueryParameter: "q",
  popularOrder: "trending",
  latestOrder: "",
  // /webtoons/2/ rather than /webtoons/page/2/; search is /search?q=…&page=2.
  archiveUrl: (path, page, params) => `${baseUrl}${path}${page > 1 ? `${page}/` : ""}${params.length ? `?${queryString(params)}` : ""}`,
  searchUrl: (page, params) => `${baseUrl}/search${page > 1 ? "/" : ""}?${queryString([...params, ...(page > 1 ? [["page", String(page)] as [string, string]] : [])])}`,
  mangaDetailsSelectorDescription: "div.panel-story-description div.dsct",
  chapterListSelector: "li.a-h",
  chapterDateSelector: "span.chapter-time",
  pageListParseSelector: "div.read-content img",
}))
