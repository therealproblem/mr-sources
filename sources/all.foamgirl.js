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

  // src/all/foamgirl/index.ts
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

  // src/all/foamgirl/index.ts
  var baseUrl = "https://foamgirl.net";
  function parseList(document) {
    const mangas = document.select(".update_area .i_list").map((e) => ({
      thumbnailUrl: e.select("img")[0]?.attr("data-original") || void 0,
      title: e.select("a.meta-title").map((a) => a.text()).join(" "),
      url: relativeUrl(e.select("a")[0]?.attr("href") ?? "")
    }));
    return { mangas, hasNextPage: document.selectFirst("a.next") != null };
  }
  var source = {
    info: {
      id: "5874068195320206396",
      name: "FoamGirl",
      lang: "all",
      version: "1.0.1",
      baseUrl,
      supportsLatest: false,
      nsfw: true,
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/foamgirl/res/mipmap-xhdpi/ic_launcher.png",
      rateLimits: [{ host: "foamgirl.net", permits: 3, periodMs: 1e3 }]
    },
    async getPopularManga(page) {
      return parseList(await fetchHTML(`${baseUrl}/page/${page}`));
    },
    async searchManga(page, query) {
      return parseList(await fetchHTML(`${baseUrl}/page/${page}?${queryString([["post_type", "post"], ["s", query]])}`));
    },
    async getMangaDetails() {
      return {};
    },
    async getChapterList(manga) {
      const document = await fetchHTML(baseUrl + manga.url);
      const date = /(\d{4})\.(\d{1,2})\.(\d{1,2})/.exec(document.select("span.image-info-time").map((s) => s.text()).join(" "));
      return [{
        url: relativeUrl(document.select("link[rel=canonical]")[0]?.absUrl("href") ?? manga.url),
        chapterNumber: 0,
        name: "GALLERY",
        dateUpload: date ? Date.UTC(Number(date[1]), Number(date[2]) - 1, Number(date[3])) : void 0
      }];
    },
    async getPageList(chapter) {
      const pages = [];
      let document = await fetchHTML(baseUrl + chapter.url);
      for (; ; ) {
        document.select(".imageclick-imgbox").forEach((e) => pages.push({ url: e.absUrl("href") }));
        const next = document.selectFirst(".page-numbers[title=Next page]")?.absUrl("href");
        if (!next || !/\d+_\d+/.test(next)) break;
        document = await fetchHTML(next);
      }
      return pages;
    }
  };
  var index_default = source;
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
