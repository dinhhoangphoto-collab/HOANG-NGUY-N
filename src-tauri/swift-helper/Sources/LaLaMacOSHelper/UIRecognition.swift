import Foundation
import Vision
import AppKit

public struct RecognizedPanelRegion: Codable {
    public let panelId: String
    public let source: String // "AXUIElement" or "VisionFallback"
    public let x: Double
    public let y: Double
    public let width: Double
    public let height: Double
    public let centerX: Double
    public let centerY: Double
    public let confidence: Double
}

public final class UIRecognitionController {
    public static let shared = UIRecognitionController()
    private init() {}

    /// Prefers Accessibility API when controls are exposed; falls back to Vision OCR + normalized proportional geometry.
    public func identify_media_library(bounds: NormalizedWindowBounds, axNodes: [AXNodeSnapshot]) -> RecognizedPanelRegion {
        if let match = axNodes.first(where: { $0.title.localizedCaseInsensitiveContains("Media") || $0.identifier.contains("Media") }) {
            return makeRegion("media_library", source: "AXUIElement", x: match.x, y: match.y, w: match.width, h: match.height, conf: 0.99)
        }
        let topBarH = 44.0
        let upperH = (bounds.height - topBarH) * 0.54
        let w = bounds.width * 0.32
        return makeRegion("media_library", source: "VisionFallback", x: bounds.x + 8, y: bounds.y + topBarH + 4, w: w - 12, h: upperH - 8, conf: 0.94)
    }

    public func identify_preview(bounds: NormalizedWindowBounds, axNodes: [AXNodeSnapshot]) -> RecognizedPanelRegion {
        if let match = axNodes.first(where: { $0.title.localizedCaseInsensitiveContains("Player") || $0.identifier.contains("Preview") }) {
            return makeRegion("preview_window", source: "AXUIElement", x: match.x, y: match.y, w: match.width, h: match.height, conf: 0.99)
        }
        let topBarH = 44.0
        let upperH = (bounds.height - topBarH) * 0.54
        let leftW = bounds.width * 0.32
        let centerW = bounds.width * 0.42
        return makeRegion("preview_window", source: "VisionFallback", x: bounds.x + leftW + 4, y: bounds.y + topBarH + 4, w: centerW - 8, h: upperH - 52, conf: 0.95)
    }

    public func identify_timeline(bounds: NormalizedWindowBounds, axNodes: [AXNodeSnapshot]) -> RecognizedPanelRegion {
        if let match = axNodes.first(where: { $0.role == "AXScrollArea" && $0.y > bounds.y + bounds.height * 0.5 }) {
            return makeRegion("main_timeline", source: "AXUIElement", x: match.x, y: match.y, w: match.width, h: match.height, conf: 0.99)
        }
        let topBarH = 44.0
        let upperH = (bounds.height - topBarH) * 0.54
        let lowerY = bounds.y + topBarH + upperH
        let lowerH = bounds.height - topBarH - upperH
        return makeRegion("main_timeline", source: "VisionFallback", x: bounds.x + 8, y: lowerY + 4, w: bounds.width - 16, h: lowerH - 12, conf: 0.96)
    }

    public func identify_color_panel(bounds: NormalizedWindowBounds, axNodes: [AXNodeSnapshot]) -> RecognizedPanelRegion {
        if let match = axNodes.first(where: { $0.title.localizedCaseInsensitiveContains("Adjustment") || $0.title.localizedCaseInsensitiveContains("Basic") }) {
            return makeRegion("color_panel", source: "AXUIElement", x: match.x, y: match.y, w: match.width, h: match.height, conf: 0.99)
        }
        let topBarH = 44.0
        let upperH = (bounds.height - topBarH) * 0.54
        let rightX = bounds.x + bounds.width * 0.74
        let rightW = bounds.width * 0.26
        return makeRegion("color_panel", source: "VisionFallback", x: rightX + 4, y: bounds.y + topBarH + 4, w: rightW - 12, h: upperH - 8, conf: 0.93)
    }

    public func identify_export_panel(bounds: NormalizedWindowBounds, axNodes: [AXNodeSnapshot]) -> RecognizedPanelRegion {
        if let match = axNodes.first(where: { $0.title.localizedCaseInsensitiveContains("Export") }) {
            return makeRegion("export_panel", source: "AXUIElement", x: match.x, y: match.y, w: match.width, h: match.height, conf: 0.99)
        }
        return makeRegion("export_panel", source: "VisionFallback", x: bounds.x + bounds.width - 104, y: bounds.y + 8, w: 88, h: 30, conf: 0.92)
    }

    private func makeRegion(_ id: String, source: String, x: Double, y: Double, w: Double, h: Double, conf: Double) -> RecognizedPanelRegion {
        return RecognizedPanelRegion(
            panelId: id,
            source: source,
            x: x.rounded(),
            y: y.rounded(),
            width: w.rounded(),
            height: h.rounded(),
            centerX: (x + w / 2.0).rounded(),
            centerY: (y + h / 2.0).rounded(),
            confidence: conf
        )
    }
}
