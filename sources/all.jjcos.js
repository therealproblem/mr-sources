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

  // src/all/jjcos/index.ts
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
  async function fetchPage(request) {
    const response = await send(request);
    return { document: Honya.parseHTML(response.body, response.url), url: response.url };
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

  // src/all/jjcos/index.ts
  var baseUrl = "https://jjcos.com";
  var pageSize = 20;
  function encodedPath(link) {
    const clean = link.trim().split("?")[0].split("#")[0];
    const absolute = /^https?:\/\//.test(clean) ? clean : `${baseUrl}${clean.startsWith("/") ? "" : "/"}${clean}`;
    const path = /^https?:\/\/[^/]+(\/[^?#]*)?/.exec(absolute)?.[1] || "/";
    return encodeURI(decodeURI(path.replace(/ /g, "%20")));
  }
  function toPage(posts, page) {
    const start = (Math.max(1, page) - 1) * pageSize;
    if (start >= posts.length) return { mangas: [], hasNextPage: false };
    const end = Math.min(posts.length, start + pageSize);
    const mangas = posts.slice(start, end).map((post) => {
      if (!post.title.trim()) throw new Error(`Missing title in ${post.link}`);
      return { title: post.title.trim(), thumbnailUrl: post.feature, status: "completed", url: encodedPath(post.link) };
    });
    return { mangas, hasNextPage: end < posts.length };
  }
  var index = (page, query) => fetchJSON(`${baseUrl}/api/index.html?${queryString([["page", page], ...query?.trim() ? [["query", query]] : []])}`);
  var source = {
    info: {
      id: "5763134940669279175",
      name: "JJCOS",
      lang: "all",
      version: "1.0.1",
      baseUrl,
      supportsLatest: false,
      nsfw: true,
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/jjcos/res/mipmap-xhdpi/ic_launcher.png"
    },
    async getPopularManga(page) {
      return toPage((await index(page)).posts, page);
    },
    async searchManga(page, query) {
      const { posts } = await index(page, query);
      const needle = query.trim().toLowerCase();
      return toPage(needle ? posts.filter((p) => p.title.toLowerCase().includes(needle) || p.content?.toLowerCase().includes(needle)) : posts, page);
    },
    async getMangaDetails(manga) {
      const { document } = await fetchPage(baseUrl + manga.url);
      const title = document.selectFirst("h1.fh5co-article-title")?.text().replace(/ - JJCOS$/, "").trim();
      if (!title) throw new Error("Title is mandatory");
      return {
        title,
        thumbnailUrl: document.selectFirst("#post-content img, article img")?.absUrl("src") || void 0,
        genres: [...new Set(document.select(".tag-container a.tag").map((a) => a.text().replace(/^#/, "").trim()).filter(Boolean))],
        status: "completed"
      };
    },
    async getChapterList(manga) {
      const { document, url } = await fetchPage(baseUrl + manga.url);
      const raw = document.selectFirst("meta[property=article:published_time]")?.attr("content") ?? document.selectFirst(".breadcrumb-item.date-overlay")?.text();
      const date = /(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2}))?/.exec(raw ?? "");
      return [{
        url: encodedPath(url),
        name: "Gallery",
        dateUpload: date ? new Date(Number(date[1]), Number(date[2]) - 1, Number(date[3]), Number(date[4] ?? 0), Number(date[5] ?? 0), Number(date[6] ?? 0)).getTime() : void 0
      }];
    },
    async getPageList(chapter) {
      const { document } = await fetchPage(baseUrl + chapter.url);
      const urls = document.select("#post-content img, article #post-content img, article p img").map((img) => (img.absUrl("src") || img.absUrl("data-src")).trim()).filter(Boolean);
      return [...new Set(urls)].map((url) => ({ url }));
    }
  };
  var index_default = source;
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
