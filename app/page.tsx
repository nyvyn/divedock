import AudioVisualizer from "./components/visualizer/AudioVisualizer";
import { useTransition } from "react";
import useMicVAD from "./lib/useMicVAD";
import player from "./lib/usePlayer";
import utils from "./lib/utils";

export default function Home() {
    const [isPending, startTransition] = useTransition();

    function submit(blob: Blob) {
        // Implement your submit logic here
    }

    const vad = useMicVAD({
        startOnLoad: true,
        onSpeechEnd: (audio: Float32Array) => {
            player.stop();
            const wav = utils.encodeWAV(audio);
            const blob = new Blob([wav], { type: "audio/wav" });
            startTransition(() => submit(blob));
            const isFirefox = navigator.userAgent.includes("Firefox");
            if (isFirefox) vad.pause();
        },
        positiveSpeechThreshold: 0.6,
        minSpeechFrames: 4,
    });

    return (
        <AudioVisualizer vad={vad} />
    );
}
