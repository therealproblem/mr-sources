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

  // src/all/peppercarrot/index.ts
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
  async function fetchHTML(request) {
    const response = await send(request);
    return Honya.parseHTML(response.body, response.url);
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

  // src/all/peppercarrot/index.ts
  var baseUrl = "https://www.peppercarrot.com";
  var files = `${baseUrl}/0_sources`;
  var languages = [
    { lang: "en", site: "en", id: "3717103867132681399", episode: (n) => `Episode ${n}`, hasMiniFantasyTheater: true },
    { lang: "ja", site: "ja", id: "6165881221950830721", episode: (n) => `第${n}話`, hasMiniFantasyTheater: true },
    { lang: "zh", site: "cn", id: "4651823155460600022", episode: (n) => `第${n}话` },
    { lang: "ko", site: "kr", id: "7113735609798927379", episode: (n) => `제${n}화` },
    { lang: "es", site: "es", id: "377155379521692942", episode: (n) => `Episodio ${n}` },
    { lang: "fr", site: "fr", id: "2425121988128812194", episode: (n) => `Épisode ${n}`, hasMiniFantasyTheater: true },
    { lang: "de", site: "de", id: "699545521251015363", episode: (n) => `Episode ${n}`, hasMiniFantasyTheater: true },
    { lang: "id", site: "id", id: "5426603323503143528", episode: (n) => `Episode ${n}` },
    { lang: "pt-BR", site: "pt", id: "260846947757439928", episode: (n) => `Episódio ${n}` },
    { lang: "vi", site: "vi", id: "8782613666392461545", episode: (n) => `Tập ${n}` },
    { lang: "it", site: "it", id: "1797554907736656784", episode: (n) => `Episodio ${n}` },
    { lang: "ru", site: "ru", id: "2401372991067169719", episode: (n) => `Эпизод ${n}` }
  ];
  function episodeNumber(folder) {
    return Number(/^ep(\d+)_/.exec(folder)?.[1] ?? 0);
  }
  function episodeTitle(folder) {
    return folder.replace(/^ep\d+_/, "").replace(/-s(?=-|$)/g, "’s").replace(/-/g, " ");
  }
  async function translationCredit(language) {
    if (language.site === "en") return [];
    const langs = await fetchJSON(`${files}/langs.json`);
    const translators = langs[language.site]?.translators ?? [];
    return translators.length > 0 ? [`Translation: ${translators.join(", ")}.`] : [];
  }
  function makeSource(language) {
    const pepperCarrot = {
      url: `/${language.site}/webcomics/peppercarrot.html`,
      title: "Pepper&Carrot",
      // Episode 24's cover art, without its title: Pepper reading by the Unity Tree. It's wide, and
      // the app crops covers to the middle, which is her.
      thumbnailUrl: `${files}/ep24_The-Unity-Tree/low-res/gfx-only/gfx_Pepper-and-Carrot_by-David-Revoy_E24.jpg`,
      author: "David Revoy",
      artist: "David Revoy",
      genres: ["Fantasy", "Comedy", "Webcomic"],
      status: "ongoing"
    };
    const miniFantasyTheater = {
      url: `/${language.site}/webcomics/miniFantasyTheater.html`,
      title: "Mini Fantasy Theater",
      // Strip 1 is silent, so it's the same in every language.
      thumbnailUrl: `${files}/miniFantasyTheater/low-res/en_001_miniFantasyTheater.jpg`,
      author: "David Revoy",
      artist: "David Revoy",
      genres: ["Fantasy", "Comedy", "Webcomic", "Gag Strip"],
      status: "ongoing"
    };
    const series = language.hasMiniFantasyTheater ? [pepperCarrot, miniFantasyTheater] : [pepperCarrot];
    const isMiniFantasyTheater = (url) => url.includes("miniFantasyTheater");
    return {
      info: {
        id: language.id,
        name: "Pepper&Carrot",
        lang: language.lang,
        version: "1.2.1",
        baseUrl,
        icon: `${baseUrl}/core/img/favicon.png`
      },
      async getPopularManga() {
        return { mangas: series, hasNextPage: false };
      },
      async searchManga(_page, query) {
        const words2 = query.toLowerCase().split(/\s+/).filter((word) => word.length > 0);
        const mangas = series.filter((manga) => {
          const text = `${manga.title} david revoy witch fantasy ${manga.genres?.join(" ") ?? ""}`.toLowerCase();
          return words2.every((word) => text.includes(word));
        });
        return { mangas, hasNextPage: false };
      },
      async getMangaDetails(manga) {
        const translation = await translationCredit(language);
        if (isMiniFantasyTheater(manga.url)) {
          return {
            ...miniFantasyTheater,
            description: "Short gag strips from the world of Pepper&Carrot, one square picture each, many without a word.\n\n" + [
              "Mini Fantasy Theater by David Revoy, www.peppercarrot.com. Licensed under Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0).",
              ...translation
            ].join("\n")
          };
        }
        return {
          ...pepperCarrot,
          description: "Pepper, a young witch, and her cat Carrot learn the magic of Chaosah in the fantasy world of Hereva. A free, open-source webcomic.\n\n" + [
            "Pepper&Carrot by David Revoy, www.peppercarrot.com. Licensed under Creative Commons Attribution 4.0 (CC BY 4.0).",
            ...translation
          ].join("\n")
        };
      },
      async getChapterList(manga) {
        if (isMiniFantasyTheater(manga.url)) {
          const document = await fetchHTML(`${baseUrl}${miniFantasyTheater.url}`);
          return document.select("figure.thumbnail.translated").flatMap((figure) => {
            const link = figure.selectFirst("figcaption a");
            const number = Number(/\/(\d+)\.html$/.exec(link?.attr("href") ?? "")?.[1] ?? Number.NaN);
            if (link == null || Number.isNaN(number)) return [];
            const date = /\d{4}-\d{2}-\d{2}/.exec(figure.selectFirst("figcaption span")?.text() ?? "")?.[0];
            return [{
              url: `/${language.site}/miniFantasyTheater/${String(number).padStart(3, "0")}.html`,
              name: link.text().trim(),
              dateUpload: date == null ? void 0 : Date.parse(date),
              chapterNumber: number
            }];
          }).sort((a, b) => b.chapterNumber - a.chapterNumber);
        }
        const episodes = await fetchJSON(`${files}/episodes.json`);
        return episodes.filter((episode) => episode.translated_languages.includes(language.site)).map((episode) => {
          const number = episodeNumber(episode.name);
          return {
            url: `/${language.site}/webcomic/${episode.name}.html`,
            // Titles are drawn into the art, translated; the list only has the English ones.
            name: language.lang === "en" ? `${language.episode(number)}: ${episodeTitle(episode.name)}` : language.episode(number),
            chapterNumber: number
          };
        }).sort((a, b) => b.chapterNumber - a.chapterNumber);
      },
      async getPageList(chapter) {
        const page = chapter.url.split("/").pop()?.replace(/\.html$/, "") ?? "";
        if (isMiniFantasyTheater(chapter.url)) {
          return [{ url: `${files}/miniFantasyTheater/low-res/${language.site}_${page}_miniFantasyTheater.jpg` }];
        }
        const episodes = await fetchJSON(`${files}/episodes.json`);
        const episode = episodes.find((episode2) => episode2.name === page);
        if (episode == null) throw new Error(`no episode ${page}`);
        const number = String(episodeNumber(page)).padStart(2, "0");
        return Array.from({ length: episode.total_pages + 1 }, (_, index) => ({
          url: `${files}/${page}/low-res/${language.site}_Pepper-and-Carrot_by-David-Revoy_E${number}P${String(index).padStart(2, "0")}.jpg`
        }));
      }
    };
  }
  var index_default = languages.map(makeSource);
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
