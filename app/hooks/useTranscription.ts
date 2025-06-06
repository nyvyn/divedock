/* eslint react-hooks/exhaustive-deps: 0 */
"use client";

import { useEffect, useState } from "react";
import { listen, UnlistenFn } from "@tauri-apps/api/event";

export function useTranscription() {
  const [transcript, setTranscript] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);

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
        setIsTranscribing(true);
      }),
    );

    add(
      listen<string>("transcription-line", (event) => {
        setTranscript((prev) => prev + event.payload);
      }),
    );

    add(
      listen("transcription-stopped", () => {
        setIsTranscribing(false);
      }),
    );

    // cleanup
    return () => {
      unlistenFns.forEach((fn) => fn());
    };
  }, []);

  return { isTranscribing, transcript };
}
