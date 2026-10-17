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

  // src/all/xgmn/index.ts
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

  // src/all/xgmn/index.ts
  var baseUrl = "http://xgmn8.vip";
  var current;
  var origin = (url) => /^https?:\/\/[^/]+/.exec(url)?.[0];
  async function load(path) {
    const page = await fetchPage(`${current ?? baseUrl}${path}`);
    current ??= origin(page.url);
    return page;
  }
  function parseList(document) {
    const page = Number(document.selectFirst(".current")?.text());
    const last = Number(document.selectFirst(".pagination strong")?.text());
    const mangas = document.select(".related_box").flatMap((box) => {
      const a = box.selectFirst("a");
      return a ? [{ thumbnailUrl: box.selectFirst("img")?.absUrl("src") || void 0, title: a.attr("title"), url: relativeUrl(a.absUrl("href")) }] : [];
    });
    return { mangas, hasNextPage: Number.isFinite(page) && page < last };
  }
  var categories = [
    ["秀人网", "Xiuren/"],
    ["美媛馆", "MyGirl/"],
    ["尤物馆", "YouWu/"],
    ["爱蜜社", "IMiss/"],
    ["蜜桃社", "MiiTao/"],
    ["优星馆", "Uxing/"],
    ["嗲囡囡", "FeiLin/"],
    ["魅妍社", "MiStar/"],
    ["兔几盟", "Tukmo/"],
    ["影私荟", "WingS/"],
    ["星乐园", "LeYuan/"],
    ["顽味生活", "Taste/"],
    ["模范学院", "MFStar/"],
    ["花の颜", "Huayan/"],
    ["御女郎", "DKGirl/"],
    ["网红馆", "Candy/"],
    ["尤蜜荟", "YouMi/"],
    ["薄荷叶", "MintYe/"],
    ["瑞丝馆", "Micat/"],
    ["模特联盟", "Mtmeng/"],
    ["花漾", "HuaYang/"],
    ["星颜社", "XingYan/"],
    ["画语界", "XiaoYu/"],
    ["推女郎", "Tuigirl/"],
    ["尤果网", "Ugirls/"],
    ["青豆客", "Tgod/"],
    ["头条女神", "TouTiao/"],
    ["果团网", "Girlt/"],
    ["喵糖映画", "Mtcos/"],
    ["爱尤物", "Aiyouwu/"],
    ["波萝社", "BoLoli/"],
    ["猎女神", "Slady/"],
    ["尤蜜", "YouMei/"],
    ["潘多拉", "Pdl/"],
    ["Artgravia", "Artgravia/"],
    ["DJAWA", "DJAWA/"],
    ["丝袜美腿", "Siwameitui/"],
    ["美腿宝贝", "LEGBABY/"],
    ["蜜丝", "MissLeg/"],
    ["妖精社", "YaoJingShe/"],
    ["性感尤物", "Xgyw/"],
    ["国产美女", "Guochanmeinv/"],
    ["港台美女", "Gangtaimeinv/"],
    ["日韩美女", "Rihanmeinv/"],
    ["欧美美女", "Oumeimeinv/"],
    ["丝袜美腿", "Siwameitui/"],
    ["内衣尤物", "Neiyiyouwu/"],
    ["Cosplay", "Cosplay/"]
  ];
  var source = {
    info: {
      id: "2870097240566002663",
      name: "性感美女",
      lang: "all",
      version: "1.0.1",
      baseUrl,
      supportsLatest: true,
      nsfw: true,
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/xgmn/res/mipmap-xhdpi/ic_launcher.png"
    },
    async getPopularManga() {
      return parseList((await load("/top.html")).document);
    },
    async getLatestUpdates() {
      return parseList((await load("/new.html")).document);
    },
    async searchManga(page, query, filters) {
      if (query.trim()) {
        const { document } = await load(`/plus/search/index.asp?${queryString([["keyword", query], ["p", page]])}`);
        const currentPage = Number(document.selectFirst(".current")?.text());
        const mangas = document.select(".node > p > a").map((a) => ({
          title: a.text(),
          url: relativeUrl(a.absUrl("href")),
          thumbnailUrl: `${current ?? baseUrl}/uploadfile/pic/${/\d+(?=\.html)/.exec(a.absUrl("href"))?.[0]}.jpg`
        }));
        return { mangas, hasNextPage: currentPage < document.select(".list .pagination a").length };
      }
      const category = filters.find((f) => f.id === "category");
      const path = category?.type === "select" ? category.options[category.selected].value : categories[0][1];
      return parseList((await load(`/${path}${page > 1 ? `page_${page}.html` : ""}`)).document);
    },
    async getMangaDetails(manga) {
      const { document } = await load(manga.url);
      return { author: document.selectFirst(".item-2")?.text().split("模特：")[1], status: "completed" };
    },
    async getChapterList(manga) {
      const { document } = await load(manga.url);
      const date = /(\d{4})\.(\d{2})\.(\d{2})/.exec(document.selectFirst(".item-1")?.text().split("更新：")[1] ?? "");
      return [{
        url: relativeUrl(document.selectFirst(".current")?.absUrl("href") ?? manga.url),
        name: document.selectFirst(".article-title")?.text() ?? "Gallery",
        chapterNumber: 1,
        // Shanghai midnight.
        dateUpload: date ? Date.UTC(Number(date[1]), Number(date[2]) - 1, Number(date[3])) - 8 * 36e5 : void 0
      }];
    },
    async getPageList(chapter) {
      const { document } = await load(chapter.url);
      const prefix = (document.selectFirst(".current")?.absUrl("href") ?? "").replace(/\.html$/, "");
      const total = Number(/\d+(?=P)/.exec(document.selectFirst(".article-title")?.text() ?? "")?.[0]) || 0;
      const imagesOf = (doc) => doc.select(".article-content p > img").filter((img) => img.parent()?.outerHtml().split(">")[0].includes("center"));
      const perPage = Math.max(1, imagesOf(document).length);
      const subPages = Array.from({ length: Math.ceil(total / perPage) }, (_, i) => i);
      const images = await mapLimit(subPages, 4, async (i) => imagesOf(i === 0 ? document : (await fetchPage(`${prefix}_${i}.html`)).document));
      return images.flat().slice(0, total || void 0).map((img) => ({ url: `${current ?? baseUrl}/${img.absUrl("src").replace(/^https?:\/\/[^/]+\//, "")}` }));
    },
    getFilterList() {
      return [{ type: "select", id: "category", name: "分类（搜索时无效）", options: categories.map(([label, value]) => ({ label, value })), selected: 0 }];
    }
  };
  var index_default = source;
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
