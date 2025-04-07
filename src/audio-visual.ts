async function getAudioAnalyser() {
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
    const volume = dataArray.reduce((a, b) => a + b) / dataArray.length;
    illustrationElement.style.transform = `scale(${1 + volume / 256})`;
    requestAnimationFrame(draw);
  }
  
  draw();
}

window.addEventListener('load', async () => {
  const analyser = await getAudioAnalyser();
  const illustrationElement = document.getElementById('chatgpt-illustration');
  if (illustrationElement) {
    animate(analyser, illustrationElement);
  } else {
    console.error('chatgpt-illustration element not found');
  }
});
