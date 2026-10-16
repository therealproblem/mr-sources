// Builds each extension in src/<lang>/<name>/index.ts into one script in dist/sources/, and
// writes the repository's dist/index.json from their `info`; dist-sfw/ gets the same for only
// the sources not marked nsfw. Publish either anywhere that serves static files (the GitHub
// workflow uses the "repo" and "repo-sfw" branches) and add its address in the app under
// Settings → Sources.

import { build } from "esbuild"
import { createHash } from "node:crypto"
import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import vm from "node:vm"

/**
 * The host API the app provides (`JSRuntime.apiVersion`). Each source is listed with the
 * oldest version it runs on, so older apps keep the sources that don't need what's new.
 */
const API_VERSION = 4

/** What each host API version added that a source can use, newest first. */
const apiAdditions = [
  [4, (source, code) => code.includes("#honya-tiles=")],
  [3, (source) => ["fetchFilterData", "getMangaUrl"].some((name) => typeof source[name] === "function")],
]
const BASE_API_VERSION = 2

function requiredApiVersion(source, code) {
  return apiAdditions.find(([, uses]) => uses(source, code))?.[0] ?? BASE_API_VERSION
}

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const dist = path.join(root, "dist")
const manifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))

await rm(dist, { recursive: true, force: true })
await mkdir(path.join(dist, "sources"), { recursive: true })

const sources = []
let failed = false

for (const lang of await directories(path.join(root, "src"))) {
  for (const name of await directories(path.join(root, "src", lang))) {
    const folder = path.join(root, "src", lang, name)
    const entry = path.join(folder, "index.ts")
    if (!(await exists(entry))) continue
    try {
      sources.push(...(await buildSource({ folder, entry, key: `${lang}.${name}` })))
    } catch (error) {
      failed = true
      console.error(`✗ ${lang}/${name}: ${error.message}`)
    }
  }
}

await writeFile(path.join(dist, "index.json"), JSON.stringify({ name: manifest.honya?.repoName ?? manifest.name, sources }, null, 2) + "\n")
console.log(`\n${sources.length} source${sources.length === 1 ? "" : "s"} → dist/index.json`)

// A second repository with only the sources not marked nsfw, published to its own branch.
const sfw = path.join(root, "dist-sfw")
await rm(sfw, { recursive: true, force: true })
const sfwSources = sources.filter((source) => !source.nsfw)
for (const file of new Set(sfwSources.flatMap((source) => [source.file, source.icon].filter((f) => f && !/^https?:/.test(f))))) {
  await mkdir(path.dirname(path.join(sfw, file)), { recursive: true })
  await copyFile(path.join(dist, file), path.join(sfw, file))
}
await writeFile(path.join(sfw, "index.json"), JSON.stringify({ name: manifest.honya?.sfwRepoName ?? `${manifest.honya?.repoName ?? manifest.name} (SFW)`, sources: sfwSources }, null, 2) + "\n")
console.log(`${sfwSources.length} source${sfwSources.length === 1 ? "" : "s"} → dist-sfw/index.json`)
if (failed) process.exit(1)

async function buildSource({ folder, entry, key }) {
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    format: "iife",
    globalName: "__extension",
    // The app calls the global `source`.
    footer: { js: "globalThis.source = __extension.default;" },
    target: "es2022",
    charset: "utf8",
    legalComments: "inline",
    write: false,
    logLevel: "silent",
  })
  const code = result.outputFiles[0].text
  const infos = readInfos(code, entry)
  if (infos.some((info) => info.apiVersion > API_VERSION)) throw new Error(`needs host API ${Math.max(...infos.map((info) => info.apiVersion))}; raise API_VERSION`)

  const file = `sources/${key}.js`
  await writeFile(path.join(dist, file), code)

  let localIcon
  if (await exists(path.join(folder, "icon.png"))) {
    await mkdir(path.join(dist, "icons"), { recursive: true })
    localIcon = `icons/${key}.png`
    await copyFile(path.join(folder, "icon.png"), path.join(dist, localIcon))
  }

  const sha256 = createHash("sha256").update(code).digest("hex")
  console.log(`✓ ${infos[0].name} ${infos[0].version} (${infos.map((info) => info.lang).join(", ")}) → ${file}`)
  // Every source an extension exports shares its script; the app keeps the one it installs.
  return infos.map((info) => ({ ...info, icon: info.icon ?? localIcon, file, sha256 }))
}

/**
 * Runs the bundle in a bare context, as the app would before calling it, and checks each
 * source's `info`. The default export is a source, or an array of them (one per language).
 */
function readInfos(code, entry) {
  const context = {
    Honya: new Proxy({}, { get: () => { throw new Error("uses Honya while loading; only call it from the source's functions") } }),
    console,
  }
  vm.runInNewContext(code, context, { filename: entry })
  const sources = Array.isArray(context.source) ? context.source : [context.source]
  if (sources.length === 0 || sources.some((source) => !source?.info)) throw new Error("no default export with `info`")
  const ids = sources.map((source) => String(source.info.id))
  if (new Set(ids).size !== ids.length) throw new Error("two sources share an id")
  const infos = sources.map((source) => checkSource(source))
  // getFilterList may read the source's settings: as on a fresh install, there are none.
  context.Honya = new Proxy({ prefs: { get: () => null, set() {} } }, {
    get: (target, key) => {
      if (key in target) return target[key]
      throw new Error(`getFilterList uses Honya.${String(key)}; it should only read prefs`)
    },
  })
  sources.forEach((source, index) => checkSortListings(source, infos[index]))
  return infos.map((info, index) => ({ ...info, apiVersion: requiredApiVersion(sources[index], code) }))
}

function checkSource(source) {
  const info = JSON.parse(JSON.stringify(source.info))

  for (const field of ["id", "name", "lang", "version", "baseUrl"]) {
    if (typeof info[field] !== "string" || !info[field]) throw new Error(`info.${field} must be a non-empty string`)
  }
  if (!/^\d+$/.test(info.id)) throw new Error(`info.id must be Mihon's source ID as a decimal string, not "${info.id}"`)
  for (const field of ["getPopularManga", "searchManga", "getMangaDetails", "getChapterList", "getPageList"]) {
    if (typeof source[field] !== "function") throw new Error(`${info.name}: source.${field} is missing`)
  }
  if (info.supportsLatest && typeof source.getLatestUpdates !== "function") {
    throw new Error("supportsLatest is true but source.getLatestUpdates is missing")
  }

  const mihonID = mihonSourceID(info.name, info.lang)
  if (info.id !== mihonID) {
    console.warn(`! ${info.name}: id ${info.id} isn't md5("${info.name.toLowerCase()}/${info.lang}/1") = ${mihonID}. ` +
      "That's right only if the Mihon extension overrides its id; otherwise Mihon backups won't find this source.")
  }
  return info
}

/**
 * The app merges its Popular and Latest into the source's sort, and needs the sort to say
 * which of its options give those lists, or it offers each list twice (3Hentai's "Recent"
 * beside Latest). Every source with a sort has to answer; `listings: {}` means none do.
 */
function checkSortListings(source, info) {
  if (typeof source.getFilterList !== "function") return
  const filters = source.getFilterList()
  const sort = sortFilter(filters)
  if (!sort) return
  const values = (sort.options ?? []).map((option) => option.value)
  if (!sort.listings) {
    throw new Error(`${info.name}: its sort "${sort.name}" must say which options give getPopularManga's and getLatestUpdates' lists, ` +
      `as listings: { popular, latest } with option values from ${values.map((v) => `"${v}"`).join(", ")}; listings: {} if none match`)
  }
  for (const listing of ["popular", "latest"]) {
    const value = sort.listings[listing]
    if (value === undefined) continue
    if (!values.includes(value)) throw new Error(`${info.name}: listings.${listing} "${value}" isn't one of "${sort.name}"'s option values (${values.map((v) => `"${v}"`).join(", ")})`)
  }
  if (sort.listings.latest !== undefined && !info.supportsLatest) throw new Error(`${info.name}: listings.latest is set but supportsLatest isn't`)
  if (sort.listings.popular !== undefined && sort.listings.popular === sort.listings.latest) throw new Error(`${info.name}: listings.popular and listings.latest are the same option`)
}

/** The filter the app takes for the source's sort (`sortIndex` in the app's BrowseModel.swift). */
function sortFilter(filters) {
  return filters.find((filter) => filter.listings)
    ?? filters.find((filter) => filter.type === "sort")
    ?? filters.find((filter) => filter.type === "select" && /sort|order/i.test(filter.name ?? ""))
}

/** Mihon's source ID: the first 8 bytes of MD5("<name lowercased>/<lang>/<versionId>"), sign bit cleared. */
function mihonSourceID(name, lang, versionID = 1) {
  const digest = createHash("md5").update(`${name.toLowerCase()}/${lang}/${versionID}`).digest()
  return (digest.readBigUInt64BE(0) & 0x7fffffffffffffffn).toString()
}

async function directories(folder) {
  const entries = await readdir(folder, { withFileTypes: true }).catch(() => [])
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort()
}

async function exists(file) {
  return stat(file).then(() => true, () => false)
}
