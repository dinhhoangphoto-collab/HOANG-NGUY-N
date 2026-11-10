import Foundation
import CoreGraphics
import AppKit
import ScreenCaptureKit

public struct NormalizedWindowBounds: Codable {
    public let windowId: UInt32
    public let pid: Int32
    public let x: Double
    public let y: Double
    public let width: Double
    public let height: Double
    public let backingScaleFactor: Double
}

public final class ScreenCaptureController {
    public static let shared = ScreenCaptureController()
    private init() {}

    /// Identifies the active CapCut Desktop window (`com.lemon.lvoverseas`) and normalizes coordinates
    /// using actual window bounds, display backingScaleFactor, and screen coordinates.
    public func get_active_window() -> NormalizedWindowBounds? {
        let options: CGWindowListOption = [.optionOnScreenOnly, .excludeDesktopElements]
        guard let windowList = CGWindowListCopyWindowInfo(options, kCGNullWindowID) as? [[String: Any]] else {
            return nil
        }

        let scale = NSScreen.main?.backingScaleFactor ?? 2.0
        for entry in windowList {
            guard let ownerName = entry[kCGWindowOwnerName as String] as? String,
                  ownerName.localizedCaseInsensitiveContains("CapCut"),
                  let windowId = entry[kCGWindowNumber as String] as? UInt32,
                  let pid = entry[kCGWindowOwnerPID as String] as? Int32,
                  let boundsDict = entry[kCGWindowBounds as String] as? [String: CGFloat] else {
                continue
            }

            let width = Double(boundsDict["Width"] ?? 0)
            let height = Double(boundsDict["Height"] ?? 0)
            if width < 400 || height < 300 { continue }

            return NormalizedWindowBounds(
                windowId: windowId,
                pid: pid,
                x: Double(boundsDict["X"] ?? 0),
                y: Double(boundsDict["Y"] ?? 0),
                width: width,
                height: height,
                backingScaleFactor: Double(scale)
            )
        }
        return nil
    }

    /// Captures the CapCut Desktop window using CoreGraphics / ScreenCaptureKit without stealing focus.
    public func capture_capcut_window(outputPath: String) -> (success: Bool, bounds: NormalizedWindowBounds?) {
        guard let bounds = get_active_window() else {
            return (false, nil)
        }

        let rect = CGRect(x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height)
        guard let cgImage = CGWindowListCreateImage(
            rect,
            .optionIncludingWindow,
            CGWindowID(bounds.windowId),
            [.boundsIgnoreFraming, .bestResolution]
        ) else {
            return (false, bounds)
        }

        let bitmapRep = NSBitmapImageRep(cgImage: cgImage)
        guard let pngData = bitmapRep.representation(using: .png, properties: [:]) else {
            return (false, bounds)
        }

        do {
            try pngData.write(to: URL(fileURLWithPath: outputPath), options: .atomic)
            return (true, bounds)
        } catch {
            return (false, bounds)
        }
    }
}
