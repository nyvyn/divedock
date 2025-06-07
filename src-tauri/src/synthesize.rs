use anyhow::Result;
use candle_core::{DType, Device, Tensor, IndexOp};
use candle_nn::VarBuilder;
use candle_transformers::generation::LogitsProcessor;
use candle_transformers::models::parler_tts::{Config, Model};
use hf_hub::{api::sync::Api, Repo, RepoType};
use rodio::{buffer::SamplesBuffer, OutputStream, Sink};
use serde_json;
use std::{fs::File, io::BufReader};
use tauri::{AppHandle, Emitter};
use tokenizers::Tokenizer;
use tokio::task;
use crate::audio::normalize_loudness;

const DEFAULT_DESCRIPTION: &str = "A female speaker delivers a slightly expressive and animated speech with a moderate speed and pitch. The recording is of very high quality, with the speaker's voice sounding clear and very close up.";
const MAX_STEPS: usize = 512;
const MODEL: &str = "parler-tts/parler-tts-mini-v1";
const SEED: u64 = 0;
const TEMPERATURE: f64 = 0.0;

/// Play arbitrary PCM audio at given sample rate (mono).
fn play_pcm(pcm: Vec<f32>, rate: u32) -> Result<(), String> {
    let (_stream, handle) = OutputStream::try_default().map_err(|e| e.to_string())?;
    let sink = Sink::try_new(&handle).map_err(|e| e.to_string())?;
    let source = SamplesBuffer::new(1, rate, pcm);
    sink.append(source);
    sink.sleep_until_end();
    Ok(())
}

pub async fn synthesize(app: AppHandle, prompt: String) -> Result<(), String> {
    println!("synthesize: begin synthesis for prompt: {}", prompt);
    app.emit("synthesis-started", ())
        .map_err(|e| e.to_string())?;

    // Run the Parler-TTS pipeline in a blocking thread
    let (pcm, rate): (Vec<f32>, u32) = task::spawn_blocking(move || -> Result<(Vec<f32>, u32), String> {
        println!("synthesize: [blocking] description = {}", DEFAULT_DESCRIPTION);
        // 1. HF-hub API
        let api = Api::new().map_err(|e| e.to_string())?;
        let repo = api.repo(Repo::with_revision(
            MODEL.to_string(),
            RepoType::Model,
            "main".to_string(),
        ));

        // 2. Download model, config, tokenizer
        let model_path = repo.get("model.safetensors").map_err(|e| e.to_string())?;
        let config_path = repo.get("config.json").map_err(|e| e.to_string())?;
        let tokenizer_path = repo.get("tokenizer.json").map_err(|e| e.to_string())?;
        println!(
            "synthesize: [blocking] downloaded files model={:?}, config={:?}, tokenizer={:?}",
            model_path, config_path, tokenizer_path
        );

        // 3. Load tokenizer & config
        let tokenizer = Tokenizer::from_file(&tokenizer_path).map_err(|e| e.to_string())?;
        let config_file = File::open(&config_path).map_err(|e| e.to_string())?;
        let config: Config =
            serde_json::from_reader(BufReader::new(config_file)).map_err(|e| e.to_string())?;

        // 4. Build device & model
        let device = Device::new_metal(0).map_err(|e| e.to_string())?;
        let vb = unsafe {
            VarBuilder::from_mmaped_safetensors(&[model_path.clone()], DType::F32, &device)
                .map_err(|e| e.to_string())?
        };
        let mut model = Model::new(&config, vb).map_err(|e| e.to_string())?;
        println!("synthesize: [blocking] model initialized");

        // 5. Tokenize prompt & description
        let prompt_ids = tokenizer
            .encode(prompt, true)
            .map_err(|e| e.to_string())?
            .get_ids()
            .to_vec();
        let prompt_tensor = Tensor::new(prompt_ids, &device)
            .and_then(|t| t.unsqueeze(0))
            .map_err(|e| e.to_string())?;
        let desc_ids = tokenizer
            .encode(DEFAULT_DESCRIPTION, true)
            .map_err(|e| e.to_string())?
            .get_ids()
            .to_vec();
        let desc_tensor = Tensor::new(desc_ids, &device)
            .and_then(|t| t.unsqueeze(0))
            .map_err(|e| e.to_string())?;

        // 6. Generate codes
        println!("synthesize: [blocking] starting generation with max_steps = {}", MAX_STEPS);
        let lp = LogitsProcessor::new(
            SEED, Option::from(TEMPERATURE), None
        );
        let codes = model
            .generate(&prompt_tensor, &desc_tensor, lp, MAX_STEPS)
            .map_err(|e| e.to_string())?
            .to_dtype(DType::I64)
            .map_err(|e| e.to_string())?;

        println!("synthesize: [blocking] codes generated, decoding to PCM");
        // 7. Decode to PCM
        let codes = codes
            .unsqueeze(0)
            .map_err(|e| e.to_string())?
            .to_device(&device)
            .map_err(|e| e.to_string())?;
        let pcm_tensor = model
            .audio_encoder
            .decode_codes(&codes)
            .map_err(|e| e.to_string())?;
        let pcm_tensor = pcm_tensor.i((0, 0)).map_err(|e| e.to_string())?;
        let norm = normalize_loudness(&pcm_tensor, 24_000, true)
            .map_err(|e| e.to_string())?;
        let pcm = norm.to_vec1::<f32>().map_err(|e| e.to_string())?;
        let rate = config.audio_encoder.sampling_rate;
        Ok((pcm, rate))
    })
    .await
    .map_err(|e| e.to_string())??;

    println!("synthesize: playback starting, samples = {}, rate = {}", pcm.len(), rate);
    play_pcm(pcm, rate)?;
    println!("synthesize: playback finished");

    app.emit("synthesis-stopped", ())
        .map_err(|e| e.to_string())?;
    Ok(())
}
