"use client"

import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { listen, UnlistenFn } from "@tauri-apps/api/event";

export function useDetection() {
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState<boolean | string>(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    // backend VAD task
    invoke("mic_detect").catch(err => {
      console.error(err);
      setErrored(err);
      setLoading(false);
    });

    // helper to save un-listen functions
    const unlistenFns: UnlistenFn[] = [];
    const add = (p: Promise<UnlistenFn>) => {
      console.log("adding listener");
      p.then((f) => unlistenFns.push(f)).catch(console.error);
    };

    add(listen("detection-started", () => {
      setLoading(false);
      setSpeaking(false);
    }));

    add(listen("detection-speaking", () => {
      setSpeaking(true);
    }));

    add(listen("detection-stopped", () => {
      setSpeaking(false);
    }));

    return () => {
      console.log("un-listening");
      unlistenFns.forEach(fn => fn());
    };
  }, []);

  return { loading, errored, speaking };
}
