// We'll use the Web Audio API for visualization for now.
// If file recording via the plugin is needed simultaneously,
// further integration might be required.
// import { startRecording, stopRecording } from "tauri-plugin-mic-recorder-api";

let isListening = false;
let animationFrameId: number | null = null;
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let microphoneStream: MediaStream | null = null;
let dataArray: Uint8Array | null = null;


const toggleButton = document.getElementById("mic-toggle") as HTMLButtonElement | null;
const canvas = document.getElementById("audioCanvas") as HTMLCanvasElement | null;
const canvasCtx = canvas?.getContext("2d");

function drawVisualization() {
  if (!canvas || !canvasCtx || !analyser || !dataArray || !isListening) {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    // Stop drawing if not listening
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    return;
  }

  // Get the time domain data
  analyser.getByteTimeDomainData(dataArray);

  // Clear the canvas
  canvasCtx.fillStyle = "rgb(17, 17, 17)"; // Background color
  canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

  // Set up line style
  canvasCtx.lineWidth = 2;
  canvasCtx.strokeStyle = "rgb(50, 200, 50)"; // Waveform color
  canvasCtx.beginPath();

  const sliceWidth = canvas.width * 1.0 / analyser.frequencyBinCount;
  let x = 0;

  for (let i = 0; i < analyser.frequencyBinCount; i++) {
    // dataArray values are 0-255, map to canvas height
    const v = dataArray[i] / 128.0; // Normalize to range around 1.0
    const y = v * canvas.height / 2;

    if (i === 0) {
      canvasCtx.moveTo(x, y);
    } else {
      canvasCtx.lineTo(x, y);
    }

    x += sliceWidth;
  }

  canvasCtx.lineTo(canvas.width, canvas.height / 2); // Line to the middle at the end
  canvasCtx.stroke(); // Draw the line

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
      // Start listening
      try {
        if (!audioContext) {
            audioContext = new AudioContext();
        }
        // Resume context if it was suspended
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        const source = audioContext.createMediaStreamSource(microphoneStream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048; // Adjust detail level
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        source.connect(analyser);
        // Note: We don't connect analyser to destination, as we only want to analyze

        isListening = true;
        toggleButton.innerText = "Stop Listening";
        console.log("Microphone access granted, starting visualization...");
        drawVisualization(); // Start the loop

      } catch (err) {
        console.error("Error accessing microphone:", err);
        alert("Error accessing microphone. Please ensure permission is granted.");
        // Reset state
        isListening = false;
        toggleButton.innerText = "Start Listening";
        if (audioContext && audioContext.state !== 'closed') {
            await audioContext.close(); // Close context on error
            audioContext = null;
        }
      }
    } else {
      // Stop listening
      try {
        if (microphoneStream) {
          microphoneStream.getTracks().forEach(track => track.stop()); // Release microphone
          microphoneStream = null;
        }
        isListening = false;
        toggleButton.innerText = "Start Listening";
        console.log("Stopped listening.");

        // Stop visualization loop and clear canvas
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
        clearCanvas();

        // Optional: Suspend or close AudioContext when not in use
        // if (audioContext && audioContext.state === 'running') {
        //     await audioContext.suspend();
        // }
        // Or close it completely if you don't expect to restart soon:
        // if (audioContext) {
        //     await audioContext.close();
        //     audioContext = null;
        //     analyser = null;
        //     dataArray = null;
        // }

      } catch (error) {
        console.error("Error stopping microphone or visualization:", error);
      }
    }
  });
} else {
  if (!toggleButton) console.error("Toggle button not found");
  if (!canvas) console.error("Canvas element not found");
  if (!canvasCtx) console.error("Canvas context not available");
}
