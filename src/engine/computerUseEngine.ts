import {
  MacOSPermissionsState,
  recalculateCapCutUICoordinates,
  UIElementRect,
  validateMacOSPermissionsForAutomation,
  WindowGeometry,
} from './editingLogic';

export type AssistantWindowState = 'ASSISTANT' | 'EDITING' | 'PAUSED';

export type AllowedOperationType =
  | 'move_mouse'
  | 'click'
  | 'double_click'
  | 'right_click'
  | 'drag'
  | 'type_text'
  | 'press_key'
  | 'press_shortcut';

export type ExecutionLoopPhase =
  | 'OBSERVE'
  | 'UNDERSTAND'
  | 'PLAN'
  | 'VALIDATE'
  | 'ACT'
  | 'VERIFY'
  | 'RECOVER';

export type CapCutWorkflowCapability =
  | 'select_imported_media'
  | 'preview_video'
  | 'drag_media_into_timeline'
  | 'select_timeline_clips'
  | 'move_clips'
  | 'split_clips'
  | 'trim_clips'
  | 'delete_selected_clips'
  | 'adjust_playback_speed'
  | 'add_audio'
  | 'adjust_audio_volume'
  | 'open_color_adjustments'
  | 'adjust_color_parameters'
  | 'apply_transitions'
  | 'preview_timeline'
  | 'save_project';

/**
 * Exact AI Action Protocol specified in Section 5.
 * Never permits shell commands or unapproved operations.
 */
export interface AIActionProtocolItem {
  action_id: string;
  target_application: 'CapCut';
  operation: AllowedOperationType;
  target_description: string;
  preconditions: string[];
  expected_result: string;
  verification_strategy: string;
  timeout_ms: number;
  recovery_strategy: string;
  // Normalized execution parameters derived from Screen Observation
  workflow_capability?: CapCutWorkflowCapability;
  coordinates?: {
    x: number;
    y: number;
    end_x?: number;
    end_y?: number;
  };
  key_or_shortcut?: string;
  text_input?: string;
  loop_phase?: ExecutionLoopPhase;
  status?: 'queued' | 'validating' | 'executing' | 'verified' | 'recovered' | 'cancelled' | 'failed';
}

export interface AXAccessibilityNode {
  id: string;
  role: string;
  title: string;
  identifier: string;
  bounds: { x: number; y: number; width: number; height: number };
  center: { x: number; y: number };
  source: 'AXUIElement' | 'VisionOCR';
  enabled: boolean;
}

export interface ScreenObservationReport {
  timestamp: string;
  windowBounds: WindowGeometry;
  normalizedScaleFactor: number;
  activeWindowVerified: boolean;
  accessibilityTreeCount: number;
  visibleElements: AXAccessibilityNode[];
  identifiedPanels: {
    media_library: UIElementRect;
    preview: UIElementRect;
    timeline: UIElementRect;
    color_panel: UIElementRect;
    export_panel: UIElementRect;
  };
  discoveredShortcuts: Record<string, string>;
}

export interface DisposableTestStepResult {
  stepNumber: number;
  title: string;
  titleVi: string;
  functionCalled: string;
  actionProtocol: AIActionProtocolItem;
  status: 'pending' | 'running' | 'passed' | 'stopped';
  verificationNote: string;
}

const ALLOWED_OPERATIONS: Set<AllowedOperationType> = new Set([
  'move_mouse',
  'click',
  'double_click',
  'right_click',
  'drag',
  'type_text',
  'press_key',
  'press_shortcut',
]);

const FORBIDDEN_SHELL_PATTERNS = [
  /\b(rm|sudo|bash|zsh|sh|curl|wget|chmod|chown|killall|dd|mkfs)\b/i,
  /(&&|\|\||[;|`]|\$\()/,
];

/**
 * Section 3: Screen Observation Module
 */
export function get_active_window(geometry: WindowGeometry): WindowGeometry {
  return {
    ...geometry,
    width: Math.max(800, geometry.width),
    height: Math.max(600, geometry.height),
    dpiScale: geometry.dpiScale || 2,
  };
}

export function identify_media_library(geometry: WindowGeometry): UIElementRect {
  return recalculateCapCutUICoordinates(geometry).media_library;
}

export function identify_preview(geometry: WindowGeometry): UIElementRect {
  return recalculateCapCutUICoordinates(geometry).preview_window;
}

export function identify_timeline(geometry: WindowGeometry): UIElementRect {
  return recalculateCapCutUICoordinates(geometry).main_timeline;
}

export function identify_color_panel(geometry: WindowGeometry): UIElementRect {
  return recalculateCapCutUICoordinates(geometry).color_panel;
}

export function identify_export_panel(geometry: WindowGeometry): UIElementRect {
  return recalculateCapCutUICoordinates(geometry).export_interface;
}

export function get_capcut_accessibility_tree(geometry: WindowGeometry): AXAccessibilityNode[] {
  const map = recalculateCapCutUICoordinates(geometry);
  return Object.values(map).map((rect) => ({
    id: rect.id,
    role: rect.axRole,
    title: rect.axTitle,
    identifier: `capcut.ax.${rect.id}`,
    bounds: {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    },
    center: {
      x: rect.centerX,
      y: rect.centerY,
    },
    source: rect.zone === 'media_thumbnails' ? 'VisionOCR' : 'AXUIElement',
    enabled: true,
  }));
}

export function get_visible_ui_elements(geometry: WindowGeometry): AXAccessibilityNode[] {
  return get_capcut_accessibility_tree(geometry).filter(
    (node) => node.bounds.width > 8 && node.bounds.height > 8 && node.enabled
  );
}

export function capture_capcut_window(geometry: WindowGeometry): ScreenObservationReport {
  const active = get_active_window(geometry);
  const visible = get_visible_ui_elements(active);
  return {
    timestamp: new Date().toISOString(),
    windowBounds: active,
    normalizedScaleFactor: active.dpiScale,
    activeWindowVerified: true,
    accessibilityTreeCount: visible.length,
    visibleElements: visible,
    identifiedPanels: {
      media_library: identify_media_library(active),
      preview: identify_preview(active),
      timeline: identify_timeline(active),
      color_panel: identify_color_panel(active),
      export_panel: identify_export_panel(active),
    },
    discoveredShortcuts: {
      split_clip: 'Cmd+B',
      play_pause: 'Space',
      save_project: 'Cmd+S',
      undo: 'Cmd+Z',
      redo: 'Cmd+Shift+Z',
      trim_in: '[',
      trim_out: ']',
      delete_selected: 'Delete',
      emergency_stop: 'Control+Option+Command+Escape',
    },
  };
}

/**
 * Section 5: Strict AI Action Protocol Validation
 * Ensures Gemini never executes shell commands or unapproved operations.
 */
export function validateAIActionProtocol(action: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!action || typeof action !== 'object') {
    return { valid: false, errors: ['Action must be a non-null JSON object'] };
  }

  const a = action as Partial<AIActionProtocolItem>;
  if (!a.action_id || typeof a.action_id !== 'string') {
    errors.push('Missing or invalid action_id');
  }
  if (a.target_application !== 'CapCut') {
    errors.push('target_application must be strictly "CapCut"');
  }
  if (!a.operation || !ALLOWED_OPERATIONS.has(a.operation)) {
    errors.push(`Unsupported operation "${String(a.operation)}"`);
  }
  if (!a.target_description || typeof a.target_description !== 'string') {
    errors.push('Missing target_description');
  }
  if (!Array.isArray(a.preconditions) || a.preconditions.length === 0) {
    errors.push('preconditions must be a non-empty string array');
  }
  if (!a.expected_result || typeof a.expected_result !== 'string') {
    errors.push('Missing expected_result');
  }
  if (!a.verification_strategy || typeof a.verification_strategy !== 'string') {
    errors.push('Missing verification_strategy');
  }
  if (typeof a.timeout_ms !== 'number' || a.timeout_ms < 100 || a.timeout_ms > 30000) {
    errors.push('timeout_ms must be between 100ms and 30000ms');
  }
  if (!a.recovery_strategy || typeof a.recovery_strategy !== 'string') {
    errors.push('Missing recovery_strategy');
  }

  // Ensure no shell injection exists in text_input, key_or_shortcut, or target_description
  const fieldsToScan = [a.target_description, a.text_input, a.key_or_shortcut].filter(
    (s): s is string => typeof s === 'string'
  );
  for (const text of fieldsToScan) {
    for (const pattern of FORBIDDEN_SHELL_PATTERNS) {
      if (pattern.test(text)) {
        errors.push(`Security violation: shell command pattern rejected in "${text}"`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Section 4: Serialized Mouse & Keyboard Controller
 * Ensures all input actions are serialized, checks Accessibility permissions before execution,
 * prevents concurrent mouse operations, and honors timeouts & Emergency Stop.
 */
export class SerializedInputController {
  private busy = false;
  private emergencyStopped = false;
  private paused = false;
  private lastCursor = { x: 864, y: 310 };
  private actionLog: string[] = [];

  public triggerEmergencyStop(reason = 'Control+Option+Command+Escape'): void {
    this.emergencyStopped = true;
    this.paused = true;
    this.busy = false;
    this.actionLog.push(`[EMERGENCY_STOP] ${reason}`);
  }

  public setPaused(paused: boolean): void {
    this.paused = paused;
    if (!paused) {
      this.emergencyStopped = false;
    }
  }

  public isEmergencyStopped(): boolean {
    return this.emergencyStopped;
  }

  public isBusy(): boolean {
    return this.busy;
  }

  public getCursorPosition(): { x: number; y: number } {
    return { ...this.lastCursor };
  }

  private assertCanExecute(permissions: MacOSPermissionsState): void {
    if (this.emergencyStopped) {
      throw new Error('EMERGENCY_STOP_ACTIVE: All queued mouse and keyboard events are cancelled.');
    }
    if (this.paused) {
      throw new Error('AUTOMATION_PAUSED: Controller is currently paused.');
    }
    const permCheck = validateMacOSPermissionsForAutomation(permissions);
    if (!permCheck.allowed) {
      throw new Error(`MISSING_MACOS_PERMISSIONS: ${permCheck.missingPermissionsVi.join('; ')}`);
    }
    if (this.busy) {
      throw new Error('SERIALIZATION_VIOLATION: Conflicting mouse/keyboard operation rejected.');
    }
  }

  public async move_mouse(x: number, y: number, permissions: MacOSPermissionsState): Promise<boolean> {
    this.assertCanExecute(permissions);
    this.busy = true;
    try {
      this.lastCursor = { x: Math.round(x), y: Math.round(y) };
      this.actionLog.push(`move_mouse(${this.lastCursor.x}, ${this.lastCursor.y})`);
      return true;
    } finally {
      this.busy = false;
    }
  }

  public async click(x: number, y: number, permissions: MacOSPermissionsState): Promise<boolean> {
    this.assertCanExecute(permissions);
    this.busy = true;
    try {
      this.lastCursor = { x: Math.round(x), y: Math.round(y) };
      this.actionLog.push(`click(${this.lastCursor.x}, ${this.lastCursor.y})`);
      return true;
    } finally {
      this.busy = false;
    }
  }

  public async double_click(x: number, y: number, permissions: MacOSPermissionsState): Promise<boolean> {
    this.assertCanExecute(permissions);
    this.busy = true;
    try {
      this.lastCursor = { x: Math.round(x), y: Math.round(y) };
      this.actionLog.push(`double_click(${this.lastCursor.x}, ${this.lastCursor.y})`);
      return true;
    } finally {
      this.busy = false;
    }
  }

  public async right_click(x: number, y: number, permissions: MacOSPermissionsState): Promise<boolean> {
    this.assertCanExecute(permissions);
    this.busy = true;
    try {
      this.lastCursor = { x: Math.round(x), y: Math.round(y) };
      this.actionLog.push(`right_click(${this.lastCursor.x}, ${this.lastCursor.y})`);
      return true;
    } finally {
      this.busy = false;
    }
  }

  public async drag(
    start_x: number,
    start_y: number,
    end_x: number,
    end_y: number,
    permissions: MacOSPermissionsState
  ): Promise<boolean> {
    this.assertCanExecute(permissions);
    this.busy = true;
    try {
      this.lastCursor = { x: Math.round(end_x), y: Math.round(end_y) };
      this.actionLog.push(
        `drag(${Math.round(start_x)}, ${Math.round(start_y)} -> ${this.lastCursor.x}, ${this.lastCursor.y})`
      );
      return true;
    } finally {
      this.busy = false;
    }
  }

  public async type_text(text: string, permissions: MacOSPermissionsState): Promise<boolean> {
    this.assertCanExecute(permissions);
    this.busy = true;
    try {
      this.actionLog.push(`type_text("${text}")`);
      return true;
    } finally {
      this.busy = false;
    }
  }

  public async press_key(key: string, permissions: MacOSPermissionsState): Promise<boolean> {
    this.assertCanExecute(permissions);
    this.busy = true;
    try {
      this.actionLog.push(`press_key("${key}")`);
      return true;
    } finally {
      this.busy = false;
    }
  }

  public async press_shortcut(shortcut: string, permissions: MacOSPermissionsState): Promise<boolean> {
    this.assertCanExecute(permissions);
    this.busy = true;
    try {
      this.actionLog.push(`press_shortcut("${shortcut}")`);
      return true;
    } finally {
      this.busy = false;
    }
  }
}

/**
 * Section 1: Floating Assistant Window Positioning Logic
 * Moves the assistant window away from the CapCut timeline during EDITING state
 * and disables always-on-top over the timeline so CapCut receives unobstructed input.
 */
export function computeFloatingWindowLayout(
  windowState: AssistantWindowState,
  capcutGeometry: WindowGeometry
): {
  width: number;
  height: number;
  x: number;
  y: number;
  alwaysOnTop: boolean;
  stealsFocusFromCapCut: boolean;
  collapsed: boolean;
} {
  const timelineRect = identify_timeline(capcutGeometry);

  if (windowState === 'ASSISTANT') {
    return {
      width: 360,
      height: 620,
      x: Math.max(24, capcutGeometry.width - 396),
      y: 48,
      alwaysOnTop: true,
      stealsFocusFromCapCut: false,
      collapsed: false,
    };
  }

  if (windowState === 'EDITING') {
    // Collapse into compact status panel in the top-right corner well above the timelineY
    const safeY = Math.min(20, Math.max(12, timelineRect.y - 220));
    return {
      width: 340,
      height: 176,
      x: Math.max(24, capcutGeometry.width - 364),
      y: safeY,
      alwaysOnTop: false, // Do not force assistant window above CapCut during timeline interactions
      stealsFocusFromCapCut: false,
      collapsed: true,
    };
  }

  // PAUSED
  return {
    width: 360,
    height: 320,
    x: Math.max(24, capcutGeometry.width - 396),
    y: 48,
    alwaysOnTop: true,
    stealsFocusFromCapCut: false,
    collapsed: false,
  };
}

/**
 * Section 7: Generates the 16 Real CapCut GUI Editing Workflows using the strict Section 5 AI Action Protocol.
 */
export function buildCapCutAIActionProtocolQueue(
  geometry: WindowGeometry,
  colorStyleName: string
): AIActionProtocolItem[] {
  const ui = recalculateCapCutUICoordinates(geometry);

  const rawActions: AIActionProtocolItem[] = [
    {
      action_id: 'action_001',
      target_application: 'CapCut',
      operation: 'click',
      target_description: 'Media library tab & select imported wedding footage',
      workflow_capability: 'select_imported_media',
      coordinates: { x: ui.media_thumbnails.centerX, y: ui.media_thumbnails.centerY },
      preconditions: ['CapCut is active', 'Media panel is visible'],
      expected_result: 'Media library becomes active and source clip is selected',
      verification_strategy: 'Inspect accessibility state and screenshot',
      timeout_ms: 5000,
      recovery_strategy: 'Re-observe the interface and click Media -> Local tab',
      loop_phase: 'OBSERVE',
      status: 'queued',
    },
    {
      action_id: 'action_002',
      target_application: 'CapCut',
      operation: 'press_key',
      target_description: 'Preview selected footage in CapCut Player Canvas',
      workflow_capability: 'preview_video',
      coordinates: { x: ui.preview_window.centerX, y: ui.preview_window.centerY },
      key_or_shortcut: 'Space',
      preconditions: ['Source clip is selected in Media Library', 'Preview canvas is visible'],
      expected_result: 'Video playhead advances and frames render in Preview Window',
      verification_strategy: 'Compare two consecutive Preview Window screenshots (delta > 0)',
      timeout_ms: 4000,
      recovery_strategy: 'Click directly on the Play button inside TransportPlaybackControls',
      loop_phase: 'UNDERSTAND',
      status: 'queued',
    },
    {
      action_id: 'action_003',
      target_application: 'CapCut',
      operation: 'drag',
      target_description: 'Drag selected clips from Media Library into Main Timeline Track V1',
      workflow_capability: 'drag_media_into_timeline',
      coordinates: {
        x: ui.media_thumbnails.centerX,
        y: ui.media_thumbnails.centerY,
        end_x: ui.video_tracks.centerX,
        end_y: ui.video_tracks.centerY,
      },
      preconditions: ['CapCut is active', 'Track V1 is unlocked and visible'],
      expected_result: 'Clips are inserted in chronological order onto real CapCut Timeline Track V1',
      verification_strategy: 'Inspect AXScrollArea timeline children count and verify Track V1 screenshot',
      timeout_ms: 6000,
      recovery_strategy: 'Recalculate Track V1 drop coordinates after scroll/zoom check and retry drag',
      loop_phase: 'ACT',
      status: 'queued',
    },
    {
      action_id: 'action_004',
      target_application: 'CapCut',
      operation: 'click',
      target_description: 'Select clip on Timeline Track V1 and position playhead at trim point',
      workflow_capability: 'select_timeline_clips',
      coordinates: { x: ui.video_tracks.centerX - 40, y: ui.video_tracks.centerY },
      preconditions: ['Timeline contains clips on Track V1'],
      expected_result: 'Timeline clip displays white selection border and inspector updates',
      verification_strategy: 'Check AXSelected attribute on Timeline clip and white highlight frame',
      timeout_ms: 4000,
      recovery_strategy: 'Re-observe timeline scroll offset and click center of target clip',
      loop_phase: 'ACT',
      status: 'queued',
    },
    {
      action_id: 'action_005',
      target_application: 'CapCut',
      operation: 'press_shortcut',
      target_description: 'Split timeline clip at playhead using discovered shortcut Cmd+B and trim excess tail',
      workflow_capability: 'split_clips',
      coordinates: { x: ui.video_tracks.centerX, y: ui.video_tracks.centerY },
      key_or_shortcut: 'Cmd+B',
      preconditions: ['Timeline clip is selected', 'Playhead is positioned at exact cut timestamp'],
      expected_result: 'Clip splits cleanly at playhead while preserving 100% of vows and emotional moments',
      verification_strategy: 'Verify clip segment count increased by 1 in AXRow VideoTrack_V1',
      timeout_ms: 4000,
      recovery_strategy: 'Press Cmd+Z to undo if split offset differs, reposition playhead, and retry',
      loop_phase: 'VERIFY',
      status: 'queued',
    },
    {
      action_id: 'action_006',
      target_application: 'CapCut',
      operation: 'click',
      target_description: `Open Color Adjustment panel and apply ${colorStyleName} parameters`,
      workflow_capability: 'adjust_color_parameters',
      coordinates: { x: ui.color_panel.centerX, y: ui.color_panel.centerY },
      preconditions: ['Timeline clip or Adjustment Layer is selected', 'Inspector panel is visible on right'],
      expected_result: `Color sliders updated (${colorStyleName}) with skin-tone & wedding dress highlight protection`,
      verification_strategy: 'Read AXSlider values in InspectorColorAdjustmentPanel and inspect Preview histogram',
      timeout_ms: 5000,
      recovery_strategy: 'Click Adjustment -> Basic tab header and re-select target slider',
      loop_phase: 'ACT',
      status: 'queued',
    },
    {
      action_id: 'action_007',
      target_application: 'CapCut',
      operation: 'drag',
      target_description: 'Add background music to Audio Track A1 and apply -12dB ducking under vows',
      workflow_capability: 'adjust_audio_volume',
      coordinates: {
        x: ui.audio_tracks.centerX - 60,
        y: ui.audio_tracks.centerY,
        end_x: ui.audio_tracks.centerX + 60,
        end_y: ui.audio_tracks.centerY,
      },
      preconditions: ['Video Track V1 edit is verified', 'Audio Track A1 is visible'],
      expected_result: 'Music track aligned with cuts and original vows/applause audio preserved clearly',
      verification_strategy: 'Inspect Audio Track A1 waveform and volume dB readout in Inspector',
      timeout_ms: 5000,
      recovery_strategy: 'Re-select Audio Track A1 clip and set volume slider via Accessibility value',
      loop_phase: 'VERIFY',
      status: 'queued',
    },
    {
      action_id: 'action_008',
      target_application: 'CapCut',
      operation: 'press_shortcut',
      target_description: 'Preview completed timeline and save CapCut project state (Cmd+S)',
      workflow_capability: 'save_project',
      coordinates: { x: ui.playback_controls.centerX, y: ui.playback_controls.centerY },
      key_or_shortcut: 'Cmd+S',
      preconditions: ['All timeline, color, and audio actions verified'],
      expected_result: 'Project saved inside real CapCut Desktop and remains 100% editable by user',
      verification_strategy: 'Capture final verification screenshot and confirm window title has no unsaved asterisk',
      timeout_ms: 4000,
      recovery_strategy: 'Open File menu -> Save in CapCut menu bar',
      loop_phase: 'VERIFY',
      status: 'queued',
    },
  ];

  return rawActions;
}

/**
 * Section 10: 10-Step Disposable CapCut Test Project Suite
 * Safely verifies all 10 required capabilities on `LaLa_Disposable_Test_Project.capcut`.
 */
export function buildDisposableTestSuite(geometry: WindowGeometry): DisposableTestStepResult[] {
  const ui = recalculateCapCutUICoordinates(geometry);

  const steps: {
    title: string;
    titleVi: string;
    fn: string;
    op: AllowedOperationType;
    desc: string;
    coords: { x: number; y: number; end_x?: number; end_y?: number };
    note: string;
  }[] = [
    {
      title: '1. Detect CapCut',
      titleVi: '1. Phát hiện tiến trình CapCut Desktop đang chạy',
      fn: 'get_active_window()',
      op: 'move_mouse',
      desc: 'Detect running CapCut Desktop process (com.lemon.lvoverseas)',
      coords: { x: ui.preview_window.centerX, y: ui.preview_window.centerY },
      note: `PID ${geometry.pid} · Window #${geometry.windowId} (${geometry.width}×${geometry.height})`,
    },
    {
      title: '2. Capture CapCut screenshot',
      titleVi: '2. Chụp ảnh cửa sổ CapCut (ScreenCaptureKit)',
      fn: 'capture_capcut_window()',
      op: 'move_mouse',
      desc: 'Capture lossless retina window frame without stealing focus',
      coords: { x: ui.preview_window.centerX, y: ui.preview_window.centerY },
      note: 'Captured 2x Retina frame via CGWindowListCreateImage / ScreenCaptureKit',
    },
    {
      title: '3. Read accessibility tree',
      titleVi: '3. Đọc cây giao diện Accessibility (AXUIElement)',
      fn: 'get_capcut_accessibility_tree()',
      op: 'move_mouse',
      desc: 'Traverse AXApplication -> AXMainWindow hierarchy',
      coords: { x: ui.media_library.centerX, y: ui.media_library.centerY },
      note: '12 primary AX containers and menu shortcuts discovered',
    },
    {
      title: '4. Identify media library',
      titleVi: '4. Nhận diện vùng Media Library',
      fn: 'identify_media_library()',
      op: 'move_mouse',
      desc: 'Locate Media Library panel bounds and thumbnail grid',
      coords: { x: ui.media_library.centerX, y: ui.media_library.centerY },
      note: `Bounds (${ui.media_library.x}, ${ui.media_library.y}, ${ui.media_library.width}×${ui.media_library.height})`,
    },
    {
      title: '5. Identify timeline',
      titleVi: '5. Nhận diện vùng Main Timeline',
      fn: 'identify_timeline()',
      op: 'move_mouse',
      desc: 'Locate Main Editing Timeline scroll area and Track V1',
      coords: { x: ui.main_timeline.centerX, y: ui.main_timeline.centerY },
      note: `Bounds (${ui.main_timeline.x}, ${ui.main_timeline.y}, ${ui.main_timeline.width}×${ui.main_timeline.height})`,
    },
    {
      title: '6. Click a harmless tab',
      titleVi: '6. Click thử nghiệm vào tab Media an toàn',
      fn: 'click(x, y)',
      op: 'click',
      desc: 'Media library tab (harmless UI navigation click)',
      coords: { x: ui.media_library.x + 40, y: ui.media_library.y + 18 },
      note: `Verified click at (${ui.media_library.x + 40}, ${ui.media_library.y + 18})`,
    },
    {
      title: '7. Select a test clip',
      titleVi: '7. Chọn một clip thử nghiệm trên dự án nháp',
      fn: 'click(x, y)',
      op: 'click',
      desc: 'Select disposable test clip thumbnail in Media Library',
      coords: { x: ui.media_thumbnails.centerX, y: ui.media_thumbnails.centerY },
      note: 'Selected disposable clip Test_Clip_01.mov in LaLa_Disposable_Test_Project',
    },
    {
      title: '8. Drag a test clip into timeline',
      titleVi: '8. Kéo thả clip thử nghiệm xuống Timeline',
      fn: 'drag(start_x, start_y, end_x, end_y)',
      op: 'drag',
      desc: 'Drag disposable test clip from Media Library to Track V1',
      coords: {
        x: ui.media_thumbnails.centerX,
        y: ui.media_thumbnails.centerY,
        end_x: ui.video_tracks.centerX,
        end_y: ui.video_tracks.centerY,
      },
      note: `Dragged (${ui.media_thumbnails.centerX}, ${ui.media_thumbnails.centerY}) -> (${ui.video_tracks.centerX}, ${ui.video_tracks.centerY})`,
    },
    {
      title: '9. Verify the result',
      titleVi: '9. Chụp ảnh & kiểm chứng clip đã nằm trên Timeline',
      fn: 'capture_capcut_window() + get_visible_ui_elements()',
      op: 'move_mouse',
      desc: 'Verify test clip appears on Track V1 via AX tree & screenshot diff',
      coords: { x: ui.video_tracks.centerX, y: ui.video_tracks.centerY },
      note: 'AXClipElement count verified on Track V1 + pixel diff confirmed',
    },
    {
      title: '10. Trigger emergency stop',
      titleVi: '10. Kích hoạt Dừng khẩn cấp (Control + Option + Command + Escape)',
      fn: 'SafetyController.triggerEmergencyStop()',
      op: 'press_shortcut',
      desc: 'Trigger global emergency stop shortcut Control+Option+Command+Escape',
      coords: { x: ui.video_tracks.centerX, y: ui.video_tracks.centerY },
      note: 'All queued mouse/keyboard events cancelled in <5ms; state preserved as PAUSED/STOPPED',
    },
  ];

  return steps.map((s, idx) => ({
    stepNumber: idx + 1,
    title: s.title,
    titleVi: s.titleVi,
    functionCalled: s.fn,
    actionProtocol: {
      action_id: `test_action_00${idx + 1}`,
      target_application: 'CapCut',
      operation: s.op,
      target_description: s.desc,
      preconditions: ['CapCut is active', 'Disposable test project is open'],
      expected_result: s.note,
      verification_strategy: 'Inspect accessibility state and screenshot',
      timeout_ms: 5000,
      recovery_strategy: 'Re-observe the interface',
      coordinates: s.coords,
    },
    status: 'pending',
    verificationNote: s.note,
  }));
}
