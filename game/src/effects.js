// Juice: particle bursts for blood, crash sparks and explosions, plus a
// floating damage marker. All particles are pooled boxes with a short life.
import * as THREE from 'three';
import { makeRng, range } from './random.js';

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.rng = makeRng(0xef);
    this.particles = [];
    this.pool = [];
    const geo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
    for (let i = 0; i < 120; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
      m.visible = false;
      scene.add(m);
      this.pool.push(m);
    }
  }

  burst(x, y, z, color, n, speed, life, up = 2) {
    for (let i = 0; i < n; i++) {
      const m = this.pool.pop();
      if (!m) return;
      m.visible = true;
      m.material.color.setHex(color);
      m.position.set(x, y, z);
      const a = range(this.rng, 0, Math.PI * 2);
      const s = range(this.rng, speed * 0.4, speed);
      this.particles.push({
        mesh: m, vx: Math.sin(a) * s, vy: range(this.rng, 0.5, up), vz: Math.cos(a) * s,
        life: range(this.rng, life * 0.6, life), maxLife: life,
      });
    }
  }
  blood(x, z) { this.burst(x, 1.2, z, 0xc01818, 10, 2.5, 0.7); }
  crashSparks(x, z) { this.burst(x, 1.0, z, 0xffd94d, 12, 4, 0.5, 3); }
  explosion(x, z) {
    this.burst(x, 1.2, z, 0xff7a2b, 26, 7, 0.9, 6);
    this.burst(x, 1.2, z, 0x3a3a3a, 14, 3, 1.4, 5);
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.mesh.visible = false;
        this.pool.push(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }
      p.vy -= 9 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y = Math.max(0.1, p.mesh.position.y + p.vy * dt);
      p.mesh.position.z += p.vz * dt;
      p.mesh.rotation.x += dt * 6;
      p.mesh.rotation.y += dt * 5;
      const s = 0.6 + 0.4 * (p.life / p.maxLife);
      p.mesh.scale.setScalar(s);
    }
  }
}
