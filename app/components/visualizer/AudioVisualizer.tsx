"use client";

import clsx from "clsx";
import React from "react";

interface AudioVisualizerProps {
    errored: boolean | string;
    listening: boolean;
    loading: boolean;
}

export default function AudioVisualizer({ loading, listening }: AudioVisualizerProps) {
    return (
        <div
            className={clsx(
                "size-40 rounded-full blur-lg " +
                "bg-linear-to-b from-red-200 to-red-400 dark:from-red-600 dark:to-red-800 " +
                "transition ease-in-out duration-1000 will-change-transform",
                {
                    "opacity-0": loading,
                    "opacity-30": !listening,
                    "opacity-60 animate-pulse": listening,
                }
            )}
        />
    );
}
