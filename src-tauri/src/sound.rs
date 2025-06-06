/// Reusable helpers for microphone VAD and transcription.

use kalosm::sound::*;
use tokio_stream::StreamExt;
use anyhow::Result;
use tauri::{AppHandle, Emitter};

/// Collects consecutive VAD-positive chunks from the default microphone
/// and prints their durations until the stream ends or the caller drops the task.
pub async fn vad_until_silence(app: AppHandle) -> Result<()> {
    let mic = MicInput::default();
    let stream = mic.stream();
    let mut vad = stream.voice_activity_stream();

    // detection has begun
    app.emit("detection-started", ()).ok();

    while let Some(input) = vad.next().await {
        // user is speaking
        app.emit("detection-speaking", input.probability).ok();
    }

    // stream finished / silence
    app.emit("detection-stopped", ()).ok();
    Ok(())
}

/// Runs Whisper on the microphone and streams the transcription to stdout.
pub async fn transcribe_realtime() -> Result<()> {
    let mic = MicInput::default();
    let stream = mic.stream();
    let mut tx = stream.transcribe(Whisper::new().await?);
    tx.to_std_out().await?;
    Ok(())
}
