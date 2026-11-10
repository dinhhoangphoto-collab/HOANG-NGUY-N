#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod macos_controller;

use macos_controller::{
    activate_capcut_window, capture_capcut_screenshot, detect_capcut_process, send_capcut_shortcut,
};

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            detect_capcut_process,
            activate_capcut_window,
            capture_capcut_screenshot,
            send_capcut_shortcut
        ])
        .run(tauri::generate_context!())
        .expect("error while running LaLa AI Editor Tauri application");
}
