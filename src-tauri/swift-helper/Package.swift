// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "LaLaMacOSHelper",
    platforms: [
        .macOS(.v12)
    ],
    products: [
        .executable(
            name: "lala-macos-helper",
            targets: ["LaLaMacOSHelper"]
        )
    ],
    targets: [
        .executableTarget(
            name: "LaLaMacOSHelper",
            path: "Sources/LaLaMacOSHelper",
            linkerSettings: [
                .linkedFramework("ApplicationServices"),
                .linkedFramework("ScreenCaptureKit"),
                .linkedFramework("Vision"),
                .linkedFramework("CoreGraphics"),
                .linkedFramework("AppKit")
            ]
        )
    ]
)
