// Ported from the Keiyoushi "Manhua Plus" extension (madara theme, v1.6.8):
// https://github.com/keiyoushi/extensions-source/tree/main/src/en/manhuaplus
// Licensed under the Apache License, Version 2.0.
// Its imageRequest override sends the browser User-Agent only to WordPress.com image hosts,
// which reject the app's; this SDK's per-source imageHeaders can't scope per host, so the
// browser User-Agent goes out with all its images.

import { madara } from "../../../themes/madara"

export default madara({
  info: {
    id: "9030178752551947945",
    name: "Manhua Plus",
    lang: "en",
    version: "1.1.8",
    baseUrl: "https://manhuaplus.com",
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/manhuaplus/res/mipmap-xhdpi/ic_launcher.png",
    // A Safari User-Agent, as the app's web view would send.
    imageHeaders: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15" },
  },
  filterNonMangaItems: false,
  pageListParseSelector: ".read-container img",
})
