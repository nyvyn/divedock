import OpenAI from "openai"; // Import the OpenAI library
import { openAIApiKey } from "../main.ts"; // Import the API key

// --- Transcription Logic ---
// Returns the transcribed text on success, or null on failure.
// Updates the display element during processing and on error.
export async function transcribeAudioWithOpenAI(audioBlob: Blob): Promise<string> {
    if (!openAIApiKey) {
        throw new Error("API key not set");
    }

    console.log("Sending audio to OpenAI for transcription using openai library...");

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
            model: "gpt-4o-transcribe",

        });

        return transcription.text || "";

    } catch (error: any) {
        console.error("Error during transcription:", error);
        throw error;
    }
}
