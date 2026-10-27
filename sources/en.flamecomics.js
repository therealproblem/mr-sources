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

  // src/en/flamecomics/index.ts
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

  // src/en/flamecomics/index.ts
  var baseUrl = "https://flamecomics.xyz";
  var imagesUrl = (seriesId2) => `https://cdn.flamecomics.xyz/uploads/images/series/${seriesId2}`;
  var buildId;
  async function freshBuildId() {
    const data = (await fetchHTML(baseUrl)).selectFirst("script#__NEXT_DATA__")?.data();
    const id = data ? JSON.parse(data).buildId : void 0;
    if (!id) throw new Error("Failed to find buildId");
    buildId = id;
    return id;
  }
  async function nextData(path, params = []) {
    const url = (id) => `${baseUrl}/_next/data/${id}/${path}${params.length ? `?${queryString(params)}` : ""}`;
    let response = await Honya.request(url(buildId ?? await freshBuildId()));
    if (response.status === 404) response = await Honya.request(url(await freshBuildId()));
    if (response.status < 200 || response.status > 299) throw new Error(`HTTP ${response.status} for ${response.url}`);
    return JSON.parse(response.body).pageProps;
  }
  var toManga = (s) => s.series_id == null ? void 0 : { url: `/series/${s.series_id}`, title: s.title, thumbnailUrl: `${imagesUrl(s.series_id)}/${s.cover}?${s.last_edit}` };
  var list = (series) => ({ mangas: series.map(toManga).filter((m) => m != null), hasNextPage: false });
  var browse = async () => (await nextData("browse.json")).series;
  var normalize = (text) => text.toLowerCase().replace(/[^A-Za-z0-9 ]/g, "");
  var seriesId = (url) => url.replace(/\/$/, "").split("/").pop() ?? "";
  var statuses = { ongoing: "ongoing", dropped: "cancelled", hiatus: "onHiatus", completed: "completed" };
  var source = {
    info: {
      id: "8531542650987673943",
      name: "Flame Comics",
      lang: "en",
      version: "1.0.2",
      baseUrl,
      supportsLatest: true,
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/flamecomics/res/mipmap-xhdpi/ic_launcher.png",
      rateLimits: [{ host: "flamecomics.xyz", permits: 2, periodMs: 2e3 }]
    },
    async getPopularManga() {
      const rank = (s) => s.popularityRank ?? Number.MAX_SAFE_INTEGER;
      return list((await browse()).sort((a, b) => rank(a) - rank(b)));
    },
    async getLatestUpdates() {
      return list((await nextData("latest.json")).allSeries);
    },
    async searchManga(_, query) {
      const needle = normalize(query);
      return list((await browse()).filter((s) => normalize(s.title).includes(needle)));
    },
    async getMangaDetails(manga) {
      const id = seriesId(manga.url);
      const { series } = await nextData(`series/${id}.json`, [["id", id]]);
      const synopsis = series.description ? Honya.parseHTML(`<body>${series.description}</body>`).text() : "";
      const alternatives = (series.altTitles ?? []).map((t) => t.trim()).filter(Boolean);
      const description = [synopsis, alternatives.length ? `Alternative Names:${alternatives.map((n) => `
- ${n}`).join("")}` : ""].filter(Boolean).join("\n\n");
      return {
        ...toManga(series),
        url: void 0,
        description: description || void 0,
        genres: [.../* @__PURE__ */ new Set([series.type, ...series.tags ?? []])],
        author: series.author?.join(", "),
        artist: series.artist?.join(", "),
        status: statuses[series.status.toLowerCase()] ?? "unknown"
      };
    },
    async getChapterList(manga) {
      const id = seriesId(manga.url);
      const { chapters } = await nextData(`series/${id}.json`, [["id", id]]);
      return chapters.map((c) => {
        const number = Number(c.chapter);
        return {
          url: `/series/${c.series_id}/${c.token}`,
          chapterNumber: Number.isFinite(number) ? number : void 0,
          dateUpload: Number(c.release_date) * 1e3 || void 0,
          name: `Chapter ${Number.isFinite(number) ? String(number) : c.chapter}${c.title?.trim() ? ` - ${c.title}` : ""}`
        };
      });
    },
    async getPageList(chapter) {
      const [, , id, token] = chapter.url.split("/");
      const { chapter: data } = await nextData(
        `series/${id}/${token}.json`,
        [["id", id], ["token", token]]
      );
      return Object.values(data.images).map((image) => ({ url: `${imagesUrl(data.series_id)}/${data.token}/${image.name}?${data.release_date}` }));
    }
  };
  var index_default = source;
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
