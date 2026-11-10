import Foundation

struct IPCRequest: Codable {
    let authToken: String
    let actionId: String
    let targetApplication: String
    let operation: String
    let x: Double?
    let y: Double?
    let endX: Double?
    let endY: Double?
    let text: String?
    let shortcut: String?
}

struct IPCResponse: Codable {
    let actionId: String
    let ok: Bool
    let message: String
    let windowBounds: NormalizedWindowBounds?
}

/// Authenticated local IPC loop communicating with the Tauri Rust backend over standard I/O or Unix domain socket.
/// Rejects unauthenticated requests and prohibits arbitrary shell execution.
let expectedToken = ProcessInfo.processInfo.environment["LALA_IPC_AUTH_TOKEN"] ?? "lala-local-hmac-ipc-v1"

while let line = readLine() {
    guard let data = line.data(using: .utf8),
          let req = try? JSONDecoder().decode(IPCRequest.self, from: data) else {
        continue
    }

    if req.authToken != expectedToken {
        let unauthorized = IPCResponse(actionId: req.actionId, ok: false, message: "Unauthorized IPC token", windowBounds: nil)
        if let out = try? JSONEncoder().encode(unauthorized), let str = String(data: out, encoding: .utf8) {
            print(str)
            fflush(stdout)
        }
        continue
    }

    if req.operation == "emergency_stop" {
        SafetyController.shared.triggerEmergencyStop(reason: "IPC Emergency Stop")
        let stopped = IPCResponse(actionId: req.actionId, ok: true, message: "Emergency stop engaged", windowBounds: nil)
        if let out = try? JSONEncoder().encode(stopped), let str = String(data: out, encoding: .utf8) {
            print(str)
            fflush(stdout)
        }
        continue
    }

    guard SafetyController.shared.validateIPCCommand(operation: req.operation, targetApp: req.targetApplication) else {
        let rejected = IPCResponse(actionId: req.actionId, ok: false, message: "Disallowed operation or target application", windowBounds: nil)
        if let out = try? JSONEncoder().encode(rejected), let str = String(data: out, encoding: .utf8) {
            print(str)
            fflush(stdout)
        }
        continue
    }

    var success = true
    let bounds = ScreenCaptureController.shared.get_active_window()

    switch req.operation {
    case "move_mouse":
        success = MouseController.shared.move_mouse(x: req.x ?? 0, y: req.y ?? 0)
    case "click":
        success = MouseController.shared.click(x: req.x ?? 0, y: req.y ?? 0)
    case "double_click":
        success = MouseController.shared.double_click(x: req.x ?? 0, y: req.y ?? 0)
    case "right_click":
        success = MouseController.shared.right_click(x: req.x ?? 0, y: req.y ?? 0)
    case "drag":
        success = MouseController.shared.drag(start_x: req.x ?? 0, start_y: req.y ?? 0, end_x: req.endX ?? 0, end_y: req.endY ?? 0)
    case "type_text":
        success = KeyboardController.shared.type_text(text: req.text ?? "")
    case "press_key":
        success = KeyboardController.shared.press_key(key: req.shortcut ?? "Space")
    case "press_shortcut":
        success = KeyboardController.shared.press_shortcut(shortcut: req.shortcut ?? "Cmd+B")
    default:
        success = true
    }

    let resp = IPCResponse(
        actionId: req.actionId,
        ok: success,
        message: success ? "Verified via Swift native helper" : "Blocked by SafetyController or missing Accessibility permission",
        windowBounds: bounds
    )
    if let out = try? JSONEncoder().encode(resp), let str = String(data: out, encoding: .utf8) {
        print(str)
        fflush(stdout)
    }
}
