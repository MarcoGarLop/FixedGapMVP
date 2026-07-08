const THUMB_TIP = 4;
const INDEX_TIP = 8;
const MIDDLE_TIP = 12;

export class PinchDetector {
  constructor() {
    this._grabThreshold = 0.055;
    this._releaseThreshold = 0.085;
    this._grabFramesRequired = 3;
    this._releaseFramesRequired = 4;
    this._graceFrames = 10;

    this.isPinching = false;
    this.active = false;
    this.pinchProgress = 0;
    this.pinchType = 'none'; // 'index', 'middle', 'none'

    this._grabCounter = 0;
    this._releaseCounter = 0;
    this._lostFrames = 0;
  }

  update(landmarks) {
    const lms = landmarks[0];

    if (!lms) {
      this._lostFrames++;
      if (this._lostFrames > this._graceFrames) {
        this.isPinching = false;
        this._grabCounter = 0;
        this._releaseCounter = 0;
        this.active = false;
        this.pinchType = 'none';
      }
      return;
    }

    this._lostFrames = 0;
    this.active = true;

    const thumb = lms[THUMB_TIP];
    const index = lms[INDEX_TIP];
    const middle = lms[MIDDLE_TIP];

    // 3D Euclidean distance (uses depth for more accurate detection)
    const distIndex = this._dist3D(thumb, index);
    const distMiddle = this._dist3D(thumb, middle);

    // Pick the closest finger for pinch
    const distance = Math.min(distIndex, distMiddle);
    const closestFinger = distIndex <= distMiddle ? 'index' : 'middle';

    this.pinchProgress = Math.max(0, Math.min(1,
      1 - (distance - this._grabThreshold) / (this._releaseThreshold - this._grabThreshold)
    ));

    if (!this.isPinching) {
      if (distance < this._grabThreshold) {
        this._grabCounter++;
        this._releaseCounter = 0;
        if (this._grabCounter >= this._grabFramesRequired) {
          this.isPinching = true;
          this.pinchType = closestFinger;
          this._grabCounter = 0;
        }
      } else {
        this._grabCounter = Math.max(0, this._grabCounter - 1);
      }
    } else {
      if (distance > this._releaseThreshold) {
        this._releaseCounter++;
        this._grabCounter = 0;
        if (this._releaseCounter >= this._releaseFramesRequired) {
          this.isPinching = false;
          this.pinchType = 'none';
          this._releaseCounter = 0;
        }
      } else {
        this._releaseCounter = Math.max(0, this._releaseCounter - 1);
      }
    }
  }

  _dist3D(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = (a.z || 0) - (b.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}
