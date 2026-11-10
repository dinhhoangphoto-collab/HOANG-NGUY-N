import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_CAPCUT_MEDIA_LIBRARY,
  inferEditingPreferencesFromPrompt,
  buildTimelineSequenceForMode,
  computeProtectedColorAdjustments,
  recalculateCapCutUICoordinates,
  generateVerifiedCapCutActionPlan,
  validateMacOSPermissionsForAutomation,
  WindowGeometry,
} from './editingLogic';
import {
  capture_capcut_window,
  computeFloatingWindowLayout,
  identify_timeline,
  SerializedInputController,
  validateAIActionProtocol,
  buildDisposableTestSuite,
} from './computerUseEngine';

const SAMPLE_GEOMETRY: WindowGeometry = {
  windowId: 7412,
  pid: 48219,
  appName: 'CapCut',
  bundleId: 'com.lemon.lvoverseas',
  projectTitle: 'Le_Cuoi_Minh_Anh_2026',
  x: 0,
  y: 25,
  width: 1728,
  height: 1055,
  dpiScale: 2,
  timelineZoomLevel: 1.0,
  timelineScrollOffsetPx: 0,
};

test('inferEditingPreferencesFromPrompt parses Vietnamese Wedding Documentary and Korean Film style accurately', () => {
  const prompt =
    'Dựng phóng sự cưới phong cách cinematic, màu film Hàn Quốc, cảm xúc, chuyển cảnh tự nhiên, nhạc nhẹ nhàng, thời lượng khoảng 3 phút.';
  const result = inferEditingPreferencesFromPrompt(prompt);
  assert.equal(result.mode, 'wedding_documentary');
  assert.equal(result.colorStyle, 'korean_wedding_film');
  assert.equal(result.targetDurationSec, 180);
  assert.equal(result.requestsMusic, true);
});

test('inferEditingPreferencesFromPrompt detects TikTok / Reels 9:16 mode and duration in seconds', () => {
  const prompt = 'Dựng video TikTok 9:16 cắt nhanh theo beat nhạc, màu trong trẻo khoảng 45 giây.';
  const result = inferEditingPreferencesFromPrompt(prompt);
  assert.equal(result.mode, 'tiktok_reels');
  assert.equal(result.colorStyle, 'clean_bright');
  assert.equal(result.targetDurationSec, 45);
});

test('buildTimelineSequenceForMode preserves strict wedding chronology and vows audio in Wedding Documentary mode', () => {
  const shuffled = [...DEFAULT_CAPCUT_MEDIA_LIBRARY].reverse();
  const sequence = buildTimelineSequenceForMode(shuffled, 'wedding_documentary', 'korean_wedding_film', 180);

  assert.equal(sequence.length, DEFAULT_CAPCUT_MEDIA_LIBRARY.length);
  assert.equal(sequence[0].category, 'bride_prep');
  assert.equal(sequence[1].category, 'groom_prep');
  assert.equal(sequence[sequence.length - 1].category, 'reception_speeches');

  const vowsClip = sequence.find((c) => c.category === 'wedding_vows');
  assert.ok(vowsClip, 'Wedding vows clip must never be deleted');
  assert.equal(vowsClip.ambientAudioPreserved, true);
  assert.ok(vowsClip.durationSec >= 18, 'Wedding vows clip must retain full emotional duration');
});

test('computeProtectedColorAdjustments protects white wedding dresses and natural skin tones', () => {
  const grade = computeProtectedColorAdjustments('korean_wedding_film', DEFAULT_CAPCUT_MEDIA_LIBRARY);
  assert.equal(grade.skinToneProtected, true);
  assert.equal(grade.whiteDressHighlightProtected, true);
  assert.equal(grade.sceneConsistencyLocked, true);
  assert.ok(grade.highlights <= -12, 'Highlights must be rolled off to protect white wedding dress details');
});

test('recalculateCapCutUICoordinates dynamically adapts to window resize and timeline scroll', () => {
  const initialMap = recalculateCapCutUICoordinates(SAMPLE_GEOMETRY);
  const resizedMap = recalculateCapCutUICoordinates({
    ...SAMPLE_GEOMETRY,
    width: 1440,
    height: 900,
    timelineScrollOffsetPx: 120,
  });

  assert.notEqual(initialMap.preview_window.centerX, resizedMap.preview_window.centerX);
  assert.notEqual(initialMap.video_tracks.x, resizedMap.video_tracks.x);
  assert.ok(resizedMap.export_interface.centerX < 1440);
});

test('generateVerifiedCapCutActionPlan creates complete 8-action verified pipeline across all 7 stages', () => {
  const plan = generateVerifiedCapCutActionPlan({
    mode: 'wedding_documentary',
    colorStyle: 'korean_wedding_film',
    promptVi: 'Dựng phóng sự cưới màu film Hàn Quốc',
    geometry: SAMPLE_GEOMETRY,
    clips: DEFAULT_CAPCUT_MEDIA_LIBRARY,
    targetDurationSec: 180,
  });

  assert.equal(plan.actions.length, 8);
  for (const action of plan.actions) {
    assert.ok(action.actionId.length > 0);
    assert.ok(action.preconditions.length > 0);
    assert.ok(action.expectedResult.length > 0);
    assert.ok(action.verificationMethod.length > 0);
    assert.ok(action.recoveryAction.length > 0);
  }
});

test('validateMacOSPermissionsForAutomation halts when any required permission is missing', () => {
  const full = validateMacOSPermissionsForAutomation({
    accessibility: true,
    screenRecording: true,
    automation: true,
  });
  assert.equal(full.allowed, true);
  assert.equal(full.missingPermissionsVi.length, 0);

  const missingScreen = validateMacOSPermissionsForAutomation({
    accessibility: true,
    screenRecording: false,
    automation: true,
  });
  assert.equal(missingScreen.allowed, false);
  assert.equal(missingScreen.missingPermissionsVi.length, 1);
});

test('computeFloatingWindowLayout enforces ~360px floating Assistant and collapses away from timeline in EDITING mode', () => {
  const assistantLayout = computeFloatingWindowLayout('ASSISTANT', SAMPLE_GEOMETRY);
  assert.equal(assistantLayout.width, 360);
  assert.equal(assistantLayout.alwaysOnTop, true);
  assert.equal(assistantLayout.collapsed, false);

  const editingLayout = computeFloatingWindowLayout('EDITING', SAMPLE_GEOMETRY);
  const timelineRect = identify_timeline(SAMPLE_GEOMETRY);
  assert.equal(editingLayout.collapsed, true);
  assert.equal(editingLayout.alwaysOnTop, false);
  assert.ok(editingLayout.y + editingLayout.height < timelineRect.y, 'EDITING floating panel must move away from the CapCut timeline');
});

test('validateAIActionProtocol accepts valid CapCut GUI actions and rejects shell command injection', () => {
  const validAction = {
    action_id: 'action_001',
    target_application: 'CapCut' as const,
    operation: 'click' as const,
    target_description: 'Media library tab',
    preconditions: ['CapCut is active', 'Media panel is visible'],
    expected_result: 'Media library becomes active',
    verification_strategy: 'Inspect accessibility state and screenshot',
    timeout_ms: 5000,
    recovery_strategy: 'Re-observe the interface',
  };
  assert.equal(validateAIActionProtocol(validAction).valid, true);

  const shellInjectionAction = {
    ...validAction,
    target_description: 'rm -rf / ; bash -c echo',
  };
  const rejected = validateAIActionProtocol(shellInjectionAction);
  assert.equal(rejected.valid, false);
  assert.ok(rejected.errors.some((e) => e.includes('Security violation')));
});

test('SerializedInputController enforces permissions and cancels immediately on Emergency Stop', async () => {
  const controller = new SerializedInputController();
  const perms = { accessibility: true, screenRecording: true, automation: true };

  const clicked = await controller.click(280, 340, perms);
  assert.equal(clicked, true);
  assert.deepEqual(controller.getCursorPosition(), { x: 280, y: 340 });

  controller.triggerEmergencyStop('Control+Option+Command+Escape');
  assert.equal(controller.isEmergencyStopped(), true);

  await assert.rejects(
    async () => {
      await controller.drag(100, 100, 500, 500, perms);
    },
    /EMERGENCY_STOP_ACTIVE/
  );
});

test('capture_capcut_window and buildDisposableTestSuite produce 10 valid test steps', () => {
  const observation = capture_capcut_window(SAMPLE_GEOMETRY);
  assert.equal(observation.activeWindowVerified, true);
  assert.ok(observation.accessibilityTreeCount >= 10);

  const suite = buildDisposableTestSuite(SAMPLE_GEOMETRY);
  assert.equal(suite.length, 10);
  for (const step of suite) {
    assert.equal(validateAIActionProtocol(step.actionProtocol).valid, true);
  }
});
