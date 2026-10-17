// Comics in the public domain, read from the Internet Archive. The example source: it shows
// listing, searching, details, chapters and pages with nothing but JSON APIs, and every title in
// it is one anyone may read and share.
//
// The list is chosen by hand rather than searched. The Archive's own license and date fields are
// filled in by uploaders, and a search on them turns up recent comics too. Each book here was
// published in 1930 or earlier, so it's in the public domain in the United States, and was
// scanned by a library or archive.

import { fetchJSON, type Chapter, type Manga, type MangasPage, type Source } from "../../../sdk"

const baseUrl = "https://archive.org"

interface Series {
  title: string
  author: string
  description: string
  genres: string[]
  /** Internet Archive items, oldest first: each is a chapter. */
  books: { id: string; name: string; year: number }[]
}

const catalogue: Series[] = [
  {
    title: "Little Nemo in Slumberland",
    author: "Winsor McCay",
    description: "Every Sunday a small boy dreams his way into Slumberland, and every Sunday he wakes up falling out of bed. Winsor McCay's newspaper pages, from 1905 to 1914.",
    genres: ["Fantasy", "Newspaper Strip"],
    books: [{ id: "LittleNemo1905-1914ByWinsorMccay", name: "1905–1914", year: 1914 }],
  },
  {
    title: "Buster Brown",
    author: "R. F. Outcault",
    description: "A well-dressed boy and his dog Tige get into trouble, and Buster writes down what he's learned at the end of each page. Collected from R. F. Outcault's Sunday strip.",
    genres: ["Comedy", "Newspaper Strip"],
    books: [
      { id: "BusterBrownhisd00Outc", name: "Buster Brown, His Dog Tige and Their Troubles", year: 1904 },
      { id: "myresolutionsbus00outc", name: "My Resolutions", year: 1910 },
    ],
  },
  {
    title: "Foxy Grandpa",
    author: "Carl E. Schultze",
    description: "Two boys plan pranks on their grandfather, who is always a step ahead of them. Carl E. Schultze's strip, collected in books.",
    genres: ["Comedy", "Newspaper Strip"],
    books: [
      { id: "foxy-grandpa-flip-flaps", name: "Flip Flaps", year: 1905 },
      { id: "foxy-grandpa-shows-the-boys-up-to-date-sports", name: "Shows the Boys Up-to-Date Sports", year: 1908 },
    ],
  },
  {
    title: "Bringing Up Father",
    author: "George McManus",
    description: "Jiggs came into money but would still rather be at the corner bar with his old friends, much to the disgust of his wife Maggie.",
    genres: ["Comedy", "Newspaper Strip"],
    books: [{ id: "BringingUpFatherSeries1", name: "Series 1", year: 1919 }],
  },
  {
    title: "Comic Cuts",
    author: "Alfred Harmsworth",
    description: "A British weekly of jokes and comic pictures, sold for a halfpenny from 1890.",
    genres: ["Comedy", "Magazine"],
    books: [{ id: "ComicCuts01-1890", name: "No. 1", year: 1890 }],
  },
]

/** A series' URL: its first book's page on the Archive. */
function seriesUrl(series: Series): string {
  return `/details/${series.books[0].id}`
}

function toManga(series: Series): Manga {
  return {
    url: seriesUrl(series),
    title: series.title,
    thumbnailUrl: `${baseUrl}/services/img/${series.books[0].id}`,
    author: series.author,
    artist: series.author,
    description: `${series.description}\n\nIn the public domain. Scans from the Internet Archive.`,
    genres: series.genres,
    status: "completed",
  }
}

function findSeries(manga: Manga): Series {
  const series = catalogue.find((series) => seriesUrl(series) === manga.url)
  if (series == null) throw new Error(`${manga.title} isn't in this source any more`)
  return series
}

/** What's needed of a IIIF Presentation 3 manifest: its tree of items, down to the canvases. */
interface IIIFNode {
  type?: string
  items?: IIIFNode[]
}

const source: Source = {
  info: {
    id: "6998882641562544524", // md5("public domain comics/en/1"), as Mihon would make it
    name: "Public Domain Comics",
    lang: "en",
    version: "1.0.0",
    baseUrl,
  },

  async getPopularManga(): Promise<MangasPage> {
    return { mangas: catalogue.map(toManga), hasNextPage: false }
  },

  async searchManga(_page, query): Promise<MangasPage> {
    const words = query.toLowerCase().split(/\s+/).filter((word) => word.length > 0)
    const mangas = catalogue
      .filter((series) => {
        const text = `${series.title} ${series.author} ${series.genres.join(" ")}`.toLowerCase()
        return words.every((word) => text.includes(word))
      })
      .map(toManga)
    return { mangas, hasNextPage: false }
  },

  async getMangaDetails(manga) {
    return toManga(findSeries(manga))
  },

  async getChapterList(manga): Promise<Chapter[]> {
    const series = findSeries(manga)
    return series.books
      .map((book, index) => ({
        url: `/details/${book.id}`,
        name: book.name,
        dateUpload: Date.UTC(book.year, 0, 1),
        chapterNumber: index + 1,
        scanlator: "Internet Archive",
      }))
      .reverse()
  },

  async getPageList(chapter) {
    const id = chapter.url.split("/").pop()
    // The book's IIIF manifest has a canvas per page. Its images come from the IIIF server at
    // full size, which can take over a minute for a big newspaper scan, so pages load from the
    // Archive's book reader instead: `_w1600` scales a large scan down (never up) and is quick.
    const manifest = await fetchJSON<IIIFNode>(`https://iiif.archive.org/iiif/3/${id}/manifest.json`)
    let count = 0
    const countCanvases = (node: IIIFNode) => {
      for (const item of node.items ?? []) {
        if (item.type === "Canvas") count += 1
        else countCanvases(item)
      }
    }
    countCanvases(manifest)
    if (count === 0) throw new Error(`no pages in ${id}'s manifest`)
    return Array.from({ length: count }, (_, index) => ({ url: `${baseUrl}/download/${id}/page/n${index}_w1600.jpg` }))
  },
}

export default source
