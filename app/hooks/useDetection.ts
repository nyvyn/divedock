"use client";

import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";

export function useDetection() {
    const [errored, setErrored] = useState<boolean | string>(false);
    const [listening, setListening] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // helper to save un-listen functions
        const unlistenFns: UnlistenFn[] = [];
        const add = (p: Promise<UnlistenFn>) => {
            console.log("adding listener");
            p.then((f) => unlistenFns.push(f)).catch(console.error);
        };

        /* ---- listeners ---- */
        add(
            listen("speech-detected", () => {
                console.log("speaking");
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

    return {errored, listening, loading, toggleListening};
}
