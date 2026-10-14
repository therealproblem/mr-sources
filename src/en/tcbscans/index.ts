// Ported from the Keiyoushi "TCB Scans" extension:
// https://github.com/keiyoushi/extensions-source/tree/main/src/en/tcbscans
// Licensed under the Apache License, Version 2.0.

import { fetchHTML, relativeUrl, type MangasPage, type Source } from "../../../sdk"

const baseUrl = "https://tcbonepiecechapters.com"

/** Old entries from an earlier TCB Scans source 404 here. */
async function page(url: string) {
  const response = await Rakuen.request(url)
  if (response.status === 404 && /\/(mangas|chapters)\//.test(url)) throw new Error("This entry is from an older TCB Scans source. Search for it again here.")
  if (response.status < 200 || response.status > 299) throw new Error(`HTTP ${response.status} for ${response.url}`)
  return Rakuen.parseHTML(response.body, response.url)
}

async function projects(): Promise<MangasPage> {
  const document = await fetchHTML(`${baseUrl}/projects`)
  const mangas = document.select("div.bg-card").flatMap((card) => {
    const link = card.selectFirst("a[href].text-white")
    return link ? [{ url: relativeUrl(link.absUrl("href")), title: link.text(), thumbnailUrl: card.selectFirst("img")?.absUrl("src") || undefined }] : []
  })
  return { mangas, hasNextPage: false }
}

const source: Source = {
  info: {
    id: "1435116756378369709", name: "TCB Scans", lang: "en", version: "1.0.0", baseUrl, supportsLatest: false,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/tcbscans/res/mipmap-xhdpi/ic_launcher.png",
  },

  getPopularManga() {
    return projects()
  },

  async searchManga(_, query) {
    const { mangas } = await projects()
    return { mangas: mangas.filter((m) => m.title.toLowerCase().includes(query.toLowerCase())), hasNextPage: false }
  },

  async getMangaDetails(manga) {
    const info = (await page(baseUrl + manga.url)).selectFirst("div.order-1")
    if (!info) throw new Error("The series page has changed.")
    return { thumbnailUrl: info.selectFirst("img")?.absUrl("src") || undefined, title: info.selectFirst("h1")?.text(), description: info.selectFirst("p")?.text() }
  },

  async getChapterList(manga) {
    const document = await page(baseUrl + manga.url)
    return document.select("div.grid a").map((a) => {
      const title = a.select("div.font-bold:not(.flex)").map((d) => d.text()).join(" ")
      const description = a.selectFirst(".text-gray-500")?.text() || undefined
      const number = /\d+.?\d+$/.exec(title)?.[0]
      return { url: relativeUrl(a.absUrl("href")), name: `${number != null ? `Chapter ${number}` : title}${description ? `: ${description}` : ""}` }
    })
  },

  async getPageList(chapter) {
    return (await page(baseUrl + chapter.url)).select("picture img, .image-container img").map((img) => ({ url: img.absUrl("src") }))
  },
}

export default source
