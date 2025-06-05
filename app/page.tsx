"use client"

import { useMicVAD } from "@ricky0123/vad-react";
import AudioVisualizer from "./components/visualizer/AudioVisualizer";

export default function Home() {

    const vad = useMicVAD({
        startOnLoad: true,
        positiveSpeechThreshold: 0.6,
        minSpeechFrames: 4,
    });

    return (
        <div style={{ background: "black", minHeight: "100vh", width: "100vw" }}>
            <AudioVisualizer errored={vad.errored} loading={vad.loading} speaking={vad.userSpeaking}/>
        </div>
    );
}
