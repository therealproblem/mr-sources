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

  // src/all/manga18me/index.ts
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
  function parseDate(text) {
    if (!text) return void 0;
    const time = Date.parse(text);
    return Number.isNaN(time) ? void 0 : time;
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

  // src/all/manga18me/index.ts
  var baseUrl = "https://manga18.me";
  var headers = { Referer: `${baseUrl}/` };
  function makeSource([id, lang]) {
    const get = (url) => fetchHTML({ url, headers });
    function parseList(document) {
      let entries = document.select("div.page-item-detail");
      const hasNextPage = document.selectFirst(".next") != null;
      if (lang === "en") {
        const heading = document.selectFirst("div.section-heading h1")?.text().toLowerCase() ?? "";
        const canonical = document.selectFirst("div.canonical")?.attr("href") ?? "";
        entries = entries.filter((e) => heading.includes("raw") || canonical.includes("raw") || !(e.selectFirst("div.item-thumb.wleft a")?.attr("href") ?? "").includes("raw"));
      }
      const mangas = entries.map((e) => ({
        url: relativeUrl(e.selectFirst("a")?.absUrl("href") ?? ""),
        title: e.selectFirst("div.item-thumb.wleft img")?.attr("alt") ?? "",
        thumbnailUrl: e.selectFirst("img")?.absUrl("src") || void 0
      }));
      return { mangas, hasNextPage };
    }
    return {
      info: {
        id,
        name: "Manga18.me",
        lang,
        version: "1.0.3",
        baseUrl,
        supportsLatest: true,
        nsfw: true,
        icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/manga18me/res/mipmap-xhdpi/ic_launcher.png",
        imageHeaders: headers
      },
      async getPopularManga(page) {
        return parseList(await get(`${baseUrl}/manga/${page}?orderby=trending`));
      },
      async getLatestUpdates(page) {
        return parseList(await get(`${baseUrl}/manga/${page}?orderby=latest`));
      },
      async searchManga(page, query, filters) {
        if (query) return parseList(await get(`${baseUrl}/search?${queryString([["q", query], ["page", page]])}`));
        const value = (fid) => {
          const f = filters.find((x) => x.id === fid);
          return f?.type === "select" ? f.options[f.selected]?.value ?? "" : "";
        };
        const isChecked = (fid) => filters.some((x) => x.id === fid && x.type === "checkboxes" && x.checked.length > 0);
        const genre = value("genre") || "manga";
        const path = isChecked("raw") ? "raw" : isChecked("completed") ? "completed" : genre !== "manga" ? `genre/${genre}` : genre;
        const sort = value("sort");
        return parseList(await get(`${baseUrl}/${path}/${page}${sort ? `?orderby=${sort}` : ""}`));
      },
      async getMangaDetails(manga) {
        const document = await get(baseUrl + manga.url);
        const info = document.selectFirst("div.post_content");
        let description = "";
        const summary = document.selectFirst("div.ss-manga")?.text();
        if (summary && summary !== "N/A") description += `${summary}
`;
        const alternative = info?.selectFirst("div.post-content_item.wleft:contains(Alternative) div.summary-content")?.text();
        if (alternative && alternative !== "Updating") {
          description += "Alternative Names:\n" + alternative.split(/[/;]/).map((alt) => `- ${alt.trim()}
`).join("");
        }
        const status = document.selectFirst("div.post_status div.post-content_item.wleft:contains(Status) div.summary-content")?.text();
        const artist = info?.selectFirst("div.href-content.artist-content > a")?.text();
        return {
          title: document.select("div.post-title.wleft > h1").map((h) => h.text()).join(" "),
          description,
          status: status === "Ongoing" ? "ongoing" : status === "Completed" ? "completed" : "unknown",
          author: artist && artist !== "Updating" ? artist : void 0,
          artist: artist && artist !== "Updating" ? artist : void 0,
          genres: info?.select("div.href-content.genres-content > a[href*=/genre/]").map((a) => a.text()),
          thumbnailUrl: document.selectFirst("div.summary_image > img")?.absUrl("src") || void 0
        };
      },
      async getChapterList(manga) {
        const document = await get(baseUrl + manga.url);
        const jsonLd = document.select("script[type=application/ld+json]").map((s) => s.data()).join("\n");
        const modified = parseDate(/"dateModified":"([^"]+)"/.exec(jsonLd)?.[1]);
        return document.select("ul.row-content-chapter.wleft .a-h.wleft").map((e) => {
          const link = e.selectFirst("a");
          const time = e.selectFirst("span");
          const dateUpload = parseDayMonthYear(time?.text()) ?? (time?.selectFirst("img[alt=NEW]") ? modified : void 0);
          return { url: relativeUrl(link?.absUrl("href") ?? ""), name: link?.text() ?? "", dateUpload };
        });
      },
      async getPageList(chapter) {
        const images = (await get(baseUrl + chapter.url)).select("div.read-content.wleft img");
        if (images.length === 0) throw new Error("Unable to find script with image data");
        return images.map((img) => ({ url: img.attr("src") }));
      },
      getFilterList() {
        const select = (fid, name, pairs) => ({ type: "select", id: fid, name, options: pairs.map(([label, value]) => ({ label, value })), selected: 0 });
        return [
          { type: "header", id: "note", name: "The filter is ignored when using text search." },
          select("genre", "Genre", genres),
          { ...select("sort", "Sort", [["Latest", "latest"], ["A-Z", "alphabet"], ["Rating", "rating"], ["Trending", "trending"]]), listings: { popular: "trending", latest: "latest" } },
          { type: "checkboxes", id: "raw", name: "Raw", options: [{ label: "Raw", value: "on" }], checked: [] },
          { type: "checkboxes", id: "completed", name: "Completed", options: [{ label: "Completed", value: "on" }], checked: [] }
        ];
      }
    };
  }
  var index_default = [["1353606378087565589", "all"], ["6244055465910932489", "en"]].map(makeSource);
  function parseDayMonthYear(text) {
    const match = /(\d{1,2})\s+([A-Za-z]{3})\w*\s+(\d{4})/.exec(text ?? "");
    if (!match) return void 0;
    const month = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(match[2].toLowerCase());
    return month < 0 ? void 0 : new Date(Number(match[3]), month, Number(match[1])).getTime();
  }
  var genres = [
    ["Manga", "manga"],
    ["Drama", "drama"],
    ["Mature", "mature"],
    ["Romance", "romance"],
    ["Adult", "adult"],
    ["Hentai", "hentai"],
    ["Comedy", "comedy"],
    ["Ecchi", "ecchi"],
    ["School Life", "school-life"],
    ["Shounen", "shounen"],
    ["Slice of Life", "slice-of-life"],
    ["Seinen", "seinen"],
    ["Yuri", "yuri"],
    ["Action", "action"],
    ["Fantasy", "fantasy"],
    ["Harem", "harem"],
    ["Supernatural", "supernatural"],
    ["Sci-Fi", "sci-fi"],
    ["Isekai", "isekai"],
    ["Shoujo", "shoujo"],
    ["Horror", "horror"],
    ["Psychological", "psychological"],
    ["Smut", "smut"],
    ["Tragedy", "tragedy"],
    ["Raw", "raw"],
    ["Historical", "historical"],
    ["Adventure", "adventure"],
    ["Martial Arts", "martial-arts"],
    ["Manhwa", "manhwa"],
    ["Manhua", "manhua"],
    ["Mystery", "mystery"],
    ["BL", "bl"],
    ["Yaoi", "yaoi"],
    ["Gender Bender", "gender-bender"],
    ["Thriller", "thriller"],
    ["Josei", "josei"],
    ["Sports", "sports"],
    ["GL", "gl"],
    ["Family", "family"],
    ["Magic", "magic"]
  ];
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
