// Ported from the Keiyoushi "Manga18Me" extension (yiimadara theme, v1.6.0):
// https://github.com/keiyoushi/extensions-source/tree/main/src/all/manga18me
// Licensed under the Apache License, Version 2.0.

import { yiiMadara } from "../../../themes/yiimadara"

// [Mihon source ID, language]
const languages: [string, string][] = [["1353606378087565589", "all"], ["6244055465910932489", "en"]]

// The site doesn't link its genre pages anywhere, so the filter's genres are this list.
const genres: [string, string][] = [
  ["Action", "genre/action"], ["Adult", "genre/adult"], ["Adventure", "genre/adventure"], ["BL", "genre/bl"], ["Comedy", "genre/comedy"],
  ["Drama", "genre/drama"], ["Ecchi", "genre/ecchi"], ["Family", "genre/family"], ["Fantasy", "genre/fantasy"], ["Gender Bender", "genre/gender-bender"],
  ["GL", "genre/gl"], ["Harem", "genre/harem"], ["Hentai", "genre/hentai"], ["Historical", "genre/historical"], ["Horror", "genre/horror"],
  ["Isekai", "genre/isekai"], ["Josei", "genre/josei"], ["Magic", "genre/magic"], ["Manhua", "genre/manhua"], ["Manhwa", "genre/manhwa"],
  ["Martial Arts", "genre/martial-arts"], ["Mature", "genre/mature"], ["Mystery", "genre/mystery"], ["Psychological", "genre/psychological"],
  ["Romance", "genre/romance"], ["School Life", "genre/school-life"], ["Sci-Fi", "genre/sci-fi"], ["Seinen", "genre/seinen"], ["Shoujo", "genre/shoujo"],
  ["Shounen", "genre/shounen"], ["Slice of Life", "genre/slice-of-life"], ["Smut", "genre/smut"], ["Sports", "genre/sports"],
  ["Supernatural", "genre/supernatural"], ["Thriller", "genre/thriller"], ["Tragedy", "genre/tragedy"], ["Uncensored", "genre/uncensored"],
  ["Yaoi", "genre/yaoi"], ["Yuri", "genre/yuri"],
]

export default languages.map(([id, lang]) => yiiMadara({
  info: {
    id, name: "Manga18.me", lang, version: "1.0.5", baseUrl: "https://manga18.me", nsfw: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/manga18me/res/mipmap-xhdpi/ic_launcher.png",
  },
  rawPath: "manhwa-raw",
  genres,
}))
