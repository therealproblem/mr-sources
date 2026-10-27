// Ported from the Keiyoushi "Koreli Scans" extension (mangathemesia theme, v1.6.20):
// https://github.com/keiyoushi/extensions-source/tree/main/src/tr/koreliscans
// Licensed under the Apache License, Version 2.0.

import { mangathemesia } from "../../../themes/mangathemesia"

const lockedChapterSelector = "span[data-mrh-locked]"

export default mangathemesia({
  info: {
    id: "1475942648540931708", name: "Koreli Scans", lang: "tr", version: "1.0.20", baseUrl: "https://www.nabicix.com",
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/tr/koreliscans/res/mipmap-xhdpi/ic_launcher.png",
  },
  chapterFromElement(chapter, element) {
    const locked = element.is(lockedChapterSelector) || element.selectFirst(lockedChapterSelector) != null
    // Mihon's "hide paid chapters" setting, which is on unless a restored backup turned it off.
    if (locked && Honya.prefs.get("pref_hide_paid_chapters") !== false) return undefined
    let name = chapter.name
    // Coin chapters carry their number only in the URL.
    if (!/\d/.test(name)) {
      const url = chapter.url.replace(/\/$/, "")
      const index = url.lastIndexOf("-bolum-")
      const number = index < 0 ? "" : url.slice(index + "-bolum-".length)
      if (number) name = `${name} ${number.replaceAll("-", ".")}`
    }
    return { ...chapter, name: locked ? `🔒 ${name}` : name }
  },
})
