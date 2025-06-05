"use client";

import clsx from "clsx";
import React from "react";

interface AudioVisualizerProps {
    errored: boolean | string;
    loading: boolean;
    speaking: boolean;
}

export default function AudioVisualizer({ errored, loading, speaking }: AudioVisualizerProps) {
    return (
        <div
            className={clsx(
                "size-36 blur-3xl rounded-full bg-gradient-to-b from-red-200 to-red-400 dark:from-red-600 dark:to-red-800 -z-50 transition ease-in-out aspect-square",
                {
                    "opacity-10": loading || errored,
                    "opacity-30": !loading && !errored && !speaking,
                    "opacity-100 scale-110": speaking,
                }
            )}
            style={{ borderRadius: "50%" }}
        />
    );
}
