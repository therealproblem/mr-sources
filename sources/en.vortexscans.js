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

  // src/en/vortexscans/index.ts
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

  // themes/iken.ts
  var perPage = 18;
  var isNovel = (post) => post.isNovel === true || post.seriesType?.toLowerCase() === "novel";
  var statuses = {
    ONGOING: "ongoing",
    COMING_SOON: "ongoing",
    MASS_RELEASED: "ongoing",
    COMPLETED: "completed",
    CANCELLED: "cancelled",
    DROPPED: "cancelled"
  };
  var sortOptions = [["Last Chapter", "lastChapterAddedAt"], ["Views", "totalViews"], ["Added", "createdAt"], ["Chapters", "chaptersCount"], ["Title", "postTitle"]];
  function toManga(post) {
    const description = [
      post.postContent ? Honya.parseHTML(`<body>${post.postContent.replace(/\n/g, "<br>")}</body>`).text() : "",
      post.alternativeTitles ? `Alternative Names: ${post.alternativeTitles}` : ""
    ].filter(Boolean).join("\n\n").trim();
    const type = { MANGA: "Manga", MANHUA: "Manhua", MANHWA: "Manhwa" }[post.seriesType ?? ""];
    return {
      url: `${post.slug}#${post.id}`,
      title: post.postTitle,
      thumbnailUrl: post.featuredImage ?? void 0,
      author: post.author || void 0,
      artist: post.artist || void 0,
      description,
      genres: [.../* @__PURE__ */ new Set([...type ? [type] : [], ...(post.genres ?? []).map((g) => g.name)])],
      status: statuses[post.seriesStatus ?? ""] ?? "unknown"
    };
  }
  var isLocked = (c) => c.isLocked === true || c.isTimeLocked === true || c.chapterPurchased === false && (c.price ?? 0) !== 0;
  function toChapter(c, mangaSlug) {
    return {
      url: `/series/${mangaSlug || c.mangaPost?.slug}/${c.slug}#${c.id}`,
      name: `${isLocked(c) ? "🔒 " : ""}Chapter ${c.number}${c.title?.trim() ? ` - ${c.title}` : ""}`,
      dateUpload: Date.parse(c.createdAt) || void 0
    };
  }
  function iken(info, options = {}) {
    const api = options.apiUrl ?? info.baseUrl.replace("https://", "https://api.");
    const showLocked = () => Honya.prefs.get("pref_show_locked_chapters") === true;
    let novelIds;
    function hiddenNovelIds() {
      if (!novelIds || Date.now() - novelIds.fetchedAt > 36e5) {
        const ids = (async () => {
          const found = /* @__PURE__ */ new Set();
          for (let page = 1; ; page++) {
            const data = await fetchJSON(`${api}/api/posts?${queryString([["page", page], ["perPage", 100]])}`);
            data.novelPosts.forEach((post) => found.add(post.id));
            if (data.novelPosts.length === 0 || found.size >= data.novelTotalCount) return found;
          }
        })();
        novelIds = { fetchedAt: Date.now(), ids };
        ids.catch(() => {
          if (novelIds?.ids === ids) novelIds = void 0;
        });
      }
      return novelIds.ids;
    }
    const skippedPages = /* @__PURE__ */ new Map();
    async function query(page, params) {
      const key = queryString(params);
      let skipped = page === 1 ? 0 : skippedPages.get(key) ?? 0;
      const hidden = options.hideNovelsListedAsComics ? await hiddenNovelIds() : void 0;
      for (; ; ) {
        const current = page + skipped;
        const data = await fetchJSON(`${api}/api/query?${queryString([["page", current], ["perPage", perPage], ...params])}`);
        const mangas = data.posts.filter((p) => !isNovel(p) && !hidden?.has(p.id)).map(toManga);
        const hasNextPage = data.totalCount > current * perPage;
        if (mangas.length > 0 || !hasNextPage) {
          if (hasNextPage && skipped > 0) skippedPages.set(key, skipped);
          else skippedPages.delete(key);
          return { mangas, hasNextPage };
        }
        skipped++;
      }
    }
    async function details(slug) {
      const data = await fetchJSON(`${api}/api/post?${queryString([["postSlug", slug]])}`);
      if (isNovel(data.post)) throw new Error("Novels are unsupported");
      return data;
    }
    return {
      info: { ...info, supportsLatest: true },
      getPopularManga(page) {
        return query(page, [["searchTerm", ""], ["orderBy", "totalViews"]]);
      },
      getLatestUpdates(page) {
        return query(page, [["searchTerm", ""], ["orderBy", "lastChapterAddedAt"]]);
      },
      searchManga(page, searchTerm, filters) {
        const params = [["searchTerm", searchTerm.trim()]];
        for (const filter of filters) {
          if (filter.type === "select") params.push([filter.id, filter.options[filter.selected]?.value ?? ""]);
        }
        return query(page, params);
      },
      async getMangaDetails(manga) {
        return toManga((await details(manga.url.split("#")[0])).post);
      },
      async getChapterList(manga) {
        const [slug, id] = manga.url.split("#");
        const data = await details(slug);
        let chapters = data.post.chapters ?? [];
        if (id && (data.totalChapterCount ?? 0) > chapters.length) {
          const all = await fetchJSON(`${api}/api/chapters?postId=${id}`);
          if (all.post.chapters.length > chapters.length) chapters = all.post.chapters;
        }
        return chapters.filter((c) => showLocked() || !isLocked(c)).map((c) => toChapter(c, slug));
      },
      async getPageList(chapter) {
        const id = chapter.url.split("#")[1];
        if (!id) throw new Error("Refresh the chapter list.");
        const { chapter: data } = await fetchJSON(`${api}/api/chapter?chapterId=${id}`);
        if (data.isShortLinkLocked) throw new Error("Chapter locked (short link)");
        if (data.isLockedByCoins) throw new Error("Chapter locked (coins required)");
        if (data.isPermanentlyLocked) throw new Error("Chapter permanently locked");
        const fileNumber = (url) => Number(/\d+/.exec(url.split("/").pop() ?? "")?.[0] ?? Number.MAX_SAFE_INTEGER);
        const images = [...data.images].sort(options.sortPagesByFilename ? (a, b) => fileNumber(a.url) - fileNumber(b.url) : (a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));
        return images.map((image) => ({ url: image.url.replace(/ /g, "%20") }));
      },
      getFilterList() {
        const select = (id, name, pairs) => ({ type: "select", id, name, options: pairs.map(([label, value]) => ({ label, value })), selected: 0 });
        return [
          select("seriesStatus", "Status", [["All", ""], ["Ongoing", "ONGOING"], ["Completed", "COMPLETED"], ["Cancelled", "CANCELLED"], ["Dropped", "DROPPED"], ["Coming Soon", "COMING_SOON"], ["Mass Released", "MASS_RELEASED"]]),
          select("seriesType", "Type", [["All", ""], ["Manga", "MANGA"], ["Manhua", "MANHUA"], ["Manhwa", "MANHWA"], ["Russian", "RUSSIAN"], ["Spanish", "SPANISH"]]),
          { ...select("orderBy", "Sort By", sortOptions), listings: { popular: "totalViews", latest: "lastChapterAddedAt" } },
          select("orderDirection", "Sort Direction", [["Descending", "desc"], ["Ascending", "asc"]])
        ];
      }
    };
  }

  // src/en/vortexscans/index.ts
  var index_default = iken({
    id: "2559570015828016575",
    name: "Vortex Scans",
    lang: "en",
    version: "1.0.3",
    baseUrl: "https://vortexscans.org",
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/vortexscans/res/mipmap-xhdpi/ic_launcher.png"
  }, { hideNovelsListedAsComics: true });
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
