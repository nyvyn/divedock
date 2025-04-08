// We'll use the Web Audio API for visualization for now.
// If file recording via the plugin is needed simultaneously,
// further integration might be required.
// import { startRecording, stopRecording } from "tauri-plugin-mic-recorder-api";
import { openAIApiKey } from "./main"; // Import the API key

let isListening = false;
let animationFrameId: number | null = null;
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let microphoneStream: MediaStream | null = null;
let dataArray: Uint8Array | null = null;
let mediaRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];


// --- DOM Elements ---
const toggleButton = document.getElementById("mic-toggle") as HTMLButtonElement | null;
const canvas = document.getElementById("audioCanvas") as HTMLCanvasElement | null;
const canvasCtx = canvas?.getContext("2d");
const transcriptionResultDiv = document.getElementById("transcription-result") as HTMLElement | null;
// Dialog elements are handled in main.ts

// Transcription logic moved to transcribe.ts
import { transcribeAudioWithOpenAI } from "./transcribe";


// --- Visualization Logic ---
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

        // --- Start MediaRecorder ---
        recordedChunks = []; // Clear previous recording chunks
        try {
            // Choose a mimeType that the browser supports and OpenAI likely accepts
            // Common options: 'audio/ogg;codecs=opus', 'audio/webm;codecs=opus', 'audio/mp4', 'audio/wav'
            // OpenAI supported: ['flac', 'm4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'wav', 'webm']
            let options = { mimeType: 'audio/ogg;codecs=opus' }; // Try OGG Opus first

            if (MediaRecorder.isTypeSupported(options.mimeType)) {
                console.log(`Using supported mimeType: ${options.mimeType}`);
                mediaRecorder = new MediaRecorder(microphoneStream, options);
            } else {
                console.warn(`${options.mimeType} not supported. Trying audio/webm...`);
                options.mimeType = 'audio/webm'; // Fallback to webm (browser default codec)
                if (MediaRecorder.isTypeSupported(options.mimeType)) {
                    console.log(`Using supported mimeType: ${options.mimeType}`);
                    mediaRecorder = new MediaRecorder(microphoneStream, options);
                } else {
                     console.warn(`${options.mimeType} also not supported. Using browser default.`);
                     // Let the browser choose the default format/codec
                     mediaRecorder = new MediaRecorder(microphoneStream);
                     options.mimeType = mediaRecorder.mimeType; // Store the actual used type
                     console.log(`Using browser default mimeType: ${options.mimeType}`);
                }
            }


            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunks.push(event.data);
                    // console.log(`Recorded chunk size: ${event.data.size}`);
                }
            };

            mediaRecorder.onstop = () => {
                console.log("Recorder stopped. Processing recorded chunks.");
                if (recordedChunks.length > 0) {
                    // Determine the mimeType from the first chunk or the options used
                    const mimeType = recordedChunks[0].type || options.mimeType || 'audio/webm';
                    const audioBlob = new Blob(recordedChunks, { type: mimeType });
                    console.log(`Combined Blob size: ${audioBlob.size}, type: ${audioBlob.type}`);
                    // Send the combined audio blob to OpenAI, passing the display element
                    transcribeAudioWithOpenAI(audioBlob, transcriptionResultDiv);
                } else {
                    console.log("No audio data recorded.");
                    if(transcriptionResultDiv) transcriptionResultDiv.innerText = "No audio data was recorded.";
                }
                recordedChunks = []; // Clear chunks for next recording
            };

            mediaRecorder.start(); // Start recording
            console.log("MediaRecorder started.");

        } catch (recorderError) {
            console.error("Error initializing MediaRecorder:", recorderError);
            alert("Could not start audio recorder. Check console for details.");
            // Don't proceed with listening state if recorder fails
            microphoneStream.getTracks().forEach(track => track.stop());
            microphoneStream = null;
            if (audioContext && audioContext.state !== 'closed') {
                await audioContext.close();
                audioContext = null;
            }
            return; // Exit the click handler
        }
        // --- End MediaRecorder Start ---


        isListening = true;
        toggleButton.innerText = "Stop Listening";
        if(transcriptionResultDiv) transcriptionResultDiv.innerText = ""; // Clear previous transcription
        console.log("Microphone access granted, starting visualization and recording...");
        drawVisualization(); // Start the visualization loop

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

        // --- Stop MediaRecorder ---
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop(); // This triggers the onstop event handler
            console.log("MediaRecorder stopping...");
        }
        mediaRecorder = null; // Release the recorder object
        // --- End MediaRecorder Stop ---

        isListening = false;
        toggleButton.innerText = "Start Listening";
        console.log("Stopped listening.");

        // Stop visualization loop
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
  if (!transcriptionResultDiv) console.error("Transcription result div not found");
}

// --- API Key Dialog Logic moved to main.ts ---
