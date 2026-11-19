// Arcade driving: one car under the player's control. Acceleration, braking,
// reverse, steering that tightens at low speed, handbrake drifts, building
// and traffic collisions, nitro boost (Shift, once the garage fits it) and a
// chase camera with three distances (C key).
import { CFG } from './config.js';
import { clamp } from './random.js';

export class Driving {
  constructor(city, traffic) {
    this.city = city;
    this.traffic = traffic;
    this.car = null; // the Car the player drives
    this.camMode = 0; // 0 near, 1 far, 2 hood
    this.skid = 0;
    this.hornUntil = 0;
    this.nitro = 100; // boost juice, 0..100
    this.nitroOn = false;
  }

  get active() { return this.car !== null && !this.car.dead; }

  enter(car) {
    this.car = car;
    car.driver = 'player';
    car.parked = false;
    car.speed = 0;
    this.nitro = 100;
    return car;
  }

  exit() {
    if (!this.car) return null;
    const car = this.car;
    car.driver = null;
    this.car = null;
    this.nitroOn = false;
    return car;
  }

  update(dt, input, now) {
    const car = this.car;
    if (!car) return 0;
    const fwd = input.axis('KeyS', 'KeyW');
    const steerIn = input.axis('KeyA', 'KeyD');
    const handbrake = input.down('Space');
    if (input.hit('KeyC')) this.camMode = (this.camMode + 1) % 3;
    if (input.hit('KeyH')) this.hornUntil = now + 0.6;
    // Nitro: Shift while driving, if the garage fitted it and juice remains.
    const wantNitro = (input.down('ShiftLeft') || input.down('ShiftRight')) && car.upgrades.nitro;
    this.nitroOn = wantNitro && this.nitro > 0 && car.speed > 2;
    if (this.nitroOn) this.nitro = Math.max(0, this.nitro - CFG.nitroDrain * dt);
    else this.nitro = Math.min(100, this.nitro + CFG.nitroRegen * dt);
    const topSpeed = car.maxSpeed * (this.nitroOn ? CFG.nitroBoost : 1);
    // Longitudinal.
    if (fwd > 0) car.speed += CFG.carAccel * dt * (1 - car.speed / topSpeed) * (this.nitroOn ? 1.8 : 1);
    else if (fwd < 0) {
      if (car.speed > 1) car.speed -= CFG.carBrake * dt;
      else car.speed = Math.max(-CFG.carReverse, car.speed - CFG.carAccel * 0.6 * dt);
    } else {
      car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 9 * dt);
    }
    // Steering: stronger when slow, weaker at speed; handbrake loosens grip.
    // Tires upgrades sharpen it a little more.
    const tireBonus = 1 + 0.12 * car.upgrades.tires;
    const steerTarget = steerIn * CFG.carTurn * tireBonus * clamp(1 - Math.abs(car.speed) / (topSpeed * 1.4), 0.35, 1);
    car.steer += clamp(steerTarget - car.steer, -6 * dt, 6 * dt);
    const grip = handbrake ? 1.6 : CFG.carGrip;
    void grip;
    car.heading += car.steer * clamp(car.speed / 8, -1, 1) * dt * (handbrake ? 1.5 : 1);
    this.skid = handbrake && Math.abs(car.speed) > 8 ? 1 : Math.max(0, this.skid - dt * 3);
    // Integrate with simple collision: buildings stop the car, traffic bumps it.
    const dx = Math.sin(car.heading);
    const dz = Math.cos(car.heading);
    let nx = car.pos.x + dx * car.speed * dt;
    let nz = car.pos.z + dz * car.speed * dt;
    const hitB = this.city.collideCircle(nx, nz, 2.1);
    if (hitB) {
      car.speed *= 0.35;
      car.damage(4);
      nx = car.pos.x;
      nz = car.pos.z;
    }
    for (const o of this.traffic.cars) {
      if (o === car || o.dead) continue;
      const ox = o.x - nx;
      const oz = o.z - nz;
      if (ox * ox + oz * oz < 13) {
        car.speed *= 0.55;
        o.speed = Math.max(0, o.speed - 3);
        nx = car.pos.x;
        nz = car.pos.z;
        break;
      }
    }
    nx = clamp(nx, -this.city.half - 30, this.city.half + 30);
    nz = clamp(nz, -this.city.half - 30, this.city.half + 55);
    car.pos.x = nx;
    car.pos.z = nz;
    car.mesh.rotation.y = car.heading;
    // Body roll and pitch sell the speed.
    car.mesh.rotation.z = -car.steer * 0.06 * clamp(car.speed / 20, -1, 1);
    car.mesh.rotation.x = clamp(-fwd * 0.02, -0.03, 0.03);
    return Math.abs(car.speed) * 3.6;
  }

  cameraTarget(cam, dt) {
    const car = this.car;
    if (!car) return;
    const back = this.camMode === 1 ? 15 : 11;
    const height = this.camMode === 1 ? 5.4 : 4.6;
    let tx, ty, tz, lx, ly, lz;
    if (this.camMode === 2) {
      tx = car.pos.x + Math.sin(car.heading) * 1.2;
      ty = 1.5;
      tz = car.pos.z + Math.cos(car.heading) * 1.2;
      lx = car.pos.x + Math.sin(car.heading) * 30;
      ly = 1.2;
      lz = car.pos.z + Math.cos(car.heading) * 30;
    } else {
      tx = car.pos.x - Math.sin(car.heading) * back;
      ty = height;
      tz = car.pos.z - Math.cos(car.heading) * back;
      lx = car.pos.x + Math.sin(car.heading) * 12;
      ly = 2.0;
      lz = car.pos.z + Math.cos(car.heading) * 12;
    }
    const k = Math.min(1, dt * 7);
    cam.position.x += (tx - cam.position.x) * k;
    cam.position.y += (ty - cam.position.y) * k;
    cam.position.z += (tz - cam.position.z) * k;
    cam.lookAt(lx, ly, lz);
  }
}
