import { MicRecorder } from "@tauri-apps/plugin-mic-recorder";

let isListening = false;

const toggleButton = document.getElementById("toggle-button");
if (toggleButton) {
  toggleButton.addEventListener("click", async () => {
    if (!isListening) {
      try {
        await MicRecorder.start();
        isListening = true;
        toggleButton.innerText = "Stop Listening";
        console.log("Recording started...");
      } catch (error) {
        console.error("Error starting mic recorder:", error);
      }
    } else {
      try {
        const audioData = await MicRecorder.stop();
        isListening = false;
        toggleButton.innerText = "Start Listening";
        console.log("Recording stopped", audioData);
        const volume = audioData?.length ? audioData.length % 256 : 0;
        const illustrationElement = document.getElementById("chatgpt-illustration");
        if (illustrationElement) {
          illustrationElement.style.transform = `scale(${1 + volume / 256})`;
        }
      } catch (error) {
        console.error("Error stopping mic recorder:", error);
      }
    }
  });
} else {
  console.error("Toggle button not found");
}
