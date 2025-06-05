import { useEffect, useRef, useState } from "react";
// Keep other imports like @huggingface/transformers if they are used elsewhere,
// but the pipeline itself will now be in the worker.

export function useTranscriber() {
    const [error, setError] = useState<boolean | string>(false);
    const [loading, setLoading] = useState(false); // For the overall transcription call
    const [initializingModel, setInitializingModel] = useState(true); // True until model is loaded in worker
    const [transcribing, setTranscribing] = useState(false);
    const [transcription, setTranscription] = useState(null);
    const workerRef = useRef<Worker | null>(null);

    useEffect(() => {
        workerRef.current = new Worker(new URL("./transcriber.worker.js", import.meta.url), {
            type: "module"
        });

        const worker = workerRef.current;

        worker.onmessage = (event: any) => {
            const {type, message, text, data} = event.data;
            switch (type) {
                case "worker_loaded":
                    console.log("Transcription worker loaded.");
                    // Model loading starts automatically in worker, wait for "model_loading_done"
                    break;
                case "model_loading_start":
                    setInitializingModel(true);
                    setError(false);
                    console.log("Model loading started in worker...");
                    break;
                case "model_loading_done":
                    setInitializingModel(false);
                    console.log("Transcription model initialized in worker.");
                    break;
                case "model_loading_progress":
                    console.log("Model loading progress:", data);
                    break;
                case "transcribing_start":
                    setTranscribing(true);
                    setLoading(true); // Also set loading for the overall process
                    setError(false);
                    setTranscription(null);
                    break;
                case "transcription_result":
                    setTranscription(text);
                    console.log("Transcription result:", text);
                    break;
                case "transcribing_end":
                    setTranscribing(false);
                    setLoading(false);
                    break;
                case "error":
                    setError(message);
                    setInitializingModel(false); // If an error occurs, assume init failed or stopped
                    setTranscribing(false);
                    setLoading(false);
                    console.error("Worker error:", message);
                    break;
                case "info":
                    console.info("Worker info:", message);
                    // Potentially set a non-error message for the user
                    break;
            }
        };

        worker.onerror = (err: any) => {
            console.error("Unhandled worker error:", err);
            setError(err.message || "An unhandled worker error occurred");
            setInitializingModel(false);
            setTranscribing(false);
            setLoading(false);
        };

        return () => {
            if (worker) {
                worker.terminate();
            }
            workerRef.current = null;
        };
    }, []); // Runs once on component mount

    async function transcribe(audio: any) {
        if (!workerRef.current) {
            setError("Worker is not available.");
            console.error("Transcribe called before worker initialized.");
            return;
        }

        if (initializingModel) {
            setError("Model is still initializing. Please wait.");
            // Or, you could queue the request.
            return;
        }
        if (transcribing) {
            setError("A transcription is already in progress.");
            return;
        }

        // States will be updated based on worker messages
        workerRef.current.postMessage(audio);
    }

    return {error, loading, initializingModel, transcribe, transcribing, transcription};
}
