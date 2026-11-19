// Cars: low-poly box-built models in several body styles, plus the traffic
// system — cars that cruise the avenues, slow for the car ahead, and turn at
// intersections. Police cars are built here too (police.js drives them).
import * as THREE from 'three';
import { CFG, PALETTE, roadCenters } from './config.js';
import { makeRng, pick, range, clamp, angleLerp } from './random.js';

export const CAR_MODELS = ['sedan', 'coupe', 'taxi', 'van', 'pickup', 'sport'];

export function makeCarMesh(model, color, police = false) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: police ? 0xf2f2f2 : color });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x1a1a22 });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x9fd4e8 });
  const dims = { sedan: [4.4, 1.1, 1.9], coupe: [4.1, 0.95, 1.85], taxi: [4.4, 1.1, 1.9], van: [4.8, 1.9, 2.0], pickup: [4.9, 1.2, 2.0], sport: [4.3, 0.85, 1.95] }[model] || [4.4, 1.1, 1.9];
  const [L, H, W] = dims;
  const body = new THREE.Mesh(new THREE.BoxGeometry(L, H, W), bodyMat);
  body.position.y = 0.75;
  g.add(body);
  const cabinH = model === 'van' ? 0.7 : 0.62;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(L * 0.52, cabinH, W * 0.86), glassMat);
  cabin.position.set(-L * 0.05, 0.75 + H / 2 + cabinH / 2 - 0.08, 0);
  g.add(cabin);
  if (model === 'pickup') {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(L * 0.34, 0.5, W * 0.9), darkMat);
    bed.position.set(-L * 0.28, 0.75 + H / 2 + 0.1, 0);
    g.add(bed);
  }
  if (model === 'taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.28, 0.5), new THREE.MeshBasicMaterial({ color: 0xffe62e }));
    sign.position.set(0, 0.75 + H / 2 + cabinH + 0.05, 0);
    g.add(sign);
  }
  // Wheels.
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 12);
  wheelGeo.rotateX(Math.PI / 2);
  for (const [wx, wz] of [[L * 0.32, W / 2], [L * 0.32, -W / 2], [-L * 0.32, W / 2], [-L * 0.32, -W / 2]]) {
    const w = new THREE.Mesh(wheelGeo, darkMat);
    w.position.set(wx, 0.36, wz);
    g.add(w);
  }
  // Headlights + taillights.
  const hl = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
  const tl = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  for (const wz of [-W / 2 + 0.3, W / 2 - 0.3]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.42), hl);
    h.position.set(L / 2 + 0.02, 0.8, wz); g.add(h);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.42), tl);
    t.position.set(-L / 2 - 0.02, 0.8, wz); g.add(t);
  }
  if (police) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(L * 0.98, 0.3, W + 0.02), new THREE.MeshLambertMaterial({ color: 0x1a2a6e }));
    stripe.position.y = 0.75; g.add(stripe);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 1.1), new THREE.MeshBasicMaterial({ color: 0xff2a2a }));
    bar.position.set(0, 0.75 + H / 2 + cabinH + 0.02, 0);
    g.add(bar);
    g.userData.lightBar = bar;
  }
  g.userData.length = L;
  g.userData.width = W;
  return g;
}

export class Car {
  constructor(scene, model, color, x, z, heading, opts = {}) {
    this.scene = scene;
    this.model = model;
    this.color = color;
    this.police = !!opts.police;
    this.mesh = makeCarMesh(model, color, this.police);
    this.mesh.position.set(x, 0, z);
    this.mesh.rotation.y = heading;
    scene.add(this.mesh);
    this.pos = this.mesh.position;
    this.heading = heading;
    this.speed = 0;
    this.steer = 0;
    this.maxSpeed = opts.maxSpeed ?? (model === 'sport' ? CFG.carMaxSpeed : CFG.carMaxSpeed * range(Math.random, 0.55, 0.8));
    this.health = 100;
    this.parked = !!opts.parked;
    this.traffic = !!opts.traffic;
    this.driver = opts.driver ?? null; // 'player' | 'traffic' | 'police' | null
    this.dead = false;
  }
  get x() { return this.pos.x; }
  get z() { return this.pos.z; }
  dispose() {
    this.scene.remove(this.mesh);
    this.dead = true;
  }
}

export class Traffic {
  constructor(scene, city, seed) {
    this.scene = scene;
    this.city = city;
    this.rng = makeRng(seed ^ 0x9e37);
    this.cars = [];
    this.roads = roadCenters();
    for (let i = 0; i < CFG.trafficCars; i++) this.spawnCar(true);
    // Parked cars along curbs for the player to steal.
    this.parked = [];
    for (let i = 0; i < 10; i++) {
      const rc = pick(this.rng, this.roads);
      const t = range(this.rng, -180, 180);
      const horiz = this.rng() < 0.5;
      const x = horiz ? t : rc + 5.2;
      const z = horiz ? rc + 5.2 : t;
      if (this.city.insideBuilding(x, z)) continue;
      const c = new Car(scene, pick(this.rng, CAR_MODELS), pick(this.rng, PALETTE.car), x, z, horiz ? 0 : Math.PI / 2, { parked: true });
      this.parked.push(c);
    }
  }

  spawnCar(anywhere = false) {
    const rc = pick(this.rng, this.roads);
    const horiz = this.rng() < 0.5;
    const dir = this.rng() < 0.5 ? 1 : -1;
    const lane = 3.1 * dir;
    const t = anywhere ? range(this.rng, -200, 200) : (dir > 0 ? -220 : 220);
    const x = horiz ? t : rc + lane;
    const z = horiz ? rc + lane : t;
    const heading = horiz ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    const car = new Car(this.scene, pick(this.rng, CAR_MODELS), pick(this.rng, PALETTE.car), x, z, heading, {
      traffic: true, driver: 'traffic', maxSpeed: range(this.rng, 9, 15),
    });
    car.axis = horiz ? 'x' : 'z';
    car.dir = dir;
    car.road = rc;
    this.cars.push(car);
    return car;
  }

  update(dt, playerCar) {
    const half = this.city.half + 30;
    for (const car of this.cars) {
      if (car.dead) continue;
      // Slow for the car ahead on the same lane.
      let target = car.maxSpeed;
      for (const o of this.cars) {
        if (o === car || o.dead || o.axis !== car.axis || o.road !== car.road || o.dir !== car.dir) continue;
        const ahead = car.axis === 'x' ? (o.x - car.x) * car.dir : (o.z - car.z) * car.dir;
        if (ahead > 0 && ahead < 11) { target = Math.min(target, Math.max(0, (ahead - 7) * 1.2)); }
      }
      if (playerCar && !playerCar.dead) {
        const ahead = car.axis === 'x' ? (playerCar.x - car.x) * car.dir : (playerCar.z - car.z) * car.dir;
        const lateral = car.axis === 'x' ? Math.abs(playerCar.z - car.z) : Math.abs(playerCar.x - car.x);
        if (ahead > 0 && ahead < 12 && lateral < 3) target = 0;
      }
      // Random slow-downs keep traffic feeling alive.
      car.speed += clamp(target - car.speed, -14 * dt, 8 * dt);
      const step = car.speed * dt;
      if (car.axis === 'x') car.pos.x += step * car.dir;
      else car.pos.z += step * car.dir;
      // At the city edge, wrap to the other side on a new road.
      const along = car.axis === 'x' ? car.pos.x : car.pos.z;
      if (Math.abs(along) > half) {
        car.dispose();
        const i = this.cars.indexOf(car);
        if (i >= 0) this.cars.splice(i, 1);
        this.spawnCar(false);
        continue;
      }
      // At an intersection, sometimes turn onto the crossing road.
      const nearRoad = this.roads.find((r) => Math.abs((car.axis === 'x' ? car.pos.z : car.pos.x) - r) < 1.2);
      const cross = this.roads.find((r) => Math.abs((car.axis === 'x' ? car.pos.x : car.pos.z) - r) < 1.5);
      if (nearRoad !== undefined && cross !== undefined && this.rng() < dt * 0.12) {
        const newDir = this.rng() < 0.5 ? 1 : -1;
        car.axis = car.axis === 'x' ? 'z' : 'x';
        car.road = cross;
        car.dir = newDir;
        const lane = 3.1 * newDir;
        if (car.axis === 'x') { car.pos.z = cross + lane; car.heading = newDir > 0 ? 0 : Math.PI; }
        else { car.pos.x = cross + lane; car.heading = newDir > 0 ? Math.PI / 2 : -Math.PI / 2; }
      }
      car.mesh.rotation.y = angleLerp(car.mesh.rotation.y, car.heading, Math.min(1, dt * 6));
      // Wheel spin is implied by motion; bob the body slightly.
      car.mesh.position.y = Math.sin(car.speed * 2.2) * 0.012;
    }
  }

  nearestParked(x, z, maxD = 6) {
    let best = null, bd = maxD * maxD;
    for (const c of this.parked) {
      if (c.dead || c.driver) continue;
      const dx = c.x - x, dz = c.z - z, d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }
  nearestTraffic(x, z, maxD = 7) {
    let best = null, bd = maxD * maxD;
    for (const c of this.cars) {
      if (c.dead) continue;
      const dx = c.x - x, dz = c.z - z, d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }
}
