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

  // src/all/yellownote/index.ts
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
  function queryString(params) {
    return params.map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`).join("&");
  }
  function absoluteUrl(path, base) {
    if (/^[a-z][a-z\d+.-]*:/i.test(path)) return path;
    const origin = /^[a-z][a-z\d+.-]*:\/\/[^/?#]*/i.exec(base)?.[0] ?? "";
    if (path.startsWith("//")) return (/^[a-z][a-z\d+.-]*:/i.exec(base)?.[0] ?? "https:") + path;
    if (path.startsWith("/")) return origin + path;
    const directory = base.replace(/[?#].*$/, "").replace(/[^/]*$/, "");
    return directory + path;
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
  function parseDate(text) {
    if (!text) return void 0;
    const time = Date.parse(text);
    return Number.isNaN(time) ? void 0 : time;
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
    [words("second", "segundo", "sec", "detik", "saniye", "giây", "ثانية", "ثوان"), 1e3]
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

  // src/all/yellownote/index.ts
  var sites = [
    ["170542391855030753", "zh-Hans", "https://xchina.co"],
    ["4899554363948814001", "zh-Hant", "https://tw.xchina.co"],
    ["6844007153169388830", "en", "https://en.xchina.co"],
    ["385228898502560286", "es", "https://es.xchina.co"],
    ["7263133157381353850", "ko", "https://kr.xchina.co"]
  ];
  var sitePath = (url) => url.replace(/\/id-([0-9a-z]+)(\/\d+)?\.html$/i, "/$1$2");
  function keptPath(path, page) {
    const photo = /^\/photo\/(?:id-)?([0-9a-z]+)/i.exec(path)?.[1];
    if (photo) return page == null ? `/photo/id-${photo}.html` : `/photo/id-${photo}/${page}.html`;
    return page == null || page === 1 ? path : `${path}/${page}`;
  }
  var mangaSelector = "a[href^=/photo/]:has(> span.ph), a[href^=/amateur/]:has(> span.ph)";
  function mangaFrom(link) {
    const title = link.selectFirst("> span.ph + span")?.text();
    const path = link.attr("href").replace(/[?#].*$/, "");
    return title ? [{ url: keptPath(path), title, thumbnailUrl: link.selectFirst("> span.ph > img")?.absUrl("src") || void 0 }] : [];
  }
  function makeSource([id, lang, baseUrl]) {
    async function parseList(url) {
      const { document } = await fetchPage(url);
      return { mangas: (document.selectFirst("main")?.select(mangaSelector) ?? []).flatMap(mangaFrom), hasNextPage: document.selectFirst("a[rel=next]") != null };
    }
    const listUrl = (path, page, params = []) => `${baseUrl}/${path}${page > 1 ? `/${page}` : ""}${params.length ? `?${queryString(params)}` : ""}`;
    return {
      info: {
        id,
        name: "小黄书",
        lang,
        version: "1.0.3",
        baseUrl,
        supportsLatest: true,
        nsfw: true,
        icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/yellownote/res/mipmap-xhdpi/ic_launcher.png",
        // The image host blocks requests that don't look like a browser loading an image.
        imageHeaders: { Accept: "image/avif,image/webp,image/png,image/jpeg,*/*" }
      },
      async getPopularManga() {
        const { document } = await fetchPage(`${baseUrl}/photos`);
        return { mangas: document.select("main section:first-of-type").flatMap((s) => s.select(mangaSelector)).flatMap(mangaFrom), hasNextPage: false };
      },
      getLatestUpdates(page) {
        return parseList(listUrl("photos/new", page));
      },
      searchManga(page, query, filters) {
        const value = (fid) => {
          const f = filters.find((x) => x.id === fid);
          return f?.type === "select" ? f.options[f.selected]?.value ?? "" : "";
        };
        if (query.trim()) return parseList(`${baseUrl}/search?${queryString([["q", query.trim()], ["type", "photo"], ...page > 1 ? [["page", page]] : []])}`);
        const sort = value("sort");
        return parseList(listUrl(value("category") || categories[0][1], page, sort ? [["sort", sort]] : []));
      },
      async getMangaDetails(manga) {
        const { document } = await fetchPage(baseUrl + sitePath(manga.url));
        const header = document.selectFirst("main header");
        if (!header) throw new Error("The gallery page has changed.");
        const genres = header.select("a[href^=/photo-series/]:not([href*=?]), a[href*=?filter=], a[href^=/photos/tag/]").map((a) => a.text().replace(/^#/, ""));
        return {
          title: header.selectFirst("h1")?.text() ?? manga.title,
          author: header.select("a[href^=/model/], a[href^=/user-amateurs/]").map((a) => a.text()).join(", ") || void 0,
          genres: [...new Set(genres)],
          // The photo and video counts, as "86P + 1V".
          description: header.select("span").map((span) => span.ownText()).find((text) => /^\d+P( \+ \d+V)?$/.test(text)),
          thumbnailUrl: document.selectFirst("meta[property=og:image]")?.attr("content") || manga.thumbnailUrl,
          status: "completed"
        };
      },
      async getChapterList(manga) {
        const { document } = await fetchPage(baseUrl + sitePath(manga.url));
        const header = document.selectFirst("main header");
        const date = parseDate(/\d{4}-\d{2}-\d{2}/.exec((header?.selectFirst("details li") ?? header)?.text() ?? "")?.[0]);
        const total = Number(document.selectFirst("form[data-page-jump]")?.attr("data-total")) || 1;
        return Array.from({ length: total }, (_, i) => total - i).map((page) => ({ url: keptPath(manga.url, page), name: `Page ${page}`, dateUpload: date }));
      },
      async getPageList(chapter) {
        let { document, url } = await fetchPage(baseUrl + sitePath(chapter.url));
        const go = queryParam(url, "go");
        if (go) {
          ({ document, url } = await fetchPage({ url: absoluteUrl(go, url), headers: { Referer: url } }));
          if (queryParam(url, "go") != null) throw new Error("Page not available, open it in the web view.");
        }
        const quality = Honya.prefs.get("XChina::IMAGE_QUALITY") ?? "original";
        return document.select("div[data-cols-grid] > a > img").map((img) => {
          const src = img.absUrl("src");
          return { url: quality === "original" ? src.replace(/_600x0\.webp$/, ".jpg") : src };
        });
      },
      getFilterList() {
        return [
          // Popular and Latest are their own pages, which no sort gives.
          { type: "select", id: "sort", name: "Sort by", options: [["Last Update", ""], ["Popularity", "hot"], ["Comment Count", "comment"], ["Latest Comments", "recent"]].map(([label, value]) => ({ label, value })), selected: 0, listings: {} },
          { type: "separator", id: "s1" },
          { type: "header", id: "h1", name: "These filters will be ignored when text search is active!" },
          { type: "select", id: "category", name: "Category", options: categories.map(([label, value]) => ({ label, value })), selected: 0 }
        ];
      }
    };
  }
  var index_default = sites.map(makeSource);
  var categories = [
    ["Theme: Xiuren Featured", "photo-album/1"],
    ["Theme: Large Scale", "photo-album/2"],
    ["Theme: Sex", "photo-album/3"],
    ["Theme: Exposure", "photo-album/4"],
    ["Theme: Cosplay", "photo-album/5"],
    ["Theme: Sex Toy", "photo-album/6"],
    ["Theme: Bondage", "photo-album/7"],
    ["Theme: Shaved Pussy", "photo-album/8"],
    ["Theme: Lesbian", "photo-album/9"],
    ["Theme: With Original Photos", "photo-album/10"],
    ["Theme: With Video(s)", "photo-album/11"],
    ["Theme: Amateur", "amateurs"],
    ["Taiwan Studios: JVID", "photo-series/637b2029d2347"],
    ["Taiwan Studios: Fantasy Factory", "photo-series/5f889afb37619"],
    ["Taiwan Studios: TPimage", "photo-series/5f7a0a80d3d66"],
    ["Chinese Studios: PANS", "photo-series/6310ce9b90056"],
    ["Chinese Studios: Wind sings", "photo-series/6666a7ac3ba9c"],
    ["Chinese Studios: Xing Se", "photo-series/64f44d99ce673"],
    ["Chinese Studios: Huang Fu", "photo-series/665f8bafab4bc"],
    ["Chinese Studios: Other Studios", "photo-series/665f7d787d681"],
    ["Chinese Studios: MetCN", "photo-series/5f1dcdeaee582"],
    ["Chinese Studios: Litu", "photo-series/5f1d784995865"],
    ["Chinese Studios: Midnight Project", "photo-series/638e5a60b1770"],
    ["Chinese Studios: Pandora", "photo-series/5f23c44cd66bd"],
    ["Chinese Studios: MISSLEG", "photo-series/5f2089564c6c2"],
    ["Chinese Studios: ISS", "photo-series/646c69b675f3d"],
    ["Chinese Studios: AISS", "photo-series/5f15f389e993e"],
    ["Chinese Studios: AU", "photo-series/5f60b98248a81"],
    ["Chinese Studios: Beijing Angel", "photo-series/622c7f95220a4"],
    ["Chinese Studios: Wuji Works", "photo-series/619a92aa1fa7a"],
    ["Chinese Studios: Pomelo", "photo-series/676c3e9b90749"],
    ["Chinese Studios: SK Silk", "photo-series/5f382ba894af4"],
    ["Chinese Studios: DDY", "photo-series/5f15f727df393"],
    ["Chinese Studios: Dongguan VGirls", "photo-series/5f22ea422221c"],
    ["Chinese Studios: YouMei", "photo-series/61b997728043b"],
    ["Others: AI Photos", "photo-series/6443d480eb757"],
    ["Korean Studios: Makemodel", "photo-series/665f81885f103"],
    ["Korean Studios: Pure Media", "photo-series/6224e755e21f4"],
    ["Korean Studios: Espacia Korea", "photo-series/665a2385a2367"],
    ["Korean Studios: Loozy", "photo-series/62888afad416b"],
    ["Japanese Studios: Graphis", "photo-series/6450b47c9db0b"],
    ["Japanese Studios: Weekly Post-Digital Photo", "photo-series/66e68b9c96ab0"],
    ["Japanese Studios: Morning SEXY", "photo-series/670d7142b3d88"],
    ["Japanese Studios: Prestige", "photo-series/670791f5f2f0f"],
    ["Japanese Studios: X-City", "photo-series/66fb8cca706ae"],
    ["Japanese Studios: FRIDAY", "photo-series/66659e2d94489"],
    ["Japanese Studios: Super Pose Book", "photo-series/62a0a15911f16"],
    ["Japanese Studios: Urabon", "photo-series/6692ea004cc75"],
    ["Japanese Studios: Escape", "photo-series/66603af933ec9"],
    ["Japanese Studios: Flash", "photo-series/672a2029d6a32"],
    ["Other Photos: Chinese Nude", "photo-series/64be21c972ca4"],
    ["Other Photos: Korean Nude", "photo-series/64be22b4a0fa0"],
    ["Other Photos: Taiwan Nude", "photo-series/64be21ef4cc51"],
    ["Other Photos: Other Regions", "photo-series/64be239ce73d4"],
    ["Xiuren: All", "photo-series/6660093348354"],
    ["Xiuren: Leaked", "photo-series/66600a3a227ee"],
    ["Xiuren: HuaYang", "photo-series/5fc4ce40386af"],
    ["Xiuren: MyGirl", "photo-series/5f1495dbda4de"],
    ["Xiuren: IMiss", "photo-series/5f71afc92d8ab"],
    ["Xiuren: MiiTao", "photo-series/5f1dd5a7ebe9a"],
    ["Xiuren: FEILIN", "photo-series/5f14a3105d3e8"],
    ["Xiuren: YouWu", "photo-series/60673bec9dd11"],
    ["Xiuren: WingS", "photo-series/63d435352808c"],
    ["Xiuren: RUISG", "photo-series/61263de287e2f"]
  ];
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
