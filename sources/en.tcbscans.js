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

  // src/en/tcbscans/index.ts
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

  // src/en/tcbscans/index.ts
  var baseUrl = "https://tcbonepiecechapters.com";
  async function page(url) {
    const response = await Honya.request(url);
    if (response.status === 404 && /\/(mangas|chapters)\//.test(url)) throw new Error("This entry is from an older TCB Scans source. Search for it again here.");
    if (response.status < 200 || response.status > 299) throw new Error(`HTTP ${response.status} for ${response.url}`);
    return Honya.parseHTML(response.body, response.url);
  }
  async function projects() {
    const document = await fetchHTML(`${baseUrl}/projects`);
    const mangas = document.select("div.bg-card").flatMap((card) => {
      const link = card.selectFirst("a[href].text-white");
      return link ? [{ url: relativeUrl(link.absUrl("href")), title: link.text(), thumbnailUrl: card.selectFirst("img")?.absUrl("src") || void 0 }] : [];
    });
    return { mangas, hasNextPage: false };
  }
  var source = {
    info: {
      id: "1435116756378369709",
      name: "TCB Scans",
      lang: "en",
      version: "1.0.1",
      baseUrl,
      supportsLatest: false,
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/tcbscans/res/mipmap-xhdpi/ic_launcher.png"
    },
    getPopularManga() {
      return projects();
    },
    async searchManga(_, query) {
      const { mangas } = await projects();
      return { mangas: mangas.filter((m) => m.title.toLowerCase().includes(query.toLowerCase())), hasNextPage: false };
    },
    async getMangaDetails(manga) {
      const info = (await page(baseUrl + manga.url)).selectFirst("div.order-1");
      if (!info) throw new Error("The series page has changed.");
      return { thumbnailUrl: info.selectFirst("img")?.absUrl("src") || void 0, title: info.selectFirst("h1")?.text(), description: info.selectFirst("p")?.text() };
    },
    async getChapterList(manga) {
      const document = await page(baseUrl + manga.url);
      return document.select("div.grid a").map((a) => {
        const title = a.select("div.font-bold:not(.flex)").map((d) => d.text()).join(" ");
        const description = a.selectFirst(".text-gray-500")?.text() || void 0;
        const number = /\d+.?\d+$/.exec(title)?.[0];
        return { url: relativeUrl(a.absUrl("href")), name: `${number != null ? `Chapter ${number}` : title}${description ? `: ${description}` : ""}` };
      });
    },
    async getPageList(chapter) {
      return (await page(baseUrl + chapter.url)).select("picture img, .image-container img").map((img) => ({ url: img.absUrl("src") }));
    }
  };
  var index_default = source;
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
