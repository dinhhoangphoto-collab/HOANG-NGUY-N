import React from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, ExternalLink, Terminal, X } from 'lucide-react';
import { MacOSPermissionsState, validateMacOSPermissionsForAutomation } from '../engine/editingLogic';

interface PermissionsWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  permissions: MacOSPermissionsState;
  onUpdatePermissions: (next: MacOSPermissionsState) => void;
}

export const PermissionsWizardModal: React.FC<PermissionsWizardModalProps> = ({
  isOpen,
  onClose,
  permissions,
  onUpdatePermissions,
}) => {
  if (!isOpen) return null;

  const validation = validateMacOSPermissionsForAutomation(permissions);

  const items: {
    key: keyof MacOSPermissionsState;
    titleVi: string;
    titleEn: string;
    systemPathVi: string;
    explanationVi: string;
    commandHint: string;
  }[] = [
    {
      key: 'accessibility',
      titleVi: '1. Quyền Trợ năng (Accessibility)',
      titleEn: 'kAXTrustedCheckOptionPrompt · AXUIElement API',
      systemPathVi: 'System Settings → Privacy & Security → Accessibility → Bật LaLaAIEditor.app',
      explanationVi:
        'Cần thiết để LaLa AI đọc cấu trúc nút bấm, menu, thanh trượt màu (Adjustment) và các Track trong giao diện thật của CapCut Desktop, đồng thời điều khiển di chuyển chuột, kéo thả clip và nhấn phím tắt.',
      commandHint: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility',
    },
    {
      key: 'screenRecording',
      titleVi: '2. Quyền Ghi màn hình (Screen Recording)',
      titleEn: 'CGWindowListCreateImage · screencapture -x',
      systemPathVi: 'System Settings → Privacy & Security → Screen & System Audio Recording → Bật LaLaAIEditor.app',
      explanationVi:
        'Cần thiết để chụp ảnh cửa sổ CapCut trước và sau mỗi thao tác. Giúp AI quan sát khung hình Preview, nhận diện thumbnail trong Media Library và kiểm chứng thao tác đã thành công hay cần khôi phục (Recovery).',
      commandHint: 'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture',
    },
    {
      key: 'automation',
      titleVi: '3. Quyền Tự động hóa (Automation / System Events)',
      titleEn: 'NSAppleEventUsageDescription · AppleScript System Events',
      systemPathVi: 'System Settings → Privacy & Security → Automation → LaLaAIEditor.app → Bật CapCut & System Events',
      explanationVi:
        'Cần thiết để phát hiện CapCut Desktop đang chạy, tự động đưa cửa sổ CapCut lên tiền cảnh (Foreground) và gửi tổ hợp phím tắt chuẩn xác (Cmd+B cắt clip, Cmd+Z hoàn tác, Space phát thử).',
      commandHint: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Automation',
    },
  ];

  const handleGrantAll = () => {
    onUpdatePermissions({
      accessibility: true,
      screenRecording: true,
      automation: true,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="permissions-modal-title"
    >
      <div className="w-full max-w-2xl bg-[#111827] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            {validation.allowed ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
            )}
            <div>
              <h2 id="permissions-modal-title" className="text-lg font-semibold text-slate-100">
                Thiết lập Quyền macOS (macOS Permission Setup Wizard)
              </h2>
              <p className="text-xs text-slate-400">
                Tuân thủ bảo mật chuẩn Apple Silicon (M1 ARM64) · Tuyệt đối không can thiệp trái phép hệ thống
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ quyền macOS"
            className="p-2 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Banner */}
        <div className="px-6 py-3 bg-[#0B0F17] border-b border-slate-800/80 flex items-center justify-between gap-4">
          <div className="text-xs text-slate-300">
            {validation.allowed ? (
              <span className="text-emerald-400 font-medium">
                Đã cấp đủ 3 quyền macOS. LaLa AI Editor sẵn sàng điều khiển trực tiếp giao diện CapCut Desktop.
              </span>
            ) : (
              <span className="text-amber-400 font-medium">
                Đang thiếu {validation.missingPermissionsVi.length} quyền hệ thống. Tự động hóa sẽ tạm dừng cho đến khi bạn bật đủ quyền trong System Settings.
              </span>
            )}
          </div>
          {!validation.allowed && (
            <button
              type="button"
              onClick={handleGrantAll}
              className="px-3 py-1.5 text-xs font-medium bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0"
            >
              Xác nhận đã bật đủ 3 quyền
            </button>
          )}
        </div>

        {/* Permission List */}
        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          {items.map((item) => {
            const granted = permissions[item.key];
            return (
              <div
                key={item.key}
                className="p-4 rounded-lg bg-[#0B0F17] border border-slate-800/90 flex flex-col gap-2.5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      {granted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <h3 className="text-sm font-semibold text-slate-100">{item.titleVi}</h3>
                    </div>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">{item.titleEn}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onUpdatePermissions({
                        ...permissions,
                        [item.key]: !granted,
                      })
                    }
                    aria-label={`Chuyển trạng thái ${item.titleVi}`}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                      granted
                        ? 'bg-emerald-950/50 border-emerald-800/70 text-emerald-300 hover:bg-emerald-900/50'
                        : 'bg-rose-950/50 border-rose-800/70 text-rose-300 hover:bg-rose-900/50'
                    }`}
                  >
                    {granted ? 'Đã cấp quyền (Granted)' : 'Chưa cấp (Bấm để cấp)'}
                  </button>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{item.explanationVi}</p>

                <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                  <span className="font-mono text-[11px] text-slate-300">{item.systemPathVi}</span>
                  <span className="inline-flex items-center gap-1 text-amber-400/90 font-mono text-[11px]">
                    <Terminal className="w-3.5 h-3.5" />
                    {item.commandHint.split('?')[1]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#0B0F17] flex items-center justify-between gap-4">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>Mở Cài đặt Hệ thống macOS: Apple Menu () → System Settings → Privacy & Security</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium bg-slate-800 text-slate-100 rounded-lg hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
          >
            Hoàn tất & Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
