import Foundation
import WebKit

/// The app's silent Cloudflare solve, without the sheet for challenges that need a person:
/// load the page in WebKit with the app's User-Agent, wait for a new cf_clearance (or a page
/// that isn't a challenge), and copy WebKit's cookies to URLSession.
actor CloudflareCoordinator {
    static let shared = CloudflareCoordinator()

    func solve(_ url: URL) async throws {
        try await Task { @MainActor in try await Self.silentSolve(url) }.value
    }

    @MainActor private static func silentSolve(_ url: URL) async throws {
        guard let host = url.host() else { return }
        await CookieSync.copyToWebKit(for: url)
        let previous = await CookieSync.clearance(host: host)
        var configuration = WebPage.Configuration()
        configuration.websiteDataStore = .default()
        let page = WebPage(configuration: configuration)
        page.customUserAgent = UserAgent.current
        _ = page.load(URLRequest(url: url))
        defer { page.stopLoading() }
        let deadline = ContinuousClock.now + .seconds(20)
        while ContinuousClock.now < deadline {
            try await Task.sleep(for: .milliseconds(500))
            if let clearance = await CookieSync.clearance(host: host), clearance != previous { break }
            if !page.isLoading, page.url != nil,
               (try? await page.callJavaScript("return typeof window._cf_chl_opt !== 'undefined' || document.title === 'Just a moment...'") as? Bool) == false {
                break
            }
        }
        await CookieSync.copyToURLSession(host: host)
        print("   (Cloudflare: solved silently for \(host)? clearance \(await CookieSync.clearance(host: host) != nil))")
    }
}
