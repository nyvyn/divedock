import { openAIApiKey } from "./main"; // Import the API key
import OpenAI from "openai"; // Import the OpenAI library

let currentSpeech: AudioBufferSourceNode | null = null; // To hold the currently playing speech node

// --- Text-to-Speech Logic ---
export async function generateAndPlaySpeech(text: string, audioContext: AudioContext | null): Promise<AudioBufferSourceNode | null> {
    if (!audioContext) {
        console.error("AudioContext not available for TTS playback.");
        return null;
    }
    if (!openAIApiKey) {
        console.error("OpenAI API Key is not set for TTS.");
        // Optionally display this error to the user elsewhere
        return null;
    }
    if (!text || text.trim().length === 0) {
        console.log("No text provided for TTS.");
        return null;
    }

    // Interrupt any currently playing speech
    stopCurrentSpeech();

    console.log("Generating speech for text:", text);
    // Optionally indicate TTS generation in the UI

    try {
        const openai = new OpenAI({
            apiKey: openAIApiKey,
            dangerouslyAllowBrowser: true // Required for browser usage
        });

        // Call the TTS API
        const mp3 = await openai.audio.speech.create({
            model: "tts-1", // Or "tts-1-hd" or specific gpt-4o models if available/preferred
            voice: "alloy", // Choose a voice: alloy, echo, fable, onyx, nova, shimmer
            input: text,
            response_format: "mp3" // Other options: opus, aac, flac
            // Optional: speed (0.25 to 4.0)
        });

        // Get the audio data as an ArrayBuffer
        const audioData = await mp3.arrayBuffer();
        console.log("TTS audio data received, size:", audioData.byteLength);

        // Decode the audio data
        const audioBuffer = await audioContext.decodeAudioData(audioData);

        // Create an AudioBufferSourceNode
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);

        // Start playback
        source.start(0);
        console.log("Playing TTS audio.");

        // Store the reference to the playing source
        currentSpeech = source;

        // Handle cleanup when playback finishes naturally
        source.onended = () => {
            console.log("TTS playback finished.");
            if (currentSpeech === source) {
                currentSpeech = null; // Clear reference only if it's the same source
            }
        };

        return source; // Return the source node

    } catch (error) {
        console.error("Error during OpenAI TTS:", error);
        let errorMessage = "An unknown error occurred during TTS generation.";
         if (error instanceof OpenAI.APIError) {
            errorMessage = `OpenAI TTS API Error: ${error.status} ${error.name} ${error.message}`;
        } else if (error instanceof Error) {
            errorMessage = `TTS Error: ${error.message}`;
        }
        // Optionally display this error to the user
        currentSpeech = null; // Ensure reference is cleared on error
        return null;
    }
}

// Function to explicitly stop the currently playing speech
export function stopCurrentSpeech() {
    if (currentSpeech) {
        console.log("Interrupting current TTS playback.");
        try {
            currentSpeech.stop(); // Stop playback
        } catch (e) {
            // Ignore errors if stop is called multiple times or on an already stopped node
            console.warn("Error stopping speech node:", e);
        }
        currentSpeech = null; // Clear the reference
    }
}
