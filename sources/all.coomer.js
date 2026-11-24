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

  // src/all/coomer/index.ts
  var index_exports = {};
  __export(index_exports, {
    default: () => index_default
  });

  // themes/kemono.ts
  var creatorsPerPage = 50;
  var postsPerPage = 50;
  var prompt = "You can change how many posts to load in the extension's settings.";
  var apiHeaders = { Accept: "text/css" };
  var serviceName = (service) => ({ fanbox: "Pixiv Fanbox", subscribestar: "SubscribeStar", dlsite: "DLsite", onlyfans: "OnlyFans" })[service] ?? service.charAt(0).toUpperCase() + service.slice(1);
  var updatedDate = (creator) => typeof creator.updated === "string" ? Date.parse(`${creator.updated}Z`) || 0 : creator.updated * 1e3;
  function images(post) {
    const files = [...post.file.path ? [{ name: post.file.name, path: post.file.path }] : [], ...post.attachments];
    const seen = /* @__PURE__ */ new Set();
    return files.filter((f) => /\.(png|jpe?g|gif|webp)$/i.test(f.path) && !seen.has(f.path) && seen.add(f.path)).map((f) => f.path + (f.name != null ? `?f=${encodeURIComponent(f.name)}` : ""));
  }
  var pad = (n) => String(n).padStart(2, "0");
  function toChapter(post, offsetHours) {
    const raw = post.edited ?? post.published ?? post.added;
    const date = raw ? Date.parse(`${raw}Z`) - offsetHours * 36e5 : NaN;
    let name = post.title;
    if (!name.trim()) {
      const d = new Date(date);
      name = `Post from ${Number.isNaN(date) ? "unknown date" : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} at ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`}`;
    }
    return { url: `/${post.service}/user/${post.user}/post/${post.id}`, dateUpload: Number.isNaN(date) ? void 0 : date, name, chapterNumber: -2 };
  }
  function kemono(info, types) {
    const baseUrl = info.baseUrl;
    const api = `${baseUrl}/api/v1`;
    const imgCdnUrl = baseUrl.replace("//", "//img.");
    let fileServersUnreachable = false;
    let creators;
    async function allCreators() {
      if (!creators || Date.now() - creators.at > 30 * 6e4) {
        const response = await getWithRetry(`${api}/creators`);
        creators = { list: JSON.parse(response).filter((c) => c.service.toLowerCase() !== "discord"), at: Date.now() };
      }
      return creators.list;
    }
    async function getWithRetry(url) {
      let status = 0;
      for (let attempt = 0; attempt < 5; attempt++) {
        const response = await Honya.request({ url, headers: apiHeaders });
        if (response.status >= 200 && response.status < 300) return response.body;
        status = response.status;
        if (status === 429) await Honya.sleep(1e4);
      }
      throw new Error(`HTTP error ${status}`);
    }
    const toManga = (c) => ({
      url: `/${c.service}/user/${c.id}`,
      title: c.name,
      author: serviceName(c.service),
      thumbnailUrl: `${imgCdnUrl}/icons/${c.service}/${c.id}`,
      description: prompt
    });
    async function search(page, title = "", filters = [], sortBy = ["", ""]) {
      let sort = sortBy;
      const included = [];
      const excluded = [];
      let favoritesOnly;
      for (const filter of filters) {
        if (filter.type === "sort") sort = [filter.options[filter.selected ?? 0].value, filter.ascending ? "asc" : "desc"];
        if (filter.type === "tristates" && filter.id === "types") {
          included.push(...filter.included);
          excluded.push(...filter.excluded);
        }
        if (filter.type === "tristates" && filter.id === "favorites") favoritesOnly = filter.included.length ? true : filter.excluded.length ? false : void 0;
      }
      let favorites = [];
      if (favoritesOnly != null) {
        const response = await Honya.request({ url: `${api}/account/favorites`, headers: apiHeaders });
        if (response.status < 200 || response.status > 299) {
          throw new Error(`Failed to fetch favorites: ${response.status === 401 ? "You are not logged in (log in through the web view)" : `HTTP error ${response.status}`}`);
        }
        favorites = JSON.parse(response.body).filter((f) => f.service.toLowerCase() !== "discord");
      }
      const favedSeq = new Map(favorites.map((f) => [f.id, f.faved_seq]));
      const matches = (await allCreators()).filter((c) => {
        const type = serviceName(c.service).toLowerCase();
        return (included.length === 0 || included.includes(type)) && !excluded.includes(type) && c.name.toLowerCase().includes(title.toLowerCase()) && (favoritesOnly == null || favedSeq.has(c.id) === favoritesOnly);
      });
      const direction = sort[1] === "desc" ? -1 : 1;
      const key = (() => {
        switch (sort[0]) {
          case "pop":
            return (c) => c.favorited ?? -1;
          case "tit":
            return (c) => c.name;
          case "new":
            return (c) => c.id;
          case "fav":
            if (favoritesOnly !== true) throw new Error("Please check the 'Favorites Only' filter");
            return (c) => favedSeq.get(c.id) ?? 0;
          default:
            return updatedDate;
        }
      })();
      const sorted = [...matches].sort((a, b) => {
        const x = key(a), y = key(b);
        return (x < y ? -1 : x > y ? 1 : 0) * direction;
      });
      const from = (page - 1) * creatorsPerPage;
      const to = Math.min(sorted.length, from + creatorsPerPage);
      return { mangas: sorted.slice(from, to).map(toManga), hasNextPage: to !== sorted.length };
    }
    return {
      info: { ...info, supportsLatest: true, rateLimits: info.rateLimits ?? [{ host: baseUrl.replace(/^https?:\/\//, ""), permits: 1, periodMs: 1e3 }] },
      getPopularManga(page) {
        return search(page, "", [], ["pop", "desc"]);
      },
      getLatestUpdates(page) {
        return search(page, "", [], ["lat", "desc"]);
      },
      searchManga(page, query, filters) {
        return search(page, query, filters.length ? filters : this.getFilterList());
      },
      async getMangaDetails(manga) {
        const thumbnail = manga.thumbnailUrl?.replace(/^https:\/\//, "").replace(/^[^/]*/, imgCdnUrl);
        return { thumbnailUrl: thumbnail ?? `${imgCdnUrl}/icons${manga.url.replace("/user", "")}` };
      },
      async getChapterList(manga) {
        const offsetHours = manga.author === "Pixiv Fanbox" || manga.author === "Fantia" ? 9 : 0;
        const maxPosts = Math.min(Number(Honya.prefs.get("POST_PAGES") ?? "1") || 1, 75) * postsPerPage;
        const chapters = [];
        for (let offset = 0; offset < maxPosts; offset += postsPerPage) {
          const posts = JSON.parse(await getWithRetry(`${api}${manga.url}/posts?o=${offset}`));
          for (const post of posts) if (images(post).length) chapters.push(toChapter(post, offsetHours));
          if (posts.length !== postsPerPage) break;
        }
        return chapters;
      },
      async getPageList(chapter) {
        const { post } = JSON.parse(await getWithRetry(`${api}${chapter.url}`));
        const paths = images(post);
        if (!fileServersUnreachable && paths.length > 0 && Honya.prefs.get("USE_LOW_RES_IMG") !== true) {
          const probe = await Honya.request({ url: `${baseUrl}/data${paths[0]}`, method: "HEAD", timeoutMs: 8e3 }).catch(() => void 0);
          if (!probe || probe.status >= 400) fileServersUnreachable = true;
        }
        const lowRes = fileServersUnreachable || Honya.prefs.get("USE_LOW_RES_IMG") === true;
        return paths.map((path) => ({ url: `${baseUrl}/${lowRes ? "thumbnail/data" : "data"}${path}` }));
      },
      getFilterList() {
        const sorts = [["Popularity", "pop"], ["Date Indexed", "new"], ["Date Updated", "lat"], ["Alphabetical Order", "tit"], ["Service", "serv"], ["Date Favorited", "fav"]];
        return [
          { type: "sort", id: "sort", name: "Sort by", options: sorts.map(([label, value]) => ({ label, value })), selected: 0, ascending: false, listings: { popular: "pop", latest: "lat" } },
          { type: "tristates", id: "types", name: "Types", options: types.map((t) => ({ label: t, value: t.toLowerCase() })), included: [], excluded: [] },
          { type: "tristates", id: "favorites", name: "Favorites", options: [{ label: "Favorites Only", value: "fav" }], included: [], excluded: [] }
        ];
      }
    };
  }

  // src/all/coomer/index.ts
  var index_default = kemono({
    id: "8715899195746116471",
    name: "Coomer",
    lang: "all",
    version: "1.0.2",
    baseUrl: "https://coomer.st",
    nsfw: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/coomer/res/mipmap-xhdpi/ic_launcher.png"
  }, ["OnlyFans", "Fansly", "CandFans"]);
  return __toCommonJS(index_exports);
})();
globalThis.source = __extension.default;
