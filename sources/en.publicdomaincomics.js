"use strict";
var __extension = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/en/publicdomaincomics/index.ts
  var index_exports = {};
  __export(index_exports, {
    default: () => index_default
  });

  // sdk/helpers.ts
  async function send(request) {
    const response = await Honya.request(request);
    if (response.status < 200 || response.status > 299) {
      throw new Error(`HTTP ${response.status} for ${response.url}`);
    }
    return response;
  }
  async function fetchText(request) {
    return (await send(request)).body;
  }
  async function fetchJSON(request) {
    return JSON.parse(await fetchText(request));
  }

  // sdk/dates.ts
  var relativeWords = [
    [words("year", "año", "ano", "năm", "yıl", "سنة", "سنوات"), 31536e6],
    [words("month", "mes", "tháng", "ay", "شهر", "أشهر", "شهور"), 2592e6],
    [words("week", "semana", "tuần", "hafta", "أسبوع", "أسابيع"), 6048e5],
    [words("day", "día", "dia", "jour", "hari", "gün", "ngày", "giorni", "أيام", "天"), 864e5],
    [words("hour", "hora", "heure", "jam", "saat", "giờ", "ore", "ساعة", "ساعات", "小时"), 36e5],
    [words("minute", "minuto", "min", "menit", "dakika", "phút", "دقيقة", "دقائق"), 6e4],
    [words("second", "segundo", "sec", "detik", "giây", "ثانية", "ثوان"), 1e3]
  ];
  function words(...list) {
    return new RegExp(`(?<!\\p{L})(?:${list.map(escape).join("|")})`, "u");
  }
  function escape(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // sdk/crypto.ts
  var md5Constants = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);
  var sbox = new Uint8Array(256);
  var inverseSbox = new Uint8Array(256);
  {
    let p = 1, q = 1;
    const rotate = (x, n) => (x << n | x >> 8 - n) & 255;
    do {
      p = p ^ p << 1 & 255 ^ (p & 128 ? 27 : 0);
      q ^= q << 1;
      q ^= q << 2;
      q ^= q << 4;
      q &= 255;
      if (q & 128) q ^= 9;
      sbox[p] = q ^ rotate(q, 1) ^ rotate(q, 2) ^ rotate(q, 3) ^ rotate(q, 4) ^ 99;
    } while (p !== 1);
    sbox[0] = 99;
    for (let i = 0; i < 256; i++) inverseSbox[sbox[i]] = i;
  }

  // src/en/publicdomaincomics/index.ts
  var baseUrl = "https://archive.org";
  var catalogue = [
    {
      title: "Little Nemo in Slumberland",
      author: "Winsor McCay",
      description: "Every Sunday a small boy dreams his way into Slumberland, and every Sunday he wakes up falling out of bed. Winsor McCay's newspaper pages, from 1905 to 1914.",
      genres: ["Fantasy", "Newspaper Strip"],
      books: [{ id: "LittleNemo1905-1914ByWinsorMccay", name: "1905–1914", year: 1914 }],
      cover: { book: "LittleNemo1905-1914ByWinsorMccay", page: 2 }
    },
    {
      title: "Buster Brown",
      author: "R. F. Outcault",
      description: "A well-dressed boy and his dog Tige get into trouble, and Buster writes down what he's learned at the end of each page. Collected from R. F. Outcault's Sunday strip.",
      genres: ["Comedy", "Newspaper Strip"],
      books: [
        { id: "BusterBrownhisd00Outc", name: "Buster Brown, His Dog Tige and Their Troubles", year: 1904 },
        { id: "myresolutionsbus00outc", name: "My Resolutions", year: 1910 }
      ],
      cover: { book: "myresolutionsbus00outc", page: 0 }
    },
    {
      title: "Foxy Grandpa",
      author: "Carl E. Schultze",
      description: "Two boys plan pranks on their grandfather, who is always a step ahead of them. Carl E. Schultze's strip, collected in books.",
      genres: ["Comedy", "Newspaper Strip"],
      books: [
        { id: "foxy-grandpa-flip-flaps", name: "Flip Flaps", year: 1905 },
        { id: "foxy-grandpa-shows-the-boys-up-to-date-sports", name: "Shows the Boys Up-to-Date Sports", year: 1908 }
      ],
      cover: { book: "foxy-grandpa-shows-the-boys-up-to-date-sports", page: 2 }
    },
    {
      title: "Bringing Up Father",
      author: "George McManus",
      description: "Jiggs came into money but would still rather be at the corner bar with his old friends, much to the disgust of his wife Maggie.",
      genres: ["Comedy", "Newspaper Strip"],
      books: [{ id: "BringingUpFatherSeries1", name: "Series 1", year: 1919 }],
      cover: { book: "BringingUpFatherSeries1", page: 0 }
    },
    {
      title: "Max and Maurice",
      author: "Wilhelm Busch",
      description: "Two boys play seven tricks on their village, each worse than the last, until the last one catches up with them. Wilhelm Busch's picture story of 1865, an ancestor of the comic strip, in an English edition of 1898.",
      genres: ["Comedy", "Picture Story"],
      books: [{ id: "maxmauricejuveni00busc", name: "A Juvenile History in Seven Tricks", year: 1898 }],
      cover: { book: "maxmauricejuveni00busc", page: 0 }
    },
    {
      title: "Comic Cuts",
      author: "Alfred Harmsworth",
      description: "A British weekly of jokes and comic pictures, sold for a halfpenny from 1890.",
      genres: ["Comedy", "Magazine"],
      books: [{ id: "ComicCuts01-1890", name: "No. 1", year: 1890 }],
      cover: { book: "ComicCuts01-1890", page: 0 }
    }
  ];
  function seriesUrl(series) {
    return `/details/${series.books[0].id}`;
  }
  function toManga(series) {
    return {
      url: seriesUrl(series),
      title: series.title,
      thumbnailUrl: `${baseUrl}/download/${series.cover.book}/page/n${series.cover.page}_w600.jpg`,
      author: series.author,
      artist: series.author,
      description: `${series.description}

In the public domain. Scans from the Internet Archive.`,
      genres: series.genres,
      status: "completed"
    };
  }
  function findSeries(manga) {
    const series = catalogue.find((series2) => seriesUrl(series2) === manga.url);
    if (series == null) throw new Error(`${manga.title} isn't in this source any more`);
    return series;
  }
  var source = {
    info: {
      id: "6998882641562544524",
      // md5("public domain comics/en/1"), as Mihon would make it
      name: "Public Domain Comics",
      lang: "en",
      version: "1.2.0",
      baseUrl
    },
    async getPopularManga() {
      return { mangas: catalogue.map(toManga), hasNextPage: false };
    },
    async searchManga(_page, query) {
      const words2 = query.toLowerCase().split(/\s+/).filter((word) => word.length > 0);
      const mangas = catalogue.filter((series) => {
        const text = `${series.title} ${series.author} ${series.genres.join(" ")}`.toLowerCase();
        return words2.every((word) => text.includes(word));
      }).map(toManga);
      return { mangas, hasNextPage: false };
    },
    async getMangaDetails(manga) {
      return toManga(findSeries(manga));
    },
    async getChapterList(manga) {
      const series = findSeries(manga);
      return series.books.map((book, index) => ({
        url: `/details/${book.id}`,
        name: book.name,
        dateUpload: Date.UTC(book.year, 0, 1),
        chapterNumber: index + 1,
        scanlator: "Internet Archive"
      })).reverse();
    },
    async getPageList(chapter) {
      const id = chapter.url.split("/").pop();
      const manifest = await fetchJSON(`https://iiif.archive.org/iiif/3/${id}/manifest.json`);
      let count = 0;
      const countCanvases = (node) => {
        for (const item of node.items ?? []) {
          if (item.type === "Canvas") count += 1;
          else countCanvases(item);
        }
      };
      countCanvases(manifest);
      if (count === 0) throw new Error(`no pages in ${id}'s manifest`);
      return Array.from({ length: count }, (_, index) => ({ url: `${baseUrl}/download/${id}/page/n${index}_w1600.jpg` }));
    }
  };
  var index_default = source;
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
