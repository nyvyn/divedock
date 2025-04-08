import { transcribeAudioWithOpenAI } from "./transcribe"; // Import transcription function
import { generateAndPlaySpeech, stopCurrentSpeech } from "./synthesize"; // Import TTS functions

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

  // Get time domain data for waveform visualization
  analyser.getByteTimeDomainData(dataArray); // Use time domain data

  // --- Calculate Average Volume (still needed for silence detection) ---
  // We can approximate volume from time domain data, though frequency is often better.
  // Or, keep using frequency data just for volume calculation if preferred.
  // Let's calculate from time domain for now:
  let sumOfSquares = 0;
  for (let i = 0; i < analyser.frequencyBinCount; i++) {
      // Normalize the 0-255 value to -1 to 1
      const normalizedSample = (dataArray[i] / 128.0) - 1.0;
      sumOfSquares += normalizedSample * normalizedSample;
  }
  const rms = Math.sqrt(sumOfSquares / analyser.frequencyBinCount);
  const averageVolume = rms; // Use RMS as the volume measure (0-1 range approx)


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

  // --- Waveform Visualization (using time domain data) ---
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
    // dataArray values are 0-255, map to canvas height centered vertically
    const v = dataArray[i] / 128.0; // Normalize to range 0-2
    const y = v * canvas.height / 2; // Scale to canvas height

    if (i === 0) {
      canvasCtx.moveTo(x, y);
    } else {
      canvasCtx.lineTo(x, y);
    }

    x += sliceWidth;
  }

  canvasCtx.lineTo(canvas.width, canvas.height / 2); // Line to the middle vertical point at the end
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
        // Choose a mimeType - Prioritize WAV for potentially better compatibility
        let options = { mimeType: 'audio/wav' };

        if (MediaRecorder.isTypeSupported(options.mimeType)) {
            console.log(`Using supported mimeType: ${options.mimeType}`);
            mediaRecorder = new MediaRecorder(microphoneStream, options);
        } else {
            console.warn(`${options.mimeType} not supported. Trying audio/ogg...`);
            options.mimeType = 'audio/ogg;codecs=opus'; // Fallback to Ogg
            if (MediaRecorder.isTypeSupported(options.mimeType)) {
                 console.log(`Using supported mimeType: ${options.mimeType}`);
                 mediaRecorder = new MediaRecorder(microphoneStream, options);
            } else {
                console.warn(`${options.mimeType} not supported. Trying audio/webm...`);
                options.mimeType = 'audio/webm'; // Fallback to WebM
                if (MediaRecorder.isTypeSupported(options.mimeType)) {
                    console.log(`Using supported mimeType: ${options.mimeType}`);
                    mediaRecorder = new MediaRecorder(microphoneStream, options);
                } else {
                    console.warn(`${options.mimeType} also not supported. Using browser default.`);
                    mediaRecorder = new MediaRecorder(microphoneStream); // Absolute fallback
                    options.mimeType = mediaRecorder.mimeType; // Store the actual used type
                    console.log(`Using browser default mimeType: ${options.mimeType}`);
                }
            }
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
        toggleButton.innerText = "Start Listening"; // Reset button text
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
            console.log("AudioContext initialized/resumed.");
        } else if (audioContext.state === 'suspended') {
            await audioContext.resume();
            console.log("AudioContext resumed.");
        }

        // Get Microphone Stream
        microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        console.log("Microphone access granted.");

        // Setup Analyser
        const source = audioContext.createMediaStreamSource(microphoneStream);
        analyser = audioContext.createAnalyser();
        // Adjust analyser settings for responsiveness
        analyser.fftSize = 512; // Smaller size for faster analysis
        analyser.smoothingTimeConstant = 0.6; // Adjust smoothing
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        source.connect(analyser); // Connect stream to analyser

        // Start the first recorder instance
        startRecorder();

        // Set state and UI
        isProcessing = true;
        isSpeaking = false; // Assume silence initially
        toggleButton.innerText = "Stop Listening";
        if(transcriptionResultDiv) transcriptionResultDiv.innerText = ""; // Clear previous transcription
        console.log("Audio processing started...");

        // Start the processing loop
        processAudio();

      } catch (err) {
        console.error("Error starting audio processing:", err);
        alert("Error starting audio processing. Check console and permissions.");
        await stopProcessingCleanup(); // Ensure cleanup on error
      }
    } else {
      // --- Stop Processing ---
      await stopProcessingCleanup();
    }
  });
} else {
  if (!toggleButton) console.error("Toggle button not found");
  if (!canvas) console.error("Canvas element not found");
  if (!canvasCtx) console.error("Canvas context not available");
  if (!transcriptionResultDiv) console.error("Transcription result div not found");
}

// --- API Key Dialog Logic is handled in main.ts ---
