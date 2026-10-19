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

  // src/all/junmeitu/index.ts
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

  // src/all/junmeitu/index.ts
  var baseUrl = "https://meijuntu.com";
  var lazySrc = (img) => img.absUrl("data-original") || img.absUrl("data-src") || img.absUrl("data-lazy-src") || img.absUrl("src");
  async function parseList(url) {
    const { document } = await fetchPage(url);
    const mangas = document.select(".pic-list > ul > li").map((e) => ({
      title: e.select("p").map((p) => p.text()).join(" "),
      thumbnailUrl: e.select("img")[0]?.absUrl("src") || void 0,
      url: relativeUrl(e.select("a")[0]?.absUrl("href") ?? "")
    }));
    return { mangas, hasNextPage: document.selectFirst("span + a  + a") != null };
  }
  async function imageOf(url) {
    const response = await send(url);
    if ((response.headers["content-type"] ?? "").includes("application/json") || /[?&]ajax=1(&|$)/.test(response.url)) {
      const pic = JSON.parse(response.body).pic;
      const img2 = Honya.parseHTML(`<body>${pic}</body>`, baseUrl).selectFirst("img");
      if (!img2) throw new Error("Image not found in AJAX response");
      return img2.absUrl("src");
    }
    const img = Honya.parseHTML(response.body, response.url).selectFirst(".pictures img");
    if (!img) throw new Error("Image not found in HTML response");
    return lazySrc(img);
  }
  var categories = [["beauty", "6"], ["handsome", "5"], ["news", "30"], ["street", "32"]];
  var sorts = [["default", "index"], ["hot", "hot"]];
  var source = {
    info: {
      id: "4721197766605490540",
      name: "Junmeitu",
      lang: "all",
      version: "1.0.2",
      baseUrl,
      supportsLatest: true,
      nsfw: true,
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/junmeitu/res/mipmap-xhdpi/ic_launcher.png"
    },
    getLatestUpdates(page) {
      return parseList(`${baseUrl}/beauty/index-${page}.html`);
    },
    getPopularManga(page) {
      return parseList(`${baseUrl}/beauty/hot-${page}.html`);
    },
    searchManga(page, query, filters) {
      const text = (id) => {
        const f = filters.find((x) => x.id === id);
        return f?.type === "text" ? f.value : "";
      };
      const select = (id) => {
        const f = filters.find((x) => x.id === id);
        return f?.type === "select" ? f.selected : 0;
      };
      const category = categories[select("category")];
      const sort = sorts[select("sort")];
      let url;
      if (query) url = `${baseUrl}/search/${encodeURIComponent(query)}-${page}.html`;
      else if (text("tag")) url = `${baseUrl}/tags/${text("tag")}-${category[1]}-${page}.html`;
      else if (text("model")) url = `${baseUrl}/model/${text("model")}-${page}.html`;
      else if (text("group")) url = `${baseUrl}/xzjg/${text("group")}-${page}.html`;
      else if (select("category") !== 0) url = `${baseUrl}/${category[0]}/${sort[1]}-${page}.html`;
      else if (select("sort") !== 0) url = `${baseUrl}/${category[0]}/${sort[1]}-${page}.html`;
      else url = `${baseUrl}/beauty/index-${page}.html`;
      return parseList(url);
    },
    async getMangaDetails(manga) {
      const { document } = await fetchPage(baseUrl + manga.url);
      return {
        title: document.selectFirst(".news-title, .title")?.text(),
        description: `${document.select(".news-info, .picture-details").map((e) => e.text()).join(" ")}
${document.select(".introduce").map((e) => e.text()).join(" ")}`,
        genres: document.select(".relation_tags > a").map((a) => a.text()),
        status: "completed"
      };
    },
    async getChapterList(manga) {
      const { document, url } = await fetchPage(baseUrl + manga.url);
      const href = document.selectFirst(".position a:last-child")?.absUrl("href");
      const date = /(\d{4})-(\d{2})-(\d{2})/.exec(document.select(".base-info span:contains(日期)").map((s) => s.text()).join(" ").split("日期:")[1] ?? "");
      return [{
        url: relativeUrl(href || url),
        name: "Gallery",
        dateUpload: date ? Date.UTC(Number(date[1]), Number(date[2]) - 1, Number(date[3])) : void 0
      }];
    },
    async getPageList(chapter) {
      const { document, url } = await fetchPage(baseUrl + chapter.url);
      const newsBody = document.selectFirst(".news-body");
      if (newsBody) return newsBody.select("img").map((img) => ({ url: lazySrc(img) }));
      const numPages = Number(document.select(".pages > a:nth-last-of-type(2)").map((a) => a.text()).join("")) || Math.max(1, ...document.select(".pages a").map((a) => Number(a.text())).filter(Number.isInteger));
      const [path, query = ""] = url.replace(/^https?:\/\/[^/]+/, "").split("?");
      const segments = path.split("/").filter(Boolean);
      const slug = (segments[segments.length - 1] ?? "").replace(/\.html$/, "").replace(/-[^-]*$/, "");
      const origin = /^https?:\/\/[^/]+/.exec(url)?.[0] ?? baseUrl;
      let first;
      let pageUrls;
      const script = document.select("script").map((s) => s.data()).find((data) => data.includes("pc_cid"));
      if (script) {
        const categoryId = script.split("pc_cid = ")[1]?.split(";")[0].trim();
        const contentId = script.split("pc_id = ")[1]?.split(";")[0].trim();
        const ajaxSegments = [...segments];
        ajaxSegments[0] = `ajax_${segments[0] ?? "beauty"}`;
        const params = query.split("&").filter((p) => p && !/^(ajax|catid|conid)=/.test(p));
        const ajaxUrl = (n) => {
          const parts = [...ajaxSegments];
          parts[parts.length - 1] = `${slug}-${n}.html`;
          return `${origin}/${parts.join("/")}?${[...params, "ajax=1", `catid=${categoryId}`, `conid=${contentId}`].join("&")}`;
        };
        const firstImage = document.selectFirst(".pictures img");
        first = firstImage ? lazySrc(firstImage) : void 0;
        pageUrls = Array.from({ length: numPages }, (_, i) => ajaxUrl(i + 1));
      } else {
        pageUrls = Array.from({ length: numPages }, (_, i) => {
          const parts = [...segments];
          parts[parts.length - 1] = `${slug}${i > 0 ? `-${i + 1}` : ""}.html`;
          return `${origin}/${parts.join("/")}${query ? `?${query}` : ""}`;
        });
      }
      return mapLimit(pageUrls, 6, async (pageUrl, index) => ({ url: index === 0 && first ? first : await imageOf(pageUrl) }));
    },
    getFilterList() {
      return [
        { type: "header", id: "h1", name: "NOTE: Ignored if using text search!" },
        { type: "header", id: "h2", name: "NOTE: Filter are weird for this extension!" },
        { type: "separator", id: "s1" },
        { type: "text", id: "tag", name: "Tag", value: "" },
        { type: "text", id: "model", name: "Model", value: "" },
        { type: "text", id: "group", name: "Group", value: "" },
        { type: "select", id: "category", name: "Category", options: categories.map(([label, value]) => ({ label, value })), selected: 0 },
        { type: "select", id: "sort", name: "Sort", options: sorts.map(([label, value]) => ({ label, value })), selected: 0, listings: { popular: "hot", latest: "index" } }
      ];
    }
  };
  var index_default = source;
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
