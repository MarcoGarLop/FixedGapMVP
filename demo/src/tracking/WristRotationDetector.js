// Wrist pronation/supination detector.
// Strategy: 2D screen-space atan2 between Index MCP (landmark 5) and Pinky MCP (landmark 17).
// Natural pose: hand in profile, thumb up, pinky down. 
// In screen coords (Y goes down), Pinky is below Index, so dy > 0, dx ~ 0.
// This gives an atan2 angle of ~ PI/2.
// We map PI/2 to 0 rotation (upright).
// Tilting left moves Index left and Pinky right -> dx > 0 -> angle approaches 0.
// We map this to positive rotation (CCW in Three.js, pitcher tilts left).

const INDEX_MCP = 5;
const PINKY_MCP = 17;

const DEADZONE = 0.15; // radians around upright where we lock to 0 (~8.5 degrees)

export class WristRotationDetector {
  constructor() {
    this.rawAngle = 0;
    this.pitcherRotation = 0; // final rotation for the pitcher (radians)
    this.confidence = 0;
    this._active = false;
  }

  update(landmarks) {
    if (!landmarks || !landmarks[0]) {
      this._active = false;
      this.confidence = 0;
      return;
    }

    const lms = landmarks[0];
    this._active = true;

    const indexMcp = lms[INDEX_MCP];
    const pinkyMcp = lms[PINKY_MCP];

    // Use X and Z (depth) for more robust rotation estimation.
    // Z from MediaPipe is depth relative to wrist — when the hand rotates
    // (pronation/supination), the Z difference between index and pinky MCP
    // changes significantly, giving a better signal than pure 2D.
    const dx = pinkyMcp.x - indexMcp.x;
    const dy = pinkyMcp.y - indexMcp.y;
    const dz = (pinkyMcp.z || 0) - (indexMcp.z || 0);

    // Confidence based on 2D distance between the two knuckles
    const dist2D = Math.sqrt(dx * dx + dy * dy);
    this.confidence = Math.min(1, dist2D / 0.08);

    if (this.confidence < 0.3) return;

    // Combine 2D angle with depth for a more accurate rotation estimate.
    // When Z data is available and meaningful, blend it with the 2D angle.
    const angleRaw2D = Math.atan2(dy, dx);
    const hasDepth = Math.abs(dz) > 0.001;
    const angleFromDepth = hasDepth ? Math.atan2(dz, dist2D) : 0;

    // Blend: primarily 2D angle, augmented by depth signal
    const angleRaw = angleRaw2D + angleFromDepth * 0.3;

    let rot = angleRaw - Math.PI / 2;

    while (rot > Math.PI) rot -= 2 * Math.PI;
    while (rot < -Math.PI) rot += 2 * Math.PI;

    this.rawAngle = rot;

    if (Math.abs(rot) < DEADZONE) {
      this.pitcherRotation = 0;
    } else {
      const sign = rot > 0 ? 1 : -1;
      this.pitcherRotation = sign * (Math.abs(rot) - DEADZONE);
    }
  }

  isActive() {
    return this._active && this.confidence > 0.3;
  }

  reset() {
    this.rawAngle = 0;
    this.pitcherRotation = 0;
    this.confidence = 0;
    this._active = false;
  }
}
