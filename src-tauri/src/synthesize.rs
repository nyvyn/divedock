use anyhow::{anyhow, Result};
use natural_tts::{Model, NaturalTtsBuilder};
use natural_tts::models::{SynthesizedAudio, parler::ParlerModel, Spec};
use std::error::Error;
use tauri::{AppHandle, Emitter};
use rodio::{buffer::SamplesBuffer};

pub fn play_audio(audio: SynthesizedAudio<f32>) -> Result<()> {
    // SynthesizedAudio fields exposed by the crate
    //     pub spec: Spec,
    //     pub data: Vec<T>,
    //     pub duration: Option<i32>,
    //  [oai_citation:0‡docs.rs](https://github.com/CodersCreative/natural-tts/blob/master/src/lib.rs#L111)
    let (_stream, handle) = rodio::OutputStream::try_default()?;
    let data = audio.data;
    // pull rate / channel count out of the enum
    let (channels, sample_rate) = match audio.spec {
        Spec::Wav(wav) => (wav.channels, wav.sample_rate),
        _ => return Err(anyhow!("unsupported audio format")),
    };
    let source = SamplesBuffer::new(channels, sample_rate, data);
    let sink = rodio::Sink::try_new(&handle)?;

    sink.append(source);

    sink.sleep_until_end();
    Ok(())
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
    let audio = natural.synthesize_auto(prompt.clone())?;
    
    app.emit("synthesis-stopped", ())
        .map_err(|e| e.to_string())?;
    println!("synthesize: synthesis finished");

    app.emit("speaking-started", ())
        .map_err(|e| e.to_string())?;
    println!("synthesize: speaking started");

    // play the resulting synthesized audio
    play_audio(audio)?;

    app.emit("speaking-stopped", ())
        .map_err(|e| e.to_string())?;
    println!("synthesize: speaking finished");
    Ok(())
}
