import { openAIApiKey } from "./main"; // Import the API key

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

    console.log("Sending audio to OpenAI for transcription...");
    resultDisplayElement.innerText = "Transcribing..."; // Indicate processing

    const formData = new FormData();
    // OpenAI API expects a file field. Provide a filename.
    formData.append("file", audioBlob, "audio.webm"); // Adjust filename/type if needed
    formData.append("model", "whisper-1");
    // Optional: Add parameters like 'language' (ISO-639-1 code) or 'prompt'
    // formData.append("language", "en");

    try {
        const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${openAIApiKey}`,
                // 'Content-Type': 'multipart/form-data' is set automatically by fetch when using FormData
            },
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            // Handle API errors (e.g., invalid key, rate limits)
            console.error("OpenAI API Error:", data);
            resultDisplayElement.innerText = `Error: ${data.error?.message || 'Failed to transcribe'}`;
        } else {
            console.log("Transcription successful:", data.text);
            resultDisplayElement.innerText = data.text || "[No transcription result]";
        }
    } catch (error) {
        console.error("Error sending request to OpenAI:", error);
        resultDisplayElement.innerText = "Error: Could not connect to OpenAI API.";
    }
}
