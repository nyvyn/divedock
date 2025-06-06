"use client";

import AudioVisualizer from "./components/visualizer/AudioVisualizer";
import { useDetection } from "./hooks/useDetection";
import { LoadingIcon } from "./components/icons/LoadingIcon";
import { MicOnIcon } from "./components/icons/MicOnIcon.tsx";
import { MicOffIcon } from "./components/icons/MicOffIcon.tsx";

export default function Home() {

    const vad = useDetection();

    return (
        <div
            className="flex items-center justify-center min-h-screen min-w-screen bg-black"
        >
            <AudioVisualizer errored={vad.errored} listening={vad.listening} loading={vad.loading}/>

            {/* toggle-listening button */}
            <button
                onClick={!vad.loading ? vad.toggleListening : undefined}
                disabled={vad.loading}
                className="
                  absolute bottom-4 right-4
                  flex items-center justify-center
                  h-12 w-12 rounded-full
                  bg-blue-600 disabled:bg-blue-400
                  hover:bg-blue-700 text-white
                  shadow-lg transition"
            >
                {vad.loading ? (
                    <LoadingIcon className="size-6 animate-spin" />
                ) : vad.listening ? (
                    <MicOnIcon className="size-6" />
                ) : (
                    <MicOffIcon className="size-6" />
                )}
                <span className="sr-only">
                    {vad.loading
                        ? "Loading"
                        : vad.listening
                        ? "Stop listening"
                        : "Start listening"
                    }
                </span>
            </button>
        </div>
    );
}
