"use client";

import { MicOffIcon } from "./components/icons/MicOffIcon.tsx";
import { MicOnIcon } from "./components/icons/MicOnIcon.tsx";
import AudioVisualizer from "./components/visualizer/AudioVisualizer";
import { useDetection } from "./hooks/useDetection";
import { useTranscription } from "./hooks/useTranscription.ts";

export default function Home() {

    const vad = useDetection();
    const scribe = useTranscription();

    return (
        <div
            className="flex items-center justify-center min-h-screen min-w-screen bg-black"
        >
            <AudioVisualizer
                errored={vad.errored}
                listening={vad.listening}
                transcribing={scribe.transcribing}
            />

            {/* toggle-listening button */}
            <button
                onClick={vad.toggleListening}
                className="
                  absolute bottom-4 right-4
                  flex items-center justify-center
                  h-12 w-12 rounded-full
                  bg-blue-600 disabled:bg-blue-400
                  hover:bg-blue-700 text-white
                  shadow-lg transition"
            >
                {vad.listening ? (
                    <MicOnIcon className="size-6"/>
                ) : (
                    <MicOffIcon className="size-6"/>
                )}
                <span className="sr-only">
                    {vad.listening
                        ? "Stop listening"
                        : "Start listening"
                    }
                </span>
            </button>
        </div>
    );
}
