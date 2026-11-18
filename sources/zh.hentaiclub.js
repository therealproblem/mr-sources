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

  // src/zh/hentaiclub/index.ts
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

  // src/zh/hentaiclub/index.ts
  var baseUrl = "https://www.hentaiclub.net";
  async function parseList(url) {
    const document = await fetchHTML(url);
    const mangas = document.select("div.item").map((e) => {
      const img = e.selectFirst("img.item-img");
      return {
        url: relativeUrl(e.selectFirst("a.item-link").absUrl("href")),
        title: e.selectFirst(".item-link-text").text(),
        thumbnailUrl: img ? img.absUrl("data-original") || img.absUrl("src") : void 0
      };
    });
    return { mangas, hasNextPage: mangas.length >= 24 };
  }
  var source = {
    info: {
      id: "8618065660246087865",
      name: "绅士会所",
      lang: "zh",
      version: "1.0.1",
      baseUrl,
      supportsLatest: false,
      nsfw: true,
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/zh/hentaiclub/res/mipmap-xhdpi/ic_launcher.png",
      rateLimits: [{ host: "www.hentaiclub.net", permits: 2, periodMs: 1e3 }]
    },
    getPopularManga(page) {
      return parseList(page === 1 ? `${baseUrl}/` : `${baseUrl}/page/${page}/`);
    },
    async searchManga(page, query, filters) {
      if (query.trim()) {
        const search = `${baseUrl}/search/${encodeURIComponent(query.trim())}`;
        return parseList(page > 1 ? `${search}/${page}/` : `${search}/`);
      }
      const tag = filters.find((f) => f.id === "tag");
      if (tag?.type === "text" && tag.value.trim()) {
        const base = `${baseUrl}/tag/${encodeURIComponent(tag.value.trim())}/`;
        return parseList(page > 1 ? `${base}${page}/` : base);
      }
      const sort = filters.find((f) => f.id === "sort");
      if (sort?.type === "select" && sort.selected > 0) return parseList(`${baseUrl}/sort/${sort.options[sort.selected].value}.html`);
      return this.getPopularManga(page);
    },
    async getMangaDetails(manga) {
      const { document, url } = await fetchPage(baseUrl + manga.url);
      const content = document.selectFirst(".content");
      const tags = content?.select("a[href*=/tag/]") ?? [];
      const views = /浏览[：:]\s*(\d+)次/.exec(content?.text() ?? "")?.[1];
      return {
        title: (document.selectFirst("title")?.text() ?? "").split(" - 绅士会所")[0],
        thumbnailUrl: content?.selectFirst("div.post-item[data-src]")?.absUrl("data-src") || void 0,
        author: tags[0]?.text(),
        genres: tags.map((a) => a.text()),
        description: views ? `浏览量：${views}次` : void 0,
        status: url.includes("/r18/") ? "completed" : "ongoing"
      };
    },
    async getChapterList(manga) {
      return [{ url: manga.url, name: "章节 1" }];
    },
    async getPageList(chapter) {
      return (await fetchHTML(baseUrl + chapter.url)).select("div.post-item[data-src]").map((e) => ({ url: e.absUrl("data-src") }));
    },
    getFilterList() {
      return [
        { type: "select", id: "sort", name: "分类", options: [{ label: "全部", value: "" }, { label: "R-15", value: "r15" }, { label: "R-18", value: "r18" }], selected: 0 },
        { type: "text", id: "tag", name: "标签 (输入标签名)", value: "" }
      ];
    }
  };
  var index_default = source;
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
