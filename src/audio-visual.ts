const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const audioElement = document.getElementById("audio") as HTMLAudioElement;
const audioPickerElement = document.getElementById("audioPicker") as HTMLInputElement;
const canvasElement = document.getElementById("canvas") as HTMLCanvasElement;
canvasElement.width = window.innerWidth;
canvasElement.height = window.innerHeight;
const canvasCtx = canvasElement.getContext("2d");

function initAudioFileProcessing() {
  if (!audioPickerElement || !audioElement || !canvasElement || !canvasCtx) {
    console.error("Required elements not found");
    return;
  }

  audioPickerElement.addEventListener("change", async () => {
    if (!audioPickerElement.files || audioPickerElement.files.length === 0) return;
    const audioFile = audioPickerElement.files[0];
    const blobUrl = URL.createObjectURL(audioFile);
    audioElement.src = blobUrl;
    await audioElement.play();

    // Use the globally defined audioContext instead of creating a new one
    const source = audioContext.createMediaElementSource(audioElement);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    source.connect(analyser);
    analyser.connect(audioCtx.destination);

    const ctx = canvasElement.getContext("2d");
    const { width, height } = canvasElement;

    function draw() {
      requestAnimationFrame(draw);
      if (!ctx) return;
      analyser.getByteFrequencyData(dataArray);
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, width, height);
      const barWidth = width / bufferLength;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height;
        ctx.fillStyle = "lime";
        ctx.fillRect(i * barWidth, height - barHeight, barWidth, barHeight);
      }
    }
    draw();
  });
}

initAudioFileProcessing();

