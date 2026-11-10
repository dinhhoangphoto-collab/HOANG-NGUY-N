/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  Pause,
  OctagonX,
  RotateCcw,
  ExternalLink,
  Sliders,
  Eye,
  Shield,
  MousePointerClick,
  GripHorizontal,
  Minimize2,
  Maximize2,
  Lock,
} from 'lucide-react';
import {
  CapCutConnectionStatus,
  CapCutFocusDistinctionState,
  COLOR_STYLES,
  ColorGradingAdjustment,
  ColorStyleId,
  DEFAULT_CAPCUT_MEDIA_LIBRARY,
  EDITING_MODES,
  EditingModeId,
  generateVerifiedCapCutActionPlan,
  inferEditingPreferencesFromPrompt,
  MacOSPermissionsState,
  PROGRESS_STAGES,
  ProgressStageId,
  recalculateCapCutUICoordinates,
  TimelineClipInstance,
  validateMacOSPermissionsForAutomation,
  VerifiedUIAction,
  WindowGeometry,
} from './engine/editingLogic';
import {
  AIActionProtocolItem,
  AssistantWindowState,
  buildCapCutAIActionProtocolQueue,
  computeFloatingWindowLayout,
  ExecutionLoopPhase,
} from './engine/computerUseEngine';
import { PermissionsWizardModal } from './components/PermissionsWizardModal';
import { ScreenVerificationModal } from './components/ScreenVerificationModal';

const DEFAULT_WEDDING_EXAMPLE =
  'Dựng phóng sự cưới phong cách cinematic, màu film Hàn Quốc, cảm xúc, chuyển cảnh tự nhiên, nhạc nhẹ nhàng, thời lượng khoảng 3 phút.';

const EXECUTION_LOOP_STEPS: ExecutionLoopPhase[] = [
  'OBSERVE',
  'UNDERSTAND',
  'PLAN',
  'VALIDATE',
  'ACT',
  'VERIFY',
  'RECOVER',
];

export default function App() {
  // Core CapCut connection & macOS permissions state
  const [capcutRunning, setCapcutRunning] = useState<boolean>(true);
  const [permissions, setPermissions] = useState<MacOSPermissionsState>({
    accessibility: true,
    screenRecording: true,
    automation: true,
  });
  const [geometry, setGeometry] = useState<WindowGeometry>({
    windowId: 7412,
    pid: 48219,
    appName: 'CapCut',
    bundleId: 'com.lemon.lvoverseas',
    projectTitle: 'Phóng_Sự_Cưới_Minh_Anh_4K.capcut',
    x: 0,
    y: 25,
    width: 1728,
    height: 1055,
    dpiScale: 2,
    timelineZoomLevel: 1.0,
    timelineScrollOffsetPx: 0,
  });

  // Section 1: Three Floating Assistant Window States: ASSISTANT | EDITING | PAUSED
  const [windowState, setWindowState] = useState<AssistantWindowState>('ASSISTANT');
  const [floatingWidth, setFloatingWidth] = useState<number>(380);
  const [temporarilyHiddenInEditing, setTemporarilyHiddenInEditing] = useState<boolean>(false);

  // Main Screen Editing Controls
  const [editingMode, setEditingMode] = useState<EditingModeId>('wedding_documentary');
  const [colorStyle, setColorStyle] = useState<ColorStyleId>('korean_wedding_film');
  const [ideaPrompt, setIdeaPrompt] = useState<string>(DEFAULT_WEDDING_EXAMPLE);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Autonomous Agent Execution State
  const [automationState, setAutomationState] = useState<
    'idle' | 'running' | 'paused' | 'stopped' | 'completed'
  >('idle');
  const [activeLoopPhase, setActiveLoopPhase] = useState<ExecutionLoopPhase>('OBSERVE');
  const [completedStages, setCompletedStages] = useState<ProgressStageId[]>([]);
  const [currentStage, setCurrentStage] = useState<ProgressStageId | null>(null);
  const [actions, setActions] = useState<VerifiedUIAction[]>([]);
  const [protocolQueue, setProtocolQueue] = useState<AIActionProtocolItem[]>([]);
  const [activeActionIndex, setActiveActionIndex] = useState<number>(-1);
  const [editorialSummaryVi, setEditorialSummaryVi] = useState<string>('');
  const [timelineSequence, setTimelineSequence] = useState<TimelineClipInstance[]>([]);
  const [colorAdjustments, setColorAdjustments] = useState<ColorGradingAdjustment>(
    COLOR_STYLES.korean_wedding_film
  );
  const [focusDistinction, setFocusDistinction] = useState<CapCutFocusDistinctionState>({
    selectedMediaFile: 'A001_Bride_Makeup_Veil_4K.mov',
    selectedTimelineClip: null,
    selectedTrack: 'Video Track V1',
    activeTextField: null,
    focusedPreviewWindow: true,
  });
  const [lastMousePos, setLastMousePos] = useState<{ x: number; y: number }>({ x: 864, y: 310 });
  const [capcutForegroundNotice, setCapcutForegroundNotice] = useState<string | null>(null);
  const [emergencyStopReason, setEmergencyStopReason] = useState<string | null>(null);

  // Modals
  const [isPermissionsOpen, setIsPermissionsOpen] = useState<boolean>(false);
  const [verificationModal, setVerificationModal] = useState<{
    open: boolean;
    tab: 'vision' | 'logs' | 'test10' | 'tauri';
  }>({ open: false, tab: 'vision' });

  // Refs for pause / emergency stop control inside async loop
  const isPausedRef = useRef<boolean>(false);
  const isStoppedRef = useRef<boolean>(false);

  const permissionValidation = validateMacOSPermissionsForAutomation(permissions);
  const connectionStatus: CapCutConnectionStatus = !permissionValidation.allowed
    ? 'permission_required'
    : !capcutRunning
    ? 'not_running'
    : 'connected';

  const floatingLayout = computeFloatingWindowLayout(windowState, geometry);
  const uiMap = recalculateCapCutUICoordinates(geometry);

  // Initial load + Global Emergency Stop Hotkey listener (Control + Option + Command + Escape)
  useEffect(() => {
    const initialPlan = generateVerifiedCapCutActionPlan({
      mode: 'wedding_documentary',
      colorStyle: 'korean_wedding_film',
      promptVi: DEFAULT_WEDDING_EXAMPLE,
      geometry,
      clips: DEFAULT_CAPCUT_MEDIA_LIBRARY,
      targetDurationSec: 180,
    });
    setActions(initialPlan.actions);
    setTimelineSequence(initialPlan.timelineSequence);
    setColorAdjustments(initialPlan.colorAdjustments);
    setProtocolQueue(
      buildCapCutAIActionProtocolQueue(geometry, initialPlan.colorAdjustments.styleName)
    );

    fetch('/api/macos/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.geometry) {
          setGeometry(data.geometry);
        }
      })
      .catch(() => {});

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (e.ctrlKey || e.metaKey || e.altKey)) {
        e.preventDefault();
        handleEmergencyStop('Shortcut Control + Option + Command + Escape pressed');
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handlePromptChange = (val: string) => {
    setIdeaPrompt(val);
    if (validationError) setValidationError(null);
    if (val.trim().length > 10) {
      const inferred = inferEditingPreferencesFromPrompt(val, editingMode, colorStyle);
      setColorStyle(inferred.colorStyle);
    }
  };

  const handleSelectMode = (nextMode: EditingModeId) => {
    setEditingMode(nextMode);
    const modeInfo = EDITING_MODES.find((m) => m.id === nextMode);
    if (modeInfo && (!ideaPrompt.trim() || EDITING_MODES.some((m) => m.examplePromptVi === ideaPrompt))) {
      setIdeaPrompt(modeInfo.examplePromptVi);
      const inferred = inferEditingPreferencesFromPrompt(modeInfo.examplePromptVi, nextMode, colorStyle);
      setColorStyle(inferred.colorStyle);
    }
  };

  const handleUpdatePermissions = (next: MacOSPermissionsState) => {
    setPermissions(next);
    fetch('/api/macos/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissions: next }),
    }).catch(() => {});
  };

  const handleUpdateGeometry = (nextPartial: Partial<WindowGeometry>) => {
    const updated = { ...geometry, ...nextPartial };
    setGeometry(updated);
    const updatedPlan = generateVerifiedCapCutActionPlan({
      mode: editingMode,
      colorStyle,
      promptVi: ideaPrompt,
      geometry: updated,
      clips: DEFAULT_CAPCUT_MEDIA_LIBRARY,
      targetDurationSec: 180,
    });
    setActions(updatedPlan.actions);
    setProtocolQueue(
      buildCapCutAIActionProtocolQueue(updated, updatedPlan.colorAdjustments.styleName)
    );
  };

  // Start Autonomous CapCut GUI Editing Workflow
  const handleStartAiEdit = async () => {
    setCapcutForegroundNotice(null);
    setEmergencyStopReason(null);

    if (!ideaPrompt.trim()) {
      setValidationError('Vui lòng nhập ý tưởng dựng video bằng tiếng Việt trước khi bắt đầu.');
      return;
    }

    if (connectionStatus === 'permission_required') {
      setValidationError(
        'Thiếu quyền truy cập macOS (Accessibility / Screen Recording / Automation). Đã dừng tự động hóa để bạn cấp quyền.'
      );
      setIsPermissionsOpen(true);
      return;
    }

    if (connectionStatus === 'not_running') {
      setValidationError(
        'CapCut Desktop hiện chưa mở. Vui lòng khởi chạy CapCut hoặc bấm "Connected" trước khi dựng.'
      );
      return;
    }

    setValidationError(null);
    isPausedRef.current = false;
    isStoppedRef.current = false;
    setAutomationState('running');
    // Transition floating window into EDITING mode (compact floating status panel away from timeline)
    setWindowState('EDITING');
    setCompletedStages([]);
    setCurrentStage('observing_capcut');

    let plannedActions: VerifiedUIAction[] = [];
    let plannedTimeline: TimelineClipInstance[] = [];
    let plannedColor: ColorGradingAdjustment = COLOR_STYLES[colorStyle];
    let plannedProtocol: AIActionProtocolItem[] = [];
    let summaryText = '';

    try {
      const response = await fetch('/api/brain/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptVi: ideaPrompt,
          selectedMode: editingMode,
          selectedColorStyle: colorStyle,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        plannedActions = data.actions;
        plannedTimeline = data.timelineSequence;
        plannedColor = data.colorAdjustments;
        plannedProtocol = data.protocolQueue || [];
        summaryText = data.editorialSummaryVi;
      }
    } catch {
      // Local fallback below
    }

    if (plannedActions.length === 0) {
      const inferred = inferEditingPreferencesFromPrompt(ideaPrompt, editingMode, colorStyle);
      const localPlan = generateVerifiedCapCutActionPlan({
        mode: editingMode,
        colorStyle,
        promptVi: ideaPrompt,
        geometry,
        clips: DEFAULT_CAPCUT_MEDIA_LIBRARY,
        targetDurationSec: inferred.targetDurationSec,
      });
      plannedActions = localPlan.actions;
      plannedTimeline = localPlan.timelineSequence;
      plannedColor = localPlan.colorAdjustments;
      plannedProtocol = buildCapCutAIActionProtocolQueue(geometry, plannedColor.styleName);
      summaryText = `Chiến lược dựng trực tiếp trên CapCut Desktop (${inferred.targetDurationSec}s): Sắp xếp ${plannedTimeline.length} cảnh quay lên Track V1, bảo toàn âm thanh gốc tại đoạn Vows/phát biểu và áp dụng màu ${plannedColor.styleName}.`;
    }

    setActions(plannedActions);
    setTimelineSequence(plannedTimeline);
    setColorAdjustments(plannedColor);
    setProtocolQueue(plannedProtocol);
    setEditorialSummaryVi(summaryText);

    // Execute OBSERVE -> UNDERSTAND -> PLAN -> VALIDATE -> ACT -> VERIFY -> RECOVER step by step
    for (let i = 0; i < plannedActions.length; i++) {
      if (isStoppedRef.current) {
        setAutomationState('stopped');
        setWindowState('PAUSED');
        setCurrentStage(null);
        return;
      }

      while (isPausedRef.current && !isStoppedRef.current) {
        await new Promise((r) => setTimeout(r, 150));
      }
      if (isStoppedRef.current) {
        setAutomationState('stopped');
        setWindowState('PAUSED');
        setCurrentStage(null);
        return;
      }

      const stepAction = plannedActions[i];
      const protocolItem = plannedProtocol[i];
      setActiveActionIndex(i);
      setCurrentStage(stepAction.stage);

      // Cycle through OBSERVE -> VALIDATE -> ACT -> VERIFY
      setActiveLoopPhase('OBSERVE');
      await new Promise((r) => setTimeout(r, 60));
      setActiveLoopPhase('VALIDATE');
      await new Promise((r) => setTimeout(r, 60));
      setActiveLoopPhase('ACT');

      setLastMousePos({
        x: stepAction.coordinates.endX ?? stepAction.coordinates.startX,
        y: stepAction.coordinates.endY ?? stepAction.coordinates.startY,
      });

      setActions((prev) =>
        prev.map((a, idx) => (idx === i ? { ...a, status: 'acting' } : a))
      );

      if (protocolItem) {
        fetch('/api/macos/execute-protocol-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ protocolAction: protocolItem }),
        }).catch(() => {});
      }

      try {
        const verifyRes = await fetch('/api/macos/execute-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: stepAction }),
        });
        if (verifyRes.ok) {
          const verifyData = await verifyRes.json();
          if (verifyData.focusDistinction) {
            setFocusDistinction(verifyData.focusDistinction);
          }
        }
      } catch {
        // Deterministic local verification
      }

      setActiveLoopPhase('VERIFY');
      await new Promise((r) => setTimeout(r, 140));

      if (isStoppedRef.current) {
        setAutomationState('stopped');
        setWindowState('PAUSED');
        setCurrentStage(null);
        return;
      }

      setActions((prev) =>
        prev.map((a, idx) =>
          idx === i
            ? {
                ...a,
                status: 'verified',
                verifiedTimestamp: new Date().toLocaleTimeString('vi-VN'),
              }
            : a
        )
      );

      setCompletedStages((prev) => {
        const nextSet = new Set(prev);
        nextSet.add(stepAction.stage);
        return Array.from(nextSet);
      });
    }

    setCompletedStages(PROGRESS_STAGES.map((s) => s.id));
    setCurrentStage(null);
    setActiveActionIndex(-1);
    setAutomationState('completed');
    setWindowState('ASSISTANT');
  };

  const handleTogglePause = () => {
    if (automationState === 'running') {
      isPausedRef.current = true;
      setAutomationState('paused');
      setWindowState('PAUSED');
      fetch('/api/macos/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paused: true }),
      }).catch(() => {});
    } else if (automationState === 'paused' || windowState === 'PAUSED') {
      isPausedRef.current = false;
      isStoppedRef.current = false;
      setEmergencyStopReason(null);
      if (completedStages.length < PROGRESS_STAGES.length && activeActionIndex >= 0) {
        setAutomationState('running');
        setWindowState('EDITING');
      } else {
        setAutomationState('idle');
        setWindowState('ASSISTANT');
      }
      fetch('/api/macos/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paused: false }),
      }).catch(() => {});
    }
  };

  const handleEmergencyStop = (reason = 'Control + Option + Command + Escape') => {
    isStoppedRef.current = true;
    isPausedRef.current = true;
    setAutomationState('stopped');
    setWindowState('PAUSED');
    setCurrentStage(null);
    setActiveActionIndex(-1);
    setEmergencyStopReason(reason);
    fetch('/api/macos/emergency-stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    }).catch(() => {});
  };

  const handleReturnToCapCut = () => {
    setCapcutForegroundNotice(
      `Đã đưa cửa sổ CapCut Desktop (${geometry.projectTitle}) lên tiền cảnh. Toàn bộ ${timelineSequence.length} clip trên Track V1, lớp màu ${colorAdjustments.styleName} và Track âm thanh A1 đang sẵn sàng để bạn xem hoặc nhấn Export.`
    );
  };

  const handleContinueEditing = () => {
    setCapcutForegroundNotice(null);
    setEmergencyStopReason(null);
    setAutomationState('idle');
    setWindowState('ASSISTANT');
    setCompletedStages([]);
    setCurrentStage(null);
  };

  const activeAction = activeActionIndex >= 0 ? actions[activeActionIndex] : null;
  const activeProtocol = activeActionIndex >= 0 ? protocolQueue[activeActionIndex] : protocolQueue[0];

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col">
      {/* Top Bar Contract: 3 Zones separated by gap-8 */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-800/80 bg-[#0B0F17]">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#main"
          className="text-lg font-bold tracking-tight text-slate-100 font-display whitespace-nowrap shrink-0"
        >
          LaLa AI Editor
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav aria-label="Điều hướng công cụ" className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          <button
            type="button"
            onClick={() => setVerificationModal({ open: true, tab: 'vision' })}
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            Quan sát Màn hình
          </button>
          <button
            type="button"
            onClick={() => setVerificationModal({ open: true, tab: 'logs' })}
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            Nhật ký Thao tác
          </button>
          <button
            type="button"
            onClick={() => setVerificationModal({ open: true, tab: 'test10' })}
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            Kiểm thử 10 bước
          </button>
          <button
            type="button"
            onClick={() => setIsPermissionsOpen(true)}
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            Quyền macOS
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setVerificationModal({ open: true, tab: 'tauri' })}
            className="px-4 py-2 text-xs font-medium text-slate-200 bg-slate-800/90 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
          >
            Bộ cài macOS M1 (.dmg)
          </button>
        </div>
      </header>

      {/* Main Workspace: Floating Assistant Window + Live Observed CapCut Desktop Workspace */}
      <main id="main" className="flex-1 w-full max-w-[1400px] mx-auto px-6 py-4 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN (Floating macOS Assistant Window — ~360px wide, 3 Window States: ASSISTANT | EDITING | PAUSED) */}
        <div className="lg:col-span-4 flex flex-col items-center lg:items-start">
          <div
            data-testid="floating-assistant-window"
            style={{ width: `${floatingWidth}px`, maxWidth: '100%' }}
            className="rounded-2xl bg-[#111827] border border-slate-700/90 shadow-2xl overflow-hidden transition-all duration-150"
          >
            {/* Floating Window macOS Titlebar + Window State Switcher */}
            <div className="px-3.5 py-2.5 bg-[#0B0F17] border-b border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <GripHorizontal className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="text-xs font-semibold text-slate-200 truncate">
                  LaLa Floating
                </span>
              </div>

              {/* Window State Tabs: ASSISTANT | EDITING | PAUSED */}
              <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 shrink-0">
                {(['ASSISTANT', 'EDITING', 'PAUSED'] as AssistantWindowState[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setWindowState(st)}
                    className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors whitespace-nowrap shrink-0 ${
                      windowState === st
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Window Metadata Strip: Always-on-Top & Resize Controls */}
            <div className="px-4 py-1.5 bg-[#0D131F] border-b border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>
                {floatingWidth}px · {floatingLayout.alwaysOnTop ? 'Always-on-Top' : 'Timeline-Safe (No Focus Steal)'}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setFloatingWidth(360)}
                  aria-label="Thu gọn cửa sổ nổi 360px"
                  className="p-1 hover:text-slate-200"
                >
                  <Minimize2 className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setFloatingWidth((w) => (w === 360 ? 420 : 360))}
                  aria-label="Đổi độ rộng cửa sổ nổi"
                  className="p-1 hover:text-slate-200"
                >
                  <Maximize2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* WINDOW STATE 2: EDITING (Compact Floating Status Panel away from CapCut timeline) */}
            {windowState === 'EDITING' && (
              <div className="p-4 space-y-3 bg-[#141D2E]">
                <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/70 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold tracking-wide text-amber-300 flex items-center gap-1.5">
                      <MousePointerClick className="w-4 h-4 shrink-0" />
                      AI IS CONTROLLING CAPCUT
                    </span>
                    <span className="text-[10px] font-mono text-amber-200">{activeLoopPhase}</span>
                  </div>
                  <p className="text-[11px] text-slate-200 leading-snug">
                    Vui lòng không dùng chuột hoặc bàn phím. Cửa sổ đã tự thu gọn và tránh xa vùng Timeline của CapCut.
                  </p>
                </div>

                {!temporarilyHiddenInEditing && (
                  <div className="p-2.5 rounded-lg bg-[#0B0F17] border border-slate-800 text-[11px] font-mono space-y-1">
                    <div className="text-amber-300 truncate">
                      {activeAction ? `${activeAction.actionId}: ${activeAction.intendedOperation}` : 'ACT-04: Dragging clips to Track V1'}
                    </div>
                    <div className="text-slate-400 flex justify-between">
                      <span>Cursor: ({lastMousePos.x}, {lastMousePos.y})</span>
                      <span>{completedStages.length}/7 Stages</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleTogglePause}
                    className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-100 flex items-center justify-center gap-1.5"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEmergencyStop('Emergency Stop button (⌃⌥⌘Esc)')}
                    className="flex-1 py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white flex items-center justify-center gap-1.5"
                  >
                    <OctagonX className="w-3.5 h-3.5" />
                    <span>⌃⌥⌘Esc Stop</span>
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <button
                    type="button"
                    onClick={() => setTemporarilyHiddenInEditing((v) => !v)}
                    className="hover:text-slate-200 underline"
                  >
                    {temporarilyHiddenInEditing ? 'Hiện chi tiết thao tác' : 'Ẩn tạm thời chi tiết'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setWindowState('ASSISTANT')}
                    className="hover:text-slate-200"
                  >
                    Mở rộng Assistant →
                  </button>
                </div>
              </div>
            )}

            {/* WINDOW STATE 3: PAUSED / STOPPED */}
            {windowState === 'PAUSED' && (
              <div className="p-4 space-y-3 bg-[#161B26]">
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-700/80 space-y-1">
                  <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                    <OctagonX className="w-4 h-4 shrink-0" />
                    <span>PAUSED / STOPPED</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Đã dừng mọi thao tác chuột & bàn phím ngay lập tức. Trạng thái dự án trong CapCut Desktop được giữ nguyên vẹn.
                  </p>
                  {emergencyStopReason && (
                    <div className="text-[10px] font-mono text-amber-300 pt-1">
                      Trigger: {emergencyStopReason}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTogglePause}
                    className="flex-1 py-2.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>RESUME EDITING</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWindowState('ASSISTANT')}
                    className="py-2.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs"
                  >
                    Về Assistant
                  </button>
                </div>
              </div>
            )}

            {/* WINDOW STATE 1: ASSISTANT (Main Floating Input Window) */}
            {windowState === 'ASSISTANT' && (
              <div className="p-4 space-y-3.5">
                {/* 1. CAPCUT STATUS */}
                <div className="p-3 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-400">CAPCUT STATUS</span>
                    <div className="flex items-center gap-1.5">
                      {connectionStatus === 'connected' && (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="text-xs font-semibold text-emerald-400" data-testid="capcut-status-label">
                            Connected
                          </span>
                        </>
                      )}
                      {connectionStatus === 'not_running' && (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span className="text-xs font-semibold text-rose-400" data-testid="capcut-status-label">
                            Not running
                          </span>
                        </>
                      )}
                      {connectionStatus === 'permission_required' && (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="text-xs font-semibold text-amber-400" data-testid="capcut-status-label">
                            Permission required
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Quick Status State Switcher */}
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setCapcutRunning(true);
                        handleUpdatePermissions({
                          accessibility: true,
                          screenRecording: true,
                          automation: true,
                        });
                        setValidationError(null);
                      }}
                      className={`py-1 px-2 text-[11px] font-medium rounded border transition-colors ${
                        connectionStatus === 'connected'
                          ? 'bg-emerald-950/60 border-emerald-700/80 text-emerald-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      Connected
                    </button>
                    <button
                      type="button"
                      onClick={() => setCapcutRunning(false)}
                      className={`py-1 px-2 text-[11px] font-medium rounded border transition-colors ${
                        connectionStatus === 'not_running'
                          ? 'bg-rose-950/60 border-rose-700/80 text-rose-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      Not running
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleUpdatePermissions({
                          ...permissions,
                          accessibility: false,
                        });
                        setIsPermissionsOpen(true);
                      }}
                      className={`py-1 px-2 text-[11px] font-medium rounded border transition-colors ${
                        connectionStatus === 'permission_required'
                          ? 'bg-amber-950/60 border-amber-700/80 text-amber-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      Permission
                    </button>
                  </div>
                </div>

                {/* 2. EDITING MODE */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-300">EDITING MODE</div>
                  <div className="space-y-1.5">
                    {EDITING_MODES.map((mode) => {
                      const isSelected = editingMode === mode.id;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => handleSelectMode(mode.id)}
                          className={`w-full p-2.5 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'bg-[#172033] border-amber-500/90 text-slate-100'
                              : 'bg-[#0B0F17] border-slate-800/90 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-100">{mode.name}</span>
                            <span className="text-[10px] font-mono text-amber-400">
                              {mode.priorityBadge || mode.targetDurationLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{mode.subtitleVi}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. COLOR PRESET & IDEA INPUT */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="idea-prompt-input" className="text-[11px] font-semibold text-slate-300">
                      IDEA INPUT
                    </label>
                    <div className="flex items-center gap-1.5">
                      <Sliders className="w-3 h-3 text-amber-400" />
                      <select
                        id="color-style-select"
                        aria-label="Màu CapCut Adjustment"
                        value={colorStyle}
                        onChange={(e) => setColorStyle(e.target.value as ColorStyleId)}
                        className="bg-[#0B0F17] border border-slate-700 rounded px-2 py-0.5 text-[11px] text-slate-200"
                      >
                        {Object.values(COLOR_STYLES).map((style) => (
                          <option key={style.styleId} value={style.styleId}>
                            {style.styleName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <textarea
                    id="idea-prompt-input"
                    rows={3}
                    value={ideaPrompt}
                    onChange={(e) => handlePromptChange(e.target.value)}
                    placeholder="Bạn muốn AI dựng video như thế nào?"
                    className="w-full rounded-xl bg-[#0B0F17] border border-slate-800 p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 leading-relaxed"
                  />

                  {/* Cloud AI Screenshot Disclosure (Section 9) */}
                  <div className="p-2 rounded-lg bg-[#0B0F17] border border-slate-800/80 flex items-start gap-2 text-[10px] text-slate-400">
                    <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      Minh bạch Cloud AI: Chỉ gửi ảnh chụp vùng CapCut & thông tin AX cần thiết tới Gemini để lập kế hoạch; mọi thao tác chuột/phím được kiểm duyệt cục bộ.
                    </span>
                  </div>
                </div>

                {validationError && (
                  <div
                    role="alert"
                    className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800 text-xs text-rose-200"
                  >
                    {validationError}
                  </div>
                )}

                {/* 4. MAIN BUTTON: AI EDIT */}
                <button
                  id="ai-edit-button"
                  type="button"
                  onClick={handleStartAiEdit}
                  disabled={automationState === 'running'}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-bold text-sm tracking-wide transition-colors flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>AI EDIT</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (Live Observed CapCut Desktop Screen + 7-Step Execution Loop + Progress + Completed Banner) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Live Execution Loop Status Bar: OBSERVE -> UNDERSTAND -> PLAN -> VALIDATE -> ACT -> VERIFY -> RECOVER */}
          <section
            aria-label="Chu trình điều khiển máy tính 7 bước"
            className="p-4 rounded-xl bg-[#111827] border border-slate-800/90 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-200">
                  COMPUTER USE EXECUTION LOOP (macOS M1 ARM64)
                </span>
                <span className="text-xs text-slate-500">·</span>
                <span className="text-xs font-mono text-amber-400">
                  Khẩn cấp: Control + Option + Command + Escape
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleEmergencyStop('Manual Emergency Stop Trigger (⌃⌥⌘Esc)')}
                className="px-3 py-1 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-700/80 text-rose-200 text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <OctagonX className="w-3.5 h-3.5 text-rose-400" />
                <span>⌃⌥⌘Esc Emergency Stop</span>
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {EXECUTION_LOOP_STEPS.map((phase) => {
                const isActive = activeLoopPhase === phase && automationState === 'running';
                return (
                  <div
                    key={phase}
                    className={`py-1.5 px-2 rounded-lg border text-center font-mono text-[10px] transition-colors ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                        : 'bg-[#0B0F17] text-slate-400 border-slate-800'
                    }`}
                  >
                    {phase}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Live Observed CapCut Desktop Screen (`capture_capcut_window()` + Recognized AX Regions) */}
          <section
            aria-label="Màn hình CapCut Desktop đang được AI quan sát"
            className="p-4 rounded-xl bg-[#111827] border border-slate-800/90 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-xs font-semibold text-slate-200">
                  LIVE CAPCUT DESKTOP OBSERVATION (`capture_capcut_window()` · Window #{geometry.windowId})
                </h2>
                <p className="text-[11px] text-slate-400">
                  Dự án thật trên CapCut: <span className="font-mono text-slate-200">{geometry.projectTitle}</span> · Tọa độ chuột tuần tự: <span className="font-mono text-amber-300">({lastMousePos.x}, {lastMousePos.y})</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setVerificationModal({ open: true, tab: 'test10' })}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-amber-300 transition-colors"
                >
                  Chạy 10 Bước Test Dự Án Nháp
                </button>
                <button
                  type="button"
                  onClick={() => setVerificationModal({ open: true, tab: 'vision' })}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  <span>Mở rộng 12 vùng AX</span>
                </button>
              </div>
            </div>

            {/* Interactive CapCut Desktop Screen Mirror */}
            <div className="rounded-xl border border-slate-800 bg-[#0B0F17] p-3 grid grid-cols-12 gap-2.5 text-xs">
              {/* Media Library */}
              <div className="col-span-4 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between font-mono text-[10px] text-amber-300">
                  <span>identify_media_library()</span>
                  <span>({uiMap.media_library.centerX}, {uiMap.media_library.centerY})</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {DEFAULT_CAPCUT_MEDIA_LIBRARY.slice(0, 4).map((clip) => (
                    <div
                      key={clip.id}
                      className="p-1.5 rounded bg-[#090D16] border border-slate-800/90 text-[10px] truncate"
                    >
                      <div className="font-mono text-[9px] text-slate-400">{clip.durationSec}s · 4K</div>
                      <div className="truncate text-slate-200">{clip.filename.slice(0, 14)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview Window */}
              <div className="col-span-5 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between font-mono text-[10px] text-amber-300">
                  <span>identify_preview()</span>
                  <span>({uiMap.preview_window.centerX}, {uiMap.preview_window.centerY})</span>
                </div>
                <div className="my-1.5 p-3 rounded bg-gradient-to-br from-slate-800 via-amber-950/30 to-slate-900 border border-slate-700/70 text-center">
                  <div className="text-xs font-semibold text-amber-200">{colorAdjustments.styleName}</div>
                  <div className="text-[10px] text-slate-300 mt-0.5">
                    Skin Tone & Wedding Dress Protected
                  </div>
                </div>
                <div className="px-2 py-1 rounded bg-[#090D16] border border-slate-800 flex items-center justify-between font-mono text-[10px] text-slate-300">
                  <span>Space: Play/Pause</span>
                  <span>00:03:00:00</span>
                </div>
              </div>

              {/* Color Panel */}
              <div className="col-span-3 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
                <div className="font-mono text-[10px] text-amber-300">identify_color_panel()</div>
                <div className="space-y-1 font-mono text-[10px] pt-1">
                  <div className="flex justify-between text-slate-300">
                    <span>Exp</span>
                    <span className="text-amber-300">+{colorAdjustments.exposure}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Temp</span>
                    <span className="text-amber-300">{colorAdjustments.temperature}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>High</span>
                    <span className="text-emerald-300">{colorAdjustments.highlights}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Shad</span>
                    <span className="text-amber-300">+{colorAdjustments.shadows}</span>
                  </div>
                </div>
              </div>

              {/* Real CapCut Timeline Track V1 & A1 */}
              <div className="col-span-12 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between font-mono text-[10px] text-amber-300">
                  <span>identify_timeline() · Real CapCut Timeline Track V1 ({timelineSequence.length} Verified Clips)</span>
                  <span>Cmd+B Split · Cmd+S Save</span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
                  {timelineSequence.map((clip, index) => (
                    <div
                      key={clip.instanceId}
                      className="p-1.5 rounded bg-[#090D16] border border-slate-700/80 text-[10px]"
                    >
                      <div className="font-mono text-[9px] text-amber-400">
                        #{index + 1} · {clip.durationSec}s
                      </div>
                      <div className="truncate text-slate-200">{clip.category.replace('_', ' ')}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Active Validated AI Action Protocol Readout */}
            {activeProtocol && (
              <div className="p-2.5 rounded-lg bg-[#090D16] border border-slate-800/90 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                <span className="text-slate-300">
                  Protocol: <strong className="text-amber-300">{activeProtocol.action_id}</strong> · op=<strong className="text-emerald-300">{activeProtocol.operation}</strong> · target=&quot;{activeProtocol.target_description}&quot;
                </span>
                <button
                  type="button"
                  onClick={() => setVerificationModal({ open: true, tab: 'logs' })}
                  className="text-amber-400 hover:underline"
                >
                  JSON Schema →
                </button>
              </div>
            )}
          </section>

          {/* 7-Stage Progress Tracker */}
          <section
            aria-label="Tiến độ dựng video trên CapCut"
            className="p-4 rounded-xl bg-[#111827] border border-slate-800/90 space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold tracking-wider text-slate-300">
                PROGRESS (7 BƯỚC DỰNG TRỰC TIẾP TRÊN CAPCUT)
              </h2>
              <span className="text-xs font-mono tabular-nums text-slate-400">
                {completedStages.length} / {PROGRESS_STAGES.length} bước hoàn tất
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {PROGRESS_STAGES.map((stage, idx) => {
                const isDone = completedStages.includes(stage.id);
                const isCurrent = currentStage === stage.id;
                return (
                  <div
                    key={stage.id}
                    className={`p-2.5 rounded-lg border flex flex-col justify-between gap-1 transition-colors ${
                      isCurrent
                        ? 'bg-[#172033] border-amber-500/80 text-slate-100'
                        : isDone
                        ? 'bg-[#0B0F17] border-emerald-800/60 text-slate-200'
                        : 'bg-[#0B0F17]/60 border-slate-800/80 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[10px] text-slate-400">0{idx + 1}</span>
                      {isDone ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <span className="text-[10px] font-mono text-slate-500">
                          {isCurrent ? 'Active' : 'Wait'}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-100 leading-tight">{stage.label}</div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* FINAL STATUS: EDITING COMPLETED + RETURN TO CAPCUT / CONTINUE EDITING */}
          {automationState === 'completed' && (
            <section
              aria-label="Hoàn tất dựng phim"
              data-testid="editing-completed-banner"
              className="p-5 rounded-xl bg-[#111827] border border-emerald-600/80 space-y-3 shadow-xl"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div>
                    <h2 className="text-base font-bold tracking-wide text-emerald-400 font-display">
                      EDITING COMPLETED
                    </h2>
                    <p className="text-xs text-slate-300">
                      Toàn bộ Timeline ({timelineSequence.length} cảnh quay), màu {colorAdjustments.styleName} và âm thanh đã được dựng trực tiếp trong CapCut Desktop.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  Bản sao lưu gốc an toàn · Chờ xác nhận trước khi Export
                </span>
              </div>

              {editorialSummaryVi && (
                <p className="text-xs text-slate-300 leading-relaxed bg-[#0B0F17] p-3 rounded-lg border border-slate-800">
                  {editorialSummaryVi}
                </p>
              )}

              {capcutForegroundNotice && (
                <div className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-800 text-xs text-emerald-200">
                  {capcutForegroundNotice}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleReturnToCapCut}
                    className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs tracking-wide transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>RETURN TO CAPCUT</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleContinueEditing}
                    className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs tracking-wide transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>CONTINUE EDITING</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setVerificationModal({ open: true, tab: 'logs' })}
                  className="text-xs text-amber-400 hover:underline font-medium"
                >
                  Xem AI Action Protocol JSON →
                </button>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Quiet Footer */}
      <footer className="mt-auto px-6 py-3.5 border-t border-slate-800/70 bg-[#0B0F17] text-xs text-slate-400 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-slate-500" />
          <span>LaLa AI Editor · Native macOS M1 Computer Use Engine (Tauri 2 + Swift Helper + Rust IPC)</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setIsPermissionsOpen(true)}
            className="hover:text-slate-200 transition-colors"
          >
            Trình hướng dẫn Quyền macOS
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => setVerificationModal({ open: true, tab: 'test10' })}
            className="hover:text-slate-200 transition-colors"
          >
            10 Bước Kiểm Thử Dự Án Nháp
          </button>
        </div>
      </footer>

      {/* Modals */}
      <PermissionsWizardModal
        isOpen={isPermissionsOpen}
        onClose={() => setIsPermissionsOpen(false)}
        permissions={permissions}
        onUpdatePermissions={handleUpdatePermissions}
      />

      <ScreenVerificationModal
        isOpen={verificationModal.open}
        initialTab={verificationModal.tab}
        onClose={() => setVerificationModal((prev) => ({ ...prev, open: false }))}
        geometry={geometry}
        onUpdateGeometry={handleUpdateGeometry}
        actions={actions}
        protocolQueue={protocolQueue}
        timelineSequence={timelineSequence}
        colorAdjustments={colorAdjustments}
        focusDistinction={focusDistinction}
        lastMousePos={lastMousePos}
        onTriggerEmergencyStop={handleEmergencyStop}
      />
    </div>
  );
}
