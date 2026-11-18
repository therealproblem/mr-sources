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

  // src/all/xasiatalbums/index.ts
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

  // src/all/xasiatalbums/index.ts
  var baseUrl = "https://www.xasiat.com";
  var itemsPerPage = 12;
  var headers = { "X-Requested-With": "XMLHttpRequest" };
  async function block(path, blockId, page, params) {
    const from = String((page - 1) * itemsPerPage + 1);
    const query = [
      ["mode", "async"],
      ["function", "get_block"],
      ["block_id", blockId],
      ["from", from],
      ...blockId.includes("search") ? [["from_albums", from]] : [],
      ...params,
      ["_", String(Date.now())]
    ];
    const { document } = await fetchPage({ url: `${baseUrl}/${path.replace(/^\/|\/$/g, "")}/?${queryString(query)}`, headers });
    const seen = /* @__PURE__ */ new Set();
    const mangas = document.select(".list-albums .item a[href]").flatMap((link) => {
      const href = link.absUrl("href");
      if (!href || !href.includes("/albums/")) return [];
      const url = relativeUrl(href);
      if (seen.has(url)) return [];
      seen.add(url);
      const img = link.selectFirst("img");
      return [{ url, title: link.attr("title") || img?.attr("alt") || "", thumbnailUrl: img ? img.absUrl("data-original") || img.absUrl("src") : void 0, status: "completed" }];
    });
    const hasNextPage = document.select(".pagination a[href], .pages a[href], .pager a[href]").some((a) => /next/i.test(a.text())) || mangas.length >= itemsPerPage;
    return { mangas, hasNextPage };
  }
  var source = {
    info: {
      id: "7187893778775685546",
      name: "XAsiat Albums",
      lang: "all",
      version: "1.0.1",
      baseUrl,
      supportsLatest: true,
      nsfw: true,
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/xasiatalbums/res/mipmap-xhdpi/ic_launcher.png"
    },
    getPopularManga(page) {
      return block("albums/", "list_albums_common_albums_list", page, [["sort_by", "album_viewed_week"]]);
    },
    getLatestUpdates(page) {
      return block("albums/", "list_albums_common_albums_list", page, [["sort_by", "post_date"]]);
    },
    searchManga(page, query, filters) {
      if (query.trim()) return block("search/search/", "list_albums_albums_list_search_result", page, [["q", query]]);
      const category = filters.find((f) => f.id === "category");
      if (category?.type === "select" && category.selected > 0) return block(category.options[category.selected].value, "list_albums_common_albums_list", page, []);
      return this.getLatestUpdates(page);
    },
    async getMangaDetails(manga) {
      const { document } = await fetchPage({ url: baseUrl + manga.url, headers });
      return {
        title: document.selectFirst(".entry-title")?.text(),
        description: document.selectFirst("meta[property=og:description]")?.attr("content") ?? "",
        thumbnailUrl: document.selectFirst("meta[property=og:image]")?.attr("content") || void 0,
        genres: document.select(".info-content a").filter((a) => a.text().trim() && a.absUrl("href").includes("/albums/")).map((a) => a.text().trim()),
        status: "completed"
      };
    },
    async getChapterList(manga) {
      const { url } = await fetchPage({ url: baseUrl + manga.url, headers });
      return [{ url: url.startsWith(baseUrl) ? url.slice(baseUrl.length) : url, name: "Photobook" }];
    },
    async getPageList(chapter) {
      const { document } = await fetchPage({ url: chapter.url.startsWith("http") ? chapter.url : baseUrl + chapter.url, headers });
      const urls = document.select("a.item[href], a[href*='/get_image/']").map((a) => a.absUrl("href")).filter((url) => url.includes("/get_image/"));
      return [...new Set(urls)].map((url) => ({ url }));
    },
    getFilterList() {
      return [
        { type: "header", id: "h1", name: "Tags from the site's albums" },
        { type: "separator", id: "s1" },
        { type: "select", id: "category", name: "Category", options: categories.map(([label, value]) => ({ label, value })), selected: 0 }
      ];
    }
  };
  var index_default = source;
  var categories = [
    ["None", ""],
    ["Allgravure", "albums/tags/allgravure"],
    ["Amateur", "albums/categories/amateur3"],
    ["Artgravia", "albums/tags/artgravia"],
    ["Bejean On Line", "albums/tags/bejean-on-line"],
    ["Big Comic Spirits", "albums/tags/big-comic-spirits"],
    ["Bikini", "albums/tags/bikini"],
    ["Black", "albums/tags/black"],
    ["Bluecake", "albums/tags/bluecake"],
    ["Bunny", "albums/tags/bunny"],
    ["China & Taiwan", "albums/categories/china-taiwan"],
    ["Cosplay", "albums/tags/cosplay"],
    ["Djawa", "albums/tags/djawa"],
    ["Espacia Korea", "albums/tags/espacia-korea"],
    ["Fantia", "albums/tags/fantia"],
    ["Flash", "albums/tags/flash"],
    ["Friday", "albums/tags/friday"],
    ["Friday Digital Photobook", "albums/tags/friday-digital-photobook"],
    ["Friday Gold", "albums/tags/friday-gold"],
    ["Gals", "albums/tags/gals"],
    ["Girls", "albums/tags/girls"],
    ["Girlz-High", "albums/tags/girlz-high"],
    ["Graphis", "albums/tags/graphis"],
    ["Gravure Idols", "albums/categories/gravure-idols"],
    ["Japan", "albums/tags/japan"],
    ["Japanese", "albums/tags/japanese"],
    ["JAV & AV Models", "albums/categories/jav"],
    ["JAV Amateur", "albums/categories/jav-amateur"],
    ["JVID", "albums/tags/jvid"],
    ["Korean", "albums/tags/korean"],
    ["Leehee Express", "albums/tags/leehee-express"],
    ["Loozy", "albums/tags/loozy"],
    ["Lovepop", "albums/tags/lovepop"],
    ["Maid", "albums/tags/maid"],
    ["Night", "albums/tags/night"],
    ["Nude", "albums/tags/nude"],
    ["Onlyfans", "albums/tags/onlyfans"],
    ["Patreon", "albums/tags/patreon"],
    ["Photobook", "albums/tags/photobook"],
    ["Pure Media", "albums/tags/pure-media"],
    ["School", "albums/tags/school"],
    ["Shonen Magazine", "albums/tags/shonen-magazine"],
    ["Shonen Sunday", "albums/tags/shonen-sunday"],
    ["South Korea", "albums/categories/korea"],
    ["Southeast Asia", "albums/categories/southeast-asia"],
    ["Summertime", "albums/tags/summertime"],
    ["Swimsuit", "albums/tags/swimsuit"],
    ["Teen", "albums/tags/teen"],
    ["Tiny Body", "albums/tags/tiny-body"],
    ["Uniform", "albums/tags/uniform"],
    ["Weekly Playboy", "albums/tags/weekly-playboy"],
    ["Western Girls", "albums/categories/western-girls"],
    ["Xiaoyu", "albums/tags/xiaoyu"],
    ["Xiuren", "albums/tags/xiuren"],
    ["Yanmaga Web", "albums/tags/yanmaga-web"],
    ["Young Champion", "albums/tags/young-champion"],
    ["Young Jump", "albums/tags/young-jump"],
    ["Young Magazine", "albums/tags/young-magazine"],
    ["Yuuhui", "albums/tags/yuuhui"]
  ];
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
