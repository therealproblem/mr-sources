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

  // src/en/mangafox/index.ts
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

  // src/en/mangafox/index.ts
  var baseUrl = "https://fanfox.net";
  var mobileUrl = "https://m.fanfox.net";
  var cookie = "isAdult=1";
  var months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  var genres = [["Action", "1"], ["Adventure", "2"], ["Comedy", "3"], ["Drama", "4"], ["Fantasy", "5"], ["Martial Arts", "6"], ["Shounen", "7"], ["Horror", "8"], ["Supernatural", "9"], ["Harem", "10"], ["Psychological", "11"], ["Romance", "12"], ["School Life", "13"], ["Shoujo", "14"], ["Mystery", "15"], ["Sci-fi", "16"], ["Seinen", "17"], ["Tragedy", "18"], ["Ecchi", "19"], ["Sports", "20"], ["Slice of Life", "21"], ["Mature", "22"], ["Shoujo Ai", "23"], ["Webtoons", "24"], ["Doujinshi", "25"], ["One Shot", "26"], ["Smut", "27"], ["Yaoi", "28"], ["Josei", "29"], ["Historical", "30"], ["Shounen Ai", "31"], ["Gender Bender", "32"], ["Adult", "33"], ["Yuri", "34"], ["Mecha", "35"], ["Lolicon", "36"], ["Shotacon", "37"]];
  var page = (url, headers = {}) => fetchHTML({ url, headers: { Cookie: cookie, ...headers } });
  function toManga(element) {
    const link = element.selectFirst("a");
    return link ? [{ url: relativeUrl(link.absUrl("href")), title: link.attr("title"), thumbnailUrl: link.selectFirst("img")?.absUrl("src") || void 0 }] : [];
  }
  async function list(url, selector) {
    const document = await page(url);
    return { mangas: document.select(selector).flatMap(toManga), hasNextPage: document.selectFirst(".pager-list-left a.active + a + a") != null };
  }
  function parseChapterDate(text) {
    const midnight = /* @__PURE__ */ new Date();
    midnight.setHours(0, 0, 0, 0);
    if (text.includes("Today") || text.includes(" ago")) return midnight.getTime();
    if (text.includes("Yesterday")) return midnight.getTime() - 864e5;
    const match = /([A-Za-z]{3})\w*\s+(\d{1,2}),\s*(\d{4})/.exec(text);
    const month = match ? months.indexOf(match[1].toLowerCase()) : -1;
    return match && month >= 0 ? new Date(Number(match[3]), month, Number(match[2])).getTime() : void 0;
  }
  function parseStatus(text = "") {
    return text.includes("Ongoing") ? "ongoing" : text.includes("Completed") ? "completed" : "unknown";
  }
  var source = {
    info: {
      id: "6484561431658238800",
      name: "MangaFox",
      lang: "en",
      version: "1.0.0",
      baseUrl,
      supportsLatest: true,
      rateLimits: [{ host: "fanfox.net", permits: 1, periodMs: 1e3 }, { host: "m.fanfox.net", permits: 1, periodMs: 1e3 }],
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/mangafox/res/mipmap-xhdpi/ic_launcher.png"
    },
    getPopularManga(p) {
      return list(`${baseUrl}/directory/${p !== 1 ? `${p}.html` : ""}`, "ul.manga-list-1-list li");
    },
    getLatestUpdates(p) {
      return list(`${baseUrl}/directory/${p !== 1 ? `${p}.html` : ""}?latest`, "ul.manga-list-1-list li");
    },
    searchManga(p, query, filters) {
      const params = [["page", p], ["title", query]];
      const included = [];
      const excluded = [];
      for (const filter of filters) {
        if (filter.type === "select") params.push([filter.id, filter.options[filter.selected]?.value ?? ""]);
        else if (filter.type === "text") params.push([filter.id, filter.value]);
        else if (filter.type === "tristates") {
          included.push(...filter.included);
          excluded.push(...filter.excluded);
        }
      }
      params.push(["genres", included.join(",")], ["nogenres", excluded.join(",")], ["sort", ""], ["stype", "1"]);
      return list(`${baseUrl}/search?${queryString(params)}`, "ul.manga-list-4-list li");
    },
    async getMangaDetails(manga) {
      const document = await page(baseUrl + manga.url);
      const info = document.selectFirst(".detail-info-right");
      if (!info) throw new Error("The series page has changed.");
      return {
        author: info.select(".detail-info-right-say a").map((a) => a.text()).join(", ") || void 0,
        genres: info.select(".detail-info-right-tag-list a").map((a) => a.text()),
        description: info.selectFirst("p.fullcontent")?.text(),
        status: parseStatus(info.selectFirst(".detail-info-right-title-tip")?.text()),
        thumbnailUrl: document.selectFirst(".detail-info-cover-img")?.absUrl("src") || void 0
      };
    },
    async getChapterList(manga) {
      const document = await page(baseUrl + manga.url);
      return document.select("ul.detail-main-list li a").map((a) => {
        const lines = a.select(".detail-main-list-main p");
        return { url: relativeUrl(a.absUrl("href")), name: lines[0]?.text() ?? a.attr("title"), dateUpload: parseChapterDate(lines[lines.length - 1]?.text() ?? "") };
      });
    },
    // The mobile site's "roll" reader lists every page at once when readway=2.
    async getPageList(chapter) {
      const document = await page(mobileUrl + chapter.url.replace("/manga/", "/roll_manga/"), { Cookie: `readway=2; ${cookie}`, Referer: `${mobileUrl}/` });
      return document.select("#viewer img").map((img) => ({ url: img.absUrl("data-original") }));
    },
    getFilterList() {
      const options = (pairs) => pairs.map(([label, value]) => ({ label, value }));
      const method = options([["contain", "cw"], ["begin", "bw"], ["end", "ew"]]);
      return [
        { type: "text", id: "name", name: "Name", value: "" },
        { type: "select", id: "type", name: "Type", options: options([["Any", "0"], ["Japanese Manga", "1"], ["Korean Manhwa", "2"], ["Chinese Manhua", "3"], ["European Manga", "4"], ["American Manga", "5"], ["HongKong Manga", "6"], ["Other Manga", "7"]]), selected: 0 },
        { type: "select", id: "st", name: "Completed Series", options: options([["Either", "0"], ["Yes", "2"], ["No", "1"]]), selected: 0 },
        { type: "select", id: "author_method", name: "Author method", options: method, selected: 0 },
        { type: "text", id: "author", name: "Author", value: "" },
        { type: "tristates", id: "genres", name: "Genre", options: options(genres), included: [], excluded: [] }
      ];
    }
  };
  var index_default = source;
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
