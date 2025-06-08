"use client"

import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";

export function useSynthesis() {
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
                console.log("synthesis-started");
                setSpeaking(true);
            }),
        );

        add(
            listen("synthesis-stopped", () => {
                console.log("synthesis-stopped");
                setSpeaking(false);
            }),
        );

        // cleanup
        return () => {
            unlistenFns.forEach((fn) => fn());
        };
    }, []);

    return {speaking};
}
