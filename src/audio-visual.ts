const fileInput = document.getElementById("audioPicker") as HTMLInputElement;
const audioElement = document.querySelector("audio") as HTMLAudioElement;
const canvasElement = document.getElementById("canvas") as HTMLCanvasElement;

function initAudioFileProcessing() {
  if (!fileInput || !audioElement || !canvasElement) {
    console.error("Required elements not found");
    return;
  }

  fileInput.addEventListener("change", async () => {
    if (!fileInput.files || fileInput.files.length === 0) return;
    const audioFile = fileInput.files[0];
    const blobUrl = URL.createObjectURL(audioFile);
    audioElement.src = blobUrl;
    await audioElement.play();

    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaElementSource(audioElement);
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

