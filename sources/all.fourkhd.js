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

  // src/all/fourkhd/index.ts
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
  function queryParams(url) {
    const query = /\?([^#]*)/.exec(url)?.[1] ?? "";
    return query.split("&").filter(Boolean).map((pair) => {
      const [name, value = ""] = pair.split("=");
      const decode = (text) => {
        try {
          return decodeURIComponent(text.replace(/\+/g, " "));
        } catch {
          return text;
        }
      };
      return [decode(name), decode(value)];
    });
  }
  function queryParam(url, name) {
    return queryParams(url).find(([key]) => key === name)?.[1];
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

  // src/all/fourkhd/index.ts
  var baseUrl = "https://www.4khd.com";
  var pageSize = 20;
  var htmlText = (html) => Honya.parseHTML(`<body>${html}</body>`).text().trim();
  var isImage = (url) => /\.(?:jpe?g|png|webp|gif|avif)(?:$|\?)/i.test(url);
  var linkPath = (post) => (post.link ? /^https?:\/\/[^/]+([^?#]*)/.exec(post.link)?.[1] : void 0) || "/";
  var postData = (id) => id != null ? JSON.stringify({ post_id: id }) : void 0;
  function imageUrls(html) {
    if (!html.trim()) return [];
    const document = Honya.parseHTML(`<body>${html}</body>`, baseUrl);
    const root = document.selectFirst(".entry-content.wp-block-post-content, .entry-content") ?? document;
    const unique = (urls) => [...new Map(urls.map((url) => [url.split("?")[0], url])).values()];
    const images = root.select("img[data-src], img[data-lazy-src], img[src]").flatMap((img) => {
      const url = [img.absUrl("data-src"), img.absUrl("data-lazy-src"), img.absUrl("src")].map((u) => u.trim()).find(isImage);
      return url ? [url] : [];
    });
    return images.length ? unique(images) : unique(root.select("a[href]").map((a) => a.absUrl("href").trim()).filter(isImage));
  }
  var thumbnail = (post) => post.jetpack_featured_media_url ?? post._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? imageUrls(post.content?.rendered ?? "")[0];
  var genres = (post) => [...new Set((post._embedded?.["wp:term"] ?? []).flat().map((t) => t.name ?? "").filter(Boolean))];
  var mirror;
  async function posts(params) {
    const query = queryString(params);
    let response = await send(`${mirror ?? baseUrl}/index.php?${query}`);
    if (response.body.trimStart().startsWith("<")) {
      const sites = /const sites = \[([^\]]*)\]/.exec(response.body)?.[1].match(/https?:\/\/[^'"\s,]+/g) ?? [];
      for (const site of sites) {
        const attempt = await Honya.request(`${site.replace(/\/+$/, "")}/index.php?${query}`).catch(() => void 0);
        if (attempt && attempt.status === 200 && !attempt.body.trimStart().startsWith("<")) {
          mirror = site.replace(/\/+$/, "");
          response = attempt;
          break;
        }
      }
    }
    const body = JSON.parse(response.body);
    return { posts: Array.isArray(body) ? body : [body], totalPages: Number(response.headers["x-wp-totalpages"]) || void 0 };
  }
  async function listing(page, extra) {
    const result = await posts([["rest_route", "/wp/v2/posts"], ["page", String(page)], ["per_page", String(pageSize)], ["_embed", "1"], ...extra]);
    const mangas = result.posts.flatMap((post) => {
      const path = linkPath(post);
      if (path === "/") return [];
      return [{ title: htmlText(post.title?.rendered ?? ""), thumbnailUrl: thumbnail(post), genres: genres(post), status: "completed", url: path, sourceData: postData(post.id) }];
    });
    return { mangas, hasNextPage: page < (result.totalPages ?? page) };
  }
  async function postFor(path, sourceData) {
    let postId = Number(queryParam(path, "post_id")) || void 0;
    if (postId == null && sourceData) {
      try {
        postId = JSON.parse(sourceData).post_id;
      } catch {
      }
    }
    const bare = path.split("?")[0];
    const slug = /\/([^/]+)\.html(?:\/\d+)?\/?$/.exec(bare)?.[1] ?? bare.replace(/\/$/, "").split("/").pop()?.split(".html")[0] ?? "";
    const params = [["rest_route", postId != null ? `/wp/v2/posts/${postId}` : "/wp/v2/posts"], ["_embed", "1"]];
    if (postId == null) params.push(slug ? ["slug", slug] : ["search", bare.replace(/^\/+|\/+$/g, "").split("/").pop() || bare]);
    const post = (await posts(params)).posts[0];
    if (!post) throw new Error("Missing post details from API");
    return post;
  }
  var source = {
    info: {
      id: "6501663152246384585",
      name: "4KHD",
      lang: "all",
      version: "1.0.1",
      baseUrl,
      supportsLatest: true,
      nsfw: true,
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/fourkhd/res/mipmap-xhdpi/ic_launcher.png"
    },
    getPopularManga(page) {
      return listing(page, [["orderby", "modified"]]);
    },
    getLatestUpdates(page) {
      return listing(page, [["orderby", "date"]]);
    },
    searchManga(page, query) {
      return listing(page, [["orderby", "date"], ...query.trim() ? [["search", query]] : []]);
    },
    async getMangaDetails(manga) {
      const post = await postFor(manga.url, manga.sourceData);
      return { title: htmlText(post.title?.rendered ?? ""), genres: genres(post), thumbnailUrl: thumbnail(post), status: "completed", sourceData: postData(post.id) };
    },
    async getChapterList(manga) {
      const post = await postFor(manga.url, manga.sourceData);
      return [{ url: relativeUrl(linkPath(post)), sourceData: postData(post.id), chapterNumber: 1, name: "Gallery", dateUpload: post.date ? Date.parse(post.date) || void 0 : void 0 }];
    },
    async getPageList(chapter) {
      const post = await postFor(chapter.url, chapter.sourceData);
      return imageUrls(post.content?.rendered ?? "").map((url) => ({ url }));
    }
  };
  var index_default = source;
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
