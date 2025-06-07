use std::error::Error;
use anyhow::Result;
use natural_tts::models::tts_rs::TtsModel;
use natural_tts::{Model, NaturalTtsBuilder};
use tauri::{AppHandle, Emitter};
use std::panic::{catch_unwind, AssertUnwindSafe};

pub async fn synthesize(app: AppHandle, prompt: String) -> Result<(), Box<dyn Error>> {
    println!("synthesize: begin synthesis for prompt: {}", prompt);
    app.emit("synthesis-started", ())
        .map_err(|e| e.to_string())?;

    // Create the NaturalTts struct using the builder pattern.
    let mut natural = NaturalTtsBuilder::default()
        .tts_model(TtsModel::default())
        .default_model(Model::TTS)
        .build()?;

    // Use the pre-included function to say a message using the default_model without panicking.
    let say_res = catch_unwind(AssertUnwindSafe(|| natural.say_auto(prompt)));
    match say_res {
        Ok(Ok(_)) => (),
        Ok(Err(e)) => println!("synthesize: say_auto error: {}", e),
        Err(e) => println!("synthesize: panic during say_auto: {:?}", e),
    }

    app.emit("synthesis-stopped", ())
        .map_err(|e| e.to_string())?;
    println!("synthesize: synthesis finished");
    Ok(())
}
