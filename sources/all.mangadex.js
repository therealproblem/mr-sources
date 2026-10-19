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

  // src/all/mangadex/index.ts
  var index_exports = {};
  __export(index_exports, {
    default: () => index_default
  });

  // sdk/helpers.ts
  function queryString(params) {
    return params.map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`).join("&");
  }
  function parseDate(text) {
    if (!text) return void 0;
    const time = Date.parse(text);
    return Number.isNaN(time) ? void 0 : time;
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

  // src/all/mangadex/filters.ts
  var safeRatings = ["safe", "suggestive"];
  function filterList(defaults) {
    return [
      { type: "checkboxes", id: "hasAvailableChapters", name: "Availability", options: [{ label: "Has available chapters", value: "true" }], checked: [] },
      {
        type: "checkboxes",
        id: "originalLanguage",
        name: "Original language",
        options: [{ label: "Japanese (Manga)", value: "ja" }, { label: "Chinese (Manhua)", value: "zh" }, { label: "Korean (Manhwa)", value: "ko" }],
        checked: defaults.originalLanguages
      },
      {
        type: "checkboxes",
        id: "contentRating",
        name: "Content rating",
        options: [{ label: "Safe", value: "safe" }, { label: "Suggestive", value: "suggestive" }],
        checked: defaults.contentRating
      },
      {
        type: "checkboxes",
        id: "publicationDemographic",
        name: "Publication demographic",
        options: Object.entries(demographics).map(([value, label]) => ({ label, value })),
        checked: []
      },
      {
        type: "checkboxes",
        id: "status",
        name: "Status",
        options: [{ label: "Ongoing", value: "ongoing" }, { label: "Completed", value: "completed" }, { label: "Hiatus", value: "hiatus" }, { label: "Cancelled", value: "cancelled" }],
        checked: []
      },
      // Popular only lists titles created in the last 30 days and Latest lists chapters, so
      // neither matches a sort option.
      { type: "sort", id: "order", name: "Sort", options: sortables, selected: 5, ascending: false, listings: {} },
      {
        type: "select",
        id: "createdAtSince",
        name: "Created within last",
        options: [{ label: "Any", value: "0" }, { label: "Day", value: "1" }, { label: "Week", value: "7" }, { label: "Month", value: "30" }, { label: "Year", value: "365" }],
        selected: 0
      },
      { type: "select", id: "includedTagsMode", name: "Included tags mode", options: tagModes, selected: 0 },
      { type: "select", id: "excludedTagsMode", name: "Excluded tags mode", options: tagModes, selected: 1 },
      ...tagGroups.map((group) => ({ type: "tristates", id: group.id, name: group.name, options: group.tags, included: [], excluded: [] }))
    ];
  }
  function queryParams(filters, dexLang) {
    const params = [];
    let ratings = safeRatings;
    for (const filter of filters) {
      switch (filter.type) {
        case "checkboxes": {
          const checked = filter.options.map((o) => o.value).filter((value) => filter.checked.includes(value));
          if (filter.id === "hasAvailableChapters") {
            if (checked.length > 0) params.push(["hasAvailableChapters", "true"], ["availableTranslatedLanguage[]", dexLang]);
          } else if (filter.id === "originalLanguage") {
            for (const lang of checked) {
              if (lang === "zh") params.push(["originalLanguage[]", "zh-hk"]);
              params.push(["originalLanguage[]", lang]);
            }
          } else if (filter.id === "contentRating") {
            ratings = checked.filter((rating) => safeRatings.includes(rating));
          } else {
            params.push(...checked.map((value) => [`${filter.id}[]`, value]));
          }
          break;
        }
        case "sort": {
          const option = filter.selected === void 0 ? void 0 : filter.options[filter.selected];
          if (option) params.push([`order[${option.value}]`, filter.ascending ? "asc" : "desc"]);
          break;
        }
        case "select": {
          const value = filter.options[filter.selected]?.value;
          if (value === void 0) break;
          if (filter.id === "createdAtSince") {
            const days = Number(value);
            if (days > 0) params.push(["createdAtSince", apiDate(Math.floor((Date.now() - days * 864e5) / 36e5) * 36e5)]);
          } else {
            params.push([filter.id, value]);
          }
          break;
        }
        case "tristates":
          for (const option of filter.options) {
            if (filter.included.includes(option.value)) params.push(["includedTags[]", option.value]);
            else if (filter.excluded.includes(option.value)) params.push(["excludedTags[]", option.value]);
          }
          break;
      }
    }
    for (const rating of ratings.length > 0 ? ratings : safeRatings) params.push(["contentRating[]", rating]);
    return params;
  }
  function apiDate(time) {
    return new Date(time).toISOString().slice(0, 19);
  }
  var demographics = {
    none: "None",
    shounen: "Shounen",
    shoujo: "Shoujo",
    seinen: "Seinen",
    josei: "Josei"
  };
  var sortables = [
    { label: "Alphabetic", value: "title" },
    { label: "Chapter uploaded at", value: "latestUploadedChapter" },
    { label: "Number of follows", value: "followedCount" },
    { label: "Content created at", value: "createdAt" },
    { label: "Content info updated at", value: "updatedAt" },
    { label: "Relevance", value: "relevance" },
    { label: "Year", value: "year" },
    { label: "Rating", value: "rating" }
  ];
  var tagModes = [{ label: "And", value: "AND" }, { label: "Or", value: "OR" }];
  var tag = (value, label) => ({ label, value });
  var tagGroups = [
    {
      id: "content",
      name: "Content",
      tags: [
        tag("b29d6a3d-1569-4e7a-8caf-7557bc92cd5d", "Gore"),
        tag("97893a4c-12af-4dac-b6be-0dffb353568e", "Sexual violence")
      ]
    },
    {
      id: "format",
      name: "Format",
      tags: [
        tag("b11fda93-8f1d-4bef-b2ed-8803d3733170", "4-Koma"),
        tag("f4122d1c-3b44-44d0-9936-ff7502c39ad3", "Adaptation"),
        tag("51d83883-4103-437c-b4b1-731cb73d786c", "Anthology"),
        tag("0a39b5a1-b235-4886-a747-1d05d216532d", "Award Winning"),
        tag("b13b2a48-c720-44a9-9c77-39c9979373fb", "Doujinshi"),
        tag("7b2ce280-79ef-4c09-9b58-12b7c23a9b78", "Fan Colored"),
        tag("f5ba408b-0e7a-484d-8d49-4e9125ac96de", "Full Color"),
        tag("3e2b8dae-350e-4ab8-a8ce-016e844b9f0d", "Long Strip"),
        tag("320831a8-4026-470b-94f6-8353740e6f04", "Official Colored"),
        tag("0234a31e-a729-4e28-9d6a-3f87c4966b9e", "Oneshot"),
        tag("891cf039-b895-47f0-9229-bef4c96eccd4", "User Created"),
        tag("e197df38-d0e7-43b5-9b09-2842d0c326dd", "Web Comic")
      ]
    },
    {
      id: "genre",
      name: "Genre",
      tags: [
        tag("391b0423-d847-456f-aff0-8b0cfc03066b", "Action"),
        tag("87cc87cd-a395-47af-b27a-93258283bbc6", "Adventure"),
        tag("5920b825-4181-4a17-beeb-9918b0ff7a30", "Boy's Love"),
        tag("4d32cc48-9f00-4cca-9b5a-a839f0764984", "Comedy"),
        tag("5ca48985-9a9d-4bd8-be29-80dc0303db72", "Crime"),
        tag("b9af3a63-f058-46de-a9a0-e0c13906197a", "Drama"),
        tag("cdc58593-87dd-415e-bbc0-2ec27bf404cc", "Fantasy"),
        tag("a3c67850-4684-404e-9b7f-c69850ee5da6", "Girl's Love"),
        tag("33771934-028e-4cb3-8744-691e866a923e", "Historical"),
        tag("cdad7e68-1419-41dd-bdce-27753074a640", "Horror"),
        tag("ace04997-f6bd-436e-b261-779182193d3d", "Isekai"),
        tag("81c836c9-914a-4eca-981a-560dad663e73", "Magical Girls"),
        tag("50880a9d-5440-4732-9afb-8f457127e836", "Mecha"),
        tag("c8cbe35b-1b2b-4a3f-9c37-db84c4514856", "Medical"),
        tag("ee968100-4191-4968-93d3-f82d72be7e46", "Mystery"),
        tag("b1e97889-25b4-4258-b28b-cd7f4d28ea9b", "Philosophical"),
        tag("423e2eae-a7a2-4a8b-ac03-a8351462d71d", "Romance"),
        tag("256c8bd9-4904-4360-bf4f-508a76d67183", "Sci-Fi"),
        tag("e5301a23-ebd9-49dd-a0cb-2add944c7fe9", "Slice of Life"),
        tag("69964a64-2f90-4d33-beeb-f3ed2875eb4c", "Sports"),
        tag("7064a261-a137-4d3a-8848-2d385de3a99c", "Superhero"),
        tag("07251805-a27e-4d59-b488-f0bfbec15168", "Thriller"),
        tag("f8f62932-27da-4fe4-8ee1-6779a8c5edba", "Tragedy"),
        tag("acc803a4-c95a-4c22-86fc-eb6b582d82a2", "Wuxia")
      ]
    },
    {
      id: "theme",
      name: "Theme",
      tags: [
        tag("e64f6742-c834-471d-8d72-dd51fc02b835", "Aliens"),
        tag("3de8c75d-8ee3-48ff-98ee-e20a65c86451", "Animals"),
        tag("ea2bc92d-1c26-4930-9b7c-d5c0dc1b6869", "Cooking"),
        tag("9ab53f92-3eed-4e9b-903a-917c86035ee3", "Crossdressing"),
        tag("da2d50ca-3018-4cc0-ac7a-6b7d472a29ea", "Delinquents"),
        tag("39730448-9a5f-48a2-85b0-a70db87b1233", "Demons"),
        tag("2bd2e8d0-f146-434a-9b51-fc9ff2c5fe6a", "Genderswap"),
        tag("3bb26d85-09d5-4d2e-880c-c34b974339e9", "Ghosts"),
        tag("fad12b5e-68ba-460e-b933-9ae8318f5b65", "Gyaru"),
        tag("aafb99c1-7f60-43fa-b75f-fc9502ce29c7", "Harem"),
        tag("5bd0e105-4481-44ca-b6e7-7544da56b1a3", "Incest"),
        tag("2d1f5d56-a1e5-4d0d-a961-2193588b08ec", "Loli"),
        tag("85daba54-a71c-4554-8a28-9901a8b0afad", "Mafia"),
        tag("a1f53773-c69a-4ce5-8cab-fffcd90b1565", "Magic"),
        tag("799c202e-7daa-44eb-9cf7-8a3c0441531e", "Martial Arts"),
        tag("ac72833b-c4e9-4878-b9db-6c8a4a99444a", "Military"),
        tag("dd1f77c5-dea9-4e2b-97ae-224af09caf99", "Monster Girls"),
        tag("36fd93ea-e8b8-445e-b836-358f02b3d33d", "Monsters"),
        tag("f42fbf9e-188a-447b-9fdc-f19dc1e4d685", "Music"),
        tag("489dd859-9b61-4c37-af75-5b18e88daafc", "Ninja"),
        tag("92d6d951-ca5e-429c-ac78-451071cbf064", "Office Workers"),
        tag("df33b754-73a3-4c54-80e6-1a74a8058539", "Police"),
        tag("9467335a-1b83-4497-9231-765337a00b96", "Post-Apocalyptic"),
        tag("3b60b75c-a2d7-4860-ab56-05f391bb889c", "Psychological"),
        tag("0bc90acb-ccc1-44ca-a34a-b9f3a73259d0", "Reincarnation"),
        tag("65761a2a-415e-47f3-bef2-a9dababba7a6", "Reverse Harem"),
        tag("81183756-1453-4c81-aa9e-f6e1b63be016", "Samurai"),
        tag("caaa44eb-cd40-4177-b930-79d3ef2afe87", "School Life"),
        tag("ddefd648-5140-4e5f-ba18-4eca4071d19b", "Shota"),
        tag("eabc5b4c-6aff-42f3-b657-3e90cbd00b75", "Supernatural"),
        tag("5fff9cde-849c-4d78-aab0-0d52b2ee1d25", "Survival"),
        tag("292e862b-2d17-4062-90a2-0356caa4ae27", "Time Travel"),
        tag("31932a7e-5b8e-49a6-9f12-2afa39dc544c", "Traditional Games"),
        tag("d7d1730f-6eb0-4ba6-9437-602cac38664c", "Vampires"),
        tag("9438db5a-7e2a-4ac0-b39e-e0d95a34b8a8", "Video Games"),
        tag("d14322ac-4d6f-4e9b-afd9-629d5f4d8a41", "Villainess"),
        tag("8c86611e-fab7-4986-9dec-d1a2f44acdd5", "Virtual Reality"),
        tag("631ef465-9aba-4afb-b0fc-ea10efe274a8", "Zombies")
      ]
    }
  ];

  // src/all/mangadex/index.ts
  var baseUrl = "https://mangadex.org";
  var apiUrl = "https://api.mangadex.org";
  var cdnUrl = "https://uploads.mangadex.org";
  var mangaLimit = 20;
  var latestChapterLimit = 100;
  var resultWindow = 1e4;
  var uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/;
  var legacyNoGroupId = "00e03853-1b96-4f41-9542-c71b8692033b";
  var externalGroups = [
    "5fed0576-8b94-4f9a-b6a7-08eecd69800d",
    "06a9fecb-b608-4f19-b93c-7caab06b7f44",
    "8d8ecf83-8d42-4f8c-add8-60963f9f28d9",
    "caa63201-4a17-4b7f-95ff-ed884a2b7e60",
    "319c1b10-cbd0-4f55-a46e-c4ee17e65139",
    "4f1de6a2-f0c5-4ac5-bce5-02c7dbb67deb"
  ];
  var oneShotTag = "0234a31e-a729-4e28-9d6a-3f87c4966b9e";
  var anthologyTag = "51d83883-4103-437c-b4b1-731cb73d786c";
  var romanizedLanguages = { ja: "ja-ro", ko: "ko-ro", zh: "zh-ro", "zh-hk": "zh-ro" };
  var linkPrefixes = { manga: "id:", title: "id:", chapter: "ch:", group: "grp:", author: "author:", user: "usr:", list: "list:" };
  var languages = [
    ["4638673959522768501", "af"],
    ["987803387023224960", "sq"],
    ["3339599426223341161", "ar"],
    ["9127464796236242233", "az"],
    ["1553736397938752611", "eu"],
    ["3601180820582582605", "be"],
    ["4150470519566206911", "bn"],
    ["5463447640980279236", "bg"],
    ["1347402746269051958", "my"],
    ["5860541308324630662", "ca"],
    ["5148895169070562838", "zh-Hans"],
    ["1493666528525752601", "zh-Hant"],
    ["2072928884077964642", "cv"],
    ["8548374501079910130", "hr"],
    ["3578612018159256808", "cs"],
    ["425785191804166217", "da"],
    ["6750440049024086587", "nl"],
    ["2499283573021220255", "en"],
    ["2819252027406613931", "eo"],
    ["8773024089257004344", "et"],
    ["8578871918181236609", "fil"],
    ["8254121249433835847", "fi"],
    ["4505830566611664829", "fr"],
    ["8952567078513962586", "ka"],
    ["5098537545549490547", "de"],
    ["3260701926561129943", "el"],
    ["1424273154577029558", "he"],
    ["6840513937945146538", "hi"],
    ["4284949320785450865", "hu"],
    ["3686775439235747344", "ga"],
    ["3807502156582598786", "id"],
    ["1952071260038453057", "it"],
    ["1411768577036936240", "ja"],
    ["1573550798452063564", "jv"],
    ["8884149958776527952", "kk"],
    ["3285208643537017688", "ko"],
    ["764587568075398530", "la"],
    ["737986167355114438", "lt"],
    ["1471784905273036181", "ms"],
    ["5967745367608513818", "mn"],
    ["954368055061084457", "ne"],
    ["4872213291993424667", "no"],
    ["3781216447842245147", "fa"],
    ["8033579885162383068", "pl"],
    ["2655149515337070132", "pt-BR"],
    ["5189216366882819742", "pt"],
    ["4774459486579224459", "ro"],
    ["2098905203823335614", "ru"],
    ["3507378005483435886", "sr"],
    ["2875503798326600410", "sk"],
    ["4938773340256184018", "es-419"],
    ["6400665728063187402", "es"],
    ["1145824452519314725", "sv"],
    ["4273071356706429527", "ta"],
    ["6886894829142702925", "te"],
    ["1713554459881080228", "th"],
    ["3846770256925560569", "tr"],
    ["5779037855201976894", "uk"],
    ["72800122520214493", "ur"],
    ["2838715564514827672", "uz"],
    ["9194073792736219759", "vi"]
  ];
  var dexLanguages = { "zh-Hans": "zh", "zh-Hant": "zh-hk", fil: "tl", "pt-BR": "pt-br", "es-419": "es-la" };
  var many = (name, values) => values.map((value) => [name, value]);
  async function request(path, params = []) {
    const response = await Honya.request(apiUrl + path + (params.length > 0 ? `?${queryString(params)}` : ""));
    if (response.status < 200 || response.status > 299) {
      let detail;
      try {
        detail = JSON.parse(response.body).errors?.[0]?.detail;
      } catch {
      }
      throw new Error(detail ? `MangaDex: ${detail}` : `HTTP ${response.status} for ${response.url}`);
    }
    return response;
  }
  async function api(path, params = []) {
    return JSON.parse((await request(path, params)).body);
  }
  async function collection(path, params) {
    const response = await request(path, params);
    if (response.status === 204 || !response.body) return { data: [], limit: 0, offset: 0, total: 0 };
    return JSON.parse(response.body);
  }
  var hasNext = (list) => list.offset + list.limit < Math.min(list.total, resultWindow);
  function makeSource([id, lang]) {
    const dexLang = dexLanguages[lang] ?? lang;
    const pref = (key, fallback) => Honya.prefs.get(`${key}_${dexLang}`) ?? fallback;
    const contentRating = () => {
      const ratings = pref("contentRating", safeRatings).filter((rating) => safeRatings.includes(rating));
      return ratings.length > 0 ? ratings : safeRatings;
    };
    const originalLanguages = () => pref("originalLanguage", []);
    const originalLanguageParams = () => many("originalLanguage[]", originalLanguages().flatMap((code) => code === "zh" ? ["zh", "zh-hk"] : [code]));
    const uuids = (key) => pref(key, "").split(",").map((text) => text.trim()).filter((text) => isUuid(text));
    const filters = () => filterList({ contentRating: contentRating(), originalLanguages: originalLanguages() });
    async function mangasPage(params) {
      const list = await collection("/manga", params);
      return { mangas: await toMangas(list.data), hasNextPage: hasNext(list) };
    }
    async function toMangas(data) {
      const firstCovers = await firstVolumeCovers(data);
      return data.map((manga) => basicManga(manga, firstCovers.get(manga.id) ?? coverFileName(manga)));
    }
    async function mangasFromChapters(page, extra) {
      const chapters = await collection("/chapter", [
        ["offset", latestChapterLimit * (page - 1)],
        ["limit", latestChapterLimit],
        ["translatedLanguage[]", dexLang],
        ["order[publishAt]", "desc"],
        ["includeFutureUpdates", "0"],
        ["includeFuturePublishAt", "0"],
        ["includeEmptyPages", "0"],
        ...extra,
        ...originalLanguageParams(),
        ...many("contentRating[]", contentRating()),
        ...many("excludedGroups[]", [.../* @__PURE__ */ new Set([...externalGroups, ...uuids("blockedGroups")])]),
        ...many("excludedUploaders[]", uuids("blockedUploader"))
      ]);
      const ids = [...new Set(chapters.data.flatMap((chapter) => (chapter.relationships ?? []).filter((r) => r.type === "manga").map((r) => r.id)))];
      if (ids.length === 0) return { mangas: [], hasNextPage: hasNext(chapters) };
      const list = await collection("/manga", [
        ["includes[]", "cover_art"],
        ["limit", ids.length],
        ...many("contentRating[]", contentRating()),
        ...many("ids[]", ids)
      ]);
      const byId = new Map(list.data.map((manga) => [manga.id, manga]));
      return { mangas: await toMangas(ids.flatMap((id2) => byId.get(id2) ?? [])), hasNextPage: hasNext(chapters) };
    }
    async function firstVolumeCovers(mangas) {
      const covers = /* @__PURE__ */ new Map();
      if (!pref("tryUsingFirstVolumeCover", false)) return covers;
      const withLanguage = mangas.filter((manga) => manga.attributes?.originalLanguage);
      if (withLanguage.length === 0) return covers;
      const locales = [...new Set(withLanguage.map((manga) => manga.attributes.originalLanguage))];
      try {
        const list = await collection("/cover", [
          ["order[volume]", "asc"],
          ...many("manga[]", withLanguage.map((manga) => manga.id)),
          ...many("locales[]", locales),
          ["limit", Math.min(withLanguage.length * locales.length, 100)],
          ["offset", 0]
        ]);
        for (const manga of withLanguage) {
          const fileName = list.data.find(
            (cover) => cover.attributes?.locale === manga.attributes.originalLanguage && cover.relationships?.some((r) => r.type === "manga" && r.id === manga.id)
          )?.attributes?.fileName;
          if (fileName) covers.set(manga.id, fileName);
        }
      } catch {
      }
      return covers;
    }
    function basicManga(manga, fileName) {
      const attributes = manga.attributes;
      const titles = localized(attributes.title);
      const altTitles = (attributes.altTitles ?? []).map(localized);
      const altTitle = (code) => {
        const values = Object.values(altTitles.find((title2) => title2[code] != null) ?? {});
        return values.length === 1 ? values[0] : void 0;
      };
      const mainTitle = Object.values(titles)[0];
      const candidates = pref("preferExtensionLangTitle", true) ? [altTitle(dexLang), mainTitle, altTitle("en")] : [mainTitle, altTitle(dexLang), altTitle("en")];
      const title = titles[dexLang] ?? candidates.find((candidate) => candidate != null) ?? "";
      return {
        url: `/manga/${manga.id}`,
        title: unescapeEntities(title),
        thumbnailUrl: fileName ? `${cdnUrl}/covers/${manga.id}/${fileName}${pref("thumbnailQuality", "")}` : void 0
      };
    }
    function fullManga(manga, volumes, firstCover) {
      const attributes = manga.attributes;
      const relationships = manga.relationships ?? [];
      const names = (type) => [...new Set(relationships.filter((r) => r.type === type).flatMap((r) => r.attributes?.name ?? []))];
      const tagIds = (attributes.tags ?? []).map((tag2) => [tag2.id, tag2.attributes?.group]);
      const genres = tagGroups.flatMap((group) => group.tags.filter((tag2) => tagIds.some(([id2, tagGroup]) => id2 === tag2.value && tagGroup === group.id)).map((tag2) => tag2.label).sort((a, b) => a.localeCompare(b)));
      const demographic = demographics[attributes.publicationDemographic ?? ""];
      if (demographic) genres.push(demographic);
      if (attributes.contentRating && attributes.contentRating !== "safe") {
        genres.push(`Content rating: ${attributes.contentRating.charAt(0).toUpperCase()}${attributes.contentRating.slice(1)}`);
      }
      const originalLanguage = attributes.originalLanguage ? languageName(attributes.originalLanguage, dexLang) : void 0;
      if (originalLanguage) genres.push(originalLanguage);
      const description = [];
      const descriptions = localized(attributes.description ?? []);
      const text = descriptions[dexLang] ?? descriptions.en;
      if (text) description.push(removeEntitiesAndMarkdown(text));
      if (pref("altTitlesInDesc", false)) {
        const romanized = romanizedLanguages[attributes.originalLanguage ?? ""] ?? "";
        const altTitles = (attributes.altTitles ?? []).map(localized).filter((title) => title[dexLang] != null || title[romanized] != null).flatMap((title) => Object.values(title).length === 1 ? Object.values(title) : []).filter((title) => title);
        if (altTitles.length > 0) description.push(unescapeEntities(`Alternative titles:
${altTitles.map((title) => `• ${title}`).join("\n")}`));
      }
      if (pref("finalChapterInDesc", true)) {
        const final = [attributes.lastVolume && `Vol.${attributes.lastVolume}`, attributes.lastChapter && `Ch.${attributes.lastChapter}`].filter(Boolean);
        if (final.length > 0) description.push(unescapeEntities(`Final chapter:
${final.join(" ")}`));
      }
      return {
        ...basicManga(manga, firstCover ?? coverFileName(manga)),
        author: names("author").join(", "),
        artist: names("artist").join(", "),
        description: description.join("\n\n"),
        genres,
        status: publicationStatus(attributes, volumes)
      };
    }
    return {
      info: {
        id,
        name: "MangaDex",
        lang,
        version: "1.0.1",
        baseUrl,
        supportsLatest: true,
        icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/mangadex/res/mipmap-xhdpi/ic_launcher.png",
        rateLimits: [{ host: "api.mangadex.org", permits: 3, periodMs: 1e3 }]
      },
      // Popular / Latest / Search
      /** The most followed titles created in the last 30 days, as on MangaDex's home page. */
      getPopularManga(page) {
        const startOfDay = Math.floor(Date.now() / 864e5) * 864e5;
        return mangasPage([
          ["order[followedCount]", "desc"],
          ["availableTranslatedLanguage[]", dexLang],
          ["limit", mangaLimit],
          ["offset", mangaLimit * (page - 1)],
          ["includes[]", "cover_art"],
          ...many("contentRating[]", contentRating()),
          ...originalLanguageParams(),
          ["createdAtSince", apiDate(startOfDay - 30 * 864e5)]
        ]);
      },
      getLatestUpdates(page) {
        return mangasFromChapters(page, []);
      },
      async searchManga(page, query, filterValues) {
        const chosen = filterValues.length > 0 ? filterValues : filters();
        query = query.trim();
        const link = /^https?:\/\/(?:[^/?#]*\.)?mangadex\.(?:org|dev)\/([^/?#]+)/i.exec(query);
        const linkPrefix = link ? linkPrefixes[link[1].toLowerCase()] : void 0;
        const linkId = uuidPattern.exec(query)?.[0];
        if (linkPrefix && linkId) query = linkPrefix + linkId;
        if (query.startsWith("ch:")) {
          const chapter = await api(`/chapter/${query.slice(3)}`);
          const mangaId = chapter.data.relationships?.find((r) => r.type === "manga")?.id;
          if (!mangaId) throw new Error("That chapter has no title.");
          query = `id:${mangaId}`;
        }
        if (query.startsWith("id:")) {
          const mangaId = query.slice(3);
          if (!uuidPattern.test(mangaId)) throw new Error("Not a valid manga ID");
          return mangasPage([["ids[]", mangaId], ["includes[]", "cover_art"], ...many("contentRating[]", safeRatings)]);
        }
        if (query.startsWith("usr:")) {
          return mangasFromChapters(page, [["uploader", query.slice(4)]]);
        }
        if (query.startsWith("list:")) {
          const list = await api(`/list/${query.slice(5)}`);
          const ids = (list.data.relationships ?? []).filter((r) => r.type === "manga").map((r) => r.id);
          if (ids.length === 0) throw new Error("No series in the list");
          const pageIds = ids.slice(mangaLimit * (page - 1), mangaLimit * page);
          if (pageIds.length === 0) return { mangas: [], hasNextPage: false };
          const result = await mangasPage([
            ["limit", mangaLimit],
            ["offset", 0],
            ["includes[]", "cover_art"],
            ...many("ids[]", pageIds),
            ...queryParams(chosen, dexLang)
          ]);
          return { mangas: result.mangas, hasNextPage: ids.length > mangaLimit * page };
        }
        const params = [["limit", mangaLimit], ["offset", mangaLimit * (page - 1)], ["includes[]", "cover_art"]];
        if (query.startsWith("grp:")) {
          const groupId = query.slice(4);
          if (!uuidPattern.test(groupId)) throw new Error("Not a valid group ID");
          params.push(["group", groupId]);
        } else if (query.startsWith("author:")) {
          const authorId = query.slice(7);
          if (!uuidPattern.test(authorId)) throw new Error("Not a valid author ID");
          params.push(["authorOrArtist", authorId]);
        } else if (query) {
          params.push(["title", query.replace(/\s/g, " ")]);
        }
        return mangasPage([...params, ...queryParams(chosen, dexLang)]);
      },
      // Details
      async getMangaDetails(manga) {
        const mangaId = uuidFrom(manga.url);
        const [details, volumes] = await Promise.all([
          api(`/manga/${mangaId}`, [["includes[]", "cover_art"], ["includes[]", "author"], ["includes[]", "artist"]]),
          // The chapters in this language, to tell a finished title from one whose last chapter is out.
          api(`/manga/${mangaId}/aggregate`, [["translatedLanguage[]", dexLang]]).then((a) => a.volumes ?? [], () => [])
        ]);
        refuseExplicit(details.data);
        const firstCover = (await firstVolumeCovers([details.data])).get(details.data.id);
        return fullManga(details.data, volumes, firstCover);
      },
      // Chapters
      async getChapterList(manga) {
        const mangaId = uuidFrom(manga.url);
        const feed = (offset) => collection(`/manga/${mangaId}/feed`, [
          ["includes[]", "scanlation_group"],
          ["includes[]", "user"],
          ["limit", 500],
          ["offset", offset],
          ["translatedLanguage[]", dexLang],
          ["order[volume]", "desc"],
          ["order[chapter]", "desc"],
          ["includeFuturePublishAt", "0"],
          ["includeEmptyPages", "0"],
          ...many("contentRating[]", safeRatings),
          ...many("excludedGroups[]", uuids("blockedGroups")),
          ...many("excludedUploaders[]", uuids("blockedUploader")),
          ["includeUnavailable", pref("includeUnavailable", false) ? "1" : "0"]
        ]);
        const first = await feed(0);
        if (first.total === 0) {
          refuseExplicit((await api(`/manga/${mangaId}`)).data);
        }
        const offsets = [];
        for (let offset = first.offset + (first.limit || 500); offset < first.total; offset += first.limit || 500) offsets.push(offset);
        const rest = await mapLimit(offsets, 3, feed);
        return [first, ...rest].flatMap((list) => list.data).filter((chapter) => !isInvalid(chapter.attributes)).map(toChapter);
      },
      // Pages
      async getPageList(chapter) {
        const chapterId = uuidFrom(chapter.url);
        const atHome = await api(
          `/at-home/server/${chapterId}`,
          pref("usePort443", false) ? [["forcePort443", "true"]] : []
        );
        const { hash, data, dataSaver } = atHome.chapter;
        return pref("dataSaverV5", false) ? dataSaver.map((file) => ({ url: `${atHome.baseUrl}/data-saver/${hash}/${file}` })) : data.map((file) => ({ url: `${atHome.baseUrl}/data/${hash}/${file}` }));
      },
      getFilterList() {
        return filters();
      }
    };
  }
  var index_default = languages.map(makeSource);
  var isUuid = (text) => new RegExp(`^${uuidPattern.source}$`).test(text);
  function uuidFrom(url) {
    if (!uuidPattern.test(url)) throw new Error("This entry uses an old MangaDex address. Migrate it from MangaDex to MangaDex to update it.");
    return url.slice(url.lastIndexOf("/") + 1);
  }
  function refuseExplicit(manga) {
    const rating = manga.attributes?.contentRating;
    if (rating && !safeRatings.includes(rating)) throw new Error(`MangaDex rates this title ${rating}, which this source doesn't show.`);
  }
  function localized(value) {
    return value && !Array.isArray(value) ? value : {};
  }
  function coverFileName(manga) {
    return manga.relationships?.find((r) => r.type === "cover_art")?.attributes?.fileName;
  }
  function publicationStatus(attributes, volumes) {
    const statuses = { ongoing: "ongoing", cancelled: "cancelled", completed: "publishingFinished", hiatus: "onHiatus" };
    const status = statuses[attributes.status ?? ""] ?? "unknown";
    const chapters = Object.values(volumes).flatMap((volume) => Object.values(volume.chapters ?? {}).map((chapter) => chapter.chapter));
    const tags = (attributes.tags ?? []).map((tag2) => tag2.id);
    const isOneShot = tags.includes(oneShotTag) && !tags.includes(anthologyTag);
    const noVolume = Array.isArray(volumes) ? void 0 : volumes.none;
    if ((status === "publishingFinished" || status === "cancelled") && attributes.lastChapter != null && chapters.includes(attributes.lastChapter)) return "completed";
    if (isOneShot && noVolume?.chapters && !Array.isArray(noVolume.chapters) && noVolume.chapters.none != null) return "completed";
    return status;
  }
  function isInvalid(attributes) {
    return attributes.externalUrl != null && (attributes.pages === 0 || attributes.pages === 1 && attributes.updatedAt !== attributes.readableAt);
  }
  function toChapter(chapter) {
    const attributes = chapter.attributes;
    const relationships = chapter.relationships ?? [];
    const groups = relationships.filter((r) => r.type === "scanlation_group" && r.id !== legacyNoGroupId).flatMap((r) => r.attributes?.name ?? []).join(" & ");
    const users = relationships.filter((r) => r.type === "user").flatMap((r) => r.attributes?.username ?? []);
    const scanlator = groups || (users.length > 0 ? `Uploaded by ${users.join(" & ")}` : "") || "No Group";
    const name = [];
    if (attributes.volume) name.push(`Vol.${attributes.volume}`);
    if (attributes.chapter) name.push(`Ch.${attributes.chapter}`);
    if (attributes.title) {
      if (name.length > 0) name.push("-");
      name.push(attributes.title);
    }
    if (name.length === 0) name.push("Oneshot");
    return {
      url: `/chapter/${chapter.id}`,
      name: unescapeEntities(name.join(" ")),
      dateUpload: parseDate(attributes.publishAt),
      scanlator: (attributes.isUnavailable ? "UNAVAILABLE - " : "") + scanlator
    };
  }
  function languageName(code, locale) {
    try {
      const name = new Intl.DisplayNames([locale, "en"], { type: "language" }).of(code);
      return name && name !== code ? name.charAt(0).toLocaleUpperCase(locale) + name.slice(1) : void 0;
    } catch {
      return void 0;
    }
  }
  function removeEntitiesAndMarkdown(text) {
    return unescapeEntities(text).split("\n---")[0].replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1").replace(/\*+\s*([^*]*)\s*\*+/g, "$1").replace(/_+\s*([^_]*)\s*_+/g, "$1").trim();
  }
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
