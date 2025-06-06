/* eslint react-hooks/exhaustive-deps: 0 */
"use client";

import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";

export function useTranscription() {
    const [transcript, setTranscript] = useState("");
    const [transcribing, setTranscribing] = useState(false);

    useEffect(() => {
        // helper to save un-listen functions
        const unlistenFns: UnlistenFn[] = [];
        const add = (p: Promise<UnlistenFn>) => {
            console.log("adding listener");
            p.then((f) => unlistenFns.push(f)).catch(console.error);
        };

        /* ---- listeners ---- */
        add(
            listen("transcription-started", () => {
                setTranscript("");
                setTranscribing(true);
            }),
        );

        add(
            listen<string>("transcription-line", (event) => {
                console.log("transcription-line: ", event.payload);
                setTranscript((prev) => prev + event.payload);
            }),
        );

        add(
            listen("transcription-stopped", () => {
                setTranscribing(false);
            }),
        );

        // cleanup
        return () => {
            unlistenFns.forEach((fn) => fn());
        };
    }, []);

    return {transcribing, transcript};
}
