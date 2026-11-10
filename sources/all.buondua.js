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

  // src/all/buondua/index.ts
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
  function queryParams(url) {
    const query = /\?([^#]*)/.exec(url)?.[1] ?? "";
    return query.split("&").filter(Boolean).map((pair) => {
      const [name, value = ""] = pair.split("=");
      const decode = (text) => {
        try {
          return decodeURIComponent(text.replace(/\+/g, " "));
        } catch {
          return text;
        }
      };
      return [decode(name), decode(value)];
    });
  }
  function queryParam(url, name) {
    return queryParams(url).find(([key]) => key === name)?.[1];
  }
  async function mapLimit(items, limit, transform) {
    const results = new Array(items.length);
    let next = 0;
    const worker = async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await transform(items[index], index);
      }
    };
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return results;
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

  // src/all/buondua/index.ts
  var baseUrl = "https://buondua.com";
  var splitPages = () => Honya.prefs.get("pref_split_pages") ?? true;
  async function parseList(url) {
    const { document } = await fetchPage(url);
    const mangas = document.select(".blog > div").flatMap((e) => {
      const link = e.selectFirst(".item-content .item-link");
      return link ? [{ thumbnailUrl: e.selectFirst("img")?.absUrl("src") || void 0, title: link.text(), url: relativeUrl(link.absUrl("href")) }] : [];
    });
    return { mangas, hasNextPage: document.selectFirst(".pagination-next:not([disabled])") != null };
  }
  function lastPage(document) {
    const links = document.select("nav.pagination:first-of-type a.pagination-next");
    const href = links[links.length - 1]?.absUrl("href");
    return href?.startsWith("http") && Number(queryParam(href, "page")) || 1;
  }
  var withPage = (url, page) => {
    const [path, query = ""] = url.split("?");
    const params = query.split("&").filter((p) => p && !p.startsWith("page="));
    return `${path}?${[...params, `page=${page}`].join("&")}`;
  };
  function parseDate(text) {
    const match = /(\d{1,2}):(\d{2})\s+(\d{1,2})-(\d{1,2})-(\d{4})/.exec(text ?? "");
    return match ? new Date(Number(match[5]), Number(match[4]) - 1, Number(match[3]), Number(match[1]), Number(match[2])).getTime() : void 0;
  }
  var pageImages = (document) => document.select(".article-fulltext img").map((img) => img.absUrl("src"));
  var source = {
    info: {
      id: "1435103006121310663",
      name: "Buon Dua",
      lang: "all",
      version: "1.0.1",
      baseUrl,
      supportsLatest: true,
      nsfw: true,
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/buondua/res/mipmap-xhdpi/ic_launcher.png",
      rateLimits: [{ host: "buondua.com", permits: 10, periodMs: 1e3 }]
    },
    getLatestUpdates(page) {
      return parseList(`${baseUrl}/?start=${20 * (page - 1)}`);
    },
    getPopularManga(page) {
      return parseList(`${baseUrl}/hot?start=${20 * (page - 1)}`);
    },
    searchManga(page, query, filters) {
      const tag = filters.find((f) => f.id === "tag");
      if (query) return parseList(`${baseUrl}/?${queryString([["search", query], ["start", 20 * (page - 1)]])}`);
      if (tag?.type === "text" && tag.value) return parseList(`${baseUrl}/tag/${tag.value}&start=${20 * (page - 1)}`);
      return this.getPopularManga(page);
    },
    async getMangaDetails(manga) {
      const { document } = await fetchPage(baseUrl + manga.url);
      const info = document.select(".article-info > strong").map((s) => s.text()).join(" ").replace("Buondua", "").trim();
      const password = document.select("code").map((c) => c.text()).join(" ");
      const links = document.select(".article-links a[href]").map((a) => `[${a.text()}](${a.attr("href")})`).join("\n");
      return {
        title: document.selectFirst(".article-header")?.text().replace(/ - \( Page \d+ \/ \d+ \)/, "").trim(),
        description: [info, links, password].filter((part) => part.trim()).join("\n\n"),
        genres: document.selectFirst(".article-tags")?.select(".tags > .tag").map((t) => t.text().split("#").pop() ?? "")
      };
    },
    async getChapterList(manga) {
      const { document, url } = await fetchPage(baseUrl + manga.url);
      const dateUpload = parseDate(document.selectFirst(".article-info > small")?.text());
      if (!splitPages()) return [{ chapterNumber: 0, url: relativeUrl(url), name: "Gallery", dateUpload }];
      const max = lastPage(document);
      return Array.from({ length: max }, (_, i) => max - i).map((page) => ({
        url: relativeUrl(withPage(url, page)),
        name: `Page ${page}`,
        chapterNumber: page,
        dateUpload
      }));
    },
    async getPageList(chapter) {
      const { document, url } = await fetchPage(baseUrl + chapter.url);
      if (splitPages()) return pageImages(document).map((src) => ({ url: src }));
      const pages = Array.from({ length: lastPage(document) }, (_, i) => i + 1);
      const images = await mapLimit(pages, 4, async (page) => page === 1 ? pageImages(document) : pageImages((await fetchPage(withPage(url, page))).document));
      return images.flat().map((src) => ({ url: src }));
    },
    getFilterList() {
      return [
        { type: "header", id: "h1", name: "NOTE: Ignored if using text search!" },
        { type: "separator", id: "s1" },
        { type: "text", id: "tag", name: "Tag ID", value: "" }
      ];
    }
  };
  var index_default = source;
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
