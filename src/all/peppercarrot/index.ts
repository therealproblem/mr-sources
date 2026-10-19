// Pepper&Carrot, David Revoy's webcomic about a young witch and her cat, read from its own site.
// It's under Creative Commons Attribution 4.0, which lets anyone share it, so long as David Revoy
// and the translators are credited: every title's description does that. One source per
// language, all sharing this script, from the site's own episode list
// (0_sources/episodes.json) and translators (0_sources/langs.json).

import { fetchJSON, type Chapter, type Manga, type MangasPage, type Source } from "../../../sdk"

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
}

const languages: Language[] = [
  { lang: "en", site: "en", id: "3717103867132681399", episode: (n) => `Episode ${n}` },
  { lang: "ja", site: "ja", id: "6165881221950830721", episode: (n) => `第${n}話` },
  { lang: "zh", site: "cn", id: "4651823155460600022", episode: (n) => `第${n}话` },
  { lang: "ko", site: "kr", id: "7113735609798927379", episode: (n) => `제${n}화` },
  { lang: "es", site: "es", id: "377155379521692942", episode: (n) => `Episodio ${n}` },
  { lang: "fr", site: "fr", id: "2425121988128812194", episode: (n) => `Épisode ${n}` },
  { lang: "de", site: "de", id: "699545521251015363", episode: (n) => `Episode ${n}` },
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

/** "Potion of Flight" for "ep01_Potion-of-Flight". */
function episodeTitle(folder: string): string {
  return folder.replace(/^ep\d+_/, "").replace(/-/g, " ")
}

function makeSource(language: Language): Source {
  const series: Manga = {
    url: `/${language.site}/webcomics/peppercarrot.html`,
    title: "Pepper&Carrot",
    // The first page's art without its speech bubbles.
    thumbnailUrl: `${files}/ep01_Potion-of-Flight/low-res/gfx-only/gfx_Pepper-and-Carrot_by-David-Revoy_E01P01.jpg`,
    author: "David Revoy",
    artist: "David Revoy",
    genres: ["Fantasy", "Comedy", "Webcomic"],
    status: "ongoing",
  }

  return {
    info: {
      id: language.id,
      name: "Pepper&Carrot",
      lang: language.lang,
      version: "1.0.0",
      baseUrl,
      icon: `${baseUrl}/core/img/favicon.png`,
    },

    async getPopularManga(): Promise<MangasPage> {
      return { mangas: [series], hasNextPage: false }
    },

    async searchManga(_page, query): Promise<MangasPage> {
      const words = query.toLowerCase().split(/\s+/).filter((word) => word.length > 0)
      const text = "pepper carrot pepper&carrot david revoy witch fantasy"
      return { mangas: words.every((word) => text.includes(word)) ? [series] : [], hasNextPage: false }
    },

    async getMangaDetails() {
      const langs = await fetchJSON<Record<string, { translators?: string[] }>>(`${files}/langs.json`)
      const translators = language.site === "en" ? [] : (langs[language.site]?.translators ?? [])
      const credits = [
        "Pepper&Carrot by David Revoy, www.peppercarrot.com. Licensed under Creative Commons Attribution 4.0 (CC BY 4.0).",
        ...(translators.length > 0 ? [`Translation: ${translators.join(", ")}.`] : []),
      ]
      return {
        ...series,
        description: "Pepper, a young witch, and her cat Carrot learn the magic of Chaosah in the fantasy world of Hereva. A free, open-source webcomic.\n\n" + credits.join("\n"),
      }
    },

    async getChapterList(): Promise<Chapter[]> {
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
      const folder = chapter.url.split("/").pop()?.replace(/\.html$/, "") ?? ""
      const episodes = await fetchJSON<Episode[]>(`${files}/episodes.json`)
      const episode = episodes.find((episode) => episode.name === folder)
      if (episode == null) throw new Error(`no episode ${folder}`)
      const number = String(episodeNumber(folder)).padStart(2, "0")
      // The title banner (P00), then the pages.
      return Array.from({ length: episode.total_pages + 1 }, (_, index) => ({
        url: `${files}/${folder}/low-res/${language.site}_Pepper-and-Carrot_by-David-Revoy_E${number}P${String(index).padStart(2, "0")}.jpg`,
      }))
    },
  }
}

export default languages.map(makeSource)
