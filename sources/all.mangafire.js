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

  // src/all/mangafire/index.ts
  var index_exports = {};
  __export(index_exports, {
    default: () => index_default
  });

  // sdk/helpers.ts
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
  function base64Encode(bytes, options2 = {}) {
    let text = "";
    for (let i = 0; i < bytes.length; i += 3) {
      const chunk = bytes[i] << 16 | (bytes[i + 1] ?? 0) << 8 | (bytes[i + 2] ?? 0);
      const count = Math.min(3, bytes.length - i);
      for (let j = 0; j < 4; j++) {
        text += j <= count ? base64Alphabet[chunk >> 18 - 6 * j & 63] : options2.padding === false ? "" : "=";
      }
    }
    return options2.urlSafe ? text.replace(/\+/g, "-").replace(/\//g, "_") : text;
  }
  function utf8Encode(text) {
    const bytes = [];
    for (const char of text) {
      const code = char.codePointAt(0);
      if (code < 128) bytes.push(code);
      else if (code < 2048) bytes.push(192 | code >> 6, 128 | code & 63);
      else if (code < 65536) bytes.push(224 | code >> 12, 128 | code >> 6 & 63, 128 | code & 63);
      else bytes.push(240 | code >> 18, 128 | code >> 12 & 63, 128 | code >> 6 & 63, 128 | code & 63);
    }
    return new Uint8Array(bytes);
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

  // src/all/mangafire/vrf.ts
  var stages = [
    [
      "yINlmUNho8VYJT+ibTIP+9ESiULpVEtMOoD6U6lRE0R/xwXo/Xp9NrUgC4cw/Lmo33vUyjUE40kUoEWIr/fxfNNcq2s79ShQ5NhNrFnJ4hXPwOu/SuXzIbuTQKGFvfm08E9jvCfqAtoDqvQq3dVWPQFmJjgvkISBeXY3BgANR+yVnjGbcxZ47d6kLNfZPIayTq3/YGySb1KuVZodWp/WGNAO5pfMcpaK53Hhs0allBszaMaxuouOwdxbwgxIw6YunSsXjI05Yi0j9j4eHKfSXR8Ifo/Od+8iamRfCXTyvm7NGRGYdcQ0ywcK/u6RXhrbcCm4t2eCtrDgQVecJGkQ+A==",
      "0Ec58JOY3uBzJK9m3zqIOpdlF7UFiax9DmA=",
      90
    ],
    [
      "IUFltCxD3Oc2cwCgkJffthaOg9cgPUb0LgW6H/VtfcF0kc5F25t+aWj6JH9VOhOaY0rAFdUxlDnl5BLNvwEJvQtP5qcw7vdb/K+chnbwnspSHT8mz5lqwz41TezG0hkO06FTjJZhsyNuFLDpD2ZZxQj/QIRcF90zpmQ7Byu483WsQqUE0C342HL+JXngRB6fRzxRyVTaKu83h7UYTJ0QMt6ixFh6S3F8gqkKwrGTL3jHNBsD45UnifK8+RGtishQV2K3rujLKEkiZxpr2dYcudFW4oFsDKhad3CLBvuyTqsCo4B7mL5IKQ1vXo/MOOvq1I1d8ar9X6Ttu5KF4fZgiA==",
      "AAdjb1iPY8CiDmq9H34tKTBF8a3oDQ==",
      53
    ],
    [
      "NQHlu1/wVO5EmkwQymF810qqY2xG1k2obcas4Z9mCsPEIFl9pRIjFxbJ7ybMHbBckT5Ton85E0FOeHezbh/mjlEYpmpnlXOS8dgrqeq2KfxImTh1YK9y0PeMNhzA1OQzSY9brYOJq/l2QnE/hwOeZIhPixVSKIUlDb5vLcH6RWKxkIEMuP0bDwIqQ71AJJaEaMJL7A6YtyIwoRT+L5v4aZzodN/0+3nOGsfblFjgxSfPzVDjNFeNl5P26+kEC/8AHgdrpAbt3hHz3HrRN1Y6e+JHgF7ncFWnoF0y3THL1S71WgWGCa6KtSzTCCG58n68nTyj2T3Sshk7utqCtMi/ZQ==",
      "DELOJgPsVaCcblDtTGMdHzM=",
      186
    ]
  ];
  var decoded = stages.map(([table, key, iv]) => ({ table: base64Decode(table), key: base64Decode(key), iv }));
  function sign(path) {
    let data = utf8Encode(path);
    for (const { table, key, iv } of decoded) {
      const out = new Uint8Array(data.length);
      let previous = iv;
      for (let i = 0; i < data.length; i++) {
        previous = table[(data[i] ^ key[i % key.length] ^ previous) & 255];
        out[i] = previous;
      }
      data = out;
    }
    return base64Encode(data, { urlSafe: true, padding: false });
  }
  function signedUrl(baseUrl2, path, params) {
    const sorted = [...params].sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
    let lastKey = "";
    let index = 0;
    const query = sorted.map(([key, value]) => {
      let name = key;
      if (key.endsWith("[]")) {
        if (lastKey !== key) index = 0;
        lastKey = key;
        name = key.replace("[]", `[${index++}]`);
      }
      return `${name}=${value}`;
    }).join("&");
    const signed = path.replace(/^\/api/, "") + (sorted.length > 0 ? `?${query}` : "");
    return `${baseUrl2}${path}?${queryString([...sorted, ["vrf", sign(signed)]])}`;
  }

  // src/all/mangafire/index.ts
  var baseUrl = "https://mangafire.to";
  var headers = { Accept: "application/json" };
  var languages = [
    ["6084907896154116083", "en"],
    ["8098539940032331958", "es"],
    ["3849324770075062403", "es-419"],
    ["6228021941803932286", "fr"],
    ["524110931382140732", "ja"],
    ["758400875161895515", "pt"],
    ["7842137233968841729", "pt-BR"]
  ];
  async function api(path, params = []) {
    const response = await Honya.request({ url: signedUrl(baseUrl, path, params), headers });
    if (response.status === 403 && response.body.includes("captcha_required")) {
      throw new Error("MangaFire is asking for a captcha. Open MangaFire in the web view, solve it, then try again.");
    }
    if (response.status < 200 || response.status > 299) throw new Error(`HTTP ${response.status} for ${response.url}`);
    return JSON.parse(response.body);
  }
  function makeSource([id, lang]) {
    const langCode = lang === "es-419" ? "es-la" : lang === "pt-BR" ? "pt-br" : lang;
    const pref = (key, fallback) => Honya.prefs.get(key) ?? fallback;
    const contentRating = () => pref("pref_content_rating", []);
    async function titles(params) {
      const data = await api("/api/titles", params);
      return { mangas: (data.items ?? []).map(toManga), hasNextPage: data.meta?.hasNext ?? false };
    }
    async function allChapters(hid2) {
      const page = (n) => api(`/api/titles/${hid2}/chapters`, [
        ["language", langCode],
        ["sort", "number"],
        ["order", "desc"],
        ["page", String(n)],
        ["limit", "200"]
      ]);
      const first = await page(1);
      const lastPage = first.meta?.lastPage ?? 1;
      const rest = await Promise.all(Array.from({ length: Math.max(0, lastPage - 1) }, (_, i) => page(i + 2)));
      return [first, ...rest].flatMap((data) => data.items ?? []);
    }
    return {
      info: {
        id,
        name: "MangaFire",
        lang,
        version: "1.0.2",
        baseUrl,
        supportsLatest: true,
        nsfw: true,
        icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/mangafire/res/mipmap-xhdpi/ic_launcher.png",
        rateLimits: [{ host: "mangafire.to", permits: 2, periodMs: 1e3 }]
      },
      getPopularManga(page) {
        return titles([["order[views_30d]", "desc"], ["page", String(page)], ["limit", "50"], ...contentRating().map((r) => ["content_rating[]", r])]);
      },
      getLatestUpdates(page) {
        return titles([["order[chapter_updated_at]", "desc"], ["page", String(page)], ["limit", "50"], ...contentRating().map((r) => ["content_rating[]", r])]);
      },
      async searchManga(page, query, filters) {
        if (filters.length === 0) filters = filterList(contentRating());
        const params = [];
        if (query.trim()) params.push(["keyword", query.trim()]);
        params.push(["page", String(page)], ["limit", "50"]);
        const author = filters.find((f) => f.id === "author");
        const authorQuery = author?.type === "text" ? author.value.trim() : "";
        if (authorQuery) {
          const tags = await api("/api/tags", [["keyword", authorQuery]]);
          const match = tags.data?.find((tag) => tag.type === "author" || tag.type === "artist");
          if (!match) return { mangas: [], hasNextPage: false };
          params.push(["authors[]", String(match.id)]);
        }
        for (const filter of filters) params.push(...filterParams(filter));
        return titles(params);
      },
      async getMangaDetails(manga) {
        const data = await api(`/api/titles/${hid(manga.url)}`);
        return toDetails(data.data);
      },
      async getChapterList(manga) {
        const id2 = hid(manga.url);
        let showVolumes = pref("show_as_volumes", false);
        let chapters = [];
        if (showVolumes) {
          const volumes = (await api(`/api/titles/${id2}/volumes`)).items ?? [];
          if (volumes.length > 0) {
            chapters = volumes.filter((v) => v.language === langCode).map((v) => volumeChapter(v, manga.url));
          } else {
            showVolumes = false;
          }
        }
        if (!showVolumes) {
          chapters = (await allChapters(id2)).map((c) => toChapter(c, manga.url, langCode));
        }
        if (!showVolumes && pref("merge_chapters", false)) {
          const preferOfficial = pref("prefer_official", true);
          const isOfficial = (c) => c.scanlator?.toLowerCase() === "official";
          const seen = /* @__PURE__ */ new Set();
          chapters = [...chapters].sort((a, b) => Number(preferOfficial ? !isOfficial(a) : isOfficial(a)) - Number(preferOfficial ? !isOfficial(b) : isOfficial(b))).filter((c) => seen.has(c.chapterNumber) ? false : (seen.add(c.chapterNumber), true)).sort((a, b) => (b.chapterNumber ?? 0) - (a.chapterNumber ?? 0));
        }
        return chapters;
      },
      async getPageList(chapter) {
        const segments = chapter.url.split("/").filter(Boolean);
        const last = segments[segments.length - 1];
        let path;
        if (segments.includes("volume")) {
          path = `/api/volumes/${last}`;
        } else {
          const chapterId = Number(last.split("-")[0]);
          if (!Number.isInteger(chapterId)) throw new Error("Refresh the chapter list.");
          path = `/api/chapters/${chapterId}`;
        }
        const data = await api(path);
        return data.data.pages.map((p) => ({ url: p.url }));
      },
      getFilterList() {
        return filterList(contentRating());
      }
    };
  }
  var index_default = languages.map(makeSource);
  function hid(url) {
    const last = url.replace(/\/$/, "").split("/").pop() ?? "";
    if (last.includes(".")) return last.slice(last.lastIndexOf(".") + 1);
    if (last.includes("-")) return last.slice(0, last.indexOf("-"));
    return last;
  }
  function toManga(dto) {
    return {
      url: `/title/${dto.hid}${dto.slug ? `-${dto.slug}` : ""}`,
      title: dto.title,
      thumbnailUrl: dto.poster?.large ?? dto.poster?.medium ?? dto.poster?.small
    };
  }
  function toDetails(dto) {
    const statuses = { releasing: "ongoing", finished: "completed", on_hiatus: "onHiatus", discontinued: "cancelled" };
    return {
      title: dto.title,
      thumbnailUrl: dto.poster?.large ?? dto.poster?.medium ?? dto.poster?.small,
      author: dto.authors?.map((a) => a.title).join(", "),
      artist: dto.artists?.map((a) => a.title).join(", "),
      description: dto.synopsisHtml ? Honya.parseHTML(`<body>${dto.synopsisHtml}</body>`).text() : void 0,
      genres: [
        ...dto.type ? [dto.type.charAt(0).toUpperCase() + dto.type.slice(1)] : [],
        ...(dto.genres ?? []).map((g) => g.title),
        ...(dto.themes ?? []).map((t) => t.title)
      ],
      status: statuses[dto.status?.toLowerCase() ?? ""] ?? "unknown"
    };
  }
  var chapterNumberPattern = /(?<=\b(?:ch(?:\.|apter)?|ep(?:\.|isode)?)\s?)\d+(?:\.\d+)?/i;
  function toChapter(dto, mangaUrl, langCode) {
    const number = String(dto.number);
    let chapterNumber = dto.number;
    let name = `Ch. ${number}`;
    if (dto.name?.trim()) {
      const extracted = Number(chapterNumberPattern.exec(dto.name)?.[0]);
      if (Number.isFinite(extracted) && chapterNumberPattern.test(dto.name)) {
        chapterNumber = extracted;
        name = dto.name;
      } else {
        name = `Ch. ${number} - ${dto.name}`;
      }
    }
    return {
      url: `${mangaUrl}/${dto.id}-chapter-${number}-${langCode}`,
      name,
      chapterNumber,
      scanlator: dto.type ?? "Unknown",
      dateUpload: dto.createdAt ? dto.createdAt * 1e3 : void 0
    };
  }
  function volumeChapter(dto, mangaUrl) {
    return {
      url: `${mangaUrl}/volume/${dto.id}`,
      name: `Vol. ${dto.number}${dto.name?.trim() ? ` - ${dto.name}` : ""}`,
      chapterNumber: dto.number,
      scanlator: `${dto.chapterCount} chapters`
    };
  }
  var options = (pairs) => pairs.map(([label, value]) => ({ label, value }));
  var sorts = [
    ["Latest update", "chapter_updated_at:desc"],
    ["Best match", "relevance:desc"],
    ["Recently added", "created_at:desc"],
    ["Title (A–Z)", "title:asc"],
    ["Title (Z–A)", "title:desc"],
    ["Year (newest)", "year:desc"],
    ["Year (oldest)", "year:asc"],
    ["Highest rated", "score:desc"],
    ["Most viewed · 7 days", "views_7d:desc"],
    ["Most viewed · 30 days", "views_30d:desc"],
    ["Most viewed · all time", "views_total:desc"],
    ["Most followed", "follows_total:desc"]
  ];
  function filterList(contentRating) {
    return [
      { type: "checkboxes", id: "content_rating[]", name: "Content Rating", options: options([["Safe", "safe"], ["Suggestive", "suggestive"], ["Erotica", "erotica"], ["Pornographic", "pornographic"]]), checked: contentRating },
      { type: "separator", id: "s1" },
      { type: "checkboxes", id: "types[]", name: "Type", options: options([["Manga", "manga"], ["Manhwa", "manhwa"], ["Manhua", "manhua"], ["Other", "other"]]), checked: [] },
      { type: "separator", id: "s2" },
      { type: "select", id: "genres_mode", name: "Genre and theme match mode", options: options([["AND", "and"], ["OR", "or"]]), selected: 0 },
      { type: "tristates", id: "genres", name: "Genres", options: options(genres), included: [], excluded: [] },
      { type: "separator", id: "s3" },
      { type: "checkboxes", id: "theme_ids[]", name: "Themes", options: options(themes), checked: [] },
      { type: "separator", id: "s4" },
      { type: "checkboxes", id: "statuses[]", name: "Status", options: options([["Releasing", "releasing"], ["Finished", "finished"], ["On Hiatus", "on_hiatus"], ["Discontinued", "discontinued"], ["Not Yet Released", "not_yet_released"]]), checked: [] },
      { type: "separator", id: "s5" },
      { type: "text", id: "author", name: "Author / Artist", value: "" },
      { type: "text", id: "year_from", name: "Release year (From)", value: "" },
      { type: "text", id: "year_to", name: "Release year (To)", value: "" },
      { type: "text", id: "min_chap", name: "Minimum chapters", value: "" },
      { type: "separator", id: "s6" },
      { type: "select", id: "sort", name: "Sort by", options: options(sorts), selected: 1, listings: { popular: "views_30d:desc", latest: "chapter_updated_at:desc" } }
    ];
  }
  function filterParams(filter) {
    switch (filter.type) {
      case "checkboxes":
        return filter.options.filter((o) => filter.checked.includes(o.value)).map((o) => [filter.id, o.value]);
      case "tristates":
        return filter.options.flatMap((o) => filter.included.includes(o.value) ? [["genres_in[]", o.value]] : filter.excluded.includes(o.value) ? [["genres_ex[]", o.value]] : []);
      case "select":
        if (filter.id === "genres_mode") {
          const mode = filter.options[filter.selected]?.value ?? "and";
          return [["genres_mode", mode], ["theme_mode", mode]];
        }
        if (filter.id === "sort") {
          const [field, order] = (filter.options[filter.selected]?.value ?? "chapter_updated_at:desc").split(":");
          return [[`order[${field}]`, order]];
        }
        return [];
      case "text": {
        const number = Number.parseInt(filter.value, 10);
        if (filter.id === "min_chap") return number > 0 ? [["min_chap", String(number)]] : [];
        if (filter.id === "year_from" || filter.id === "year_to") return Number.isNaN(number) ? [] : [[filter.id, String(number)]];
        return [];
      }
      default:
        return [];
    }
  }
  var genres = [
    ["Action", "1"],
    ["Adult", "268929"],
    ["Adventure", "78"],
    ["Avant Garde", "3"],
    ["Boys Love", "4"],
    ["Comedy", "5"],
    ["Crime", "268921"],
    ["Demons", "77"],
    ["Drama", "6"],
    ["Ecchi", "7"],
    ["Fantasy", "79"],
    ["Girls Love", "9"],
    ["Gourmet", "10"],
    ["Harem", "11"],
    ["Hentai", "268930"],
    ["Historical", "268922"],
    ["Horror", "530"],
    ["Isekai", "13"],
    ["Iyashikei", "531"],
    ["Josei", "15"],
    ["Kids", "532"],
    ["Magic", "539"],
    ["Magical Girls", "268923"],
    ["Mahou Shoujo", "533"],
    ["Martial Arts", "534"],
    ["Mature", "268931"],
    ["Mecha", "19"],
    ["Medical", "268924"],
    ["Military", "535"],
    ["Music", "21"],
    ["Mystery", "22"],
    ["Parody", "23"],
    ["Philosophical", "268925"],
    ["Psychological", "536"],
    ["Reverse Harem", "25"],
    ["Romance", "26"],
    ["School", "73"],
    ["Sci-Fi", "28"],
    ["Seinen", "537"],
    ["Shoujo", "30"],
    ["Shounen", "31"],
    ["Slice of Life", "538"],
    ["Smut", "268932"],
    ["Space", "33"],
    ["Sports", "34"],
    ["Super Power", "75"],
    ["Superhero", "268926"],
    ["Supernatural", "76"],
    ["Suspense", "37"],
    ["Thriller", "38"],
    ["Tragedy", "268927"],
    ["Vampire", "39"],
    ["Wuxia", "268928"]
  ];
  var themes = [
    ["Aliens", "268933"],
    ["Animals", "268934"],
    ["Cooking", "268935"],
    ["Crossdressing", "268936"],
    ["Delinquents", "268937"],
    ["Demons", "268938"],
    ["Genderswap", "268939"],
    ["Ghosts", "268940"],
    ["Gyaru", "268941"],
    ["Harem", "268942"],
    ["Incest", "268943"],
    ["Loli", "268944"],
    ["Mafia", "268945"],
    ["Magic", "268946"],
    ["Martial Arts", "268947"],
    ["Military", "268948"],
    ["Monster Girls", "268949"],
    ["Monsters", "268950"],
    ["Music", "268951"],
    ["Ninja", "268952"],
    ["Office Workers", "268953"],
    ["Police", "268954"],
    ["Post-Apocalyptic", "268955"],
    ["Reincarnation", "268956"],
    ["Reverse Harem", "268957"],
    ["Samurai", "268958"],
    ["School Life", "268959"],
    ["Shota", "268960"],
    ["Supernatural", "268961"],
    ["Survival", "268962"],
    ["Time Travel", "268963"],
    ["Traditional Games", "268964"],
    ["Vampires", "268965"],
    ["Video Games", "268966"],
    ["Villainess", "268967"],
    ["Virtual Reality", "268968"],
    ["Zombies", "268969"]
  ];
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
