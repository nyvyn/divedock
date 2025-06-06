"use client";

import AudioVisualizer from "./components/visualizer/AudioVisualizer";
import { useDetection } from "./hooks/useDetection";

export default function Home() {

    const vad = useDetection();

    return (
        <div
            className="flex items-center justify-center min-h-screen min-w-screen bg-black"
        >
            <AudioVisualizer errored={vad.errored} loading={vad.loading} speaking={vad.speaking}/>

            {/* toggle button */}
            <button
                onClick={vad.toggleListening}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded"
            >
                {vad.listening ? "Stop Listening" : "Start Listening"}
            </button>
        </div>
    );
}
