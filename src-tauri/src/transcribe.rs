use crate::synthesize::synthesize;
use crate::synthesize::TtsState;
use anyhow::{anyhow, Result};
use kalosm::sound::rodio::buffer::SamplesBuffer;
use kalosm::sound::rodio::Source;
use once_cell::sync::Lazy;
use std::sync::Mutex;
use kalosm::sound::{AsyncSourceTranscribeExt, MicInput, VoiceActivityDetectorExt, VoiceActivityStreamExt, Whisper};
use tauri::async_runtime::{self, JoinHandle};
use tauri::{AppHandle, Emitter, Manager};
use tokio_stream::StreamExt;

static VAD_TASK: Lazy<Mutex<Option<JoinHandle<()>>>> = Lazy::new(|| Mutex::new(None));

/// Spawn VAD loop (no-op if one already runs)
pub fn start_vad(app: AppHandle) -> Result<()> {
    let mut guard = VAD_TASK.lock().map_err(|e| anyhow!(e.to_string()))?;
    if guard.is_some() {
        println!("start_vad: already running");
        return Ok(());
    }
    let app_for_task = app.clone();
    let handle = async_runtime::spawn(async move {
        if let Err(e) = voice_activity_detection(app_for_task).await {
            println!("VAD loop error: {e}");
        }
    });
    *guard = Some(handle);
    app.emit("mic-enabled", ()).ok();
    Ok(())
}

/// Abort the running VAD task (if any)
pub fn stop_vad(app: AppHandle) -> Result<()> {
    let mut guard = VAD_TASK.lock().map_err(|e| anyhow!(e.to_string()))?;
    if let Some(handle) = guard.take() {
        handle.abort();
        println!("stop_vad: task aborted");
        app.emit("mic-disabled", ()).ok();
    }
    Ok(())
}

//// Runs Whisper on the chunk and emits every recognised line.
pub async fn transcribe_audio(app: AppHandle, input: SamplesBuffer<f32>) -> Result<()> {
    println!("transcribe_audio: starting");

    let mut tx = input.transcribe(Whisper::new().await?);

    // notify frontend that a new transcription session has begun
    app.emit("transcription-started", ()).ok();

    // Stream each transcription line and emit it.
    while let Some(segment) = StreamExt::next(&mut tx).await {
        let text = segment.text();

        app.emit("transcription-line", text).ok();
        println!("transcription-line: {text}");
        if let Err(e) = synthesize(app.clone(), app.state::<TtsState>(), text.to_string()).await {
            println!("synthesis error: {e}");
        }
    }

    // session finished
    app.emit("transcription-stopped", ()).ok();
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

        // Consume and drop the very next VAD-positive chunk (likely echo)
        let _ = audio_chunks.next().await;  // Option<AudioChunk> ignored which is the synthesis
    }

    Ok(())
}
