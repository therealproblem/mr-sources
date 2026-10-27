// Ported from the Keiyoushi "Manhwa18.cc" extension (yiimadara theme, v1.6.65):
// https://github.com/keiyoushi/extensions-source/tree/main/src/all/manhwa18cc
// Licensed under the Apache License, Version 2.0.

import { yiiMadara } from "../../../themes/yiimadara"

// [Mihon source ID, language]
const languages: [string, string][] = [["4841602236575491202", "en"], ["6864643444164576223", "ko"], ["993336618407081332", "all"]]

export default languages.map(([id, lang]) => yiiMadara({
  info: {
    id, name: "Manhwa18.cc", lang, version: "1.2.0", baseUrl: "https://manhwa18.cc", nsfw: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/manhwa18cc/res/mipmap-xhdpi/ic_launcher.png",
  },
  directoryPath: lang === "ko" ? "raw" : "webtoons",
  rawPath: "raw",
}))
