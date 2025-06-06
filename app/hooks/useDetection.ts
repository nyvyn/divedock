"use client";

import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";

export function useDetection() {
    const [errored, setErrored] = useState<boolean | string>(false);
    const [listening, setListening] = useState(false);
    const [loading, setLoading] = useState(true);
    const [speaking, setSpeaking] = useState(false);

    useEffect(() => {
        // helper to save un-listen functions
        const unlistenFns: UnlistenFn[] = [];
        const add = (p: Promise<UnlistenFn>) => {
            console.log("adding listener");
            p.then((f) => unlistenFns.push(f)).catch(console.error);
        };

        /* ---- listeners ---- */
        add(
            listen("detection-started", () => {
                console.log("listening");
                setSpeaking(true);
            }),
        );

        add(
            listen("detection-speaking", () => {
                console.log("speaking");
                setSpeaking(true);
            }),
        );

        add(
            listen("detection-stopped", () => {
                console.log("stopped");
                setSpeaking(false);
            }),
        );

        setLoading(false);

        return () => {
            console.log("un-listening");
            unlistenFns.forEach(fn => fn());
        };
    }, []);

    // backend control ─────────
    const startListening = async () => {
        if (listening) return;
        invoke("start_listening").catch(err => {
            console.error(err);
            setErrored(err);
        });
        setListening(true);
    };

    const stopListening = async () => {
        if (!listening) return;
        invoke("stop_listening").catch(err => {
            console.error(err);
            setErrored(err);
        });
        setListening(false);
    };

    const toggleListening = () => listening ? stopListening() : startListening();

    return {loading, errored, speaking, listening, toggleListening};
}
