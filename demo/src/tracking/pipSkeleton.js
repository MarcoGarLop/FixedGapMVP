const CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
];

const HAND_COLORS = ['#6bab7d', '#ab6b7d'];

export class PipSkeleton {
  constructor() {
    this._canvas = document.getElementById('pip-skeleton');
    this._ctx = this._canvas.getContext('2d');
  }

  draw(results) {
    const canvas = this._canvas;
    const video = document.getElementById('pip-video');
    canvas.width = video.videoWidth || 960;
    canvas.height = video.videoHeight || 720;

    const ctx = this._ctx;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const allLandmarks = results.landmarks;
    if (!allLandmarks || allLandmarks.length === 0) return;

    const w = canvas.width;
    const h = canvas.height;

    for (let handIdx = 0; handIdx < allLandmarks.length; handIdx++) {
      const lms = allLandmarks[handIdx];
      const color = HAND_COLORS[handIdx % HAND_COLORS.length];

      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      for (const [si, ei] of CONNECTIONS) {
        ctx.beginPath();
        ctx.moveTo((1 - lms[si].x) * w, lms[si].y * h);
        ctx.lineTo((1 - lms[ei].x) * w, lms[ei].y * h);
        ctx.stroke();
      }

      for (const lm of lms) {
        ctx.beginPath();
        ctx.arc((1 - lm.x) * w, lm.y * h, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#f5c9a8';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }
}
