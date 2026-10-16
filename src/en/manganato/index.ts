// Ported from the Keiyoushi "Manganato" extension (mangabox theme):
// https://github.com/keiyoushi/extensions-source/tree/main/src/en/manganelo
// Licensed under the Apache License, Version 2.0.

import { mangabox } from "../../../themes/mangabox"

const source = mangabox({
  // Mihon's ID override for this source.
  id: "1024627298672457456", name: "Manganato", lang: "en", version: "1.0.0", baseUrl: "https://www.natomanga.com",
  icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/manganelo/res/mipmap-xhdpi/ic_launcher.png",
})

const legacyDomains = ["https://chapmanganato.to/", "https://manganato.com/", "https://readmanganato.com/"]
const getMangaDetails = source.getMangaDetails
source.getMangaDetails = (manga) => {
  if (legacyDomains.some((d) => manga.url.startsWith(d))) throw new Error('Migrate this entry from "Manganato" to "Manganato" to continue reading')
  return getMangaDetails(manga)
}

export default source
