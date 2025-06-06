/// Reusable helpers for microphone VAD and transcription.

use kalosm::sound::*;
use tokio_stream::StreamExt;
use anyhow::Result;


/// Collects consecutive VAD-positive chunks from the default microphone
/// and prints their durations until the stream ends or the caller drops the task.
pub async fn vad_until_silence() -> Result<()> {
    let mic = MicInput::default();
    let stream = mic.stream();
    let mut chunks = stream.voice_activity_stream().rechunk_voice_activity();

    while let Some(chunk) = chunks.next().await {
        println!("New voice activity chunk with duration {:?}", chunk.total_duration());
    }
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
