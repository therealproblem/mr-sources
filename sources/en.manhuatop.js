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

  // src/en/manhuatop/index.ts
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
  async function fetchHTML(request) {
    const response = await send(request);
    return Honya.parseHTML(response.body, response.url);
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

  // src/en/manhuatop/index.ts
  var baseUrl = "https://manhuatop.org";
  var headers = { Referer: `${baseUrl}/` };
  var chaptersPerPage = 30;
  var statuses = { "on-going": "ongoing", end: "completed", "on-hold": "onHiatus", canceled: "cancelled" };
  var sortOptions = [
    ["Default", ""],
    ["Latest Update", "latest_update"],
    ["Newest", "newest"],
    ["Title", "title"],
    ["Highest Rated", "rating"],
    ["Most Viewed", "views"],
    ["Trending This Week", "trending-week"],
    ["Trending This Month", "trending-month"],
    ["Trending This Year", "trending-year"]
  ];
  function encodedPath(path) {
    try {
      return encodeURI(decodeURI(path));
    } catch {
      return path;
    }
  }
  function api(endpoint, path, resource) {
    return fetchJSON({ url: `${baseUrl}/api/${endpoint}?${queryString([...resource ? [["resource", resource]] : [], ["path", path]])}`, headers });
  }
  function mangaPath(manga) {
    if (manga.url.startsWith("/")) return manga.url;
    let path;
    try {
      path = JSON.parse(manga.sourceData ?? "{}").path;
    } catch {
    }
    if (typeof path !== "string" || !path) throw new Error("This entry has no page path; migrate it to ManhuaTop again.");
    return path;
  }
  function chapterUrl(chapter) {
    if (chapter.url.startsWith("/")) return baseUrl + chapter.url;
    let path;
    try {
      path = JSON.parse(chapter.sourceData ?? "{}").mangaPath;
    } catch {
    }
    if (typeof path !== "string" || !path) throw new Error("Refresh the chapter list.");
    return `${baseUrl}${path.replace(/\/?$/, "/")}${chapter.url}/`;
  }
  function wholeText(element) {
    return unescapeEntities(element.html().replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|h\d)>/gi, "$&\n").replace(/<[^>]*>/g, ""));
  }
  function details(document) {
    const metadata = (name) => document.select(".metadata-list dt").filter((dt) => dt.ownText() === name).flatMap((dt) => dt.nextElementSibling()?.select("a") ?? []).map((a) => a.text()).filter((t) => t && t !== "Updating");
    const seen = /* @__PURE__ */ new Set();
    const genres = [...metadata("Type"), ...document.select(".genre-chips a, .tags-chips a").map((a) => a.text())].filter((g) => !seen.has(g.toLowerCase()) && seen.add(g.toLowerCase()));
    const statusText = document.selectFirst(".detail-stats .status-badge")?.text().toLowerCase();
    const status = statusText === "ongoing" ? "ongoing" : statusText === "completed" ? "completed" : statusText === "on hold" ? "onHiatus" : statusText === "canceled" ? "cancelled" : "unknown";
    const rating = document.selectFirst(".detail-stats .card-rating")?.text().trim();
    const info = [rating ? `★ ${rating}` : "", document.selectFirst(".detail-stats span[title$=views]")?.text().trim() ?? "", metadata("Release")[0] ?? ""].filter(Boolean).join(" · ");
    const synopsisElement = document.selectFirst(".rich-content.synopsis");
    const synopsis = synopsisElement ? wholeText(synopsisElement).split("\n").map((line) => line.trim()).join("\n").replace(/\n{3,}/g, "\n\n").trim() : "";
    const alternatives = document.selectFirst("p.alternative-title")?.text().trim();
    const altTitles = alternatives ? `**Alternative titles:**
${alternatives.split(" / ").map((t) => `- ${t}`).join("\n")}` : "";
    return {
      title: document.selectFirst("h1#manga-title")?.text(),
      thumbnailUrl: document.selectFirst(".detail-cover img")?.absUrl("src") || void 0,
      author: metadata("Author").join(", ") || void 0,
      artist: metadata("Artist").join(", ") || void 0,
      genres,
      status,
      description: [info, synopsis, altTitles].filter(Boolean).join("\n\n") || void 0
    };
  }
  async function chapterPage(path, page) {
    return api("reader", `${encodedPath(path)}?${queryString([["tab", "chapters"], ["chapter_page", page]])}`, "chapters");
  }
  var source = {
    info: {
      id: "1903782575226230108",
      name: "ManhuaTop",
      lang: "en",
      version: "1.2.0",
      baseUrl,
      supportsLatest: true,
      nsfw: true,
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/manhuatop/res/mipmap-xhdpi/ic_launcher.png",
      rateLimits: [{ host: "manhuatop.org", permits: 2, periodMs: 1e3 }]
    },
    getPopularManga(page) {
      return source.searchManga(page, "", [{ type: "select", id: "sort", name: "Sort by", options: [{ label: "", value: "trending-week" }], selected: 0 }]);
    },
    getLatestUpdates(page) {
      return source.searchManga(page, "", [{ type: "select", id: "sort", name: "Sort by", options: [{ label: "", value: "latest_update" }], selected: 0 }]);
    },
    async searchManga(page, query, filters) {
      const keyword = query.trim();
      if (keyword.length === 1) throw new Error("Search query must be at least 2 characters");
      const params = [];
      let path;
      if (keyword) {
        path = `/search/${encodeURIComponent(keyword)}/`;
        if (page > 1) params.push(["page", String(page)]);
      } else {
        path = `/series/${page > 1 ? `page/${page}/` : ""}`;
      }
      for (const filter of filters) {
        if (filter.type === "select" && filter.options[filter.selected]?.value) params.push([filter.id, filter.options[filter.selected].value]);
        if (filter.type === "checkboxes" && filter.id === "genre" && filter.checked.length > 0) {
          if (filter.checked.length > 10) throw new Error("Select up to 10 genres");
          params.push(["genre", filter.checked.join(",")]);
        }
      }
      const discovery = await api("discovery", params.length ? `${path}?${queryString(params)}` : path);
      return {
        mangas: discovery.items.map((card) => ({ url: card.path, title: card.title, thumbnailUrl: card.thumbnail ?? void 0, status: statuses[card.status ?? ""] ?? "unknown" })),
        hasNextPage: discovery.hasMore
      };
    },
    async getMangaDetails(manga) {
      return details(await fetchHTML({ url: baseUrl + mangaPath(manga), headers }));
    },
    async getChapterList(manga) {
      const path = mangaPath(manga);
      const first = await chapterPage(path, 1);
      const pages = Math.ceil(first.total / chaptersPerPage);
      const rest = await mapLimit(Array.from({ length: Math.max(0, pages - 1) }, (_, i) => i + 2), 4, (page) => chapterPage(path, page));
      const seen = /* @__PURE__ */ new Set();
      return [first, ...rest].flatMap((data) => data.items).filter((c) => c.path != null && !seen.has(c.path) && seen.add(c.path)).map((c) => ({
        url: c.slug,
        name: [c.title, c.extra?.trim() ? c.extra : void 0].filter(Boolean).join(" - "),
        dateUpload: c.date && Date.parse(c.date) || void 0,
        sourceData: JSON.stringify({ mangaPath: path })
      }));
    },
    async getPageList(chapter) {
      const path = encodedPath(chapterUrl(chapter).slice(baseUrl.length));
      const images = [];
      for (let page = 1; ; page++) {
        const data = await api("reader", page > 1 ? `${path}?content_page=${page}` : path, "content");
        images.push(...data.images.map((image) => image.url));
        if (!data.hasMore) break;
      }
      return images.map((url) => ({ url }));
    },
    getFilterList(data) {
      const select = (id, name, pairs) => ({ type: "select", id, name, options: pairs.map(([label, value]) => ({ label, value })), selected: 0 });
      const genres = Array.isArray(data) ? data.filter((g) => Array.isArray(g) && typeof g[0] === "string" && typeof g[1] === "string") : [];
      const list = [
        // The default is relevance for a text search and Latest Update otherwise.
        { ...select("sort", "Sort by", sortOptions), listings: { popular: "trending-week", latest: "latest_update" } },
        select("manga_type", "Type", [["All types", ""], ["Manhwa", "Manhwa"], ["Manga", "Manga"], ["Manhua", "Manhua"], ["Webtoons", "Webtoons"]]),
        select("status", "Status", [["All statuses", ""], ["Ongoing", "on-going"], ["Completed", "end"], ["On hold", "on-hold"], ["Canceled", "canceled"]])
      ];
      if (genres.length > 0) list.push({ type: "checkboxes", id: "genre", name: "Genres (any of, up to 10)", options: genres.map(([label, value]) => ({ label, value })), checked: [] });
      return list;
    },
    async fetchFilterData() {
      const terms = [];
      for (let page = 1; ; page++) {
        const data = await fetchJSON({ url: `${baseUrl}/api/genres?page=${page}`, headers });
        terms.push(...data.terms);
        if (!data.hasMore) break;
      }
      return terms.filter((t) => t.count > 0).map((t) => [t.name, t.id]).sort((a, b) => a[0].toLowerCase() < b[0].toLowerCase() ? -1 : a[0].toLowerCase() > b[0].toLowerCase() ? 1 : 0);
    },
    getMangaUrl(manga) {
      return baseUrl + mangaPath(manga);
    }
  };
  var index_default = source;
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
