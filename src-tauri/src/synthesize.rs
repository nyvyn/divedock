use anyhow::Result;
use candle_core::{DType, Device, Tensor};
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

const DEFAULT_DESCRIPTION: &str = "A female speaker delivers a slightly expressive and animated speech with a moderate speed and pitch. The recording is of very high quality, with the speaker's voice sounding clear and very close up.";
const MAX_STEPS: usize = 5;

pub async fn synthesize(app: AppHandle, prompt: String) -> Result<(), String> {
    println!("synthesize: begin synthesis for prompt: {}", prompt);
    app.emit("synthesis-started", ())
        .map_err(|e| e.to_string())?;

    // Run the Parler-TTS pipeline in a blocking thread
    let pcm: Vec<f32> = task::spawn_blocking(move || -> Result<_, String> {
        println!("synthesize: [blocking] prompt = {}", prompt);
        // 1. HF-hub API
        let api = Api::new().map_err(|e| e.to_string())?;
        let model_id = "parler-tts/parler-tts-mini-v1";
        let repo = api.repo(Repo::with_revision(
            model_id.to_string(),
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
        let device = Device::Cpu;
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
        let lp = LogitsProcessor::new(0, None, None);
        let codes = model
            .generate(&prompt_tensor, &desc_tensor, lp, MAX_STEPS)
            .map_err(|e| e.to_string())?
            .to_dtype(DType::I64)
            .map_err(|e| e.to_string())?;

        println!("synthesize: [blocking] codes generated, decoding to PCM");
        // 7. Decode to PCM
        let pcm_tensor = model
            .audio_encoder
            .decode_codes(&codes.unsqueeze(0).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
        let pcm = pcm_tensor.to_vec1::<f32>().map_err(|e| e.to_string())?;
        Ok(pcm)
    })
    .await
    .map_err(|e| e.to_string())??;

    println!("synthesize: playback starting, samples = {}", pcm.len());
    // Play back via rodio
    let (_stream, handle) = OutputStream::try_default().map_err(|e| e.to_string())?;
    let sink = Sink::try_new(&handle).map_err(|e| e.to_string())?;
    let source = SamplesBuffer::new(1, 24000, pcm);
    sink.append(source);
    sink.sleep_until_end();
    println!("synthesize: playback finished");

    app.emit("synthesis-stopped", ())
        .map_err(|e| e.to_string())?;
    Ok(())
}
