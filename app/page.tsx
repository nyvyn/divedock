"use client";

import AudioVisualizer from "./components/visualizer/AudioVisualizer";
import { useDetection } from "./hooks/useDetection";
import { LoadingIcon } from "./components/icons/LoadingIcon";
import { MicOn } from "./components/icons/MicOn";
import { MicOff } from "./components/icons/MicOff";

export default function Home() {

    const vad = useDetection();

    return (
        <div
            className="flex items-center justify-center min-h-screen min-w-screen bg-black"
        >
            <AudioVisualizer errored={vad.errored} loading={vad.loading} speaking={vad.speaking}/>

            {/* toggle-listening button */}
            <button
                onClick={!vad.loading ? vad.toggleListening : undefined}
                disabled={vad.loading}
                className="
                  absolute bottom-8 left-1/2 -translate-x-1/2
                  flex items-center justify-center
                  h-14 w-14 rounded-full
                  bg-blue-600 disabled:bg-blue-400
                  hover:bg-blue-700 text-white
                  shadow-lg transition"
            >
                {vad.loading ? (
                    <LoadingIcon className="size-6 animate-spin" />
                ) : vad.listening ? (
                    <MicOn className="size-6" />
                ) : (
                    <MicOff className="size-6" />
                )}
                <span className="sr-only">
                    {vad.loading
                        ? "Loading"
                        : vad.listening
                        ? "Stop listening"
                        : "Start listening"}
                </span>
            </button>
        </div>
    );
}
