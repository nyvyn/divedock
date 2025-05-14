/**
 * Visualizer
 * Encapsulates all logic for drawing an audio waveform on a <canvas>.
 */
export class AudioCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(target: HTMLCanvasElement) {
    this.canvas = target;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width  = rect.width;
    this.canvas.height = rect.height;

    const context = this.canvas.getContext("2d");
    if (!context) throw new Error("2D context unavailable");
    this.ctx = context;
  }

  /** Clears the canvas using the app background color */
  clear(): void {
    this.ctx.fillStyle = "rgb(17, 17, 17)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /** Draw an audio waveform from time-domain data */
  drawWaveform(data: Uint8Array, bufferLength: number): void {
    this.clear();

    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = "rgb(50, 200, 50)";
    this.ctx.beginPath();

    const sliceWidth = this.canvas.width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = data[i] / 128;          // 0-255 → 0-2
      const y = v * this.canvas.height / 2; // center vertically

      i === 0 ? this.ctx.moveTo(x, y) : this.ctx.lineTo(x, y);
      x += sliceWidth;
    }
    this.ctx.lineTo(this.canvas.width, this.canvas.height / 2);
    this.ctx.stroke();
  }
}
