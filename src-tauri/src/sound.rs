/// Reusable helpers for microphone VAD and transcription.

use kalosm::sound::*;
use tokio_stream::StreamExt;
use anyhow::Result;
use tauri::Window;


/// Collects consecutive VAD-positive chunks from the default microphone
/// and prints their durations until the stream ends or the caller drops the task.
pub async fn vad_until_silence(window: Window) -> Result<()> {
    let mic = MicInput::default();
    let stream = mic.stream();
    let mut chunks = stream.voice_activity_stream().rechunk_voice_activity();

    // detection has begun
    window.emit("detection-started", ()).ok();

    while let Some(chunk) = chunks.next().await {
        // user is speaking
        let ms = chunk.total_duration().as_millis();
        window.emit("speaking", ms).ok();
    }

    // stream finished / silence
    window.emit("detection-stopped", ()).ok();
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
