async function getAudioAnalyser(): Promise<AnalyserNode> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const audioCtx = new AudioContext();
  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  source.connect(analyser);
  return analyser;
}

function animate(analyser: AnalyserNode, canvasElement: HTMLCanvasElement) {
  const ctx = canvasElement.getContext("2d");
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  const { width, height } = canvasElement;
  
  function draw() {
    analyser.getByteFrequencyData(dataArray);
    const volume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    const scale = volume > 0 ? (1 + volume / 128) : 1;
    const radius = Math.min(width, height) / 4 * scale;
    if (ctx) {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, width, height);
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
      ctx.fillStyle = "lime";
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  draw();
}

async function initAudioAnimation() {
  try {
    const analyser = await getAudioAnalyser();
    const canvasElement = document.getElementById('chatgpt-illustration') as HTMLCanvasElement;
    if (canvasElement) {
      animate(analyser, canvasElement);
    }
  } catch (err) {
    console.error("Error initializing audio animation:", err);
  }
}

initAudioAnimation().then();

