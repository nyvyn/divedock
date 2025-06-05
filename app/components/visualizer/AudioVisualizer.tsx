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
                "size-40 rounded-full blur-xl " +
                "bg-linear-to-b from-red-200 to-red-400 dark:from-red-600 dark:to-red-800 " +
                "transition ease-in-out duration-500 will-change-transform",
                {
                    "opacity-0": loading || errored,
                    "opacity-30": !loading && !errored && !speaking,
                    "opacity-60 blur-3xl scale-130": speaking,
                }
            )}
        />
    );
}
