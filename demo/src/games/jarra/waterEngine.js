const POOL_SIZE = 300;
const GRAVITY = 4.0;
const TAP_EMIT_INTERVAL = 0.04;
const POUR_EMIT_INTERVAL = 0.025;
const PARTICLE_VOLUME = 0.012;
const POUR_PARTICLE_VOLUME = 0.006;
const PITCHER_RADIUS_TOP = 0.19;
const PITCHER_RADIUS_BOT = 0.27;
const PITCHER_HEIGHT_MIN = -0.3;
const PITCHER_HEIGHT_MAX = 0.35;
const GLASS_X_MIN = -0.95;
const GLASS_X_MAX = -0.55;
const GLASS_Y_MIN = -1.1;
const GLASS_Y_MAX = -0.6;
const FLOOR_Y = -1.5;

export class WaterEngine {
  constructor() {
    this._particles = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      this._particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0 });
    }

    this._state = {
      phase: 'ready',       // ready | waiting | filling | pouring | sliding | success
      round: 1,
      totalRounds: 3,
      pitcherVolume: 0,     // 0-1
      glassVolume: 0,       // 0-1
      spillCount: 0,
      waitTimer: 0,
      slideX: 0,
    };

    this._tapTimer = 0;
    this._pourTimer = 0;
    this._pitcherRotation = 0;
    this._pitcherPos = { x: 0, y: 0.5 };
  }

  startLevel() {
    this._state.phase = 'waiting';
    this._state.waitTimer = 2.0;
  }

  getState() {
    return { ...this._state };
  }

  getParticles() {
    return this._particles;
  }

  update(pitcherRotationZ, dt) {
    this._pitcherRotation = pitcherRotationZ;

    switch (this._state.phase) {
      case 'waiting':
        this._updateWaiting(dt);
        break;
      case 'filling':
        this._updateFilling(dt);
        break;
      case 'pouring':
        this._updatePouring(dt);
        break;
      case 'sliding':
        this._updateSliding(dt);
        break;
    }

    this._updateParticles(dt);
  }

  _updateWaiting(dt) {
    this._state.waitTimer -= dt;
    if (this._state.waitTimer <= 0) {
      this._state.phase = 'filling';
    }
  }

  _updateFilling(dt) {
    this._tapTimer += dt;
    while (this._tapTimer >= TAP_EMIT_INTERVAL) {
      this._tapTimer -= TAP_EMIT_INTERVAL;
      this._emitFromTap();
    }

    if (this._state.pitcherVolume >= 0.95) {
      this._state.phase = 'pouring';
    }
  }

  _updatePouring(dt) {
    const absRot = Math.abs(this._pitcherRotation);

    if (absRot > 0.15 && this._state.pitcherVolume > 0) {
      this._pourTimer += dt;
      while (this._pourTimer >= POUR_EMIT_INTERVAL) {
        this._pourTimer -= POUR_EMIT_INTERVAL;
        this._emitFromPitcher();
      }
    } else {
      this._pourTimer = 0;
    }

    // Pitcher empty and all particles settled
    if (this._state.pitcherVolume <= 0.02) {
      const activeCount = this._particles.filter(p => p.active).length;
      if (activeCount === 0) {
        this._state.phase = 'sliding';
      }
    }
  }

  _updateSliding(dt) {
    this._state.slideX -= 3.0 * dt;
    if (this._state.slideX < -4.0) {
      this._advanceRound();
    }
  }

  _advanceRound() {
    if (this._state.round >= this._state.totalRounds) {
      this._state.phase = 'success';
      return;
    }

    this._state.round++;
    this._state.pitcherVolume = 0;
    this._state.glassVolume = 0;
    this._state.slideX = 0;
    this._state.phase = 'waiting';
    this._state.waitTimer = 2.0;
  }

  _emitFromTap() {
    const p = this._getInactiveParticle();
    if (!p) return;

    p.x = -0.15 + (Math.random() - 0.5) * 0.03;
    p.y = 1.43;
    p.vx = (Math.random() - 0.5) * 0.08;
    p.vy = -1.0;
    p.active = true;
  }

  _emitFromPitcher() {
    if (this._state.pitcherVolume <= 0) return;

    const p = this._getInactiveParticle();
    if (!p) return;

    const rot = this._pitcherRotation;
    const force = 0.2 + 0.8 * (Math.abs(rot) / Math.PI);

    // Spout position in world coords (left spout at local -0.43, 0.365)
    const spoutLocalX = -0.43;
    const spoutLocalY = 0.365;
    const cosR = Math.cos(rot);
    const sinR = Math.sin(rot);
    const worldX = this._pitcherPos.x + (spoutLocalX * cosR - spoutLocalY * sinR);
    const worldY = this._pitcherPos.y + (spoutLocalX * sinR + spoutLocalY * cosR);

    p.x = worldX;
    p.y = worldY;
    p.vx = -force * 0.6 + (Math.random() - 0.5) * 0.05;
    p.vy = -0.1 - force * 0.3;
    p.active = true;

    this._state.pitcherVolume = Math.max(0, this._state.pitcherVolume - POUR_PARTICLE_VOLUME);
  }

  _updateParticles(dt) {
    for (const p of this._particles) {
      if (!p.active) continue;

      p.vy -= GRAVITY * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Collision: pitcher (absorb any drops entering the top)
      if (this._checkPitcherCollision(p)) {
        p.active = false;
        if (this._state.pitcherVolume < 1.0) {
          this._state.pitcherVolume = Math.min(1.0, this._state.pitcherVolume + PARTICLE_VOLUME);
        }
        continue;
      }

      // Collision: glass
      if (p.x >= GLASS_X_MIN && p.x <= GLASS_X_MAX &&
          p.y >= GLASS_Y_MIN && p.y <= GLASS_Y_MAX && p.vy <= 0) {
        
        if (this._state.glassVolume < 1.0) {
          p.active = false; // Absorb particle
          this._state.glassVolume += POUR_PARTICLE_VOLUME;
          if (this._state.glassVolume > 1.0) this._state.glassVolume = 1.0;
          continue;
        }
        // If glass is full, particle is NOT absorbed. It falls to the floor (spill).
      }

      // Floor (spill)
      if (p.y < FLOOR_Y) {
        p.active = false;
        this._state.spillCount++;
      }
    }
  }

  _checkPitcherCollision(p) {
    const rot = this._pitcherRotation;
    const cosR = Math.cos(-rot);
    const sinR = Math.sin(-rot);
    const relX = p.x - this._pitcherPos.x;
    const relY = p.y - this._pitcherPos.y;
    const localX = relX * cosR - relY * sinR;
    const localY = relX * sinR + relY * cosR;

    if (localY < PITCHER_HEIGHT_MIN || localY > PITCHER_HEIGHT_MAX) return false;

    const t = (localY - PITCHER_HEIGHT_MIN) / (PITCHER_HEIGHT_MAX - PITCHER_HEIGHT_MIN);
    const radius = PITCHER_RADIUS_BOT + (PITCHER_RADIUS_TOP - PITCHER_RADIUS_BOT) * t;

    return Math.abs(localX) < radius;
  }

  _getInactiveParticle() {
    for (const p of this._particles) {
      if (!p.active) return p;
    }
    return null;
  }
}
