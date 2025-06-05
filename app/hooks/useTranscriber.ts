import { useState, useCallback, useMemo } from "react";
import { transcribe as onnxTranscribe } from "../lib/transcribe";

export interface TranscriberData {
    isBusy: boolean;
    text: string;
    chunks: { text: string; timestamp: [number, number | null] }[];
}

export interface Transcriber {
    onInputChange: () => void;
    isBusy: boolean;
    isModelLoading: boolean;
    progressItems: any[];
    start: (audioData: Float32Array) => void;
    output?: TranscriberData;
    model: string;
    setModel: (model: string) => void;
    multilingual: boolean;
    setMultilingual: (model: boolean) => void;
    quantized: boolean;
    setQuantized: (model: boolean) => void;
    subtask: string;
    setSubtask: (subtask: string) => void;
    language?: string;
    setLanguage: (language: string) => void;
}

export function useTranscriber(): Transcriber {
    const [transcript, setTranscript] = useState<TranscriberData | undefined>(undefined);
    const [isBusy, setIsBusy] = useState(false);
    const [isModelLoading, setIsModelLoading] = useState(false);
    const [progressItems] = useState<any[]>([]);

    // These are kept for API compatibility, but are not used in this simple ONNX version
    const [model, setModel] = useState<string>("onnx-whisper");
    const [subtask, setSubtask] = useState<string>("transcribe");
    const [quantized, setQuantized] = useState<boolean>(false);
    const [multilingual, setMultilingual] = useState<boolean>(false);
    const [language, setLanguage] = useState<string>("en");

    const onInputChange = useCallback(() => {
        setTranscript(undefined);
    }, []);

    const start = useCallback(
        async (audio: Float32Array) => {
            setTranscript(undefined);
            setIsBusy(true);
            setIsModelLoading(true);
            try {
                const text = await onnxTranscribe(audio);
                setTranscript({
                    isBusy: false,
                    text,
                    chunks: [],
                });
            } catch (e) {
                setTranscript({
                    isBusy: false,
                    text: "Transcription failed",
                    chunks: [],
                });
            } finally {
                setIsBusy(false);
                setIsModelLoading(false);
            }
        },
        []
    );

    return useMemo(() => {
        return {
            onInputChange,
            isBusy,
            isModelLoading,
            progressItems,
            start,
            output: transcript,
            model,
            setModel,
            multilingual,
            setMultilingual,
            quantized,
            setQuantized,
            subtask,
            setSubtask,
            language,
            setLanguage,
        };
    }, [
        onInputChange,
        isBusy,
        isModelLoading,
        progressItems,
        start,
        transcript,
        model,
        setModel,
        multilingual,
        setMultilingual,
        quantized,
        setQuantized,
        subtask,
        setSubtask,
        language,
        setLanguage,
    ]);
}
