// Dario Cruz on foot: third-person controller with a mouse-orbit camera,
// sprint, jump, and a low-poly character whose limbs swing as he walks.
import * as THREE from 'three';
import { CFG } from './config.js';
import { clamp, angleLerp } from './random.js';

function makePlayerMesh() {
  const g = new THREE.Group();
  const jacket = new THREE.MeshLambertMaterial({ color: 0xff7a3d }); // sunset-orange jacket
  const skin = new THREE.MeshLambertMaterial({ color: 0xc98a5a });
  const jeans = new THREE.MeshLambertMaterial({ color: 0x2b3a5a });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.8, 0.36), jacket);
  torso.position.y = 1.15;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.38, 0.36), skin);
  head.position.y = 1.78;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.4), new THREE.MeshLambertMaterial({ color: 0x1a1a22 }));
  cap.position.y = 1.98;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.78, 0.24), jeans);
  legL.position.set(-0.16, 0.39, 0);
  const legR = legL.clone();
  legR.position.x = 0.16;
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.68, 0.2), jacket);
  armL.position.set(-0.42, 1.15, 0);
  const armR = armL.clone();
  armR.position.x = 0.42;
  g.add(torso, head, cap, legL, legR, armL, armR);
  g.userData = { legL, legR, armL, armR, torso };
  return g;
}

export class Player {
  constructor(scene, city) {
    this.scene = scene;
    this.city = city;
    this.mesh = makePlayerMesh();
    scene.add(this.mesh);
    this.pos = this.mesh.position;
    this.pos.set(8, 0, 40);
    this.heading = Math.PI; // facing the city
    this.camYaw = Math.PI;
    this.camPitch = 0.32;
    this.vy = 0;
    this.grounded = true;
    this.health = CFG.playerHealth;
    this.armor = 0;
    this.walkPhase = 0;
    this.speed = 0;
    this.camDistance = 7;
  }

  get x() { return this.pos.x; }
  get z() { return this.pos.z; }

  // Armor absorbs 60% of a hit before health takes the rest.
  damage(amount) {
    let left = amount;
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, left * 0.6);
      this.armor -= absorbed;
      left -= absorbed;
    }
    this.health = Math.max(0, this.health - left);
    return this.health <= 0;
  }

  heal(amount) {
    this.health = Math.min(CFG.playerHealth, this.health + amount);
  }

  update(dt, input, frozen) {
    const look = input.consumeLook();
    this.camYaw -= look.dx * 0.0032;
    this.camPitch = clamp(this.camPitch + look.dy * 0.0024, -0.15, 1.1);
    let mx = 0;
    let mz = 0;
    if (!frozen) {
      mx = input.axis('KeyA', 'KeyD');
      mz = input.axis('KeyW', 'KeyS');
    }
    const sprint = input.down('ShiftLeft') || input.down('ShiftRight');
    const target = (mx || mz) ? (sprint ? CFG.runSpeed : CFG.walkSpeed) : 0;
    this.speed += clamp(target - this.speed, -30 * dt, 18 * dt);
    if (this.speed > 0.1) {
      // Movement is camera-relative; the character turns toward travel.
      const sin = Math.sin(this.camYaw);
      const cos = Math.cos(this.camYaw);
      const fx = -sin;
      const fz = -cos; // camera forward on the ground
      const rx = -cos;
      const rz = sin;
      let dx = fx * -mz + rx * mx;
      let dz = fz * -mz + rz * mx;
      const len = Math.hypot(dx, dz) || 1;
      dx /= len;
      dz /= len;
      const step = this.speed * dt;
      let nx = this.pos.x + dx * step;
      let nz = this.pos.z + dz * step;
      const b = this.city.collideCircle(nx, nz, 0.7);
      if (b) {
        // Slide along the building face instead of stopping dead.
        const tryX = this.city.collideCircle(nx, this.pos.z, 0.7) === null;
        const tryZ = this.city.collideCircle(this.pos.x, nz, 0.7) === null;
        if (tryX) nz = this.pos.z;
        else if (tryZ) nx = this.pos.x;
        else { nx = this.pos.x; nz = this.pos.z; }
      }
      nx = clamp(nx, -this.city.half - 40, this.city.half + 40);
      nz = clamp(nz, -this.city.half - 40, this.city.half + 60);
      this.pos.x = nx;
      this.pos.z = nz;
      this.heading = angleLerp(this.heading, Math.atan2(dx, dz), Math.min(1, dt * 12));
    }
    // Jump + gravity.
    if (!frozen && input.hit('Space') && this.grounded) {
      this.vy = CFG.jumpSpeed;
      this.grounded = false;
    }
    this.vy -= 22 * dt;
    this.pos.y += this.vy * dt;
    if (this.pos.y <= 0) { this.pos.y = 0; this.vy = 0; this.grounded = true; }
    // Walk-cycle animation.
    this.walkPhase += dt * this.speed * 1.9;
    const s = Math.sin(this.walkPhase) * clamp(this.speed / CFG.walkSpeed, 0, 1.4) * 0.55;
    const u = this.mesh.userData;
    u.legL.rotation.x = s;
    u.legR.rotation.x = -s;
    u.armL.rotation.x = -s * 0.8;
    u.armR.rotation.x = s * 0.8;
    u.torso.rotation.x = clamp(this.speed / CFG.runSpeed, 0, 1) * 0.12;
    this.mesh.rotation.y = this.heading;
  }

  // Third-person camera behind the player.
  cameraTarget(cam, dt) {
    const dist = this.camDistance;
    const cx = this.pos.x + Math.sin(this.camYaw) * Math.cos(this.camPitch) * dist;
    const cz = this.pos.z + Math.cos(this.camYaw) * Math.cos(this.camPitch) * dist;
    const cy = this.pos.y + 2 + Math.sin(this.camPitch) * dist;
    const k = Math.min(1, dt * 10);
    cam.position.x += (cx - cam.position.x) * k;
    cam.position.y += (cy - cam.position.y) * k;
    cam.position.z += (cz - cam.position.z) * k;
    cam.lookAt(this.pos.x, this.pos.y + 1.6, this.pos.z);
  }
}
