"use client";

import React, { useEffect, useRef, useState } from "react";

export default function AudioVisualizer() {
    const [level, setLevel] = useState(0);
    const [smoothedLevel, setSmoothedLevel] = useState(0);
    const animationRef = useRef<number | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

    useEffect(() => {
        let mounted = true;
        let stream: MediaStream | null = null;

        async function setupAudio() {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                if (!mounted) return;

                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                audioContextRef.current = audioContext;

                const analyser = audioContext.createAnalyser();
                analyser.fftSize = 256;
                analyserRef.current = analyser;

                const source = audioContext.createMediaStreamSource(stream);
                sourceRef.current = source;
                source.connect(analyser);

                const bufferLength = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);
                dataArrayRef.current = dataArray;

                function animate() {
                    if (!analyserRef.current || !dataArrayRef.current) return;
                    analyserRef.current.getByteTimeDomainData(dataArrayRef.current);

                    // Calculate RMS (root mean square) for volume
                    let sum = 0;
                    for (let i = 0; i < dataArrayRef.current.length; i++) {
                        const v = (dataArrayRef.current[i] - 128) / 128;
                        sum += v * v;
                    }
                    const rms = Math.sqrt(sum / dataArrayRef.current.length);
                    setLevel(rms);

                    animationRef.current = requestAnimationFrame(animate);
                }
                animate();
            } catch (err) {
                // Could not get mic
                setLevel(0);
            }
        }

        setupAudio();

        return () => {
            mounted = false;
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            if (audioContextRef.current) audioContextRef.current.close();
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }
        };
    }, []);

    // Smoothing effect for more fluid animation
    useEffect(() => {
        let raf: number;
        function smooth() {
            setSmoothedLevel((prev) => prev + (level - prev) * 0.18); // lower = smoother
            raf = requestAnimationFrame(smooth);
        }
        smooth();
        return () => cancelAnimationFrame(raf);
    }, [level]);

    // Circle size: min 60px, max 400px
    const minSize = 60;
    const maxSize = 400;
    // Make the visualizer even more reactive by amplifying the level
    const amplification = 7.5;
    const size = minSize + (maxSize - minSize) * Math.min(smoothedLevel * amplification, 1);

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                width: "100vw",
                height: "100vh",
                background: "black",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
            }}
        >
            <div
                style={{
                    width: size,
                    height: size,
                    borderRadius: "50%",
                    background: "radial-gradient(circle at 60% 40%, #ff6666 60%, #a10000 100%)",
                    boxShadow: "0 0 120px 40px #ff2222aa, 0 0 0 12px #a10000",
                    border: "4px solid #ff2222",
                    transition: "width 0.25s cubic-bezier(.4,2,.6,1), height 0.25s cubic-bezier(.4,2,.6,1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <div
                    style={{
                        width: size * 0.25,
                        height: size * 0.25,
                        borderRadius: "50%",
                        background: "#ff2222",
                        boxShadow: "0 0 48px 16px #ff2222aa",
                        transition: "width 0.25s cubic-bezier(.4,2,.6,1), height 0.25s cubic-bezier(.4,2,.6,1)",
                    }}
                />
            </div>
        </div>
    );
}
