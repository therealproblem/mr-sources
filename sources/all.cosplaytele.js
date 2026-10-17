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

  // src/all/cosplaytele/index.ts
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
  async function fetchPage(request) {
    const response = await send(request);
    return { document: Honya.parseHTML(response.body, response.url), url: response.url };
  }
  var namedEntities = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    hearts: "♥",
    hellip: "…",
    mdash: "—",
    ndash: "–",
    lsquo: "‘",
    rsquo: "’",
    ldquo: "“",
    rdquo: "”"
  };
  function unescapeEntities(text) {
    return text.replace(/&(?:#(\d+)|#x([\da-f]+)|([a-z][a-z\d]*));/gi, (entity, decimal, hex, name) => {
      if (name) return namedEntities[name] ?? (Honya.parseHTML(entity).text() || entity);
      const code = decimal ? Number(decimal) : parseInt(hex, 16);
      return code > 0 && code <= 1114111 ? String.fromCodePoint(code) : entity;
    });
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

  // src/all/cosplaytele/index.ts
  var baseUrl = "https://cosplaytele.com";
  var popularLimit = 20;
  function parseList(document) {
    const mangas = document.select("main div.box").flatMap((e) => {
      const link = e.selectFirst("h5 a");
      return link ? [{ thumbnailUrl: e.selectFirst("img")?.absUrl("src") || void 0, title: link.text(), url: relativeUrl(link.absUrl("href")) }] : [];
    });
    return { mangas, hasNextPage: document.selectFirst(".next.page-number") != null };
  }
  var categories = [["All", ""], ["Cosplay Nude", "category/nude"], ["Cosplay Ero", "category/no-nude"], ["Cosplay", "category/cosplay"]];
  var source = {
    info: {
      id: "7395748658970167454",
      name: "CosplayTele",
      lang: "all",
      version: "1.0.2",
      baseUrl,
      supportsLatest: true,
      nsfw: true,
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/cosplaytele/res/mipmap-xhdpi/ic_launcher.png"
    },
    async getPopularManga(page) {
      const posts = await fetchJSON(
        `${baseUrl}/wp-json/wordpress-popular-posts/v1/popular-posts?${queryString([
          ["offset", page * popularLimit],
          ["limit", popularLimit],
          ["range", "last7days"],
          ["embed", "true"],
          ["_embed", "wp:featuredmedia"],
          ["_fields", "title,link,_embedded,_links.wp:featuredmedia"]
        ])}`
      );
      const mangas = posts.map((post) => ({ title: unescapeEntities(post.title.rendered), url: relativeUrl(post.link), thumbnailUrl: post._embedded?.["wp:featuredmedia"]?.[0]?.source_url }));
      return { mangas, hasNextPage: mangas.length >= popularLimit };
    },
    async getLatestUpdates(page) {
      return parseList((await fetchPage(`${baseUrl}/page/${page}/`)).document);
    },
    async searchManga(page, query, filters) {
      const category = filters.find((f) => f.id === "category");
      const path = category?.type === "select" ? category.options[category.selected]?.value : "";
      if (path) return parseList((await fetchPage(`${baseUrl}/${path}/page/${page}${query ? `?${queryString([["s", query]])}` : ""}`)).document);
      if (query) return parseList((await fetchPage(`${baseUrl}/page/${page}/?${queryString([["s", query]])}`)).document);
      return this.getLatestUpdates(page);
    },
    async getMangaDetails(manga) {
      const { document } = await fetchPage(baseUrl + manga.url);
      const title = document.selectFirst(".entry-title")?.text();
      if (!title) throw new Error("Title is mandatory");
      const tags = document.select("#main a").filter((a) => /.*\/(tag|category)\/.*/.test(a.absUrl("href"))).map((a) => a.text());
      return { title, description: title, genres: tags, status: "completed" };
    },
    async getChapterList(manga) {
      const { document, url } = await fetchPage(baseUrl + manga.url);
      const date = /(\d{4})-(\d{2})-(\d{2})/.exec(document.selectFirst("time.updated")?.attr("datetime") ?? "");
      return [{ name: "Gallery", url: /^https?:\/\/[^/]+([^?#]*)/.exec(url)?.[1] ?? manga.url, dateUpload: date ? Date.UTC(Number(date[1]), Number(date[2]) - 1, Number(date[3])) : void 0 }];
    },
    async getPageList(chapter) {
      return (await fetchPage(baseUrl + chapter.url)).document.select(".gallery-item img").map((img) => ({ url: img.absUrl("src") }));
    },
    getFilterList() {
      return [
        { type: "header", id: "h1", name: "NOTE: Only one filter will be applied!" },
        { type: "separator", id: "s1" },
        { type: "select", id: "category", name: "Category", options: categories.map(([label, value]) => ({ label, value })), selected: 0 }
      ];
    }
  };
  var index_default = source;
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
