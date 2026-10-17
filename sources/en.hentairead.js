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

  // src/en/hentairead/index.ts
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
  function utf8Decode(bytes) {
    let text = "";
    for (let i = 0; i < bytes.length; ) {
      const byte = bytes[i++];
      let code;
      if (byte < 128) code = byte;
      else if (byte < 224) code = (byte & 31) << 6 | bytes[i++] & 63;
      else if (byte < 240) code = (byte & 15) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63;
      else code = (byte & 7) << 18 | (bytes[i++] & 63) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63;
      text += String.fromCodePoint(code);
    }
    return text;
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

  // src/en/hentairead/index.ts
  var baseUrl = "https://hentairead.com";
  function cover(img) {
    if (img.hasAttr("data-src")) return img.absUrl("data-src");
    if (img.hasAttr("data-lazy-src")) return img.absUrl("data-lazy-src");
    if (img.hasAttr("srcset")) return img.absUrl("srcset").split(" ")[0].replace(/,$/, "");
    if (img.hasAttr("data-cfsrc")) return img.absUrl("data-cfsrc");
    return img.absUrl("src");
  }
  async function mangasPage(url) {
    const document = await fetchHTML(url);
    const mangas = document.select(".manga-item").map((e) => {
      const link = e.selectFirst("a.manga-item__link");
      const img = e.selectFirst("img");
      return { url: relativeUrl(link.absUrl("href")), title: link.ownText(), thumbnailUrl: img ? cover(img) : void 0 };
    });
    return { mangas, hasNextPage: document.selectFirst("a[rel=next]") != null };
  }
  var page = (n) => n === 1 ? "" : `page/${n}/`;
  var capitalizeEach = (text) => text.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  function pageRange(query) {
    const num = Number(query.replace(/\D/g, "")) || -1;
    const clamp = (n = num) => Math.min(9999, Math.max(1, n));
    if (num < 0) return [1, 9999];
    switch (query[0]) {
      case "<":
        return [1, query[1] === "=" ? clamp() : clamp(num + 1)];
      case ">":
        return [clamp(query[1] === "=" ? num : num + 1), 9999];
      case "=":
        return query[1] === ">" ? [clamp(), 9999] : query[1] === "<" ? [1, clamp(9999)] : [clamp(), clamp()];
      default:
        return [clamp(), clamp()];
    }
  }
  async function tagId(tag, type) {
    const taxonomy = type.replace("artist", "manga_artist");
    const data = await fetchJSON(`${baseUrl}/wp-admin/admin-ajax.php?${queryString([["action", "search_manga_terms"], ["search", tag], ["taxonomy", taxonomy]])}`);
    return data.results.find((r) => r.text.toLowerCase() === tag.toLowerCase())?.id;
  }
  var source = {
    info: {
      id: "2299981010822511979",
      name: "HentaiRead",
      lang: "en",
      version: "1.0.2",
      baseUrl,
      supportsLatest: true,
      nsfw: true,
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/hentairead/res/mipmap-xhdpi/ic_launcher.png"
    },
    getPopularManga(n) {
      return mangasPage(`${baseUrl}/hentai/${page(n)}?sortby=views`);
    },
    getLatestUpdates(n) {
      return mangasPage(`${baseUrl}/hentai/${page(n)}?sortby=new`);
    },
    async searchManga(n, query, filters) {
      if (filters.length === 0) filters = this.getFilterList();
      const params = [["s", query], ["title-type", "contains"]];
      for (const filter of filters) {
        if (filter.type === "checkboxes" && filter.id === "types") {
          filter.checked.forEach((value) => params.push(["categories[]", value]));
        } else if (filter.type === "text" && filter.value.trim()) {
          if (filter.id === "pages") {
            const [min, max] = pageRange(filter.value.trim());
            params.push(["pages", `${min}-${max}`]);
          } else if (filter.id === "uploaded") {
            const first = filter.value.trim()[0];
            params.push(["release-type", first === ">" ? "after" : first === "<" ? "before" : "in"], ["release", filter.value.replace(/\D/g, "")]);
          } else {
            for (const raw of filter.value.split(",").filter((t) => t.trim())) {
              const trimmed = raw.trim();
              const name = trimmed.replace(/^-/, "");
              const id = await tagId(name, filter.id);
              if (id == null) throw new Error(`${filter.name} not found: ${name}`);
              if (filter.id === "manga_tag") params.push([trimmed.startsWith("-") ? "excluding[]" : "including[]", String(id)]);
              else params.push([`${filter.id}s[]`, String(id)]);
            }
          }
        } else if (filter.type === "sort") {
          params.push(["sortby", filter.options[filter.selected ?? 0].value], ["order", filter.ascending ? "asc" : "desc"]);
        }
      }
      return mangasPage(`${baseUrl}/page/${n}?${queryString(params)}`);
    },
    async getMangaDetails(manga) {
      const document = await fetchHTML(baseUrl + manga.url);
      const names = (path) => document.select(`a[href*=/${path}/] span:first-of-type`).map((s) => s.text()).join(", ");
      const circles = names("circle");
      const artists = names("artist");
      let description = "";
      for (const [label, path] of [["Characters", "characters"], ["Parodies", "parody"], ["Circles", "circle"], ["Convention", "convention"], ["Scanlators", "scanlator"]]) {
        const value = names(path);
        if (value) description += `${label}: ${capitalizeEach(value)}

`;
      }
      const alternatives = document.selectFirst(".manga-titles h2")?.text();
      if (alternatives) description += `Alternative Titles: 
${alternatives.split("|").map((t) => `- ${t.trim()}`).join("\n")}

`;
      description += `${document.select(".items-center:contains(pages:)").map((e) => e.text()).join(" ")}
`;
      return {
        title: document.selectFirst("h1")?.ownText(),
        thumbnailUrl: document.selectFirst("meta[property=og:image]")?.attr("content") || void 0,
        author: circles || artists || void 0,
        artist: artists || circles || void 0,
        genres: document.select("a[href*=/tag/] span:first-of-type").map((s) => s.text()),
        description,
        status: "completed"
      };
    },
    async getChapterList(manga) {
      const details = await this.getMangaDetails(manga);
      const scanlator = details.description?.includes("Scanlators") ? details.description.split("Scanlators: ")[1]?.split("\n")[0] : void 0;
      return [{ url: manga.url, name: "Chapter", scanlator }];
    },
    async getPageList(chapter) {
      const url = `${chapter.url}english/p/1/`;
      const document = await fetchHTML(url.startsWith("http") ? url : baseUrl + url);
      const extra = document.selectFirst("[id=single-chapter-js-extra]")?.data();
      const pageBase = extra ? JSON.parse(/= (\{[^;]+)/.exec(extra)?.[1] ?? "{}").baseUrl : void 0;
      const before = document.selectFirst("[id=single-chapter-js-before]")?.data();
      const encoded = before ? /.(ey\S+).\s/.exec(before)?.[1] : void 0;
      if (!encoded) throw new Error("Failed to find page list. Non-English entries are not supported.");
      const pages = JSON.parse(utf8Decode(base64Decode(encoded)));
      return pages.data.chapter.images.map((image) => ({ url: `${pageBase}/${image.src}` }));
    },
    getFilterList() {
      const text = (id, name) => ({ type: "text", id, name, value: "" });
      return [
        { type: "sort", id: "sort", name: "Sort by", options: [["Latest", "new"], ["A-Z", "alphabet"], ["Rating", "rating"], ["Views", "views"]].map(([label, value]) => ({ label, value })), selected: 0, ascending: false, listings: { popular: "views", latest: "new" } },
        { type: "checkboxes", id: "types", name: "Types", options: [["Doujinshi", "4"], ["Manga", "52"], ["Artist CG", "4798"], ["Western", "36278"]].map(([label, value]) => ({ label, value })), checked: ["4", "52", "4798", "36278"] },
        { type: "separator", id: "s1" },
        { type: "header", id: "h1", name: "Separate tags with commas (,)" },
        { type: "header", id: "h2", name: "Prepend with dash (-) to exclude [ Only for 'Tags' ]" },
        text("manga_tag", "Tags"),
        { type: "separator", id: "s2" },
        text("artist", "Artists"),
        text("circle", "Circles"),
        text("character", "Characters"),
        text("collection", "Collections"),
        text("scanlator", "Scanlators"),
        text("convention", "Conventions"),
        { type: "separator", id: "s3" },
        { type: "header", id: "h3", name: "Filter by year uploaded, for example: (>2024)" },
        text("uploaded", "Uploaded"),
        { type: "separator", id: "s4" },
        { type: "header", id: "h4", name: "Filter by pages, for example: (>20)" },
        text("pages", "Pages")
      ];
    }
  };
  var index_default = source;
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
