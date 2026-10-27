// Ported from the Keiyoushi "Manhua Plus" extension (madara theme, v1.6.8):
// https://github.com/keiyoushi/extensions-source/tree/main/src/en/manhuaplus
// Licensed under the Apache License, Version 2.0.
// Not here: its imageRequest override, which sends Android's User-Agent to WordPress.com image
// hosts because they reject Mihon's. They accept the app's own.

import { madara } from "../../../themes/madara"

export default madara({
  info: {
    id: "9030178752551947945",
    name: "Manhua Plus",
    lang: "en",
    version: "1.1.9",
    baseUrl: "https://manhuaplus.com",
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/manhuaplus/res/mipmap-xhdpi/ic_launcher.png",
  },
  filterNonMangaItems: false,
  pageListParseSelector: ".read-container img",
})
