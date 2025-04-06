async function getAudioAnalyser(): Promise<AnalyserNode> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const audioCtx = new AudioContext();
  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  source.connect(analyser);
  return analyser;
}

function animate(analyser: AnalyserNode, illustrationElement: HTMLElement) {
  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  function draw() {
    analyser.getByteFrequencyData(dataArray);
    const volume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    illustrationElement.style.transform = `scale(${1 + volume / 256})`;
    requestAnimationFrame(draw);
  }
  draw();
}

async function initAudioAnimation() {
  try {
    const analyser = await getAudioAnalyser();
    const illustrationElement = document.getElementById('chatgpt-illustration');
    if (illustrationElement) {
      animate(analyser, illustrationElement);
    }
  } catch (err) {
    console.error("Error initializing audio animation:", err);
  }
}

initAudioAnimation();

export {};
