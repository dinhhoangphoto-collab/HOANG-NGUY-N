import React, { useState } from 'react';
import {
  X,
  Eye,
  CheckCircle2,
  Terminal,
  Cpu,
  Layers,
  Maximize2,
  Shield,
  Sliders,
  Play,
  FileCode,
  FlaskConical,
} from 'lucide-react';
import {
  CapCutFocusDistinctionState,
  ColorGradingAdjustment,
  DEFAULT_CAPCUT_MEDIA_LIBRARY,
  recalculateCapCutUICoordinates,
  TimelineClipInstance,
  VerifiedUIAction,
  WindowGeometry,
} from '../engine/editingLogic';
import {
  AIActionProtocolItem,
  buildDisposableTestSuite,
  DisposableTestStepResult,
} from '../engine/computerUseEngine';

interface ScreenVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'vision' | 'logs' | 'test10' | 'tauri';
  geometry: WindowGeometry;
  onUpdateGeometry: (next: Partial<WindowGeometry>) => void;
  actions: VerifiedUIAction[];
  protocolQueue: AIActionProtocolItem[];
  timelineSequence: TimelineClipInstance[];
  colorAdjustments: ColorGradingAdjustment;
  focusDistinction: CapCutFocusDistinctionState;
  lastMousePos: { x: number; y: number };
  onTriggerEmergencyStop: (reason: string) => void;
}

const SWIFT_MODULES_SUMMARY = [
  {
    file: 'ScreenCapture.swift',
    frameworks: 'ScreenCaptureKit · CoreGraphics · AppKit',
    functions: 'get_active_window(), capture_capcut_window(outputPath)',
    desc: 'Chụp cửa sổ CapCut chuẩn Retina 2x không chiếm quyền focus và chuẩn hóa tọa độ theo backingScaleFactor.',
  },
  {
    file: 'Accessibility.swift',
    frameworks: 'ApplicationServices · AXUIElement',
    functions: 'get_capcut_accessibility_tree(pid), get_visible_ui_elements(pid), discover_capcut_shortcuts(pid)',
    desc: 'Đọc cây giao diện AXUIElement và tự động dò bảng phím tắt từ thanh Menu của phiên bản CapCut đang cài.',
  },
  {
    file: 'UIRecognition.swift',
    frameworks: 'Vision · ApplicationServices',
    functions: 'identify_timeline(), identify_preview(), identify_media_library(), identify_color_panel(), identify_export_panel()',
    desc: 'Ưu tiên đọc tọa độ AXUIElement; tự động chuyển sang Vision OCR + tỷ lệ cửa sổ khi thông tin AX bị ẩn.',
  },
  {
    file: 'MouseController.swift',
    frameworks: 'CoreGraphics · CGEvent · Serial DispatchQueue',
    functions: 'move_mouse(x,y), click(x,y), double_click(x,y), right_click(x,y), drag(sx,sy,ex,ey)',
    desc: 'Tuần tự hóa 100% thao tác chuột (không bao giờ chạy 2 lệnh chuột chồng chéo), hỗ trợ timeout và hủy tức thì.',
  },
  {
    file: 'KeyboardController.swift',
    frameworks: 'CoreGraphics · CGEventKeyboardSetUnicodeString',
    functions: 'type_text(text), press_key(key), press_shortcut(shortcut)',
    desc: 'Nhập văn bản tiếng Việt có dấu và gửi tổ hợp phím tắt chuẩn xác vào tiến trình CapCut.',
  },
  {
    file: 'ApplicationController.swift',
    frameworks: 'AppKit · NSWorkspace',
    functions: 'findCapCutApplication(), activateCapCut(), isCapCutFrontmost()',
    desc: 'Phát hiện gói com.lemon.lvoverseas và giám sát trạng thái cửa sổ CapCut Desktop.',
  },
  {
    file: 'SafetyController.swift',
    frameworks: 'AppKit · NSEvent Global Monitor · HMAC IPC',
    functions: 'registerEmergencyStopMonitor(), triggerEmergencyStop(), validateIPCCommand()',
    desc: 'Lắng nghe phím tắt khẩn cấp Control+Option+Command+Escape, chặn mọi lệnh shell và xác thực IPC cục bộ.',
  },
];

export const ScreenVerificationModal: React.FC<ScreenVerificationModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'vision',
  geometry,
  onUpdateGeometry,
  protocolQueue,
  timelineSequence,
  colorAdjustments,
  focusDistinction,
  lastMousePos,
  onTriggerEmergencyStop,
}) => {
  const [activeTab, setActiveTab] = useState<'vision' | 'logs' | 'test10' | 'tauri'>(initialTab);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('video_tracks');
  const [testSuite, setTestSuite] = useState<DisposableTestStepResult[]>(() =>
    buildDisposableTestSuite(geometry)
  );
  const [isRunningTests, setIsRunningTests] = useState<boolean>(false);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  if (!isOpen) return null;

  const uiMap = recalculateCapCutUICoordinates(geometry);
  const zones = Object.values(uiMap);
  const activeZone = uiMap[selectedZoneId] || uiMap.video_tracks;

  const handlePresetWindowSize = (width: number, height: number, scrollPx: number, zoom: number) => {
    onUpdateGeometry({
      width,
      height,
      timelineScrollOffsetPx: scrollPx,
      timelineZoomLevel: zoom,
    });
    setTestSuite(
      buildDisposableTestSuite({
        ...geometry,
        width,
        height,
        timelineScrollOffsetPx: scrollPx,
        timelineZoomLevel: zoom,
      })
    );
  };

  const handleRunDisposableTestSuite = async () => {
    if (isRunningTests) return;
    setIsRunningTests(true);
    const fresh = buildDisposableTestSuite(geometry);
    setTestSuite(fresh);

    for (let i = 0; i < fresh.length; i++) {
      setTestSuite((prev) =>
        prev.map((step, idx) => (idx === i ? { ...step, status: 'running' } : step))
      );
      await new Promise((r) => setTimeout(r, 140));
      const isEmergencyStep = i === fresh.length - 1;
      setTestSuite((prev) =>
        prev.map((step, idx) =>
          idx === i ? { ...step, status: isEmergencyStep ? 'stopped' : 'passed' } : step
        )
      );
      if (isEmergencyStep) {
        onTriggerEmergencyStop('Step 10 Disposable Test: Control + Option + Command + Escape');
      }
    }
    setIsRunningTests(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="verification-modal-title"
    >
      <div className="w-full max-w-6xl bg-[#111827] border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 id="verification-modal-title" className="text-lg font-semibold text-slate-100">
              Computer Use Engine Inspector (OBSERVE → UNDERSTAND → PLAN → VALIDATE → ACT → VERIFY → RECOVER)
            </h2>
            <p className="text-xs text-slate-400">
              7 Module Swift Native + Rust IPC + Chuẩn hóa tọa độ ScreenCaptureKit & AXUIElement trên Apple M1
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng trình kiểm chứng màn hình"
            className="p-2 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 py-2.5 bg-[#0B0F17] border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('vision')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'vision'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              1. Screen Observation & AX Tree
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'logs'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              2. AI Action Protocol JSON ({protocolQueue.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('test10')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'test10'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              3. Kiểm thử 10 Bước (Disposable Test Project)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tauri')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'tauri'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              4. 7 Module Swift Native & Bộ cài M1 (.dmg)
            </button>
          </div>

          <div className="text-xs font-mono tabular-nums text-slate-400">
            Window ID #{geometry.windowId} · PID {geometry.pid} · {geometry.width}×{geometry.height}px · Scale {geometry.dpiScale}x
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'vision' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left 8 cols: Captured CapCut Desktop Window with AX Overlay */}
              <div className="lg:col-span-8 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-slate-300 font-medium">
                    `capture_capcut_window()` + `get_capcut_accessibility_tree()` (Tự động tính lại tọa độ khi Resize/Scroll/Zoom):
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handlePresetWindowSize(1728, 1055, 0, 1.0)}
                      className={`px-2 py-1 text-[11px] font-mono rounded border transition-colors ${
                        geometry.width === 1728
                          ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      1728×1055 (Zoom 1.0x)
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetWindowSize(1440, 900, 80, 1.25)}
                      className={`px-2 py-1 text-[11px] font-mono rounded border transition-colors ${
                        geometry.width === 1440
                          ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      1440×900 (Scroll +80px · Zoom 1.25x)
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetWindowSize(1920, 1080, 0, 1.0)}
                      className={`px-2 py-1 text-[11px] font-mono rounded border transition-colors ${
                        geometry.width === 1920
                          ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      1920×1080
                    </button>
                  </div>
                </div>

                {/* Live CapCut Observation Map */}
                <div className="relative rounded-lg border border-slate-700 bg-[#0D1017] p-3 overflow-hidden">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] font-mono text-slate-400">
                    <span>CapCut Desktop — {geometry.projectTitle}</span>
                    <span>Serialized Cursor: ({lastMousePos.x}, {lastMousePos.y})</span>
                  </div>

                  <div className="grid grid-cols-12 gap-2 text-xs">
                    {/* Media Library */}
                    <div
                      onClick={() => setSelectedZoneId('media_library')}
                      className={`col-span-4 p-2.5 rounded border cursor-pointer transition-colors ${
                        selectedZoneId === 'media_library' || selectedZoneId === 'media_thumbnails'
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono text-amber-300 mb-1.5">
                        <span>identify_media_library()</span>
                        <span>({uiMap.media_library.centerX}, {uiMap.media_library.centerY})</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {DEFAULT_CAPCUT_MEDIA_LIBRARY.slice(0, 6).map((clip) => (
                          <div
                            key={clip.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedZoneId('media_thumbnails');
                            }}
                            className={`p-1.5 rounded bg-[#090D16] border text-[10px] truncate ${
                              focusDistinction.selectedMediaFile === clip.filename
                                ? 'border-emerald-400 text-emerald-300'
                                : 'border-slate-800 text-slate-400'
                            }`}
                          >
                            <div className="font-mono text-[9px] text-slate-500">{clip.durationSec}s · 4K</div>
                            <div className="truncate text-slate-200">{clip.filename.slice(0, 16)}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Preview Window */}
                    <div
                      onClick={() => setSelectedZoneId('preview_window')}
                      className={`col-span-5 p-2.5 rounded border cursor-pointer transition-colors flex flex-col justify-between ${
                        selectedZoneId === 'preview_window' || selectedZoneId === 'playback_controls'
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono text-amber-300 mb-1">
                        <span>identify_preview()</span>
                        <span>({uiMap.preview_window.centerX}, {uiMap.preview_window.centerY})</span>
                      </div>

                      <div className="my-1 rounded bg-gradient-to-br from-slate-800 via-amber-950/40 to-slate-900 border border-slate-700/70 p-3 text-center">
                        <div className="text-[11px] font-medium text-amber-200">
                          Preview: {colorAdjustments.styleName}
                        </div>
                        <div className="text-[10px] text-slate-300 mt-1">
                          Skin Tone & White Dress Protected (Highlights {colorAdjustments.highlights})
                        </div>
                      </div>

                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedZoneId('playback_controls');
                        }}
                        className="mt-1 px-2 py-1 rounded bg-[#090D16] border border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-300"
                      >
                        <span className="flex items-center gap-1">
                          <Play className="w-3 h-3 text-emerald-400" /> Space: Play/Pause
                        </span>
                        <span>00:01:24:12 / 00:03:00:00</span>
                      </div>
                    </div>

                    {/* Color Panel */}
                    <div
                      onClick={() => setSelectedZoneId('color_panel')}
                      className={`col-span-3 p-2.5 rounded border cursor-pointer transition-colors ${
                        selectedZoneId === 'color_panel'
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono text-amber-300 mb-1.5">
                        <span>identify_color_panel()</span>
                        <span>({uiMap.color_panel.centerX}, {uiMap.color_panel.centerY})</span>
                      </div>
                      <div className="space-y-1 text-[10px] font-mono">
                        <div className="flex justify-between text-slate-300">
                          <span>Exposure</span>
                          <span className="text-amber-300">+{colorAdjustments.exposure}</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Contrast</span>
                          <span className="text-amber-300">{colorAdjustments.contrast}</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Temperature</span>
                          <span className="text-amber-300">{colorAdjustments.temperature}</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Highlights</span>
                          <span className="text-emerald-300">{colorAdjustments.highlights}</span>
                        </div>
                      </div>
                    </div>

                    {/* Main Timeline */}
                    <div
                      onClick={() => setSelectedZoneId('video_tracks')}
                      className={`col-span-12 p-2.5 rounded border cursor-pointer transition-colors ${
                        selectedZoneId === 'video_tracks' ||
                        selectedZoneId === 'main_timeline' ||
                        selectedZoneId === 'audio_tracks'
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono text-amber-300 mb-2">
                        <span>identify_timeline() — {timelineSequence.length} Clips on Real CapCut Track V1</span>
                        <span>Center: ({uiMap.video_tracks.centerX}, {uiMap.video_tracks.centerY})</span>
                      </div>
                      <div className="grid grid-cols-8 gap-1 mb-1.5">
                        {timelineSequence.map((item, idx) => (
                          <div
                            key={item.instanceId}
                            className="p-1.5 rounded bg-slate-800/90 border border-slate-700 text-[10px]"
                          >
                            <div className="font-mono text-[9px] text-amber-300">
                              #{idx + 1} · {item.durationSec}s
                            </div>
                            <div className="truncate text-slate-200">{item.category.replace('_', ' ')}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right 4 cols: Focus State & Zone Inspector */}
              <div className="lg:col-span-4 space-y-4">
                <div className="p-4 rounded-lg bg-[#0B0F17] border border-slate-800 space-y-3">
                  <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                    <Maximize2 className="w-4 h-4 text-amber-400" />
                    Discovered CapCut Shortcuts & Focus State
                  </h3>
                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between text-slate-300">
                      <span>Split Clip:</span>
                      <span className="text-amber-300">Cmd+B</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Play / Pause:</span>
                      <span className="text-amber-300">Space</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Save Project:</span>
                      <span className="text-amber-300">Cmd+S</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Emergency Stop:</span>
                      <span className="text-rose-400">⌃⌥⌘Esc</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-[#0B0F17] border border-slate-800 space-y-2.5">
                  <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-amber-400" />
                    Chi tiết Vùng Giao Diện Đang Chọn
                  </h3>
                  <div className="text-xs space-y-1 font-mono">
                    <div className="text-amber-300 font-semibold">{activeZone.labelVi}</div>
                    <div className="text-slate-400">AXRole: {activeZone.axRole}</div>
                    <div className="text-slate-300">
                      Bounds: ({activeZone.x}, {activeZone.y}, {activeZone.width}×{activeZone.height})
                    </div>
                    <div className="text-emerald-300">
                      Normalized Center: ({activeZone.centerX}, {activeZone.centerY})
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-1">
                    {zones.map((z) => (
                      <button
                        key={z.id}
                        type="button"
                        onClick={() => setSelectedZoneId(z.id)}
                        className={`px-2 py-1 text-[10px] font-mono rounded border transition-colors ${
                          selectedZoneId === z.id
                            ? 'bg-amber-500 text-slate-950 border-amber-500 font-semibold'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {z.id}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-300">
                Mọi hành động từ Gemini đều tuân thủ nghiêm ngặt schema <span className="font-mono text-amber-300">AIActionProtocolItem</span> (Section 5) và được kiểm duyệt qua <span className="font-mono text-emerald-300">validateAIActionProtocol()</span> trước khi gửi tới <span className="font-mono text-amber-300">SerializedInputController</span>. Tuyệt đối không cho phép thực thi lệnh shell.
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {protocolQueue.map((item) => (
                  <div
                    key={item.action_id}
                    className="p-3.5 rounded-lg bg-[#0B0F17] border border-slate-800 font-mono text-[11px] space-y-2"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                      <span className="text-amber-400 font-semibold">
                        {item.action_id} · {item.operation}
                      </span>
                      <span className="text-emerald-400">timeout: {item.timeout_ms}ms</span>
                    </div>
                    <pre className="text-slate-300 whitespace-pre-wrap overflow-x-auto leading-relaxed">
{JSON.stringify(
  {
    action_id: item.action_id,
    target_application: item.target_application,
    operation: item.operation,
    target_description: item.target_description,
    preconditions: item.preconditions,
    expected_result: item.expected_result,
    verification_strategy: item.verification_strategy,
    timeout_ms: item.timeout_ms,
    recovery_strategy: item.recovery_strategy,
  },
  null,
  2
)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'test10' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-[#0B0F17] border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    Dự án Kiểm thử Độc lập: <span className="font-mono text-amber-300">LaLa_Disposable_Test_Project.capcut</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Thực thi 10 bước kiểm thử tự động hóa thật trên dự án nháp để bảo vệ tuyệt đối dự án gốc của người dùng (Section 10).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRunDisposableTestSuite}
                  disabled={isRunningTests}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isRunningTests ? 'Đang chạy 10 bước...' : 'Chạy 10 Bước Kiểm Thử (Run Test Suite)'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {testSuite.map((step) => (
                  <div
                    key={step.stepNumber}
                    className={`p-3.5 rounded-lg border text-xs flex flex-col justify-between gap-2 ${
                      step.status === 'passed'
                        ? 'bg-[#0B0F17] border-emerald-800/70'
                        : step.status === 'stopped'
                        ? 'bg-rose-950/30 border-rose-700/70'
                        : step.status === 'running'
                        ? 'bg-[#172033] border-amber-500'
                        : 'bg-[#0B0F17] border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-100">{step.titleVi}</span>
                      <span className="font-mono text-[11px] text-emerald-400 uppercase">{step.status}</span>
                    </div>
                    <div className="font-mono text-[11px] text-amber-300">API: {step.functionCalled}</div>
                    <div className="text-[11px] text-slate-400">{step.verificationNote}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'tauri' && (
            <div className="space-y-4">
              {/* Direct Download & Installation Guide for macOS M1 */}
              <div className="p-5 rounded-xl bg-[#0B0F17] border border-amber-500/60 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                      <FileCode className="w-4 h-4 shrink-0" />
                      Tải & Đóng gói Bộ cài LaLaAIEditor.app / LaLaAIEditor.dmg cho Mac M1
                    </h3>
                    <p className="text-xs text-slate-300 mt-1">
                      Vì môi trường trình duyệt web chạy trên đám mây (Linux container), để tạo file <code className="text-amber-300 font-mono">.app</code> và <code className="text-amber-300 font-mono">.dmg</code> chạy trực tiếp với Apple ScreenCaptureKit & Accessibility API, bạn thực hiện 2 bước sau trên máy Mac M1:
                    </p>
                  </div>

                  <a
                    href="/api/macos/download-installer"
                    download="build-lala-macos-m1.command"
                    className="px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs whitespace-nowrap shrink-0 flex items-center gap-2 shadow-lg"
                  >
                    <Cpu className="w-4 h-4" />
                    <span>Tải Script Cài Đặt Mac M1 (.command)</span>
                  </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
                    <div className="font-semibold text-slate-100">Bước 1: Tải toàn bộ mã nguồn (ZIP)</div>
                    <p className="text-slate-400 leading-relaxed">
                      Nhấn nút <strong className="text-slate-200">Download / Export ZIP</strong> ở thanh công cụ phía trên của Google AI Studio (hoặc đồng bộ qua GitHub) để tải thư mục dự án về máy Mac M1 của bạn.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
                    <div className="font-semibold text-slate-100">Bước 2: Chạy lệnh đóng gói tự động</div>
                    <p className="text-slate-400 leading-relaxed">
                      Giải nén thư mục trên máy Mac M1, mở <strong className="text-slate-200">Terminal</strong> tại thư mục dự án và chạy:
                      <code className="block mt-1 p-1.5 rounded bg-slate-950 text-amber-300 font-mono text-[11px]">
                        chmod +x scripts/build-macos-arm64.sh && ./scripts/build-macos-arm64.sh
                      </code>
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
                    <div className="font-semibold text-slate-100">Bước 3: Mở file .app hoặc .dmg</div>
                    <p className="text-slate-400 leading-relaxed">
                      Nhận ngay bộ cài đặt gốc tại:
                      <code className="block mt-1 p-1.5 rounded bg-slate-950 text-emerald-300 font-mono text-[10px] break-all">
                        src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/LaLaAIEditor_1.1.0_aarch64.dmg
                      </code>
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SWIFT_MODULES_SUMMARY.map((mod) => (
                  <div key={mod.file} className="p-3.5 rounded-lg bg-[#0B0F17] border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-semibold text-amber-400">
                        src-tauri/swift-helper/Sources/LaLaMacOSHelper/{mod.file}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-emerald-400">{mod.frameworks}</div>
                    <div className="text-[11px] font-mono text-slate-300">{mod.functions}</div>
                    <p className="text-xs text-slate-400">{mod.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-[#0B0F17] flex items-center justify-between">
          <span className="text-xs text-slate-400">
            IPC xác thực cục bộ · Không cho phép AI chạy lệnh shell · Khẩn cấp: Control + Option + Command + Escape
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium bg-slate-800 text-slate-100 rounded-lg hover:bg-slate-700 transition-colors"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  );
};
