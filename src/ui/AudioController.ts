import { generateAndPlaySpeech, stopCurrentSpeech } from "../utils/synthesize.ts";
import { transcribeAudioWithOpenAI } from "../utils/transcribe.ts";
import { checkMicrophonePermission, requestMicrophonePermission } from "../utils/permissions.ts";
import { AudioVisualizer } from "./AudioVisualizer.ts";

/**
 * AudioController
 * Handles microphone capture, silence detection, transcription,
 * TTS playback, and waveform visualization as a self‑contained class.
 */
export class AudioController {
    private static instance: AudioController | null = null;
    private isProcessing = false;
    private isSpeaking = false;
    private silenceTimer: number | null = null;
    private animationFrameId: number | null = null;

    private audioContext: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private microphoneStream: MediaStream | null = null;
    private dataArray: Uint8Array | null = null;

    private mediaRecorder: MediaRecorder | null = null;
    private recordedChunks: Blob[] = [];

    private readonly silenceDelay = 1500;  // ms
    private readonly silenceThreshold = 0.01;  // RMS

    private readonly toggleButton: HTMLButtonElement;
    private readonly transcriptionDiv: HTMLElement;
    private readonly audioCanvas: AudioVisualizer;

    private isStopping = false;

    private constructor(
        toggleButton: HTMLButtonElement,
        canvas: HTMLCanvasElement,
        transcriptionDiv: HTMLElement
    ) {
        this.toggleButton = toggleButton;
        this.transcriptionDiv = transcriptionDiv;
        this.audioCanvas = AudioVisualizer.getInstance(canvas);

        this.toggleButton.addEventListener("click", () => this.toggle());
    }

    public static getInstance(
        toggleButton: HTMLButtonElement,
        canvas: HTMLCanvasElement,
        transcriptionDiv: HTMLElement
    ): AudioController {
        if (!AudioController.instance) {
            AudioController.instance = new AudioController(toggleButton, canvas, transcriptionDiv);
        }
        return AudioController.instance;
    }

    /** Public toggle used by the button click handler */
    private toggle() {
        this.isProcessing ? this.stopProcessing() : this.startProcessing();
    }

    /** ---------- MAIN START / STOP ---------- */
    private async startProcessing() {
        try {
            const micGranted = await checkMicrophonePermission();
            if (!micGranted) {
                requestMicrophonePermission().then(async (micUpdated) => {
                    if (!(micUpdated as boolean)) {
                        console.error("Microphone permission denied");
                        await this.stopProcessing();
                        return;
                    }
                });
            }

            this.audioContext =
                !this.audioContext || this.audioContext.state === "closed"
                    ? new AudioContext()
                    : this.audioContext;

            if (this.audioContext.state === "suspended") {
                await this.audioContext.resume();
            }

            this.microphoneStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false,
            });

            const source = this.audioContext.createMediaStreamSource(
                this.microphoneStream
            );

            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 512;
            this.analyser.smoothingTimeConstant = 0.6;

            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            source.connect(this.analyser);

            this.startRecorder();

            this.isProcessing = true;
            this.isSpeaking = false;
            this.toggleButton.innerText = "Stop Listening";
            this.transcriptionDiv.innerText = "";

            this.processAudio();
        } catch (err) {
            console.error("Error starting audio:", err);
            await this.stopProcessing();
        }
    }

    private async stopProcessing() {
        this.isProcessing = false;
        this.isSpeaking = false;

        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        this.stopRecorder();
        stopCurrentSpeech();

        if (this.microphoneStream) {
            this.microphoneStream.getTracks().forEach((t) => t.stop());
            this.microphoneStream = null;
        }

        if (this.audioContext && this.audioContext.state !== "closed") {
            await this.audioContext.close();
        }

        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.mediaRecorder = null;
        this.recordedChunks = [];

        this.audioCanvas.clear();
        this.toggleButton.innerText = "Start Listening";
    }

    /** ---------- AUDIO LOOP ---------- */
    private processAudio = () => {
        if (!this.isProcessing || !this.analyser || !this.dataArray) {
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
            return;
        }

        this.analyser.getByteTimeDomainData(this.dataArray);

        // --- RMS volume for silence detection ---
        let sum = 0;
        for (let i = 0; i < this.analyser.frequencyBinCount; i++) {
            const n = this.dataArray[i] / 128 - 1;
            sum += n * n;
        }
        const rms = Math.sqrt(sum / this.analyser.frequencyBinCount);

        if (rms > this.silenceThreshold) {
            if (!this.isSpeaking) {
                this.isSpeaking = true;
                stopCurrentSpeech();
                if (!this.isStopping && this.mediaRecorder?.state === "inactive") {
                    this.startRecorder();
                }
            }
            if (this.silenceTimer) {
                clearTimeout(this.silenceTimer);
                this.silenceTimer = null;
            }
        } else if (this.isSpeaking && !this.silenceTimer) {
            this.silenceTimer = window.setTimeout(() => {
                this.isSpeaking = false;
                this.stopRecorder();
                this.silenceTimer = null;
            }, this.silenceDelay);
        }

        this.audioCanvas.drawWaveform(
            this.dataArray,
            this.analyser.frequencyBinCount
        );

        this.animationFrameId = requestAnimationFrame(this.processAudio);
    };

    /** ---------- MEDIA RECORDER ---------- */
    private startRecorder() {
        if (!this.microphoneStream) return;
        if (this.mediaRecorder?.state === "recording") return;

        this.recordedChunks = [];

        const pickMimeType = (): string => {
            const types = ["audio/wav", "audio/ogg;codecs=opus", "audio/webm"];
            return types.find((t) => MediaRecorder.isTypeSupported(t)) || "";
        };

        const mimeType = pickMimeType();
        this.mediaRecorder = new MediaRecorder(this.microphoneStream, {mimeType});

        this.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) this.recordedChunks.push(e.data);
        };

        this.mediaRecorder.onstop = async () => {
            if (this.isStopping) return;
            this.isStopping = true;
            console.log("MediaRecorder stopped");
            if (
                !this.audioContext ||
                this.audioContext.state === "closed" ||
                this.recordedChunks.length === 0
            )
                return;

            try {
                const blob = new Blob(this.recordedChunks, {type: mimeType});
                const text = await transcribeAudioWithOpenAI(blob);
                this.transcriptionDiv.innerText = text ?? "";

                if (text && this.isProcessing) {
                    await generateAndPlaySpeech(text, this.audioContext);
                }
            } catch (error: any) {
                this.transcriptionDiv.innerText = error.message ?? error.toString() ?? "";
            }
            this.isStopping = false;

            this.recordedChunks = [];
        };

        this.mediaRecorder.start(1000);
    }

    private stopRecorder() {
        if (this.mediaRecorder?.state === "recording") {
            this.mediaRecorder.stop();
        }
    }
}
