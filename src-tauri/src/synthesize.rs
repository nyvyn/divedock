use anyhow::Result;
use std::error::Error;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};
use tts::Tts;

pub struct TtsState(Mutex<Tts>);

pub fn init_tts() -> TtsState {
    let mut tts = Tts::default().unwrap();       // picks the best backend for the OS
    let voices = tts.voices().unwrap();          // Vec<tts::Voice>
    for v in &voices {
        println!("{} – {}", v.id(), v.name());   // inspect what you have
    }

    let alex = voices.iter().find(|v| v.name() == "Ralph").unwrap();
    tts.set_voice(&alex).unwrap();            // use the chosen voice
 
    TtsState(Mutex::new(tts))
}

pub async fn synthesize(
    app: AppHandle,
    state: tauri::State<'_, TtsState>,
    prompt: String,
) -> Result<(), Box<dyn Error>> {
    app.emit("synthesis-started", ())
        .map_err(|e| e.to_string())?;
    println!("synthesize: started");

    // play the resulting synthesized audio
    let mut tts = state.0.lock().unwrap();
    if let Err(e) = tts.speak(prompt, false) {
        eprintln!("TTS failed: {}", e);
    }

    app.emit("synthesis-stopped", ())
        .map_err(|e| e.to_string())?;
    println!("synthesize: finished");
    Ok(())
}
