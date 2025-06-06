"use client";

import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";

export function useDetection() {
    const [errored, setErrored] = useState<boolean | string>(false);
    const [listening, setListening] = useState(false);
    const [loading, setLoading] = useState(false);
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
            setLoading(false);
            setListening(true);
            setSpeaking(false);
          }),
        );

        add(
          listen("detection-speaking", () => {
            setSpeaking(true);
          }),
        );

        add(
          listen("detection-stopped", () => {
            setListening(false);
            setSpeaking(false);
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
        setLoading(true);
        invoke("start_listening").catch(err => {
            console.error(err);
            setErrored(err);
            setLoading(false);
        });
    };

    const stopListening = async () => {
        if (!listening) return;
        invoke("stop_listening").catch(console.error);
        setListening(false);
        setSpeaking(false);
    };

    const toggleListening = () => listening ? stopListening() : startListening();

    return {loading, errored, speaking, listening, toggleListening};
}
