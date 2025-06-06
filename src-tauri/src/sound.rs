/// Reusable helpers for microphone VAD and transcription.

use kalosm::sound::*;
use tokio_stream::StreamExt;
use anyhow::Result;
use tauri::{AppHandle, Emitter};

/// Collects consecutive VAD-positive chunks from the default microphone
/// and prints their durations until the stream ends or the caller drops the task.
pub async fn vad_until_silence(app: AppHandle) -> Result<()> {
    println!("vad_until_silence: starting VAD stream");
    let mic = MicInput::default();
    let stream = mic.stream();
    let mut vad_stream = stream.voice_activity_stream();

    // detection has begun
    app.emit("detection-started", ()).ok();
    println!("vad_until_silence: detection-started event emitted");

    while let Some(input) =
        StreamExt::next(&mut vad_stream).await
    {
        // user is speaking
        app.emit("detection-speaking", input.probability).ok();
        println!(
            "vad_until_silence: speaking event emitted | probability = {}",
            input.probability
        );
    }

    // stream finished / silence
    app.emit("detection-stopped", ()).ok();
    println!("vad_until_silence: detection-stopped event emitted");
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
