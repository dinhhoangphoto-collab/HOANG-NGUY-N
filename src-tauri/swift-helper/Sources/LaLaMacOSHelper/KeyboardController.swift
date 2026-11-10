import Foundation
import CoreGraphics

public final class KeyboardController {
    public static let shared = KeyboardController()
    private let serialQueue = DispatchQueue(label: "com.lala.aieditor.keyboard.serial", qos: .userInteractive)
    private init() {}

    /// Types Unicode text (including Vietnamese diacritics) directly into the focused CapCut text field.
    public func type_text(text: String) -> Bool {
        guard SafetyController.shared.canExecuteInput() else { return false }
        return serialQueue.sync {
            let utf16Chars = Array(text.utf16)
            for unit in utf16Chars {
                if !SafetyController.shared.canExecuteInput() { return false }
                var char = unit
                guard let down = CGEvent(keyboardEventSource: nil, virtualKey: 0, keyDown: true),
                      let up = CGEvent(keyboardEventSource: nil, virtualKey: 0, keyDown: false) else {
                    return false
                }
                down.keyboardSetUnicodeString(stringLength: 1, unicodeString: &char)
                up.keyboardSetUnicodeString(stringLength: 1, unicodeString: &char)
                down.post(tap: .cghidEventTap)
                usleep(12_000)
                up.post(tap: .cghidEventTap)
                usleep(12_000)
            }
            return true
        }
    }

    /// Presses a single virtual key (e.g., Space, Delete, Escape, Return, Left, Right).
    public func press_key(key: String) -> Bool {
        guard SafetyController.shared.canExecuteInput() else { return false }
        return serialQueue.sync {
            let keyCode = mapVirtualKeyCode(key)
            guard let down = CGEvent(keyboardEventSource: nil, virtualKey: keyCode, keyDown: true),
                  let up = CGEvent(keyboardEventSource: nil, virtualKey: keyCode, keyDown: false) else {
                return false
            }
            down.post(tap: .cghidEventTap)
            usleep(30_000)
            up.post(tap: .cghidEventTap)
            return true
        }
    }

    /// Presses a modifier shortcut (e.g., "Cmd+B", "Cmd+S", "Cmd+Z", "Cmd+Shift+Z").
    public func press_shortcut(shortcut: String) -> Bool {
        guard SafetyController.shared.canExecuteInput() else { return false }
        return serialQueue.sync {
            let parts = shortcut.split(separator: "+").map { String($0).trimmingCharacters(in: .whitespaces) }
            guard let lastKey = parts.last else { return false }
            let keyCode = mapVirtualKeyCode(lastKey)

            var flags: CGEventFlags = []
            for mod in parts.dropLast() {
                let lower = mod.lowercased()
                if lower == "cmd" || lower == "command" { flags.insert(.maskCommand) }
                if lower == "shift" { flags.insert(.maskShift) }
                if lower == "alt" || lower == "option" { flags.insert(.maskAlternate) }
                if lower == "ctrl" || lower == "control" { flags.insert(.maskControl) }
            }

            guard let down = CGEvent(keyboardEventSource: nil, virtualKey: keyCode, keyDown: true),
                  let up = CGEvent(keyboardEventSource: nil, virtualKey: keyCode, keyDown: false) else {
                return false
            }
            down.flags = flags
            up.flags = flags
            down.post(tap: .cghidEventTap)
            usleep(35_000)
            up.post(tap: .cghidEventTap)
            return true
        }
    }

    private func mapVirtualKeyCode(_ key: String) -> CGKeyCode {
        switch key.lowercased() {
        case "a": return 0
        case "s": return 1
        case "d": return 2
        case "z": return 6
        case "x": return 7
        case "c": return 8
        case "v": return 9
        case "b": return 11
        case "e": return 14
        case "space": return 49
        case "delete", "backspace": return 51
        case "escape", "esc": return 53
        case "return", "enter": return 36
        case "left": return 123
        case "right": return 124
        default: return 49
        }
    }
}
