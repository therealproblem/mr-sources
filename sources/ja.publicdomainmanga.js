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

  // src/ja/publicdomainmanga/index.ts
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

  // src/ja/publicdomainmanga/index.ts
  var baseUrl = "https://dl.ndl.go.jp";
  var catalogue = [
    {
      pid: "960884",
      title: "欠伸をしに",
      author: "岡本一平",
      year: 1919,
      description: "日本の近代漫画を切り開いた岡本一平が、1919年（大正8年）に出した漫画と文章の本。",
      genres: ["漫画漫文", "随筆"],
      cover: { scan: "R0000080", region: "pct:8,6,38,90" }
    },
    {
      pid: "1186423",
      title: "愛の種々相",
      author: "岡本一平",
      year: 1930,
      description: "岡本一平が1930年（昭和5年）に出した漫画漫文集。巻頭にはカラーの口絵が付いています。",
      genres: ["漫画漫文"],
      cover: { scan: "R0000006", region: "pct:12,16,30,70" }
    }
  ];
  function bookUrl(book) {
    return `/pid/${book.pid}`;
  }
  function toManga(book) {
    return {
      url: bookUrl(book),
      title: book.title,
      thumbnailUrl: `${baseUrl}/api/iiif/${book.pid}/${book.cover.scan}/${book.cover.region}/600,/0/default.jpg`,
      author: book.author,
      artist: book.author,
      description: `${book.description}

著作権の保護期間が満了した資料です。国立国会図書館デジタルコレクションより。`,
      genres: book.genres,
      status: "completed"
    };
  }
  function findBook(manga) {
    const book = catalogue.find((book2) => bookUrl(book2) === manga.url);
    if (book == null) throw new Error(`${manga.title} isn't in this source any more`);
    return book;
  }
  var source = {
    info: {
      id: "9122203163319944007",
      // md5("public domain manga/ja/1"), as Mihon would make it
      name: "Public Domain Manga",
      lang: "ja",
      version: "1.0.0",
      baseUrl
    },
    async getPopularManga() {
      return { mangas: catalogue.map(toManga), hasNextPage: false };
    },
    async searchManga(_page, query) {
      const words2 = query.toLowerCase().split(/\s+/).filter((word) => word.length > 0);
      const mangas = catalogue.filter((book) => {
        const text = `${book.title} ${book.author} ${book.genres.join(" ")}`.toLowerCase();
        return words2.every((word) => text.includes(word));
      }).map(toManga);
      return { mangas, hasNextPage: false };
    },
    async getMangaDetails(manga) {
      return toManga(findBook(manga));
    },
    async getChapterList(manga) {
      const book = findBook(manga);
      return [{ url: bookUrl(book), name: book.title, dateUpload: Date.UTC(book.year, 0, 1), chapterNumber: 1, scanlator: "国立国会図書館" }];
    },
    async getPageList(chapter) {
      const pid = chapter.url.split("/").pop();
      const manifest = await fetchJSON(`${baseUrl}/api/iiif/${pid}/manifest.json`);
      const pages = manifest.sequences[0]?.canvases.map((canvas) => {
        const service = canvas.images[0].resource.service["@id"];
        return { url: `${service}/full/${Math.min(2032, canvas.width)},/0/default.jpg` };
      }) ?? [];
      if (pages.length === 0) throw new Error(`no pages in ${pid}'s manifest`);
      return pages;
    }
  };
  var index_default = source;
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
