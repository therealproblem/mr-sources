// Serves dist/ so the app can install extensions straight from this computer while you work
// on them. Add the address it prints under Settings → Sources; run `npm run build` again and
// pull to refresh there to get changes (bump `version` to be offered the update).

import { createServer } from "node:http"
import { readFile } from "node:fs/promises"
import { networkInterfaces } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const dist = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), "dist")
const port = Number(process.env.PORT ?? 8642)
const types = { ".json": "application/json", ".js": "text/javascript; charset=utf-8", ".png": "image/png" }

createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname)
  const file = path.join(dist, pathname === "/" ? "index.json" : pathname)
  if (!file.startsWith(dist + path.sep)) {
    response.writeHead(403).end()
  } else {
    try {
      const body = await readFile(file)
      response.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream", "cache-control": "no-store" })
      response.end(body)
    } catch {
      response.writeHead(404).end()
    }
  }
  console.log(`${response.statusCode} ${request.url}`)
}).listen(port, () => {
  console.log(`Serving dist/. Add one of these as a repository in the app:`)
  console.log(`  http://localhost:${port}   (the Simulator)`)
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal) console.log(`  http://${address.address}:${port}   (a device on this network)`)
    }
  }
})
