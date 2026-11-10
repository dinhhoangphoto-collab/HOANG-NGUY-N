export type CapCutConnectionStatus = 'connected' | 'not_running' | 'permission_required';

export type EditingModeId = 'tiktok_reels' | 'facebook_short' | 'wedding_documentary';

export type ColorStyleId =
  | 'korean_wedding_film'
  | 'cinematic_wedding'
  | 'luxury_editorial'
  | 'warm_film'
  | 'natural_skin_tone'
  | 'moody_cinematic'
  | 'clean_bright';

export type ProgressStageId =
  | 'observing_capcut'
  | 'analyzing_footage'
  | 'planning_edit'
  | 'editing_timeline'
  | 'applying_color'
  | 'processing_audio'
  | 'reviewing_result';

export type WeddingSceneCategory =
  | 'bride_prep'
  | 'groom_prep'
  | 'ceremony_entry'
  | 'family_interaction'
  | 'ring_exchange'
  | 'wedding_vows'
  | 'couple_portraits'
  | 'reception_speeches';

export interface MacOSPermissionsState {
  accessibility: boolean;
  screenRecording: boolean;
  automation: boolean;
}

export interface WindowGeometry {
  windowId: number;
  pid: number;
  appName: string;
  bundleId: string;
  projectTitle: string;
  x: number;
  y: number;
  width: number;
  height: number;
  dpiScale: number;
  timelineZoomLevel: number;
  timelineScrollOffsetPx: number;
}

export interface UIElementRect {
  id: string;
  axRole: string;
  axTitle: string;
  labelVi: string;
  zone:
    | 'media_library'
    | 'media_thumbnails'
    | 'preview_window'
    | 'main_timeline'
    | 'video_tracks'
    | 'audio_tracks'
    | 'text_tracks'
    | 'effects'
    | 'transitions'
    | 'color_panel'
    | 'export_interface'
    | 'playback_controls';
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  focused?: boolean;
  selected?: boolean;
}

export interface SourceMediaClip {
  id: string;
  filename: string;
  durationSec: number;
  resolution: '3840x2160' | '1920x1080' | '1080x1920';
  fps: number;
  weddingCategory: WeddingSceneCategory;
  emotionalScore: number; // 1-100
  hasImportantAmbientAudio: boolean;
  hasSpeechOrVows: boolean;
  skinToneExposureEv: number;
  whiteDressHighlightRisk: boolean;
  descriptionVi: string;
  thumbnailIndex: number;
}

export interface ColorGradingAdjustment {
  styleId: ColorStyleId;
  styleName: string;
  styleNameVi: string;
  exposure: number;     // -50 to +50
  contrast: number;     // -50 to +50
  saturation: number;   // -50 to +50
  temperature: number;  // -50 to +50
  tint: number;         // -50 to +50
  highlights: number;   // -50 to +50
  shadows: number;      // -50 to +50
  skinToneProtected: boolean;
  whiteDressHighlightProtected: boolean;
  sceneConsistencyLocked: boolean;
}

export interface VerifiedUIAction {
  actionId: string;
  stage: ProgressStageId;
  phaseNumber: 1 | 2 | 3 | 4 | 5;
  targetApplication: string;
  targetUiElement: string;
  axSelector: string;
  intendedOperation: string;
  operationType:
    | 'activate_window'
    | 'screencapture_inspect'
    | 'mouse_click'
    | 'drag_and_drop'
    | 'keyboard_shortcut'
    | 'text_input'
    | 'slider_adjust'
    | 'menu_select'
    | 'playback_verify';
  coordinates: {
    startX: number;
    startY: number;
    endX?: number;
    endY?: number;
  };
  shortcutKey?: string;
  inputValue?: string;
  preconditions: string;
  expectedResult: string;
  verificationMethod: string;
  recoveryAction: string;
  status: 'pending' | 'observing' | 'acting' | 'verifying' | 'verified' | 'recovered' | 'failed';
  durationMs: number;
  verifiedTimestamp?: string;
  screenshotHashBefore?: string;
  screenshotHashAfter?: string;
}

export interface CapCutFocusDistinctionState {
  selectedMediaFile: string | null;
  selectedTimelineClip: string | null;
  selectedTrack: 'Video Track V1' | 'Audio Track A1' | 'Text Track T1' | null;
  activeTextField: string | null;
  focusedPreviewWindow: boolean;
}

export interface TimelineClipInstance {
  instanceId: string;
  sourceClipId: string;
  filename: string;
  category: WeddingSceneCategory;
  startSec: number;
  durationSec: number;
  inPointSec: number;
  outPointSec: number;
  track: 'V1' | 'A1' | 'T1';
  colorStyleApplied: ColorStyleId | null;
  audioGainDb: number;
  ambientAudioPreserved: boolean;
}

export const PROGRESS_STAGES: {
  id: ProgressStageId;
  label: string;
  labelVi: string;
  detailVi: string;
}[] = [
  {
    id: 'observing_capcut',
    label: 'Observing CapCut',
    labelVi: 'Quan sát giao diện CapCut',
    detailVi: 'Kiểm tra tiến trình CapCut, kích hoạt cửa sổ chính và đọc cây Accessibility AXUIElement',
  },
  {
    id: 'analyzing_footage',
    label: 'Analyzing footage',
    labelVi: 'Phân tích footage & âm thanh gốc',
    detailVi: 'Nhận diện các cảnh quay trong Media Library, phân loại khoảnh khắc cảm xúc và lời thề nguyện',
  },
  {
    id: 'planning_edit',
    label: 'Planning edit',
    labelVi: 'Lập kịch bản dựng phim',
    detailVi: 'Gemini AI kiến tạo chuỗi thao tác chuột & phím có kiểm chứng theo bố cục câu chuyện',
  },
  {
    id: 'editing_timeline',
    label: 'Editing timeline',
    labelVi: 'Dựng trực tiếp trên Timeline CapCut',
    detailVi: 'Kéo thả clip vào Timeline thật của CapCut, cắt tỉa Cmd+B, sắp xếp nhịp điệu câu chuyện',
  },
  {
    id: 'applying_color',
    label: 'Applying color',
    labelVi: 'Chỉnh màu trên bảng Adjustment',
    detailVi: 'Mở bảng Color Adjustment của CapCut, cân chỉnh Exposure, Temp, Highlights và bảo vệ da/váy cưới',
  },
  {
    id: 'processing_audio',
    label: 'Processing audio',
    labelVi: 'Xử lý nhạc nền & giữ âm thanh gốc',
    detailVi: 'Đồng bộ điểm cắt theo nhịp nhạc, fade-in/out và giữ nguyên tiếng vỗ tay, lời phát biểu quan trọng',
  },
  {
    id: 'reviewing_result',
    label: 'Reviewing result',
    labelVi: 'Kiểm tra & phát thử kết quả',
    detailVi: 'Nhấn Space phát thử trên Preview Window, chụp màn hình đối chiếu toàn bộ Timeline hoàn chỉnh',
  },
];

export const EDITING_MODES: {
  id: EditingModeId;
  name: string;
  subtitleVi: string;
  targetDurationLabel: string;
  aspectRatio: '9:16' | '16:9';
  priorityBadge?: string;
  examplePromptVi: string;
}[] = [
  {
    id: 'wedding_documentary',
    name: 'Wedding Documentary',
    subtitleVi: 'Phóng sự cưới điện ảnh · Kể chuyện theo trình tự cảm xúc, giữ âm thanh tự nhiên',
    targetDurationLabel: '120–240s · 16:9 Cinema',
    aspectRatio: '16:9',
    priorityBadge: 'Ưu tiên cao nhất',
    examplePromptVi:
      'Dựng phóng sự cưới phong cách cinematic, màu film Hàn Quốc, cảm xúc, chuyển cảnh tự nhiên, nhạc nhẹ nhàng, thời lượng khoảng 3 phút.',
  },
  {
    id: 'tiktok_reels',
    name: 'TikTok / Reels',
    subtitleVi: 'Mở đầu ấn tượng 3 giây đầu · Cắt nhanh theo beat nhạc, loại bỏ đoạn thừa',
    targetDurationLabel: '15–90s · 9:16 Dọc',
    aspectRatio: '9:16',
    examplePromptVi:
      'Dựng video TikTok 9:16 mở đầu cuốn hút, chọn các góc quay đẹp nhất, cắt nhanh khớp nhịp nhạc, màu trong trẻo hiện đại khoảng 45 giây.',
  },
  {
    id: 'facebook_short',
    name: 'Facebook Short Video',
    subtitleVi: 'Kể chuyện tự nhiên · Nhịp độ cân bằng, chuyển cảnh sạch, màu sắc hài hòa',
    targetDurationLabel: '30–120s · 16:9 / 4:5',
    aspectRatio: '16:9',
    examplePromptVi:
      'Dựng video ngắn Facebook kể chuyện tự nhiên, giữ các khoảnh khắc giao lưu cảm xúc, chuyển cảnh mượt mà, màu ấm áp dài khoảng 90 giây.',
  },
];

export const COLOR_STYLES: Record<ColorStyleId, ColorGradingAdjustment> = {
  korean_wedding_film: {
    styleId: 'korean_wedding_film',
    styleName: 'Korean Wedding Film',
    styleNameVi: 'Màu Film Hàn Quốc (Korean Wedding Film)',
    exposure: 6,
    contrast: -8,
    saturation: -6,
    temperature: -4,
    tint: 3,
    highlights: -18,
    shadows: 14,
    skinToneProtected: true,
    whiteDressHighlightProtected: true,
    sceneConsistencyLocked: true,
  },
  cinematic_wedding: {
    styleId: 'cinematic_wedding',
    styleName: 'Cinematic Wedding',
    styleNameVi: 'Điện Ảnh Cưới Sang Trọng (Cinematic Wedding)',
    exposure: 2,
    contrast: 12,
    saturation: -5,
    temperature: 5,
    tint: 1,
    highlights: -15,
    shadows: -6,
    skinToneProtected: true,
    whiteDressHighlightProtected: true,
    sceneConsistencyLocked: true,
  },
  luxury_editorial: {
    styleId: 'luxury_editorial',
    styleName: 'Luxury Editorial',
    styleNameVi: 'Tạp Chí Cao Cấp (Luxury Editorial)',
    exposure: 4,
    contrast: 10,
    saturation: -10,
    temperature: -2,
    tint: 2,
    highlights: -16,
    shadows: 4,
    skinToneProtected: true,
    whiteDressHighlightProtected: true,
    sceneConsistencyLocked: true,
  },
  warm_film: {
    styleId: 'warm_film',
    styleName: 'Warm Film',
    styleNameVi: 'Film Ấm Hoài Cổ (Warm Film)',
    exposure: 3,
    contrast: 6,
    saturation: 4,
    temperature: 14,
    tint: 4,
    highlights: -14,
    shadows: 8,
    skinToneProtected: true,
    whiteDressHighlightProtected: true,
    sceneConsistencyLocked: true,
  },
  natural_skin_tone: {
    styleId: 'natural_skin_tone',
    styleName: 'Natural Skin Tone',
    styleNameVi: 'Tông Da Tự Nhiên (Natural Skin Tone)',
    exposure: 4,
    contrast: 2,
    saturation: 0,
    temperature: 2,
    tint: 2,
    highlights: -12,
    shadows: 10,
    skinToneProtected: true,
    whiteDressHighlightProtected: true,
    sceneConsistencyLocked: true,
  },
  moody_cinematic: {
    styleId: 'moody_cinematic',
    styleName: 'Moody Cinematic',
    styleNameVi: 'Điện Ảnh Chiều Sâu (Moody Cinematic)',
    exposure: -4,
    contrast: 16,
    saturation: -12,
    temperature: -6,
    tint: -2,
    highlights: -20,
    shadows: -10,
    skinToneProtected: true,
    whiteDressHighlightProtected: true,
    sceneConsistencyLocked: true,
  },
  clean_bright: {
    styleId: 'clean_bright',
    styleName: 'Clean & Bright',
    styleNameVi: 'Trong Trẻo & Sáng Rõ (Clean & Bright)',
    exposure: 10,
    contrast: 4,
    saturation: 5,
    temperature: -3,
    tint: 2,
    highlights: -16,
    shadows: 16,
    skinToneProtected: true,
    whiteDressHighlightProtected: true,
    sceneConsistencyLocked: true,
  },
};

export const DEFAULT_CAPCUT_MEDIA_LIBRARY: SourceMediaClip[] = [
  {
    id: 'clip_01_bride_prep',
    filename: 'A001_Bride_Makeup_Veil_4K.mov',
    durationSec: 28,
    resolution: '3840x2160',
    fps: 60,
    weddingCategory: 'bride_prep',
    emotionalScore: 92,
    hasImportantAmbientAudio: false,
    hasSpeechOrVows: false,
    skinToneExposureEv: 0.2,
    whiteDressHighlightRisk: true,
    descriptionVi: 'Cô dâu cài khăn voan bên cửa sổ, ánh sáng tự nhiên chiếu lên váy cưới trắng',
    thumbnailIndex: 0,
  },
  {
    id: 'clip_02_groom_prep',
    filename: 'A004_Groom_Suit_Letter_4K.mov',
    durationSec: 24,
    resolution: '3840x2160',
    fps: 60,
    weddingCategory: 'groom_prep',
    emotionalScore: 88,
    hasImportantAmbientAudio: true,
    hasSpeechOrVows: true,
    skinToneExposureEv: -0.1,
    whiteDressHighlightRisk: false,
    descriptionVi: 'Chú rể chỉnh cài áo và đọc thư tay với giọng đọc trầm ấm tự nhiên',
    thumbnailIndex: 1,
  },
  {
    id: 'clip_03_family_hug',
    filename: 'A009_Mother_Daughter_Tearful_Hug.mov',
    durationSec: 32,
    resolution: '3840x2160',
    fps: 30,
    weddingCategory: 'family_interaction',
    emotionalScore: 98,
    hasImportantAmbientAudio: true,
    hasSpeechOrVows: true,
    skinToneExposureEv: 0.0,
    whiteDressHighlightRisk: true,
    descriptionVi: 'Mẹ ôm cô dâu xúc động dặn dò trước giờ làm lễ (Giữ nguyên âm thanh gốc)',
    thumbnailIndex: 2,
  },
  {
    id: 'clip_04_ceremony_walk',
    filename: 'B002_Bride_Walking_Down_Aisle.mov',
    durationSec: 35,
    resolution: '3840x2160',
    fps: 60,
    weddingCategory: 'ceremony_entry',
    emotionalScore: 95,
    hasImportantAmbientAudio: true,
    hasSpeechOrVows: false,
    skinToneExposureEv: 0.3,
    whiteDressHighlightRisk: true,
    descriptionVi: 'Cha dắt tay cô dâu bước vào lễ đường trong tiếng vỗ tay của quan khách',
    thumbnailIndex: 3,
  },
  {
    id: 'clip_05_vows',
    filename: 'B007_Wedding_Vows_Emotional_CloseUp.mov',
    durationSec: 42,
    resolution: '3840x2160',
    fps: 30,
    weddingCategory: 'wedding_vows',
    emotionalScore: 99,
    hasImportantAmbientAudio: true,
    hasSpeechOrVows: true,
    skinToneExposureEv: 0.1,
    whiteDressHighlightRisk: true,
    descriptionVi: 'Cô dâu chú rể trao lời thề nguyện (Vows) — Tuyệt đối không cắt mất lời nói',
    thumbnailIndex: 4,
  },
  {
    id: 'clip_06_ring_exchange',
    filename: 'B011_Ring_Exchange_Hands_Macro.mov',
    durationSec: 22,
    resolution: '3840x2160',
    fps: 60,
    weddingCategory: 'ring_exchange',
    emotionalScore: 96,
    hasImportantAmbientAudio: true,
    hasSpeechOrVows: false,
    skinToneExposureEv: 0.0,
    whiteDressHighlightRisk: false,
    descriptionVi: 'Cận cảnh trao nhẫn cưới và nụ cười hạnh phúc của hai bên gia đình',
    thumbnailIndex: 5,
  },
  {
    id: 'clip_07_couple_portrait',
    filename: 'C003_Golden_Hour_Couple_Portrait.mov',
    durationSec: 30,
    resolution: '3840x2160',
    fps: 60,
    weddingCategory: 'couple_portraits',
    emotionalScore: 94,
    hasImportantAmbientAudio: false,
    hasSpeechOrVows: false,
    skinToneExposureEv: 0.4,
    whiteDressHighlightRisk: true,
    descriptionVi: 'Chân dung đôi uyên ương dưới nắng hoàng hôn golden hour lãng mạn',
    thumbnailIndex: 6,
  },
  {
    id: 'clip_08_reception_speech',
    filename: 'D005_Father_Toast_Reception_Speech.mov',
    durationSec: 38,
    resolution: '3840x2160',
    fps: 30,
    weddingCategory: 'reception_speeches',
    emotionalScore: 93,
    hasImportantAmbientAudio: true,
    hasSpeechOrVows: true,
    skinToneExposureEv: -0.2,
    whiteDressHighlightRisk: false,
    descriptionVi: 'Lời phát biểu chúc phúc của đại diện hai họ và nâng ly khai tiệc',
    thumbnailIndex: 7,
  },
];

const WEDDING_CHRONOLOGY_ORDER: Record<WeddingSceneCategory, number> = {
  bride_prep: 1,
  groom_prep: 2,
  family_interaction: 3,
  ceremony_entry: 4,
  wedding_vows: 5,
  ring_exchange: 6,
  couple_portraits: 7,
  reception_speeches: 8,
};

/**
 * Pure function: Detects the best EditingModeId and ColorStyleId from a Vietnamese user prompt.
 */
export function inferEditingPreferencesFromPrompt(
  promptVi: string,
  fallbackMode: EditingModeId = 'wedding_documentary',
  fallbackColor: ColorStyleId = 'korean_wedding_film'
): {
  mode: EditingModeId;
  colorStyle: ColorStyleId;
  targetDurationSec: number;
  requestsMusic: boolean;
} {
  const normalized = promptVi.toLowerCase();

  let mode: EditingModeId = fallbackMode;
  if (normalized.includes('tiktok') || normalized.includes('reels') || normalized.includes('9:16') || normalized.includes('dọc')) {
    mode = 'tiktok_reels';
  } else if (normalized.includes('facebook') || normalized.includes('fb')) {
    mode = 'facebook_short';
  } else if (
    normalized.includes('cưới') ||
    normalized.includes('wedding') ||
    normalized.includes('phóng sự') ||
    normalized.includes('cô dâu')
  ) {
    mode = 'wedding_documentary';
  }

  let colorStyle: ColorStyleId = fallbackColor;
  if (normalized.includes('hàn quốc') || normalized.includes('korean')) {
    colorStyle = 'korean_wedding_film';
  } else if (normalized.includes('luxury') || normalized.includes('tạp chí') || normalized.includes('editorial')) {
    colorStyle = 'luxury_editorial';
  } else if (normalized.includes('ấm') || normalized.includes('warm') || normalized.includes('hoài cổ')) {
    colorStyle = 'warm_film';
  } else if (normalized.includes('tự nhiên') && normalized.includes('da')) {
    colorStyle = 'natural_skin_tone';
  } else if (normalized.includes('moody') || normalized.includes('trầm')) {
    colorStyle = 'moody_cinematic';
  } else if (normalized.includes('trong trẻo') || normalized.includes('sáng') || normalized.includes('clean')) {
    colorStyle = 'clean_bright';
  } else if (normalized.includes('cinematic') || normalized.includes('điện ảnh')) {
    // If Korean is also mentioned, Korean Wedding Film already matched above
    colorStyle = 'cinematic_wedding';
  }

  // Parse requested duration in minutes or seconds
  let targetDurationSec = mode === 'wedding_documentary' ? 180 : mode === 'facebook_short' ? 90 : 45;
  const minMatch = normalized.match(/(\d+)\s*(phút|phut|min)/);
  const secMatch = normalized.match(/(\d+)\s*(giây|giay|s\b|sec)/);
  if (minMatch) {
    targetDurationSec = Math.max(15, Math.min(600, parseInt(minMatch[1], 10) * 60));
  } else if (secMatch) {
    targetDurationSec = Math.max(15, Math.min(600, parseInt(secMatch[1], 10)));
  }

  const requestsMusic =
    normalized.includes('nhạc') ||
    normalized.includes('music') ||
    normalized.includes('beat') ||
    normalized.includes('giai điệu') ||
    mode === 'wedding_documentary';

  return { mode, colorStyle, targetDurationSec, requestsMusic };
}

/**
 * Pure function: Orders clips and builds a non-destructive timeline sequence
 * respecting mode rules (especially Wedding Documentary chronology & emotional preservation).
 */
export function buildTimelineSequenceForMode(
  clips: SourceMediaClip[],
  mode: EditingModeId,
  colorStyle: ColorStyleId,
  targetDurationSec: number
): TimelineClipInstance[] {
  if (clips.length === 0) return [];

  let orderedClips: SourceMediaClip[];
  if (mode === 'wedding_documentary') {
    // Strictly preserve chronological wedding story order and never drop emotional/vow clips
    orderedClips = [...clips].sort(
      (a, b) => WEDDING_CHRONOLOGY_ORDER[a.weddingCategory] - WEDDING_CHRONOLOGY_ORDER[b.weddingCategory]
    );
  } else if (mode === 'tiktok_reels') {
    // Strongest visual hook first, sorted by emotional/visual score descending
    orderedClips = [...clips].sort((a, b) => b.emotionalScore - a.emotionalScore);
  } else {
    // Facebook Short Video: balanced storytelling arc
    orderedClips = [...clips].sort(
      (a, b) => WEDDING_CHRONOLOGY_ORDER[a.weddingCategory] - WEDDING_CHRONOLOGY_ORDER[b.weddingCategory]
    );
  }

  const maxClipCount = mode === 'tiktok_reels' ? Math.min(6, orderedClips.length) : orderedClips.length;
  const selected = orderedClips.slice(0, maxClipCount);

  const rawTotal = selected.reduce((acc, c) => acc + c.durationSec, 0);
  const scaleFactor = rawTotal > 0 ? Math.min(1, targetDurationSec / rawTotal) : 1;

  let currentStartSec = 0;
  return selected.map((clip, index) => {
    // For wedding documentary, preserve longer cuts on vows/speeches
    const minDuration = clip.hasSpeechOrVows && mode === 'wedding_documentary' ? 18 : mode === 'tiktok_reels' ? 4 : 8;
    const trimmedDuration = Math.max(
      minDuration,
      Math.min(clip.durationSec, Math.round(clip.durationSec * scaleFactor))
    );
    const inPoint = clip.hasSpeechOrVows ? 0 : Math.min(2, Math.floor((clip.durationSec - trimmedDuration) / 2));
    const instance: TimelineClipInstance = {
      instanceId: `tl_clip_${index + 1}_${clip.id}`,
      sourceClipId: clip.id,
      filename: clip.filename,
      category: clip.weddingCategory,
      startSec: currentStartSec,
      durationSec: trimmedDuration,
      inPointSec: inPoint,
      outPointSec: inPoint + trimmedDuration,
      track: 'V1',
      colorStyleApplied: colorStyle,
      audioGainDb: clip.hasSpeechOrVows ? 2.5 : clip.hasImportantAmbientAudio ? 0.0 : -12.0,
      ambientAudioPreserved: clip.hasImportantAmbientAudio || clip.hasSpeechOrVows,
    };
    currentStartSec += trimmedDuration;
    return instance;
  });
}

/**
 * Pure function: Calculates protective Color Grading parameters for CapCut's Adjustment Panel
 * ensuring natural skin tones and white wedding dress highlights are never clipped.
 */
export function computeProtectedColorAdjustments(
  baseStyleId: ColorStyleId,
  clips: SourceMediaClip[]
): ColorGradingAdjustment {
  const base = { ...COLOR_STYLES[baseStyleId] };
  const hasWhiteDressRisk = clips.some((c) => c.whiteDressHighlightRisk);
  const avgSkinEv =
    clips.length > 0 ? clips.reduce((sum, c) => sum + c.skinToneExposureEv, 0) / clips.length : 0;

  // Protect white wedding dresses from clipping in highlights
  if (hasWhiteDressRisk && base.highlights > -12) {
    base.highlights = -14;
  }
  if (hasWhiteDressRisk && base.exposure > 8) {
    base.exposure = 7;
  }

  // Protect natural skin tones if source footage is slightly over/under exposed
  if (avgSkinEv > 0.25) {
    base.exposure = Math.max(-10, base.exposure - 2);
  } else if (avgSkinEv < -0.2) {
    base.shadows = Math.min(25, base.shadows + 4);
  }

  base.skinToneProtected = true;
  base.whiteDressHighlightProtected = true;
  base.sceneConsistencyLocked = true;
  return base;
}

/**
 * Pure function: Dynamically recalculates CapCut UI element screen coordinates
 * after window resizing, panel moving, timeline scrolling, or zooming.
 * Never returns blind fixed coordinates.
 */
export function recalculateCapCutUICoordinates(geometry: WindowGeometry): Record<string, UIElementRect> {
  const { x, y, width, height, timelineScrollOffsetPx, timelineZoomLevel } = geometry;

  // CapCut Desktop standard layout proportions on macOS:
  // Top bar: 44px height
  // Upper workspace (Media Library left 32%, Preview center 42%, Inspector/Color right 26%): 54% of window height
  // Lower workspace (Toolbar + Main Timeline tracks): 46% of window height
  const topBarH = 44;
  const upperH = Math.round((height - topBarH) * 0.54);
  const lowerY = y + topBarH + upperH;
  const lowerH = height - topBarH - upperH;

  const leftColW = Math.round(width * 0.32);
  const centerColW = Math.round(width * 0.42);
  const rightColW = width - leftColW - centerColW;

  const makeRect = (
    id: string,
    axRole: string,
    axTitle: string,
    labelVi: string,
    zone: UIElementRect['zone'],
    rx: number,
    ry: number,
    rw: number,
    rh: number
  ): UIElementRect => ({
    id,
    axRole,
    axTitle,
    labelVi,
    zone,
    x: Math.round(rx),
    y: Math.round(ry),
    width: Math.round(rw),
    height: Math.round(rh),
    centerX: Math.round(rx + rw / 2),
    centerY: Math.round(ry + rh / 2),
  });

  const timelineTrackX = x + 120 - Math.round(timelineScrollOffsetPx * timelineZoomLevel);
  const timelineTrackW = Math.max(400, width - 140);

  return {
    media_library: makeRect(
      'media_library',
      'AXGroup',
      'CapCut Media Library Panel',
      'Thư viện Media CapCut',
      'media_library',
      x + 8,
      y + topBarH + 4,
      leftColW - 12,
      upperH - 8
    ),
    media_thumbnails: makeRect(
      'media_thumbnails',
      'AXList',
      'Imported Project Footage Grid',
      'Lưới Thumbnail Video Gốc',
      'media_thumbnails',
      x + 20,
      y + topBarH + 64,
      leftColW - 36,
      upperH - 80
    ),
    preview_window: makeRect(
      'preview_window',
      'AXGroup',
      'Player Preview Canvas',
      'Cửa sổ Xem trước (Preview)',
      'preview_window',
      x + leftColW + 4,
      y + topBarH + 4,
      centerColW - 8,
      upperH - 52
    ),
    playback_controls: makeRect(
      'playback_controls',
      'AXGroup',
      'Player Transport Bar (Play/Pause)',
      'Bộ điều khiển Phát / Tạm dừng',
      'playback_controls',
      x + leftColW + 4,
      y + topBarH + upperH - 46,
      centerColW - 8,
      42
    ),
    color_panel: makeRect(
      'color_panel',
      'AXGroup',
      'Inspector Adjustment & Color Grading',
      'Bảng Chỉnh Màu (Adjustment / Basic)',
      'color_panel',
      x + leftColW + centerColW + 4,
      y + topBarH + 4,
      rightColW - 12,
      upperH - 8
    ),
    transitions: makeRect(
      'transitions',
      'AXButton',
      'TopTab Transitions',
      'Tab Chuyển cảnh (Transitions)',
      'transitions',
      x + 175,
      y + 10,
      78,
      28
    ),
    effects: makeRect(
      'effects',
      'AXButton',
      'TopTab Effects',
      'Tab Hiệu ứng (Effects)',
      'effects',
      x + 258,
      y + 10,
      68,
      28
    ),
    export_interface: makeRect(
      'export_interface',
      'AXButton',
      'Header Export Button',
      'Nút Export (Chờ xác nhận)',
      'export_interface',
      x + width - 104,
      y + 8,
      88,
      30
    ),
    main_timeline: makeRect(
      'main_timeline',
      'AXScrollArea',
      'Main Editing Timeline',
      'Timeline Dựng Phim Chính',
      'main_timeline',
      x + 8,
      lowerY + 4,
      width - 16,
      lowerH - 12
    ),
    text_tracks: makeRect(
      'text_tracks',
      'AXRow',
      'Text & Captions Track T1',
      'Track Phụ đề & Chữ (T1)',
      'text_tracks',
      timelineTrackX,
      lowerY + 48,
      timelineTrackW,
      34
    ),
    video_tracks: makeRect(
      'video_tracks',
      'AXRow',
      'Primary Video Track V1',
      'Track Video Chính (V1)',
      'video_tracks',
      timelineTrackX,
      lowerY + 90,
      timelineTrackW,
      58
    ),
    audio_tracks: makeRect(
      'audio_tracks',
      'AXRow',
      'Music & Ambient Audio Track A1',
      'Track Âm thanh & Nhạc nền (A1)',
      'audio_tracks',
      timelineTrackX,
      lowerY + 156,
      timelineTrackW,
      44
    ),
  };
}

/**
 * Pure function: Generates the verified step-by-step GUI automation action plan
 * implementing OBSERVE -> PLAN -> ACT -> WAIT -> VERIFY -> CONTINUE.
 */
export function generateVerifiedCapCutActionPlan(params: {
  mode: EditingModeId;
  colorStyle: ColorStyleId;
  promptVi: string;
  geometry: WindowGeometry;
  clips: SourceMediaClip[];
  targetDurationSec: number;
}): {
  actions: VerifiedUIAction[];
  timelineSequence: TimelineClipInstance[];
  colorAdjustments: ColorGradingAdjustment;
} {
  const { mode, colorStyle, geometry, clips, targetDurationSec } = params;
  const uiMap = recalculateCapCutUICoordinates(geometry);
  const timelineSequence = buildTimelineSequenceForMode(clips, mode, colorStyle, targetDurationSec);
  const colorAdjustments = computeProtectedColorAdjustments(colorStyle, clips);

  const actions: VerifiedUIAction[] = [
    {
      actionId: 'ACT-01-ACTIVATE-CAPCUT',
      stage: 'observing_capcut',
      phaseNumber: 1,
      targetApplication: 'CapCut Desktop (com.lemon.lvoverseas)',
      targetUiElement: 'AXApplication -> AXMainWindow (CapCut)',
      axSelector: 'AXApplication[bundleId="com.lemon.lvoverseas"]/AXMainWindow',
      intendedOperation: 'Kích hoạt CapCut lên tiền cảnh & đọc tọa độ cửa sổ thực tế',
      operationType: 'activate_window',
      coordinates: {
        startX: uiMap.preview_window.centerX,
        startY: uiMap.preview_window.centerY,
      },
      preconditions: 'CapCut Desktop đang chạy trên macOS và đã mở dự án có chứa footage',
      expectedResult: 'Cửa sổ CapCut ở trạng thái frontmost (active), tạo bản sao lưu an toàn của dự án trước khi thao tác',
      verificationMethod: 'Kiểm tra NSWorkspace.frontmostApplication == com.lemon.lvoverseas & chụp ảnh màn hình gốc',
      recoveryAction: 'Gọi lại osascript `tell application "CapCut" to activate` và đợi 400ms',
      status: 'pending',
      durationMs: 420,
    },
    {
      actionId: 'ACT-02-INSPECT-MEDIA-LIBRARY',
      stage: 'analyzing_footage',
      phaseNumber: 2,
      targetApplication: 'CapCut Desktop (com.lemon.lvoverseas)',
      targetUiElement: uiMap.media_thumbnails.axTitle,
      axSelector: 'AXGroup[@title="Media"]/AXScrollArea/AXList',
      intendedOperation: `Quét ${clips.length} clip gốc trong Media Library & phân tích khung hình đại diện bằng Gemini Vision`,
      operationType: 'screencapture_inspect',
      coordinates: {
        startX: uiMap.media_thumbnails.centerX,
        startY: uiMap.media_thumbnails.centerY,
      },
      preconditions: 'Bảng Media Library đang hiển thị ở góc trên bên trái giao diện CapCut',
      expectedResult: `Nhận diện chính xác ${clips.length} file video gốc, đánh dấu các đoạn có lời thề nguyện (Vows) và âm thanh tự nhiên`,
      verificationMethod: 'So khớp danh sách AXChildren trong MediaGrid với kết quả nhận diện ảnh chụp màn hình',
      recoveryAction: 'Click vào tab "Media -> Local" tại (' + uiMap.media_library.x + ', ' + uiMap.media_library.y + ') để mở lại danh sách clip',
      status: 'pending',
      durationMs: 480,
    },
    {
      actionId: 'ACT-03-PLAN-SEQUENCE',
      stage: 'planning_edit',
      phaseNumber: 3,
      targetApplication: 'CapCut Desktop (com.lemon.lvoverseas)',
      targetUiElement: uiMap.main_timeline.axTitle,
      axSelector: 'AXScrollArea[@identifier="TimelineScrollView"]',
      intendedOperation: `Thiết lập cấu trúc ${timelineSequence.length} cảnh quay theo chế độ ${mode === 'wedding_documentary' ? 'Phóng Sự Cưới Điện Ảnh' : mode === 'tiktok_reels' ? 'TikTok / Reels 9:16' : 'Facebook Short Video'}`,
      operationType: 'mouse_click',
      coordinates: {
        startX: uiMap.main_timeline.centerX,
        startY: uiMap.main_timeline.centerY,
      },
      preconditions: 'Đã hoàn tất phân tích ngữ nghĩa video và kiểm tra vùng trống trên Main Timeline',
      expectedResult: `Timeline sẵn sàng nhận ${timelineSequence.length} clip với tổng thời lượng mục tiêu ~${ timelineSequence.reduce((s, c) => s + c.durationSec, 0) }s`,
      verificationMethod: 'Kiểm tra trạng thái focus của AXScrollArea Timeline và vị trí Playhead tại 00:00:00',
      recoveryAction: 'Nhấn phím Home để đưa Playhead về đầu Timeline và tính toán lại tọa độ Track V1',
      status: 'pending',
      durationMs: 400,
    },
    {
      actionId: 'ACT-04-DRAG-CLIPS-TO-TIMELINE',
      stage: 'editing_timeline',
      phaseNumber: 3,
      targetApplication: 'CapCut Desktop (com.lemon.lvoverseas)',
      targetUiElement: `${uiMap.media_thumbnails.axTitle} -> ${uiMap.video_tracks.axTitle}`,
      axSelector: 'AXList[@title="MediaGrid"] -> AXRow[@title="VideoTrack_V1"]',
      intendedOperation: `Kéo thả tuần tự ${timelineSequence.length} clip từ Media Library xuống Track V1 trên Timeline CapCut`,
      operationType: 'drag_and_drop',
      coordinates: {
        startX: uiMap.media_thumbnails.centerX,
        startY: uiMap.media_thumbnails.centerY,
        endX: uiMap.video_tracks.centerX,
        endY: uiMap.video_tracks.centerY,
      },
      preconditions: 'Các thumbnail clip hiển thị rõ trong Media Library, Track V1 không bị khóa',
      expectedResult: `${timelineSequence.length} clip xuất hiện theo đúng thứ tự câu chuyện trên Track V1 của CapCut`,
      verificationMethod: 'Chụp ảnh vùng Track V1 sau mỗi lần thả chuột & kiểm tra số lượng AXClipElement tăng tương ứng',
      recoveryAction: 'Tính lại tọa độ cuộn của Media Library, thử lại thao tác kéo thả hoặc nhấn nút "+" trên thumbnail clip',
      status: 'pending',
      durationMs: 560,
    },
    {
      actionId: 'ACT-05-SPLIT-TRIM-TIMELINE',
      stage: 'editing_timeline',
      phaseNumber: 3,
      targetApplication: 'CapCut Desktop (com.lemon.lvoverseas)',
      targetUiElement: uiMap.video_tracks.axTitle,
      axSelector: 'AXRow[@title="VideoTrack_V1"]/AXClipElement',
      intendedOperation: 'Di chuyển Playhead, cắt tỉa đoạn thừa bằng phím tắt Cmd+B và giữ trọn vẹn khoảnh khắc cảm xúc',
      operationType: 'keyboard_shortcut',
      coordinates: {
        startX: uiMap.video_tracks.centerX + 45,
        startY: uiMap.video_tracks.centerY,
      },
      shortcutKey: 'Cmd+B',
      preconditions: 'Các clip đã nằm trên Track V1 và Playhead đặt tại điểm cắt đã tính toán',
      expectedResult: 'Đoạn rung/thừa ở đầu-cuối clip được loại bỏ; giữ nguyên 100% lời thề nguyện (Vows) và ôm gia đình',
      verificationMethod: 'Đối chiếu độ dài từng clip trên Timeline và thời gian tổng trên thanh Timecode của CapCut',
      recoveryAction: 'Nếu cắt lệch vị trí, gửi ngay tổ hợp phím Cmd+Z (Undo) trên CapCut và đặt lại vị trí Playhead',
      status: 'pending',
      durationMs: 520,
    },
    {
      actionId: 'ACT-06-APPLY-COLOR-GRADING',
      stage: 'applying_color',
      phaseNumber: 4,
      targetApplication: 'CapCut Desktop (com.lemon.lvoverseas)',
      targetUiElement: uiMap.color_panel.axTitle,
      axSelector: 'AXGroup[@title="AdjustmentPanel"]/AXSlider',
      intendedOperation: `Mở tab Adjustment -> Áp dụng style "${colorAdjustments.styleName}" (Exp ${colorAdjustments.exposure > 0 ? '+' : ''}${colorAdjustments.exposure}, Temp ${colorAdjustments.temperature > 0 ? '+' : ''}${colorAdjustments.temperature}, Highlights ${colorAdjustments.highlights})`,
      operationType: 'slider_adjust',
      coordinates: {
        startX: uiMap.color_panel.centerX,
        startY: uiMap.color_panel.centerY,
      },
      inputValue: `Exp:${colorAdjustments.exposure},Contrast:${colorAdjustments.contrast},Temp:${colorAdjustments.temperature},Highlights:${colorAdjustments.highlights},Shadows:${colorAdjustments.shadows}`,
      preconditions: 'Clip hoặc Adjustment Layer đang được chọn trên Timeline, bảng Adjustment mở ở góc phải',
      expectedResult: 'Màu sắc đồng nhất giữa các cảnh, tông da cô dâu chú rể tự nhiên, chi tiết váy cưới trắng không bị cháy sáng',
      verificationMethod: 'Đọc giá trị AXValue của các thanh trượt Exposure/Highlights/Temp và kiểm tra histogram vùng Preview',
      recoveryAction: 'Click lại vào tab "Adjustment -> Basic" ở góc trên bên phải rồi nhập trực tiếp thông số vào ô giá trị',
      status: 'pending',
      durationMs: 540,
    },
    {
      actionId: 'ACT-07-AUDIO-SYNC-AND-PRESERVE',
      stage: 'processing_audio',
      phaseNumber: 4,
      targetApplication: 'CapCut Desktop (com.lemon.lvoverseas)',
      targetUiElement: uiMap.audio_tracks.axTitle,
      axSelector: 'AXRow[@title="AudioTrack_A1"]',
      intendedOperation: 'Thêm nhạc nền vào Track A1, tự động hạ âm lượng nhạc (ducking -12dB) khi có lời thề nguyện & phát biểu',
      operationType: 'slider_adjust',
      coordinates: {
        startX: uiMap.audio_tracks.centerX,
        startY: uiMap.audio_tracks.centerY,
      },
      preconditions: 'Track Video V1 đã hoàn chỉnh, Track Audio A1 sẵn sàng bên dưới',
      expectedResult: 'Nhạc nền hòa quyện mượt mà, có Fade-in/Fade-out, âm thanh gốc (Vows, tiếng vỗ tay) rõ nét',
      verificationMethod: 'Kiểm tra biểu đồ sóng âm (Waveform) trên Track A1 và mức dB trên thanh Audio Meter của CapCut',
      recoveryAction: 'Chọn lại clip âm thanh trên Track A1, mở tab Audio -> Volume và đặt lại keyframe âm lượng',
      status: 'pending',
      durationMs: 490,
    },
    {
      actionId: 'ACT-08-PLAYBACK-AND-VERIFY',
      stage: 'reviewing_result',
      phaseNumber: 5,
      targetApplication: 'CapCut Desktop (com.lemon.lvoverseas)',
      targetUiElement: uiMap.playback_controls.axTitle,
      axSelector: 'AXGroup[@title="TransportControls"]/AXButton[@title="Play"]',
      intendedOperation: 'Nhấn phím Space để phát kiểm tra trên cửa sổ Preview của CapCut & xác nhận dự án sẵn sàng chỉnh sửa tiếp',
      operationType: 'playback_verify',
      coordinates: {
        startX: uiMap.playback_controls.centerX,
        startY: uiMap.playback_controls.centerY,
      },
      shortcutKey: 'Space',
      preconditions: 'Toàn bộ Timeline, màu sắc và âm thanh đã hoàn tất trên giao diện CapCut',
      expectedResult: 'Video phát mượt trên Preview Window, toàn bộ các track vẫn nguyên vẹn để người dùng tùy chỉnh thêm hoặc nhấn Export',
      verificationMethod: 'Chụp ảnh màn hình đối chiếu lần cuối (Final Verification Screenshot) và nhả quyền điều khiển chuột/phím',
      recoveryAction: 'Click trực tiếp vào nút Play trong vùng Transport Controls của cửa sổ Preview',
      status: 'pending',
      durationMs: 450,
    },
  ];

  return { actions, timelineSequence, colorAdjustments };
}

/**
 * Pure function: Checks whether macOS permissions allow safe GUI automation.
 */
export function validateMacOSPermissionsForAutomation(permissions: MacOSPermissionsState): {
  allowed: boolean;
  missingPermissionsVi: string[];
} {
  const missingPermissionsVi: string[] = [];
  if (!permissions.accessibility) {
    missingPermissionsVi.push('Trợ năng (Accessibility) — Cần thiết để đọc cây giao diện AXUIElement và điều khiển chuột/bàn phím');
  }
  if (!permissions.screenRecording) {
    missingPermissionsVi.push('Ghi màn hình (Screen Recording) — Cần thiết để chụp cửa sổ CapCut và kiểm chứng kết quả sau mỗi thao tác');
  }
  if (!permissions.automation) {
    missingPermissionsVi.push('Tự động hóa (Automation / System Events) — Cần thiết để kích hoạt CapCut và gửi phím tắt hệ thống');
  }
  return {
    allowed: missingPermissionsVi.length === 0,
    missingPermissionsVi,
  };
}
