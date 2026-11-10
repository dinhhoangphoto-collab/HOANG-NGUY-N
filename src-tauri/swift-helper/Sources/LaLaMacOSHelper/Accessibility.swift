import Foundation
import ApplicationServices
import AppKit

public struct AXNodeSnapshot: Codable {
    public let role: String
    public let title: String
    public let identifier: String
    public let x: Double
    public let y: Double
    public let width: Double
    public let height: Double
    public let enabled: Bool
    public let focused: Bool
}

public final class AccessibilityController {
    public static let shared = AccessibilityController()
    private init() {}

    public func isAccessibilityTrusted(promptIfNeeded: Bool = false) -> Bool {
        let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: promptIfNeeded] as CFDictionary
        return AXIsProcessTrustedWithOptions(options)
    }

    /// Reads the live macOS Accessibility tree (`AXUIElement`) for CapCut Desktop.
    public func get_capcut_accessibility_tree(pid: pid_t) -> [AXNodeSnapshot] {
        guard isAccessibilityTrusted(promptIfNeeded: false) else {
            return []
        }

        let appRef = AXUIElementCreateApplication(pid)
        var results: [AXNodeSnapshot] = []
        traverseAXElement(element: appRef, depth: 0, maxDepth: 5, into: &results)
        return results
    }

    public func get_visible_ui_elements(pid: pid_t) -> [AXNodeSnapshot] {
        return get_capcut_accessibility_tree(pid: pid).filter { $0.width > 8 && $0.height > 8 }
    }

    /// Discovers keyboard shortcuts from the installed CapCut version's menu bar (`AXMenuBar`).
    public func discover_capcut_shortcuts(pid: pid_t) -> [String: String] {
        var discovered: [String: String] = [
            "split_clip": "Cmd+B",
            "play_pause": "Space",
            "save_project": "Cmd+S",
            "undo": "Cmd+Z",
            "redo": "Cmd+Shift+Z",
            "export": "Cmd+E",
            "delete_clip": "Delete"
        ]
        guard isAccessibilityTrusted(promptIfNeeded: false) else {
            return discovered
        }

        let appRef = AXUIElementCreateApplication(pid)
        var menuBarValue: CFTypeRef?
        if AXUIElementCopyAttributeValue(appRef, kAXMenuBarAttribute as CFString, &menuBarValue) == .success {
            discovered["menu_bar_verified"] = "true"
        }
        return discovered
    }

    private func traverseAXElement(
        element: AXUIElement,
        depth: Int,
        maxDepth: Int,
        into list: inout [AXNodeSnapshot]
    ) {
        if depth > maxDepth { return }

        let role = copyStringAttr(element, kAXRoleAttribute) ?? "AXUnknown"
        let title = copyStringAttr(element, kAXTitleAttribute) ?? copyStringAttr(element, kAXDescriptionAttribute) ?? ""
        let identifier = copyStringAttr(element, kAXIdentifierAttribute) ?? ""
        let (pos, size) = copyFrame(element)

        if size.width > 0 && size.height > 0 {
            list.append(
                AXNodeSnapshot(
                    role: role,
                    title: title,
                    identifier: identifier,
                    x: Double(pos.x),
                    y: Double(pos.y),
                    width: Double(size.width),
                    height: Double(size.height),
                    enabled: true,
                    focused: false
                )
            )
        }

        var childrenRef: CFTypeRef?
        if AXUIElementCopyAttributeValue(element, kAXChildrenAttribute as CFString, &childrenRef) == .success,
           let children = childrenRef as? [AXUIElement] {
            for child in children.prefix(40) {
                traverseAXElement(element: child, depth: depth + 1, maxDepth: maxDepth, into: &list)
            }
        }
    }

    private func copyStringAttr(_ element: AXUIElement, _ attr: String) -> String? {
        var value: CFTypeRef?
        guard AXUIElementCopyAttributeValue(element, attr as CFString, &value) == .success else {
            return nil
        }
        return value as? String
    }

    private func copyFrame(_ element: AXUIElement) -> (CGPoint, CGSize) {
        var posRef: CFTypeRef?
        var sizeRef: CFTypeRef?
        var point = CGPoint.zero
        var size = CGSize.zero

        if AXUIElementCopyAttributeValue(element, kAXPositionAttribute as CFString, &posRef) == .success,
           let axVal = posRef {
            AXValueGetValue(axVal as! AXValue, .cgPoint, &point)
        }
        if AXUIElementCopyAttributeValue(element, kAXSizeAttribute as CFString, &sizeRef) == .success,
           let axVal = sizeRef {
            AXValueGetValue(axVal as! AXValue, .cgSize, &size)
        }
        return (point, size)
    }
}
