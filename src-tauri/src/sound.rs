/// Reusable helpers for microphone activity detection and transcription.

use kalosm::sound::*;
use tokio_stream::StreamExt;
use anyhow::{Result, anyhow};
use tauri::{AppHandle, Emitter};
use tauri::async_runtime::{self, JoinHandle};
use once_cell::sync::Lazy;
use std::sync::Mutex;
use kalosm::sound::rodio::Source;

static VAD_TASK: Lazy<Mutex<Option<JoinHandle<()>>>> =
    Lazy::new(|| Mutex::new(None));

/// Collects consecutive VAD-positive chunks from the default microphone
/// and prints their durations until the stream ends or the caller drops the task.
pub async fn voice_activity_detection(app: AppHandle) -> Result<()> {
    println!("voice_activity_detection: starting VAD stream");
    let mic = MicInput::default();
    let stream = mic.stream();
    let vad_stream = stream.voice_activity_stream();
    let mut audio_chunks = vad_stream.rechunk_voice_activity();

    // detection has begun
    app.emit("detection-started", ()).ok();
    println!("voice_activity_detection: detection-started event emitted");

    while let Some(input) = StreamExt::next(&mut audio_chunks).await
    {
        // user is speaking
        app.emit("detection-speaking", input.total_duration()).ok();
        println!(
            "voice_activity_detection: speaking event emitted | duration = {:?}",
            input.total_duration()
        );
    }

    // stream finished / silence
    app.emit("detection-stopped", ()).ok();
    println!("vad_until_silence: detection-stopped event emitted");
    Ok(())
}

/// Spawn VAD loop (no-op if one already runs)
pub fn start_vad(app: AppHandle) -> Result<()> {
    let mut guard = VAD_TASK
        .lock()
        .map_err(|e| anyhow!(e.to_string()))?;
    if guard.is_some() {
        println!("start_vad: already running");
        return Ok(());
    }
    let handle = async_runtime::spawn(async move {
        if let Err(e) = voice_activity_detection(app).await {
            println!("VAD loop error: {e}");
        }
    });
    *guard = Some(handle);
    Ok(())
}

/// Abort the running VAD task (if any)
pub fn stop_vad() -> Result<()> {
    let mut guard = VAD_TASK
        .lock()
        .map_err(|e| anyhow!(e.to_string()))?;
    if let Some(handle) = guard.take() {
        handle.abort();
        println!("stop_vad: task aborted");
    }
    Ok(())
}

/// Runs Whisper on the microphone and streams the transcription to stdout.
pub async fn transcribe_realtime() -> Result<()> {
    println!("transcribe_realtime: starting");
    let mic = MicInput::default();
    let stream = mic.stream();
    let mut tx = stream.transcribe(Whisper::new().await?);
    tx.to_std_out().await?;
    println!("transcribe_realtime: finished");
    Ok(())
}
