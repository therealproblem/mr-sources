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

  // src/all/manhwa18cc/index.ts
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

  // sdk/dates.ts
  function javaDateParser(pattern, locale = "en") {
    const fields = [];
    let source = "";
    for (const token of tokenize(pattern)) {
      if (token.literal !== void 0) {
        source += token.literal.split(/\s+/).map(escape).join("\\s+");
        continue;
      }
      const { letter, count } = token;
      switch (letter) {
        case "d":
        case "H":
        case "h":
        case "m":
        case "s":
          source += count === 1 ? "(\\d{1,2})" : `(\\d{${count}})`;
          fields.push(letter);
          break;
        case "M":
        case "L":
          if (count >= 3) {
            source += `(${alternatives(monthNames(locale).map(([name]) => name))})\\.?`;
            fields.push("monthName");
          } else {
            source += count === 1 ? "(\\d{1,2})" : "(\\d{2})";
            fields.push("M");
          }
          break;
        case "y":
        case "u":
          source += count === 2 ? "(\\d{2})" : "(\\d{4})";
          fields.push(count === 2 ? "yy" : "y");
          break;
        case "a":
          source += `(${alternatives(dayPeriods(locale))})`;
          fields.push("a");
          break;
        case "E":
        case "e":
        case "c":
          source += `(?:${alternatives(weekdayNames(locale))})`;
          break;
        default:
          source += ".*?";
      }
    }
    const regex = new RegExp(source, "iu");
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

  // themes/yiimadara.ts
  var defaultSortOptions = [["Default", ""], ["Trending", "trending"], ["Newest", "latest"], ["Rating", "rating"], ["A-Z", "alphabet"]];
  var longDate = javaDateParser("dd MMM yyyy", "en");
  var shortDate = javaDateParser("dd MMM yy", "en");
  var parseChapterDate = (text) => text ? longDate(text) ?? shortDate(text) : void 0;
  var imgUrl = (img) => img ? img.absUrl("data-src") || img.absUrl("src") || void 0 : void 0;
  var isRaw = (manga) => manga.url.replace(/\/+$/, "").endsWith("-raw") || / raw$/i.test(manga.title);
  function yiiMadara(o) {
    const { info } = o;
    const baseUrl = info.baseUrl.replace(/\/$/, "");
    const directoryPath = o.directoryPath ?? "manga";
    const completedPath = o.completedPath === void 0 ? "completed" : o.completedPath;
    const rawPath = o.rawPath ?? null;
    const rawEntries = o.rawEntries ?? (info.lang === "en" ? "hide" : info.lang === "ko" ? "only" : "show");
    const sortOptions = o.sortOptions ?? defaultSortOptions;
    const get = (url) => fetchHTML({ url, headers: { Referer: `${baseUrl}/` } });
    function listUrl(path, page, order) {
      const url = `${baseUrl}/${path}${o.pageSegment ? "/page" : ""}/${page}${o.trailingSlash ? "/" : ""}`;
      return order ? `${url}?${queryString([["orderby", order]])}` : url;
    }
    function parseList(document, rawListing = false) {
      const mangas = document.select("div.page-item, div.page-item-detail, div.home-item, div.manga-item").flatMap((element) => {
        const link = element.selectFirst("h3 a");
        if (!link) return [];
        return [{ url: relativeUrl(link.absUrl("href")), title: link.text(), thumbnailUrl: imgUrl(element.selectFirst("img")) }];
      });
      const kept = rawEntries === "show" || rawListing ? mangas : mangas.filter((manga) => isRaw(manga) === (rawEntries === "only"));
      return { mangas: kept, hasNextPage: document.selectFirst("#blog-pager li.next a") != null };
    }
    async function listing(path, page, order) {
      return parseList(await get(listUrl(path, page, order)), path === rawPath);
    }
    function details(document) {
      const info2 = (label) => {
        const startsWithLabel = (text) => text.toLowerCase().startsWith(label.toLowerCase());
        const item = document.select(".post-content_item").find((e) => {
          const head = e.children().find((c) => c.is(".summary-heading") || c.is("b"));
          return head ? startsWithLabel(head.text()) : false;
        });
        if (!item) return document.select(".minfo").find((e) => startsWithLabel(e.ownText()))?.children().filter((c) => c.is("i")) ?? [];
        const content = item.children().filter((c) => c.is(".summary-content"));
        return content.length > 0 ? content : item.children().filter((c) => !c.is("b"));
      };
      const value = (elements) => {
        const text = elements.map((e) => e.text()).join(" ");
        return text && text !== "Updating" && text !== "N/A" ? text : void 0;
      };
      const names = (elements) => {
        const links = elements.flatMap((e) => e.select("a"));
        const list = links.length > 0 ? links.map((a) => a.text()) : [value(elements)];
        return list.filter((name) => !!name && name !== "Updating");
      };
      const heading = document.selectFirst(".post-title h1");
      const synopsisBlock = document.selectFirst(".dsct, .ss-manga, .post-content_item .entry-content");
      const synopsis = synopsisBlock ? (synopsisBlock.select("p").length > 0 ? synopsisBlock.select("p") : [synopsisBlock]).map((p) => p.text().trim()).filter(Boolean).join("\n\n") : "";
      const alternative = value(info2("Alternative"));
      const type = value(info2("Type"));
      const statusText = info2("Status").map((e) => e.text()).join(" ").toLowerCase();
      const status = statusText === "ongoing" ? "ongoing" : statusText === "completed" ? "completed" : "unknown";
      return {
        // Some sites put an "18+" badge inside the heading.
        title: heading ? heading.ownText().trim() || heading.text() : void 0,
        thumbnailUrl: imgUrl(document.selectFirst(".summary_image img")),
        author: names(info2("Author")).join(", ") || void 0,
        artist: names(info2("Artist")).join(", ") || void 0,
        genres: [...names(info2("Genre")), ...type ? [type] : []],
        status,
        description: [synopsis, alternative ? `Alternative names: ${alternative}` : ""].filter(Boolean).join("\n\n") || void 0
      };
    }
    function chapterUrl(chapter) {
      if (chapter.url.startsWith("/")) return baseUrl + chapter.url;
      let mangaPath;
      try {
        mangaPath = JSON.parse(chapter.sourceData ?? "{}").mangaPath;
      } catch {
      }
      if (typeof mangaPath !== "string" || !mangaPath) throw new Error("Refresh the chapter list.");
      return `${baseUrl}${mangaPath.replace(/\/+$/, "")}/${chapter.url}`;
    }
    function filterList(data) {
      const genres = o.genres ?? (Array.isArray(data) ? data.filter((g) => Array.isArray(g) && typeof g[0] === "string" && typeof g[1] === "string") : []);
      const categories = [];
      if (completedPath) categories.push(["Completed", completedPath]);
      if (rawPath) categories.push(["Raw", rawPath]);
      const select = (id, name, pairs) => ({ type: "select", id, name, options: pairs.map(([label, value]) => ({ label, value })), selected: 0 });
      const has = (order) => sortOptions.some(([, value]) => value === order) ? order : void 0;
      const list = [{ type: "header", id: "note", name: "Ignored when using text search; Genre takes priority over Category" }];
      if (genres.length > 0) list.push(select("genre", "Genre", [["All", ""], ...genres]));
      if (categories.length > 0) list.push(select("category", "Category", [["All", ""], ...categories]));
      list.push({ ...select("sort", "Sort by", sortOptions), listings: { popular: has("trending"), latest: has("") } });
      return list;
    }
    const source = {
      info: { ...info, supportsLatest: true },
      getPopularManga(page) {
        return listing(directoryPath, page, "trending");
      },
      getLatestUpdates(page) {
        return listing(directoryPath, page, "");
      },
      async searchManga(page, query, filters) {
        if (query.trim()) {
          const params = queryString([[o.searchParam ?? "q", query.replace(/'/g, "’")], ["page", page]]);
          return parseList(await get(`${baseUrl}/search${o.trailingSlash ? "/" : ""}?${params}`));
        }
        const selected = (id) => {
          const f = filters.find((x) => x.id === id);
          return f?.type === "select" ? f.options[f.selected]?.value ?? "" : "";
        };
        return listing(selected("genre") || selected("category") || directoryPath, page, selected("sort"));
      },
      async getMangaDetails(manga) {
        return details(await get(baseUrl + manga.url));
      },
      async getChapterList(manga) {
        const document = await get(baseUrl + manga.url);
        return document.select("ul.row-content-chapter li").flatMap((element) => {
          const link = element.selectFirst("a");
          if (!link) return [];
          return [{ url: relativeUrl(link.absUrl("href")), name: link.text(), dateUpload: parseChapterDate(element.selectFirst(".chapter-time")?.text()) }];
        });
      },
      async getPageList(chapter) {
        const document = await get(chapterUrl(chapter));
        return document.select(".read-content img").flatMap((img) => {
          const url = imgUrl(img);
          return url ? [{ url }] : [];
        });
      },
      getFilterList(data) {
        return filterList(data);
      }
    };
    if (!o.genres) {
      source.fetchFilterData = async () => {
        const seen = /* @__PURE__ */ new Set();
        const genres = (await get(baseUrl)).select("a[href*=genre/]").flatMap((a) => {
          const path = (/^[a-z][a-z\d+.-]*:\/\/[^/?#]*([^?#]*)/i.exec(a.absUrl("href"))?.[1] ?? "").replace(/^\/+|\/+$/g, "");
          return path && !seen.has(path) && seen.add(path) ? [[a.text(), path]] : [];
        });
        return genres.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
      };
    }
    return source;
  }

  // src/all/manhwa18cc/index.ts
  var languages = [["4841602236575491202", "en"], ["6864643444164576223", "ko"], ["993336618407081332", "all"]];
  var index_default = languages.map(([id, lang]) => yiiMadara({
    info: {
      id,
      name: "Manhwa18.cc",
      lang,
      version: "1.2.0",
      baseUrl: "https://manhwa18.cc",
      nsfw: true,
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/manhwa18cc/res/mipmap-xhdpi/ic_launcher.png"
    },
    directoryPath: lang === "ko" ? "raw" : "webtoons",
    rawPath: "raw"
  }));
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
