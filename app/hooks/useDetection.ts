"use client"

import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { listen, UnlistenFn } from "@tauri-apps/api/event";

export function useDetection() {
  const [loading, setLoading] = useState(false);
  const [errored, setErrored] = useState<boolean | string>(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    // helper to save un-listen functions
    const unlistenFns: UnlistenFn[] = [];
    const add = (p: Promise<UnlistenFn>) => {
      console.log("adding listener");
      p.then((f) => unlistenFns.push(f)).catch(console.error);
    };

    return () => {
      console.log("un-listening");
      unlistenFns.forEach(fn => fn());
    };
  }, []);

  // backend control ─────────
  const startListening = async () => {
    if (listening) return;
    setLoading(true);
    invoke("start_listening")
      .catch(err => { console.error(err); setErrored(err); setLoading(false); });
  };

  const stopListening = async () => {
    if (!listening) return;
    invoke("stop_listening").catch(console.error);
    setListening(false);
    setSpeaking(false);
  };

  const toggleListening = () => listening ? stopListening() : startListening();

  // event callbacks
  listen("detection-started", () => { setLoading(false); setListening(true); setSpeaking(false); });
  listen("detection-speaking", () => setSpeaking(true));
  listen("detection-stopped",  () => { setListening(false); setSpeaking(false); });

  return { loading, errored, speaking, listening, toggleListening };
}
