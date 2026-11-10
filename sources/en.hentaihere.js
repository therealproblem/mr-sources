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

  // src/en/hentaihere/index.ts
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
  async function fetchHTML(request) {
    const response = await send(request);
    return Honya.parseHTML(response.body, response.url);
  }
  function relativeUrl(url) {
    const match = /^[a-z][a-z\d+.-]*:\/\/[^/?#]*(.*)$/i.exec(url);
    const path = match ? match[1] || "/" : url;
    try {
      return decodeURI(path);
    } catch {
      return path;
    }
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

  // src/en/hentaihere/index.ts
  var baseUrl = "https://hentaihere.com";
  var source = {
    info: {
      id: "7266624490370375187",
      name: "HentaiHere",
      lang: "en",
      version: "1.0.2",
      baseUrl,
      supportsLatest: true,
      nsfw: true,
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/hentaihere/res/mipmap-xhdpi/ic_launcher.png"
    },
    getPopularManga(page) {
      return this.searchManga(page, "", filterList());
    },
    async getLatestUpdates(page) {
      return parseMangaList(await fetchHTML(`${baseUrl}/browse/newest/page-${page}`));
    },
    async searchManga(page, query, filters) {
      if (query) {
        return parseMangaList(await fetchHTML(`${baseUrl}/search?${queryString([["q", query], ["page", page]])}`));
      }
      const choice = (id, options) => {
        const filter = filters.find((f) => f.id === id);
        return filter?.type === "select" ? options[filter.selected]?.[0] ?? "" : "";
      };
      const sort = choice("sort", sorts) || "most-viewed";
      const alphabet = choice("alphabet", alphabets);
      const status = choice("status", statuses);
      const category = choice("category", categories);
      let path = category ? `/category/${category.replace(/^t/, "")}` : "/browse";
      if (status) path += `/${status}`;
      if (alphabet) path += `/${alphabet}`;
      path += `/${sort}`;
      if (page > 1) path += `/page-${page}`;
      return parseMangaList(await fetchHTML(baseUrl + path));
    },
    async getMangaDetails(manga) {
      return parseDetails(await fetchHTML(mangaUrl(manga)));
    },
    async getChapterList(manga) {
      const document = await fetchHTML(mangaUrl(manga));
      return document.select("#preview-chapter option").map((option) => {
        const name = option.text().replace(/\(latest\)$/, "").trim();
        const number = /Chapter\s+([\d.]+)/.exec(name)?.[1];
        return { url: relativeUrl(option.absUrl("data-read")), name, chapterNumber: number ? Number(number) : -1 };
      });
    },
    async getPageList(chapter) {
      const document = await fetchHTML(baseUrl + chapter.url);
      const data = document.selectFirst("script[data-reader-data]")?.data();
      const images = data ? JSON.parse(data).images : [];
      return images.map((url) => ({ url }));
    },
    getFilterList() {
      return filterList();
    }
  };
  var index_default = source;
  function parseMangaList(document) {
    const mangas = document.select("article.card[data-card]").map((element) => ({
      url: relativeUrl(element.selectFirst("a").absUrl("href")),
      title: element.selectFirst("h3").text(),
      thumbnailUrl: element.selectFirst("img")?.absUrl("src") || void 0
    }));
    return { mangas, hasNextPage: document.selectFirst("a[rel=next]") != null };
  }
  function parseDetails(document) {
    const details = document.select("dl[aria-label=Details]")[0];
    const detail = (label) => details?.selectFirst(`dt:contains(${label})`)?.nextElementSibling()?.text() || void 0;
    const status = detail("Status")?.toLowerCase();
    return {
      title: document.selectFirst("h1#book-title")?.text(),
      author: detail("Artist") ?? detail("Author"),
      genres: document.select("ul[aria-label=Tags] a").map((a) => a.text()),
      status: status === "completed" ? "completed" : status === "ongoing" ? "ongoing" : "unknown",
      thumbnailUrl: document.selectFirst("meta[property=og:image]")?.attr("content") || void 0
    };
  }
  function mangaUrl(manga) {
    return baseUrl + manga.url.replace(/^\/m\/(\d+)$/, "/doujinshi/$1");
  }
  var sorts = [
    ["newest", "Newest"],
    ["most-viewed", "Most Read"],
    ["top-rated", "Highest Rated"],
    ["yesterday", "Top Yesterday"],
    ["last-week", "Top Last Week"],
    ["last-month", "Top Last Month"],
    ["alphabetical", "A to Z"]
  ];
  var alphabets = [["", "All"], ["0-9", "#"], ..."abcdefghijklmnopqrstuvwxyz".split("").map((c) => [c, c.toUpperCase()])];
  var statuses = [["", "All"], ["ongoing", "Ongoing"], ["completed", "Completed"]];
  var categories = [
    ["", "All"],
    ["t34", "Adult"],
    ["t7", "Anal"],
    ["t372", "Beastiality"],
    ["t20", "Big Breasts"],
    ["t43", "Comedy"],
    ["t46", "Compilation"],
    ["t42", "Doujinshi"],
    ["t40", "Ecchi"],
    ["t6", "Fantasy"],
    ["t14", "Futanari"],
    ["t302", "Guro"],
    ["t31", "Harem"],
    ["t15", "Incest"],
    ["t2650", "Isekai (Otherworld)"],
    ["t2158", "Korean Comic"],
    ["t50", "Licensed"],
    ["t17", "Lolicon"],
    ["t30", "Mecha"],
    ["t2503", "No Penetration"],
    ["t33", "Oneshot"],
    ["t23", "Rape"],
    ["t567", "Reverse Harem"],
    ["t41", "Romance"],
    ["t432", "Scat"],
    ["t48", "School Life"],
    ["t5", "Sci-fi"],
    ["t32", "Serialized"],
    ["t44", "Shotacon"],
    ["t49", "Tragedy"],
    ["t47", "Uncensored"],
    ["t27", "Yaoi"],
    ["t28", "Yuri"]
  ];
  function filterList() {
    const select = (id, name, options, selected = 0) => ({ type: "select", id, name, options: options.map(([value, label]) => ({ value, label })), selected });
    return [
      { type: "header", id: "note", name: "Filters below are ignored for text search." },
      { ...select("sort", "Sort", sorts, 1), listings: { popular: "most-viewed", latest: "newest" } },
      { type: "separator", id: "s1" },
      select("alphabet", "Starts With", alphabets),
      { type: "separator", id: "s2" },
      select("status", "Status", statuses),
      { type: "separator", id: "s3" },
      select("category", "Category", categories)
    ];
  }
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
