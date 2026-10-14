# Honya sources

Honya comes with no sources. Users add **repositories** under Settings → Sources and install sources from them. A source is a small TypeScript extension, bundled to one JavaScript file that the app runs in JavaScriptCore. A repository is a folder of those files plus an `index.json` that lists them. Anyone can host one for free, for example on GitHub Pages or in a GitHub branch.

This folder holds the SDK, a build script, and Weeb Central as the example source.

## Quick start

```sh
npm install
npm run dev        # type-check, build to dist/, and serve dist/ on port 8642
```

In the app, open Settings → Sources → Add Repository and enter `http://localhost:8642` (in the Simulator), or the network address `npm run serve` prints (on a device). Then tap **Get** next to the source.

To try a change, rebuild, bump `version` in the source's `info`, then pull to refresh the Sources screen and tap **Update**.

## Writing a source

Create `src/<lang>/<name>/index.ts` and default-export a `Source` (see [`sdk/types.ts`](sdk/types.ts)). [`src/en/weebcentral`](src/en/weebcentral) is a complete example, ported line for line from the Keiyoushi Kotlin extension.

```ts
import { fetchHTML, relativeUrl, type Source } from "../../../sdk"

const source: Source = {
  info: {
    id: "2131019126180322627",          // Mihon's ID; see below
    name: "Weeb Central",
    lang: "en",
    version: "1.0.0",
    baseUrl: "https://weebcentral.com",
    supportsLatest: true,
    rateLimits: [{ host: "weebcentral.com", permits: 1, periodMs: 2000 }],
  },
  async getPopularManga(page) { /* … */ },
  async getLatestUpdates(page) { /* … */ },
  async searchManga(page, query, filters) { /* … */ },
  async getMangaDetails(manga) { /* … */ },
  async getChapterList(manga) { /* newest first */ },
  async getPageList(chapter) { /* [{ url }] */ },
  getFilterList() { /* optional, synchronous */ },
}
export default source
```

The functions mirror Mihon's `HttpSource`. Porting a Keiyoushi extension usually means rewriting each `*Request`/`*Parse` pair as one async function. Jsoup selectors work unchanged, because the app parses HTML with SwiftSoup (a Jsoup port).

### Several sources in one extension

Like Mihon's `SourceFactory`, an extension can default-export an **array** of sources, typically one per language, each with its own Mihon `id`. The build lists each in `index.json` and they share one script. See `src/all/mangafire` or `src/all/hdoujin`.

### Themes

Sites built on the same engine share a theme in [`themes/`](themes), as Keiyoushi's `lib-multisrc` does: `galleryadults`, `madara` (the no-AJAX subset), `masonry` and `kemono`. A site is then a few lines of options; see `src/all/imhentai`.

### What a source can use

Sources run in JavaScriptCore, not a browser or Node. There's no `fetch`, DOM, `URL`, `setTimeout` or `atob`. The app provides the `Honya` global and `console` (see [`sdk/host.d.ts`](sdk/host.d.ts)):

| | |
|---|---|
| `Honya.request({ url, method, headers, body })` | Goes through the app's HTTP client, so it gets the app's User-Agent and cookies, your `rateLimits` and Cloudflare handling. Every status resolves. |
| `Honya.parseHTML(html, baseUrl?)` | Native HTML parsing with Jsoup's API: `select`, `selectFirst`, `text`, `attr("abs:href")`, `parent`, `children`. |
| `Honya.prefs.get/set` | The source's own settings. A Mihon backup restores its source's settings here. |
| `Honya.localStorage(url, key)` | What the site keeps in the web view's `localStorage` (Mihon's `getLocalStorage`), for tokens sites hand out there. |
| `Honya.loadInWebView(url, { waitForLocalStorage })` | Opens a page in a hidden web view so its scripts can issue a token; resolves with that `localStorage` value. |
| `Honya.sleep(ms)` | Waits; there's no `setTimeout`. |
| `console.log/warn/error` | The app's log (Console.app, category "Extension <name>"). |

[`sdk/helpers.ts`](sdk/helpers.ts) adds `fetchHTML`, `fetchPage`, `fetchJSON`, `fetchText` (all throw on HTTP errors), `relativeUrl` (Mihon's `setUrlWithoutDomain`, percent-decoded like Mihon stores URLs), `queryString`, `formBody`, `imgAttr`, `mapLimit`, base64 and UTF-8 helpers, and date parsing. Helpers are bundled into each source that uses them.

`info.imageHeaders` apply to page images and covers; a header set to `""` is left out (some image hosts refuse a Referer).

What the app can't do yet, so ports work around it:
- **Lazy page images.** Mihon resolves some pages' images only when they're shown (`getImageUrl`). Ports resolve them in `getPageList`, a few at a time with `mapLimit`.
- **Image interceptors.** Fallbacks done per image in OkHttp (Kemono's thumbnail fallback) are decided once in `getPageList` instead.
- **Filters fetched from the site** (`fetchFilterData`). Ports keep the built-in filters only.

### Keep Mihon's IDs and URLs

People switching from Mihon restore their backups into Honya. Each library entry in a backup stores its **source ID** and the manga's **relative URL**. A restored entry finds your source automatically only if:

1. **`info.id` is Mihon's ID for the same source**, as a string (a JavaScript number can't hold 63 bits). Mihon computes it as the first 8 bytes of `md5("<name lowercased>/<lang>/1")`, and `npm run build` warns when `id` doesn't match that. Some Kotlin extensions override `id` after a rename; in that case copy the overridden value. A source that replaces several Mihon sources lists the others in `info.aliases`.
2. **`Manga.url` and `Chapter.url` are exactly what the Kotlin extension stores** (usually the path without the domain). If they differ, restored entries resolve to your source but their pages won't load.

### Filters

`getFilterList()` returns Mihon's filter kinds as plain data: `header`, `separator`, `text`, `select`, `checkboxes`, `tristates` and `sort`. The app shows them, and `searchManga` receives the same list with the user's choices. See `src/en/weebcentral/filters.ts`.

## Testing

`npm test -- "<source name>"` (or a source ID, or `name/lang`) runs a built source through the app's own JavaScript runtime on your Mac, with `tester/`: popular, latest, details, chapters and pages, and checks that a cover and a page image download. `npm test -- "<source name>" manga <url> [<chapter url>]` checks a particular entry, such as one from a Mihon backup. It needs Xcode, and links to the app's Swift files, so it works in this repository.

## Publishing a repository

`npm run build` writes `dist/`:

```
dist/index.json              { name, sources: [{ ...info, apiVersion, file, sha256 }] }
dist/sources/<lang>.<name>.js
dist/icons/<lang>.<name>.png  (from an icon.png beside index.ts, if info.icon isn't set)
```

Host `dist/` anywhere that serves static files. Users can add any of these:

- the address of the folder that holds `index.json`, or the `index.json` URL itself
- a GitHub repository link (`https://github.com/<you>/<repo>`). The app reads `index.json` from the repository's `repo` branch, then from its default branch. `/tree/<branch>/<path>` links work too.

[`.github/workflows/publish.yml`](.github/workflows/publish.yml) builds on every push to `main` and force-pushes `dist/` to the `repo` branch. Put this folder at the root of its own repository to use it.

The build also writes `dist-sfw/`: the same, but only the sources whose `info.nsfw` isn't true. The workflow publishes it to the `repo-sfw` branch, which users add as `https://github.com/<you>/<repo>/tree/repo-sfw`. Set `nsfw: true` on any source that can show adult content, or it will appear there.

The app checks each download against `sha256` and loads the script once before installing it. It won't offer a source whose `apiVersion` is newer than the version it supports (currently 1).

## Versions

- **Source `version`**: bump it for every release. The app compares versions numerically ("1.10.0" > "1.9.2") to offer updates.
- **Host API version** (`apiVersion`): the version of what the `Honya` global provides. It's set in `scripts/build.mjs` and must match `JSRuntime.apiVersion` in the app. Raise it only when the host API gains something.
