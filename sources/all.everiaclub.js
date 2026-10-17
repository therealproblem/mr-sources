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

  // src/all/everiaclub/index.ts
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

  // src/all/everiaclub/index.ts
  var baseUrl = "https://everia.club";
  var imgSrc = (img) => img.attr("data-lazy-src") || img.attr("data-src") || img.attr("src");
  var decode = (text) => Honya.parseHTML(`<body>${text}</body>`).text();
  async function posts(params) {
    const response = await send(`${baseUrl}/wp-json/wp/v2/posts?${queryString(params)}`);
    const total = Number(response.headers["x-wp-totalpages"]) || 0;
    const page = Number(params.find(([k]) => k === "page")?.[1]) || 0;
    const mangas = JSON.parse(response.body).map((post) => ({
      title: decode(post.title.rendered),
      url: relativeUrl(post.link),
      thumbnailUrl: post._embedded?.["wp:featuredmedia"]?.[0]?.source_url
    }));
    return { mangas, hasNextPage: page < total };
  }
  var imagesOf = (document) => document.select(".entry-content img").filter((img) => !img.parent()?.is("noscript")).map(imgSrc);
  var categories = [["Any", ""], ["China", "42"], ["Cosplay", "7"], ["Japan", "2"], ["Korea", "11"], ["Thailand", "1984"]];
  var source = {
    info: {
      id: "7698513740234984368",
      name: "Everia.club",
      lang: "all",
      version: "1.0.1",
      baseUrl,
      supportsLatest: true,
      nsfw: true,
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/everiaclub/res/mipmap-xhdpi/ic_launcher.png"
    },
    async getPopularManga() {
      const { document } = await fetchPage(baseUrl);
      const mangas = document.select(".wli_popular_posts-class li").map((e) => {
        const img = e.selectFirst("img");
        return { thumbnailUrl: img ? imgSrc(img) : void 0, title: e.select("h3").map((h) => h.text()).join(" "), url: relativeUrl(e.select("h3 > a")[0]?.absUrl("href") ?? "") };
      });
      return { mangas, hasNextPage: false };
    },
    getLatestUpdates(page) {
      return posts([["page", String(page)], ["per_page", "20"], ["_embed", "wp:featuredmedia"]]);
    },
    searchManga(page, query, filters) {
      const params = [["page", String(page)], ["per_page", "20"], ["_embed", "wp:featuredmedia"]];
      if (query) params.push(["search", query]);
      const category = filters.find((f) => f.id === "category");
      if (category?.type === "select" && category.selected !== 0) params.push(["categories", category.options[category.selected].value]);
      return posts(params);
    },
    async getMangaDetails(manga) {
      const { document } = await fetchPage(baseUrl + manga.url);
      const title = document.select(".entry-title").map((e) => e.text()).join(" ");
      return { title, description: title, genres: document.select(".post-tags > a").map((a) => a.text()), status: "completed" };
    },
    async getChapterList(manga) {
      const { document, url } = await fetchPage(baseUrl + manga.url);
      const canonical = document.selectFirst('link[rel="canonical"]')?.attr("href") || url;
      const date = /(\d{4})\/(\d{2})\/(\d{2})/.exec(canonical);
      return [{ url: relativeUrl(canonical), chapterNumber: -2, name: "Gallery", dateUpload: date ? Date.UTC(Number(date[1]), Number(date[2]) - 1, Number(date[3])) : void 0 }];
    },
    async getPageList(chapter) {
      const { document } = await fetchPage(baseUrl + chapter.url);
      const links = [...new Set(document.select(".page-links a.post-page-numbers").map((a) => a.absUrl("href")))];
      const others = await mapLimit(links, 3, async (link) => {
        try {
          return imagesOf((await fetchPage(link)).document);
        } catch {
          return [];
        }
      });
      const urls = [...new Set([imagesOf(document), ...others].flat())];
      return urls.filter((url) => url && !url.startsWith("data:image")).map((url) => ({ url }));
    },
    getFilterList() {
      return [
        { type: "header", id: "h1", name: "NOTE: Category filter can be combined with search." },
        { type: "separator", id: "s1" },
        { type: "select", id: "category", name: "Category", options: categories.map(([label, value]) => ({ label, value })), selected: 0 }
      ];
    }
  };
  var index_default = source;
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
