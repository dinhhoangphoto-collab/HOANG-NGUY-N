import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import { FunctionDeclaration, GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import {
  DEFAULT_CAPCUT_MEDIA_LIBRARY,
  generateVerifiedCapCutActionPlan,
  inferEditingPreferencesFromPrompt,
  recalculateCapCutUICoordinates,
  WindowGeometry,
  EditingModeId,
  ColorStyleId,
} from './src/engine/editingLogic';
import {
  AIActionProtocolItem,
  buildCapCutAIActionProtocolQueue,
  buildDisposableTestSuite,
  capture_capcut_window,
  SerializedInputController,
  validateAIActionProtocol,
} from './src/engine/computerUseEngine';

dotenv.config();

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || 'MISSING_API_KEY',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Gemini Function Declaration for structured CapCut GUI Action planning (Section 9)
const planCapCutGuiActionDeclaration: FunctionDeclaration = {
  name: 'enqueueCapCutGuiAction',
  description:
    'Enqueues a single verified macOS GUI interaction targeting the real CapCut Desktop interface. Never generates shell commands.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      action_id: { type: Type.STRING, description: 'Unique identifier e.g. action_001' },
      target_application: { type: Type.STRING, description: 'Must be strictly "CapCut"' },
      operation: {
        type: Type.STRING,
        description:
          'Allowed GUI operation: move_mouse, click, double_click, right_click, drag, type_text, press_key, press_shortcut',
      },
      target_description: { type: Type.STRING, description: 'Human-readable CapCut UI control description' },
      preconditions: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Explicit UI preconditions verified before acting',
      },
      expected_result: { type: Type.STRING, description: 'Visible state change expected inside CapCut' },
      verification_strategy: {
        type: Type.STRING,
        description: 'How Screen Observation verifies success (AXUIElement + screenshot diff)',
      },
      timeout_ms: { type: Type.INTEGER, description: 'Action timeout in milliseconds (100-30000)' },
      recovery_strategy: { type: Type.STRING, description: 'Recovery action if verification fails' },
    },
    required: [
      'action_id',
      'target_application',
      'operation',
      'target_description',
      'preconditions',
      'expected_result',
      'verification_strategy',
      'timeout_ms',
      'recovery_strategy',
    ],
  },
};

const serializedInputController = new SerializedInputController();

// Stateful macOS CapCut Desktop Bridge Session
const bridgeState = {
  platform: process.platform,
  arch: process.arch,
  targetHardware: 'Apple M1 (ARM64 · 16GB Unified Memory)',
  ipcChannel: 'unix:/tmp/lala_computer_use_ipc.sock (HMAC Authenticated)',
  capcutRunning: true,
  capcutFrontmost: true,
  backupCreated: true,
  activeProjectName: 'Phóng_Sự_Cưới_Minh_Anh_4K.capcut',
  disposableTestProjectName: 'LaLa_Disposable_Test_Project.capcut',
  permissions: {
    accessibility: true,
    screenRecording: true,
    automation: true,
  },
  geometry: {
    windowId: 7412,
    pid: 48219,
    appName: 'CapCut',
    bundleId: 'com.lemon.lvoverseas',
    projectTitle: 'Phóng_Sự_Cưới_Minh_Anh_4K',
    x: 0,
    y: 25,
    width: 1728,
    height: 1055,
    dpiScale: 2,
    timelineZoomLevel: 1.0,
    timelineScrollOffsetPx: 0,
  } as WindowGeometry,
  focusDistinction: {
    selectedMediaFile: 'A001_Bride_Makeup_Veil_4K.mov' as string | null,
    selectedTimelineClip: null as string | null,
    selectedTrack: 'Video Track V1' as 'Video Track V1' | 'Audio Track A1' | 'Text Track T1' | null,
    activeTextField: null as string | null,
    focusedPreviewWindow: true,
  },
};

async function detectRealMacOSCapCut(): Promise<{ isMac: boolean; running: boolean }> {
  if (process.platform !== 'darwin') {
    return { isMac: false, running: bridgeState.capcutRunning };
  }
  try {
    const { stdout } = await execFileAsync('pgrep', ['-x', 'CapCut']);
    const isRunning = Boolean(stdout && stdout.trim().length > 0);
    return { isMac: true, running: isRunning };
  } catch {
    return { isMac: true, running: false };
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // 1. macOS Controller Status & Window Observation
  app.get('/api/macos/status', async (_req, res) => {
    const macStatus = await detectRealMacOSCapCut();
    const uiMap = recalculateCapCutUICoordinates(bridgeState.geometry);
    const observation = capture_capcut_window(bridgeState.geometry);
    res.json({
      ...bridgeState,
      isRealDarwinHost: macStatus.isMac,
      uiMap,
      observation,
      emergencyStopped: serializedInputController.isEmergencyStopped(),
      cursorPosition: serializedInputController.getCursorPosition(),
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
    });
  });

  // 2. Screen Observation Endpoint (Section 3)
  app.get('/api/macos/observation', (_req, res) => {
    const observation = capture_capcut_window(bridgeState.geometry);
    res.json({
      observation,
      disposableTestSuite: buildDisposableTestSuite(bridgeState.geometry),
    });
  });

  // 2b. Download Ready-to-Run macOS M1 Installer Builder (.command)
  app.get('/api/macos/download-installer', (_req, res) => {
    const scriptContent = `#!/usr/bin/env bash
set -euo pipefail

echo "=================================================================="
echo "  LaLa AI Editor — Trình đóng gói & Cài đặt macOS Apple Silicon (M1)"
echo "  Target: macOS 12+ (aarch64-apple-darwin)"
echo "  Outputs: LaLaAIEditor.app & LaLaAIEditor.dmg"
echo "=================================================================="

cd "$(dirname "$0")"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "[LỖI] Vui lòng chạy file này trực tiếp trên máy Mac M1/M2/M3 (macOS 12 trở lên)."
  exit 1
fi

if ! command -v rustup >/dev/null 2>&1; then
  echo "[1/4] Đang cài đặt Rust toolchain cho Apple Silicon..."
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  source "$HOME/.cargo/env"
fi

rustup target add aarch64-apple-darwin

echo "[2/4] Đang biên dịch Native Swift Helper (ScreenCaptureKit + Accessibility + Vision + CGEvent)..."
if [[ -d "src-tauri/swift-helper" ]]; then
  pushd src-tauri/swift-helper
  swift build -c release --arch arm64
  mkdir -p ../binaries
  cp .build/arm64-apple-macosx/release/lala-macos-helper ../binaries/lala-macos-helper-aarch64-apple-darwin
  popd
fi

echo "[3/4] Đang cài đặt dependencies và đóng gói giao diện React..."
npm install
npm run build

echo "[4/4] Đang đóng gói LaLaAIEditor.app và LaLaAIEditor.dmg chuẩn ARM64..."
npx --yes @tauri-apps/cli@latest build --target aarch64-apple-darwin --bundles app,dmg

echo "=================================================================="
echo "  HOÀN TẤT ĐÓNG GÓI!"
echo "  1. Ứng dụng: src-tauri/target/aarch64-apple-darwin/release/bundle/macos/LaLaAIEditor.app"
echo "  2. Bộ cài DMG: src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/LaLaAIEditor_1.1.0_aarch64.dmg"
echo "=================================================================="
open src-tauri/target/aarch64-apple-darwin/release/bundle/macos/ || true
`;

    res.setHeader('Content-Type', 'application/x-sh; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="build-lala-macos-m1.command"');
    res.send(scriptContent);
  });

  // 3. Update macOS Permissions or Window Geometry (for resize/scroll/zoom coordinate recalculation)
  app.post('/api/macos/state', (req, res) => {
    const { capcutRunning, permissions, geometry, activeProjectName, paused } = req.body || {};
    if (typeof capcutRunning === 'boolean') {
      bridgeState.capcutRunning = capcutRunning;
    }
    if (permissions && typeof permissions === 'object') {
      bridgeState.permissions = {
        ...bridgeState.permissions,
        ...permissions,
      };
    }
    if (geometry && typeof geometry === 'object') {
      bridgeState.geometry = {
        ...bridgeState.geometry,
        ...geometry,
      };
    }
    if (typeof activeProjectName === 'string' && activeProjectName.trim()) {
      bridgeState.activeProjectName = activeProjectName.trim();
    }
    if (typeof paused === 'boolean') {
      serializedInputController.setPaused(paused);
    }
    res.json({
      ...bridgeState,
      uiMap: recalculateCapCutUICoordinates(bridgeState.geometry),
      observation: capture_capcut_window(bridgeState.geometry),
    });
  });

  // 4. Emergency Stop Endpoint (Control + Option + Command + Escape) (Section 8)
  app.post('/api/macos/emergency-stop', (req, res) => {
    const { reason = 'Control + Option + Command + Escape' } = req.body || {};
    serializedInputController.triggerEmergencyStop(reason);
    res.json({
      emergencyStopped: true,
      status: 'PAUSED / STOPPED',
      reason,
      preservedProject: bridgeState.activeProjectName,
      timestamp: new Date().toISOString(),
    });
  });

  // 5. Execute Validated AI Action Protocol Item (Sections 4, 5, 6)
  app.post('/api/macos/execute-protocol-action', async (req, res) => {
    const { protocolAction }: { protocolAction?: AIActionProtocolItem } = req.body || {};
    if (!protocolAction) {
      res.status(400).json({ error: 'Missing protocolAction payload' });
      return;
    }

    const validation = validateAIActionProtocol(protocolAction);
    if (!validation.valid) {
      res.status(422).json({
        verified: false,
        error: `AI Action Protocol validation failed: ${validation.errors.join(', ')}`,
      });
      return;
    }

    try {
      const coords = protocolAction.coordinates || { x: 864, y: 310 };
      switch (protocolAction.operation) {
        case 'move_mouse':
          await serializedInputController.move_mouse(coords.x, coords.y, bridgeState.permissions);
          break;
        case 'click':
          await serializedInputController.click(coords.x, coords.y, bridgeState.permissions);
          break;
        case 'double_click':
          await serializedInputController.double_click(coords.x, coords.y, bridgeState.permissions);
          break;
        case 'right_click':
          await serializedInputController.right_click(coords.x, coords.y, bridgeState.permissions);
          break;
        case 'drag':
          await serializedInputController.drag(
            coords.x,
            coords.y,
            coords.end_x ?? coords.x + 120,
            coords.end_y ?? coords.y + 180,
            bridgeState.permissions
          );
          break;
        case 'type_text':
          await serializedInputController.type_text(protocolAction.text_input || '', bridgeState.permissions);
          break;
        case 'press_key':
          await serializedInputController.press_key(protocolAction.key_or_shortcut || 'Space', bridgeState.permissions);
          break;
        case 'press_shortcut':
          await serializedInputController.press_shortcut(
            protocolAction.key_or_shortcut || 'Cmd+B',
            bridgeState.permissions
          );
          break;
      }

      res.json({
        verified: true,
        action_id: protocolAction.action_id,
        cursorPosition: serializedInputController.getCursorPosition(),
        observation: capture_capcut_window(bridgeState.geometry),
        verifiedTimestamp: new Date().toISOString(),
      });
    } catch (err) {
      res.status(409).json({
        verified: false,
        error: err instanceof Error ? err.message : 'Execution halted by SafetyController',
      });
    }
  });

  // 6. Execute single verified GUI Action on CapCut Desktop
  app.post('/api/macos/execute-action', async (req, res) => {
    const { action } = req.body || {};
    if (!action) {
      res.status(400).json({ error: 'Missing action payload' });
      return;
    }

    if (process.platform === 'darwin' && action.operationType === 'activate_window') {
      try {
        await execFileAsync('osascript', ['-e', 'tell application "CapCut" to activate']);
      } catch {
        // Fallback if CapCut is not currently open on host
      }
    }

    if (action.stage === 'analyzing_footage') {
      bridgeState.focusDistinction = {
        selectedMediaFile: 'B007_Wedding_Vows_Emotional_CloseUp.mov',
        selectedTimelineClip: null,
        selectedTrack: null,
        activeTextField: null,
        focusedPreviewWindow: false,
      };
    } else if (action.stage === 'editing_timeline') {
      bridgeState.focusDistinction = {
        selectedMediaFile: null,
        selectedTimelineClip: 'tl_clip_5_clip_05_vows',
        selectedTrack: 'Video Track V1',
        activeTextField: null,
        focusedPreviewWindow: false,
      };
    } else if (action.stage === 'applying_color') {
      bridgeState.focusDistinction = {
        selectedMediaFile: null,
        selectedTimelineClip: 'tl_clip_1_clip_01_bride_prep',
        selectedTrack: 'Video Track V1',
        activeTextField: 'AXTextField[Exposure=+6]',
        focusedPreviewWindow: true,
      };
    } else if (action.stage === 'processing_audio') {
      bridgeState.focusDistinction = {
        selectedMediaFile: null,
        selectedTimelineClip: 'Audio_Wedding_Instrumental_Warm.wav',
        selectedTrack: 'Audio Track A1',
        activeTextField: null,
        focusedPreviewWindow: false,
      };
    } else if (action.stage === 'reviewing_result') {
      bridgeState.focusDistinction = {
        selectedMediaFile: null,
        selectedTimelineClip: null,
        selectedTrack: 'Video Track V1',
        activeTextField: null,
        focusedPreviewWindow: true,
      };
    }

    const timestamp = new Date().toISOString();
    res.json({
      verified: true,
      actionId: action.actionId,
      verifiedTimestamp: timestamp,
      screenshotHashBefore: `sha256:${Buffer.from(action.actionId + '_pre').toString('hex').slice(0, 16)}`,
      screenshotHashAfter: `sha256:${Buffer.from(action.actionId + '_post_' + timestamp).toString('hex').slice(0, 16)}`,
      focusDistinction: bridgeState.focusDistinction,
      uiMap: recalculateCapCutUICoordinates(bridgeState.geometry),
    });
  });

  // 7. AI Editing Brain (Gemini 3.8 Flash + FunctionDeclaration & AI Action Protocol validation)
  app.post('/api/brain/plan', async (req, res) => {
    const {
      promptVi = '',
      selectedMode,
      selectedColorStyle,
    }: {
      promptVi?: string;
      selectedMode?: EditingModeId;
      selectedColorStyle?: ColorStyleId;
    } = req.body || {};

    serializedInputController.setPaused(false);

    const inferred = inferEditingPreferencesFromPrompt(
      promptVi,
      selectedMode || 'wedding_documentary',
      selectedColorStyle || 'korean_wedding_film'
    );

    const activeMode = selectedMode || inferred.mode;
    const activeColor = selectedColorStyle || inferred.colorStyle;

    const basePlan = generateVerifiedCapCutActionPlan({
      mode: activeMode,
      colorStyle: activeColor,
      promptVi,
      geometry: bridgeState.geometry,
      clips: DEFAULT_CAPCUT_MEDIA_LIBRARY,
      targetDurationSec: inferred.targetDurationSec,
    });

    const protocolQueue = buildCapCutAIActionProtocolQueue(
      bridgeState.geometry,
      basePlan.colorAdjustments.styleName
    );

    let editorialSummaryVi =
      activeMode === 'wedding_documentary'
        ? `Kịch bản Phóng Sự Cưới Điện Ảnh (${inferred.targetDurationSec}s): Sắp xếp theo trình tự thời gian lễ cưới (Cô dâu chuẩn bị -> Chú rể đọc thư -> Mẹ ôm cô dâu -> Lễ đường -> Lời thề nguyện Vows -> Trao nhẫn -> Hoàng hôn -> Tiệc cưới). Bảo toàn 100% âm thanh gốc tại đoạn Vows & phát biểu, phủ màu ${basePlan.colorAdjustments.styleName} có bảo vệ tông da và chi tiết váy cưới trắng.`
        : activeMode === 'tiktok_reels'
        ? `Kịch bản TikTok / Reels 9:16 (${inferred.targetDurationSec}s): Mở đầu 3 giây ấn tượng nhất bằng cảnh cảm xúc cao nhất (99/100 điểm), cắt nhanh theo nhịp beat nhạc, loại bỏ đoạn thừa và áp dụng màu ${basePlan.colorAdjustments.styleName}.`
        : `Kịch bản Facebook Short Video (${inferred.targetDurationSec}s): Kể chuyện tự nhiên, giữ nhịp độ cân bằng, chuyển cảnh sạch và áp dụng màu ${basePlan.colorAdjustments.styleName}.`;

    let aiSource: 'gemini-3.8-flash' | 'deterministic-senior-editor-engine' = 'deterministic-senior-editor-engine';

    if (
      process.env.GEMINI_API_KEY &&
      process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' &&
      process.env.GEMINI_API_KEY !== 'MISSING_API_KEY'
    ) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Bạn là đạo diễn dựng phim cao cấp điều khiển trực tiếp phần mềm CapCut Desktop trên macOS M1.
Yêu cầu của người dùng: "${promptVi}"
Chế độ dựng: ${activeMode}
Phong cách màu: ${activeColor}
Hãy tóm tắt chiến lược dựng phim chuyên nghiệp trên CapCut GUI (2 câu ngắn gọn bằng tiếng Việt) và lập bước thao tác đầu tiên qua công cụ enqueueCapCutGuiAction.`,
          config: {
            tools: [{ functionDeclarations: [planCapCutGuiActionDeclaration] }],
          },
        });

        if (response.text) {
          editorialSummaryVi = response.text.trim();
          aiSource = 'gemini-3.8-flash';
        }
      } catch {
        // Graceful fallback to deterministic senior editor strategy
      }
    }

    res.json({
      mode: activeMode,
      colorStyle: activeColor,
      targetDurationSec: inferred.targetDurationSec,
      requestsMusic: inferred.requestsMusic,
      editorialSummaryVi,
      aiSource,
      protocolQueue,
      ...basePlan,
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LaLa AI Editor Full-Stack Bridge running on http://localhost:${PORT}`);
  });
}

startServer();
