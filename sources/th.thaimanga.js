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

  // src/th/thaimanga/index.ts
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
  function utf8Decode(bytes) {
    let text = "";
    for (let i = 0; i < bytes.length; ) {
      const byte = bytes[i++];
      let code;
      if (byte < 128) code = byte;
      else if (byte < 224) code = (byte & 31) << 6 | bytes[i++] & 63;
      else if (byte < 240) code = (byte & 15) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63;
      else code = (byte & 7) << 18 | (bytes[i++] & 63) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63;
      text += String.fromCodePoint(code);
    }
    return text;
  }
  async function fetchPage(request) {
    const response = await send(request);
    return { document: Honya.parseHTML(response.body, response.url), url: response.url };
  }

  // sdk/dates.ts
  function javaDateParser(pattern, locale = "en") {
    const fields = [];
    let source = "";
    for (const token of tokenize(pattern)) {
      if (token.literal !== void 0) {
        source += token.literal.split(/\s+/).map(escape).join("\\s+");
        continue;
      }
      const { letter, count } = token;
      switch (letter) {
        case "d":
        case "H":
        case "h":
        case "m":
        case "s":
          source += count === 1 ? "(\\d{1,2})" : `(\\d{${count}})`;
          fields.push(letter);
          break;
        case "M":
        case "L":
          if (count >= 3) {
            source += `(${alternatives(monthNames(locale).map(([name]) => name))})\\.?`;
            fields.push("monthName");
          } else {
            source += count === 1 ? "(\\d{1,2})" : "(\\d{2})";
            fields.push("M");
          }
          break;
        case "y":
        case "u":
          source += count === 2 ? "(\\d{2})" : "(\\d{4})";
          fields.push(count === 2 ? "yy" : "y");
          break;
        case "a":
          source += `(${alternatives(dayPeriods(locale))})`;
          fields.push("a");
          break;
        case "E":
        case "e":
        case "c":
          source += `(?:${alternatives(weekdayNames(locale))})`;
          break;
        default:
          source += ".*?";
      }
    }
    const regex = new RegExp(source, "iu");
    return (text) => {
      const match = regex.exec(text.trim());
      if (!match) return void 0;
      let year = 1970, month = 0, day = 1, hour = 0, minute = 0, second = 0;
      let pm;
      fields.forEach((field, index) => {
        const value = match[index + 1];
        switch (field) {
          case "d":
            day = Number(value);
            break;
          case "M":
            month = Number(value) - 1;
            break;
          case "monthName":
            month = monthNames(locale).find(([name]) => name.toLocaleLowerCase(locale) === value.toLocaleLowerCase(locale))?.[1] ?? -1;
            break;
          case "y":
            year = Number(value);
            break;
          case "yy":
            year = 2e3 + Number(value);
            break;
          case "H":
          case "h":
            hour = Number(value);
            break;
          case "m":
            minute = Number(value);
            break;
          case "s":
            second = Number(value);
            break;
          case "a":
            pm = dayPeriods(locale).indexOf(value.toLocaleLowerCase(locale)) % 2 === 1;
            break;
        }
      });
      if (pm !== void 0) hour = hour % 12 + (pm ? 12 : 0);
      if (month < 0 || month > 11 || day < 1 || day > 31) return void 0;
      return Date.UTC(year, month, day, hour, minute, second);
    };
  }
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
  function tokenize(pattern) {
    const tokens = [];
    for (let i = 0; i < pattern.length; ) {
      const char = pattern[i];
      if (char === "'") {
        const end = pattern.indexOf("'", i + 1);
        const text = end < 0 ? pattern.slice(i + 1) : pattern.slice(i + 1, end);
        tokens.push({ literal: text === "" ? "'" : text });
        i = end < 0 ? pattern.length : end + 1;
      } else if (/[a-zA-Z]/.test(char)) {
        let count = 1;
        while (pattern[i + count] === char) count++;
        tokens.push({ letter: char, count });
        i += count;
      } else {
        tokens.push({ literal: char });
        i++;
      }
    }
    return tokens;
  }
  var nameCache = /* @__PURE__ */ new Map();
  function cached(key, make) {
    if (!nameCache.has(key)) nameCache.set(key, make());
    return nameCache.get(key);
  }
  var englishMonths = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  function monthNames(locale) {
    return cached(`months.${locale}`, () => {
      const names = [];
      for (let month = 0; month < 12; month++) {
        const date = new Date(Date.UTC(2021, month, 15));
        for (const style of ["long", "short"]) {
          for (const tag of [locale, "en"]) {
            try {
              names.push([new Intl.DateTimeFormat(tag, { month: style, timeZone: "UTC" }).format(date), month]);
              const parts = new Intl.DateTimeFormat(tag, { day: "numeric", month: style, timeZone: "UTC" }).formatToParts(date);
              const part = parts.find((p) => p.type === "month")?.value;
              if (part) names.push([part, month]);
            } catch {
            }
          }
        }
        names.push([englishMonths[month], month], [englishMonths[month].slice(0, 3), month]);
      }
      const unique = /* @__PURE__ */ new Map();
      for (const [name, month] of names) {
        const clean = name.replace(/\.$/, "").trim();
        if (clean && !/^\d+$/.test(clean)) unique.set(clean, month);
      }
      return [...unique].sort((a, b) => b[0].length - a[0].length);
    });
  }
  function weekdayNames(locale) {
    return cached(`weekdays.${locale}`, () => {
      const names = /* @__PURE__ */ new Set();
      for (let day = 0; day < 7; day++) {
        const date = new Date(Date.UTC(2021, 0, 3 + day));
        for (const style of ["long", "short"]) {
          for (const tag of [locale, "en"]) {
            try {
              names.add(new Intl.DateTimeFormat(tag, { weekday: style, timeZone: "UTC" }).format(date).replace(/\.$/, ""));
            } catch {
            }
          }
        }
      }
      return [...names].sort((a, b) => b.length - a.length);
    });
  }
  function dayPeriods(locale) {
    return cached(`periods.${locale}`, () => {
      const periods = [];
      for (const tag of [locale, "en"]) {
        for (const hour of [9, 21]) {
          try {
            const parts = new Intl.DateTimeFormat(tag, { hour: "numeric", hour12: true, timeZone: "UTC" }).formatToParts(new Date(Date.UTC(2021, 0, 1, hour)));
            periods.push((parts.find((p) => p.type === "dayPeriod")?.value ?? (hour < 12 ? "am" : "pm")).toLocaleLowerCase(locale));
          } catch {
            periods.push(hour < 12 ? "am" : "pm");
          }
        }
      }
      return periods;
    });
  }
  function alternatives(list) {
    return list.map((item) => item.split(/\s+/).map(escape).join("\\s+")).join("|");
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

  // themes/mangathemesia.ts
  var selector = (template, words2) => words2.map((word) => template.replaceAll("%s", word)).join(", ");
  var defaults = {
    seriesDetailsSelector: "div.bigcontent, div.animefull, div.main-info, div.postbody",
    seriesTitleSelector: ".entry-title, .ts-breadcrumb li:last-child span",
    seriesArtistSelector: selector(
      ".infotable tr:contains(%s) td:last-child, .tsinfo .imptdt:contains(%s) i, .fmed b:contains(%s)+span, span:contains(%s)",
      ["artist", "Artiste", "Artista", "الرسام", "الناشر", "İllüstratör", "Çizer", "Sanatçı", "นักวาด"]
    ),
    seriesAuthorSelector: selector(
      ".infotable tr:contains(%s) td:last-child, .tsinfo .imptdt:contains(%s) i, .fmed b:contains(%s)+span, span:contains(%s)",
      ["Author", "Auteur", "autor", "المؤلف", "Mangaka", "seniman", "Pengarang", "Yazar", "ผู้แต่ง", "นักเขียน"]
    ),
    seriesDescriptionSelector: ".desc, .entry-content[itemprop=description]",
    seriesAltNameSelector: ".alternative, .wd-full:contains(alt) span, .alter, .seriestualt, " + selector(".infotable tr:contains(%s) td:last-child", ["Alternative", "Alternatif", "الأسماء الثانوية"]),
    seriesGenreSelector: "div.gnr a, .mgen a, .seriestugenre a, " + selector("span:contains(%s)", ["genre", "التصنيف"]),
    seriesTypeSelector: selector(
      ".infotable tr:contains(%s) td:last-child, .tsinfo .imptdt:contains(%s) i, .tsinfo .imptdt:contains(%s) a, .fmed b:contains(%s)+span, span:contains(%s) a",
      ["type", "ประเภท", "النوع", "tipe", "Türü"]
    ) + ", a[href*=type\\=]",
    seriesStatusSelector: selector(
      ".infotable tr:contains(%s) td:last-child, .tsinfo .imptdt:contains(%s) i, .fmed b:contains(%s)+span span:contains(%s)",
      ["status", "Statut", "Durum", "連載状況", "Estado", "الحالة", "حالة العمل", "สถานะ", "stato", "Statüsü"]
    ),
    seriesThumbnailSelector: ".infomanga > div[itemprop=image] img, .thumb img",
    pageSelector: "div#readerarea img",
    searchMangaSelector: ".utao .uta .imgu, .listupd .bs .bsx, .listo .bs .bsx",
    searchMangaNextPageSelector: "div.pagination .next, div.hpage .r",
    chapterListSelector: "div.bxcl li, div.cl li, #chapterlist li, ul li:has(div.chbox):has(div.eph-num)"
  };
  var statusWords = [
    ["ongoing", [
      "مستمرة",
      "en curso",
      "ongoing",
      "on going",
      "new season",
      "mass released",
      "ativo",
      "en cours",
      "en cours de publication",
      "đang tiến hành",
      "em lançamento",
      "онгоінг",
      "publishing",
      "devam ediyor",
      "em andamento",
      "in corso",
      "güncel",
      "berjalan",
      "продолжается",
      "updating",
      "lançando",
      "in arrivo",
      "emision",
      "en emision",
      "مستمر",
      "curso",
      "en marcha",
      "publicandose",
      "publicando",
      "连载中",
      "devam etmekte",
      "連載中"
    ]],
    ["completed", [
      "completed",
      "completo",
      "complété",
      "fini",
      "achevé",
      "terminé",
      "tamamlandı",
      "đã hoàn thành",
      "hoàn thành",
      "مكتملة",
      "завершено",
      "finished",
      "finalizad",
      "completata",
      "one-shot",
      "bitti",
      "tamat",
      "completado",
      "concluído",
      "完結",
      "concluido",
      "已完结",
      "bitmiş"
    ]],
    ["cancelled", ["canceled", "cancelled", "cancelado", "cancellato", "cancelados", "dropped", "discontinued", "abandonné"]],
    ["onHiatus", ["hiatus", "on hold", "season end", "pausado", "en espera", "en pause", "en attente", "hiato"]]
  ];
  var parseStatus = (text) => {
    if (!text) return "unknown";
    const lower = text.toLowerCase();
    return statusWords.find(([, words2]) => words2.some((w) => lower.includes(w.toLowerCase())))?.[0] ?? "unknown";
  };
  var statusOptions = [["All", ""], ["Ongoing", "ongoing"], ["Completed", "completed"], ["Hiatus", "hiatus"], ["Dropped", "dropped"]];
  var typeOptions = [["All", ""], ["Manga", "Manga"], ["Manhwa", "Manhwa"], ["Manhua", "Manhua"], ["Comic", "Comic"]];
  var orderOptions = [["Default", ""], ["A-Z", "title"], ["Z-A", "titlereverse"], ["Latest Update", "update"], ["Latest Added", "latest"], ["Popular", "popular"]];
  var projectOptions = [["Show all manga", ""], ["Show only project manga", "project-filter-on"]];
  var options = (list) => list.map(([label, value]) => ({ label, value }));
  var removeEmptyPlaceholder = (text) => !text?.trim() || ["-", "N/A", "n/a", "Unknown"].includes(text) ? void 0 : text;
  function imgAttr(element) {
    if (!element) return "";
    if (element.hasAttr("data-lazy-src")) return element.absUrl("data-lazy-src");
    if (element.hasAttr("data-src")) return element.absUrl("data-src");
    if (element.hasAttr("data-cfsrc")) return element.absUrl("data-cfsrc");
    return element.absUrl("src");
  }
  var firstAttr = (elements, name) => elements.find((e) => e.hasAttr(name))?.attr(name) ?? "";
  function mangathemesia(o) {
    const { info } = o;
    const baseUrl = info.baseUrl.replace(/\/$/, "");
    const lang = info.lang === "all" ? "en" : info.lang;
    const directory = o.mangaUrlDirectory ?? "/manga";
    const s = { ...defaults, ...Object.fromEntries(Object.entries(o).filter(([key, value]) => key in defaults && value !== void 0)) };
    const datePattern = o.chapterDateFormat?.pattern ?? o.datePattern ?? "MMMM d, yyyy";
    const localDate = javaDateParser(datePattern, o.chapterDateFormat?.locale ?? lang);
    const usDate = javaDateParser(datePattern, "en-US");
    const parseDate = (text) => text ? localDate(text) ?? usDate(text) : void 0;
    const altNamePrefix = o.altNamePrefix ?? "Alternative Names: ";
    function searchUrl(page, query, filters) {
      let path = directory;
      const params = [];
      if (query) params.push(["title", query]);
      params.push(["page", String(page)]);
      for (const filter of filters) {
        const selected = filter.type === "select" ? filter.options[filter.selected]?.value ?? "" : "";
        switch (filter.id) {
          case "status":
            params.push(["status", selected]);
            break;
          case "type":
            params.push(["type", selected]);
            break;
          case "order":
            params.push(["order", selected]);
            break;
          case "genres":
            if (filter.type === "tristates") {
              for (const value of filter.included) params.push(["genre[]", value]);
              for (const value of filter.excluded) params.push(["genre[]", `-${value}`]);
            }
            break;
          case "author":
            if (filter.type === "text" && filter.value) params.push(["author", filter.value]);
            break;
          case "year":
            if (filter.type === "text" && filter.value) params.push(["yearx", filter.value]);
            break;
          case "project":
            if (selected === "project-filter-on") path = o.projectPageString ?? "/project";
            break;
        }
      }
      return `${baseUrl}${path.replace(/\/$/, "")}/?${queryString(params)}`;
    }
    async function search(page, query, filters) {
      const { document } = await fetchPage(searchUrl(page, query, filters));
      const mangas = document.select(s.searchMangaSelector).flatMap((element) => {
        const links = element.select("a");
        const href = firstAttr(links, "href");
        if (!href) return [];
        return [{ url: relativeUrl(links.find((a) => a.hasAttr("href")).absUrl("href") || href), title: firstAttr(links, "title"), thumbnailUrl: imgAttr(element.selectFirst("img")) || void 0 }];
      });
      const next = s.searchMangaNextPageSelector ? document.selectFirst(s.searchMangaNextPageSelector) : null;
      return { mangas, hasNextPage: next != null };
    }
    const orderFilter = (value) => ({ type: "select", id: "order", name: "", options: options(orderOptions), selected: orderOptions.findIndex(([, v]) => v === value) });
    function details(document) {
      const details2 = document.selectFirst(s.seriesDetailsSelector);
      if (!details2) return {};
      let description = details2.selectFirst(s.seriesDescriptionSelector)?.text() || void 0;
      const altName = details2.selectFirst(s.seriesAltNameSelector)?.ownText();
      if (altName?.trim()) {
        const names = altName.split(/[|/•,;]/).map((name) => `- ${name.trim()}`).join("\n");
        description = (description ? `${description}

` : "") + `${altNamePrefix}
${names}`.trim();
      }
      const genres = details2.select(s.seriesGenreSelector).map((g) => g.text());
      const type = details2.selectFirst(s.seriesTypeSelector)?.ownText();
      if (type?.trim()) genres.push(type);
      return {
        title: details2.selectFirst(s.seriesTitleSelector)?.text() || void 0,
        artist: removeEmptyPlaceholder(details2.selectFirst(s.seriesArtistSelector)?.ownText()),
        author: removeEmptyPlaceholder(details2.selectFirst(s.seriesAuthorSelector)?.ownText()),
        description,
        genres: genres.map((genre) => {
          const lower = genre.toLocaleLowerCase(lang).trim();
          return lower.charAt(0).toLocaleUpperCase(lang) + lower.slice(1);
        }).filter(Boolean),
        status: parseStatus(details2.selectFirst(s.seriesStatusSelector)?.text()),
        thumbnailUrl: imgAttr(details2.select(s.seriesThumbnailSelector)[0]) || void 0
      };
    }
    function chapters(document) {
      const list = document.select(s.chapterListSelector).flatMap((element) => {
        const links = element.select("a");
        const link = links.find((a) => a.hasAttr("href"));
        if (!link) return [];
        const numbered = element.select(".lch a, .chapternum").map((e) => e.text()).join(" ").trim();
        const chapter = { url: relativeUrl(link.absUrl("href")), name: numbered || links[0].text(), dateUpload: parseDate(element.selectFirst(".chapterdate")?.text()) };
        const adjusted = o.chapterFromElement ? o.chapterFromElement(chapter, element) : chapter;
        return adjusted ? [adjusted] : [];
      });
      if (list.length && list[0].dateUpload === void 0) {
        const updated = document.select(".listinfo time[itemprop=dateModified], .fmed:contains(update) time, span:contains(update) time").find((t) => t.hasAttr("datetime"))?.attr("datetime");
        const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(updated ?? "");
        if (match) list[0].dateUpload = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
      }
      return list;
    }
    function pages(document) {
      const html = document.select(s.pageSelector).map(imgAttr).filter(Boolean);
      if (html.length) return html.map((url) => ({ url }));
      const script = document.selectFirst("script[src^=data:text/javascript;base64,dHNfcmVhZGVyLnJ1bih7]");
      const text = script ? utf8Decode(base64Decode(script.attr("src").split("base64,")[1] ?? "")) : document.outerHtml();
      const json = /["']?(?:images|imageUrls)["']?\s*[:=]\s*(\[.*?])/.exec(text)?.[1];
      let images = [];
      try {
        images = JSON.parse(json ?? "[]");
      } catch {
      }
      return (Array.isArray(images) ? images : []).filter((url) => typeof url === "string").map((url) => ({ url: url.startsWith("/") ? baseUrl + url : url }));
    }
    return {
      info: { ...info, supportsLatest: o.supportsLatest ?? true },
      getPopularManga(page) {
        return search(page, "", [orderFilter("popular")]);
      },
      getLatestUpdates(page) {
        return search(page, "", [orderFilter("update")]);
      },
      searchManga(page, query, filters) {
        return search(page, query, filters);
      },
      async getMangaDetails(manga) {
        return details((await fetchPage(baseUrl + manga.url)).document);
      },
      async getChapterList(manga) {
        return chapters((await fetchPage(baseUrl + manga.url)).document);
      },
      async getPageList(chapter) {
        return pages((await fetchPage(baseUrl + chapter.url)).document);
      },
      getFilterList(data) {
        const genres = Array.isArray(data) ? data.filter((g) => g?.name && g?.value !== void 0) : [];
        const filters = [
          { type: "text", id: "author", name: "Author", value: "" },
          { type: "text", id: "year", name: "Year", value: "" },
          { type: "select", id: "status", name: "Status", options: options(statusOptions), selected: 0 },
          { type: "select", id: "type", name: "Type", options: options(typeOptions), selected: 0 },
          { type: "select", id: "order", name: "Sort By", options: options(orderOptions), selected: 0, listings: { popular: "popular", latest: o.supportsLatest === false ? void 0 : "update" } }
        ];
        if (genres.length) {
          filters.push(
            { type: "header", id: "genresHeader", name: "Exclude genres by tapping twice" },
            { type: "tristates", id: "genres", name: "Genre", options: genres.map((g) => ({ label: g.name, value: g.value })), included: [], excluded: [] }
          );
        }
        if (o.hasProjectPage) {
          filters.push(
            { type: "separator", id: "projectSeparator" },
            { type: "header", id: "projectHeader", name: `Project filter: ${info.name}'s own translations only; other filters are ignored` },
            { type: "select", id: "project", name: "Filter Project", options: options(projectOptions), selected: 0 }
          );
        }
        return filters;
      },
      async fetchFilterData() {
        const { document } = await fetchPage(`${baseUrl}${directory.replace(/\/$/, "")}/`);
        return document.selectFirst("ul.genrez")?.select("li").flatMap((li) => {
          const name = li.selectFirst("label")?.text();
          const value = li.selectFirst("input[type=checkbox]")?.attr("value");
          return name && value !== void 0 ? [{ name, value }] : [];
        }) ?? [];
      }
    };
  }

  // src/th/thaimanga/index.ts
  var index_default = mangathemesia({
    info: {
      id: "6145049378633382077",
      name: "ThaiManga",
      lang: "th",
      version: "1.0.0",
      baseUrl: "https://www.thaimanga.net",
      nsfw: true,
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/th/thaimanga/res/mipmap-xhdpi/ic_launcher.png"
    }
  });
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
