import { startRecording, stopRecording } from "tauri-plugin-mic-recorder-api";

let isListening = false;
let animationFrameId: number | null = null;

const toggleButton = document.getElementById("mic-toggle") as HTMLButtonElement | null;
const canvas = document.getElementById("audioCanvas") as HTMLCanvasElement | null;
const canvasCtx = canvas?.getContext("2d");

function drawVisualization() {
  if (!canvas || !canvasCtx || !isListening) {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    return;
  }

  // --- Basic Placeholder Visualization ---
  // Clear the canvas
  canvasCtx.fillStyle = "rgb(17, 17, 17)"; // Match background color #111
  canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw a simple fluctuating bar (example)
  const barWidth = canvas.width / 2;
  const barHeight = (Math.random() * canvas.height) / 2 + canvas.height / 4; // Random height
  const x = canvas.width / 4;
  const y = (canvas.height - barHeight) / 2;

  canvasCtx.fillStyle = "rgb(50, 200, 50)"; // Green color
  canvasCtx.fillRect(x, y, barWidth, barHeight);
  // --- End Placeholder ---

  // Request next frame
  animationFrameId = requestAnimationFrame(drawVisualization);
}

function clearCanvas() {
    if (canvas && canvasCtx) {
        canvasCtx.fillStyle = "rgb(17, 17, 17)"; // Match background color #111
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    }
}


if (toggleButton && canvas && canvasCtx) {
  // Set canvas dimensions based on its styled size
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;

  toggleButton.addEventListener("click", async () => {
    if (!isListening) {
      try {
        // Note: startRecording itself might not give us audio data directly.
        // This visualization is just a placeholder reacting to the recording state.
        await startRecording();
        isListening = true;
        toggleButton.innerText = "Stop Listening";
        console.log("Recording started...");
        // Start visualization loop
        drawVisualization();
      } catch (error) {
        console.error("Error starting mic recorder:", error);
        isListening = false; // Ensure state is correct on error
      }
    } else {
      try {
        await stopRecording();
        isListening = false;
        toggleButton.innerText = "Start Listening";
        console.log("Recording stopped");
        // Stop visualization loop and clear canvas
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        clearCanvas();
      } catch (error) {
        console.error("Error stopping mic recorder:", error);
        // Consider if state needs reset here too
      }
    }
  });
} else {
  if (!toggleButton) console.error("Toggle button not found");
  if (!canvas) console.error("Canvas element not found");
  if (!canvasCtx) console.error("Canvas context not available");
}
