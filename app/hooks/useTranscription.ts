/* eslint react-hooks/exhaustive-deps: 0 */
"use client";

import { useEffect, useState } from "react";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

export function useTranscription() {
  const [transcript, setTranscript] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [errored, setErrored] = useState<boolean | string>(false);

  useEffect(() => {
    // Array para almacenar los des-suscriptores
    const unlistenFns: UnlistenFn[] = [];
    const add = (p: Promise<UnlistenFn>) =>
      p.then((f) => unlistenFns.push(f)).catch(console.error);

    /* ────── listeners ────── */
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

  /*  Comandos para el backend  */
  const startTranscription = () =>
    invoke("mic_transcribe").catch((err) => {
      console.error(err);
      setErrored(err);
    });

  return { transcript, isTranscribing, startTranscription, errored };
}
