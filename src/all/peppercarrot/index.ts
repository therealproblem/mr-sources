// David Revoy's webcomics, read from his site, peppercarrot.com: Pepper&Carrot, about a young
// witch and her cat, and Mini Fantasy Theater, short gag strips from the same world. One source
// per language, all sharing this script.
//
// Both are free to share as long as their authors are credited, and every title's description
// does that: Pepper&Carrot is under Creative Commons Attribution 4.0 (CC BY 4.0), Mini Fantasy
// Theater under Attribution-ShareAlike 4.0 (CC BY-SA 4.0), and both credit David Revoy, the site
// and the language's translators (0_sources/langs.json). Episodes come from the site's own list
// (0_sources/episodes.json); strips from each language's index page, which marks the ones
// translated into it.

import { fetchHTML, fetchJSON, type Chapter, type Manga, type MangasPage, type Source } from "../../../sdk"

const baseUrl = "https://www.peppercarrot.com"
const files = `${baseUrl}/0_sources`

interface Language {
  /** The app's language code. */
  lang: string
  /** The site's own, which isn't always ISO 639 ("cn", "kr"). */
  site: string
  /** md5("pepper&carrot/<lang>/1"), as Mihon would make it. */
  id: string
  episode: (number: number) => string
  /** Whether Mini Fantasy Theater has strips in this language (on the site in 2026: English,
   * French, Japanese and German). The others would list no strips. */
  hasMiniFantasyTheater?: boolean
}

const languages: Language[] = [
  { lang: "en", site: "en", id: "3717103867132681399", episode: (n) => `Episode ${n}`, hasMiniFantasyTheater: true },
  { lang: "ja", site: "ja", id: "6165881221950830721", episode: (n) => `第${n}話`, hasMiniFantasyTheater: true },
  { lang: "zh", site: "cn", id: "4651823155460600022", episode: (n) => `第${n}话` },
  { lang: "ko", site: "kr", id: "7113735609798927379", episode: (n) => `제${n}화` },
  { lang: "es", site: "es", id: "377155379521692942", episode: (n) => `Episodio ${n}` },
  { lang: "fr", site: "fr", id: "2425121988128812194", episode: (n) => `Épisode ${n}`, hasMiniFantasyTheater: true },
  { lang: "de", site: "de", id: "699545521251015363", episode: (n) => `Episode ${n}`, hasMiniFantasyTheater: true },
  { lang: "id", site: "id", id: "5426603323503143528", episode: (n) => `Episode ${n}` },
  { lang: "pt-BR", site: "pt", id: "260846947757439928", episode: (n) => `Episódio ${n}` },
  { lang: "vi", site: "vi", id: "8782613666392461545", episode: (n) => `Tập ${n}` },
  { lang: "it", site: "it", id: "1797554907736656784", episode: (n) => `Episodio ${n}` },
  { lang: "ru", site: "ru", id: "2401372991067169719", episode: (n) => `Эпизод ${n}` },
]

interface Episode {
  /** Its folder, like "ep01_Potion-of-Flight". */
  name: string
  /** Pages after the title banner (P00). */
  total_pages: number
  translated_languages: string[]
}

/** 1 for "ep01_Potion-of-Flight". */
function episodeNumber(folder: string): number {
  return Number(/^ep(\d+)_/.exec(folder)?.[1] ?? 0)
}

/** "Potion of Flight" for "ep01_Potion-of-Flight". Folder names drop apostrophes, so a lone
 * "s" is put back as a possessive ("Coriander-s-Invention"). */
function episodeTitle(folder: string): string {
  return folder.replace(/^ep\d+_/, "").replace(/-s(?=-|$)/g, "’s").replace(/-/g, " ")
}

/** The credit line for the language's translators, if it isn't English, the original. */
async function translationCredit(language: Language): Promise<string[]> {
  if (language.site === "en") return []
  const langs = await fetchJSON<Record<string, { translators?: string[] }>>(`${files}/langs.json`)
  const translators = langs[language.site]?.translators ?? []
  return translators.length > 0 ? [`Translation: ${translators.join(", ")}.`] : []
}

function makeSource(language: Language): Source {
  const pepperCarrot: Manga = {
    url: `/${language.site}/webcomics/peppercarrot.html`,
    title: "Pepper&Carrot",
    // Episode 24's cover art, without its title: Pepper reading by the Unity Tree. It's wide, and
    // the app crops covers to the middle, which is her.
    thumbnailUrl: `${files}/ep24_The-Unity-Tree/low-res/gfx-only/gfx_Pepper-and-Carrot_by-David-Revoy_E24.jpg`,
    author: "David Revoy",
    artist: "David Revoy",
    genres: ["Fantasy", "Comedy", "Webcomic"],
    status: "ongoing",
  }
  const miniFantasyTheater: Manga = {
    url: `/${language.site}/webcomics/miniFantasyTheater.html`,
    title: "Mini Fantasy Theater",
    // Strip 1 is silent, so it's the same in every language.
    thumbnailUrl: `${files}/miniFantasyTheater/low-res/en_001_miniFantasyTheater.jpg`,
    author: "David Revoy",
    artist: "David Revoy",
    genres: ["Fantasy", "Comedy", "Webcomic", "Gag Strip"],
    status: "ongoing",
  }
  const series = language.hasMiniFantasyTheater ? [pepperCarrot, miniFantasyTheater] : [pepperCarrot]
  const isMiniFantasyTheater = (url: string) => url.includes("miniFantasyTheater")

  return {
    info: {
      id: language.id,
      name: "Pepper&Carrot",
      lang: language.lang,
      version: "1.2.1",
      baseUrl,
      icon: `${baseUrl}/core/img/favicon.png`,
    },

    async getPopularManga(): Promise<MangasPage> {
      return { mangas: series, hasNextPage: false }
    },

    async searchManga(_page, query): Promise<MangasPage> {
      const words = query.toLowerCase().split(/\s+/).filter((word) => word.length > 0)
      const mangas = series.filter((manga) => {
        const text = `${manga.title} david revoy witch fantasy ${manga.genres?.join(" ") ?? ""}`.toLowerCase()
        return words.every((word) => text.includes(word))
      })
      return { mangas, hasNextPage: false }
    },

    async getMangaDetails(manga) {
      const translation = await translationCredit(language)
      if (isMiniFantasyTheater(manga.url)) {
        return {
          ...miniFantasyTheater,
          description: "Short gag strips from the world of Pepper&Carrot, one square picture each, many without a word.\n\n" + [
            "Mini Fantasy Theater by David Revoy, www.peppercarrot.com. Licensed under Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0).",
            ...translation,
          ].join("\n"),
        }
      }
      return {
        ...pepperCarrot,
        description: "Pepper, a young witch, and her cat Carrot learn the magic of Chaosah in the fantasy world of Hereva. A free, open-source webcomic.\n\n" + [
          "Pepper&Carrot by David Revoy, www.peppercarrot.com. Licensed under Creative Commons Attribution 4.0 (CC BY 4.0).",
          ...translation,
        ].join("\n"),
      }
    },

    async getChapterList(manga): Promise<Chapter[]> {
      if (isMiniFantasyTheater(manga.url)) {
        // The index lists every strip, marking the ones translated into this language; the
        // others have no picture in it.
        const document = await fetchHTML(`${baseUrl}${miniFantasyTheater.url}`)
        return document.select("figure.thumbnail.translated").flatMap((figure) => {
          const link = figure.selectFirst("figcaption a")
          const number = Number(/\/(\d+)\.html$/.exec(link?.attr("href") ?? "")?.[1] ?? Number.NaN)
          if (link == null || Number.isNaN(number)) return []
          const date = /\d{4}-\d{2}-\d{2}/.exec(figure.selectFirst("figcaption span")?.text() ?? "")?.[0]
          return [{
            url: `/${language.site}/miniFantasyTheater/${String(number).padStart(3, "0")}.html`,
            name: link.text().trim(),
            dateUpload: date == null ? undefined : Date.parse(date),
            chapterNumber: number,
          }]
        }).sort((a, b) => b.chapterNumber - a.chapterNumber)
      }

      const episodes = await fetchJSON<Episode[]>(`${files}/episodes.json`)
      return episodes
        .filter((episode) => episode.translated_languages.includes(language.site))
        .map((episode) => {
          const number = episodeNumber(episode.name)
          return {
            url: `/${language.site}/webcomic/${episode.name}.html`,
            // Titles are drawn into the art, translated; the list only has the English ones.
            name: language.lang === "en" ? `${language.episode(number)}: ${episodeTitle(episode.name)}` : language.episode(number),
            chapterNumber: number,
          }
        })
        .sort((a, b) => b.chapterNumber - a.chapterNumber)
    },

    async getPageList(chapter) {
      const page = chapter.url.split("/").pop()?.replace(/\.html$/, "") ?? ""

      if (isMiniFantasyTheater(chapter.url)) {
        // One square picture per strip.
        return [{ url: `${files}/miniFantasyTheater/low-res/${language.site}_${page}_miniFantasyTheater.jpg` }]
      }

      const episodes = await fetchJSON<Episode[]>(`${files}/episodes.json`)
      const episode = episodes.find((episode) => episode.name === page)
      if (episode == null) throw new Error(`no episode ${page}`)
      const number = String(episodeNumber(page)).padStart(2, "0")
      // The title banner (P00), then the pages.
      return Array.from({ length: episode.total_pages + 1 }, (_, index) => ({
        url: `${files}/${page}/low-res/${language.site}_Pepper-and-Carrot_by-David-Revoy_E${number}P${String(index).padStart(2, "0")}.jpg`,
      }))
    },
  }
}

export default languages.map(makeSource)
