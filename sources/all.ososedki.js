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

  // src/all/ososedki/index.ts
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
  async function fetchHTML(request) {
    const response = await send(request);
    return Honya.parseHTML(response.body, response.url);
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

  // src/all/ososedki/index.ts
  var baseUrl = "https://ososedki.com";
  var photoUrl = (albumId) => `${baseUrl}/photos/${albumId}`;
  var imgSrc = (img) => img ? img.hasAttr("data-src") ? img.absUrl("data-src") : img.hasAttr("src") ? img.absUrl("src") : void 0 : void 0;
  var albumIdOf = (url) => {
    const segments = url.replace(/^https?:\/\/[^/]+/, "").split(/[/?#]/).map((s) => s.trim());
    const id = segments[segments.indexOf("photos") + 1];
    return segments.includes("photos") && /^-?\d+_\d+$/.test(id ?? "") ? id : void 0;
  };
  var tags = (document, selector) => [...new Set(document.select(selector).map((a) => a.text().trim()).filter(Boolean))];
  async function albums(page, type, value) {
    const data = await fetchJSON(`${baseUrl}/api/albums?${queryString([["page", page], ...type && value ? [["type", type], ["value", value]] : []])}`);
    const document = Honya.parseHTML(`<body>${data.html}</body>`, baseUrl);
    const mangas = document.select("article.gallery-item:has(a.gallery-link)").flatMap((item) => {
      const albumId = albumIdOf(item.selectFirst("a.gallery-link")?.absUrl("href") ?? "");
      if (!albumId) return [];
      const title = item.selectFirst("h3")?.text().trim() || item.selectFirst("img.gallery-img")?.attr("alt").split(" nude.")[0].trim();
      if (!title) return [];
      return [{ url: albumId, title, thumbnailUrl: imgSrc(item.selectFirst("img.gallery-img")), author: item.selectFirst("span.badge:not(.bg-dark)")?.text().trim() || void 0, status: "completed" }];
    });
    return { mangas, hasNextPage: data.hasMore ?? false };
  }
  var source = {
    info: {
      id: "703138310497011533",
      name: "OSOSEDKI",
      lang: "all",
      version: "1.0.1",
      baseUrl,
      supportsLatest: true,
      nsfw: true,
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/ososedki/res/mipmap-xhdpi/ic_launcher.png"
    },
    getPopularManga(page) {
      return albums(page, "top", "1");
    },
    getLatestUpdates(page) {
      return albums(page);
    },
    searchManga(page, query) {
      return query.trim() ? albums(page, "search", query.trim()) : this.getPopularManga(page);
    },
    async getMangaDetails(manga) {
      const document = await fetchHTML(photoUrl(manga.url));
      const models = tags(document, "a[href^=/model/]");
      const cosplays = tags(document, "a[href^=/cosplay/]");
      const fandoms = tags(document, "a[href^=/fandom/]");
      const title = [models[0], cosplays[0], fandoms[0]].filter(Boolean).join(" - ") || document.selectFirst("h1")?.text().trim().replace(/\s*\(\d+\s+leaked\s+photos\)\s+from\s+Onlyfans,\s+Patreon\s+and\s+Fansly\s*$/i, "").trim();
      if (!title) throw new Error(`Title is missing for album id: ${manga.url}`);
      const ids = /^(-?\d+)_(\d+)$/.exec(manga.url);
      return {
        title,
        thumbnailUrl: ids ? `${baseUrl}/images/albums/${ids[1]}/${ids[2]}.webp` : imgSrc(document.selectFirst("img.gallery-img")) ?? document.selectFirst("meta[property=og:image]")?.attr("content"),
        author: models.join(", ") || void 0,
        artist: cosplays.join(", ") || void 0,
        genres: [.../* @__PURE__ */ new Set([...models, ...cosplays, ...fandoms])],
        status: "completed"
      };
    },
    async getChapterList(manga) {
      const document = await fetchHTML(photoUrl(manga.url));
      const jsonLd = document.select("script[type=application/ld+json]").map((s) => s.data()).find((d) => d.includes('"datePublished":"'));
      const published = jsonLd ? /"datePublished":"([^"]+)"/.exec(jsonLd)?.[1] : void 0;
      return [{ url: manga.url, name: "Gallery", chapterNumber: 0, dateUpload: published ? Date.parse(published) || void 0 : void 0 }];
    },
    async getPageList(chapter) {
      const document = await fetchHTML(photoUrl(chapter.url));
      const pageNumber = (url) => Number(url.split("/").pop()?.split(".")[0]) || Number.MAX_SAFE_INTEGER;
      const urls = [...new Set(document.select("#photos a[href^=/images/], #photos a[href^=https://ososedki.com/images/]").map((a) => a.absUrl("href")).filter(Boolean))];
      return urls.sort((a, b) => pageNumber(a) - pageNumber(b)).map((url) => ({ url }));
    }
  };
  var index_default = source;
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
