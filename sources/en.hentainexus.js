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

  // src/en/hentainexus/index.ts
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
  var base64Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  function base64Decode(text) {
    const clean = text.replace(/[\s=]/g, "").replace(/-/g, "+").replace(/_/g, "/");
    const bytes = new Uint8Array(Math.floor(clean.length * 3 / 4));
    let buffer = 0, bits = 0, length = 0;
    for (const char of clean) {
      const value = base64Alphabet.indexOf(char);
      if (value < 0) throw new Error(`not base64: ${char}`);
      buffer = buffer << 6 | value;
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        bytes[length++] = buffer >> bits & 255;
      }
    }
    return bytes.subarray(0, length);
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
  function words(...list2) {
    return new RegExp(`(?<!\\p{L})(?:${list2.map(escape).join("|")})`, "u");
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

  // src/en/hentainexus/index.ts
  var baseUrl = "https://hentainexus.com";
  var popularNowPath = "/explore/hot";
  function parseList(document, url) {
    const mangas = document.select(".container .column").map((e) => ({
      url: relativeUrl(e.selectFirst("a").absUrl("href")),
      title: e.selectFirst(".card-header-title").text(),
      thumbnailUrl: e.selectFirst(".card-image img")?.absUrl("src") || void 0
    }));
    const isPopularNow = relativeUrl(url).split("?")[0] === popularNowPath;
    return { mangas, hasNextPage: isPopularNow || document.selectFirst("a.pagination-next[href]") != null };
  }
  async function list(url) {
    const { document, url: finalUrl } = await fetchPage(url);
    return parseList(document, finalUrl);
  }
  function details(document) {
    const table = document.selectFirst(".view-page-details");
    if (!table) throw new Error("The gallery page has changed.");
    const people = [...table.select("td.viewcolumn:contains(Author) + td a"), ...table.select("td.viewcolumn:contains(Artist) + td a")].map((a) => a.ownText());
    const lines = [];
    for (const key of ["Circle", "Event", "Magazine", "Parody", "Publisher", "Pages", "Favorites"]) {
      const cell = table.selectFirst(`td.viewcolumn:contains(${key}) + td`);
      if (!cell) continue;
      lines.push(`${key}: ${cell.ownText() || cell.selectFirst("a")?.ownText() || ""}`);
    }
    const about = table.selectFirst("td.viewcolumn:contains(Description) + td")?.text();
    return {
      title: document.selectFirst("h1.title")?.text(),
      author: [...new Set(people)].join(", ") || void 0,
      description: (lines.join("\n") + (about != null ? `

${about}` : "")).trim(),
      genres: table.select("span.tag a").map((a) => a.text().replace(/\s*\([\d,]+\)$/, "")),
      status: "completed",
      thumbnailUrl: document.selectFirst("figure.image img")?.attr("src") || void 0
    };
  }
  function decrypt(encoded) {
    const data = base64Decode(encoded);
    const hostname = "hentainexus.com";
    for (let i = 0; i < hostname.length; i++) data[i] ^= hostname.charCodeAt(i);
    const keyStream = data.subarray(0, 64);
    const ciphertext = data.subarray(64);
    const digest = Array.from({ length: 256 }, (_, i) => i);
    let primeIdx = 0;
    for (let i = 0; i < 64; i++) {
      primeIdx ^= keyStream[i];
      for (let j = 0; j < 8; j++) primeIdx = primeIdx & 1 ? primeIdx >>> 1 ^ 12 : primeIdx >>> 1;
    }
    primeIdx &= 7;
    let key = 0;
    for (let i = 0; i < 256; i++) {
      key = (key + digest[i] + keyStream[i % 64]) % 256;
      [digest[i], digest[key]] = [digest[key], digest[i]];
    }
    const q = [2, 3, 5, 7, 11, 13, 17, 19][primeIdx];
    let k = 0, n = 0, p = 0, xorKey = 0;
    let out = "";
    for (let i = 0; i < ciphertext.length; i++) {
      k = (k + q) % 256;
      n = (p + digest[(n + digest[k]) % 256]) % 256;
      p = (p + k + digest[k]) % 256;
      [digest[k], digest[n]] = [digest[n], digest[k]];
      xorKey = digest[(n + digest[(k + digest[(xorKey + p) % 256]) % 256]) % 256];
      out += String.fromCharCode(ciphertext[i] ^ xorKey);
    }
    return out;
  }
  function splitTerms(text) {
    const tokens = [];
    let current = "";
    let quoted = false;
    for (const ch of text) {
      if (ch === '"') {
        quoted = !quoted;
        current += ch;
      } else if (ch === "," && !quoted) {
        if (current.trim()) tokens.push(current.trim());
        current = "";
      } else current += ch;
    }
    if (current.trim()) tokens.push(current.trim());
    return tokens;
  }
  var advancedFilters = [
    ["tags", "Tags", "tag"],
    ["artists", "Artists", "artist"],
    ["authors", "Authors", "author"],
    ["circles", "Circles", "circle"],
    ["events", "Events", "event"],
    ["parodies", "Parodies", "parody"],
    ["magazines", "Magazines", "magazine"],
    ["publishers", "Publishers", "publisher"]
  ];
  var source = {
    info: {
      id: "7719798645438596394",
      name: "HentaiNexus",
      lang: "en",
      version: "1.0.1",
      baseUrl,
      supportsLatest: true,
      nsfw: true,
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/hentainexus/res/mipmap-xhdpi/ic_launcher.png",
      rateLimits: [{ host: "hentainexus.com", permits: 1, periodMs: 1e3 }]
    },
    getLatestUpdates(page) {
      return list(baseUrl + (page > 1 ? `/page/${page}` : ""));
    },
    getPopularManga(page) {
      return page > 1 ? this.searchManga(page - 1, "sort:popular", []) : list(baseUrl + popularNowPath);
    },
    async searchManga(page, query, filters) {
      if (query.startsWith("id:")) {
        const id = query.slice(3);
        const { document } = await fetchPage(`${baseUrl}/view/${id}`);
        return { mangas: [{ ...details(document), url: `/view/${id}`, title: details(document).title ?? id }], hasNextPage: false };
      }
      const offsetFilter = filters.find((f) => f.id === "offset");
      const actualPage = page + (offsetFilter?.type === "text" ? Number.parseInt(offsetFilter.value, 10) || 0 : 0);
      const combined = advancedFilters.flatMap(([id, , key]) => {
        const filter = filters.find((f) => f.id === id);
        if (filter?.type !== "text") return [];
        return splitTerms(filter.value).map((token) => `${token.startsWith("-") ? "-" : ""}${key}:${token.replace(/^-/, "")} `);
      }).join("");
      return list(`${baseUrl}${actualPage > 1 ? `/page/${actualPage}` : ""}?${queryString([["q", (combined + query).trim()]])}`);
    },
    async getMangaDetails(manga) {
      return details((await fetchPage(baseUrl + manga.url)).document);
    },
    async getChapterList(manga) {
      const { document, url } = await fetchPage(baseUrl + manga.url);
      const published = document.selectFirst(".view-page-details td.viewcolumn:contains(Published) + td")?.text();
      const id = url.split("?")[0].replace(/\/$/, "").split("/").pop();
      return [{ url: `/read/${id}`, name: "Chapter", dateUpload: published ? Date.parse(`${published} UTC`) || void 0 : void 0 }];
    },
    async getPageList(chapter) {
      const { document } = await fetchPage(baseUrl + chapter.url);
      const script = document.select("script").map((s) => s.data()).find((data) => data.includes("initReader"));
      if (!script) throw new Error("Could not find initReader script; the page structure may have changed");
      const encoded = script.split('initReader("')[1].split('",')[0];
      const images = JSON.parse(decrypt(encoded)).filter((item) => item.type === "image");
      if (images.length === 0) return [];
      const format = Honya.prefs.get("pref_image_format") ?? "webp";
      const field = format === "source" ? "image_source" : format === "avif" ? "image_avif" : "image_fallback";
      if (images[0][field] == null) throw new Error(`Selected quality '${format}' is not available. Log in or choose another quality.`);
      return images.map((image) => ({ url: image[field] }));
    },
    getFilterList() {
      return [
        { type: "header", id: "h1", name: 'Separate items with commas (,). Prepend with dash (-) to exclude. Surround items with multiple words with double quotes (").' },
        ...advancedFilters.map(([id, name]) => ({ type: "text", id, name, value: "" })),
        { type: "separator", id: "s1" },
        { type: "text", id: "offset", name: "Offset results by # pages", value: "" }
      ];
    }
  };
  var index_default = source;
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
