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

  // src/en/manhwa18today/index.ts
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
  function formBody(fields) {
    return { body: queryString(fields), headers: { "Content-Type": "application/x-www-form-urlencoded" } };
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
  function parseRelativeOrAbsolute(text, parse, now = Date.now()) {
    if (!text) return void 0;
    const lower = text.toLowerCase();
    const startOfDay = new Date(now);
    startOfDay.setUTCHours(0, 0, 0, 0);
    if (["today", "hoje", "hoy"].some((w) => lower.startsWith(w))) return startOfDay.getTime();
    if (["yesterday", "ontem", "ayer", "يوم واحد"].some((w) => lower.startsWith(w))) return startOfDay.getTime() - 864e5;
    const amount = Number(/\d+/.exec(lower)?.[0]);
    if (Number.isFinite(amount)) {
      const unit = relativeWords.find(([pattern]) => pattern.test(lower));
      if (unit) return now - amount * unit[1];
    }
    return parse(text);
  }
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
  var md5Shifts = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
  var md5Constants = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);
  function md5(input) {
    const length = input.length;
    const padded = new Uint8Array(((length + 8 >>> 6) + 1) * 64);
    padded.set(input);
    padded[length] = 128;
    const view = new DataView(padded.buffer);
    view.setUint32(padded.length - 8, length * 8 >>> 0, true);
    view.setUint32(padded.length - 4, Math.floor(length / 2 ** 29), true);
    let a0 = 1732584193, b0 = 4023233417, c0 = 2562383102, d0 = 271733878;
    const words2 = new Uint32Array(16);
    for (let offset = 0; offset < padded.length; offset += 64) {
      for (let i = 0; i < 16; i++) words2[i] = view.getUint32(offset + i * 4, true);
      let a = a0, b = b0, c = c0, d = d0;
      for (let i = 0; i < 64; i++) {
        let f, g;
        if (i < 16) {
          f = b & c | ~b & d;
          g = i;
        } else if (i < 32) {
          f = d & b | ~d & c;
          g = (5 * i + 1) % 16;
        } else if (i < 48) {
          f = b ^ c ^ d;
          g = (3 * i + 5) % 16;
        } else {
          f = c ^ (b | ~d);
          g = 7 * i % 16;
        }
        f = f + a + md5Constants[i] + words2[g] >>> 0;
        a = d;
        d = c;
        c = b;
        const shift = md5Shifts[(i >> 4) * 4 + i % 4];
        b = b + (f << shift | f >>> 32 - shift) >>> 0;
      }
      a0 = a0 + a >>> 0;
      b0 = b0 + b >>> 0;
      c0 = c0 + c >>> 0;
      d0 = d0 + d >>> 0;
    }
    const out = new Uint8Array(16);
    const outView = new DataView(out.buffer);
    [a0, b0, c0, d0].forEach((word, i) => outView.setUint32(i * 4, word, true));
    return out;
  }
  function evpBytesToKey(password, salt, keyLength = 32, ivLength = 16) {
    const derived = [];
    let previous = new Uint8Array(0);
    while (derived.length < keyLength + ivLength) {
      const input = new Uint8Array(previous.length + password.length + salt.length);
      input.set(previous);
      input.set(password, previous.length);
      input.set(salt, previous.length + password.length);
      previous = md5(input);
      derived.push(...previous);
    }
    return { key: new Uint8Array(derived.slice(0, keyLength)), iv: new Uint8Array(derived.slice(keyLength, keyLength + ivLength)) };
  }
  function hexDecode(hex) {
    const bytes = new Uint8Array(hex.length >> 1);
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    return bytes;
  }
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
  function multiply(a, b) {
    let product = 0;
    for (; b; b >>= 1) {
      if (b & 1) product ^= a;
      a = (a << 1 ^ (a & 128 ? 27 : 0)) & 255;
    }
    return product;
  }
  function expandKey(key) {
    const nk = key.length / 4;
    if (![4, 6, 8].includes(nk)) throw new Error("AES keys are 16, 24 or 32 bytes");
    const rounds = nk + 6;
    const words2 = [];
    for (let i = 0; i < nk; i++) words2.push(key.slice(i * 4, i * 4 + 4));
    let rcon = 1;
    for (let i = nk; i < 4 * (rounds + 1); i++) {
      let word = Uint8Array.from(words2[i - 1]);
      if (i % nk === 0) {
        word = Uint8Array.from([sbox[word[1]] ^ rcon, sbox[word[2]], sbox[word[3]], sbox[word[0]]]);
        rcon = multiply(rcon, 2);
      } else if (nk > 6 && i % nk === 4) {
        word = word.map((b) => sbox[b]);
      }
      words2.push(word.map((b, j) => b ^ words2[i - nk][j]));
    }
    return Array.from({ length: rounds + 1 }, (_, round) => {
      const roundKey = new Uint8Array(16);
      for (let c = 0; c < 4; c++) roundKey.set(words2[round * 4 + c], c * 4);
      return roundKey;
    });
  }
  function decryptBlock(block, roundKeys) {
    let state = block.map((b, i) => b ^ roundKeys[roundKeys.length - 1][i]);
    for (let round = roundKeys.length - 2; round >= 0; round--) {
      const shifted = new Uint8Array(16);
      for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) shifted[r + 4 * ((c + r) % 4)] = inverseSbox[state[r + 4 * c]];
      state = shifted.map((b, i) => b ^ roundKeys[round][i]);
      if (round === 0) break;
      for (let c = 0; c < 4; c++) {
        const [s0, s1, s2, s3] = state.slice(c * 4, c * 4 + 4);
        state[c * 4] = multiply(s0, 14) ^ multiply(s1, 11) ^ multiply(s2, 13) ^ multiply(s3, 9);
        state[c * 4 + 1] = multiply(s0, 9) ^ multiply(s1, 14) ^ multiply(s2, 11) ^ multiply(s3, 13);
        state[c * 4 + 2] = multiply(s0, 13) ^ multiply(s1, 9) ^ multiply(s2, 14) ^ multiply(s3, 11);
        state[c * 4 + 3] = multiply(s0, 11) ^ multiply(s1, 13) ^ multiply(s2, 9) ^ multiply(s3, 14);
      }
    }
    return state;
  }
  function aesCbcDecrypt(data, key, iv) {
    if (data.length % 16 !== 0) throw new Error("AES-CBC data isn't a whole number of blocks");
    const roundKeys = expandKey(key);
    const out = new Uint8Array(data.length);
    let previous = iv;
    for (let offset = 0; offset < data.length; offset += 16) {
      const block = data.slice(offset, offset + 16);
      out.set(decryptBlock(block, roundKeys).map((b, i) => b ^ previous[i]), offset);
      previous = block;
    }
    const padding = out[out.length - 1];
    return padding >= 1 && padding <= 16 ? out.slice(0, out.length - padding) : out;
  }

  // themes/madara.ts
  var statuses = [
    ["completed", ["completed", "completo", "completado", "concluído", "concluido", "finalizado", "achevé", "terminé", "hoàn thành", "مكتملة", "مكتمل", "已完结", "tamamlandı", "đã hoàn thành", "завершено", "tamamlanan", "complété"]],
    ["ongoing", ["ongoing", "on going", "updating", "продолжается", "em lançamento", "em andamento", "en cours", "ativo", "lançando", "đang tiến hành", "còn nữa", "devam ediyor", "in corso", "in arrivo", "مستمرة", "مستمر", "en curso", "emision", "curso", "en marcha", "publicandose", "publicándose", "en emision", "连载中", "đang làm", "em postagem", "devam eden", "em progresso", "atualizações semanais", "виходить", "đang ra"]],
    ["onHiatus", ["on hold", "hiatus", "pausado", "en espera", "durduruldu", "beklemede", "đang chờ", "متوقف", "en pause", "заморожено", "en attente", "tạm dừng"]],
    ["cancelled", ["canceled", "cancelled", "cancelado", "iptal edildi", "đã hủy", "ملغي", "abandonné", "заброшено", "annulé"]]
  ];
  var toStatus = (text) => statuses.find(([, words2]) => words2.some((w) => text.toLowerCase().includes(w)))?.[0] ?? "unknown";
  var isUpdating = (text) => /Updating|Atualizando/i.test(text);
  function imageFromElement(img) {
    for (const name of ["data-src", "data-lazy-src", "data-lzl-src", "data-cfsrc", "data-manga-src"]) {
      if (img.hasAttr(name)) return img.absUrl(name);
    }
    if (img.hasAttr("srcset")) {
      const candidates = img.attr("srcset").split(",").map((c) => c.trim().split(/\s+/, 2)).filter((c) => /^https?:\/\/\S+$/.test(c[0]));
      const sized = candidates.flatMap((c) => {
        const m = /^(\d+(?:\.\d+)?)[wx]$/.exec(c[1] ?? "");
        return m ? [[c[0], Number(m[1])]] : [];
      });
      return sized.sort((a, b) => b[1] - a[1])[0]?.[0] ?? candidates.map((c) => c[0]).sort().pop();
    }
    return img.absUrl("src") || void 0;
  }
  var months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  function parseEnglishDate(text) {
    const dayFirst = /(\d{1,2})\s+([A-Za-z]{3})[A-Za-z]*\.?,?\s+(\d{4})/.exec(text);
    const monthFirst = /([A-Za-z]{3})[A-Za-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/.exec(text);
    const [day, month, year] = dayFirst ? [dayFirst[1], dayFirst[2], dayFirst[3]] : monthFirst ? [monthFirst[2], monthFirst[1], monthFirst[3]] : [];
    const index = months.indexOf((month ?? "").toLowerCase());
    return index < 0 ? void 0 : Date.UTC(Number(year), index, Number(day));
  }
  var orderOptions = [["Relevance", ""], ["Latest", "latest"], ["A-Z", "alphabet"], ["Rating", "rating"], ["Trending", "trending"], ["Views", "views"], ["New", "new-manga"]];
  var statusOptions = [["Completed", "end"], ["Ongoing", "on-going"], ["Canceled", "canceled"], ["On Hold", "on-hold"]];
  var adultOptions = [["All", ""], ["None", "0"], ["Only", "1"]];
  var genreConditionOptions = [["OR", ""], ["AND", "1"]];
  var options = (list) => list.map(([label, value]) => ({ label, value }));
  var xhr = { "X-Requested-With": "XMLHttpRequest" };
  function madara(options_) {
    const o = options_;
    const { info } = o;
    const baseUrl = info.baseUrl.replace(/\/$/, "");
    const ajax = o.ajax ?? true;
    const supportsPostId = o.supportsPostId ?? true;
    const chapterMode = o.chapterMode ?? "MangaPage";
    const subString = o.mangaSubString ?? "manga";
    const genreDirectory = o.genreDirectory ?? "manga-genre";
    const filterNonMangaItems = o.filterNonMangaItems ?? true;
    const supportsLatest = o.supportsLatest ?? true;
    const pageSize = o.pageSize ?? 25;
    const archiveSelector = o.archiveSelector ?? "div.page-item-detail, .manga__item, .c-tabs-item__content";
    const archiveUrlSelector = o.archiveUrlSelector ?? ".post-title a";
    const nextPageSelector = o.nextPageSelector ?? "div.nav-previous, a.nextpostslink, #navigation-ajax";
    const orderParameter = o.orderQueryParameter ?? "m_orderby";
    const searchParameter = o.searchQueryParameter ?? "s";
    const archiveUrl = o.archiveUrl ?? ((path, page, params) => `${baseUrl}${path}${page > 1 ? `page/${page}/` : ""}${params.length ? `?${queryString(params)}` : ""}`);
    const searchUrl = o.searchUrl ?? ((page, params) => `${baseUrl}/${page > 1 ? `page/${page}/` : ""}?${queryString(params)}`);
    const dateFormat = o.chapterDateFormat ?? { pattern: "MMMM d, yyyy", locale: "en" };
    const formatParser = javaDateParser(dateFormat.pattern, dateFormat.locale ?? "en");
    const parseDate = o.parseDate ?? ((text) => formatParser(text) ?? (/^en\b/.test(dateFormat.locale ?? "en") ? parseEnglishDate(text) : void 0));
    async function get(url) {
      const response = await send(url);
      return { document: Honya.parseHTML(response.body, response.url), url: response.url, status: response.status };
    }
    async function post(url, fields, allowStatus = false) {
      const form = formBody(fields);
      const request = { url, method: "POST", body: form.body, headers: { ...form.headers, ...xhr } };
      const response = allowStatus ? await Honya.request(request) : await send(request);
      return { document: Honya.parseHTML(response.body, response.url), status: response.status };
    }
    const pathOf = (url) => relativeUrl(url).replace(/[?#].*$/, "");
    const sameUrl = (a, b) => {
      const clean = (url) => {
        try {
          return decodeURI(url.replace(/\/$/, ""));
        } catch {
          return url.replace(/\/$/, "");
        }
      };
      return clean(a) === clean(b);
    };
    const absolute = (path) => /^https?:\/\//.test(path) ? path : `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
    const memoOf = (manga) => {
      try {
        return JSON.parse(manga.sourceData ?? "{}") ?? {};
      } catch {
        return {};
      }
    };
    const isPostId = (url) => /^\d+$/.test(url);
    const mangaId = (manga) => isPostId(manga.url) ? manga.url : memoOf(manga).id;
    const memoPath = (manga) => memoOf(manga).path;
    function documentMangaId(document) {
      return document.selectFirst("[id^=manga-chapters-holder]")?.attr("data-id") || document.selectFirst("input.rating-post-id")?.attr("value") || document.selectFirst("a[data-post]")?.attr("data-post") || /[?&]p=(\d+)/.exec(document.selectFirst("link[rel=shortlink]")?.attr("href") ?? "")?.[1] || void 0;
    }
    function mangaUrl(manga) {
      const path = memoPath(manga) ?? (isPostId(manga.url) ? void 0 : manga.url);
      return path ? absolute(path) : `${baseUrl}/?p=${mangaId(manga) ?? manga.url}`;
    }
    async function detailsDocument(manga) {
      let id = mangaId(manga);
      const path = memoPath(manga) ?? (isPostId(manga.url) ? void 0 : manga.url);
      if (path) {
        const requested = absolute(path);
        const response = await Honya.request(requested);
        const ok = response.status >= 200 && response.status < 300;
        const same = sameUrl(response.url, requested);
        if (ok && (same || !supportsPostId)) return { document: Honya.parseHTML(response.body, response.url), url: response.url };
        if (!ok && !supportsPostId) throw new Error(`HTTP ${response.status} for ${response.url}`);
        id ??= documentMangaId(Honya.parseHTML(response.body, response.url));
      }
      if (!id) throw new Error("This manga has no Madara post ID; refresh it from the source.");
      return get(`${baseUrl}/?p=${id}`);
    }
    function genreRoutes(elements) {
      return elements.flatMap((element) => {
        const href = element.absUrl("href");
        const name = element.text();
        if (!href || !name) return [];
        const path = pathOf(href);
        const slug = path.replace(/\/$/, "").split("/").pop();
        return slug ? [{ name, slug, path }] : [];
      });
    }
    function archiveManga(element, id) {
      const link = element.selectFirst(archiveUrlSelector);
      const href = link?.absUrl("href");
      if (!link || !href) return void 0;
      const path = pathOf(href);
      const img = element.selectFirst("img");
      return {
        url: supportsPostId && id ? id : path,
        title: (o.archiveTitleSelector ? element.selectFirst(o.archiveTitleSelector)?.text() : void 0) ?? link.text(),
        thumbnailUrl: img ? imageFromElement(img) : void 0,
        sourceData: JSON.stringify({ path })
      };
    }
    function parseArchive(document) {
      return document.select(archiveSelector).flatMap((element) => {
        const id = supportsPostId ? element.attr("data-post-id") || element.selectFirst("[data-post-id]")?.attr("data-post-id") || "" : "";
        if (supportsPostId && !id) return [];
        const manga = archiveManga(element, id);
        return manga ? [manga] : [];
      });
    }
    function ajaxBase(page) {
      const fields = [
        ["action", "madara_load_more"],
        ["page", String(page - 1)],
        ["template", o.ajaxTemplate ?? "madara-core/content/content-archive"],
        ["vars[paged]", "1"],
        ["vars[template]", "archive"],
        ["vars[posts_per_page]", String(pageSize)],
        ["vars[post_type]", "wp-manga"],
        ["vars[post_status]", "publish"],
        ["vars[manga_archives_item_layout]", "big_thumbnail"]
      ];
      if (filterNonMangaItems) fields.push(["vars[meta_query][0][key]", "_wp_manga_chapter_type"], ["vars[meta_query][0][value]", "manga"]);
      return fields;
    }
    const sortBy = (key) => [["vars[orderby]", "meta_value_num"], ["vars[meta_key]", key], ["vars[order]", "DESC"]];
    async function ajaxList(page, fields) {
      const { document } = await post(`${baseUrl}/wp-admin/admin-ajax.php`, [...ajaxBase(page), ...fields]);
      const mangas = parseArchive(document);
      return { mangas, hasNextPage: mangas.length === pageSize };
    }
    function ajaxSearchFields(query, filters) {
      const fields = [];
      if (query.trim()) fields.push(["vars[s]", query]);
      let meta = filterNonMangaItems ? 1 : 0;
      let taxonomy = 0;
      const genres = filters.flatMap((f) => f.id === "genres" && f.type === "checkboxes" ? f.checked : []);
      for (const filter of filters) {
        if (filter.type === "text" && filter.value.trim()) {
          const taxonomies = { author: "wp-manga-author", artist: "wp-manga-artist", year: "wp-manga-release" };
          if (!taxonomies[filter.id]) continue;
          fields.push([`vars[tax_query][${taxonomy}][taxonomy]`, taxonomies[filter.id]], [`vars[tax_query][${taxonomy}][field]`, "name"], [`vars[tax_query][${taxonomy}][terms]`, filter.value]);
          taxonomy++;
        } else if (filter.id === "status" && filter.type === "checkboxes" && filter.checked.length) {
          fields.push([`vars[meta_query][${meta}][key]`, "_wp_manga_status"], [`vars[meta_query][${meta}][compare]`, "IN"]);
          filter.checked.forEach((state, i) => fields.push([`vars[meta_query][${meta}][value][${i}]`, state]));
          meta++;
        } else if (filter.id === "sort" && filter.type === "select") {
          switch (filter.options[filter.selected]?.value) {
            case "latest":
              fields.push(...sortBy("_latest_update"));
              break;
            case "alphabet":
              fields.push(["vars[orderby]", "post_title"], ["vars[order]", "ASC"]);
              break;
            case "rating":
              fields.push(
                ["vars[meta_query][query_average_reviews][key]", "_manga_avarage_reviews"],
                ["vars[meta_query][query_average_reviews][compare]", "EXISTS"],
                ["vars[meta_query][query_total_reviews][key]", "_manga_total_votes"],
                ["vars[meta_query][query_total_reviews][compare]", "EXISTS"],
                ["vars[orderby][query_average_reviews]", "DESC"],
                ["vars[orderby][query_total_reviews]", "DESC"]
              );
              break;
            case "trending":
              fields.push(...sortBy("_wp_manga_week_views_value"));
              break;
            case "views":
              fields.push(...sortBy("_wp_manga_views"));
              break;
            case "new-manga":
              fields.push(["vars[orderby]", "date"], ["vars[order]", "DESC"]);
              break;
          }
        } else if (filter.id === "adult" && filter.type === "select" && filter.selected !== 0) {
          fields.push([`vars[meta_query][${meta}][key]`, "manga_adult_content"], [`vars[meta_query][${meta}][compare]`, filter.selected === 1 ? "not exists" : "exists"]);
          meta++;
        } else if (filter.id === "genreCondition" && filter.type === "select" && filter.selected === 1 && genres.length) {
          fields.push([`vars[tax_query][${taxonomy}][operation]`, "AND"]);
        } else if (filter.id === "genres" && genres.length) {
          fields.push([`vars[tax_query][${taxonomy}][taxonomy]`, "wp-manga-genre"], [`vars[tax_query][${taxonomy}][field]`, "slug"]);
          genres.forEach((slug, i) => fields.push([`vars[tax_query][${taxonomy}][terms][${i}]`, slug]));
        }
      }
      return fields;
    }
    async function archivePage(page, order, path = `/${subString}/`, query = "") {
      const params = [];
      if (order) params.push([orderParameter, order]);
      if (query) params.push([searchParameter, query]);
      const { document } = await get(archiveUrl(path, page, params));
      return { mangas: parseArchive(document), hasNextPage: document.selectFirst(nextPageSelector) != null };
    }
    async function htmlSearch(page, query) {
      if (page > 1 && supportsPostId) return { mangas: [], hasNextPage: false };
      const { document } = await get(searchUrl(page, [[searchParameter, query], ["post_type", "wp-manga"]]));
      const hasNextPage = !supportsPostId && document.selectFirst(nextPageSelector) != null;
      const archived = parseArchive(document);
      if (archived.length) return { mangas: archived, hasNextPage };
      const cards = document.select(o.searchCardSelector ?? ".c-tabs-item__content").flatMap((element) => {
        const link = element.selectFirst(archiveUrlSelector);
        const href = link?.absUrl("href");
        if (!link || !href) return [];
        const img = element.selectFirst("img");
        const title = (o.archiveTitleSelector ? element.selectFirst(o.archiveTitleSelector)?.text() : void 0) ?? link.text();
        return [{ title, path: pathOf(href), thumbnailUrl: img ? imageFromElement(img) : void 0 }];
      });
      const card = (c, id) => ({ url: id, title: c.title, thumbnailUrl: c.thumbnailUrl, sourceData: JSON.stringify({ path: c.path }) });
      if (!supportsPostId) return { mangas: cards.map((c) => card(c, c.path)), hasNextPage };
      const ids = await rssIds(query, cards.map((c) => c.path));
      const mangas = [];
      for (const c of cards) {
        const id = ids.get(c.path) ?? await resolvePostId(absolute(c.path));
        if (id) mangas.push(card(c, id));
      }
      return { mangas, hasNextPage: false };
    }
    async function rssIds(query, needed) {
      const ids = /* @__PURE__ */ new Map();
      for (let page = 1; page <= 20; page++) {
        const response = await Honya.request(`${baseUrl}/feed?${queryString([["post_type", "wp-manga"], ["s", query], ["paged", page]])}`);
        if (response.status < 200 || response.status > 299) break;
        const items = [...response.body.matchAll(/<item>([\s\S]*?)<\/item>/g)];
        for (const [, item] of items) {
          const link = /<link>\s*(?:<!\[CDATA\[)?([^<\]]+)/.exec(item)?.[1]?.trim();
          const id = /<guid[^>]*>[^<]*[?&](?:amp;)?p=(\d+)/.exec(item)?.[1];
          if (link && id) ids.set(pathOf(link), id);
        }
        if (items.length === 0 || needed.every((path) => ids.has(path))) break;
      }
      return ids;
    }
    async function resolvePostId(url) {
      const head = await Honya.request({ url, method: "HEAD" });
      const shortlink = /<[^>]*[?&]p=(\d+)[^>]*>\s*;\s*rel="?shortlink"?/i.exec(head.headers["link"] ?? "")?.[1];
      if (shortlink) return shortlink;
      const response = await Honya.request(url);
      return response.status < 300 ? documentMangaId(Honya.parseHTML(response.body, response.url)) : void 0;
    }
    function details(document, pageUrl, id) {
      const names = (selector) => document.select(selector).map((e) => e.text()).filter((t) => !isUpdating(t)).join(", ") || void 0;
      const descriptionElement = document.selectFirst(o.mangaDetailsSelectorDescription ?? "div.description-summary div.summary__content, div.summary_content div.post-content_item > h5 + div, div.summary_content div.manga-excerpt");
      const paragraphs = descriptionElement?.select("p") ?? [];
      let description = paragraphs.length ? paragraphs.map((p) => p.text()).join("\n\n") : descriptionElement?.text();
      const alternative = document.selectFirst(o.altNameSelector ?? ".post-content_item:contains(Alt) .summary-content")?.ownText();
      if (alternative && !isUpdating(alternative)) description = [description, `Alternative Names: ${alternative}`].filter(Boolean).join("\n\n");
      const thumbnail = document.selectFirst(o.mangaDetailsSelectorThumbnail ?? "div.summary_image img");
      const statusElements = document.select(o.mangaDetailsSelectorStatus ?? "div.summary-content, div.summary-heading:contains(Status) + div");
      const routes = genreRoutes(document.select(o.mangaDetailsSelectorGenre ?? "div.genres-content a"));
      const genres = [
        ...routes.map((g) => g.name),
        ...document.select(o.mangaDetailsSelectorTag ?? "div.tags-content a").map((a) => a.text()),
        ...[document.selectFirst(o.seriesTypeSelector ?? ".post-content_item:contains(Type) .summary-content")?.text()].filter((t) => !!t)
      ];
      const seen = /* @__PURE__ */ new Set();
      const memo = { path: pathOf(pageUrl) };
      if (routes.length) memo.genres = routes;
      if (id) memo.id = id;
      return {
        title: document.selectFirst(o.mangaDetailsSelectorTitle ?? "div.post-title h3, div.post-title h1, #manga-title > h1")?.ownText() || void 0,
        author: names(o.mangaDetailsSelectorAuthor ?? "div.author-content > a, div.manga-authors > a"),
        artist: names(o.mangaDetailsSelectorArtist ?? "div.artist-content > a"),
        description,
        thumbnailUrl: thumbnail ? imageFromElement(thumbnail) : void 0,
        status: statusElements.length ? toStatus(statusElements[statusElements.length - 1].text()) : "unknown",
        genres: genres.filter((g) => !seen.has(g.toLowerCase()) && seen.add(g.toLowerCase())),
        sourceData: JSON.stringify(memo)
      };
    }
    function parseChapterList(document, mangaPath) {
      return document.select(o.chapterListSelector ?? "li.wp-manga-chapter").flatMap((element) => {
        const link = element.selectFirst(o.chapterUrlSelector ?? "a");
        const href = link?.absUrl("href");
        const slug = href ? pathOf(href).replace(/\/$/, "").split("/").pop() : void 0;
        if (!link || !slug) return [];
        const date = element.selectFirst("img:not(.thumb)")?.attr("alt") || element.selectFirst("span a")?.attr("title") || element.selectFirst(o.chapterDateSelector ?? "span.chapter-release-date")?.text();
        return [{
          url: slug,
          name: (o.chapterNameSelector ? element.selectFirst(o.chapterNameSelector)?.text() : void 0) ?? link.text(),
          dateUpload: parseRelativeOrAbsolute(date, parseDate),
          sourceData: JSON.stringify({ mangaPath })
        }];
      });
    }
    async function fetchChapters(mangaPath, id, mangaPage) {
      const ajaxUrl = `${baseUrl}${mangaPath.replace(/\/$/, "")}/ajax/chapters/`;
      switch (chapterMode) {
        case "MangaPage":
          if (!mangaPage) throw new Error("The manga page is needed for its chapters.");
          return parseChapterList(mangaPage, mangaPath);
        case "AdminAjax":
          return parseChapterList((await post(`${baseUrl}/wp-admin/admin-ajax.php`, [["action", "manga_get_chapters"], ["manga", id]])).document, mangaPath);
        case "MangaAjax":
          return parseChapterList((await post(ajaxUrl, [])).document, mangaPath);
        case "MangaAjaxPaginated": {
          const chapters = [];
          let last;
          for (let page = 1; page < 500; page++) {
            const { document, status } = await post(`${ajaxUrl}?t=${page}`, [], true);
            if (status === 404) break;
            if (status < 200 || status > 299) throw new Error(`HTTP ${status} for ${ajaxUrl}`);
            const list = parseChapterList(document, mangaPath);
            if (list.length === 0 || list[list.length - 1].url === last) break;
            chapters.push(...list);
            last = list[list.length - 1].url;
          }
          return chapters;
        }
        case "MangaAjaxQuery": {
          const slug = mangaPath.replace(/\/$/, "").split("/").pop() ?? "";
          return parseChapterList((await post(`${baseUrl}/index.php`, [["manga-core", slug], ["manga_ajax", "1"], ["maction", "get_chapters"]])).document, mangaPath);
        }
      }
    }
    function protectedPages(protector) {
      const src = protector.attr("src");
      const script = src.startsWith("data:text/javascript;base64,") ? utf8Decode(base64Decode(src.slice(src.indexOf(",") + 1))) : protector.html();
      const between = (text, start, end) => {
        const from = text.indexOf(start);
        const rest = from < 0 ? text : text.slice(from + start.length);
        const to = rest.indexOf(end);
        return to < 0 ? rest : rest.slice(0, to);
      };
      const password = between(script, "wpmangaprotectornonce='", "';");
      const data = JSON.parse(between(script, "chapter_data='", "';").replaceAll("\\/", "/"));
      const { key, iv } = evpBytesToKey(utf8Encode(password), hexDecode(data.s));
      const plain = utf8Decode(aesCbcDecrypt(base64Decode(data.ct), key, iv));
      const images = JSON.parse(JSON.parse(plain));
      return Array.isArray(images) ? images.filter((url) => typeof url === "string") : [];
    }
    function filterList(data) {
      const genres = Array.isArray(data) ? data.filter((g) => g?.name && g?.slug) : [];
      const sort = { type: "select", id: "sort", name: "Order by", options: options(orderOptions), selected: 0, listings: ajax ? { popular: "views", latest: supportsLatest ? "latest" : void 0 } : listings() };
      if (!ajax) {
        const list2 = [sort];
        if (genres.length) list2.push({ type: "select", id: "genre", name: "Genre", options: [{ label: "All", value: "" }, ...genres.map((g) => ({ label: g.name, value: g.path }))], selected: 0 });
        return list2;
      }
      const list = [
        { type: "text", id: "author", name: "Author", value: "" },
        { type: "text", id: "artist", name: "Artist", value: "" },
        { type: "text", id: "year", name: "Year of Released", value: "" },
        { type: "checkboxes", id: "status", name: "Status", options: options(statusOptions), checked: [] },
        sort,
        { type: "select", id: "adult", name: "Adult content", options: options(adultOptions), selected: 0 }
      ];
      if (genres.length) {
        list.push(
          { type: "separator", id: "genresSeparator" },
          { type: "header", id: "genresHeader", name: "Genres may not work for all sources" },
          { type: "select", id: "genreCondition", name: "Genre condition", options: options(genreConditionOptions), selected: 0 },
          { type: "checkboxes", id: "genres", name: "Genres", options: genres.map((g) => ({ label: g.name, value: g.slug })), checked: [] }
        );
      }
      return list;
    }
    function listings() {
      const has = (value) => orderOptions.some(([, v]) => v === value) ? value : void 0;
      return { popular: has(o.popularOrder ?? "views"), latest: supportsLatest ? has(o.latestOrder ?? "latest") : void 0 };
    }
    return {
      info: { ...info, supportsLatest },
      getPopularManga(page) {
        return ajax ? ajaxList(page, sortBy("_wp_manga_views")) : archivePage(page, o.popularOrder ?? "views");
      },
      getLatestUpdates(page) {
        return ajax ? ajaxList(page, sortBy("_latest_update")) : archivePage(page, o.latestOrder ?? "latest");
      },
      searchManga(page, query, filters) {
        if (ajax) return ajaxList(page, ajaxSearchFields(query, filters));
        const sort = filters.find((f) => f.id === "sort");
        const order = sort?.type === "select" ? sort.options[sort.selected]?.value ?? "" : "";
        const genre = filters.find((f) => f.id === "genre");
        const genrePath = genre?.type === "select" ? genre.options[genre.selected]?.value : void 0;
        if (genrePath) return archivePage(page, order, genrePath, query.trim());
        return query.trim() ? htmlSearch(page, query) : archivePage(page, order);
      },
      async getMangaDetails(manga) {
        const { document, url } = await detailsDocument(manga);
        const id = supportsPostId ? mangaId(manga) ?? documentMangaId(document) : void 0;
        return details(document, url, id);
      },
      async getChapterList(manga) {
        const id = supportsPostId ? mangaId(manga) : "";
        const path = memoPath(manga);
        if (chapterMode !== "MangaPage" && id !== void 0 && path) return fetchChapters(path, id);
        const { document, url } = await detailsDocument(manga);
        const resolvedId = id ?? documentMangaId(document);
        if (resolvedId === void 0) throw new Error("This manga has no Madara post ID; refresh it from the source.");
        return fetchChapters(pathOf(url), resolvedId, document);
      },
      async getPageList(chapter) {
        let url;
        if (/^https?:\/\//.test(chapter.url)) {
          url = chapter.url;
        } else {
          let mangaPath;
          try {
            mangaPath = JSON.parse(chapter.sourceData ?? "{}").mangaPath;
          } catch {
          }
          if (!mangaPath || chapter.url.includes("/")) throw new Error("Refresh the chapter list.");
          url = `${baseUrl}${mangaPath.replace(/\/$/, "")}/${chapter.url}/`;
        }
        let { document } = await get(url);
        if (document.selectFirst("#single-pager") != null) {
          document = (await get(`${url}${url.includes("?") ? "&" : "?"}style=list`)).document;
        }
        const protector = document.selectFirst("#chapter-protector-data");
        if (protector) return protectedPages(protector).map((image) => ({ url: image }));
        return document.select(o.pageListParseSelector ?? "div.page-break, li.blocks-gallery-item, .reading-content .text-left:not(:has(.blocks-gallery-item))").flatMap((element) => {
          const img = element.selectFirst("img");
          const src = img ? imageFromElement(img) : void 0;
          return src ? [{ url: src }] : [];
        });
      },
      getFilterList(data) {
        return filterList(data);
      },
      async fetchFilterData() {
        const { document } = await get(`${baseUrl}/${subString}/`);
        const links = document.select(o.filterGenresSelector ?? "div.genres").flatMap((e) => e.select(`a[href*='/${genreDirectory}/']`));
        const seen = /* @__PURE__ */ new Set();
        return genreRoutes(links).filter((g) => !seen.has(g.slug) && seen.add(g.slug)).map((g) => ({ ...g, name: g.name.replace(/\s*\(\d+\)$/, "") }));
      },
      getMangaUrl(manga) {
        return mangaUrl(manga);
      }
    };
  }

  // src/en/manhwa18today/index.ts
  var index_default = madara({
    info: {
      id: "5795673090229968734",
      name: "Manhwa18.today",
      lang: "en",
      version: "1.1.0",
      baseUrl: "https://www.manhwa18.today",
      nsfw: true,
      icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/manhwa18today/res/mipmap-xhdpi/ic_launcher.png"
    },
    chapterMode: "MangaAjax"
  });
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
