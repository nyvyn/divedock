const audioContext = new window.AudioContext();
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

  audioPickerElement.onchange = function () {
    // @ts-ignore
    const files = this.files;
    audioElement.src = URL.createObjectURL(files[0]);
    audioElement.load();
    audioElement.play();

    const track = audioContext.createMediaElementSource(audioElement);
    track.connect(audioContext.destination);

    // Analyzer node
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 128;
    track.connect(analyser);

    // Creating the array to store the frequency data
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Some useful constants
    const WIDTH = canvasElement.width;
    const HEIGHT = canvasElement.height;
    const barWidth = (WIDTH / bufferLength) * 2.5;
    let barHeight;
    let x = 0;

    // Colors used for plotting
    const MATTE_BLACK = "#1A202C";
    const WHITE = "#FFFFFF";

    // The function which will get called on each repaint
    function draw() {
      requestAnimationFrame(draw);
      if (canvasCtx !== null) {
        x = 0;
        analyser.getByteFrequencyData(dataArray);
        canvasCtx.fillStyle = WHITE;
        canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
        for (let i = 0; i < bufferLength; i++) {
          barHeight = dataArray[i];
          canvasCtx.fillStyle = MATTE_BLACK;
          canvasCtx.fillRect(x, 0, barWidth, barHeight);
          x += barWidth + 3;
        }
      }
    }
    draw();
  }
}

initAudioFileProcessing();

