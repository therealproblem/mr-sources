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

  // src/all/elitebabes/index.ts
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
  function absoluteUrl(path, base) {
    if (/^[a-z][a-z\d+.-]*:/i.test(path)) return path;
    const origin = /^[a-z][a-z\d+.-]*:\/\/[^/?#]*/i.exec(base)?.[0] ?? "";
    if (path.startsWith("//")) return (/^[a-z][a-z\d+.-]*:/i.exec(base)?.[0] ?? "https:") + path;
    if (path.startsWith("/")) return origin + path;
    const directory = base.replace(/[?#].*$/, "").replace(/[^/]*$/, "");
    return directory + path;
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

  // themes/masonry.ts
  var imgAttr = (img, baseUrl) => {
    for (const name of ["srcset", "data-cfsrc", "data-src", "data-lazy-src", "src"]) {
      const value = img.attr(name).trim().split(/\s+/)[0];
      if (value) return absoluteUrl(value, baseUrl);
    }
    return void 0;
  };
  function parseList(document, baseUrl) {
    const mangas = document.select(".list-gallery:not(.static) figure:not(:has(a[href*=/video/]))").flatMap((figure) => {
      const a = figure.selectFirst("a");
      if (!a || /^\/(tag|model|collection)s?\//.test(relativeUrl(a.absUrl("href")))) return [];
      const img = figure.selectFirst("img");
      return [{ url: relativeUrl(a.absUrl("href")), title: a.attr("title"), thumbnailUrl: img ? imgAttr(img, baseUrl) : void 0 }];
    });
    return { mangas, hasNextPage: document.selectFirst(".pagination-a li.next") != null };
  }
  var sorts = [["Trending", "sort/trending"], ["Newest", "sort/newest"], ["Popular", "sort/popular"]];
  function masonry(info) {
    const baseUrl = info.baseUrl;
    return {
      info: { ...info, supportsLatest: true },
      async getPopularManga(page) {
        return parseList(await fetchHTML(page === 1 ? `${baseUrl}/archive/` : `${baseUrl}/archive/page/${page}/`), baseUrl);
      },
      async getLatestUpdates(page) {
        return parseList(await fetchHTML(`${baseUrl}/updates/sort/newest/mpage/${page}/`), baseUrl);
      },
      async searchManga(page, query, filters) {
        if (query) return parseList(await fetchHTML(`${baseUrl}/search/post/${encodeURIComponent(query.trim())}/mpage/${page}/`), baseUrl);
        const sort = filters.find((f) => f.id === "sort");
        const index = sort?.type === "select" ? sort.selected : 0;
        const part = index === 2 ? "" : sorts[index][1];
        return parseList(await fetchHTML(`${baseUrl}/updates/${part ? `${part}/mpage/${page}/` : `page/${page}/`}`), baseUrl);
      },
      async getMangaDetails(manga) {
        const document = await fetchHTML(baseUrl + manga.url);
        const links = document.selectFirst("p.link-btn");
        return {
          artist: links?.select("a[href*=/model/]").map((a) => a.text()).join(", ") || void 0,
          genres: links?.select("a[href*=/tag/]").map((a) => a.text()),
          author: links?.selectFirst("a")?.text(),
          description: document.selectFirst("#content > p")?.text(),
          status: "completed"
        };
      },
      async getChapterList(manga) {
        return [{ name: "Gallery", url: manga.url }];
      },
      async getPageList(chapter) {
        return (await fetchHTML(baseUrl + chapter.url)).select(".list-gallery a[href^=https://cdn.]").map((a) => ({ url: a.absUrl("href") }));
      },
      getFilterList() {
        return [
          { type: "header", id: "h1", name: "Filters ignored with text search" },
          { type: "separator", id: "s1" },
          // Popular is /archive/, which none of the sorts give.
          { type: "select", id: "sort", name: "Sort by", options: sorts.map(([label, value]) => ({ label, value })), selected: 0, listings: { latest: "sort/newest" } }
        ];
      }
    };
  }

  // src/all/elitebabes/index.ts
  var index_default = masonry({
    id: "6842598531101194683",
    name: "Elite Babes",
    lang: "all",
    version: "1.0.2",
    baseUrl: "https://www.elitebabes.com",
    nsfw: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/elitebabes/res/mipmap-xhdpi/ic_launcher.png"
  });
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
