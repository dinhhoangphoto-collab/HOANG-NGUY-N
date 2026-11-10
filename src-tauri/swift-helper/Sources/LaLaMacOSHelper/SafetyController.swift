import Foundation
import AppKit

public final class SafetyController {
    public static let shared = SafetyController()

    private let lock = NSLock()
    private var emergencyStopped: Bool = false
    private var paused: Bool = false
    private var globalMonitor: Any?

    private init() {
        registerEmergencyStopMonitor()
    }

    /// Registers global emergency stop shortcut: Control + Option + Command + Escape.
    public func registerEmergencyStopMonitor() {
        globalMonitor = NSEvent.addGlobalMonitorForEvents(matching: .keyDown) { [weak self] event in
            let requiredFlags: NSEvent.ModifierFlags = [.control, .option, .command]
            let flagsMatch = event.modifierFlags.intersection([.control, .option, .command]) == requiredFlags
            // keyCode 53 == Escape
            if flagsMatch && event.keyCode == 53 {
                self?.triggerEmergencyStop(reason: "Global hotkey Control+Option+Command+Escape pressed")
            }
        }
    }

    public func triggerEmergencyStop(reason: String) {
        lock.lock()
        emergencyStopped = true
        paused = true
        lock.unlock()
        fputs("[SAFETY] EMERGENCY STOP TRIGGERED: \(reason)\n", stderr)
    }

    public func setPaused(_ value: Bool) {
        lock.lock()
        paused = value
        if !value {
            emergencyStopped = false
        }
        lock.unlock()
    }

    public func canExecuteInput() -> Bool {
        lock.lock()
        defer { lock.unlock() }
        if emergencyStopped || paused {
            return false
        }
        return AccessibilityController.shared.isAccessibilityTrusted(promptIfNeeded: false)
    }

    /// Validates that an IPC command is an approved GUI action and never an arbitrary shell command.
    public func validateIPCCommand(operation: String, targetApp: String) -> Bool {
        let allowedOps: Set<String> = [
            "capture_capcut_window",
            "get_capcut_accessibility_tree",
            "get_active_window",
            "get_visible_ui_elements",
            "identify_timeline",
            "identify_preview",
            "identify_media_library",
            "identify_color_panel",
            "identify_export_panel",
            "move_mouse",
            "click",
            "double_click",
            "right_click",
            "drag",
            "type_text",
            "press_key",
            "press_shortcut",
            "emergency_stop",
            "pause",
            "resume"
        ]
        guard allowedOps.contains(operation) else { return false }
        guard targetApp.localizedCaseInsensitiveContains("CapCut") else { return false }
        return true
    }
}
