// Ported from the Keiyoushi "Mangakakalot" extension (mangabox theme):
// https://github.com/keiyoushi/extensions-source/tree/main/src/en/mangakakalot
// Licensed under the Apache License, Version 2.0.

import { mangabox } from "../../../themes/mangabox"

const titleToSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/[\s-]+/g, "-").replace(/^-+|-+$/g, "")

export default mangabox({
  id: "2528986671771677900", name: "Mangakakalot", lang: "en", version: "1.0.0", baseUrl: "https://www.mangakakalot.gg",
  rateLimits: [{ host: "www.mangakakalot.gg", permits: 2, periodMs: 1000 }],
  icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/mangakakalot/res/mipmap-xhdpi/ic_launcher.png",
}, {
  // Old entries kept ids like "ab12345" where the site now wants the title's slug.
  mangaSlug(manga) {
    const slug = manga.url.replace(/\/+$/, "").split("/").pop() ?? ""
    return /^[a-z]{2}\d+$/.test(slug) ? titleToSlug(manga.title) : slug
  },
})
