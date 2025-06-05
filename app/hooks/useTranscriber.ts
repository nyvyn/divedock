import { pipeline } from "@huggingface/transformers";
import { useRef, useState } from "react";

export function useTranscriber() {
    const [error, setError] = useState<string | boolean>(false);
    const [loading, setLoading] = useState(false);
    const [transcribing, setTranscribing] = useState(false);
    const [transcription, setTranscription] = useState<string | null>(null);
    const pipeRef = useRef<any>(null);

    async function transcribe(audio: Float32Array) {
        setLoading(true);
        setError(false);
        setTranscription(null);

        try {
            setTranscribing(true);

            if (!pipeRef.current) {
                pipeRef.current = await pipeline(
                    "automatic-speech-recognition",
                    "onnx-community/whisper-small",
                    {dtype: "q8"}
                );
            }
            const pipe = pipeRef.current;

            const output = await pipe(audio, {language: "en"});

            setTranscription(output.text ?? "");

            setTranscribing(false);

            return output.text ?? "";

        } catch (err: any) {
            setError(err?.message || "Transcription failed");
        } finally {
            setLoading(false);
        }
    }

    return {error, loading, transcribe, transcribing, transcription};
}
