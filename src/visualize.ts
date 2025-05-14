let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

/** Registers the canvas that will be used for graphing */
export function initCanvas(target: HTMLCanvasElement) {
  canvas = target;
  const rect = canvas.getBoundingClientRect();
  canvas.width  = rect.width;
  canvas.height = rect.height;
  ctx = canvas.getContext("2d");
}

/** Clears the canvas using the same background color as the app */
export function clearCanvas() {
  if (!canvas || !ctx) return;
  ctx.fillStyle = "rgb(17, 17, 17)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/** Draws an audio waveform from time‑domain data */
export function drawWaveform(
  data: Uint8Array,
  bufferLength: number
) {
  if (!canvas || !ctx) return;

  clearCanvas();

  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgb(50, 200, 50)";
  ctx.beginPath();

  const sliceWidth = canvas.width / bufferLength;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    const v = data[i] / 128;          // 0-255  →  0-2
    const y = v * canvas.height / 2;  // center vertically

    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    x += sliceWidth;
  }
  ctx.lineTo(canvas.width, canvas.height / 2);
  ctx.stroke();
}
