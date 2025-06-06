mod sound;
use sound::*;

use tauri::{AppHandle};

#[tauri::command]
async fn start_listening(app: AppHandle) -> Result<(), String> {
    println!("start_listening command invoked");
    start_vad(app).map_err(|e| { println!("start_listening error: {e}"); e.to_string() })
}

#[tauri::command]
async fn stop_listening() -> Result<(), String> {
    println!("stop_listening command invoked");
    stop_vad().map_err(|e| { println!("stop_listening error: {e}"); e.to_string() })
}

#[tauri::command]
async fn mic_transcribe() -> Result<(), String> {
    println!("mic_transcribe command invoked");
    transcribe_realtime().await.map_err(|e| {
        println!("mic_transcribe error: {e}");
        e.to_string()
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_macos_permissions::init())
        .invoke_handler(tauri::generate_handler![
            start_listening,
            stop_listening,
            mic_transcribe
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
