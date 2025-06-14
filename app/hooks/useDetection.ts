"use client";

import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";

export function useDetection() {
    const [errored, setErrored] = useState<boolean | string>(false);
    const [listening, setListening] = useState(false);

    useEffect(() => {
        // helper to save un-listen functions
        const unlistenFns: UnlistenFn[] = [];
        const add = (p: Promise<UnlistenFn>) => {
            p.then((f) => unlistenFns.push(f)).catch(console.error);
        };

        /* ---- listeners ---- */
        add(
            listen("speech-detected", () => {
                console.log("speech-detected:");
            }),
        );
        add(
            listen("mic-enabled", () => {
                setListening(true);
            }),
        );
        add(
            listen("mic-disabled", () => {
                setListening(false);
            }),
        );

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
    };

    const stopListening = async () => {
        if (!listening) return;
        invoke("stop_listening").catch(err => {
            console.error(err);
            setErrored(err);
        });
    };

    const toggleListening = () => listening ? stopListening() : startListening();

    return {errored, listening, toggleListening};
}
