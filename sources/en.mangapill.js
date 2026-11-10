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

  // src/en/mangapill/index.ts
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

  // src/en/mangapill/index.ts
  var baseUrl = "https://mangapill.com";
  var genres = ["Action", "Adventure", "Cars", "Comedy", "Dementia", "Demons", "Drama", "Ecchi", "Fantasy", "Game", "Harem", "Hentai", "Historical", "Horror", "Josei", "Kids", "Magic", "Martial Arts", "Mecha", "Military", "Music", "Mystery", "Parody", "Police", "Psychological", "Romance", "Samurai", "School", "Sci-Fi", "Seinen", "Shoujo", "Shoujo Ai", "Shounen", "Shounen Ai", "Slice of Life", "Space", "Sports", "Super Power", "Supernatural", "Thriller", "Vampire", "Yaoi", "Yuri"];
  function toManga(element) {
    const link = element.selectFirst("a[href^='/manga/']");
    const title = element.selectFirst("div.line-clamp-2")?.text();
    return link && title ? [{ url: relativeUrl(link.absUrl("href")), title, thumbnailUrl: element.selectFirst("img")?.attr("data-src") || void 0 }] : [];
  }
  var source = {
    info: {
      id: "8448310129093543312",
      name: "MangaPill",
      lang: "en",
      version: "1.0.0",
      baseUrl,
      supportsLatest: true,
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/mangapill/res/mipmap-xhdpi/ic_launcher.png"
    },
    // The homepage's "Trending Mangas" section.
    async getPopularManga() {
      const document = await fetchHTML(`${baseUrl}/`);
      return { mangas: document.select("div:has(h4:contains(Trending)) > .grid > div:not([class])").flatMap(toManga), hasNextPage: false };
    },
    async getLatestUpdates() {
      const document = await fetchHTML(`${baseUrl}/chapters`);
      return { mangas: document.select(".grid > div:not([class])").flatMap(toManga), hasNextPage: false };
    },
    async searchManga(page, query, filters) {
      const params = [["page", page], ["q", query]];
      for (const filter of filters) {
        if (filter.type === "checkboxes") for (const genre of filter.checked) params.push(["genre", genre]);
        if (filter.type === "select") params.push([filter.id, filter.options[filter.selected]?.value ?? ""]);
      }
      const document = await fetchHTML(`${baseUrl}/search?${queryString(params)}`);
      return { mangas: document.select(".grid > div:not([class])").flatMap(toManga), hasNextPage: document.selectFirst("a.btn.btn-sm") != null };
    },
    async getMangaDetails(manga) {
      const document = await fetchHTML(baseUrl + manga.url);
      const status = document.select("div.container > div:first-child > div:last-child > div:nth-child(3) > div:nth-child(2) > div").map((e) => e.text()).join(" ").toLowerCase();
      return {
        genres: document.select("a[href*=genre]").map((a) => a.text()),
        status: status.includes("publishing") ? "ongoing" : status.includes("finished") ? "completed" : "unknown",
        description: document.select("div.container > div:first-child > div:last-child > div:nth-child(2) > p").map((p) => p.text()).join(" ") || void 0,
        thumbnailUrl: document.selectFirst("div.container > div:first-child > div:first-child > img")?.attr("data-src") || void 0
      };
    },
    async getChapterList(manga) {
      const document = await fetchHTML(baseUrl + manga.url);
      return document.select("#chapters > div > a").map((a) => ({ url: relativeUrl(a.absUrl("href")), name: a.text() }));
    },
    async getPageList(chapter) {
      const document = await fetchHTML(baseUrl + chapter.url);
      return document.select("picture img").map((img) => ({ url: img.attr("data-src") }));
    },
    getFilterList() {
      const options = (pairs) => pairs.map(([label, value]) => ({ label, value }));
      return [
        { type: "header", id: "note", name: "NOTE: Ignored if using text search!" },
        { type: "separator", id: "sep" },
        { type: "select", id: "status", name: "Status", options: options([["All", ""], ["Publishing", "publishing"], ["Finished", "finished"], ["On Hiatus", "on hiatus"], ["Discontinued", "discontinued"], ["Not yet Published", "not yet published"]]), selected: 0 },
        { type: "select", id: "type", name: "Type", options: options([["All", ""], ["Manga", "manga"], ["Novel", "novel"], ["One-Shot", "one-shot"], ["Doujinshi", "doujinshi"], ["Manhwa", "manhwa"], ["Manhua", "manhua"], ["Oel", "oel"]]), selected: 0 },
        // Mihon's genre filter is tri-state but only sends included genres.
        { type: "checkboxes", id: "genre", name: "Genres", options: genres.map((g) => ({ label: g, value: g })), checked: [] }
      ];
    }
  };
  var index_default = source;
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
