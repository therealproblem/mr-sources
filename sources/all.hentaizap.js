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

  // src/all/hentaizap/index.ts
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
  function parseRelativeDate(text, now = Date.now()) {
    const match = /(\d+)\s*(second|sec|minute|min|hour|day|week|month|year)s?\s*ago/i.exec(text ?? "");
    if (!match) return void 0;
    const unit = { second: 1e3, sec: 1e3, minute: 6e4, min: 6e4, hour: 36e5, day: 864e5, week: 6048e5, month: 2592e6, year: 31536e6 };
    return now - Number(match[1]) * unit[match[2].toLowerCase()];
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
  function formBody(fields) {
    return { body: queryString(fields), headers: { "Content-Type": "application/x-www-form-urlencoded" } };
  }
  var namedEntities = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    hearts: "♥",
    hellip: "…",
    mdash: "—",
    ndash: "–",
    lsquo: "‘",
    rsquo: "’",
    ldquo: "“",
    rdquo: "”"
  };
  function unescapeEntities(text) {
    return text.replace(/&(?:#(\d+)|#x([\da-f]+)|([a-z][a-z\d]*));/gi, (entity, decimal, hex, name) => {
      if (name) return namedEntities[name] ?? (Honya.parseHTML(entity).text() || entity);
      const code = decimal ? Number(decimal) : parseInt(hex, 16);
      return code > 0 && code <= 1114111 ? String.fromCodePoint(code) : entity;
    });
  }
  function imgAttr(element) {
    if (element.hasAttr("data-cfsrc")) return element.absUrl("data-cfsrc");
    if (element.hasAttr("data-src")) return element.absUrl("data-src");
    if (element.hasAttr("data-lazy-src")) return element.absUrl("data-lazy-src");
    if (element.hasAttr("srcset")) return element.absUrl("srcset").split(" ")[0];
    return element.absUrl("src");
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

  // themes/galleryadults.ts
  var LANGUAGE_MULTI = "";
  var LANGUAGE_SPEECHLESS = "speechless";
  var languageSlugs = {
    en: "english",
    ja: "japanese",
    zh: "chinese",
    ko: "korean",
    es: "spanish",
    fr: "french",
    de: "german",
    ru: "russian",
    all: LANGUAGE_MULTI
  };
  function galleryAdults(options) {
    const { info, mangaLang } = options;
    const baseUrl = info.baseUrl;
    const host = baseUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    const supportsLatest = info.supportsLatest ?? true;
    const useIntermediateSearch = options.useIntermediateSearch ?? false;
    const useBasicSearch = !useIntermediateSearch;
    const supportAdvancedSearch = options.supportAdvancedSearch ?? false;
    const supportSpeechless = options.supportSpeechless ?? false;
    const titleSelector = options.mangaTitleSelector ?? ".caption";
    const listSelector = options.popularMangaSelector ?? "div.thumb";
    const nextPageSelector = ".pagination li.active + li:not(.disabled), a[rel='next']";
    const idPrefixUri = options.idPrefixUri ?? "gallery";
    const detailSelector = options.mangaDetailInfoSelector ?? ".gallery_top";
    const thumbnailSelector = options.thumbnailSelector ?? ".gallery_thumb";
    const pageUri = options.pageUri ?? "g";
    const xhrHeaders = { "X-Requested-With": "XMLHttpRequest" };
    const shortTitle = () => Honya.prefs.get("pref_short_title") === true;
    const fullTitle = (element, selector) => {
      const title = element.selectFirst(selector)?.text();
      return title && unescapeEntities(title);
    };
    const mangaTitle = (element, selector = titleSelector) => {
      const title = fullTitle(element, selector);
      return title && shortTitle() ? title.replace(/(\[[^\]]*]|[({][^)}]*[)}])/g, "").trim() : title;
    };
    const mangaUrl = options.mangaUrl ?? ((e) => e.selectFirst(".inner_thumb a")?.absUrl("href"));
    const mangaThumbnail = options.mangaThumbnail ?? ((e) => {
      const img = e.selectFirst(".inner_thumb img");
      return img ? imgAttr(img) : void 0;
    });
    const mangaLangOf = options.mangaLangOf ?? (() => mangaLang);
    const cover = options.cover ?? ((e) => {
      const img = e.selectFirst(".cover img");
      return img ? imgAttr(img) : void 0;
    });
    const infoTagName = options.infoTagName ?? ((e) => e.ownText());
    const inputValue = (e, id) => e.select(`input[id=${id}]`)[0]?.attr("value") ?? "";
    const galleryId = options.galleryId ?? ((e) => inputValue(e, "gallery_id"));
    const totalPages = options.totalPages ?? ((e) => inputValue(e, "load_pages"));
    const addPageUri = (url, page) => `${url.replace(/^\/+|\/+$/g, "")}${url.includes("?") ? "&" : "/?"}page=${page}`;
    const popularMangaUrl = `${baseUrl}/${mangaLang ? `language/${mangaLang}/` : ""}${supportsLatest ? "popular" : ""}`;
    const latestUpdatesUrl = `${baseUrl}/${mangaLang ? `language/${mangaLang}` : ""}`;
    async function load(url) {
      const response = await send(url);
      options.checkPage?.(response.body);
      return { document: Honya.parseHTML(response.body, response.url), url: response.url };
    }
    function listItem(element) {
      const title = mangaTitle(element);
      const url = mangaUrl(element);
      if (!title || !url) return void 0;
      return { title, url: relativeUrl(url), thumbnailUrl: mangaThumbnail(element) || void 0 };
    }
    function parseList(document) {
      const mangas = document.select(listSelector).map(listItem).filter((m) => m != null);
      return { mangas, hasNextPage: document.selectFirst(nextPageSelector) != null };
    }
    function parseSearch(document, url) {
      if (url.includes("/login/") && document.select("input[value=Login]").length > 0) {
        throw new Error("Log in through the web view to see favorites.");
      }
      const hasNextPage = document.selectFirst(nextPageSelector) != null;
      const unfiltered = document.select(listSelector).flatMap((element) => {
        const item = listItem(element);
        return item ? [{ item, lang: mangaLangOf(element) }] : [];
      });
      let results = unfiltered.filter(({ lang }) => !mangaLang || lang === LANGUAGE_SPEECHLESS || lang === mangaLang);
      if (results.length === 0 && hasNextPage) results = unfiltered.slice(0, 1);
      return { mangas: results.map(({ item }) => item), hasNextPage };
    }
    function getInfo(element, tag) {
      return element.select(options.infoSelector(tag)).flatMap((e) => [infoTagName(e), e.select(".split_tag").map((s) => s.text()).join(" ").replace(/^\| /, "").trim()]).filter((text) => text.trim() !== "").sort();
    }
    function parseDetails(document) {
      const info2 = document.selectFirst(detailSelector);
      if (!info2) throw new Error("The gallery page has changed.");
      const description = [
        ...["Parodies", "Characters", "Groups", "Languages", "Categories", "Category"].flatMap((tag) => {
          const values = getInfo(info2, tag);
          return values.length ? [`**${tag}**: ${values.join(", ")}`] : [];
        }),
        ...[
          ["Pages", totalPages(document)],
          ["Alternative title", unescapeEntities(info2.selectFirst("h1 + h2, .subtitle")?.ownText() ?? "")],
          ["Full title", shortTitle() ? fullTitle(info2, "h1") : void 0]
        ].flatMap(([label, value]) => value?.trim() ? [`**${label}**: ${value}`] : [])
      ].join("\n\n");
      const artists = getInfo(info2, "Artists");
      return {
        title: mangaTitle(info2, "h1"),
        thumbnailUrl: cover(info2),
        genres: getInfo(info2, "Tags"),
        author: (artists.length ? artists : getInfo(info2, "Groups")).join(", ") || void 0,
        description,
        status: "completed"
      };
    }
    async function getMangaById(id) {
      const { document } = await load(`${baseUrl}/${idPrefixUri}/${id}`);
      return { ...parseDetails(document), title: mangaTitle(document.selectFirst(detailSelector), "h1") ?? id, url: `/${idPrefixUri}/${id}/` };
    }
    const sortOrders = [["Popular", "pp"], ["Latest", "lt"], ...useIntermediateSearch || supportAdvancedSearch ? [["Downloads", "dl"], ["Top Rated", "tr"]] : []];
    const categories = [["Manga", "m"], ["Doujinshi", "d"], ["Western", "w"], ["Image Set", "i"], ["Artist CG", "a"], ["Game CG", "g"]];
    const languageFlags = [["english", "en"], ["japanese", "jp"], ["spanish", "es"], ["french", "fr"], ["korean", "kr"], ["german", "de"], ["russian", "ru"]];
    const advancedKeys = [["tags", "tag"], ["parodies", "parody"], ["artists", "artist"], ["characters", "character"], ["groups", "group"]];
    const searchTerms = (query) => [query].filter((t) => t.trim()).map((t) => t.trim().replace(/(?<!,)\s+/g, "+").replace(/ /g, "")).map((t) => encodeURIComponent(t).replace(/%2B/gi, "+").replace(/%2C/gi, ",")).join(",");
    function flags(filters, sort) {
      const categoryFilter = filters.find((f) => f.id === "categories");
      const checked = categoryFilter?.type === "checkboxes" ? categoryFilter.checked : categories.map(([, uri]) => uri);
      return [
        ...sortOrders.map(([, uri], index) => [uri, index === sort ? "1" : "0"]),
        ...categories.map(([, uri]) => [uri, checked.includes(uri) ? "1" : "0"]),
        ...languageFlags.map(([slug, uri]) => [uri, mangaLang === slug || mangaLang === LANGUAGE_MULTI ? "1" : "0"])
      ];
    }
    return {
      info: { ...info, supportsLatest },
      async getPopularManga(page) {
        return parseList((await load(addPageUri(popularMangaUrl, page))).document);
      },
      async getLatestUpdates(page) {
        return parseList((await load(addPageUri(latestUpdatesUrl, page))).document);
      },
      async searchManga(page, query, filters) {
        if (/^\d+$/.test(query.trim())) return { mangas: [await getMangaById(query.trim())], hasNextPage: false };
        const checked = (id) => filters.some((f) => f.id === id && f.type === "checkboxes" && f.checked.length > 0);
        const sortFilter = filters.find((f) => f.id === "sort");
        const sort = sortFilter?.type === "select" ? sortFilter.selected : 0;
        if (checked("random")) {
          const { document, url: url2 } = await load(`${baseUrl}/random/`);
          const id = url2.replace(/\/$/, "").split("/").pop();
          return { mangas: [{ title: mangaTitle(document, "h1") ?? "", url: `/${idPrefixUri}/${id}/`, thumbnailUrl: cover(document) }], hasNextPage: false };
        }
        const advanced = advancedKeys.flatMap(([id, key]) => {
          const filter = filters.find((f) => f.id === id);
          if (filter?.type !== "text" || !filter.value.trim()) return [];
          return filter.value.trim().replace(/(?<!,)\s+/g, "+").replace(/ /g, "").split(",").flatMap((term) => {
            const match = /^(-?)"?(.+)"?/.exec(term);
            return match ? [`${match[1] ? "-" : "%2B"}${key}:"${encodeURIComponent(match[2]).replace(/%2B/gi, "+")}"`] : [];
          });
        });
        let url;
        if (supportSpeechless && checked("speechless")) {
          url = `${baseUrl}/language/${LANGUAGE_SPEECHLESS}${sort === 0 ? "/popular" : ""}`;
        } else if (supportAdvancedSearch && advanced.length > 0) {
          url = `${baseUrl}/advsearch/?${queryString(flags(filters, sort))}&key=${advanced.join("+")}`;
        } else if (useIntermediateSearch) {
          url = `${baseUrl}/search/?${queryString(flags(filters, sort))}&${options.intermediateSearchKey ?? "key"}=${searchTerms(query)}`;
        } else if (useBasicSearch && query.trim()) {
          url = `${baseUrl}/search/?${options.basicSearchKey ?? "q"}=${searchTerms(query)}${sort === 0 ? "&sort=popular" : ""}`;
        } else if (sort === 1) {
          url = latestUpdatesUrl;
        } else {
          url = popularMangaUrl;
        }
        const result = await load(addPageUri(url, page));
        return parseSearch(result.document, result.url);
      },
      async getMangaDetails(manga) {
        return parseDetails((await load(baseUrl + manga.url)).document);
      },
      async getChapterList(manga) {
        const { document, url } = await load(baseUrl + manga.url);
        const info2 = document.selectFirst(detailSelector);
        const uploaded = document.selectFirst(".uploaded")?.ownText();
        return [{
          url: relativeUrl(url).replace(/[?#].*$/, ""),
          name: "Chapter",
          scanlator: info2 ? getInfo(info2, "Groups").join(", ") || void 0 : void 0,
          dateUpload: parseDate(uploaded) ?? parseRelativeDate(uploaded)
        }];
      },
      async getPageList(chapter) {
        const { document } = await load(baseUrl + chapter.url);
        const loadDir = inputValue(document, "load_dir");
        const loadId = inputValue(document, "load_id");
        const id = galleryId(document);
        const serverNumber = inputValue(document, "load_server");
        const server = serverNumber ? `m${serverNumber}.${host}` : (cover(document) ?? "").replace(/^https?:\/\//, "").replace(/\/.*$/, "");
        const imagesUri = `https://${server}/${loadDir}/${loadId}`;
        const script = document.select("script").map((s) => s.data()).find((data) => data.includes("$.parseJSON('"));
        const json = script?.split("$.parseJSON('")[1]?.split("');")[0]?.trim();
        if (json) {
          try {
            const images = JSON.parse(json);
            const extensions = { p: "png", b: "bmp", g: "gif", w: "webp" };
            return Object.entries(images).map(([page, value]) => ({ url: `${imagesUri}/${page}.${extensions[String(value).split(",")[0]] ?? "jpg"}` }));
          } catch {
          }
        }
        const total = Number(totalPages(document)) || 0;
        if (options.parsingImagePageByPage) {
          const pageUrls = Array.from({ length: total }, (_, i) => `${baseUrl}/${pageUri}/${id}/${i + 1}/`);
          return mapLimit(pageUrls, 6, async (pageUrl) => {
            const page = (await load(pageUrl)).document.selectFirst("img#gimg, img#fimg, img#readerImg");
            return { url: page ? imgAttr(page) : "" };
          });
        }
        const thumbnails = document.select(`${thumbnailSelector} a`).flatMap((a) => {
          const img = a.selectFirst("img");
          return img ? [imgAttr(img)] : [];
        });
        if (total > thumbnails.length) {
          const token = document.select("[name=csrf-token]")[0]?.attr("content") ?? "";
          const form = formBody([
            ["u_id", id],
            ["g_id", loadId],
            ["img_dir", loadDir],
            ["visible_pages", String(thumbnails.length)],
            ["total_pages", String(total)],
            ["type", "2"],
            ...token ? [["_token", token]] : [],
            ...serverNumber ? [["server", serverNumber]] : []
          ]);
          const response = await send({ url: `${baseUrl}/inc/thumbs_loader.php`, method: "POST", headers: { ...xhrHeaders, ...form.headers }, body: form.body });
          const more = Honya.parseHTML(response.body, response.url).select("a").flatMap((a) => {
            const img = a.selectFirst("img");
            return img ? [imgAttr(img)] : [];
          });
          if (more.length > 0) {
            thumbnails.push(...more);
          } else {
            const first = document.select(`${thumbnailSelector} img`)[0];
            const extension = first ? imgAttr(first).split(".").pop() : "jpg";
            for (let i = thumbnails.length + 1; i <= total; i++) thumbnails.push(`${imagesUri}/${i}t.${extension}`);
          }
        }
        return thumbnails.map((url) => ({ url: thumbnailToFull(url) }));
      },
      getFilterList() {
        const filters = [];
        if (useIntermediateSearch) filters.push({ type: "header", id: "hint", name: "HINT: Separate search term with comma (,)" });
        filters.push({ type: "select", id: "sort", name: "Sort By", options: sortOrders.map(([label, value]) => ({ label, value })), selected: 0, listings: supportsLatest ? { popular: "pp", latest: "lt" } : { popular: "pp" } });
        if (useIntermediateSearch || supportAdvancedSearch) {
          filters.push({ type: "separator", id: "s1" });
          filters.push({ type: "checkboxes", id: "categories", name: "Categories", options: categories.map(([label, value]) => ({ label, value })), checked: categories.map(([, uri]) => uri) });
        }
        if (supportAdvancedSearch) {
          filters.push(
            { type: "separator", id: "s2" },
            { type: "header", id: "advanced", name: "Advanced filters will ignore query search. Separate terms by comma (,) and precede term with minus (-) to exclude." },
            ...advancedKeys.map(([id]) => ({ type: "text", id, name: id.charAt(0).toUpperCase() + id.slice(1), value: "" }))
          );
        }
        filters.push({ type: "separator", id: "s3" });
        if (supportSpeechless) filters.push({ type: "checkboxes", id: "speechless", name: "Speechless", options: [{ label: "Show speechless items only", value: "on" }], checked: [] });
        filters.push({ type: "checkboxes", id: "random", name: "Random", options: [{ label: "Random manga", value: "on" }], checked: [] });
        return filters;
      }
    };
  }
  function thumbnailToFull(url) {
    const extension = url.split(".").pop();
    return url.replace(`t.${extension}`, `.${extension}`);
  }

  // src/all/hentaizap/index.ts
  var languages = [
    ["3055889891446984546", "en"],
    ["6555947477839387123", "ja"],
    ["4825793506555725623", "es"],
    ["7896453910191786163", "fr"],
    ["9190914504602528025", "ko"],
    ["1397842818609440667", "de"],
    ["6614026304171193007", "ru"],
    ["279262715881564190", "all"]
  ];
  var index_default = languages.map(([id, lang]) => galleryAdults({
    info: {
      id,
      name: "HentaiZap",
      lang,
      version: "1.0.3",
      baseUrl: "https://hentaizap.com",
      nsfw: true,
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/hentaizap/res/mipmap-xhdpi/ic_launcher.png"
    },
    mangaLang: languageSlugs[lang],
    supportSpeechless: true,
    useIntermediateSearch: true,
    basicSearchKey: "key",
    popularMangaSelector: ".hz-gallery-card",
    mangaTitleSelector: ".hz-gallery-card__title a",
    mangaUrl: (e) => e.selectFirst(".hz-gallery-card__cover")?.absUrl("href"),
    mangaThumbnail: (e) => {
      const img = e.selectFirst(".hz-gallery-card__media.thumb img");
      return img ? imgAttr(img) : void 0;
    },
    mangaLangOf: (e) => (e.select(".hz-gallery-card__flag")[0]?.attr("href") ?? "").replace(/\/$/, "").split("/").pop() ?? "",
    mangaDetailInfoSelector: ".hz-gallery-details",
    cover: (e) => {
      const img = e.selectFirst(".hz-gallery-cover img");
      return img ? imgAttr(img) : void 0;
    },
    infoSelector: (tag) => `div.hz-gallery-entity-group:has(:contains(${tag}:)) a.hz-gallery-tag`,
    infoTagName: (e) => e.selectFirst(".hz-gallery-tag__name")?.text() ?? e.ownText(),
    galleryId: (e) => e.select("[data-gallery-id]")[0]?.attr("data-gallery-id") ?? "",
    totalPages: (e) => e.select("[data-total-pages]")[0]?.attr("data-total-pages") ?? "",
    parsingImagePageByPage: true
  }));
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
