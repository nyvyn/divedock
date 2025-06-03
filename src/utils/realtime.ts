import OpenAI from "openai";
import { OpenAIRealtimeWebSocket } from "openai/beta/realtime/websocket";
import { openAIApiKey } from "../main.ts";

export interface RealtimeCallbacks {
    onText?: (text: string) => void;
}

export class RealtimeClient {
    private socket: OpenAIRealtimeWebSocket | null = null;
    private audioChunks: string[] = [];
    private text = "";
    private audioContext: AudioContext | null = null;

    async connect(context: AudioContext, callbacks: RealtimeCallbacks = {}): Promise<void> {
        if (!openAIApiKey) throw new Error("API key not set");
        this.audioContext = context;
        const client = new OpenAI({ apiKey: openAIApiKey, dangerouslyAllowBrowser: true });
        this.socket = new OpenAIRealtimeWebSocket({ model: "gpt-4o", dangerouslyAllowBrowser: true }, client);

        this.socket.on("error", (err) => console.error(err));
        this.socket.on("response.text.delta", (ev) => {
            this.text += ev.delta;
            callbacks.onText?.(this.text);
        });
        this.socket.on("response.audio.delta", (ev) => {
            this.audioChunks.push(ev.delta);
        });
        this.socket.on("response.audio.done", () => {
            this.playAudio();
        });
    }

    sendPCM(pcm: Int16Array) {
        if (!this.socket) return;
        const b64 = btoa(String.fromCharCode(...new Uint8Array(pcm.buffer)));
        this.socket.send({ type: "input_audio_buffer.append", audio: b64 });
        this.socket.send({ type: "input_audio_buffer.commit" });
    }

    stop() {
        this.socket?.close();
        this.socket = null;
        this.text = "";
        this.audioChunks = [];
    }

    private playAudio() {
        if (!this.audioContext || this.audioChunks.length === 0) return;
        const binary = atob(this.audioChunks.join(""));
        const buffer = new ArrayBuffer(binary.length);
        const view = new Uint8Array(buffer);
        for (let i = 0; i < binary.length; i++) {
            view[i] = binary.charCodeAt(i);
        }
        const pcm = new Int16Array(buffer);
        const floatData = new Float32Array(pcm.length);
        for (let i = 0; i < pcm.length; i++) {
            floatData[i] = pcm[i] / 32768;
        }
        const audioBuffer = this.audioContext.createBuffer(1, floatData.length, 24000);
        audioBuffer.copyToChannel(floatData, 0);
        const src = this.audioContext.createBufferSource();
        src.buffer = audioBuffer;
        src.connect(this.audioContext.destination);
        src.start();
        this.audioChunks = [];
    }
}
