import Foundation
import CoreGraphics

public final class MouseController {
    public static let shared = MouseController()
    private let serialQueue = DispatchQueue(label: "com.lala.aieditor.mouse.serial", qos: .userInteractive)
    private init() {}

    /// Smoothly moves the mouse cursor to (x, y) using CoreGraphics CGEvent.
    public func move_mouse(x: Double, y: Double) -> Bool {
        guard SafetyController.shared.canExecuteInput() else { return false }
        return serialQueue.sync {
            let point = CGPoint(x: x, y: y)
            guard let moveEvent = CGEvent(mouseEventSource: nil, mouseType: .mouseMoved, mouseCursorPosition: point, mouseButton: .left) else {
                return false
            }
            moveEvent.post(tap: .cghidEventTap)
            usleep(35_000)
            return true
        }
    }

    /// Performs a serialized left click at (x, y).
    public func click(x: Double, y: Double) -> Bool {
        guard SafetyController.shared.canExecuteInput() else { return false }
        return serialQueue.sync {
            let point = CGPoint(x: x, y: y)
            guard let down = CGEvent(mouseEventSource: nil, mouseType: .leftMouseDown, mouseCursorPosition: point, mouseButton: .left),
                  let up = CGEvent(mouseEventSource: nil, mouseType: .leftMouseUp, mouseCursorPosition: point, mouseButton: .left) else {
                return false
            }
            down.post(tap: .cghidEventTap)
            usleep(45_000)
            up.post(tap: .cghidEventTap)
            return true
        }
    }

    /// Performs a serialized double click at (x, y).
    public func double_click(x: Double, y: Double) -> Bool {
        guard SafetyController.shared.canExecuteInput() else { return false }
        return serialQueue.sync {
            let point = CGPoint(x: x, y: y)
            for clickState in 1...2 {
                guard let down = CGEvent(mouseEventSource: nil, mouseType: .leftMouseDown, mouseCursorPosition: point, mouseButton: .left),
                      let up = CGEvent(mouseEventSource: nil, mouseType: .leftMouseUp, mouseCursorPosition: point, mouseButton: .left) else {
                    return false
                }
                down.setIntegerValueField(.mouseEventClickState, value: Int64(clickState))
                up.setIntegerValueField(.mouseEventClickState, value: Int64(clickState))
                down.post(tap: .cghidEventTap)
                usleep(30_000)
                up.post(tap: .cghidEventTap)
                usleep(40_000)
            }
            return true
        }
    }

    /// Performs a serialized right click at (x, y).
    public func right_click(x: Double, y: Double) -> Bool {
        guard SafetyController.shared.canExecuteInput() else { return false }
        return serialQueue.sync {
            let point = CGPoint(x: x, y: y)
            guard let down = CGEvent(mouseEventSource: nil, mouseType: .rightMouseDown, mouseCursorPosition: point, mouseButton: .right),
                  let up = CGEvent(mouseEventSource: nil, mouseType: .rightMouseUp, mouseCursorPosition: point, mouseButton: .right) else {
                return false
            }
            down.post(tap: .cghidEventTap)
            usleep(45_000)
            up.post(tap: .cghidEventTap)
            return true
        }
    }

    /// Performs a multi-step interpolated drag from (start_x, start_y) to (end_x, end_y) for CapCut media/timeline clips.
    public func drag(start_x: Double, start_y: Double, end_x: Double, end_y: Double) -> Bool {
        guard SafetyController.shared.canExecuteInput() else { return false }
        return serialQueue.sync {
            let startPt = CGPoint(x: start_x, y: start_y)
            let endPt = CGPoint(x: end_x, y: end_y)
            guard let down = CGEvent(mouseEventSource: nil, mouseType: .leftMouseDown, mouseCursorPosition: startPt, mouseButton: .left) else {
                return false
            }
            down.post(tap: .cghidEventTap)
            usleep(60_000)

            let steps = 12
            for i in 1...steps {
                if !SafetyController.shared.canExecuteInput() {
                    if let cancelUp = CGEvent(mouseEventSource: nil, mouseType: .leftMouseUp, mouseCursorPosition: startPt, mouseButton: .left) {
                        cancelUp.post(tap: .cghidEventTap)
                    }
                    return false
                }
                let t = Double(i) / Double(steps)
                let curX = start_x + (end_x - start_x) * t
                let curY = start_y + (end_y - start_y) * t
                let curPt = CGPoint(x: curX, y: curY)
                if let dragEvt = CGEvent(mouseEventSource: nil, mouseType: .leftMouseDragged, mouseCursorPosition: curPt, mouseButton: .left) {
                    dragEvt.post(tap: .cghidEventTap)
                }
                usleep(22_000)
            }

            guard let up = CGEvent(mouseEventSource: nil, mouseType: .leftMouseUp, mouseCursorPosition: endPt, mouseButton: .left) else {
                return false
            }
            up.post(tap: .cghidEventTap)
            usleep(50_000)
            return true
        }
    }
}
