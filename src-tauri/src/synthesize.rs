use anyhow::Result;
use natural_tts::models::parler::ParlerModel;
use natural_tts::{Model, NaturalTtsBuilder};
use std::error::Error;
use std::panic::{catch_unwind, AssertUnwindSafe};
use tauri::{AppHandle, Emitter};
use rodio::{OutputStream, Sink, buffer::SamplesBuffer};

pub async fn synthesize(app: AppHandle, prompt: String) -> Result<(), Box<dyn Error>> {
    println!("synthesize: begin synthesis for prompt: {}", prompt);
    app.emit("synthesis-started", ())
        .map_err(|e| e.to_string())?;

    // Create the NaturalTts struct using the builder pattern.
    let mut natural = NaturalTtsBuilder::default()
        .parler_model(ParlerModel::default())
        .default_model(Model::Parler)
        .build()?;

    // perform synthesis (convert text to audio)
    let synth_res = catch_unwind(AssertUnwindSafe(|| natural.synthesize_auto(prompt.clone())));
    match synth_res {
        Ok(Ok(_)) => (),
        Ok(Err(e)) => println!("synthesize: synthesize_auto error: {}", e),
        Err(e) => println!("synthesize: panic during synthesize_auto: {:?}", e),
    }
    app.emit("synthesis-stopped", ())
        .map_err(|e| e.to_string())?;
    println!("synthesize: synthesis finished");

    app.emit("speaking-started", ())
        .map_err(|e| e.to_string())?;
    println!("synthesize: speaking started");

    // Play synthesized audio directly to the speaker
    let (_stream, stream_handle) = OutputStream::try_default()
        .map_err(|e| e.to_string())?;
    let sink = Sink::try_new(&stream_handle)
        .map_err(|e| e.to_string())?;
    match natural.synthesize_auto(prompt.clone()) {
        Ok(audio_data) => {
            // Stream the PCM samples directly to the speaker
            let channels = audio_data.num_channels() as u16;
            let sample_rate = audio_data.sample_rate();
            let samples = audio_data.as_ref().to_vec();
            let source = SamplesBuffer::new(channels, sample_rate, samples);
            sink.append(source);
            sink.sleep_until_end();
        }
        Err(e) => println!("synthesize: synthesize_auto error: {}", e),
    }

    app.emit("speaking-stopped", ())
        .map_err(|e| e.to_string())?;
    println!("synthesize: speaking finished");
    Ok(())
}
