import { useState, useRef } from "react";
import { pipeline } from "@huggingface/transformers";

export function useTranscriber() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | boolean>(false);
    const [result, setResult] = useState<string | null>(null);
    const pipeRef = useRef<any>(null);

    async function transcribe(audio: Float32Array) {
        setLoading(true);
        setError(false);
        setResult(null);

        try {
            if (!pipeRef.current) {
                pipeRef.current = await pipeline(
                    "automatic-speech-recognition",
                    "onnx-community/whisper-tiny"
                );
            }
            const pipe = pipeRef.current;

            // Convert Float32Array to a Blob (WAV) for the pipeline
            const wavBlob = float32ToWavBlob(audio, 16000);

            const output = await pipe(wavBlob);

            setResult(output.text ?? "");
        } catch (err: any) {
            setError(err?.message || "Transcription failed");
        } finally {
            setLoading(false);
        }
    }

    return { transcribe, loading, error, result };
}

function float32ToWavBlob(float32Array: Float32Array, sampleRate: number): Blob {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
        let s = Math.max(-1, Math.min(1, float32Array[i]));
        int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    const buffer = new ArrayBuffer(44 + int16Array.length * 2);
    const view = new DataView(buffer);

    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + int16Array.length * 2, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, "data");
    view.setUint32(40, int16Array.length * 2, true);

    let offset = 44;
    for (let i = 0; i < int16Array.length; i++, offset += 2) {
        view.setInt16(offset, int16Array[i], true);
    }

    return new Blob([buffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
    }
}
