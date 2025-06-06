"use client"

import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { listen, UnlistenFn } from "@tauri-apps/api/event";

export function useDetection() {
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState<boolean | string>(false);
  const [userSpeaking, setUserSpeaking] = useState(false);

  useEffect(() => {
    // backend VAD task
    invoke("mic_vad").catch(err => {
      console.error(err);
      setErrored(err);
      setLoading(false);
    });

    // helper to save un-listen functions
    const unlistenFns: UnlistenFn[] = [];
    // make sure we don’t return the promise → no lint warning
    const add = (p: Promise<UnlistenFn>) => {
      p.then((f) => unlistenFns.push(f)).catch(console.error);
    };

    add(listen("detection-started", () => {
      setLoading(false);
      setUserSpeaking(false);
    }));

    add(listen("speaking", () => {
      setUserSpeaking(true);
    }));

    add(listen("detection-stopped", () => {
      setUserSpeaking(false);
    }));

    return () => {
      unlistenFns.forEach(fn => fn());
    };
  }, []);

  return { loading, errored, userSpeaking };
}
