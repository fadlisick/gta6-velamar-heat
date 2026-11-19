// The wanted system: 0–5 stars, Velamar Bay Police patrol cars that chase
// and ram, foot cops, roadblocks at 4 stars, and a police helicopter with a
// spotlight at 3+. Heat decays when the player is unseen and quiet; getting
// caught on foot means BUSTED, dying means WASTED.
import * as THREE from 'three';
import { CFG } from './config.js';
import { Car } from './vehicles.js';
import { makeRng, range, clamp, angleLerp } from './random.js';

export class Police {
  constructor(scene, city, traffic) {
    this.scene = scene;
    this.city = city;
    this.traffic = traffic;
    this.rng = makeRng(0x5050);
    this.heat = 0; // float stars
    this.cars = [];
    this.cops = [];
    this.heli = null;
    this.heliLight = null;
    this.lastSeen = 0;
    this.spawnTimer = 0;
    this.sirenPhase = 0;
  }

  get stars() { return Math.min(CFG.wantedMax, Math.floor(this.heat + 0.001)); }

  addHeat(amount) {
    this.heat = clamp(this.heat + amount, 0, CFG.wantedMax);
  }
  clearHeat() {
    this.heat = 0;
    this.despawnAll();
  }

  desiredCars() {
    const s = this.stars;
    return s === 0 ? 0 : s === 1 ? 1 : s === 2 ? 2 : s === 3 ? 3 : s === 4 ? 4 : 5;
  }

  spawnCar(px, pz) {
    const angle = range(this.rng, 0, Math.PI * 2);
    const d = range(this.rng, 60, 100);
    const x = clamp(px + Math.sin(angle) * d, -this.city.half, this.city.half);
    const z = clamp(pz + Math.cos(angle) * d, -this.city.half, this.city.half);
    const car = new Car(this.scene, 'sedan', 0xf2f2f2, x, z, angle, {
      police: true, driver: 'police',
      maxSpeed: CFG.policeCarSpeed + this.stars * CFG.policeCarSpeedPerStar,
    });
    this.cars.push(car);
    return car;
  }

  spawnCop(px, pz) {
    const g = new THREE.Group();
    const navy = new THREE.MeshLambertMaterial({ color: 0x1a2a6e });
    const skin = new THREE.MeshLambertMaterial({ color: 0xc98a5a });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.78, 0.34), navy);
    torso.position.y = 1.14;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), skin);
    head.position.y = 1.76;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.4), new THREE.MeshLambertMaterial({ color: 0x0e1a4a }));
    cap.position.y = 1.96;
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.74, 0.22), navy);
    legL.position.set(-0.15, 0.37, 0);
    const legR = legL.clone(); legR.position.x = 0.15;
    g.add(torso, head, cap, legL, legR);
    const angle = range(this.rng, 0, Math.PI * 2);
    g.position.set(px + Math.sin(angle) * 14, 0, pz + Math.cos(angle) * 14);
    this.scene.add(g);
    const cop = { mesh: g, x: g.position.x, z: g.position.z, speed: 5.4, phase: 0, dead: false };
    this.cops.push(cop);
    return cop;
  }

  spawnHeli() {
    if (this.heli) return;
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.4, 1.8), new THREE.MeshLambertMaterial({ color: 0x1a2a6e }));
    const tail = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.5, 0.5), new THREE.MeshLambertMaterial({ color: 0x1a2a6e }));
    tail.position.set(-3.4, 0.3, 0);
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.08, 0.5), new THREE.MeshLambertMaterial({ color: 0x222226 }));
    rotor.position.y = 1;
    const spot = new THREE.SpotLight(0xfff2b0, 900, 120, 0.32, 0.45, 1.2);
    spot.position.set(0, -0.8, 0);
    g.add(body, tail, rotor, spot);
    spot.target.position.set(0, -40, 0);
    g.add(spot.target);
    g.userData.rotor = rotor;
    this.scene.add(g);
    this.heli = g;
    this.heliLight = spot;
  }

  despawnHeli() {
    if (!this.heli) return;
    this.scene.remove(this.heli);
    this.heli = null;
    this.heliLight = null;
  }

  despawnAll() {
    for (const c of this.cars) c.dispose();
    this.cars = [];
    for (const c of this.cops) this.scene.remove(c.mesh);
    this.cops = [];
    this.despawnHeli();
  }

  update(dt, G, now) {
    const px = G.player.x, pz = G.player.z;
    // Heat decays when the player is quiet and no police car is close.
    const nearest = this.cars.reduce((m, c) => Math.min(m, (c.x - px) ** 2 + (c.z - pz) ** 2), Infinity);
    const seen = nearest < 45 * 45 || this.stars >= 3;
    if (seen) this.lastSeen = now;
    if (now - this.lastSeen > 6 && this.stars > 0) {
      this.heat = Math.max(0, this.heat - CFG.heatDecayPerSec * dt * 3);
      if (this.stars === 0) this.despawnAll();
    }
    // Spawn / trim patrol cars to the wanted level.
    this.spawnTimer -= dt;
    if (this.cars.length < this.desiredCars() && this.spawnTimer <= 0) {
      this.spawnCar(px, pz);
      this.spawnTimer = 1.2;
    }
    if (this.cars.length > this.desiredCars()) {
      const c = this.cars.pop();
      c.dispose();
    }
    // Foot cops join at 2+ stars when the player is on foot.
    if (this.stars >= 2 && !G.driving.active && this.cops.length < this.stars - 1 && this.spawnTimer <= 0) {
      this.spawnCop(px, pz);
      this.spawnTimer = 2;
    }
    // Pursuit: steer toward the player, ram when close.
    for (const car of this.cars) {
      const dx = px - car.x, dz = pz - car.z;
      const dist = Math.hypot(dx, dz) || 1;
      const wantHeading = Math.atan2(dx, dz);
      car.heading = angleLerp(car.heading, wantHeading, Math.min(1, dt * 1.8));
      const target = dist < 6 ? car.maxSpeed * 0.4 : car.maxSpeed;
      car.speed += clamp(target - car.speed, -20 * dt, 10 * dt);
      let nx = car.x + Math.sin(car.heading) * car.speed * dt;
      let nz = car.z + Math.cos(car.heading) * car.speed * dt;
      if (this.city.collideCircle(nx, nz, 2.1)) {
        // Blocked: reverse a little and swing around the building.
        car.heading += dt * 1.4;
        nx = car.x - Math.sin(car.heading) * 4 * dt;
        nz = car.z - Math.cos(car.heading) * 4 * dt;
        car.speed *= 0.85;
      }
      car.pos.x = nx; car.pos.z = nz;
      car.mesh.rotation.y = car.heading;
      // Flash the light bar.
      const bar = car.mesh.userData.lightBar;
      if (bar) bar.material.color.setHex(Math.sin(now * 9) > 0 ? 0xff2a2a : 0x2a6eff);
      // Ram the player's car.
      if (G.driving.active && dist < 5.2) {
        G.driving.car.speed *= 0.82;
        G.player.damage(0); // contact alone does not wound; the crash does
        if (Math.abs(G.driving.car.speed) > 12) G.effects?.crashSparks(car.x, car.z);
      }
    }
    // Foot cops chase on foot and arrest at close range.
    for (const cop of this.cops) {
      const dx = px - cop.x, dz = pz - cop.z;
      const dist = Math.hypot(dx, dz) || 1;
      cop.x += (dx / dist) * cop.speed * dt;
      cop.z += (dz / dist) * cop.speed * dt;
      cop.phase += dt * 8;
      cop.mesh.position.set(cop.x, 0, cop.z);
      cop.mesh.rotation.y = Math.atan2(dx, dz);
      cop.mesh.position.y = Math.abs(Math.sin(cop.phase)) * 0.06;
      if (dist < CFG.bustDistance && !G.driving.active && G.player.speed < 3) {
        G.busted = true;
      }
    }
    // Helicopter.
    if (this.stars >= CFG.heliAtStars) {
      this.spawnHeli();
      const h = this.heli;
      h.position.x += (px - h.position.x) * Math.min(1, dt * 0.8);
      h.position.z += (pz - h.position.z) * Math.min(1, dt * 0.8);
      h.position.y = 42 + Math.sin(now * 0.7) * 2;
      h.rotation.y += dt * 0.4;
      h.userData.rotor.rotation.y += dt * 22;
      this.heliLight.target.position.set(px - h.position.x, -42, pz - h.position.z);
      this.heliLight.target.updateMatrixWorld();
    } else {
      this.despawnHeli();
    }
    this.sirenPhase += dt;
  }
}
