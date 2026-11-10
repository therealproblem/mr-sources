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

  // src/fr/scanhentaimenu/index.ts
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
  function queryString(params) {
    return params.map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`).join("&");
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
  function words(...list2) {
    return new RegExp(`(?<!\\p{L})(?:${list2.map(escape).join("|")})`, "u");
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

  // src/fr/scanhentaimenu/index.ts
  var baseUrl = "https://x-manga.org";
  var imageHost = "https://reader.hentai.gifts";
  var statuses = { ONGOING: "ongoing", COMPLETED: "completed", HIATUS: "onHiatus" };
  var onImageHost = (path) => /^https?:\/\//.test(path) ? path : `${imageHost}${path.startsWith("/") ? "" : "/"}${path}`;
  var coverUrl = (path) => !path ? void 0 : path.startsWith("/covers/") ? baseUrl + path : onImageHost(path);
  var names = (list2) => (list2 ?? []).map((n) => n.name.trim()).filter(Boolean);
  async function list(params) {
    const data = await fetchJSON(`${baseUrl}/api/mangas?${queryString(params)}`);
    return {
      mangas: data.mangas.map((m) => ({ url: m.slug, title: m.title.trim(), thumbnailUrl: coverUrl(m.coverPath) })),
      hasNextPage: data.pagination ? data.pagination.current < data.pagination.totalPages : false
    };
  }
  async function detail(slug) {
    const { manga } = await fetchJSON(`${baseUrl}/api/mangas/${slug}`);
    if (!manga) throw new Error(`Manga introuvable (${slug})`);
    return manga;
  }
  var select = (id, name, choices) => ({ type: "select", id, name, options: choices.map(([label, value]) => ({ label, value })), selected: 0 });
  var source = {
    info: {
      id: "8214773311087111646",
      name: "X-Manga",
      lang: "fr",
      version: "1.2.0",
      baseUrl,
      supportsLatest: true,
      nsfw: true,
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/fr/scanhentaimenu/res/mipmap-xhdpi/ic_launcher.png"
    },
    getPopularManga(page) {
      return list([["page", String(page)], ["sort", "views"]]);
    },
    getLatestUpdates(page) {
      return list([["page", String(page)], ["sort", "latest"]]);
    },
    searchManga(page, query, filters) {
      const params = [["page", String(page)]];
      if (query.trim()) params.push(["search", query.trim()]);
      for (const filter of filters) {
        const value = filter.type === "select" ? filter.options[filter.selected]?.value : filter.type === "text" ? filter.value.trim() : "";
        if (value) params.push([filter.id === "genreText" ? "genre" : filter.id, value]);
      }
      if (!params.some(([key]) => key === "sort") && !query.trim()) params.push(["sort", "latest"]);
      return list(params);
    },
    async getMangaDetails(manga) {
      const m = await detail(manga.url);
      return {
        title: m.title.trim(),
        author: names(m.authors).join(", ") || void 0,
        artist: names(m.artists).join(", ") || void 0,
        description: m.description?.trim() || void 0,
        genres: [.../* @__PURE__ */ new Set([...names(m.genres), ...names(m.tags)])],
        status: statuses[m.status?.toUpperCase() ?? ""] ?? "unknown",
        thumbnailUrl: coverUrl(m.coverPath)
      };
    },
    async getChapterList(manga) {
      return ((await detail(manga.url)).chapters ?? []).map((c) => {
        const number = c.chapterNumber != null ? String(c.chapterNumber) : void 0;
        const fallback = number ? `Chapitre ${number}` : "Chapitre";
        const title = c.title?.trim();
        const name = !title ? fallback : number && !title.includes(number) && !/^chapitre/i.test(title) ? `${fallback}: ${title}` : title;
        return { url: c.id, name, chapterNumber: c.chapterNumber ?? void 0, dateUpload: c.publishedAt ? Date.parse(c.publishedAt) || void 0 : void 0 };
      });
    },
    async getPageList(chapter) {
      const data = await fetchJSON(`${baseUrl}/api/mangas/read/${chapter.url}`);
      if (!data.chapter) throw new Error(`Chapitre introuvable (${chapter.url})`);
      return data.chapter.pages.map((p) => ({ url: onImageHost(p.filePath) }));
    },
    getMangaUrl(manga) {
      return `${baseUrl}/manga/${manga.url}`;
    },
    getFilterList() {
      return [
        { ...select("sort", "Trier par", [["Dernières sorties", "latest"], ["Date d'ajout", "date"], ["Plus vues", "views"], ["Mieux notées", "rating"], ["Titre (A-Z)", "title"]]), listings: { popular: "views", latest: "latest" } },
        select("format", "Format", [["Tous", ""], ["Manga", "MANGA"], ["Manhwa", "MANHWA"], ["Doujinshi", "DOUJINSHI"], ["One Shot", "ONE_SHOT"], ["Pornwha", "PORNHWA"]]),
        select("status", "Statut", [["Tous", ""], ["En cours", "ONGOING"], ["Terminé", "COMPLETED"], ["En pause", "HIATUS"]]),
        select("genre", "Genre", [["Tous", ""], ...["Action", "Adultère", "Adventure", "Comedy", "Drama", "Ecchi", "Fantasy", "Harem", "Isekai", "Mature", "Milf", "Romance", "Slice of Life", "Yuri"].map((g) => [g, g])]),
        { type: "text", id: "genreText", name: "Genre personnalisé (ex. Romance)", value: "" },
        { type: "text", id: "tag", name: "Tag (ex. Au bureau, Hardcore, NTR)", value: "" }
      ];
    }
  };
  var index_default = source;
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
