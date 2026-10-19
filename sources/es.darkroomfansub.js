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

  // src/es/darkroomfansub/index.ts
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
  async function fetchPage(request) {
    const response = await send(request);
    return { document: Honya.parseHTML(response.body, response.url), url: response.url };
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

  // themes/zeistmanga.ts
  var maxMangaResults = 20;
  var maxChapterResults = 150;
  var chapterChunk = 50;
  var statusWords = [
    ["ongoing", ["ongoing", "en curso", "en emisión", "em lançamento", "activo", "ativo", "lançando", "مستمر", "مستمرة"]],
    ["completed", ["completed", "completo", "finalizado", "مكتمل", "مكتملة"]],
    ["onHiatus", ["hiatus", "pausado"]],
    ["cancelled", ["cancelled", "dropped", "dropado", "abandonado", "cancelado"]]
  ];
  var parseStatus = (text) => statusWords.find(([, words2]) => words2.includes(text.toLowerCase().trim()))?.[0] ?? "unknown";
  var statusOptions = [["All", ""], ["Ongoing", "Ongoing"], ["Completed", "Completed"], ["Dropped", "Dropped"], ["Upcoming", "Upcoming"], ["Hiatus", "Hiatus"], ["Cancelled", "Cancelled"]];
  var typeOptions = [["All", ""], ["Manga", "Manga"], ["Manhua", "Manhua"], ["Manhwa", "Manhwa"], ["Novel", "Novel"], ["Web Novel (JP)", "Web Novel (JP)"], ["Web Novel (KR)", "Web Novel (KR)"], ["Web Novel (CN)", "Web Novel (CN)"], ["Doujinshi", "Doujinshi"]];
  var languageOptions = [["All", ""], ["Indonesian", "Indonesian"], ["English", "English"]];
  var genres = [
    "Action",
    "Adventure",
    "Comedy",
    "Crime",
    "Drama",
    "Ecchi",
    "Fantasy",
    "Harem",
    "Historical",
    "Horror",
    "Isekai",
    "Josei",
    "Magic",
    "Martial Arts",
    "Medical",
    "Military",
    "Music",
    "Mystery",
    "One Shot",
    "Police",
    "Psychological",
    "Reincarnation",
    "Revenge",
    "Romance",
    "School Life",
    "Sci-Fi",
    "Seinen",
    "Shounen",
    "Slice of Life",
    "Sports",
    "Supernatural",
    "Survival",
    "Thriller",
    "Time Travel",
    "Tragedy",
    "Vampire"
  ];
  var options = (list) => list.map(([label, value]) => ({ label, value }));
  function zeistmanga(o) {
    const { info } = o;
    const baseUrl = info.baseUrl.replace(/\/$/, "");
    const supportsLatest = o.supportsLatest ?? true;
    const mangaCategory = o.mangaCategory ?? "Series";
    const chapterCategory = o.chapterCategory ?? "Chapter";
    const excluded = o.excludedCategories ?? ["Anime", "Novel", "Novela"];
    const supportsChapterFeed = o.supportsChapterFeed ?? true;
    const useNewChapterFeed = o.useNewChapterFeed ?? false;
    const useOldChapterFeed = o.useOldChapterFeed ?? false;
    const dateParser = javaDateParser(o.chapterDateFormat?.pattern ?? "yyyy-MM-dd", o.chapterDateFormat?.locale ?? "en");
    const s = {
      popularMangaSelector: o.popularMangaSelector ?? "div.PopularPosts div.grid > figure",
      popularMangaSelectorTitle: o.popularMangaSelectorTitle ?? "figcaption > a",
      popularMangaSelectorUrl: o.popularMangaSelectorUrl ?? "figcaption > a",
      details: o.mangaDetailsSelector ?? ".grid.gtc-235fr",
      thumbnail: o.mangaDetailsSelectorThumbnail ?? "img",
      description: o.mangaDetailsSelectorDescription ?? "#synopsis",
      genres: o.mangaDetailsSelectorGenres ?? "div.mt-15 > a[rel=tag]",
      author: o.mangaDetailsSelectorAuthor ?? "span#author",
      artist: o.mangaDetailsSelectorArtist ?? "span#artist",
      altName: o.mangaDetailsSelectorAltName ?? "header > p",
      status: o.mangaDetailsSelectorStatus ?? "span[data-status]",
      info: o.mangaDetailsSelectorInfo ?? ".y6x11p",
      infoTitle: o.mangaDetailsSelectorInfoTitle ?? "strong",
      infoDescription: o.mangaDetailsSelectorInfoDescription ?? "span.dt",
      script: o.scriptSelector ?? "#clwd > script",
      pages: o.pageListSelector ?? "div.check-box div.separator"
    };
    const feedUrl = (labels, params = []) => `${baseUrl}/feeds/posts/default/-/${labels.map(encodeURIComponent).join("/")}?${queryString([["alt", "json"], ...params])}`;
    const alternate = (entry) => entry.link?.find((l) => l.rel === "alternate")?.href ?? "";
    const withoutBase = (url) => url.startsWith(baseUrl) ? url.slice(baseUrl.length) : relativeUrl(url);
    function thumbnail(entry) {
      const url = entry["media$thumbnail"]?.url;
      if (url) return url.replace(/\/s.+?-c\//, "/w600/").replace(/=s(?!.*=s).+?-c$/, "=w600");
      const html = entry.content?.$t;
      return html ? Honya.parseHTML(html).selectFirst("img")?.attr("src") || void 0 : void 0;
    }
    function feedPage(feed) {
      const mangas = (feed.feed?.entry ?? []).filter((e) => e.category?.some((c) => c.term === mangaCategory) && !e.category.some((c) => excluded.includes(c.term))).flatMap((e) => e.title ? [{ url: withoutBase(alternate(e)), title: e.title.$t, thumbnailUrl: thumbnail(e) }] : []);
      if (mangas.length === maxMangaResults + 1) return { mangas: mangas.slice(0, -1), hasNextPage: true };
      return { mangas, hasNextPage: false };
    }
    const startIndex = (page) => maxMangaResults * (page - 1) + 1;
    async function latest(page) {
      return feedPage(await fetchJSON(feedUrl([mangaCategory], [["orderby", "published"], ["max-results", maxMangaResults + 1], ["start-index", startIndex(page)]])));
    }
    function parseDate(text) {
      if (!text) return void 0;
      const iso = Date.parse(text);
      if (!Number.isNaN(iso) && text.includes("T")) return iso;
      return dateParser(text) ?? (Number.isNaN(iso) ? void 0 : iso);
    }
    const isValid = (memo) => !!memo?.url && memo.old === useOldChapterFeed && memo.new === useNewChapterFeed && memo.category === chapterCategory;
    function chapterFeedUrl(document, title) {
      if (useNewChapterFeed) return newChapterFeedUrl(document);
      if (useOldChapterFeed) return oldChapterFeedUrl(document);
      let feed;
      try {
        const script = document.selectFirst(s.script);
        if (!script) {
          try {
            return oldChapterFeedUrl(document);
          } catch {
            return newChapterFeedUrl(document);
          }
        }
        const found = /clwd\.run\(["'](.*?)["']\)/.exec(script.html())?.[1];
        if (!found) throw new Error("Failed to find chapter feed");
        feed = found;
      } catch {
        feed = title;
      }
      return feedUrl([chapterCategory, ...feed.split("/").filter(Boolean)]);
    }
    function oldChapterFeedUrl(document) {
      const src = document.selectFirst("#myUL > script")?.attr("src");
      const feed = /([^']+)\?/.exec(src ?? "")?.[1];
      if (!feed) throw new Error("Failed to find chapter feed");
      return `${baseUrl}${feed}?alt=json`;
    }
    function newChapterFeedUrl(document) {
      let script = document.selectFirst(s.script);
      let pattern = /clwd\.run\(["'](.*?)["']\)/;
      if (!script) {
        script = document.selectFirst("#latest > script");
        pattern = /label\s*=\s*'([^']+)'/;
      }
      const feed = script ? pattern.exec(script.html())?.[1] : void 0;
      if (!feed) throw new Error("Failed to find chapter feed");
      return feedUrl([feed], [["start-index", 1], ["max-results", 999999]]);
    }
    async function chapters(url) {
      const page = (start, max) => {
        const withoutPaging = url.replace(/([?&])(start-index|max-results)=[^&]*&?/g, "$1").replace(/[?&]$/, "");
        return fetchJSON(`${withoutPaging}${withoutPaging.includes("?") ? "&" : "?"}start-index=${start}&max-results=${max}`);
      };
      const first = await page(1, maxChapterResults);
      if (!first.feed?.entry) throw new Error("Failed to parse from chapter API");
      const total = Number(first.feed["openSearch$totalResults"]?.$t) || maxChapterResults;
      const perPage = Number(first.feed["openSearch$itemsPerPage"]?.$t) || chapterChunk;
      const starts = [];
      for (let start = first.feed.entry.length; start < total; start += perPage) starts.push(start + 1);
      const rest = await mapLimit(starts, 4, async (start) => (await page(start, perPage)).feed?.entry ?? []);
      return [...first.feed.entry, ...rest.flat()].filter((e) => e.category?.some((c) => c.term === chapterCategory)).map((e) => {
        const updated = e.updated?.$t.trim(), published = e.published?.$t.trim();
        return { url: withoutBase(alternate(e)), name: e.title?.$t ?? "", dateUpload: parseDate(o.preferChapterUpdatedDate ? updated ?? published : published ?? updated) };
      });
    }
    function details(document) {
      const profile = document.selectFirst(s.details);
      if (!profile) throw new Error("Couldn't find the series details on its page.");
      let description = profile.select(s.description).map((e) => e.text()).join(" ");
      const alternative = profile.selectFirst(s.altName)?.text();
      if (alternative?.trim()) description += `

Alternative names: ${alternative}`;
      let author = profile.selectFirst(s.author)?.text();
      let artist = profile.selectFirst(s.artist)?.text();
      let status = parseStatus(profile.selectFirst(s.status)?.text() ?? "");
      for (const element of profile.select(s.info)) {
        const title = element.ownText().trim() || element.selectFirst(s.infoTitle)?.text().trim() || "";
        const text = element.select(s.infoDescription).map((e) => e.text()).join(" ").trim();
        if (status === "unknown" && ["Status", "Estado", "الحالة"].some((w) => title.includes(w))) status = parseStatus(text);
        else if (author === void 0 && ["Author", "Autor", "Mangaka", "الكاتب", "Yazar"].some((w) => title.includes(w))) author = text;
        else if (artist === void 0 && ["Artist", "Artista", "الرسام", "Çizer"].some((w) => title.includes(w))) artist = text;
      }
      return {
        thumbnailUrl: profile.selectFirst(s.thumbnail)?.absUrl("src") || void 0,
        description: description.trim() || void 0,
        genres: profile.select(s.genres).map((g) => g.text()),
        author,
        artist,
        status
      };
    }
    return {
      info: { ...info, supportsLatest },
      async getPopularManga(page) {
        if (!supportsLatest) return latest(page);
        const { document } = await fetchPage(baseUrl);
        const mangas = document.select(s.popularMangaSelector).flatMap((element) => {
          const title = element.selectFirst(s.popularMangaSelectorTitle)?.text();
          const href = element.selectFirst(s.popularMangaSelectorUrl)?.absUrl("href");
          if (!title || !href) return [];
          return [{ url: relativeUrl(href), title, thumbnailUrl: element.selectFirst("img")?.absUrl("src") || void 0 }];
        });
        return { mangas, hasNextPage: false };
      },
      getLatestUpdates: latest,
      async searchManga(page, query, filters) {
        if (query.trim()) {
          const url = feedUrl([mangaCategory], [["max-results", maxMangaResults + 1], ["start-index", startIndex(page)]]);
          return feedPage(await fetchJSON(`${url}&q=label:${mangaCategory}+${encodeURIComponent(query)}`));
        }
        const labels = [mangaCategory];
        for (const filter of filters) {
          if (filter.type === "select" && ["status", "type", "language"].includes(filter.id)) labels.push(filter.options[filter.selected]?.value ?? "");
          if (filter.type === "checkboxes" && filter.id === "genres") labels.push(...filter.checked);
        }
        return feedPage(await fetchJSON(feedUrl(labels)));
      },
      async getMangaDetails(manga) {
        const { document } = await fetchPage(baseUrl + manga.url);
        const result = details(document);
        try {
          const url = chapterFeedUrl(document, manga.title);
          result.sourceData = JSON.stringify({ feedUrl: { url, old: useOldChapterFeed, new: useNewChapterFeed, category: chapterCategory } });
        } catch {
        }
        return result;
      },
      async getChapterList(manga) {
        let memo = {};
        try {
          memo = JSON.parse(manga.sourceData ?? "{}") ?? {};
        } catch {
        }
        if (supportsChapterFeed && isValid(memo.feedUrl)) return chapters(memo.feedUrl.url);
        const { document } = await fetchPage(baseUrl + manga.url);
        return chapters(chapterFeedUrl(document, manga.title));
      },
      async getPageList(chapter) {
        const { document } = await fetchPage(baseUrl + chapter.url);
        return document.select(s.pages).flatMap((e) => e.select("img[src]")).map((img) => ({ url: img.absUrl("src") }));
      },
      getFilterList() {
        if (!o.hasFilters) return [];
        const list = [
          { type: "header", id: "warning", name: "Filters are ignored when searching by text" },
          { type: "separator", id: "separator" }
        ];
        if (o.hasStatusFilter ?? true) list.push({ type: "select", id: "status", name: "Status", options: options(statusOptions), selected: 0 });
        if (o.hasTypeFilter ?? true) list.push({ type: "select", id: "type", name: "Type", options: options(typeOptions), selected: 0 });
        if (o.hasLanguageFilter ?? true) list.push({ type: "select", id: "language", name: "Language", options: options(languageOptions), selected: 0 });
        if (o.hasGenreFilter ?? true) list.push({ type: "checkboxes", id: "genres", name: "Genre", options: genres.map((g) => ({ label: g, value: g })), checked: [] });
        return list;
      }
    };
  }

  // src/es/darkroomfansub/index.ts
  var index_default = zeistmanga({
    info: {
      id: "2769673412724723872",
      name: "Dark Room Fansub",
      lang: "es",
      version: "1.0.2",
      baseUrl: "https://lector-darkroomfansub.blogspot.com",
      nsfw: true,
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/es/darkroomfansub/res/mipmap-xhdpi/ic_launcher.png",
      rateLimits: [{ host: "lector-darkroomfansub.blogspot.com", permits: 3, periodMs: 1e3 }]
    },
    supportsLatest: false,
    mangaDetailsSelector: "#main",
    pageListSelector: "article#reader div.separator",
    mangaDetailsSelectorDescription: "#synopsis",
    mangaDetailsSelectorGenres: "a[rel=tag]",
    mangaDetailsSelectorInfoTitle: "dt",
    mangaDetailsSelectorInfoDescription: "dd",
    mangaDetailsSelectorInfo: "#extra-info > dl"
  });
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
