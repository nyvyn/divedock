"use client"

import { useMicVAD } from "@ricky0123/vad-react";
import AudioVisualizer from "./components/visualizer/AudioVisualizer";
import { usePlayer } from "./lib/usePlayer";

export default function Home() {

    const player = usePlayer();

    const vad = useMicVAD({
        onSpeechEnd: () => {
            player.stop();
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
