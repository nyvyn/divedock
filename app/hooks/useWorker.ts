import { useEffect, useRef } from "react";

export function useWorker(handler: (e: MessageEvent) => void) {
    const ref = useRef<Worker>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;   // Node pass: no Worker
        ref.current = new Worker(new URL('./worker.ts', import.meta.url), {
            type: 'module',
        });
        ref.current.addEventListener('message', handler);
        return () => ref.current?.terminate();
    }, [handler]);

    return ref.current;        // may be undefined on first render
}