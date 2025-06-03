import { checkMicrophonePermission, requestMicrophonePermission } from "../utils/permissions.ts";
import { AudioVisualizer } from "./AudioVisualizer.ts";
import { RealtimeClient } from "../utils/realtime.ts";

export class AudioController {
    private static instance: AudioController | null = null;
    private isProcessing = false;
    private animationFrameId: number | null = null;

    private audioContext: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private microphoneStream: MediaStream | null = null;
    private dataArray: Uint8Array | null = null;
    private processor: ScriptProcessorNode | null = null;

    private readonly toggleButton: HTMLButtonElement;
    private readonly transcriptionDiv: HTMLElement;
    private readonly audioCanvas: AudioVisualizer;
    private readonly realtime = new RealtimeClient();

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

    private toggle() {
        this.isProcessing ? this.stopProcessing() : this.startProcessing();
    }

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

            this.audioContext = new AudioContext({ sampleRate: 24000 });
            if (this.audioContext.state === "suspended") {
                await this.audioContext.resume();
            }

            this.microphoneStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false,
            });

            const source = this.audioContext.createMediaStreamSource(this.microphoneStream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 512;
            this.analyser.smoothingTimeConstant = 0.6;
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            source.connect(this.analyser);

            this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
            source.connect(this.processor);
            this.processor.connect(this.audioContext.destination);
            await this.realtime.connect(this.audioContext, {
                onText: (t) => (this.transcriptionDiv.innerText = t),
            });
            this.processor.onaudioprocess = (e) => {
                const input = e.inputBuffer.getChannelData(0);
                const pcm = new Int16Array(input.length);
                for (let i = 0; i < input.length; i++) {
                    let s = Math.max(-1, Math.min(1, input[i]));
                    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
                }
                this.realtime.sendPCM(pcm);
            };

            this.isProcessing = true;
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
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.realtime.stop();
        if (this.processor) {
            this.processor.disconnect();
            this.processor = null;
        }
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
        this.audioCanvas.clear();
        this.toggleButton.innerText = "Start Listening";
    }

    private processAudio = () => {
        if (!this.isProcessing || !this.analyser || !this.dataArray) {
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
            return;
        }

        this.analyser.getByteTimeDomainData(this.dataArray);
        this.audioCanvas.drawWaveform(this.dataArray, this.analyser.frequencyBinCount);
        this.animationFrameId = requestAnimationFrame(this.processAudio);
    };
}
