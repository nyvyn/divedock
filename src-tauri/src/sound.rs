/// Reusable helpers for microphone activity detection and transcription.

use kalosm::sound::*;
use tokio_stream::StreamExt;
use anyhow::{Result, anyhow};
use tauri::{AppHandle, Emitter};
use tauri::async_runtime::{self, JoinHandle};
use once_cell::sync::Lazy;
use std::sync::Mutex;
use kalosm::sound::rodio::buffer::SamplesBuffer;
use kalosm::sound::rodio::Source;

static VAD_TASK: Lazy<Mutex<Option<JoinHandle<()>>>> =
    Lazy::new(|| Mutex::new(None));

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

//// Runs Whisper on the chunk and emits every recognised line.
pub async fn transcribe_audio(app: AppHandle, input: SamplesBuffer<f32>) -> Result<()> {
    println!("transcribe_audio: starting");

    let mut tx = input.transcribe(Whisper::new().await?);

    // Stream each transcription line and emit it.
    while let Some(res) = StreamExt::next(&mut tx).await {
        // Depending on kalosm’s API the item might be `String` or `Result<String, _>`
        let text = match res {
            Ok(t) => t,
            Err(e) => {
                println!("transcription error: {e}");
                continue;
            }
        };

        app.emit("speech-transcribed", text.clone()).ok();
        println!("speech-transcribed: {text}");
    }

    println!("transcribe_audio: finished");
    Ok(())
}

/// Collects consecutive VAD-positive chunks from the default microphone
/// and prints their durations until the stream ends or the caller drops the task.
pub async fn voice_activity_detection(app: AppHandle) -> Result<()> {
    println!("voice_activity_detection: starting VAD stream");
    let mic = MicInput::default();
    let stream = mic.stream();
    let vad_stream = stream.voice_activity_stream();
    let mut audio_chunks = vad_stream.rechunk_voice_activity();

    while let Some(input) = StreamExt::next(&mut audio_chunks).await
    {
        app.emit("speech-detected", input.total_duration()).ok();
        println!(
            "voice_activity_detection: speaking event emitted | duration = {:?}",
            input.total_duration()
        );
        transcribe_audio(app.clone(), input).await?;
    }

    Ok(())
}
