"use client";

import clsx from "clsx";
import React from "react";

interface AudioVisualizerProps {
    listening: boolean;
    transcribing: boolean;
    synthesizing: boolean;
}

export default function AudioVisualizer({ listening, transcribing, synthesizing }: AudioVisualizerProps) {
    // Default classes for the visualizer
    const baseClasses =
        "size-40 rounded-full blur-sm " + // Using blur-sm as in your latest version
        "transition-all ease-in-out duration-700 will-change-transform"; // Smoother transitions for all properties

    // Original gradient, will be overridden by specific states below using bg-none
    const initialGradient = "bg-linear-to-b from-red-200 to-red-400 dark:from-red-600 dark:to-red-800";

    return (
        <div
            className={clsx(
                baseClasses,
                initialGradient, // This will be the very base if no other state overrides it
                {
                     // Synthesizing State: Bright, energetic, slight expansion, and a matching shadow
                    "bg-none bg-amber-500 shadow-amber-400/50 shadow-xl scale-110": synthesizing,

                     // Transcribing State: (if not synthesizing) Deeper color, active bounce animation, and shadow
                    "bg-none bg-indigo-600 shadow-indigo-500/50 shadow-lg animate-bounce": !synthesizing && transcribing,

                    // Listening State: (if not speaking or thinking) Calm blue, gentle pulse, and shadow
                    "bg-none bg-sky-600 shadow-sky-500/50 shadow-md animate-pulse": !speaking && !thinking && listening,

                    // Idle State: (if not speaking, thinking, or listening) Muted, less prominent
                    "bg-none bg-slate-700 opacity-60": !speaking && !thinking && !listening,
                }
            )}
        />
    );
}
