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

  // src/en/onlythebesthentai/index.ts
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

  // src/en/onlythebesthentai/index.ts
  var baseUrl = "https://onlythebesthentai.com";
  async function load(url) {
    const response = await send(url);
    const head = response.body.slice(0, 512);
    if (head.includes("One moment, please") || head.includes("wsidchk")) {
      throw new Error("Bot protection detected. Open this source in the web view to pass the check, then try again.");
    }
    return { document: Honya.parseHTML(response.body, response.url), url: response.url };
  }
  async function parseList(url) {
    const { document } = await load(url);
    const mangas = document.select("article.post").flatMap((e) => {
      const a = e.selectFirst(".blog-entry-title a, .entry-title a");
      if (!a) return [];
      return [{ url: relativeUrl(a.absUrl("href")), title: a.text().replace(/\s*\[\d+]\s*$/, "").trim(), thumbnailUrl: e.selectFirst(".nv-post-thumbnail-wrap img")?.absUrl("src") || void 0 }];
    });
    return { mangas, hasNextPage: document.selectFirst("a.next.page-numbers") != null };
  }
  var tagsLabeled = (document, label) => document.select(`.manga-tags-container:has(.manga-tags-label:containsOwn(${label})) .tag-button`).map((e) => e.text());
  function bestImage(img) {
    const best = img.attr("srcset").split(",").map((entry) => entry.trim().split(/\s+/)).filter((parts) => parts[0]).sort((a, b) => (Number(b[1]?.replace(/w$/, "")) || 0) - (Number(a[1]?.replace(/w$/, "")) || 0))[0];
    return best?.[0] || img.absUrl("src");
  }
  var source = {
    info: {
      id: "5862792365006156918",
      name: "Only The Best Hentai",
      lang: "en",
      version: "1.0.1",
      baseUrl,
      supportsLatest: false,
      nsfw: true,
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/onlythebesthentai/res/mipmap-xhdpi/ic_launcher.png"
    },
    getPopularManga(page) {
      return parseList(`${baseUrl}/${page > 1 ? `page/${page}/` : ""}`);
    },
    searchManga(page, query) {
      if (query.trim()) return parseList(`${baseUrl}/?${queryString([["s", query], ...page > 1 ? [["paged", String(page)]] : []])}`);
      return this.getPopularManga(page);
    },
    async getMangaDetails(manga) {
      const { document } = await load(baseUrl + manga.url);
      const lines = [];
      const parodies = tagsLabeled(document, "Parody");
      if (parodies.length) lines.push(`Parody: ${parodies.join(", ")}`);
      const characters = tagsLabeled(document, "Characters");
      if (characters.length) lines.push(`Characters: ${characters.join(", ")}`);
      const pages = document.select(".manga-tags-container:has(.manga-tags-label:containsOwn(Pages))")[0]?.text().replace(/\D/g, "");
      if (pages) lines.push(`Pages: ${pages}`);
      const body = document.selectFirst(".manga-info p")?.text().replace(/^Description:/, "").trim();
      return {
        title: document.selectFirst("h1.manga-title")?.text(),
        thumbnailUrl: document.selectFirst(".manga-box .manga-img img")?.absUrl("src") || void 0,
        genres: tagsLabeled(document, "Tags"),
        author: tagsLabeled(document, "Artist").join(", ") || void 0,
        description: (lines.join("\n") + (body ? `${lines.length ? "\n\n" : ""}${body}` : "")).trim(),
        status: "completed"
      };
    },
    async getChapterList(manga) {
      const { document, url } = await load(baseUrl + manga.url);
      const pageCount = document.select(".manga-tags-container").map((c) => {
        const label = c.selectFirst(".manga-tags-label")?.text();
        return label?.startsWith("Pages") ? Number(c.text().replace(/\D/g, "")) || void 0 : void 0;
      }).find((n) => n != null);
      const published = document.selectFirst("meta[property=article:published_time]")?.attr("content");
      return [{
        url: relativeUrl(url),
        name: pageCount != null ? `Chapter [${pageCount} pages]` : "Chapter",
        chapterNumber: 1,
        dateUpload: published ? Date.parse(published) || void 0 : void 0
      }];
    },
    async getPageList(chapter) {
      const { document } = await load(baseUrl + chapter.url);
      return document.select(".manga-gallery-wrapper figure.wp-block-image img").map((img) => ({ url: bestImage(img) }));
    }
  };
  var index_default = source;
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
