// This file can be used for other global initializations if needed,
// but the greet functionality is removed as it's not used in the current index.html.

// Example: You could import and initialize other modules here.
// import './some-other-module';

// Variable to store the API key in memory, exported for potential use elsewhere
export let openAIApiKey: string | null = null;

console.log("main.ts loaded");

window.addEventListener("DOMContentLoaded", () => {
    console.log("DOM fully loaded and parsed");

    // --- API Key Dialog Logic ---
    const settingsIcon = document.getElementById("settings-icon") as HTMLElement | null;
    const apiKeyDialog = document.getElementById("api-key-dialog") as HTMLElement | null;
    const apiKeyInput = document.getElementById("api-key-input") as HTMLInputElement | null;
    const saveApiKeyButton = document.getElementById("save-api-key") as HTMLButtonElement | null;
    const cancelApiKeyButton = document.getElementById("cancel-api-key") as HTMLButtonElement | null;

    if (settingsIcon && apiKeyDialog && apiKeyInput && saveApiKeyButton && cancelApiKeyButton) {
      settingsIcon.addEventListener("click", () => {
        // Populate input with current key if it exists
        apiKeyInput.value = openAIApiKey || "";
        apiKeyDialog.style.display = "block";
      });

      cancelApiKeyButton.addEventListener("click", () => {
        apiKeyDialog.style.display = "none";
      });

      saveApiKeyButton.addEventListener("click", () => {
        openAIApiKey = apiKeyInput.value.trim();
        apiKeyDialog.style.display = "none";
        if (openAIApiKey) {
            console.log("OpenAI API Key saved (in memory).");
            // Optional: Add visual feedback, e.g., change settings icon color
            // settingsIcon.style.color = '#0f0'; // Greenish color
        } else {
            console.log("OpenAI API Key cleared.");
            // settingsIcon.style.color = '#ccc'; // Reset color
        }
        // Clear the input field after saving for security
        apiKeyInput.value = "";
      });

    } else {
        console.error("One or more API Key dialog elements were not found in main.ts.");
    }

    // Any other initializations that depend on the DOM can go here.
});
