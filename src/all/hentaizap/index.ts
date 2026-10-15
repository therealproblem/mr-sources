// Ported from the Keiyoushi "HentaiZap" extension (galleryadults theme, v1.6.12):
// https://github.com/keiyoushi/extensions-source/tree/main/src/all/hentaizap
// Licensed under the Apache License, Version 2.0.

import { imgAttr } from "../../../sdk"
import { galleryAdults, languageSlugs } from "../../../themes/galleryadults"

// [Mihon source ID, language]
const languages: [string, string][] = [
  ["3055889891446984546", "en"], ["6555947477839387123", "ja"], ["4825793506555725623", "es"], ["7896453910191786163", "fr"],
  ["9190914504602528025", "ko"], ["1397842818609440667", "de"], ["6614026304171193007", "ru"], ["279262715881564190", "all"],
]

export default languages.map(([id, lang]) => galleryAdults({
  info: {
    id, name: "HentaiZap", lang, version: "1.0.3", baseUrl: "https://hentaizap.com", nsfw: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/hentaizap/res/mipmap-xhdpi/ic_launcher.png",
  },
  mangaLang: languageSlugs[lang],
  supportSpeechless: true,
  useIntermediateSearch: true,
  basicSearchKey: "key",
  popularMangaSelector: ".hz-gallery-card",
  mangaTitleSelector: ".hz-gallery-card__title a",
  mangaUrl: (e) => e.selectFirst(".hz-gallery-card__cover")?.absUrl("href"),
  mangaThumbnail: (e) => { const img = e.selectFirst(".hz-gallery-card__media.thumb img"); return img ? imgAttr(img) : undefined },
  mangaLangOf: (e) => (e.select(".hz-gallery-card__flag")[0]?.attr("href") ?? "").replace(/\/$/, "").split("/").pop() ?? "",
  mangaDetailInfoSelector: ".hz-gallery-details",
  cover: (e) => { const img = e.selectFirst(".hz-gallery-cover img"); return img ? imgAttr(img) : undefined },
  infoSelector: (tag) => `div.hz-gallery-entity-group:has(:contains(${tag}:)) a.hz-gallery-tag`,
  infoTagName: (e) => e.selectFirst(".hz-gallery-tag__name")?.text() ?? e.ownText(),
  galleryId: (e) => e.select("[data-gallery-id]")[0]?.attr("data-gallery-id") ?? "",
  totalPages: (e) => e.select("[data-total-pages]")[0]?.attr("data-total-pages") ?? "",
  parsingImagePageByPage: true,
}))
