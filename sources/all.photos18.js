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

  // src/all/photos18/index.ts
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

  // src/all/photos18/index.ts
  var baseUrl = "https://www.photos18.com";
  var withLang = () => Honya.prefs.get("ZH_HANT") === true ? baseUrl : `${baseUrl}/zh-hans`;
  function parseList(document) {
    const items = document.selectFirst("#videos")?.children() ?? [];
    const mangas = items.flatMap((item) => {
      const body = item.selectFirst(".card-body");
      const link = body?.selectFirst("a");
      if (!body || !link) return [];
      const label = body.selectFirst("label")?.ownText();
      return [{
        url: link.attr("href").replace(/^\/zh-hans/, ""),
        title: link.ownText(),
        thumbnailUrl: baseUrl + (item.selectFirst("img")?.attr("src") ?? ""),
        genres: label ? [label] : [],
        status: "completed"
      }];
    });
    const next = document.selectFirst(".next");
    return { mangas, hasNextPage: next != null && !next.hasClass("disabled") };
  }
  var sorts = [["Latest", "created"], ["Popular", "hits"], ["Trend", "views"], ["Recommended", "score"], ["Best", "likes"]];
  var source = {
    info: {
      id: "225835804698740720",
      name: "Photos18",
      lang: "all",
      version: "1.0.2",
      baseUrl,
      supportsLatest: true,
      nsfw: true,
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/photos18/res/mipmap-xhdpi/ic_launcher.png"
    },
    async getPopularManga(page) {
      return parseList(await fetchHTML(`${withLang()}/sort/views?page=${page}`));
    },
    async getLatestUpdates(page) {
      return parseList(await fetchHTML(`${withLang()}/?page=${page}`));
    },
    async searchManga(page, query, filters) {
      const sort = filters.find((f) => f.id === "sort");
      const sortValue = sort?.type === "select" ? sort.options[sort.selected]?.value : "views";
      return parseList(await fetchHTML(`${withLang()}?${queryString([["q", query], ["page", page], ["sort", sortValue ?? "views"]])}`));
    },
    async getMangaDetails() {
      return {};
    },
    async getChapterList(manga) {
      return [{ url: manga.url, name: "Gallery", chapterNumber: 0 }];
    },
    async getPageList(chapter) {
      const content = (await fetchHTML(baseUrl + chapter.url)).selectFirst("#content");
      if (!content) throw new Error("The gallery page has changed.");
      return content.select("img").map((img) => ({ url: img.attr("src") }));
    },
    getFilterList() {
      return [{ type: "select", id: "sort", name: "Sort by", options: sorts.map(([label, value]) => ({ label, value })), selected: 2, listings: { popular: "views", latest: "created" } }];
    }
  };
  var index_default = source;
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
