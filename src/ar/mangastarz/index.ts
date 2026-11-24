// Ported from the Keiyoushi "Manga Starz" extension (madara theme, v1.6.11):
// https://github.com/keiyoushi/extensions-source/tree/main/src/ar/mangastarz
// Licensed under the Apache License, Version 2.0.
// Not here: its answer to the Imunify360 WebShield bot check ("One moment, please..."), which
// didn't come up in testing. The image hosts' half of it would need the app to handle it.

import { madara } from "../../../themes/madara"

export default madara({
  info: {
    id: "6058166507489091982",
    name: "Manga Starz",
    lang: "ar",
    version: "1.2.11",
    baseUrl: "https://starzmanga.net",
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/ar/mangastarz/res/mipmap-xhdpi/ic_launcher.png",
    rateLimits: [{ host: "starzmanga.net", permits: 5, periodMs: 1000 }],
  },
  chapterDateFormat: { pattern: "d MMMM، yyyy", locale: "ar" },
})
