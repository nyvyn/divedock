mod sound;
use sound::*;

use tauri::{AppHandle};

#[tauri::command]
async fn mic_detect(app: AppHandle) -> Result<(), String> {
    vad_until_silence(app).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn mic_transcribe() -> Result<(), String> {
    transcribe_realtime().await.map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_macos_permissions::init())
        .invoke_handler(tauri::generate_handler![
            mic_detect,
            mic_transcribe
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
