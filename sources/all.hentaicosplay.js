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

  // src/all/hentaicosplay/index.ts
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
  function words(...list2) {
    return new RegExp(`(?<!\\p{L})(?:${list2.map(escape).join("|")})`, "u");
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

  // src/all/hentaicosplay/index.ts
  var baseUrl = "https://hentai-cosplay-xxx.com";
  var dates = /* @__PURE__ */ new Map();
  function parseList(document) {
    const httpsCover = (img) => img?.absUrl("src").replace("http://", "https://") || void 0;
    if (document.selectFirst("div.image-list-item") == null) {
      const mangas2 = document.select("#entry_list > li > a[href*=/image/]").map((a) => {
        const url = relativeUrl(a.absUrl("href"));
        const posted = a.selectFirst("span.posted")?.text();
        if (posted) dates.set(url, posted);
        return { url, thumbnailUrl: httpsCover(a.selectFirst("img")), title: a.selectFirst("span:not(.posted)")?.text() ?? "" };
      });
      return { mangas: mangas2, hasNextPage: document.selectFirst("a.paginator_page[rel=next]") != null };
    }
    const mangas = document.select("div.image-list-item:has(a[href*=/image/])").map((e) => {
      const url = relativeUrl(e.selectFirst("a").absUrl("href"));
      const posted = e.selectFirst(".image-list-item-regist-date")?.text();
      if (posted) dates.set(url, posted);
      return { url, thumbnailUrl: httpsCover(e.selectFirst("img")), title: e.select(".image-list-item-title").map((t) => t.text()).join(" ") };
    });
    return { mangas, hasNextPage: document.selectFirst("div.wp-pagenavi > a[rel=next]") != null };
  }
  var list = async (url) => parseList((await fetchPage(url)).document);
  var source = {
    info: {
      id: "3422463439145930309",
      name: "Hentai Cosplay",
      lang: "all",
      version: "1.0.1",
      baseUrl,
      supportsLatest: true,
      nsfw: true,
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/hentaicosplay/res/mipmap-xhdpi/ic_launcher.png"
    },
    getPopularManga(page) {
      return list(`${baseUrl}/ranking/page/${page}/`);
    },
    getLatestUpdates(page) {
      return list(`${baseUrl}/search/page/${page}/`);
    },
    searchManga(page, query) {
      return list(query ? `${baseUrl}/search/keyword/${encodeURIComponent(query.trim()).replace(/%20/g, "+")}/page/${page}/` : `${baseUrl}/search/page/${page}/`);
    },
    async getMangaDetails(manga) {
      const { document } = await fetchPage(baseUrl + manga.url);
      return { genres: document.select("#detail_tag a[href*=/tag/]").map((a) => a.text()), status: "completed" };
    },
    async getChapterList(manga) {
      const date = /(\d{4})\/(\d{1,2})\/(\d{1,2})/.exec(dates.get(manga.url) ?? "");
      return [{
        name: "Gallery",
        url: manga.url.replace("/image/", "/story/"),
        dateUpload: date ? Date.UTC(Number(date[1]), Number(date[2]) - 1, Number(date[3])) : void 0
      }];
    },
    async getPageList(chapter) {
      const { document } = await fetchPage(baseUrl + chapter.url);
      return document.select("amp-img[src*=upload]:not(.related-thumbnail)").map((img) => ({ url: img.attr("src") }));
    }
  };
  var index_default = source;
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
