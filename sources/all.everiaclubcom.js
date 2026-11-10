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

  // src/all/everiaclubcom/index.ts
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

  // src/all/everiaclubcom/index.ts
  var baseUrl = "https://www.everiaclub.com";
  var imgSrc = (img) => ["data-original", "data-lazy-src", "data-src", "src"].map((a) => img.hasAttr(a) ? img.attr(a) : "").find(Boolean);
  var decode = (text) => Honya.parseHTML(`<body>${text.replace(/</g, "&lt;")}</body>`).text();
  function mangaFrom(a) {
    const img = a.selectFirst("img");
    return { url: relativeUrl(a.absUrl("href")), thumbnailUrl: img ? imgSrc(img) : void 0, title: decode(img?.attr("title") ?? "") };
  }
  async function parseList(url) {
    const document = await fetchHTML(url);
    return { mangas: document.select(".mainleft .leftp > a").map(mangaFrom), hasNextPage: document.selectFirst("li:has(span.current) + li > a") != null };
  }
  var categories = [["Any", ""], ["Gravure", "Gravure.html"], ["Japan", "Japan.html"], ["Korea", "Korea.html"], ["Thailand", "Thailand.html"], ["Chinese", "Chinese.html"], ["Cosplay", "Cosplay.html"]];
  var source = {
    info: {
      id: "8698756602692547891",
      name: "EveriaClub (unoriginal)",
      lang: "all",
      version: "1.0.1",
      baseUrl,
      supportsLatest: true,
      nsfw: true,
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/everiaclubcom/res/mipmap-xhdpi/ic_launcher.png"
    },
    getLatestUpdates(page) {
      return parseList(`${baseUrl}/?page=${page}`);
    },
    async getPopularManga() {
      return { mangas: (await fetchHTML(baseUrl)).select(".mainright li a").map(mangaFrom), hasNextPage: false };
    },
    searchManga(page, query, filters) {
      const tag = filters.find((f) => f.id === "tag");
      const category = filters.find((f) => f.id === "category");
      if (tag?.type === "text" && tag.value.trim()) return parseList(`${baseUrl}/tags/${encodeURIComponent(tag.value)}/${page}`);
      if (category?.type === "select" && category.selected !== 0) return parseList(`${baseUrl}/${category.options[category.selected].value}?page=${page}`);
      if (query.trim()) return parseList(`${baseUrl}/search/?${queryString([["keyword", query], ["page", page]])}`);
      return parseList(`${baseUrl}/?page=${page}`);
    },
    async getMangaDetails(manga) {
      const document = await fetchHTML(baseUrl + manga.url);
      return { genres: document.select("div.end span:contains(Tags:) ~ a > p.tags").map((p) => p.ownText()), status: "completed" };
    },
    async getChapterList(manga) {
      return [{ url: manga.url, name: "Gallery", chapterNumber: 1 }];
    },
    async getPageList(chapter) {
      const document = await fetchHTML(baseUrl + chapter.url);
      return document.select(".mainleft img").flatMap((img) => {
        const src = imgSrc(img);
        return src ? [{ url: src }] : [];
      });
    },
    getFilterList() {
      return [
        { type: "header", id: "h1", name: "NOTE: Only one filter will be applied!" },
        { type: "separator", id: "s1" },
        { type: "text", id: "tag", name: "Tag", value: "" },
        { type: "select", id: "category", name: "Category", options: categories.map(([label, value]) => ({ label, value })), selected: 0 }
      ];
    }
  };
  var index_default = source;
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
