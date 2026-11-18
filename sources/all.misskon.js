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

  // src/all/misskon/index.ts
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
  function relativeUrl(url) {
    const match = /^[a-z][a-z\d+.-]*:\/\/[^/?#]*(.*)$/i.exec(url);
    const path = match ? match[1] || "/" : url;
    try {
      return decodeURI(path);
    } catch {
      return path;
    }
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

  // src/all/misskon/index.ts
  var baseUrl = "https://misskon.com";
  function mangaFrom(e) {
    const title = e.selectFirst(".post-box-title");
    return { title: title.text(), thumbnailUrl: e.selectFirst(".post-thumbnail img")?.absUrl("data-src") || void 0, url: relativeUrl(title.selectFirst("a").absUrl("href")) };
  }
  var items = (document) => document.select("article.item-list").map(mangaFrom);
  var source = {
    info: {
      id: "492049561920540214",
      name: "MissKon",
      lang: "all",
      version: "1.0.1",
      baseUrl,
      supportsLatest: true,
      nsfw: true,
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/misskon/res/mipmap-xhdpi/ic_launcher.png",
      rateLimits: [{ host: "misskon.com", permits: 10, periodMs: 1e3 }]
    },
    async getPopularManga() {
      return { mangas: items(await fetchHTML(`${baseUrl}/top3/`)), hasNextPage: false };
    },
    async getLatestUpdates(page) {
      const document = await fetchHTML(`${baseUrl}/page/${page}`);
      return { mangas: items(document), hasNextPage: document.selectFirst(".current + a.page") != null };
    },
    async searchManga(page, query, filters) {
      const category = filters.find((f) => f.id === "category");
      const path = category?.type === "select" && category.selected > 0 ? category.options[category.selected].value : void 0;
      const document = await fetchHTML(path ? baseUrl + path : `${baseUrl}/page/${page}/?s=${encodeURIComponent(query).replace(/%20/g, "+")}`);
      return { mangas: items(document), hasNextPage: document.selectFirst("div.content > div.pagination > span.current + a") != null };
    },
    async getMangaDetails(manga) {
      const post = (await fetchHTML(baseUrl + manga.url)).selectFirst("article > .post-inner");
      if (!post) throw new Error("The gallery page has changed.");
      return { title: post.select(".post-title").map((t) => t.text()).join(" "), genres: post.select(".post-tag > a").map((a) => a.text()), status: "completed" };
    },
    async getChapterList(manga) {
      const document = await fetchHTML(baseUrl + manga.url);
      const image = document.selectFirst(".entry img")?.absUrl("data-src") ?? "";
      const full = /\/(\d{4})\/(\d{2})\/(\d{2})\//.exec(image);
      const month = /\/(\d{4})\/(\d{2})\//.exec(image);
      const dateUpload = full ? Date.UTC(Number(full[1]), Number(full[2]) - 1, Number(full[3])) : month ? Date.UTC(Number(month[1]), Number(month[2]) - 1, 1) : void 0;
      const links = document.select("div.page-link:first-of-type a.post-page-numbers");
      const maxPage = Number(links[links.length - 1]?.text()) || 1;
      return Array.from({ length: maxPage }, (_, i) => maxPage - i).map((page) => ({ url: `${manga.url}/${page}`, name: `Page ${page}`, dateUpload }));
    },
    async getPageList(chapter) {
      return (await fetchHTML(baseUrl + chapter.url)).select("div.post-inner > div.entry > p > img").map((img) => ({ url: img.absUrl("data-src") }));
    },
    getFilterList() {
      return [
        { type: "header", id: "h1", name: "NOTE: Unable to further search in the category!" },
        { type: "separator", id: "s1" },
        { type: "select", id: "category", name: "Category", options: categories.map(([label, value]) => ({ label, value })), selected: 0 }
      ];
    }
  };
  var index_default = source;
  var categories = [
    ["unselected", ""],
    ["Top 3 days", "/top3/"],
    ["Top 7 days", "/top7/"],
    ["Top 30 days", "/top30/"],
    ["Top 60 days", "/top60/"],
    ["Chinese:[MTCos] 喵糖映画", "/tag/mtcos/"],
    ["Chinese:BoLoli", "/tag/bololi/"],
    ["Chinese:CANDY", "/tag/candy/"],
    ["Chinese:FEILIN", "/tag/feilin/"],
    ["Chinese:FToow", "/tag/ftoow/"],
    ["Chinese:GIRLT", "/tag/girlt/"],
    ["Chinese:HuaYan", "/tag/huayan/"],
    ["Chinese:HuaYang", "/tag/huayang/"],
    ["Chinese:IMISS", "/tag/imiss/"],
    ["Chinese:ISHOW", "/tag/ishow/"],
    ["Chinese:JVID", "/tag/jvid/"],
    ["Chinese:KelaGirls", "/tag/kelagirls/"],
    ["Chinese:Kimoe", "/tag/kimoe/"],
    ["Chinese:LegBaby", "/tag/legbaby/"],
    ["Chinese:MF", "/tag/mf/"],
    ["Chinese:MFStar", "/tag/mfstar/"],
    ["Chinese:MiiTao", "/tag/miitao/"],
    ["Chinese:MintYe", "/tag/mintye/"],
    ["Chinese:MISSLEG", "/tag/missleg/"],
    ["Chinese:MiStar", "/tag/mistar/"],
    ["Chinese:MTMeng", "/tag/mtmeng/"],
    ["Chinese:MyGirl", "/tag/mygirl/"],
    ["Chinese:PartyCat", "/tag/partycat/"],
    ["Chinese:QingDouKe", "/tag/qingdouke/"],
    ["Chinese:RuiSG", "/tag/ruisg/"],
    ["Chinese:SLADY", "/tag/slady/"],
    ["Chinese:TASTE", "/tag/taste/"],
    ["Chinese:TGOD", "/tag/tgod/"],
    ["Chinese:TouTiao", "/tag/toutiao/"],
    ["Chinese:TuiGirl", "/tag/tuigirl/"],
    ["Chinese:Tukmo", "/tag/tukmo/"],
    ["Chinese:UGIRLS", "/tag/ugirls/"],
    ["Chinese:UGIRLS - Ai You Wu App", "/tag/ugirls-ai-you-wu-app/"],
    ["Chinese:UXING", "/tag/uxing/"],
    ["Chinese:WingS", "/tag/wings/"],
    ["Chinese:XiaoYu", "/tag/xiaoyu/"],
    ["Chinese:XingYan", "/tag/xingyan/"],
    ["Chinese:XIUREN", "/tag/xiuren/"],
    ["Chinese:XR Uncensored", "/tag/xr-uncensored/"],
    ["Chinese:YouMei", "/tag/youmei/"],
    ["Chinese:YouMi", "/tag/youmi/"],
    ["Chinese:YouMi尤蜜", "/tag/youmiapp/"],
    ["Chinese:YouWu", "/tag/youwu/"],
    ["Korean:AG", "/tag/ag/"],
    ["Korean:Bimilstory", "/tag/bimilstory/"],
    ["Korean:BLUECAKE", "/tag/bluecake/"],
    ["Korean:CreamSoda", "/tag/creamsoda/"],
    ["Korean:DJAWA", "/tag/djawa/"],
    ["Korean:Espacia Korea", "/tag/espacia-korea/"],
    ["Korean:Fantasy Factory", "/tag/fantasy-factory/"],
    ["Korean:Fantasy Story", "/tag/fantasy-story/"],
    ["Korean:Glamarchive", "/tag/glamarchive/"],
    ["Korean:HIGH FANTASY", "/tag/high-fantasy/"],
    ["Korean:KIMLEMON", "/tag/kimlemon/"],
    ["Korean:KIREI", "/tag/kirei/"],
    ["Korean:KiSiA", "/tag/kisia/"],
    ["Korean:Korean Realgraphic", "/tag/korean-realgraphic/"],
    ["Korean:Lilynah", "/tag/lilynah/"],
    ["Korean:Lookas", "/tag/lookas/"],
    ["Korean:Loozy", "/tag/loozy/"],
    ["Korean:Moon Night Snap", "/tag/moon-night-snap/"],
    ["Korean:Paranhosu", "/tag/paranhosu/"],
    ["Korean:PhotoChips", "/tag/photochips/"],
    ["Korean:Pure Media", "/tag/pure-media/"],
    ["Korean:PUSSYLET", "/tag/pussylet/"],
    ["Korean:SAINT Photolife", "/tag/saint-photolife/"],
    ["Korean:SWEETBOX", "/tag/sweetbox/"],
    ["Korean:UHHUNG MAGAZINE", "/tag/uhhung-magazine/"],
    ["Korean:UMIZINE", "/tag/umizine/"],
    ["Korean:WXY ENT", "/tag/wxy-ent/"],
    ["Korean:Yo-U", "/tag/yo-u/"],
    ["Other:AI Generated", "/tag/ai-generated/"],
    ["Other:Cosplay", "/tag/cosplay/"],
    ["Other:JP", "/tag/jp/"],
    ["Other:JVID", "/tag/jvid/"],
    ["Other:Patreon", "/tag/patreon/"]
  ];
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
