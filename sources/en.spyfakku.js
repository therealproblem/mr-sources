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

  // src/en/spyfakku/index.ts
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

  // src/en/spyfakku/index.ts
  var baseUrl = "https://hentalk.pw";
  var api = `${baseUrl}/api`;
  var imageBase = `${baseUrl}/image`;
  var fullTitlePref = () => Honya.prefs.get("display_full_title") === true;
  function fullTitle(title, tags) {
    const named = (namespace) => (tags ?? []).filter((t) => t.namespace === namespace && t.name.trim()).map((t) => t.name).join(" & ");
    const circle = named("circle"), artist = named("artist"), magazine = named("magazine");
    let text = circle ? `[${circle}${artist ? ` (${artist})` : ""}] ` : artist ? `[${artist}] ` : "";
    text += title;
    return magazine ? `${text} (${magazine})` : text;
  }
  var toManga = (h) => ({
    title: fullTitlePref() ? fullTitle(h.title, h.tags) : h.title,
    url: `/g/${h.id}?${h.pages}&hash=${h.hash}`,
    author: h.tags?.filter((t) => t.namespace === "circle").map((t) => t.name).join(", "),
    artist: h.tags?.filter((t) => t.namespace === "artist").map((t) => t.name).join(", "),
    genres: h.tags?.filter((t) => t.namespace === "tag").map((t) => t.name),
    thumbnailUrl: `${imageBase}/${h.hash}/${h.thumbnail}?type=cover`,
    status: "completed"
  });
  async function library(params) {
    const data = JSON.parse((await send(`${api}/library?${queryString(params)}`)).body);
    return { mangas: data.archives.map(toManga), hasNextPage: data.page * data.limit < data.total };
  }
  var apiPath = (url) => url.replace(/^\/archive\/(\d+)\/.*/, "/g/$1").split("?")[0];
  async function shortHentai(url) {
    const path = apiPath(url);
    const response = await Honya.request(api + path);
    if (response.status >= 200 && response.status < 300) return JSON.parse(response.body);
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const page = await Honya.request(`${baseUrl}${path}/__data.json`);
        if (page.status < 200 || page.status > 299) continue;
        const nodes = JSON.parse(page.body).nodes;
        const data = nodes[nodes.length - 1].data;
        const index = data[1];
        const value = (key) => data[index[key]];
        const tagRefs = value("tags") ?? [];
        return {
          hash: value("hash"),
          title: value("title"),
          thumbnail: value("thumbnail"),
          description: value("description"),
          releasedAt: value("releasedAt"),
          createdAt: value("createdAt"),
          size: value("size"),
          pages: value("pages"),
          tags: tagRefs.length ? tagRefs.map((ref) => ({ namespace: data[ref + 2], name: data[ref + 3] })) : null
        };
      } catch {
      }
    }
    throw new Error("Failed to fetch details");
  }
  var readableSize = (size) => size >= 3e8 ? `${(size / 1e9).toFixed(2)} GB` : size >= 1e5 ? `${(size / 1e6).toFixed(2)} MB` : size >= 1e3 ? `${(size / 1e3).toFixed(2)} kB` : `${size} B`;
  var releasedAt = (text) => text ? Date.parse(`${text.slice(0, 19)}Z`) || void 0 : void 0;
  var source = {
    info: {
      id: "6202325652827735606",
      name: "SpyFakku",
      lang: "en",
      version: "1.0.2",
      baseUrl,
      supportsLatest: true,
      nsfw: true,
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/spyfakku/res/mipmap-xhdpi/ic_launcher.png",
      rateLimits: [{ host: "hentalk.pw", permits: 2, periodMs: 1e3 }]
    },
    getPopularManga(page) {
      return library([["sort", "released_at"], ["page", String(page)]]);
    },
    getLatestUpdates(page) {
      return library([["sort", "created_at"], ["page", String(page)]]);
    },
    searchManga(page, query, filters) {
      if (filters.length === 0) filters = this.getFilterList();
      const params = [];
      const terms = [query.trim()];
      for (const filter of filters) {
        if (filter.type === "sort") {
          const value = filter.options[filter.selected ?? 3].value;
          params.push(["sort", value]);
          if (value === "random") params.push(["seed", Math.random().toString(36).slice(2, 2 + 4 + Math.floor(Math.random() * 5))]);
          params.push(["order", filter.ascending ? "asc" : "desc"]);
        } else if (filter.type === "select" && filter.id === "limit") {
          params.push(["limit", filter.options[filter.selected].value]);
        } else if (filter.type === "text" && filter.value) {
          for (const tag of filter.value.split(",").filter((t) => t.trim())) {
            const trimmed = tag.trim().replace(/ /g, "_");
            terms.push(`${trimmed.startsWith("-") ? "-" : ""}${filter.id}:${trimmed.replace(/^-/, "")}`);
          }
        }
      }
      params.push(["q", terms.join(" ")], ["page", String(page)]);
      return library(params);
    },
    async getMangaDetails(manga) {
      const info = await shortHentai(manga.url);
      const named = (namespace) => (info.tags ?? []).filter((t) => t.namespace === namespace).map((t) => t.name);
      let description = info.description ? `${info.description}

` : "";
      for (const [label, namespace, end] of [["Circles", "circle", "\n"], ["Publishers", "publisher", "\n"], ["Magazines", "magazine", "\n"], ["Events", "event", "\n\n"], ["Parodies", "parody", "\n"]]) {
        if (named(namespace).length) description += `${label}: ${named(namespace).join(", ")}${end}`;
      }
      description += `Pages: ${info.pages}

`;
      const released = releasedAt(info.releasedAt);
      if (released) description += `Released: ${new Date(released).toUTCString()}
`;
      const added = info.createdAt ? Date.parse(`${info.createdAt.replace(" ", "T")}Z`) : NaN;
      if (!Number.isNaN(added)) description += `Added: ${new Date(added).toUTCString()}
`;
      description += `Size: ${readableSize(info.size)}`;
      const circles = named("circle");
      return {
        title: fullTitlePref() ? fullTitle(info.title, info.tags) : info.title,
        status: "completed",
        author: (circles.length ? circles : named("artist")).join(", ") || void 0,
        artist: named("artist").join(", ") || void 0,
        thumbnailUrl: `${imageBase}/${info.hash}/${info.thumbnail}?type=cover`,
        genres: named("tag"),
        description
      };
    },
    async getChapterList(manga) {
      const info = await shortHentai(manga.url);
      const url = manga.url.includes("&") ? manga.url : `${manga.url}?${info.pages}&hash=${info.hash}`;
      return [{ name: "Chapter", url, dateUpload: releasedAt(info.releasedAt) }];
    },
    async getPageList(chapter) {
      const match = /\?(\d+)&hash=(\w+)/.exec(chapter.url);
      if (match) return Array.from({ length: Number(match[1]) }, (_, i) => ({ url: `${imageBase}/${match[2]}/${i + 1}` }));
      const info = await shortHentai(chapter.url);
      return Array.from({ length: info.pages }, (_, i) => ({ url: `${imageBase}/${info.hash}/${i + 1}` }));
    },
    getFilterList() {
      const text = (id, name) => ({ type: "text", id, name, value: "" });
      return [
        { type: "sort", id: "sort", name: "Sort by", options: [["Title", "title"], ["Relevance", "relevance"], ["Date Added", "created_at"], ["Date Released", "released_at"], ["Pages", "pages"], ["Random", "random"]].map(([label, value]) => ({ label, value })), selected: 3, ascending: false, listings: { popular: "released_at", latest: "created_at" } },
        { type: "select", id: "limit", name: "Per page", options: ["6", "12", "24", "36", "48"].map((v) => ({ label: v, value: v })), selected: 2 },
        { type: "separator", id: "s1" },
        { type: "header", id: "h1", name: "Separate tags with commas (,)" },
        { type: "header", id: "h2", name: "Prepend with dash (-) to exclude" },
        text("tag", "Tags"),
        text("artist", "Artists"),
        text("magazine", "Magazines"),
        text("publisher", "Publishers"),
        text("parody", "Parodies"),
        text("circle", "Circles"),
        text("event", "Events")
      ];
    }
  };
  var index_default = source;
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
