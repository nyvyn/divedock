"use client"

import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";

export function useSynthesis() {
    const [synthesizing, setSynthesizing] = useState(false);
    const [speaking, setSpeaking] = useState(false);

    useEffect(() => {
        // helper to save un-listen functions
        const unlistenFns: UnlistenFn[] = [];
        const add = (p: Promise<UnlistenFn>) => {
            p.then((f) => unlistenFns.push(f)).catch(console.error);
        };

        /* ---- listeners ---- */
        add(
            listen("synthesis-started", () => {
                setSynthesizing(true);
            }),
        );

        add(
            listen("synthesis-stopped", () => {
                setSynthesizing(false);
            }),
        );

        add(
            listen("speaking-started", () => {
                setSpeaking(true);
            }),
        );

        add(
            listen("speaking-stopped", () => {
                setSpeaking(false);
            }),
        );

        // cleanup
        return () => {
            unlistenFns.forEach((fn) => fn());
        };
    }, []);

    return {synthesizing, speaking};
}
