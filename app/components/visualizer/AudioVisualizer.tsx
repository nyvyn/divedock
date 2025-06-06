"use client";

import clsx from "clsx";
import React from "react";

interface AudioVisualizerProps {
    errored: boolean | string;
    listening: boolean;
    thinking: boolean;
    speaking: boolean;
}

export default function AudioVisualizer({ listening, thinking }: AudioVisualizerProps) {
    return (
        <div
            className={clsx(
                "size-40 rounded-full blur-sm " +
                "bg-linear-to-b from-red-200 to-red-400 dark:from-red-600 dark:to-red-800 " +
                "transition ease-in-out duration-1000 will-change-transform",
                {
                    "bg-none bg-neutral-700": !listening,
                    "bg-none bg-blue-500 ": thinking,
                    "animate-pulse": listening && !thinking,
                }
            )}
        />
    );
}
