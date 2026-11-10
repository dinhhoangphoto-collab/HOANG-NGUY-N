import Foundation
import AppKit

public final class ApplicationController {
    public static let shared = ApplicationController()
    private init() {}

    /// Detects the running CapCut Desktop instance via NSWorkspace (`com.lemon.lvoverseas` or `CapCut`).
    public func findCapCutApplication() -> NSRunningApplication? {
        let apps = NSWorkspace.shared.runningApplications
        return apps.first { app in
            let bundleMatch = app.bundleIdentifier == "com.lemon.lvoverseas" || app.bundleIdentifier == "com.lemon.lvpro"
            let nameMatch = app.localizedName?.localizedCaseInsensitiveContains("CapCut") == true
            return bundleMatch || nameMatch
        }
    }

    /// Brings CapCut Desktop to the foreground so GUI interactions target the real timeline.
    public func activateCapCut() -> Bool {
        guard let app = findCapCutApplication() else { return false }
        return app.activate(options: [.activateIgnoringOtherApps])
    }

    public func isCapCutFrontmost() -> Bool {
        guard let front = NSWorkspace.shared.frontmostApplication else { return false }
        return front.bundleIdentifier == "com.lemon.lvoverseas" ||
               front.localizedName?.localizedCaseInsensitiveContains("CapCut") == true
    }
}
