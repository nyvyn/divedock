import { generateAndPlaySpeech, stopCurrentSpeech } from "../services/SpeechSynth";
import { transcribeAudioWithOpenAI } from "../services/Transcriber";
import { checkMicrophonePermission, requestMicrophonePermission } from "../services/Permission";
import { AudioCanvas } from "../ui/AudioCanvas";

/**
 * AudioController
 * Handles microphone capture, silence detection, transcription,
 * TTS playback, and waveform visualization as a self‑contained class.
 */
export class AudioController {
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
    private readonly audioCanvas: AudioCanvas;

    constructor(
        toggleButton: HTMLButtonElement,
        canvas: HTMLCanvasElement,
        transcriptionDiv: HTMLElement
    ) {
        this.toggleButton = toggleButton;
        this.transcriptionDiv = transcriptionDiv;
        this.audioCanvas = new AudioCanvas(canvas);

        this.toggleButton.addEventListener("click", () => this.toggle());
    }

    /** Public toggle used by the button click handler */
    private toggle() {
        this.isProcessing ? this.stopProcessingCleanup() : this.startProcessing();
    }

    /** ---------- MAIN START / STOP ---------- */
    private async startProcessing() {
        try {
            const micGranted = await checkMicrophonePermission();
            if (!micGranted) {
                requestMicrophonePermission().then(async (micUpdated) => {
                    if (!(micUpdated as boolean)) {
                        console.error("Microphone permission denied");
                        await this.stopProcessingCleanup();
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
            await this.stopProcessingCleanup();
        }
    }

    private async stopProcessingCleanup() {
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
                if (this.mediaRecorder?.state === "inactive") this.startRecorder();
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
            if (
                !this.audioContext ||
                this.audioContext.state === "closed" ||
                this.recordedChunks.length === 0
            )
                return;

            const blob = new Blob(this.recordedChunks, {type: mimeType});
            const text = await transcribeAudioWithOpenAI(blob, this.transcriptionDiv);
            this.transcriptionDiv.innerText = text ?? "";

            if (text && this.isProcessing) {
                await generateAndPlaySpeech(text, this.audioContext);
            }

            this.recordedChunks = [];
            if (this.isProcessing) this.startRecorder();
        };

        this.mediaRecorder.start(1000);
    }

    private stopRecorder() {
        if (this.mediaRecorder?.state === "recording") {
            this.mediaRecorder.stop();
        }
    }
}

/* ---------- Bootstrap when DOM is ready ---------- */
const toggleBtn = document.getElementById("mic-toggle") as HTMLButtonElement | null;
const canvas = document.getElementById("audioCanvas") as HTMLCanvasElement | null;
const transcript = document.getElementById("transcription-result") as HTMLElement | null;

if (toggleBtn && canvas && transcript) {
    new AudioController(toggleBtn, canvas, transcript);
} else {
    if (!toggleBtn) console.error("Toggle button not found");
    if (!canvas) console.error("Canvas element not found");
    if (!transcript) console.error("Transcription div not found");
}
