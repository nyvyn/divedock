use anyhow::Result;
use natural_tts::models::tts_rs::TtsModel;
use natural_tts::{Model, NaturalTtsBuilder};
use std::error::Error;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};

pub struct TtsState(Mutex<natural_tts::NaturalTts>);

pub fn init_tts() -> TtsState {
    let tts = NaturalTtsBuilder::default()
        .tts_model(TtsModel::default())
        .default_model(Model::TTS)
        .build()
        .expect("TTS init failed");
    TtsState(Mutex::new(tts))
}

pub async fn synthesize(
    app: AppHandle,
    state: tauri::State<'_, TtsState>,
    prompt: String,
) -> Result<(), Box<dyn Error>> {
    app.emit("speaking-started", ())
        .map_err(|e| e.to_string())?;
    println!("synthesize: speaking started");

    // play the resulting synthesized audio
    let mut tts = state.0.lock().unwrap();
    if let Err(e) = tts.say_auto(prompt) {
        eprintln!("TTS failed: {}", e);
    }

    app.emit("speaking-stopped", ())
        .map_err(|e| e.to_string())?;
    println!("synthesize: speaking finished");
    Ok(())
}
