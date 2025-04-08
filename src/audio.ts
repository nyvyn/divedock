// We'll use the Web Audio API for visualization for now.
// If file recording via the plugin is needed simultaneously,
// further integration might be required.
// import { startRecording, stopRecording } from "tauri-plugin-mic-recorder-api";
import { openAIApiKey } from "./main"; // Import the API key
import { transcribeAudioWithOpenAI } from "./transcribe"; // Import transcription function
import { generateAndPlaySpeech, stopCurrentSpeech } from "./tts"; // Import TTS functions

// --- State Variables ---
let isProcessing = false; // Is the app actively processing audio? Renamed from isListening
let isSpeaking = false; // Is the user currently speaking?
let silenceTimer: number | null = null; // Timer for detecting end-of-speech pause
const silenceDelay = 1500; // ms of silence before triggering transcription
const silenceThreshold = 0.01; // Audio level threshold (adjust based on testing)

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
// TTS logic imported above


// --- Audio Processing Loop (includes Visualization and Silence Detection) ---
function processAudio() {
  if (!isProcessing || !analyser || !dataArray || !canvas || !canvasCtx) {
      // Stop loop if not processing
      if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
      }
      return;
  }

  // Get frequency data for volume analysis
  analyser.getByteFrequencyData(dataArray); // Use frequency data for volume

  // --- Calculate Average Volume ---
  let sum = 0;
  for (let i = 0; i < analyser.frequencyBinCount; i++) {
    sum += dataArray[i];
  }
  const averageVolume = sum / analyser.frequencyBinCount / 255; // Normalize to 0-1 range

  // --- Silence Detection Logic ---
  if (averageVolume > silenceThreshold) {
      // Speaking detected
      if (!isSpeaking) {
          console.log("Speech started.");
          isSpeaking = true;
          stopCurrentSpeech(); // Interrupt TTS if it's playing
          // Ensure recorder is running (should be if isProcessing is true)
          if (mediaRecorder && mediaRecorder.state === "inactive") {
              console.warn("Recorder was inactive while processing, restarting.");
              startRecorder(); // Make sure recorder is going
          }
      }
      // Clear the silence timer if it was running
      if (silenceTimer) {
          clearTimeout(silenceTimer);
          silenceTimer = null;
      }
  } else {
      // Silence detected
      if (isSpeaking) {
          // Just transitioned from speaking to silence
          console.log("Potential pause detected, starting timer...");
          if (!silenceTimer) {
              silenceTimer = window.setTimeout(() => {
                  console.log("Silence duration met, triggering transcription.");
                  isSpeaking = false; // Mark as no longer speaking
                  stopRecorder(); // Stop recording to process the utterance
                  silenceTimer = null;
                  // Recorder onstop will handle transcription and restarting if still processing
              }, silenceDelay);
          }
      }
  }

  // --- Simple Waveform Visualization (using the same frequency data) ---
  // Clear the canvas
  canvasCtx.fillStyle = "rgb(17, 17, 17)"; // Background color
  canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw based on frequency data
  canvasCtx.lineWidth = 2;
  canvasCtx.strokeStyle = "rgb(50, 200, 50)"; // Waveform color
  canvasCtx.beginPath();

  const sliceWidth = canvas.width * 1.0 / analyser.frequencyBinCount;
  let x = 0;

  for (let i = 0; i < analyser.frequencyBinCount; i++) {
    // dataArray values are 0-255 (frequency)
    const v = dataArray[i] / 128.0; // Adjust scaling as needed
    const y = canvas.height - (v * canvas.height / 2); // Draw from bottom up

    if (i === 0) {
      canvasCtx.moveTo(x, y);
    } else {
      canvasCtx.lineTo(x, y);
    }

    x += sliceWidth;
  }

  canvasCtx.lineTo(canvas.width, canvas.height); // Line to the bottom right
  canvasCtx.stroke(); // Draw the line
  // --- End Visualization ---


  // Request next frame
  animationFrameId = requestAnimationFrame(processAudio);
}

function clearCanvas() {
    if (canvas && canvasCtx) {
        canvasCtx.fillStyle = "rgb(17, 17, 17)"; // Match background color #111
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

// --- Helper Functions for Recorder ---
function startRecorder() {
    if (!microphoneStream) {
        console.error("Cannot start recorder: microphone stream not available.");
        return;
    }
    if (mediaRecorder && mediaRecorder.state === "recording") {
        console.log("Recorder already running.");
        return;
    }

    recordedChunks = []; // Clear previous chunks
    try {
        // Choose a mimeType
        let options = { mimeType: 'audio/ogg;codecs=opus' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            console.warn(`${options.mimeType} not supported. Trying audio/webm...`);
            options.mimeType = 'audio/webm';
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                 console.warn(`${options.mimeType} also not supported. Using browser default.`);
                 mediaRecorder = new MediaRecorder(microphoneStream);
                 options.mimeType = mediaRecorder.mimeType;
            } else {
                 mediaRecorder = new MediaRecorder(microphoneStream, options);
            }
        } else {
             mediaRecorder = new MediaRecorder(microphoneStream, options);
        }

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => { // Make async to await transcription/TTS
            console.log("Recorder stopped.");
            // Ensure context is still valid before proceeding
            if (!audioContext || audioContext.state === 'closed') {
                console.warn("Audio context closed before processing recorder stop.");
                return;
            }
            if (recordedChunks.length > 0) {
                const mimeType = recordedChunks[0].type || options.mimeType || 'audio/webm';
                const audioBlob = new Blob(recordedChunks, { type: mimeType });
                console.log(`Combined Blob size: ${audioBlob.size}, type: ${audioBlob.type}`);

                // Perform transcription
                const transcriptionText = await transcribeAudioWithOpenAI(audioBlob, transcriptionResultDiv);

                // If transcription successful, generate and play speech
                if (transcriptionText && isProcessing) { // Only speak if still processing
                    await generateAndPlaySpeech(transcriptionText, audioContext);
                }

            } else {
                console.log("No audio data recorded for this segment.");
                // Optionally clear transcription display or show a message
                // if(transcriptionResultDiv) transcriptionResultDiv.innerText = "[No speech detected in last segment]";
            }
            recordedChunks = []; // Clear chunks for next recording

            // IMPORTANT: Restart recorder immediately if still processing
            if (isProcessing) {
                console.log("Restarting recorder for next utterance...");
                startRecorder();
            }
        };

        // Use a short timeslice to ensure data is available reasonably often,
        // although onstop is the primary trigger for transcription here.
        mediaRecorder.start(1000); // Start recording, timeslice optional but can help keep data flowing
        console.log(`MediaRecorder started with ${options.mimeType}. State: ${mediaRecorder.state}`);

    } catch (recorderError) {
        console.error("Error initializing MediaRecorder:", recorderError);
        alert("Could not start audio recorder. Check console for details.");
        // Handle cleanup if recorder fails to start
        stopProcessingCleanup();
    }
}

function stopRecorder() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop(); // This triggers the onstop event handler
        console.log("MediaRecorder stopping...");
    }
    // Don't nullify mediaRecorder here, onstop might need it briefly,
    // and startRecorder will create a new one if needed.
}

// --- Cleanup Function ---
async function stopProcessingCleanup() {
    console.log("Stopping audio processing and cleaning up...");
    isProcessing = false;
    isSpeaking = false;

    if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
    }
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    stopRecorder(); // Stop recorder if running
    stopCurrentSpeech(); // Stop any TTS

    if (microphoneStream) {
      microphoneStream.getTracks().forEach(track => track.stop()); // Release microphone
      microphoneStream = null;
    }

    // Close AudioContext
    if (audioContext && audioContext.state !== 'closed') {
        await audioContext.close();
        audioContext = null;
        analyser = null;
        dataArray = null;
    }

    mediaRecorder = null; // Clear recorder instance
    recordedChunks = [];

    clearCanvas(); // Clear visualization

    if (toggleButton) {
        toggleButton.innerText = "Start Processing"; // Reset button text
    }
     if (transcriptionResultDiv) {
        // Optionally clear transcription or leave the last one
        // transcriptionResultDiv.innerText = "";
    }
}


// --- Initialization and Button Logic ---
if (toggleButton && canvas && canvasCtx && transcriptionResultDiv) { // Check for transcriptionResultDiv here now
  // Set canvas dimensions
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;

  toggleButton.addEventListener("click", async () => {
    if (!isProcessing) { // Use isProcessing state variable
      // --- Start Processing ---
      try {
        // Initialize Audio Context
        if (!audioContext || audioContext.state === 'closed') { // Check if closed too
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
} else {
    // Log errors if essential elements are missing
    if (!toggleButton) console.error("Toggle button not found");
    if (!canvas) console.error("Canvas element not found");
    if (!canvasCtx) console.error("Canvas context not available");
    if (!transcriptionResultDiv) console.error("Transcription result div not found");
}

// --- API Key Dialog Logic is handled in main.ts ---
