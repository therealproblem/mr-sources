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

  // src/en/weebcentral/index.ts
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

  // src/en/weebcentral/filters.ts
  function filterList(sort) {
    const sortOptions = options("Best Match", "Alphabet", "Popularity", "Subscribers", "Recently Added", "Latest Updates");
    const anyTrueFalse = options("Any", "True", "False");
    return [
      { type: "select", id: "sort", name: "Sort", options: sortOptions, selected: Math.max(0, sortOptions.findIndex((o) => o.value === sort)), listings: { popular: "Popularity", latest: "Latest Updates" } },
      { type: "select", id: "order", name: "Sort Order", options: options("Descending", "Ascending"), selected: 0 },
      { type: "select", id: "official", name: "Official Translation", options: anyTrueFalse, selected: 0 },
      { type: "select", id: "anime", name: "Anime Adaptation", options: anyTrueFalse, selected: 0 },
      { type: "select", id: "adult", name: "Adult Content", options: anyTrueFalse, selected: 0 },
      { type: "text", id: "author", name: "Author (Case-sensitive)", value: "" },
      { type: "checkboxes", id: "included_status", name: "Series Status", options: options("Ongoing", "Complete", "Hiatus", "Canceled"), checked: [] },
      { type: "checkboxes", id: "included_type", name: "Series Type", options: options("Manga", "Manhwa", "Manhua", "OEL"), checked: [] },
      { type: "tristates", id: "tag", name: "Tags", options: tags, included: [], excluded: [] }
    ];
  }
  function queryParams(filters) {
    return filters.flatMap((filter) => {
      switch (filter.type) {
        case "select": {
          const option = filter.options[filter.selected];
          return option ? [[filter.id, option.value]] : [];
        }
        case "text":
          return filter.value ? [[filter.id, filter.value]] : [];
        case "checkboxes":
          return filter.options.filter((o) => filter.checked.includes(o.value)).map((o) => [filter.id, o.value]);
        case "tristates":
          return filter.options.flatMap((o) => {
            if (filter.included.includes(o.value)) return [[`included_${filter.id}`, o.value]];
            if (filter.excluded.includes(o.value)) return [[`excluded_${filter.id}`, o.value]];
            return [];
          });
        default:
          return [];
      }
    });
  }
  function options(...values) {
    return values.map((value) => ({ label: value, value }));
  }
  var tags = options(
    "Action",
    "Adult",
    "Adventure",
    "Comedy",
    "Doujinshi",
    "Drama",
    "Ecchi",
    "Fantasy",
    "Gender Bender",
    "Harem",
    "Hentai",
    "Historical",
    "Horror",
    "Isekai",
    "Josei",
    "Lolicon",
    "Martial Arts",
    "Mature",
    "Mecha",
    "Mystery",
    "Psychological",
    "Romance",
    "School Life",
    "Sci-fi",
    "Seinen",
    "Shotacon",
    "Shoujo",
    "Shoujo Ai",
    "Shounen",
    "Shounen Ai",
    "Slice of Life",
    "Smut",
    "Sports",
    "Supernatural",
    "Tragedy",
    "Yaoi",
    "Yuri",
    "Other"
  );

  // src/en/weebcentral/index.ts
  var baseUrl = "https://weebcentral.com";
  var fetchLimit = 32;
  var source = {
    info: {
      id: "2131019126180322627",
      // Same as Mihon: md5("weeb central/en/1")
      name: "Weeb Central",
      lang: "en",
      version: "1.0.2",
      baseUrl,
      supportsLatest: true,
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/weebcentral/res/mipmap-xhdpi/ic_launcher.png",
      rateLimits: [{ host: "weebcentral.com", permits: 1, periodMs: 2e3 }],
      imageHeaders: { Accept: "image/avif,image/webp,*/*" }
    },
    // Popular / Latest / Search
    getPopularManga(page) {
      return this.searchManga(page, "", filterList("Popularity"));
    },
    getLatestUpdates(page) {
      return this.searchManga(page, "", filterList("Latest Updates"));
    },
    async searchManga(page, query, filters) {
      const text = query.replace(/[!#:(),-]/g, " ").trim();
      const params = [
        ["text", text],
        ...queryParams(filters.length > 0 ? filters : filterList()),
        ["limit", fetchLimit],
        ["offset", (page - 1) * fetchLimit],
        ["display_mode", "Full Display"]
      ];
      const document = await fetchHTML(`${baseUrl}/search/data?${queryString(params)}`);
      const mangas = document.select("article > section > a").map((element) => {
        const title = element.selectFirst("div:not([class]):last-child")?.text();
        if (title == null) throw new Error("search result without a title");
        return { url: relativeUrl(element.attr("abs:href")), title, thumbnailUrl: cover(element) };
      });
      return { mangas, hasNextPage: document.selectFirst("button") != null };
    },
    // Details
    async getMangaDetails(manga) {
      const document = await fetchHTML(baseUrl + manga.url);
      const sections = document.select("section[x-data] > section");
      if (sections.length < 2) throw new Error("series page layout changed");
      const [info, body] = sections;
      return {
        thumbnailUrl: cover(info) ?? manga.thumbnailUrl,
        author: info.select("ul > li:has(strong:contains(Author)) > span > a").map((a) => a.text()).join(", "),
        genres: info.select("ul > li:has(strong:contains(Tag),strong:contains(Type)) a").map((a) => a.text()),
        status: parseStatus(info.selectFirst("ul > li:has(strong:contains(Status)) > a")?.text()),
        title: body.selectFirst("h1")?.text(),
        description: description(body, document)
      };
    },
    // Chapters
    async getChapterList(manga) {
      const id = manga.url.split("/").filter(Boolean)[1];
      if (!id) throw new Error(`unexpected series URL ${manga.url}`);
      const document = await fetchHTML(`${baseUrl}/series/${id}/full-chapter-list`);
      const elements = document.select("div[x-data] > a");
      return elements.map((element, index) => {
        const name = element.selectFirst("span.flex > span")?.text();
        if (name == null) throw new Error("chapter without a name");
        const usesSeasons = /(Season|S)\s*\d+/i.test(name);
        const isOfficial = element.select("img").some((img) => img.attr("src").toLowerCase().includes("official"));
        const datetime = element.selectFirst("time[datetime]")?.attr("datetime");
        return {
          url: relativeUrl(element.attr("abs:href")),
          name,
          dateUpload: datetime ? Date.parse(datetime) || void 0 : void 0,
          // Left out otherwise: the app reads it from the name.
          chapterNumber: usesSeasons ? elements.length - index : void 0,
          scanlator: isOfficial ? "Official" : "Unknown"
        };
      });
    },
    // Pages
    async getPageList(chapter) {
      const document = await fetchHTML(`${baseUrl}${chapter.url}/images?is_prev=False&reading_style=long_strip`);
      return document.select("section[x-data~=scroll] > img").map((img) => ({ url: img.attr("abs:src") }));
    },
    getFilterList() {
      return filterList();
    }
  };
  var index_default = source;
  function cover(element) {
    const srcset = element.selectFirst("source")?.attr("srcset");
    if (srcset) return srcset.replaceAll("small", "normal");
    return element.selectFirst("img")?.attr("abs:src") || void 0;
  }
  function parseStatus(text) {
    switch (text?.toLowerCase()) {
      case "ongoing":
        return "ongoing";
      case "complete":
        return "completed";
      case "hiatus":
        return "onHiatus";
      case "canceled":
        return "cancelled";
      default:
        return "unknown";
    }
  }
  function description(body, document) {
    let text = "";
    const summary = body.selectFirst("li:has(strong:contains(Description)) > p")?.text();
    if (summary != null) {
      text += summary.replaceAll("NOTE: ", "\n\nNOTE: ");
    }
    const related = body.select("li:has(strong:contains(Related Series)) li");
    if (related.length > 0) {
      text += "\n\nRelated Series(s):";
      for (const series of related) {
        const link = series.selectFirst("a");
        if (!link) continue;
        const relation = series.selectFirst("span")?.text() ?? "";
        text += `
- [${link.text()}](${link.attr("abs:href")}) ${relation}`.trimEnd();
      }
    }
    const alternateTitles = body.select("li:has(strong:contains(Associated Name)) li");
    if (alternateTitles.length > 0) {
      text += "\n\nAssociated Name(s):";
      for (const title of alternateTitles) {
        text += `
- ${title.text()}`;
      }
    }
    const trackers = document.select("li:has(strong:contains(Track)) span[data-tip] > a");
    if (trackers.length > 0) {
      text += "\n\nTracker(s):";
      for (const tracker of trackers) {
        const name = tracker.parent()?.attr("data-tip") ?? "";
        text += `
- [${name}](${tracker.attr("abs:href")})`;
      }
    }
    return text.trim();
  }
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
