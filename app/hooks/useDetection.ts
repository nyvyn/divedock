"use client"
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
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

    // helper to save unlisten functions
    const unlisteners: UnlistenFn[] = [];
    const add = (p: Promise<UnlistenFn>) => p.then(f => unlisteners.push(f));

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
      unlisteners.forEach(fn => fn());
    };
  }, []);

  return { loading, errored, userSpeaking };
}
