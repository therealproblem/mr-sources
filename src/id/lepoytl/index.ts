// Ported from the Keiyoushi "LepoyTL" extension (zeistmanga theme, versionCode 3):
// https://github.com/keiyoushi/extensions-source/tree/main/src/id/lepoytl
// Licensed under the Apache License, Version 2.0.

import type { Filter } from "../../../sdk"
import { zeistmanga } from "../../../themes/zeistmanga"

const source = zeistmanga({
  info: {
    id: "1601772753251290758",
    name: "LepoyTL",
    lang: "id",
    version: "1.2.3",
    baseUrl: "https://www.lepoytl.my.id",
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/id/lepoytl/res/mipmap-xhdpi/ic_launcher.png",
  },
  popularMangaSelector: "div.PopularPosts div.grid > article",
  popularMangaSelectorTitle: "h3 > a",
  popularMangaSelectorUrl: "h3 > a",
  mangaDetailsSelector: "main",
  mangaDetailsSelectorGenres: "aside dl a[rel=tag]",
  mangaDetailsSelectorInfo: "#extra-info dl",
  mangaDetailsSelectorInfoTitle: "dt",
  mangaDetailsSelectorInfoDescription: "dd",
  pageListSelector: "#reader",
  hasFilters: true,
})

const options = (pairs: [string, string][]) => pairs.map(([label, value]) => ({ label, value }))
const genres: [string, string][] = [
  ["Animals", "Animals"], ["Comedy", "Comedy"], ["Crossdress", "Crossdress"], ["Drama", "Drama"], ["Gender Bender", "Gender Bender"],
  ["Genderswap", "Genderswap"], ["Psychological", "Psychological"], ["Reincarnation", "Reincarnation"], ["Romance", "Romance"],
  ["School Life", "School Life"], ["Shounen", "shounen"], ["Slice of Life", "Slice of Life"], ["Supernatural", "Supernatural"], ["Tragedy", "Tragedy"],
]

// The site's own labels. No language filter, nor a type one: every series is tagged "Manga".
source.getFilterList = (): Filter[] => [
  { type: "header", id: "warning", name: "Filters are ignored when searching by text" },
  { type: "separator", id: "separator" },
  { type: "select", id: "status", name: "Status", options: options([["Semua", ""], ["Ongoing", "Ongoing"], ["Completed", "Completed"]]), selected: 0 },
  { type: "checkboxes", id: "genres", name: "Genre", options: options(genres), checked: [] },
]

export default source
