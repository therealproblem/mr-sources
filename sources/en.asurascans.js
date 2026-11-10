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

  // src/en/asurascans/index.ts
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

  // src/en/asurascans/index.ts
  var baseUrl = "https://asurascans.com";
  var api = "https://api.asurascans.com/api";
  var perPage = 20;
  var randomSuffix = /-[a-z0-9]{8}$/;
  function unwrapAstro(value) {
    if (Array.isArray(value)) {
      if (value.length === 0) return null;
      if (value.length === 1 && Number.isInteger(value[0])) return null;
      if (value.length === 2 && Number.isInteger(value[0])) return unwrapAstro(value[1]);
      return value.map(unwrapAstro);
    }
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, unwrapAstro(v)]));
    return value;
  }
  function astroProp(document, ...keys) {
    const prop = document.selectFirst(keys.map((k) => `[props*=${k}]`).join(""))?.attr("props");
    if (!prop) throw new Error(`Unable to find prop with ${keys.join(", ")}`);
    return unwrapAstro(JSON.parse(prop));
  }
  function mangaSlug(url) {
    if (url.includes("/series/")) return url.split("/series/")[1].split("/")[0];
    if (url.includes("/comics/")) return url.split("/comics/")[1].split("/")[0];
    if (url.includes("/manga/")) return /^\/manga\/(\d+-)?([^/]+)\/?$/.exec(url)?.[2] ?? url.split("/manga/")[1].split("/")[0];
    return url.replace(/^\/+|\/+$/g, "");
  }
  function publicSlug(sourceData, key) {
    try {
      return JSON.parse(sourceData ?? "{}")[key];
    } catch {
      return void 0;
    }
  }
  async function seriesPage(manga) {
    const url = `${baseUrl}/comics/${publicSlug(manga.sourceData, "slug") ?? mangaSlug(manga.url)}`;
    const first = await Honya.request(url);
    if (first.status < 200 || first.status > 299) return fetchPage(url.replace(randomSuffix, ""));
    return { document: Honya.parseHTML(first.body, first.url), url: first.url };
  }
  var statuses = { ongoing: "ongoing", completed: "completed", hiatus: "onHiatus", dropped: "cancelled", axed: "cancelled" };
  var compact = (n) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n);
  var isLocked = (c) => c.is_premium === true || c.is_locked === true || (c.early_access_until ? Date.parse(c.early_access_until) > Date.now() : false);
  var lastSegment = (path) => path.replace(/\/$/, "").split("/").pop() ?? "";
  var sorts = [["Latest Update", "latest"], ["Popular", "popular"], ["Rating", "rating"], ["A-Z", "title"], ["Newest", "update"]];
  var source = {
    info: {
      id: "6247824327199706550",
      name: "Asura Scans",
      lang: "en",
      version: "1.0.2",
      baseUrl,
      supportsLatest: true,
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/asurascans/res/mipmap-xhdpi/ic_launcher.png",
      rateLimits: [{ host: "asurascans.com", permits: 2, periodMs: 2e3 }, { host: "api.asurascans.com", permits: 2, periodMs: 2e3 }]
    },
    getPopularManga(page) {
      return this.searchManga(page, "", [{ type: "sort", id: "sort", name: "", options: sorts.map(([label, value]) => ({ label, value })), selected: 1, ascending: false }]);
    },
    getLatestUpdates(page) {
      return this.searchManga(page, "", [{ type: "sort", id: "sort", name: "", options: sorts.map(([label, value]) => ({ label, value })), selected: 0, ascending: false }]);
    },
    async searchManga(page, query, filters) {
      const params = [["offset", String((page - 1) * perPage)], ["limit", String(perPage)]];
      if (query.trim()) params.push(["search", query]);
      for (const filter of filters) {
        if (filter.type === "sort") params.push(["sort", filter.options[filter.selected ?? 0].value], ["order", filter.ascending ? "asc" : "desc"]);
        if (filter.type === "select" && filter.options[filter.selected]?.value) params.push([filter.id, filter.options[filter.selected].value]);
        if (filter.type === "text" && filter.id === "min_chapters" && filter.value.trim()) params.push(["min_chapters", filter.value.trim()]);
      }
      const result = await fetchJSON(`${api}/series?${queryString(params)}`);
      const mangas = (result.data ?? []).map((m) => ({
        // The old URL form, which existing library entries use.
        url: `/series/${m.slug}`,
        title: m.title,
        thumbnailUrl: m.cover ?? m.coverUrl,
        sourceData: JSON.stringify({ slug: lastSegment(m.public_url) })
      }));
      return { mangas, hasNextPage: result.meta?.has_more ?? false };
    },
    async getMangaDetails(manga) {
      const { document } = await seriesPage(manga);
      const d = astroProp(document, "title", "description");
      const { publicUrl } = astroProp(document, "publicUrl");
      const metadata = [
        d.popularityRank != null ? `Rank: #${d.popularityRank}` : "",
        d.rating != null ? `Rating: ${d.rating.toFixed(2)}` : "",
        d.bookmarkCount != null ? `Bookmarks: ${compact(d.bookmarkCount)}` : ""
      ].filter(Boolean).join(" • ");
      const about = d.description ? Honya.parseHTML(`<body>${d.description}</body>`).text() : "";
      const alternatives = (d.alternativeTitles ?? "").split(d.alternativeTitles?.includes("•") ? "•" : ",").map((t) => t.trim()).filter(Boolean);
      return {
        title: d.title,
        thumbnailUrl: d.coverUrl,
        author: d.author ?? void 0,
        artist: d.artist ?? void 0,
        description: [metadata, about, alternatives.length ? `Alternative Titles:
${alternatives.map((t) => `- ${t}`).join("\n")}` : ""].filter(Boolean).join("\n\n"),
        genres: [...d.type ? [d.type.charAt(0).toUpperCase() + d.type.slice(1)] : [], ...(d.genres ?? []).map((g) => g.name)],
        status: statuses[d.status?.toLowerCase() ?? ""] ?? "unknown",
        sourceData: JSON.stringify({ slug: lastSegment(publicUrl) })
      };
    },
    async getChapterList(manga) {
      const { document } = await seriesPage(manga);
      const { publicUrl } = astroProp(document, "publicUrl");
      const slug = lastSegment(publicUrl);
      const hidePremium = Honya.prefs.get("pref_hide_premium_chapters") ?? true;
      const chapters = astroProp(document, "chapters").chapters ?? [];
      return chapters.filter((c) => !(hidePremium && isLocked(c))).map((c) => {
        const number = String(c.number);
        return {
          url: `/series/${c.series_slug}/chapter/${number}`,
          sourceData: JSON.stringify({ mangaSlug: slug }),
          name: `${isLocked(c) ? "🔒 " : ""}Chapter ${number}${c.title ? ` - ${c.title}` : ""}`,
          dateUpload: c.created_at ? Date.parse(c.created_at) || void 0 : void 0
        };
      });
    },
    async getPageList(chapter) {
      const slug = publicSlug(chapter.sourceData, "mangaSlug");
      if (!slug) throw new Error("Refresh the chapter list.");
      const { document } = await fetchPage(`${baseUrl}/comics/${slug}/chapter/${chapter.url.split("/chapter/")[1]}`);
      let pages = [];
      try {
        pages = astroProp(document, "pages").pages ?? [];
      } catch {
      }
      if (pages.length === 0) throw new Error("This chapter needs an Asura Scans subscription.");
      return pages.map((p) => ({
        url: p.tiles?.length ? `${p.url}#${JSON.stringify({ tiles: p.tiles, tileCols: p.tile_cols ?? 4, tileRows: p.tile_rows ?? 5 })}` : p.url
      }));
    },
    getFilterList() {
      const select = (id, name, pairs) => ({ type: "select", id, name, options: pairs.map(([label, value]) => ({ label, value })), selected: 0 });
      return [
        { type: "sort", id: "sort", name: "Sort By", options: sorts.map(([label, value]) => ({ label, value })), selected: 0, ascending: false, listings: { popular: "popular", latest: "latest" } },
        select("status", "Status", [["All", ""], ["Ongoing", "ongoing"], ["Completed", "completed"], ["Hiatus", "hiatus"], ["Dropped", "dropped"], ["Axed", "axed"]]),
        select("type", "Type", [["All", ""], ["Manhwa", "manhwa"], ["Manhua", "manhua"], ["Mangatoon", "manga"]]),
        { type: "text", id: "min_chapters", name: "Min Chapters", value: "" }
      ];
    }
  };
  var index_default = source;
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
