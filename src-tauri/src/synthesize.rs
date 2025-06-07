use anyhow::Result;
use natural_tts::models::parler::ParlerModel;
use natural_tts::{Model, NaturalTtsBuilder};
use std::error::Error;
use std::panic::{catch_unwind, AssertUnwindSafe};
use tauri::{AppHandle, Emitter};

pub async fn synthesize(app: AppHandle, prompt: String) -> Result<(), Box<dyn Error>> {
    println!("synthesize: begin synthesis for prompt: {}", prompt);
    app.emit("synthesis-started", ())
        .map_err(|e| e.to_string())?;

    // Create the NaturalTts struct using the builder pattern.
    let mut natural = NaturalTtsBuilder::default()
        .parler_model(ParlerModel::default())
        .default_model(Model::Parler)
        .build()?;

    app.emit("synthesis-stopped", ())
        .map_err(|e| e.to_string())?;
    println!("synthesize: synthesis finished");

    app.emit("speaking-started", ())
        .map_err(|e| e.to_string())?;
    println!("synthesize: speaking started");

    // Use the pre-included function to say a message using the default_model without panicking.
    let say_res = catch_unwind(AssertUnwindSafe(|| natural.say_auto(prompt)));
    match say_res {
        Ok(Ok(_)) => (),
        Ok(Err(e)) => println!("synthesize: say_auto error: {}", e),
        Err(e) => println!("synthesize: panic during say_auto: {:?}", e),
    }

    app.emit("speaking-stopped", ())
        .map_err(|e| e.to_string())?;
    println!("synthesize: speaking finished");
    Ok(())
}
