#!/usr/bin/env bash
set -euo pipefail

echo "=================================================================="
echo "  LaLa AI Editor — Native Apple Silicon (M1 ARM64) Builder"
echo "  Target: macOS 12+ (aarch64-apple-darwin)"
echo "  Components: Swift Native Helper + Tauri 2 Rust + React UI"
echo "  Outputs: LaLaAIEditor.app & LaLaAIEditor.dmg"
echo "=================================================================="

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "[INFO] Current host is $(uname -s). Run this script on macOS M1/M2/M3 to produce signed ARM64 bundles."
  exit 0
fi

rustup target add aarch64-apple-darwin

echo "[1/3] Compiling Native Swift Helper (ScreenCaptureKit + Accessibility + Vision + CGEvent)..."
pushd src-tauri/swift-helper
swift build -c release --arch arm64
mkdir -p ../binaries
cp .build/arm64-apple-macosx/release/lala-macos-helper ../binaries/lala-macos-helper-aarch64-apple-darwin
popd

echo "[2/3] Building Frontend Bundle..."
npm install
npm run build

echo "[3/3] Packaging Tauri 2 ARM64 App & DMG..."
npx tauri build --target aarch64-apple-darwin --bundles app,dmg

echo "[SUCCESS] Built bundles:"
echo "  - src-tauri/target/aarch64-apple-darwin/release/bundle/macos/LaLaAIEditor.app"
echo "  - src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/LaLaAIEditor_1.1.0_aarch64.dmg"
