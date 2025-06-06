"use client";

import AudioVisualizer from "./components/visualizer/AudioVisualizer";

export default function Home() {


    return (
        <div
            className="flex items-center justify-center min-h-screen min-w-screen bg-black"
        >
            <AudioVisualizer errored={vad.errored} loading={vad.loading} speaking={vad.userSpeaking}/>
        </div>
    );
}
