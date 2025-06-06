mod sound;
use sound::*;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn mic_vad(window: tauri::Window) -> Result<(), String> {
    vad_until_silence(window).await.map_err(|e| e.to_string())
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
            greet,
            mic_vad,
            mic_transcribe
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
