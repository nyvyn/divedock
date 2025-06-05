import { InferenceSession } from "onnxruntime-web";
import * as ort from "onnxruntime-web";

const SAMPLE_RATE = 16_000;               // 16 kHz mono PCM
const SEGMENT_SAMPLES = SAMPLE_RATE * 30; // Whisper expects 30-s windows
const MODEL = "public/models/whisper-tiny-onnx-int4-inc.onnx";

class WhisperSession {
    private session: ort.InferenceSession | null = null;

    // static inputs reused between calls
    private readonly max_length = new Int32Array([448]);
    private readonly min_length = new Int32Array([1]);
    private readonly num_return_sequences = new Int32Array([1]);
    private readonly length_penalty = new Float32Array([1.0]);
    private readonly repetition_penalty = new Float32Array([1.0]);
    private readonly attention_mask = new Int32Array(80 * 3000); // all zeros

    /** create (or reuse) ORT session */
    private async get() {
        const buf   = await fetch(MODEL).then(r => r.arrayBuffer());
        const bytes = new Uint8Array(buf);

        if (!this.session) {
            const opts: InferenceSession.SessionOptions = {
                executionProviders: ["wasm"],
                logSeverityLevel: 3,
                logVerbosityLevel: 3
            };
            this.session = await ort.InferenceSession.create(bytes, opts);
        }
        return this.session;
    }

    /** run whisper on one 30-s PCM chunk */
    async infer(audio: Float32Array, beams = 1) {
        const s = await this.get();

        const feed: Record<string, ort.Tensor> = {
            audio_pcm: new ort.Tensor(audio, [1, audio.length]),
            max_length: new ort.Tensor(this.max_length, [1]),
            min_length: new ort.Tensor(this.min_length, [1]),
            num_beams: new ort.Tensor(new Int32Array([beams]), [1]),
            num_return_sequences: new ort.Tensor(this.num_return_sequences, [1]),
            length_penalty: new ort.Tensor(this.length_penalty, [1]),
            repetition_penalty: new ort.Tensor(this.repetition_penalty, [1]),
            attention_mask: new ort.Tensor(this.attention_mask, [1, 80, 3000]),
        };

        return s.run(feed); // returns { str: Tensor }
    }
}

const whisper = new WhisperSession();

/**
 * Transcribe an entire Float32Array (16 kHz mono).
 * Splits into 30-s windows, runs inference, concatenates text.
 */
export async function transcribe(pcm: Float32Array): Promise<string> {
    const out: string[] = [];

    for (let i = 0; i < pcm.length; i += SEGMENT_SAMPLES) {
        const chunk = pcm.subarray(i, i + SEGMENT_SAMPLES);
        const {str} = await whisper.infer(chunk);          // greedy, 1 beam
        out.push((str.data as string[])[0]);                 // first/only sequence
    }

    return out.join("\n");
}