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

  // src/all/hdoujin/index.ts
  var index_exports = {};
  __export(index_exports, {
    default: () => index_default
  });

  // sdk/helpers.ts
  function queryString(params) {
    return params.map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`).join("&");
  }
  function formBody(fields) {
    return { body: queryString(fields), headers: { "Content-Type": "application/x-www-form-urlencoded" } };
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

  // src/all/hdoujin/index.ts
  var baseUrl = "https://hdoujin.org";
  var apiUrl = "https://api.hdoujin.org/books";
  var headers = { Referer: `${baseUrl}/`, Origin: baseUrl };
  var languages = [
    ["2220258354919443918", "all"],
    ["3677056573528884471", "en"],
    ["6580865433441960135", "es"],
    ["4628927315861565171", "ja"],
    ["8377507648400729012", "ko"],
    ["2603728112834757616", "zh"]
  ];
  var siteLanguages = { en: "english", es: "spanish", ja: "japanese", ko: "korean", zh: "chinese" };
  var pref = (key, fallback) => Honya.prefs.get(key) ?? fallback;
  async function json(url) {
    return JSON.parse(await withClearance(url, `${baseUrl}/`));
  }
  var clearance = null;
  async function withClearance(url, readerUrl, post = false) {
    clearance ??= await Honya.localStorage(`${baseUrl}/`, "clearance") ?? await Honya.loadInWebView(readerUrl, { waitForLocalStorage: "clearance" });
    if (!clearance) throw new Error("Open HDoujin in the web view to refresh its token, then try again.");
    const signed = `${url}${url.includes("?") ? "&" : "?"}crt=${encodeURIComponent(clearance)}`;
    const form = formBody([]);
    const response = await Honya.request(post ? { url: signed, method: "POST", headers: { ...headers, ...form.headers }, body: form.body } : { url: signed, headers });
    if (response.status === 400 || response.status === 403) {
      clearance = null;
      throw new Error("Open HDoujin in the web view to refresh its token, then try again.");
    }
    if (response.status < 200 || response.status > 299) throw new Error(`HTTP error ${response.status}`);
    return response.body;
  }
  function tagPreference() {
    const split = (text) => text.split(",").map((t) => t.trim()).filter(Boolean);
    const tags = [...split(pref("pref_include_tags", "")), ...split(pref("pref_exclude_tags", "")).map((t) => `-${t}`)];
    const groups = /* @__PURE__ */ new Map();
    for (const tag of tags) {
      const bare = tag.replace(/^-/, "");
      const parts = bare.split(":");
      const group = parts.length >= 2 && parts[0].trim() ? parts[0] : "tag";
      const name = parts[parts.length - 1].trim();
      if (!groups.has(group)) groups.set(group, /* @__PURE__ */ new Set());
      groups.get(group).add(tag.startsWith("-") ? `-${name}` : name);
    }
    return [...groups].map(([group, values]) => `${group}:"${[...values].join(",")}"`).join(" ");
  }
  function parseEntries(data) {
    return {
      mangas: data.entries.map((e) => ({ url: `${e.id}/${e.key}`, title: e.title, thumbnailUrl: e.thumbnail.path })),
      hasNextPage: data.limit * data.page < data.total
    };
  }
  var capitalizeEach = (text) => text.split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  function toDetails(detail) {
    const groups = { artists: [], circles: [], parodies: [], characters: [], uploaders: [], males: [], females: [], mixed: [], language: [], other: [], tags: [] };
    for (const tag of detail.tags ?? []) {
      switch (tag.namespace ?? 0) {
        case 1:
          groups.artists.push(tag.name);
          break;
        case 2:
          groups.circles.push(tag.name);
          break;
        case 3:
          groups.parodies.push(tag.name);
          break;
        case 5:
          groups.characters.push(tag.name);
          break;
        case 7:
          if (tag.name !== "anonymous") groups.uploaders.push(tag.name);
          break;
        case 8:
          groups.males.push(`${tag.name} ♂`);
          break;
        case 9:
          groups.females.push(`${tag.name} ♀`);
          break;
        case 10:
          groups.mixed.push(tag.name);
          break;
        case 11:
          groups.language.push(tag.name);
          break;
        case 12:
          groups.other.push(tag.name);
          break;
        default:
          groups.tags.push(tag.name);
      }
    }
    const join = (names) => names.map(capitalizeEach).join(", ");
    let description = "";
    for (const [label, names] of [["Circles", groups.circles], ["Uploaders", groups.uploaders], ["Parodies", groups.parodies], ["Characters", groups.characters]]) {
      if (names.length) description += `${label}: ${join(names)}
`;
    }
    if (description) description += "\n";
    if (detail.created_at) description += `Posted: ${new Date(detail.created_at).toUTCString()}
`;
    description += `Pages: ${detail.thumbnails.entries.length}

`;
    const alternatives = [.../* @__PURE__ */ new Set([detail.subtitle, detail.subtitle_short])].filter((t) => !!t?.trim());
    if (alternatives.length) description += `Alternative Title(s): ${alternatives.map((t) => `
- ${t}`).join(", ")}

`;
    const title = pref("pref_remove_additional", false) ? detail.title_short ?? detail.title.replace(/(\[[^\]]*]|[({][^)}]*[)}])/g, "").trim() : detail.title;
    return {
      title,
      thumbnailUrl: detail.thumbnails.base + detail.thumbnails.main.path,
      author: join(groups.circles.length ? groups.circles : groups.artists),
      artist: join(groups.artists),
      genres: [...groups.artists, ...groups.circles, ...groups.parodies, ...groups.characters, ...groups.tags, ...groups.females, ...groups.males, ...groups.mixed, ...groups.other].map(capitalizeEach),
      description,
      status: "completed"
    };
  }
  function makeSource([id, lang]) {
    const siteLang = siteLanguages[lang] ?? lang;
    const browseTerms = () => [...lang !== "all" ? [`language:"^${siteLang}"`] : [], tagPreference()].filter(Boolean);
    const browse = async (params) => {
      const terms = browseTerms();
      return parseEntries(await json(`${apiUrl}?${queryString([...params, ...terms.length ? [["s", terms.join(" ")]] : []])}`));
    };
    return {
      info: {
        id,
        name: "HDoujin",
        lang,
        version: "1.0.3",
        baseUrl,
        supportsLatest: true,
        nsfw: true,
        icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/hdoujin/res/mipmap-xhdpi/ic_launcher.png",
        rateLimits: [{ host: "api.hdoujin.org", permits: 3, periodMs: 1e3 }],
        imageHeaders: headers
      },
      getPopularManga(page) {
        return browse([["sort", "8"], ["page", String(page)]]);
      },
      getLatestUpdates(page) {
        return browse([["page", String(page)]]);
      },
      async searchManga(page, query, filters) {
        if (filters.length === 0) filters = this.getFilterList();
        const terms = [query.trim()];
        if (lang !== "all") terms.push(`language:"^${siteLang}$"`);
        const tagType = filters.find((f) => f.id === "tag_type");
        const includeAll = !(tagType?.type === "select" && tagType.selected === 1);
        const params = [];
        let path = "";
        for (const filter of filters) {
          if (filter.type === "select" && filter.id === "sort") {
            const value = filter.options[filter.selected]?.value;
            if (value === "popular") path = "/popular";
            else if (value) params.push(["sort", value]);
          } else if (filter.type === "checkboxes" && filter.id === "cat") {
            const sum = filter.options.filter((o) => filter.checked.includes(o.value)).reduce((total, o) => total + Number(o.value), 0);
            if (sum > 0) params.push(["cat", String(sum)]);
          } else if (filter.type === "text") {
            const tags = filter.value.split(",").map((t) => t.trim()).filter(Boolean);
            if (tags.length === 0) continue;
            if (filter.id === "pages") {
              terms.push(`pages:${tags.join(",")}`);
            } else if (includeAll) {
              tags.filter((t) => !t.startsWith("-")).forEach((t) => terms.push(`${filter.id}:"${t}"`));
              const excluded = tags.filter((t) => t.startsWith("-"));
              if (excluded.length) terms.push(`${filter.id}:"${excluded.join(",")}"`);
            } else {
              terms.push(`${filter.id}:"${tags.join(",")}"`);
            }
          }
        }
        if (query) terms.push(`title:"${query}"`);
        const s = terms.filter(Boolean).join(" ");
        if (s) params.push(["s", s]);
        params.push(["page", String(page)]);
        return parseEntries(await json(`${apiUrl}${path}?${queryString(params)}`));
      },
      async getMangaDetails(manga) {
        return toDetails(await json(`${apiUrl}/detail/${manga.url}`));
      },
      async getChapterList(manga) {
        const detail = await json(`${apiUrl}/detail/${manga.url}`);
        return [{ url: `${detail.id}/${detail.key}`, name: "Chapter", dateUpload: detail.updated_at ?? detail.created_at }];
      },
      async getPageList(chapter) {
        const [entryId, entryKey] = chapter.url.split("/");
        const readerUrl = `${baseUrl}/g/${chapter.url}/read/1`;
        const { data } = JSON.parse(await withClearance(`${apiUrl}/detail/${chapter.url}`, readerUrl, true));
        const fallbacks = {
          "1600": ["1600", "1280", "0", "980", "780"],
          "1280": ["1280", "1600", "0", "980", "780"],
          "980": ["980", "1280", "0", "1600", "780"],
          "780": ["780", "980", "0", "1280", "1600"],
          "0": ["0", "1600", "1280", "980", "780"]
        };
        const order = fallbacks[pref("pref_image_quality", "1280")] ?? fallbacks["1280"];
        const dataId = order.map((q) => data[q]?.id).find((v) => v != null);
        const publicKey = order.map((q) => data[q]?.key).find((v) => v != null);
        if (dataId == null || publicKey == null) throw new Error("No Images Found");
        const quality = ["1600", "1280", "980", "780"].find((q) => data[q]?.id === dataId) ?? "0";
        const images = JSON.parse(await withClearance(`${apiUrl}/data/${entryId}/${entryKey}/${dataId}/${publicKey}/${quality}`, readerUrl));
        return images.entries.map((image) => ({ url: `${images.base}/${image.path}?w=${quality}` }));
      },
      getFilterList() {
        const text = (fid, name) => ({ type: "text", id: fid, name, value: "" });
        return [
          { type: "select", id: "sort", name: "Sort by", options: [["Title", "2"], ["Pages", "3"], ["Date", ""], ["Views", "8"], ["Favourites", "9"], ["Popular This Week", "popular"]].map(([label, value]) => ({ label, value })), selected: 2, listings: { popular: "8", latest: "" } },
          { type: "checkboxes", id: "cat", name: "Categories", options: [{ label: "Manga", value: "2" }, { label: "Doujinshi", value: "4" }, { label: "Illustration", value: "8" }], checked: ["2", "4", "8"] },
          { type: "separator", id: "s1" },
          { type: "select", id: "tag_type", name: "Tags Include Type", options: [{ label: "AND", value: "and" }, { label: "OR", value: "or" }], selected: 0 },
          { type: "separator", id: "s2" },
          { type: "header", id: "h1", name: "Separate tags with commas (,)" },
          { type: "header", id: "h2", name: "Prepend with dash (-) to exclude" },
          text("tag", "Tags"),
          text("male", "Male Tags"),
          text("female", "Female Tags"),
          text("mixed", "Mixed Tags"),
          text("other", "Other Tags"),
          { type: "separator", id: "s3" },
          text("artist", "Artists"),
          text("parody", "Parodies"),
          text("character", "Characters"),
          { type: "separator", id: "s4" },
          text("reason", "Uploader"),
          text("circle", "Circles"),
          text("language", "Languages"),
          { type: "separator", id: "s5" },
          { type: "header", id: "h3", name: "Filter by pages, for example: (>20)" },
          text("pages", "Pages")
        ];
      }
    };
  }
  var index_default = languages.map(makeSource);
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
