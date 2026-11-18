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

  // src/en/mangakakalot/index.ts
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

  // themes/mangabox.ts
  var genres = [["All", "all"], ["4-Koma", "4-koma"], ["Action", "action"], ["Adaptation", "adaptation"], ["Adult", "adult"], ["Adventure", "adventure"], ["Age gap", "age-gap"], ["Ai art", "ai-art"], ["Aliens", "aliens"], ["Animals", "animals"], ["Anthology", "anthology"], ["Artbook", "artbook"], ["Avant garde", "avant-garde"], ["Award winning", "award-winning"], ["Beasts", "beasts"], ["Boys love", "boys-love"], ["Blackmail", "blackmail"], ["Bloody", "bloody"], ["Bodyswap", "bodyswap"], ["Brocon/Siscon", "brocon-siscon"], ["Cars", "cars"], ["Cartoon", "cartoon"], ["Cheating infidelity", "cheating-infidelity"], ["Childhood friends", "childhood-friends"], ["College life", "college-life"], ["Comedy", "comedy"], ["Comic", "comic"], ["Contest winning", "contest-winning"], ["Cooking", "cooking"], ["Creators", "creators"], ["Crime", "crime"], ["Crossdressing", "crossdressing"], ["Cultivation", "cultivation"], ["Death game", "death-game"], ["Degeneratemc", "degeneratemc"], ["Delinquents", "delinquents"], ["Dementia", "dementia"], ["Demons", "demons"], ["Doujinshi", "doujinshi"], ["Drama", "drama"], ["Ecchi", "ecchi"], ["Employee", "employee"], ["Erotica", "erotica"], ["Fan colored", "fan-colored"], ["Fantasy", "fantasy"], ["Female protagonists", "female-protagonists"], ["Fetish", "fetish"], ["Full color", "full-color"], ["Game", "game"], ["Gender bender", "gender-bender"], ["Genderswap", "genderswap"], ["Ghosts", "ghosts"], ["Girls love", "girls-love"], ["Gore", "gore"], ["Gourmet", "gourmet"], ["Graphic novel", "graphic-novel"], ["Gyaru", "gyaru"], ["Harem", "harem"], ["Heartwarming", "heartwarming"], ["Hentai", "hentai"], ["Historical", "historical"], ["Horror", "horror"], ["Imageset", "imageset"], ["Incest", "incest"], ["Informative", "informative"], ["Isekai", "isekai"], ["Iyashikei", "iyashikei"], ["Josei", "josei"], ["Kids", "kids"], ["Korean", "korean"], ["Liexing", "liexing"], ["Loli", "loli"], ["Long strip", "long-strip"], ["Mafia", "mafia"], ["Magic", "magic"], ["Magical girls", "magical-girls"], ["Mahou shoujo", "mahou-shoujo"], ["Male protagonists", "male-protagonists"], ["Manga", "manga"], ["Mangatoon", "mangatoon"], ["Manhua", "manhua"], ["Manhwa", "manhwa"], ["Martial arts", "martial-arts"], ["Master servant", "master-servant"], ["Mature", "mature"], ["Mecha", "mecha"], ["Medical", "medical"], ["Military", "military"], ["Monsters", "monsters"], ["Monster girls", "monster-girls"], ["Murim", "murim"], ["Music", "music"], ["Mystery", "mystery"], ["Netorare", "netorare"], ["Netori", "netori"], ["Ninja", "ninja"], ["Non human", "non-human"], ["Office", "office"], ["Office workers", "office-workers"], ["Official colored", "official-colored"], ["Old people", "old-people"], ["Omegaverse", "omegaverse"], ["One shot", "one-shot"], ["Others", "others"], ["Overpowered", "overpowered"], ["Parody", "parody"], ["Philosophical", "philosophical"], ["Ping ping jun", "ping-ping-jun"], ["Police", "police"], ["Pornographic", "pornographic"], ["Post apocalyptic", "post-apocalyptic"], ["Psychological", "psychological"], ["Reincarnation", "reincarnation"], ["Revenge", "revenge"], ["Reverse", "reverse"], ["Reverse harem", "reverse-harem"], ["Romance", "romance"], ["Royal family", "royal-family"], ["Royalty", "royalty"], ["Samurai", "samurai"], ["School", "school"], ["School life", "school-life"], ["Sci fi", "sci-fi"], ["Science fiction", "science-fiction"], ["Seinen", "seinen"], ["Self published", "self-published"], ["Sexual violence", "sexual-violence"], ["Shota", "shota"], ["Shoujo", "shoujo"], ["Shoujo ai", "shoujo-ai"], ["Shounen", "shounen"], ["Shounen ai", "shounen-ai"], ["Showbiz", "showbiz"], ["Slice of life", "slice-of-life"], ["Smut", "smut"], ["Sm bdsm", "sm-bdsm"], ["Soft yaoi", "soft-yaoi"], ["Space", "space"], ["Sports", "sports"], ["Spy", "spy"], ["Step family", "step-family"], ["Super power", "super-power"], ["Superhero", "superhero"], ["Supernatural", "supernatural"], ["Survival", "survival"], ["Suspense", "suspense"], ["System", "system"], ["Teacher student", "teacher-student"], ["Thriller", "thriller"], ["Time travel", "time-travel"], ["Traditional games", "traditional-games"], ["Tragedy", "tragedy"], ["Vampires", "vampires"], ["Video games", "video-games"], ["Villainess", "villainess"], ["Violence", "violence"], ["Virtual reality", "virtual-reality"], ["Web comic", "web-comic"], ["Webtoons", "webtoons"], ["Western", "western"], ["Wuxia", "wuxia"], ["Xianxia", "xianxia"], ["Yaoi", "yaoi"], ["Yuri", "yuri"], ["Zombies", "zombies"]];
  var filterIds = {
    "newest/all": "1",
    "newest/completed": "2",
    "newest/ongoing": "3",
    "latest/all": "4",
    "latest/completed": "5",
    "latest/ongoing": "6",
    "topview/all": "7",
    "topview/completed": "8",
    "topview/ongoing": "9"
  };
  function normalizeSearchQuery(query) {
    return query.toLowerCase().replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, "a").replace(/[èéẹẻẽêềếệểễ]/g, "e").replace(/[ìíịỉĩ]/g, "i").replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, "o").replace(/[ùúụủũưừứựửữ]/g, "u").replace(/[ỳýỵỷỹ]/g, "y").replace(/đ/g, "d").replace(/[!@%^*()+=<>?/,.:;' "&#[\]~\-_]|$/g, "_").replace(/_+_/g, "_").replace(/^_+|_+$/g, "");
  }
  function parseStatus(text) {
    return text.includes("Ongoing") ? "ongoing" : text.includes("Completed") ? "completed" : "unknown";
  }
  function mangabox(info, options = {}) {
    const { baseUrl } = info;
    const defaultSlug = (manga) => manga.url.replace(/\/+$/, "").split("/").pop() ?? "";
    const slugOf = (manga) => manga.sourceData || (options.mangaSlug ?? defaultSlug)(manga);
    async function list(url, selector, nextSelector) {
      const document = await fetchHTML(url);
      const mangas = document.select(selector).flatMap((element) => {
        const link = element.selectFirst("h3 a");
        if (!link) return [];
        const manga = { url: link.absUrl("href").replace(baseUrl, ""), title: link.text(), thumbnailUrl: element.selectFirst("img")?.absUrl("src") || void 0 };
        return [{ ...manga, sourceData: (options.mangaSlug ?? defaultSlug)(manga) }];
      });
      return { mangas, hasNextPage: document.selectFirst(nextSelector) != null };
    }
    const listSelector = "div.truyen-list > div.list-truyen-item-wrap:has(a[data-id]), div.comic-list > .list-comic-item-wrap:has(a[data-id])";
    const listNext = "div.group_page, div.group-page a:not([href]) + a:not(:contains(Last))";
    const searchSelector = ".panel_story_list .story_item, div.list-truyen-item-wrap, div.list-comic-item-wrap";
    const searchNext = "a.page_select + a:not(.page_last), a.page-select + a:not(.page-last)";
    return {
      info: { supportsLatest: true, ...info },
      getPopularManga(page) {
        return list(`${baseUrl}/manga-list/hot-manga?page=${page}`, listSelector, listNext);
      },
      getLatestUpdates(page) {
        return list(`${baseUrl}/manga-list/latest-manga?page=${page}`, listSelector, listNext);
      },
      searchManga(page, query, filters) {
        if (query.trim()) return list(`${baseUrl}/search/story/${encodeURIComponent(normalizeSearchQuery(query))}?page=${page}`, searchSelector, searchNext);
        const value = (id2) => {
          const filter = filters.find((f) => f.id === id2);
          return filter?.type === "select" ? filter.options[filter.selected]?.value : void 0;
        };
        const id = filterIds[`${value("sort") ?? "latest"}/${value("status") ?? "all"}`];
        return list(`${baseUrl}/genre/${value("genre") ?? "all"}?${queryString([...id ? [["filter", id]] : [], ["page", page]])}`, searchSelector, searchNext);
      },
      async getMangaDetails(manga) {
        const slug = slugOf(manga);
        const document = await fetchHTML(`${baseUrl}/manga/${slug}`);
        const infoElement = document.selectFirst("div.manga-info-top, div.panel-story-info");
        if (!infoElement && document.selectFirst("body")?.text().startsWith("REDIRECT :")) throw new Error("Source URL has changed");
        const title = infoElement?.selectFirst("h1, h2")?.text() ?? manga.title;
        let description = (document.selectFirst("div#noidungm, div#panel-story-info-description, div#contentBox")?.ownText() ?? "").replace(new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} summary:\\s`), "");
        const altName = document.selectFirst(".story-alternative, tr:has(.info-alternative) h2")?.ownText();
        if (altName) description = description ? `${description}

Alternative Name: ${altName}` : `Alternative Name: ${altName}`;
        const genreLinks = infoElement?.selectFirst("div.manga-info-top li:contains(genres)")?.select("a") ?? infoElement?.select("td:containsOwn(genres) + td a") ?? [];
        return {
          url: `/manga/${slug}`,
          title,
          author: infoElement?.select("li:contains(author) a, td:containsOwn(author) + td a").map((a) => a.text()).join(", ") || void 0,
          status: parseStatus(infoElement?.select("li:contains(status), td:containsOwn(status) + td").map((e) => e.text()).join(" ") ?? ""),
          genres: genreLinks.map((a) => a.text()),
          description: description || void 0,
          thumbnailUrl: document.selectFirst("div.manga-info-pic img, span.info-image img")?.absUrl("src") || void 0,
          sourceData: slug
        };
      },
      async getChapterList(manga) {
        const slug = slugOf(manga);
        const response = await Honya.request(`${baseUrl}/api/manga/${slug}/chapters?limit=-1`);
        let result;
        try {
          result = JSON.parse(response.body);
        } catch {
          return [];
        }
        if (!result.success) return [];
        return (result.data?.chapters ?? []).flatMap((c) => c.chapter_slug ? [{
          // Absolute, as Mihon stores it.
          url: `${baseUrl}/manga/${slug}/${c.chapter_slug}`,
          name: c.chapter_name || "Chapter",
          chapterNumber: c.chapter_num ?? 0,
          scanlator: baseUrl.replace("https://", ""),
          dateUpload: c.updated_at && Date.parse(c.updated_at) || void 0
        }] : []);
      },
      async getPageList(chapter) {
        const document = await fetchHTML(chapter.url.startsWith("http") ? chapter.url : baseUrl + chapter.url);
        const script = document.select("script").map((s) => s.data()).filter((d) => d.includes("cdns =")).join("\n");
        const array = (name) => {
          const match = new RegExp(`${name}\\s*=\\s*\\[([^\\]]+)]`).exec(script);
          return match ? match[1].split(",").map((s) => s.trim().replace(/^"|"$/g, "").replace(/\\\//g, "/").replace(/\/$/, "")) : [];
        };
        const cdns = [...array("cdns"), ...array("backupImage")];
        const images = array("chapterImages");
        if (images.length > 0 && cdns.length > 0) {
          const origin = /^https?:\/\/[^/]+/.exec(cdns[0])?.[0] ?? cdns[0];
          return images.map((path) => ({ url: origin + `/${path}`.replace(/\/\/+/g, "/") }));
        }
        return document.select("div.container-chapter-reader > img").map((img) => ({ url: img.absUrl("src") }));
      },
      getFilterList() {
        const options2 = (pairs) => pairs.map(([label, value]) => ({ label, value }));
        return [
          { type: "header", id: "note", name: "NOTE: Ignored if using text search!" },
          { type: "separator", id: "sep" },
          { type: "select", id: "sort", name: "Order by", options: options2([["Latest", "latest"], ["Newest", "newest"], ["Top read", "topview"]]), selected: 0, listings: { latest: "latest" } },
          { type: "select", id: "status", name: "Status", options: options2([["ALL", "all"], ["Completed", "completed"], ["Ongoing", "ongoing"]]), selected: 0 },
          { type: "select", id: "genre", name: "Category", options: options2(genres), selected: 0 }
        ];
      }
    };
  }

  // src/en/mangakakalot/index.ts
  var titleToSlug = (title) => title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/[\s-]+/g, "-").replace(/^-+|-+$/g, "");
  var index_default = mangabox({
    id: "2528986671771677900",
    name: "Mangakakalot",
    lang: "en",
    version: "1.0.1",
    baseUrl: "https://www.kakamanga.com",
    rateLimits: [{ host: "www.kakamanga.com", permits: 2, periodMs: 1e3 }],
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/mangakakalot/res/mipmap-xhdpi/ic_launcher.png"
  }, {
    // Old entries kept ids like "ab12345" where the site now wants the title's slug.
    mangaSlug(manga) {
      const slug = manga.url.replace(/\/+$/, "").split("/").pop() ?? "";
      return /^[a-z]{2}\d+$/.test(slug) ? titleToSlug(manga.title) : slug;
    }
  });
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
