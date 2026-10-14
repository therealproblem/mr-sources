// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "honya-test",
    platforms: [.macOS("26.0")],
    dependencies: [.package(url: "https://github.com/scinfu/SwiftSoup", from: "2.7.0")],
    targets: [
        .executableTarget(
            name: "honya-test",
            dependencies: ["SwiftSoup"],
            swiftSettings: [.swiftLanguageMode(.v5), .defaultIsolation(MainActor.self)]
        ),
    ]
)
