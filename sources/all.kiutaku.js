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

  // src/all/kiutaku/index.ts
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

  // src/all/kiutaku/index.ts
  var baseUrl = "https://kiutaku.com";
  var offset = (page) => (page - 1) * 20;
  function parseList(document) {
    const mangas = document.select("div.blog > div.items-row").map((e) => ({
      url: relativeUrl(e.selectFirst("a.item-link").absUrl("href")),
      thumbnailUrl: e.selectFirst("img")?.absUrl("src") || void 0,
      title: e.selectFirst("h2")?.text() ?? "Cosplay"
    }));
    return { mangas, hasNextPage: document.selectFirst("nav > a.pagination-next:not([disabled])") != null };
  }
  var source = {
    info: {
      id: "3040035304874076216",
      name: "Kiutaku",
      lang: "all",
      version: "1.0.1",
      baseUrl,
      supportsLatest: true,
      nsfw: true,
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/kiutaku/res/mipmap-xhdpi/ic_launcher.png",
      // The image host (mitaku.net) refuses a kiutaku.com Referer.
      imageHeaders: { Referer: "" }
    },
    async getPopularManga(page) {
      return parseList(await fetchHTML(`${baseUrl}/hot?start=${offset(page)}`));
    },
    async getLatestUpdates(page) {
      return parseList(await fetchHTML(`${baseUrl}/?start=${offset(page)}`));
    },
    async searchManga(page, query) {
      return parseList(await fetchHTML(`${baseUrl}/?${queryString([["search", query], ["start", offset(page)]])}`));
    },
    async getMangaDetails(manga) {
      const document = await fetchHTML(baseUrl + manga.url);
      return {
        title: document.selectFirst("div.article-header")?.text(),
        genres: document.selectFirst("div.article-tags")?.select("a.tag > span").map((s) => s.text().replace(/^#+/, "")),
        status: "completed"
      };
    },
    async getChapterList(manga) {
      const document = await fetchHTML(baseUrl + manga.url);
      return document.select("nav.pagination:first-of-type a").map((a) => ({
        url: relativeUrl(a.absUrl("href")),
        name: `Page ${a.text()}`,
        chapterNumber: Number(a.text()) || 1
      })).reverse();
    },
    async getPageList(chapter) {
      return (await fetchHTML(baseUrl + chapter.url)).select("div.article-fulltext img[src]").map((img) => ({ url: img.absUrl("src") }));
    }
  };
  var index_default = source;
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
