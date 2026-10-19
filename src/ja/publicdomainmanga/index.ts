// Early Japanese manga in the public domain, read from the National Diet Library's Digital
// Collections over IIIF. Like Public Domain Comics, the list is chosen by hand: each book was
// published in 1930 or earlier, by an artist who died before 1956, and the library publishes it
// online as out of copyright, for anyone to reuse.

import { fetchJSON, type Chapter, type Manga, type MangasPage, type Source } from "../../../sdk"

const baseUrl = "https://dl.ndl.go.jp"

interface Book {
  /** The NDL's persistent ID. */
  pid: string
  title: string
  author: string
  year: number
  description: string
  genres: string[]
  /** A IIIF region and scan for the cover: the books' own covers are plain cloth. */
  cover: { scan: string; region: string }
}

const catalogue: Book[] = [
  {
    pid: "960884",
    title: "欠伸をしに",
    author: "岡本一平",
    year: 1919,
    description: "日本の近代漫画を切り開いた岡本一平が、1919年（大正8年）に出した漫画と文章の本。",
    genres: ["漫画漫文", "随筆"],
    cover: { scan: "R0000080", region: "pct:8,6,38,90" },
  },
  {
    pid: "1186423",
    title: "愛の種々相",
    author: "岡本一平",
    year: 1930,
    description: "岡本一平が1930年（昭和5年）に出した漫画漫文集。巻頭にはカラーの口絵が付いています。",
    genres: ["漫画漫文"],
    cover: { scan: "R0000006", region: "pct:12,16,30,70" },
  },
]

function bookUrl(book: Book): string {
  return `/pid/${book.pid}`
}

function toManga(book: Book): Manga {
  return {
    url: bookUrl(book),
    title: book.title,
    thumbnailUrl: `${baseUrl}/api/iiif/${book.pid}/${book.cover.scan}/${book.cover.region}/600,/0/default.jpg`,
    author: book.author,
    artist: book.author,
    description: `${book.description}\n\n著作権の保護期間が満了した資料です。国立国会図書館デジタルコレクションより。`,
    genres: book.genres,
    status: "completed",
  }
}

function findBook(manga: Manga): Book {
  const book = catalogue.find((book) => bookUrl(book) === manga.url)
  if (book == null) throw new Error(`${manga.title} isn't in this source any more`)
  return book
}

/** What's needed of a IIIF Presentation 2 manifest: each canvas's size and image service. */
interface Manifest {
  sequences: { canvases: { width: number; images: { resource: { service: { "@id": string } } }[] }[] }[]
}

const source: Source = {
  info: {
    id: "9122203163319944007", // md5("public domain manga/ja/1"), as Mihon would make it
    name: "Public Domain Manga",
    lang: "ja",
    version: "1.0.0",
    baseUrl,
  },

  async getPopularManga(): Promise<MangasPage> {
    return { mangas: catalogue.map(toManga), hasNextPage: false }
  },

  async searchManga(_page, query): Promise<MangasPage> {
    const words = query.toLowerCase().split(/\s+/).filter((word) => word.length > 0)
    const mangas = catalogue
      .filter((book) => {
        const text = `${book.title} ${book.author} ${book.genres.join(" ")}`.toLowerCase()
        return words.every((word) => text.includes(word))
      })
      .map(toManga)
    return { mangas, hasNextPage: false }
  },

  async getMangaDetails(manga) {
    return toManga(findBook(manga))
  },

  async getChapterList(manga): Promise<Chapter[]> {
    const book = findBook(manga)
    return [{ url: bookUrl(book), name: book.title, dateUpload: Date.UTC(book.year, 0, 1), chapterNumber: 1, scanlator: "国立国会図書館" }]
  },

  async getPageList(chapter) {
    const pid = chapter.url.split("/").pop()
    const manifest = await fetchJSON<Manifest>(`${baseUrl}/api/iiif/${pid}/manifest.json`)
    // Each scan is an open two-page spread, about 4,000 pixels wide: 2,032 is one of the sizes
    // the server keeps ready, so it comes back quickly and is still sharp on an iPad.
    const pages = manifest.sequences[0]?.canvases.map((canvas) => {
      const service = canvas.images[0].resource.service["@id"]
      return { url: `${service}/full/${Math.min(2032, canvas.width)},/0/default.jpg` }
    }) ?? []
    if (pages.length === 0) throw new Error(`no pages in ${pid}'s manifest`)
    return pages
  },
}

export default source
