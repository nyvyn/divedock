import { startRecording, stopRecording } from "tauri-plugin-mic-recorder-api";

let isListening = false;

const toggleButton = document.getElementById("mic-toggle");
if (toggleButton) {
  toggleButton.addEventListener("click", async () => {
    if (!isListening) {
      try {
        await startRecording();
        isListening = true;
        toggleButton.innerText = "Stop Listening";
        console.log("Recording started...");
      } catch (error) {
        console.error("Error starting mic recorder:", error);
      }
    } else {
      try {
        await stopRecording();
        isListening = false;
        toggleButton.innerText = "Start Listening";
        console.log("Recording stopped");
      } catch (error) {
        console.error("Error stopping mic recorder:", error);
      }
    }
  });
} else {
  console.error("Toggle button not found");
}
