"use client";

import { useMicVAD } from "@ricky0123/vad-react";
import { useTransition } from "react";
import AudioVisualizer from "./components/visualizer/AudioVisualizer";
import { usePlayer } from "./hooks/usePlayer";
import { useTranscriber } from "./hooks/useTranscriber";

export default function Home() {

    const [_isPending, startTransition] = useTransition();
    const player = usePlayer();
    const {transcribe} = useTranscriber();

    const vad = useMicVAD({
        model: "v5",
        ortConfig: (ort) => {
            ort.env.logLevel = "error";
        },
        onSpeechEnd: (audio) => {
            player.stop();
            startTransition(() => {
                transcribe(audio);
            });
        },
        minSpeechFrames: 4,
        positiveSpeechThreshold: 0.6,
        startOnLoad: true,
    });

    return (
        <div
            className="flex items-center justify-center min-h-screen min-w-screen bg-black"
        >
            <AudioVisualizer errored={vad.errored} loading={vad.loading} speaking={vad.userSpeaking}/>
        </div>
    );
}
