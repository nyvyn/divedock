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
                "size-36 rounded-full bg-gradient-to-b from-red-400 to-red-700 transition ease-in-out aspect-square",
                {
                    "opacity-0": loading || errored,
                    "opacity-30": !loading && !errored && !speaking,
                    "opacity-60 scale-110": speaking,
                }
            )}
            style={{ borderRadius: "50%" }}
        />
    );
}
