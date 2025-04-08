import { openAIApiKey } from "./main"; // Import the API key
import OpenAI from "openai"; // Import the OpenAI library

// --- Transcription Logic ---
export async function transcribeAudioWithOpenAI(audioBlob: Blob, resultDisplayElement: HTMLElement | null) {
    if (!resultDisplayElement) {
        console.error("Transcription result display element not provided.");
        return;
    }
    if (!openAIApiKey) {
        console.error("OpenAI API Key is not set.");
        resultDisplayElement.innerText = "Error: OpenAI API Key is not set. Please set it via the settings icon.";
        return;
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

        console.log("Transcription successful:", transcription.text);
        resultDisplayElement.innerText = transcription.text || "[No transcription result]";

    } catch (error) {
        console.error("Error during OpenAI transcription:", error);
        let errorMessage = "An unknown error occurred during transcription.";
        if (error instanceof OpenAI.APIError) {
            errorMessage = `OpenAI API Error: ${error.status} ${error.name} ${error.message}`;
        } else if (error instanceof Error) {
            errorMessage = `Error: ${error.message}`;
        }
        resultDisplayElement.innerText = errorMessage;
    }
}
