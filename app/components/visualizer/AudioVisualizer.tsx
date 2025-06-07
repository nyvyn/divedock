"use client";

import clsx from "clsx";
import React from "react";

interface AudioVisualizerProps {
    listening: boolean;
    transcribing: boolean;
    synthesizing: boolean;
    speaking: boolean;
}

export default function AudioVisualizer({ listening, transcribing, synthesizing, speaking }: AudioVisualizerProps) {
    // Default classes for the visualizer
    const baseClasses =
        "size-40 rounded-full blur-sm " + // Using blur-sm as in your latest version
        "transition-all ease-in-out duration-700 will-change-transform"; // Smoother transitions for all properties

    // Original gradient, will be overridden by specific states below using bg-none
    const initialGradient = "bg-linear-to-b from-red-200 to-red-400 dark:from-red-600 dark:to-red-800";

    // Compute current visualizer state
    const state =
        speaking ? 'speaking' :
        synthesizing ? 'synthesizing' :
        transcribing ? 'transcribing' :
        listening ? 'listening' :
        'idle';

    const stateClasses: Record<string, string> = {
        speaking: "bg-none bg-green-500 shadow-green-400/50 shadow-lg animate-bounce",
        synthesizing: "bg-none bg-amber-500 shadow-amber-400/50 shadow-xl scale-110",
        transcribing: "bg-none bg-indigo-600 shadow-indigo-500/50 shadow-lg animate-bounce",
        listening: "bg-none bg-sky-600 shadow-sky-500/50 shadow-md animate-pulse",
        idle: "bg-none bg-slate-700 opacity-60",
    };

    return (
        <div
            className={clsx(baseClasses, initialGradient, stateClasses[state])}
        />
    );
}
