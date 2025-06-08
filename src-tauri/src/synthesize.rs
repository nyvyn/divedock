use anyhow::Result;
use std::error::Error;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};
use tts::{Features, Tts};

pub struct TtsState(Mutex<Tts>);

pub fn init_tts(app: AppHandle) -> TtsState {
    let mut tts = Tts::default().unwrap();       // picks the best backend for the OS

    let Features { voice, .. } = tts.supported_features();
    if voice {
        let voices = tts.voices().unwrap();          // Vec<tts::Voice>
        let ava = voices.iter().find(|v| v.name() == "Ava").unwrap();
        tts.set_voice(&ava).unwrap();            // use the chosen voice
    }

    let Features {
        utterance_callbacks,
        ..
    } = tts.supported_features();
    if utterance_callbacks {
        let app_clone_begin = app.clone();
        tts.on_utterance_begin(Some(Box::new(move |utterance| {
            app_clone_begin.emit("speaking-started", ())
                .map_err(|e| e.to_string()).unwrap();
            println!("Started speaking {:?}", utterance)
        }))).unwrap();
        let app_clone_end = app.clone();
        tts.on_utterance_end(Some(Box::new(move |utterance| {
            app_clone_end.emit("speaking-stopped", ())
                .map_err(|e| e.to_string()).unwrap();
            println!("Finished speaking {:?}", utterance)
        }))).unwrap();
        let app_clone_stop = app.clone();
        tts.on_utterance_stop(Some(Box::new(move |utterance| {
            app_clone_stop.emit("speaking-stopped", ())
                .map_err(|e| e.to_string()).unwrap();
            println!("Stopped speaking {:?}", utterance)
        }))).unwrap();
    }

    TtsState(Mutex::new(tts))
}

pub async fn synthesize_text(
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
