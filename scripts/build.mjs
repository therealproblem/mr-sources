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

/** The host API these scripts are written against: `JSRuntime.apiVersion` in the app. */
const API_VERSION = 2

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

await writeFile(path.join(dist, "index.json"), JSON.stringify({ name: manifest.yomu?.repoName ?? manifest.name, sources }, null, 2) + "\n")
console.log(`\n${sources.length} source${sources.length === 1 ? "" : "s"} → dist/index.json`)

// A second repository with only the sources not marked nsfw, published to its own branch.
const sfw = path.join(root, "dist-sfw")
await rm(sfw, { recursive: true, force: true })
const sfwSources = sources.filter((source) => !source.nsfw)
for (const file of new Set(sfwSources.flatMap((source) => [source.file, source.icon].filter((f) => f && !/^https?:/.test(f))))) {
  await mkdir(path.dirname(path.join(sfw, file)), { recursive: true })
  await copyFile(path.join(dist, file), path.join(sfw, file))
}
await writeFile(path.join(sfw, "index.json"), JSON.stringify({ name: manifest.yomu?.sfwRepoName ?? `${manifest.yomu?.repoName ?? manifest.name} (SFW)`, sources: sfwSources }, null, 2) + "\n")
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
  return infos.map((info) => ({ ...info, icon: info.icon ?? localIcon, apiVersion: API_VERSION, file, sha256 }))
}

/**
 * Runs the bundle in a bare context, as the app would before calling it, and checks each
 * source's `info`. The default export is a source, or an array of them (one per language).
 */
function readInfos(code, entry) {
  const context = {
    Yomu: new Proxy({}, { get: () => { throw new Error("uses Yomu while loading; only call it from the source's functions") } }),
    console,
  }
  vm.runInNewContext(code, context, { filename: entry })
  const sources = Array.isArray(context.source) ? context.source : [context.source]
  if (sources.length === 0 || sources.some((source) => !source?.info)) throw new Error("no default export with `info`")
  const ids = sources.map((source) => String(source.info.id))
  if (new Set(ids).size !== ids.length) throw new Error("two sources share an id")
  return sources.map((source) => checkSource(source))
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
