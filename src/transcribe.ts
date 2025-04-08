import { openAIApiKey } from "./main"; // Import the API key
import OpenAI from "openai"; // Import the OpenAI library

import OpenAI from "openai"; // Import the OpenAI library
import { openAIApiKey } from "./main"; // Import the API key

// --- Transcription Logic ---
// Returns the transcribed text on success, or null on failure.
// Updates the display element during processing and on error.
export async function transcribeAudioWithOpenAI(audioBlob: Blob, resultDisplayElement: HTMLElement | null): Promise<string | null> {
    if (!resultDisplayElement) {
        console.error("Transcription result display element not provided.");
        return null; // Return null on failure
    }
    if (!openAIApiKey) {
        console.error("OpenAI API Key is not set.");
        resultDisplayElement.innerText = "Error: OpenAI API Key is not set. Please set it via the settings icon.";
        return null; // Return null on failure
    }

    console.log("Sending audio to OpenAI for transcription using openai library...");
    resultDisplayElement.innerText = "Transcribing..."; // Indicate processing

    try {
        // Instantiate the OpenAI client with the API key
        // IMPORTANT: Handle potential browser environment issues.
        // The 'openai' library might have issues with certain browser features or require polyfills.
        // It's generally recommended to make API calls from a backend for security and reliability.
        // If running directly in the browser, ensure proper configuration.
        const openai = new OpenAI({
            apiKey: openAIApiKey,
            dangerouslyAllowBrowser: true // Required for browser usage, acknowledge security implications
        });

        // Determine filename extension based on blob type
        let fileExtension = 'webm'; // Default
        if (audioBlob.type.includes('ogg')) {
            fileExtension = 'ogg';
        } else if (audioBlob.type.includes('wav')) {
            fileExtension = 'wav';
        } else if (audioBlob.type.includes('mp4')) {
            fileExtension = 'mp4';
        } // Add more mappings if other types are recorded
        const fileName = `audio.${fileExtension}`;
        console.log(`Using filename for OpenAI: ${fileName} (type: ${audioBlob.type})`);


        // Create a File object from the Blob, using the dynamic filename
        const audioFile = new File([audioBlob], fileName, { type: audioBlob.type });

        // Call the transcription API using the library
        const transcription = await openai.audio.transcriptions.create({
            file: audioFile,
            model: "whisper-1", // Using whisper-1 as gpt-4o-transcribe is not documented for this endpoint
            // model: "gpt-4o-transcribe", // Use this if you are sure it's correct and supported
        });

        const transcribedText = transcription.text || "";
        console.log("Transcription successful:", transcribedText);
        resultDisplayElement.innerText = transcribedText || "[No transcription result]";
        return transcribedText; // Return the text on success

    } catch (error) {
        console.error("Error during OpenAI transcription:", error);
        let errorMessage = "An unknown error occurred during transcription.";
        if (error instanceof OpenAI.APIError) {
            errorMessage = `OpenAI API Error: ${error.status} ${error.name} ${error.message}`;
        } else if (error instanceof Error) {
            errorMessage = `Error: ${error.message}`;
        }
        resultDisplayElement.innerText = errorMessage;
        return null; // Return null on failure
    }
}
