import { useCallback, useRef, useState } from "react";
import { pipeline } from "@huggingface/transformers";

/**
 * useTranscriber hook
 * 
 * Provides a function to transcribe a Float32Array audio buffer using
 * HuggingFace Transformers Whisper-tiny ONNX model.
 * 
 * Usage:
 *   const { transcribe, loading, error, result } = useTranscriber();
 *   await transcribe(audioBuffer);
 */
export function useTranscriber() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const pipeRef = useRef<any>(null);

  // Loads the pipeline only once
  const loadPipeline = useCallback(async () => {
    if (!pipeRef.current) {
      pipeRef.current = await pipeline(
        "automatic-speech-recognition",
        "onnx-community/whisper-tiny"
      );
    }
    return pipeRef.current;
  }, []);

  /**
   * Transcribes a Float32Array audio buffer.
   * @param audio Float32Array
   */
  const transcribe = useCallback(
    async (audio: Float32Array) => {
      setLoading(true);
      setError(null);
      setResult(null);
      try {
        const pipe = await loadPipeline();

        // Convert Float32Array to a Blob (WAV) for the pipeline
        // Whisper expects 16kHz mono WAV, but vad-react is likely 24kHz or 48kHz.
        // For now, we just encode as-is. For best results, resample to 16kHz.
        const wavBlob = float32ToWavBlob(audio, 16000);

        // The pipeline can accept a Blob or File
        const output = await pipe(wavBlob);

        setResult(output.text ?? "");
      } catch (err: any) {
        setError(err?.message || "Transcription failed");
      } finally {
        setLoading(false);
      }
    },
    [loadPipeline]
  );

  return { transcribe, loading, error, result };
}

/**
 * Converts a Float32Array to a WAV Blob.
 * @param float32Array 
 * @param sampleRate 
 * @returns Blob
 */
function float32ToWavBlob(float32Array: Float32Array, sampleRate: number): Blob {
  // Convert Float32Array [-1,1] to Int16Array
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    let s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }

  // WAV header
  const buffer = new ArrayBuffer(44 + int16Array.length * 2);
  const view = new DataView(buffer);

  // RIFF identifier 'RIFF'
  writeString(view, 0, "RIFF");
  // file length minus RIFF identifier length and file description length
  view.setUint32(4, 36 + int16Array.length * 2, true);
  // RIFF type 'WAVE'
  writeString(view, 8, "WAVE");
  // format chunk identifier 'fmt '
  writeString(view, 12, "fmt ");
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier 'data'
  writeString(view, 36, "data");
  // data chunk length
  view.setUint32(40, int16Array.length * 2, true);

  // Write PCM samples
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
