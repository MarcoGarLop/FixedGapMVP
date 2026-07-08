import * as THREE from 'three';

export class WindParticles {
  constructor(scene, startPos, directionX) {
    this.count = 40;
    this.particles = [];
    
    const geo = new THREE.SphereGeometry(0.02, 8, 8);
    const mat = new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.6,
    });

    this.mesh = new THREE.InstancedMesh(geo, mat, this.count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(this.mesh);

    this.startPos = startPos;
    this.directionX = directionX; // +1 or -1

    for (let i = 0; i < this.count; i++) {
      this.particles.push({
        active: false,
        x: 0, y: 0, z: 0,
        vx: 0, vy: 0, vz: 0,
        life: 0,
      });
    }

    this.emitTimer = 0;
    this.dummy = new THREE.Object3D();
  }

  update(dt, isActive) {
    if (isActive) {
      this.emitTimer += dt;
      if (this.emitTimer > 0.05) {
        this.emitTimer = 0;
        this.emit();
      }
    }

    let idx = 0;
    for (const p of this.particles) {
      if (!p.active) {
        // Move invisible particles to origin out of view
        this.dummy.position.set(0, -10, 0);
        this.dummy.scale.setScalar(0);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(idx, this.dummy.matrix);
        idx++;
        continue;
      }

      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      const scale = p.life / 0.5; // Shrink as it dies

      this.dummy.position.set(p.x, p.y, p.z);
      this.dummy.scale.setScalar(scale);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(idx, this.dummy.matrix);
      idx++;
    }
    
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  emit() {
    const p = this.particles.find(p => !p.active);
    if (!p) return;

    p.active = true;
    p.life = 0.5 + Math.random() * 0.2;
    p.x = this.startPos.x + (Math.random() - 0.5) * 0.2;
    p.y = this.startPos.y + (Math.random() - 0.5) * 0.2;
    p.z = this.startPos.z + (Math.random() - 0.5) * 0.2;
    
    p.vx = this.directionX * (2.0 + Math.random() * 1.0);
    p.vy = (Math.random() - 0.5) * 0.5;
    p.vz = (Math.random() - 0.5) * 0.5;
  }
}
