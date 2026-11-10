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

  // src/en/ninehentai/index.ts
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
  function parseRelativeDate(text, now = Date.now()) {
    const match = /(\d+)\s*(second|sec|minute|min|hour|day|week|month|year)s?\s*ago/i.exec(text ?? "");
    if (!match) return void 0;
    const unit = { second: 1e3, sec: 1e3, minute: 6e4, min: 6e4, hour: 36e5, day: 864e5, week: 6048e5, month: 2592e6, year: 31536e6 };
    return now - Number(match[1]) * unit[match[2].toLowerCase()];
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

  // src/en/ninehentai/index.ts
  var baseUrl = "https://9hentai.so";
  var imageBaseUrl = "https://i.9hentai.so/images";
  var coverUrl = (id) => `${imageBaseUrl}/${id}/cover.jpg`;
  async function post(path, body) {
    const response = await send({ url: baseUrl + path, method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return JSON.parse(response.body);
  }
  var toManga = (book) => ({ url: `/g/${book.id}`, title: book.title, thumbnailUrl: coverUrl(book.id) });
  var fetchBook = async (id) => (await post("/api/getBookByID", { id })).results;
  async function search(page, text = "", sort = 0, range = [0, 2e3], included = [], excluded = []) {
    const response = await post("/api/getBook", {
      // The API counts pages from 0.
      search: { text, page: page - 1, sort, pages: { range }, tag: { items: { included, excluded } } }
    });
    return { mangas: response.results.map(toManga), hasNextPage: response.total_count > page };
  }
  async function tags(names, type) {
    const found = await Promise.all(names.split(",").map((n) => n.trim()).filter(Boolean).map(async (name) => (await post("/api/getTag", { tag_name: name, tag_type: type })).results[0]));
    return found.filter((t) => t != null);
  }
  var source = {
    info: {
      id: "7689490563697355048",
      name: "NineHentai",
      lang: "en",
      version: "1.0.2",
      baseUrl,
      supportsLatest: true,
      nsfw: true,
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/ninehentai/res/mipmap-xhdpi/ic_launcher.png"
    },
    getPopularManga(page) {
      return search(page, "", 1);
    },
    getLatestUpdates(page) {
      return search(page);
    },
    async searchManga(page, query, filters) {
      if (query.startsWith("id:")) {
        const id = Number.parseInt(query.slice(3), 10);
        return Number.isNaN(id) ? { mangas: [], hasNextPage: false } : { mangas: [toManga(await fetchBook(id))], hasNextPage: false };
      }
      const text = (fid) => {
        const f = filters.find((x) => x.id === fid);
        return f?.type === "text" ? f.value.trim() : "";
      };
      const sortFilter = filters.find((f) => f.id === "sort");
      const sort = sortFilter?.type === "select" ? sortFilter.selected : 0;
      const included = [];
      const excluded = [];
      if (text("included")) included.push(...await tags(text("included"), 1));
      if (text("excluded")) excluded.push(...await tags(text("excluded"), 1));
      for (const [fid, type] of [["group", 2], ["parody", 3], ["artist", 4], ["character", 5], ["category", 6]]) {
        if (text(fid)) included.push(...await tags(text(fid), type));
      }
      const min = Number.parseInt(text("min_pages"), 10);
      const max = Number.parseInt(text("max_pages"), 10);
      return search(page, query, sort, [Number.isNaN(min) ? 0 : min, Number.isNaN(max) ? 2e3 : max], included, excluded);
    },
    async getMangaDetails(manga) {
      const { document } = await fetchPage(baseUrl + manga.url);
      const info = document.selectFirst("div#bigcontainer");
      if (!info) return {};
      const field = (selector) => {
        const list = info.select(selector);
        return list.length ? list.map((e) => e.text()).join(", ") : void 0;
      };
      const id = Number(manga.url.split("/g/")[1]?.split("/")[0]);
      const description = [
        ["Alternative Title", field("h2")],
        ["Pages", field("div#info > div:contains(pages)")],
        ["Parody", field("div.field-name:contains(Parody:) a.tag")],
        ["Category", field("div.field-name:contains(Category:) a.tag")],
        ["Language", field("div.field-name:contains(Language:) a.tag")]
      ].flatMap(([label, value]) => value ? [`${label}: ${value}`] : []).join("\n\n");
      return {
        title: info.select("h1").map((h) => h.text()).join(" "),
        thumbnailUrl: Number.isInteger(id) ? coverUrl(id) : void 0,
        status: "completed",
        artist: field("div.field-name:contains(Artist:) a.tag"),
        author: field("div.field-name:contains(Group:) a.tag") ?? "Unknown circle",
        genres: info.select("div.field-name:contains(Tag:) a.tag").map((a) => a.text()),
        description
      };
    },
    async getChapterList(manga) {
      const { document, url } = await fetchPage(baseUrl + manga.url);
      const time = document.select("div#info div time").map((t) => t.text()).join(" ");
      return [{ url: new RegExp("^https?://[^/]+(/[^?#]*)").exec(url)?.[1] ?? manga.url, name: "Chapter", dateUpload: parseRelativeDate(`${time} ago`) }];
    },
    async getPageList(chapter) {
      const id = Number(chapter.url.split("/g/")[1]?.split("/")[0]);
      let total = (await fetchBook(id)).total_page;
      if ((await Honya.request(`${imageBaseUrl}/${id}/preview/${total}t.jpg`)).status === 404) total--;
      return Array.from({ length: total }, (_, i) => ({ url: `${imageBaseUrl}/${id}/${i + 1}.jpg` }));
    },
    getFilterList() {
      const text = (fid, name) => ({ type: "text", id: fid, name, value: "" });
      return [
        { type: "header", id: "h1", name: 'Search by id with "id:" in front of query' },
        { type: "separator", id: "s1" },
        { type: "select", id: "sort", name: "Sort by", options: ["Newest", "Popular Right now", "Most Fapped", "Most Viewed", "By Title"].map((label, i) => ({ label, value: String(i) })), selected: 0, listings: { popular: "1", latest: "0" } },
        text("min_pages", "Minimum Pages"),
        text("max_pages", "Maximum Pages"),
        text("included", "Included Tags"),
        text("excluded", "Excluded Tags"),
        text("artist", "Artist"),
        text("group", "Group"),
        text("parody", "Parody"),
        text("character", "Character"),
        text("category", "Category")
      ];
    }
  };
  var index_default = source;
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
