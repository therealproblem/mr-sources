import Foundation
import WebKit

/// Loads a page in WebKit's default data store, as the app's web view would, then lists
/// what the site left in localStorage.
@MainActor func visit(_ url: URL, seconds: Double) async {
    var configuration = WebPage.Configuration()
    configuration.websiteDataStore = .default()
    let page = WebPage(configuration: configuration)
    page.customUserAgent = UserAgent.current
    _ = page.load(URLRequest(url: url))
    try? await Task.sleep(for: .seconds(seconds))
    let keys = try? await page.callJavaScript("return Object.keys(localStorage).map(k => k + '=' + String(localStorage.getItem(k)).slice(0, 40))")
    print("title: \(page.title)\nlocalStorage: \(keys ?? "-")")
}

@MainActor func clearStorage(_ url: URL) async {
    var configuration = WebPage.Configuration()
    configuration.websiteDataStore = .default()
    let page = WebPage(configuration: configuration)
    do {
        for try await _ in page.load(html: "", baseURL: url) {}
        _ = try await page.callJavaScript("localStorage.clear(); return Object.keys(localStorage).length")
        print("cleared")
    } catch { print("failed: \(error)") }
}
