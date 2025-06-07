"use client";

import clsx from "clsx";
import React from "react";

interface AudioVisualizerProps {
    listening: boolean;
    transcribing: boolean;
    synthesizing: boolean;
    speaking: boolean;
}

export default function AudioVisualizer({listening, transcribing, synthesizing, speaking}: AudioVisualizerProps) {
    // Default classes for the visualizer
    const baseClasses =
        "size-40 rounded-full blur-sm " + // Using blur-sm as in your latest version
        "transition-all ease-in-out duration-700 will-change-transform"; // Smoother transitions for all properties

    // Compute current visualizer state
    const state =
        !listening ? "idle" :
            speaking ? "speaking" :
                synthesizing ? "synthesizing" :
                    transcribing ? "transcribing" :
                        "listening";

    const stateClasses: Record<string, string> = {
        listening: "bg-none bg-sky-600 shadow-sky-500/50 shadow-md animate-pulse",
        transcribing: "bg-none bg-sky-600 shadow-sky-500/50 shadow-lg animate-bounce",
        synthesizing: "bg-none bg-green-500 shadow-green-400/50 shadow-lg animate-bounce",
        speaking: "bg-none bg-green-500 shadow-green-400/50 shadow-lg animate-pulse",
        idle: "bg-none bg-slate-700 opacity-60",
    };

    return (
        <div
            className={clsx(baseClasses, stateClasses[state])}
        />
    );
}
