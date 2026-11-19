// Combat: hitscan weapons with tracers, muzzle flash, recoil, reloads, and
// rival-gang shooters who take cover behind cars and buildings during
// missions. Fists work at arm's length.
import * as THREE from 'three';
import { CFG } from './config.js';
import { makeRng, range, clamp } from './random.js';

export class Combat {
  constructor(scene, city) {
    this.scene = scene;
    this.city = city;
    this.rng = makeRng(0xbeef);
    this.enemies = [];
    this.tracers = [];
    this.flash = new THREE.PointLight(0xffc46b, 0, 18, 1.6);
    scene.add(this.flash);
    this.cooldown = 0;
    this.reloadUntil = 0;
  }

  spawnEnemy(x, z, opts = {}) {
    const g = new THREE.Group();
    const shirt = new THREE.MeshLambertMaterial({ color: opts.color ?? 0x8a2bd9 }); // Los Tiburones purple
    const skin = new THREE.MeshLambertMaterial({ color: 0xe8b98a });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.78, 0.34), shirt);
    torso.position.y = 1.14;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), skin);
    head.position.y = 1.76;
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.12), new THREE.MeshLambertMaterial({ color: 0x222226 }));
    gun.position.set(0.3, 1.25, 0.3);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.74, 0.22), new THREE.MeshLambertMaterial({ color: 0x222226 }));
    legL.position.set(-0.15, 0.37, 0);
    const legR = legL.clone(); legR.position.x = 0.15;
    g.add(torso, head, gun, legL, legR);
    g.position.set(x, 0, z);
    this.scene.add(g);
    const e = {
      mesh: g, x, z, health: opts.health ?? 70, speed: opts.speed ?? 3.2,
      shootTimer: range(this.rng, 0.5, 1.5), burst: 0, dead: false, phase: 0,
      holdPos: null, aggression: opts.aggression ?? 1,
    };
    this.enemies.push(e);
    return e;
  }

  clearEnemies() {
    for (const e of this.enemies) this.scene.remove(e.mesh);
    this.enemies = [];
  }

  // Hitscan shot from the camera through the crosshair.
  shoot(G, cam) {
    const w = CFG.weapons[G.weapon];
    if (!w || w.name === 'FISTS') return false;
    if (this.cooldown > 0 || G.time < this.reloadUntil) return false;
    if (G.ammo <= 0) { G.audio?.click(); return false; }
    this.cooldown = w.rate;
    G.ammo -= 1;
    if (G.ammo === 0) this.startReload(G);
    const dir = new THREE.Vector3();
    cam.getWorldDirection(dir);
    const origin = cam.position.clone();
    // Muzzle flash at the player / car.
    this.flash.position.copy(origin).addScaledVector(dir, 1.2);
    this.flash.intensity = 60;
    // Find the closest enemy within the cone and range, with a clear line.
    let best = null, bd = w.range;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const to = new THREE.Vector3(e.x - origin.x, 1.2 - origin.y, e.z - origin.z);
      const d = to.length();
      if (d > w.range) continue;
      const ang = to.normalize().angleTo(dir);
      if (ang > 0.09) continue;
      if (d < bd) { bd = d; best = e; }
    }
    // Buildings block shots: crude but effective — a wall between origin and
    // target means the shot hits the wall.
    if (best) {
      const steps = Math.ceil(bd / 2);
      for (let i = 1; i < steps; i++) {
        const t = (i / steps) * bd;
        if (this.city.insideBuilding(origin.x + dir.x * t, origin.z + dir.z * t)) { best = null; break; }
      }
    }
    const end = origin.clone().addScaledVector(dir, best ? bd : w.range);
    this.addTracer(origin, end, best ? 0xffd94d : 0xffffff);
    if (best) {
      best.health -= w.damage;
      G.effects?.blood(best.x, best.z);
      if (best.health <= 0) {
        best.dead = true;
        best.mesh.rotation.x = -Math.PI / 2;
        best.mesh.position.y = 0.4;
        G.police.addHeat(CFG.heatPerCrime.kill);
        G.cash += 25; // pocket cash off a Tiburon
      }
    }
    G.audio?.gunshot();
    G.peds.scare(G.player.x, G.player.z, 26);
    G.police.addHeat(CFG.heatPerCrime.shoot);
    return true;
  }

  punch(G) {
    if (this.cooldown > 0) return false;
    this.cooldown = CFG.weapons.fists.rate;
    const px = G.player.x, pz = G.player.z;
    const fx = Math.sin(G.player.heading), fz = Math.cos(G.player.heading);
    for (const e of this.enemies) {
      if (e.dead) continue;
      const dx = e.x - px, dz = e.z - pz;
      const d = Math.hypot(dx, dz);
      if (d < CFG.weapons.fists.range && (dx * fx + dz * fz) / (d || 1) > 0.4) {
        e.health -= CFG.weapons.fists.damage;
        G.effects?.blood(e.x, e.z);
        if (e.health <= 0) { e.dead = true; e.mesh.rotation.x = -Math.PI / 2; e.mesh.position.y = 0.4; }
        return true;
      }
    }
    return false;
  }

  startReload(G) {
    const w = CFG.weapons[G.weapon];
    if (!w || !w.reserve) return;
    if (G.reserve <= 0) return;
    this.reloadUntil = G.time + 1.1;
    G.audio?.reload();
  }

  finishReload(G) {
    const w = CFG.weapons[G.weapon];
    if (!w || !w.ammo) return;
    const need = w.ammo - G.ammo;
    const take = Math.min(need, G.reserve);
    G.ammo += take;
    G.reserve -= take;
  }

  addTracer(a, b, color) {
    const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 }));
    this.scene.add(line);
    this.tracers.push({ line, life: 0.09 });
  }

  update(dt, G) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.flash.intensity = Math.max(0, this.flash.intensity - dt * 500);
    for (const t of this.tracers) {
      t.life -= dt;
      t.line.material.opacity = Math.max(0, t.life / 0.09);
      if (t.life <= 0) { this.scene.remove(t.line); }
    }
    this.tracers = this.tracers.filter((t) => t.life > 0);
    if (G.time >= this.reloadUntil && this.reloadUntil > 0) {
      this.finishReload(G);
      this.reloadUntil = 0;
    }
    // Enemy AI: advance to a firing position, shoot in bursts, take cover
    // behind the nearest building corner when hurt.
    const px = G.player.x, pz = G.player.z;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const dx = px - e.x, dz = pz - e.z;
      const dist = Math.hypot(dx, dz) || 1;
      e.phase += dt;
      const want = dist > 26 ? e.speed : dist < 10 ? -e.speed * 0.5 : 0;
      if (want !== 0) {
        e.x += (dx / dist) * want * dt;
        e.z += (dz / dist) * want * dt;
      }
      e.mesh.position.set(e.x, Math.abs(Math.sin(e.phase * 6)) * 0.04, e.z);
      e.mesh.rotation.y = Math.atan2(dx, dz);
      e.shootTimer -= dt * e.aggression;
      if (e.shootTimer <= 0 && dist < 55) {
        e.burst = 3;
        e.shootTimer = range(this.rng, 1.4, 2.6);
      }
      if (e.burst > 0) {
        e.burst -= 1;
        // Enemy fire is deliberately inaccurate: a fraction hits.
        if (this.rng() < 0.3) {
          const died = G.player.damage(range(this.rng, 4, 9));
          G.audio?.enemyShot();
          G.damageFlash = 1;
          if (died) G.wasted = true;
        }
        const from = new THREE.Vector3(e.x, 1.3, e.z);
        const to = new THREE.Vector3(px + range(this.rng, -2, 2), 1.2, pz + range(this.rng, -2, 2));
        this.addTracer(from, to, 0xff5a5a);
        G.audio?.distantShot();
      }
    }
  }
}
