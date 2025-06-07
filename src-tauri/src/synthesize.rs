use anyhow::Result;
use natural_tts::models::parler::ParlerModel;
use natural_tts::{Model, NaturalTtsBuilder};
use std::error::Error;
use std::panic::{catch_unwind, AssertUnwindSafe};
use kalosm::sound::rodio::cpal::FromSample;
use tauri::{AppHandle, Emitter};
use rodio::{buffer::SamplesBuffer};

pub fn play_audio<T>(data: Vec<T>, rate: u32)
where
    T: rodio::Sample + Send + 'static,
    f32: FromSample<T>,
{
    let (_stream, handle) = rodio::OutputStream::try_default().unwrap();
    let source = SamplesBuffer::new(1, rate, data);
    let sink = rodio::Sink::try_new(&handle).unwrap();

    sink.append(source);

    sink.sleep_until_end();
}

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

    // play the resulting synthesized audio

    app.emit("speaking-stopped", ())
        .map_err(|e| e.to_string())?;
    println!("synthesize: speaking finished");
    Ok(())
}
