import { pipeline } from "@huggingface/transformers";

// Optional: If you need to host ONNX WASM files locally (e.g., for offline or specific versions)
// and have placed them in `public/ort-wasm-files/`, uncomment the following:
// env.backends.onnx.wasm.wasmPaths = "/ort-wasm-files/";
// Make sure to download the necessary .wasm files from the onnxruntime-web package
// (e.g., from node_modules/onnxruntime-web/dist/) and place them in public/ort-wasm-files/.

let transcriberPipe = null;
let isInitializing = false;

/**
 * Use self for worker context.
 * ctx = self in browser worker, fallback to globalThis for SSR/Node (should not run in Node).
 */
const ctx = typeof self !== "undefined" && typeof self.postMessage === "function" ? self : globalThis;

async function initializePipe() {
    if (transcriberPipe || isInitializing) {
        return transcriberPipe;
    }
    isInitializing = true;
    ctx.postMessage({ type: "model_loading_start" });
    try {
        transcriberPipe = await pipeline(
            "automatic-speech-recognition",
            "onnx-community/whisper-small",
            {
                dtype: "q8",
                progress_callback: (progress) => {
                  ctx.postMessage({ type: "model_loading_progress", data: progress });
                }
            }
        );
        ctx.postMessage({ type: "model_loading_done" });
    } catch (error) {
        ctx.postMessage({ type: "error", message: `Model initialization failed: ${error?.message || error}` });
        transcriberPipe = null; // Ensure it can try again or signals failure
    } finally {
        isInitializing = false;
    }
    return transcriberPipe;
}

// Initialize the pipe as soon as the worker loads, or on first message.
// Initializing early can make the first transcription faster.
initializePipe().then();

ctx.onmessage = async (event) => {
    const audio = event.data;

    if (!audio) {
        ctx.postMessage({ type: "error", message: "No audio data received by worker" });
        return;
    }

    try {
        let pipe = transcriberPipe;
        if (!pipe) {
            if (isInitializing) {
                ctx.postMessage({ type: "info", message: "Model is still initializing. Please wait." });
                return;
            }
            pipe = await initializePipe();
            if (!pipe) { // Check again if initialization failed
                ctx.postMessage({ type: "error", message: "Transcription pipeline not available after attempt to initialize." });
                return;
            }
        }

        ctx.postMessage({ type: "transcribing_start" });
        const output = await pipe(audio, { language: "en" });
        ctx.postMessage({ type: "transcription_result", text: output.text ?? "" });

    } catch (err) {
        ctx.postMessage({ type: "error", message: err?.message || "Transcription failed in worker" });
    } finally {
        ctx.postMessage({ type: "transcribing_end" });
    }
};

if (typeof ctx.postMessage === "function") {
    // Signal that the worker script itself has loaded
    ctx.postMessage({ type: "worker_loaded" });
}
