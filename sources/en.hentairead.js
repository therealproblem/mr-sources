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
  function absoluteUrl(path, base) {
    if (/^[a-z][a-z\d+.-]*:/i.test(path)) return path;
    const origin = /^[a-z][a-z\d+.-]*:\/\/[^/?#]*/i.exec(base)?.[0] ?? "";
    if (path.startsWith("//")) return (/^[a-z][a-z\d+.-]*:/i.exec(base)?.[0] ?? "https:") + path;
    if (path.startsWith("/")) return origin + path;
    const directory = base.replace(/[?#].*$/, "").replace(/[^/]*$/, "");
    return directory + path;
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
  function javaDateParser(pattern, locale = "en") {
    const fields = [];
    let source2 = "";
    for (const token of tokenize(pattern)) {
      if (token.literal !== void 0) {
        source2 += token.literal.split(/\s+/).map(escape).join("\\s+");
        continue;
      }
      const { letter, count } = token;
      switch (letter) {
        case "d":
        case "H":
        case "h":
        case "m":
        case "s":
          source2 += count === 1 ? "(\\d{1,2})" : `(\\d{${count}})`;
          fields.push(letter);
          break;
        case "M":
        case "L":
          if (count >= 3) {
            source2 += `(${alternatives(monthNames(locale).map(([name]) => name))})\\.?`;
            fields.push("monthName");
          } else {
            source2 += count === 1 ? "(\\d{1,2})" : "(\\d{2})";
            fields.push("M");
          }
          break;
        case "y":
        case "u":
          source2 += count === 2 ? "(\\d{2})" : "(\\d{4})";
          fields.push(count === 2 ? "yy" : "y");
          break;
        case "a":
          source2 += `(${alternatives(dayPeriods(locale))})`;
          fields.push("a");
          break;
        case "E":
        case "e":
        case "c":
          source2 += `(?:${alternatives(weekdayNames(locale))})`;
          break;
        default:
          source2 += ".*?";
      }
    }
    const regex = new RegExp(source2, "iu");
    return (text) => {
      const match = regex.exec(text.trim());
      if (!match) return void 0;
      let year = 1970, month = 0, day = 1, hour = 0, minute = 0, second = 0;
      let pm;
      fields.forEach((field, index) => {
        const value = match[index + 1];
        switch (field) {
          case "d":
            day = Number(value);
            break;
          case "M":
            month = Number(value) - 1;
            break;
          case "monthName":
            month = monthNames(locale).find(([name]) => name.toLocaleLowerCase(locale) === value.toLocaleLowerCase(locale))?.[1] ?? -1;
            break;
          case "y":
            year = Number(value);
            break;
          case "yy":
            year = 2e3 + Number(value);
            break;
          case "H":
          case "h":
            hour = Number(value);
            break;
          case "m":
            minute = Number(value);
            break;
          case "s":
            second = Number(value);
            break;
          case "a":
            pm = dayPeriods(locale).indexOf(value.toLocaleLowerCase(locale)) % 2 === 1;
            break;
        }
      });
      if (pm !== void 0) hour = hour % 12 + (pm ? 12 : 0);
      if (month < 0 || month > 11 || day < 1 || day > 31) return void 0;
      return Date.UTC(year, month, day, hour, minute, second);
    };
  }
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
  function tokenize(pattern) {
    const tokens = [];
    for (let i = 0; i < pattern.length; ) {
      const char = pattern[i];
      if (char === "'") {
        const end = pattern.indexOf("'", i + 1);
        const text = end < 0 ? pattern.slice(i + 1) : pattern.slice(i + 1, end);
        tokens.push({ literal: text === "" ? "'" : text });
        i = end < 0 ? pattern.length : end + 1;
      } else if (/[a-zA-Z]/.test(char)) {
        let count = 1;
        while (pattern[i + count] === char) count++;
        tokens.push({ letter: char, count });
        i += count;
      } else {
        tokens.push({ literal: char });
        i++;
      }
    }
    return tokens;
  }
  var nameCache = /* @__PURE__ */ new Map();
  function cached(key, make) {
    if (!nameCache.has(key)) nameCache.set(key, make());
    return nameCache.get(key);
  }
  var englishMonths = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  function monthNames(locale) {
    return cached(`months.${locale}`, () => {
      const names = [];
      for (let month = 0; month < 12; month++) {
        const date = new Date(Date.UTC(2021, month, 15));
        for (const style of ["long", "short"]) {
          for (const tag of [locale, "en"]) {
            try {
              names.push([new Intl.DateTimeFormat(tag, { month: style, timeZone: "UTC" }).format(date), month]);
              const parts = new Intl.DateTimeFormat(tag, { day: "numeric", month: style, timeZone: "UTC" }).formatToParts(date);
              const part = parts.find((p) => p.type === "month")?.value;
              if (part) names.push([part, month]);
            } catch {
            }
          }
        }
        names.push([englishMonths[month], month], [englishMonths[month].slice(0, 3), month]);
      }
      const unique = /* @__PURE__ */ new Map();
      for (const [name, month] of names) {
        const clean = name.replace(/\.$/, "").trim();
        if (clean && !/^\d+$/.test(clean)) unique.set(clean, month);
      }
      return [...unique].sort((a, b) => b[0].length - a[0].length);
    });
  }
  function weekdayNames(locale) {
    return cached(`weekdays.${locale}`, () => {
      const names = /* @__PURE__ */ new Set();
      for (let day = 0; day < 7; day++) {
        const date = new Date(Date.UTC(2021, 0, 3 + day));
        for (const style of ["long", "short"]) {
          for (const tag of [locale, "en"]) {
            try {
              names.add(new Intl.DateTimeFormat(tag, { weekday: style, timeZone: "UTC" }).format(date).replace(/\.$/, ""));
            } catch {
            }
          }
        }
      }
      return [...names].sort((a, b) => b.length - a.length);
    });
  }
  function dayPeriods(locale) {
    return cached(`periods.${locale}`, () => {
      const periods = [];
      for (const tag of [locale, "en"]) {
        for (const hour of [9, 21]) {
          try {
            const parts = new Intl.DateTimeFormat(tag, { hour: "numeric", hour12: true, timeZone: "UTC" }).formatToParts(new Date(Date.UTC(2021, 0, 1, hour)));
            periods.push((parts.find((p) => p.type === "dayPeriod")?.value ?? (hour < 12 ? "am" : "pm")).toLocaleLowerCase(locale));
          } catch {
            periods.push(hour < 12 ? "am" : "pm");
          }
        }
      }
      return periods;
    });
  }
  function alternatives(list) {
    return list.map((item) => item.split(/\s+/).map(escape).join("\\s+")).join("|");
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
  var uploadedDate = javaDateParser("MMMM d, yyyy h:mm a", "en");
  function cover(img) {
    if (img.hasAttr("data-src")) return img.absUrl("data-src");
    if (img.hasAttr("data-lazy-src")) return img.absUrl("data-lazy-src");
    if (img.hasAttr("srcset")) return absoluteUrl(img.attr("srcset").trim().split(/\s+/)[0].replace(/,$/, ""), baseUrl);
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
  function details(document) {
    const names = (path) => document.select(`a[href*=/${path}/] span:first-of-type`).map((s) => s.text()).join(", ");
    const circles = names("circle");
    const artists = names("artist");
    let description = "";
    for (const [label, path] of [["Characters", "characters"], ["Parodies", "parody"], ["Circles", "circle"], ["Convention", "convention"], ["Scanlators", "scanlator"]]) {
      const value = names(path);
      if (value) description += `${label}: ${capitalizeEach(value)}

`;
    }
    const alternatives2 = document.selectFirst(".manga-titles h2")?.text();
    if (alternatives2) description += `Alternative Titles: 
${alternatives2.split("|").map((t) => `- ${t.trim()}`).join("\n")}

`;
    const uploaded = document.selectFirst(".text-primary:contains(uploaded:) + div")?.text();
    if (uploaded) description += `Uploaded: ${uploaded}

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
  }
  var source = {
    info: {
      id: "2299981010822511979",
      name: "HentaiRead",
      lang: "en",
      version: "1.0.5",
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
      return details(await fetchHTML(baseUrl + manga.url));
    },
    async getChapterList(manga) {
      const document = await fetchHTML(baseUrl + manga.url);
      const description = details(document).description;
      const scanlator = description?.includes("Scanlators") ? description.split("Scanlators: ")[1]?.split("\n")[0] : void 0;
      const dateUpload = description?.includes("Uploaded") ? uploadedDate(description.split("Uploaded: ")[1]?.split("\n")[0] ?? "") : void 0;
      const showCollections = Honya.prefs.get("pref_show_collections") !== false;
      const title = document.selectFirst("div.manga-titles h1")?.text() ?? "";
      const chapter = (number, url, name) => ({ url, name: showCollections ? `${number} - ${name || title}` : "Chapter", chapterNumber: number, scanlator, dateUpload });
      const collection = showCollections ? document.selectFirst("div.collection-listing > div") : void 0;
      if (!collection) return [chapter(1, manga.url, title)];
      const chapters = collection.select("div.manga-item").flatMap((element) => {
        const link = element.selectFirst("a.manga-item__link");
        const number = Number.parseFloat(element.selectFirst("div.collection-badge")?.text() ?? "");
        return link ? [chapter(Number.isNaN(number) ? 1 : number, link.absUrl("href"), link.text())] : [];
      });
      return chapters.sort((a, b) => (b.chapterNumber ?? 0) - (a.chapterNumber ?? 0));
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
