import Foundation

// Runs a built extension through the app's own JSRuntime (the Swift files beside this are links
// into the app) and prints what each call returns, checking the images download.
//
//   rakuen-test <dist> <source id | name | name/lang> [run | manga <url> [chapter url] | search <query> | filters]
//   rakuen-test <dist> list
//   rakuen-test visit <url> [seconds]      load a page in WebKit and list its localStorage
//   rakuen-test fetch <url> [Header: value…]   fetch through the app's HTTP client

let args = CommandLine.arguments
guard args.count >= 3 else {
    print("usage: rakuen-test <dist> <source id|name[/lang]> [run | manga <url> [chapter] | search <q> | filters | list]")
    exit(2)
}
if args[1] == "fetch" {
    var request = URLRequest(url: URL(string: args[2])!)
    for header in args.dropFirst(3) { let parts = header.split(separator: ":", maxSplits: 1); request.setValue(parts[1].trimmingCharacters(in: .whitespaces), forHTTPHeaderField: String(parts[0])) }
    do {
        let (data, response) = try await HTTPClient().response(for: request)
        let body = String(decoding: data, as: UTF8.self)
        print("HTTP \(response?.statusCode ?? 0) \(response?.value(forHTTPHeaderField: "Content-Type") ?? "") \(data.count) bytes")
        print(body.firstMatch(of: #/<title>[^<]*/#).map { String($0.output) } ?? String(body.prefix(300)))
        if let out = ProcessInfo.processInfo.environment["SAVE"] { try? data.write(to: URL(fileURLWithPath: out)) }
    } catch { print("error: \(error.localizedDescription)") }
    exit(0)
}
if args[1] == "clearstorage" {
    await clearStorage(URL(string: args[2])!)
    exit(0)
}
if args[1] == "visit" {
    await visit(URL(string: args[2])!, seconds: args.count > 3 ? Double(args[3])! : 10)
    exit(0)
}
let dist = URL(fileURLWithPath: args[1])
let indexURL = dist.appending(path: "index.json")
let index = try JSONDecoder().decode(RepoIndex.self, from: Data(contentsOf: indexURL))
let key = args[2].lowercased()
if key == "list" {
    for s in index.sources { print("\(s.id)\t\(s.lang)\t\(s.name)") }
    exit(0)
}
guard let manifest = index.sources.first(where: { $0.id == key || "\($0.name.lowercased())/\($0.lang.lowercased())" == key })
    ?? index.sources.first(where: { $0.name.lowercased() == key })
else { print("no source \(key)"); exit(2) }
let source = JSSource(manifest: manifest, scriptURL: dist.appending(path: manifest.file))!
let command = args.count > 3 ? args[3] : "run"
print("== \(manifest.name) (\(manifest.lang)) \(manifest.version) id \(manifest.id)")

var failures = 0
func step<T>(_ label: String, _ body: () async throws -> T) async -> T? {
    let start = Date()
    do {
        let value = try await body()
        print("✓ \(label) [\(String(format: "%.1fs", Date().timeIntervalSince(start)))]")
        return value
    } catch {
        failures += 1
        print("✗ \(label): \(error.localizedDescription)")
        return nil
    }
}

func show(_ page: MangasPage) {
    print("   \(page.mangas.count) manga, next page: \(page.hasNextPage)")
    for m in page.mangas.prefix(3) { print("   - \(m.title) | \(m.url) | \(m.thumbnailURL?.absoluteString ?? "no cover")") }
}

func checkImage(_ request: URLRequest, label: String) async {
    _ = await step(label) {
        let (data, response) = try await URLSession.shared.data(for: request)
        let http = response as! HTTPURLResponse
        let type = http.value(forHTTPHeaderField: "Content-Type") ?? "?"
        let magic = data.prefix(4).map { String(format: "%02x", $0) }.joined()
        let isImage = ["ffd8ff", "89504e47", "52494646", "47494638", "0000"].contains { magic.hasPrefix($0) }
        print("   HTTP \(http.statusCode) \(type) \(data.count) bytes magic \(magic)")
        if http.statusCode != 200 || !isImage { throw ExtensionError.result(source: manifest.name, function: "image", detail: "not an image") }
    }
}

func detailsAndChapters(_ manga: Manga, chapterURL: String?) async {
    if let details = await step("details \(manga.url)", { try await source.mangaDetails(manga) }) {
        print("   title: \(details.title)\n   author: \(details.author ?? "-") artist: \(details.artist ?? "-") status: \(details.status.label)")
        print("   genres: \(details.genres.prefix(8).joined(separator: ", "))")
        print("   cover: \(details.thumbnailURL?.absoluteString ?? "-")")
        print("   description: \((details.description ?? "-").prefix(120).replacingOccurrences(of: "\n", with: " ⏎ "))")
        if let cover = details.thumbnailURL { await checkImage(source.coverRequest(for: cover), label: "cover image") }
    }
    guard let chapters = await step("chapters", { try await source.chapterList(manga) }) else { return }
    print("   \(chapters.count) chapters")
    for c in chapters.prefix(3) { print("   - \(c.name) | \(c.url) | #\(c.chapterNumber.map { String($0) } ?? "-") | \(c.dateUpload.map { "\($0)" } ?? "no date") | \(c.scanlator ?? "")") }
    let chapter = chapterURL.flatMap { url in chapters.first { $0.url == url } ?? Chapter(url: url, name: "given") } ?? chapters.first
    guard let chapter else { return }
    if let pages = await step("pages \(chapter.url)", { try await source.pageList(chapter) }) {
        print("   \(pages.count) pages")
        for p in pages.prefix(2) { print("   - \(p.imageURL)") }
        if let first = pages.first { await checkImage(source.imageRequest(for: first), label: "page image") }
    }
}

switch command {
case "filters":
    for f in source.filterList() { print("   \(f.id): \(f.name) \(f.kind)".prefix(200)) }
case "search":
    let query = args.count > 4 ? args[4] : ""
    if let page = await step("search \"\(query)\"", { try await source.searchManga(page: 1, query: query, filters: source.filterList()) }) { show(page) }
case "manga":
    await detailsAndChapters(Manga(url: args[4], title: "?"), chapterURL: args.count > 5 ? args[5] : nil)
default:
    print("   \(source.filterList().count) filters")
    let popular = await step("popular p1", { try await source.popularManga(page: 1) })
    if let popular { show(popular) }
    if source.supportsLatest, let latest = await step("latest p1", { try await source.latestUpdates(page: 1) }) { show(latest) }
    if let page2 = await step("popular p2", { try await source.popularManga(page: 2) }) { print("   \(page2.mangas.count) manga, next page: \(page2.hasNextPage)") }
    if let manga = popular?.mangas.first {
        await detailsAndChapters(manga, chapterURL: nil)
    }
}
print(failures == 0 ? "PASS" : "FAIL (\(failures))")
exit(failures == 0 ? 0 : 1)
