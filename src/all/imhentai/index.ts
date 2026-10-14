// Ported from the Keiyoushi "IMHentai" extension (galleryadults theme, v1.6.25):
// https://github.com/keiyoushi/extensions-source/tree/main/src/all/imhentai
// Licensed under the Apache License, Version 2.0.

import { imgAttr } from "../../../sdk"
import { galleryAdults, languageSlugs } from "../../../themes/galleryadults"

// [Mihon source ID, language]
const languages: [string, string][] = [
  ["1797754663718263026", "en"], ["2843704102372436364", "ja"], ["1600533831542201953", "es"], ["6518732459102419415", "fr"],
  ["520535890722709208", "ko"], ["341676138799608238", "de"], ["7505608677115153818", "ru"], ["3395462671769287908", "all"],
]

export default languages.map(([id, lang]) => galleryAdults({
  info: {
    id, name: "IMHentai", lang, version: "1.0.0", baseUrl: "https://imhentai.xxx", nsfw: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/imhentai/res/mipmap-xhdpi/ic_launcher.png",
  },
  mangaLang: languageSlugs[lang],
  useIntermediateSearch: true,
  supportAdvancedSearch: true,
  supportSpeechless: true,
  mangaLangOf: (e) => (e.select("a:has(.thumb_flag)")[0]?.attr("href") ?? "").replace(/\/$/, "").split("/").pop() ?? "",
  infoSelector: (tag) => `li:has(.tags_text:contains(${tag}:)) a.tag`,
  cover: (e) => { const img = e.selectFirst(".left_cover img"); return img ? imgAttr(img) : undefined },
  mangaDetailInfoSelector: ".gallery_first",
  thumbnailSelector: ".gthumb",
  pageUri: "view",
  checkPage: (html) => {
    if (html.includes("Overload... Please use the advanced search")) throw new Error("IMHentai search is overloaded. Try again later.")
  },
}))
