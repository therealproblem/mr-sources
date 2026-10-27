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

  // src/ja/herosweb/index.ts
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
  function tiledImageUrl(url, grid) {
    const size = `${grid.columns}x${grid.rows}${grid.multiple && grid.multiple > 1 ? `/${grid.multiple}` : ""}`;
    return `${url.replace(/#.*$/, "")}#honya-tiles=${size}:${grid.order.join(",")}`;
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

  // sdk/nextjs.ts
  function extractNextJsRsc(body, predicate) {
    const chunks = /* @__PURE__ */ new Map();
    const models = /* @__PURE__ */ new Map();
    for (const payload of rscPayloads(body, chunks, models)) {
      const found = find(resolve(payload, chunks, models, /* @__PURE__ */ new Set()), predicate);
      if (found !== void 0) return found;
    }
    return void 0;
  }
  function extractNextJs(document, predicate) {
    const chunks = /* @__PURE__ */ new Map();
    const models = /* @__PURE__ */ new Map();
    const payloads = [];
    for (const script of document.select("script:not([src])")) {
      const data = script.data();
      if (!data.includes("self.__next_f.push")) continue;
      const raw = /self\.__next_f\.push\(\s*(\[[\s\S]*\])\s*\)\s*;?\s*$/.exec(data)?.[1];
      try {
        const content = JSON.parse(raw ?? "null")?.[1];
        if (typeof content === "string") payloads.push(...rscPayloads(content, chunks, models));
      } catch {
      }
    }
    if (payloads.length === 0) {
      try {
        const root = JSON.parse(document.selectFirst("script#__NEXT_DATA__")?.data() ?? "null");
        if (root) payloads.push(...[root.props?.pageProps, root].filter((v) => v != null));
      } catch {
      }
    }
    for (const payload of payloads) {
      const found = find(resolve(payload, chunks, models, /* @__PURE__ */ new Set()), predicate);
      if (found !== void 0) return found;
    }
    return void 0;
  }
  function find(value, predicate) {
    if (value === null || typeof value !== "object") return void 0;
    if (predicate(value)) return value;
    for (const child of Array.isArray(value) ? value : Object.values(value)) {
      const found = find(child, predicate);
      if (found !== void 0) return found;
    }
    return void 0;
  }
  function rscPayloads(body, chunks, models) {
    const results = [];
    let position = 0;
    while (position < body.length) {
      const colon = body.indexOf(":", position);
      if (colon < 0) break;
      const id = body.slice(position, colon);
      if (!id || !/^[\da-f]+$/i.test(id)) {
        position++;
        continue;
      }
      position = colon + 1;
      if (position >= body.length) break;
      if (body[position] === "T") {
        const comma = body.indexOf(",", position);
        if (comma < 0) break;
        const byteLength = parseInt(body.slice(position + 1, comma), 16);
        if (Number.isNaN(byteLength)) break;
        let bytes = 0;
        const start = position = comma + 1;
        while (position < body.length && bytes < byteLength) {
          const code = body.charCodeAt(position);
          if (code < 128) bytes += 1;
          else if (code < 2048) bytes += 2;
          else if (code >= 55296 && code <= 56319) {
            bytes += 4;
            position++;
          } else bytes += 3;
          position++;
        }
        const text = body.slice(start, position);
        chunks.set(id, text);
        try {
          results.push(JSON.parse(text));
        } catch {
        }
      } else {
        const [value, end] = jsonAt(body, position);
        if (value !== void 0) {
          results.push(value);
          models.set(id, value);
        }
        position = end;
      }
    }
    return results;
  }
  function jsonAt(body, start) {
    let depth = 0, inString = false, escaped = false;
    const parse = (end) => {
      try {
        return JSON.parse(body.slice(start, end));
      } catch {
        return void 0;
      }
    };
    for (let i = start; i < body.length; ) {
      const char = body[i++];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\" && inString) {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (char === "{" || char === "[") depth++;
      else if ((char === "}" || char === "]") && --depth === 0) return [parse(i), i];
      if (depth === 0 && /\s/.test(char)) return [parse(i - 1), i];
    }
    return [void 0, body.length];
  }
  function resolve(value, chunks, models, resolving) {
    if (Array.isArray(value)) return value.map((v) => resolve(v, chunks, models, resolving));
    if (value !== null && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolve(v, chunks, models, resolving)]));
    }
    if (typeof value !== "string" || !value.startsWith("$") || value.length < 2) return value;
    if (value === "$undefined") return null;
    if (["$Infinity", "$-Infinity", "$NaN", "$-0"].includes(value)) return value.slice(1);
    const marker = value[1];
    if (marker === "$") return value.slice(1);
    if (marker === "D" || marker === "n") return value.slice(2);
    if (marker === "Q") return resolveMap(value.slice(2), chunks, models, resolving) ?? value;
    if (marker === "W") return resolveSet(value.slice(2), chunks, models, resolving) ?? value;
    if (marker === "L" || marker === "@") return resolveModel(value.slice(2), chunks, models, resolving) ?? value;
    return resolveModel(value.slice(1), chunks, models, resolving) ?? value;
  }
  function resolveModel(reference, chunks, models, resolving) {
    const [id, ...path] = reference.split(":");
    if (path.length === 0 && chunks.has(id)) return chunks.get(id);
    if (resolving.has(id) || !models.has(id)) return void 0;
    const guard = new Set(resolving).add(id);
    let value = models.get(id);
    for (const segment of path) {
      if (typeof value === "string" && value.startsWith("$")) value = resolve(value, chunks, models, guard);
      value = walk(value, segment);
      if (value === void 0) return void 0;
    }
    return resolve(value, chunks, models, guard);
  }
  function walk(value, segment) {
    if (Array.isArray(value)) {
      if (value.length >= 4 && value[0] === "$") {
        const named = { type: 1, key: 2, props: 3 }[segment];
        if (named !== void 0) return value[named];
      }
      const index = Number(segment);
      return Number.isInteger(index) ? value[index] : void 0;
    }
    if (value !== null && typeof value === "object") return value[segment];
    return void 0;
  }
  function resolveMap(id, chunks, models, resolving) {
    const entries = models.get(id);
    if (resolving.has(id) || !Array.isArray(entries)) return void 0;
    const resolved = resolve(entries, chunks, models, new Set(resolving).add(id));
    return Object.fromEntries(resolved.filter((pair) => Array.isArray(pair) && pair.length === 2).map(([key, value]) => [typeof key === "string" ? key : JSON.stringify(key), value]));
  }
  function resolveSet(id, chunks, models, resolving) {
    const values = models.get(id);
    if (resolving.has(id) || !Array.isArray(values)) return void 0;
    return resolve(values, chunks, models, new Set(resolving).add(id));
  }

  // themes/comiciviewer.ts
  var rankingPath = "/ranking/manga";
  var searchPageSize = 24;
  var filterOptions = [
    ["ランキング", rankingPath],
    ["更新順", "/series/list/up"],
    ["新作順", "/series/list/new"],
    ["読み切り", "/category/manga/oneShot"],
    ["完結", "/category/manga/complete"],
    ["月曜日", "/category/manga/day/1"],
    ["火曜日", "/category/manga/day/2"],
    ["水曜日", "/category/manga/day/3"],
    ["木曜日", "/category/manga/day/4"],
    ["金曜日", "/category/manga/day/5"],
    ["土曜日", "/category/manga/day/6"],
    ["日曜日", "/category/manga/day/7"],
    ["その他", "/category/manga/day/8"]
  ];
  var resolveText = (child) => {
    if (child.text != null) return child.text;
    const inner = (child.children ?? []).map(resolveText).join("");
    return child.url ? `[${inner}](${child.url})` : inner;
  };
  function findImg(value) {
    if (Array.isArray(value)) {
      for (const child of value) {
        const found = findImg(child);
        if (found) return found;
      }
    } else if (value && typeof value === "object") {
      if ("src" in value) return value;
      for (const child of Object.values(value)) {
        const found = findImg(child);
        if (found) return found;
      }
    }
    return void 0;
  }
  function comiciviewer(o) {
    const { info } = o;
    const baseUrl = info.baseUrl.replace(/\/$/, "");
    const apiUrl = `${baseUrl}/api`;
    function summaryManga(summary) {
      let description;
      try {
        const nodes = summary.description?.trim() ? JSON.parse(summary.description) : [];
        description = nodes.map((node) => node.children.map(resolveText).join("")).join("\n") || void 0;
      } catch {
        description = summary.description ?? void 0;
      }
      const author = summary.author?.map((a) => a.name).join(", ") || void 0;
      return {
        url: summary.id,
        title: summary.name,
        author,
        artist: author,
        description,
        genres: summary.tag?.map((t) => t.name),
        thumbnailUrl: summary.images?.[0]?.url,
        status: summary.isCompleted ? "completed" : "ongoing"
      };
    }
    function seriesHash(url) {
      const segments = url.replace(/^[a-z]+:\/\/[^/]+/i, "").replace(/[?#].*$/, "").split("/").filter(Boolean);
      const index = segments.indexOf("series");
      if (index < 0 || !segments[index + 1]) throw new Error(`Unrecognized series url: ${url}`);
      return segments[index + 1];
    }
    function listPage(document) {
      const mangas = document.select("div.series-list-item").flatMap((item) => {
        const link = item.selectFirst("a.series-list-item-link");
        const title = item.selectFirst("div.series-list-item-h span[data-e2e=sliTitle]")?.text();
        if (!link || !title) return [];
        return [{ url: seriesHash(link.absUrl("href")), title, thumbnailUrl: item.selectFirst("img.series-list-item-img")?.absUrl("src") || void 0 }];
      });
      return { mangas, hasNextPage: document.selectFirst("a.g-pager-link.mode-active + a.g-pager-link") != null };
    }
    async function ranking() {
      const response = await Honya.request({ url: `${baseUrl}${rankingPath}`, headers: { rsc: "1" } });
      if (response.status < 200 || response.status > 299) throw new Error(`HTTP ${response.status} for ${response.url}`);
      const isList = (value) => !!value && typeof value === "object" && value.className === "series-list mode-ranking";
      const result = (response.headers["content-type"] ?? "").includes("text/x-component") ? extractNextJsRsc(response.body, isList) : extractNextJs(Honya.parseHTML(response.body, response.url), isList);
      const mangas = (result?.children ?? []).flatMap((tuple) => {
        const hash = Array.isArray(tuple) ? tuple[2] : void 0;
        const img = findImg(tuple);
        if (typeof hash !== "string" || !img?.alt) return [];
        const thumbnail = img.srcSet ? img.srcSet.split(", ").pop()?.split(" ")[0] : img.src ?? void 0;
        return [{ url: hash, title: img.alt, thumbnailUrl: thumbnail ?? void 0 }];
      });
      return { mangas, hasNextPage: false };
    }
    const seriesApiUrl = (path, hash) => `${apiUrl}/${path}?${queryString([["seriesHash", hash], ["episodeFrom", "1"], ["episodeTo", "9999"]])}`;
    const hashOf = (manga) => manga.url.includes("/series/") ? manga.url.split("/series/")[1] : manga.url;
    return {
      info: { ...info, supportsLatest: true },
      getPopularManga() {
        return ranking();
      },
      async getLatestUpdates(page) {
        return listPage((await fetchPage(`${baseUrl}/series/list/up/${page}`)).document);
      },
      async searchManga(page, query, filters) {
        if (query.trim()) {
          const result = (await fetchJSON(
            `${apiUrl}/search?${queryString([["q", query], ["page", page], ["size", searchPageSize]])}`
          )).searchResult.series;
          return { mangas: result.series.map(summaryManga), hasNextPage: result.total > page * searchPageSize };
        }
        const category = filters.find((f) => f.id === "category");
        const path = category?.type === "select" ? category.options[category.selected]?.value ?? rankingPath : rankingPath;
        if (path === rankingPath) return ranking();
        return listPage((await fetchPage(`${baseUrl}${path}/${page}`)).document);
      },
      async getMangaDetails(manga) {
        const { series } = await fetchJSON(seriesApiUrl("episodes", hashOf(manga)));
        const { url: _, ...details } = summaryManga(series.summary);
        return details;
      },
      async getChapterList(manga) {
        const hash = hashOf(manga);
        const [{ series }, access] = await Promise.all([
          fetchJSON(seriesApiUrl("episodes", hash)),
          fetchJSON(seriesApiUrl("series/access", hash))
        ]);
        const accesses = new Map(access.seriesAccess.episodeAccesses.map((a) => [a.episodeId, a]));
        return (series.episodes ?? []).map((episode) => {
          const a = accesses.get(episode.id);
          const locked = a ? !a.hasAccess : false;
          const needsLogin = locked && a?.accessType === "memberOnlyFree";
          return {
            url: episode.id,
            name: (needsLogin ? "➡️ " : locked ? "🔒 " : "") + episode.title,
            dateUpload: episode.datePublished ? episode.datePublished * 1e3 : void 0,
            sourceData: needsLogin ? JSON.stringify({ login: true }) : void 0
          };
        }).reverse();
      },
      async getPageList(chapter) {
        let memo = {};
        try {
          memo = JSON.parse(chapter.sourceData ?? "{}");
        } catch {
        }
        if (memo.login) throw new Error("This chapter is free but you need to log in via WebView and refresh the entry.");
        const { episode } = await fetchJSON(`${apiUrl}/episodes/${chapter.url}`);
        const viewerId = episode.content.find((c) => c.type === "viewer")?.viewerId;
        if (!viewerId) {
          const images = episode.content.flatMap((c) => c.type === "image" && c.url ? [{ url: c.url }] : []);
          if (images.length === 0) throw new Error("Log in via WebView and purchase this chapter to read.");
          return images;
        }
        let userId;
        try {
          userId = (await fetchJSON(`${apiUrl}/user/info`)).user?.id;
        } catch {
        }
        const contentsInfo = (to) => `${apiUrl}/book/contentsInfo?${queryString([["comici-viewer-id", viewerId], ["contentId", episode.contentId]])}&${userId ? `user-id=${encodeURIComponent(userId)}` : "user-id"}&page-from=0&page-to=${to}`;
        const { totalPages } = await fetchJSON(contentsInfo(0));
        const { result } = await fetchJSON(contentsInfo(totalPages));
        return [...result].sort((a, b) => a.sort - b.sort).map((page) => {
          const tiles = JSON.parse(page.scramble);
          if (!Array.isArray(tiles) || tiles.length !== 16) return { url: page.imageUrl };
          const order = new Array(16);
          tiles.forEach((source, destination) => {
            order[destination % 4 * 4 + Math.floor(destination / 4)] = source % 4 * 4 + Math.floor(source / 4);
          });
          return { url: tiledImageUrl(page.imageUrl, { columns: 4, rows: 4, order }) };
        });
      },
      getFilterList() {
        const choices = [...filterOptions, ...o.extraFilterOptions ?? []];
        return [{
          type: "select",
          id: "category",
          name: "Filter by",
          selected: 0,
          options: choices.map(([label, value]) => ({ label, value })),
          listings: { popular: rankingPath, latest: "/series/list/up" }
        }];
      },
      getMangaUrl(manga) {
        return `${baseUrl}/series/${hashOf(manga)}`;
      }
    };
  }

  // src/ja/herosweb/index.ts
  var index_default = comiciviewer({
    info: {
      id: "6981500022236807277",
      name: "HERO'S Web",
      lang: "ja",
      version: "1.0.0",
      baseUrl: "https://heros-web.com",
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/ja/herosweb/res/mipmap-xhdpi/ic_launcher.png"
    }
  });
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
