"use client";

import clsx from "clsx";
import React from "react";


interface AudioVisualizerProps {
    vad: {
        loading: boolean;
        errored: boolean;
        userSpeaking: boolean;
    };
}

export default function AudioVisualizer({ vad }: AudioVisualizerProps) {
    return (
        <div
            className={clsx(
                "absolute size-36 blur-3xl rounded-full bg-gradient-to-b from-red-200 to-red-400 dark:from-red-600 dark:to-red-800 -z-50 transition ease-in-out",
                {
                    "opacity-0": vad.loading || vad.errored,
                    "opacity-30": !vad.loading && !vad.errored && !vad.userSpeaking,
                    "opacity-100 scale-110": vad.userSpeaking,
                }
            )}
        />
    );
}
