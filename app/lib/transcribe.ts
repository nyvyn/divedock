import * as ort from "onnxruntime-web";

// You may need to adjust the model path and tokenizer for your setup.
const MODEL_URL = "/models/whisper-tiny.onnx";

let sessionPromise: Promise<ort.InferenceSession> | null = null;

async function getSession() {
    if (!sessionPromise) {
        sessionPromise = ort.InferenceSession.create(MODEL_URL, { executionProviders: ["wasm"] });
    }
    return sessionPromise;
}

/**
 * Transcribe audio using Whisper ONNX model in the browser.
 * @param audio Float32Array PCM audio, 16kHz, mono
 * @returns Promise<string> transcript
 */
export async function transcribe(audio: Float32Array): Promise<string> {
    const session = await getSession();

    // TODO: Preprocess audio to match Whisper input (e.g., convert to log-mel spectrogram)
    // This is a placeholder. You need to implement log-mel spectrogram extraction.
    // For a real implementation, see: https://github.com/ggerganov/whisper.cpp/blob/master/whisper.cpp#L1200
    // or use a JS library if available.

    // Example placeholder: assume audio is already a Float32Array of the correct shape
    // Whisper expects [1, 80, 3000] log-mel spectrogram for 30s of audio at 16kHz
    // You must replace this with actual preprocessing!
    const input = new ort.Tensor("float32", audio, [1, 1, audio.length]);

    const feeds: Record<string, ort.Tensor> = {
        "audio_features": input,
    };

    const results = await session.run(feeds);

    // TODO: Postprocess results to decode tokens to text
    // This is a placeholder. You need to implement token decoding.
    // For a real implementation, see: https://github.com/openai/whisper/blob/main/whisper/tokenizer.py

    // Example: get output tokens and join as string (not real decoding)
    const tokens = results["text"]?.data as Int32Array | undefined;
    if (!tokens) return "";

    // Placeholder: just return token ids as string
    return tokens.join(" ");
}
