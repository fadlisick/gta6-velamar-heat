// Pedestrians: low-poly walkers on the sidewalks. They stroll, wait at
// corners, panic and run when gunfire or a police chase passes, and a few
// hang around the plaza and the beach.
import * as THREE from 'three';
import { CFG, PALETTE, roadCenters } from './config.js';
import { makeRng, pick, range } from './random.js';

function makePedMesh(rng) {
  const g = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color: pick(rng, PALETTE.pedShirt) });
  const skin = new THREE.MeshLambertMaterial({ color: pick(rng, [0xe8b98a, 0xc98a5a, 0x8a5a3a, 0xf2c9a0]) });
  const pants = new THREE.MeshLambertMaterial({ color: pick(rng, [0x2b3a5a, 0x333333, 0x5a3a2b, 0x6b7a8a]) });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.32), shirt);
  torso.position.y = 1.12;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, 0.34), skin);
  head.position.y = 1.7;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.72, 0.22), pants);
  legL.position.set(-0.14, 0.36, 0);
  const legR = legL.clone();
  legR.position.x = 0.14;
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.62, 0.18), shirt);
  armL.position.set(-0.37, 1.12, 0);
  const armR = armL.clone();
  armR.position.x = 0.37;
  g.add(torso, head, legL, legR, armL, armR);
  g.userData = { legL, legR, armL, armR };
  return g;
}

export class Pedestrians {
  constructor(scene, city, seed) {
    this.scene = scene;
    this.city = city;
    this.rng = makeRng(seed ^ 0x51f2);
    this.roads = roadCenters();
    this.peds = [];
    for (let i = 0; i < CFG.pedestrians; i++) {
      const mesh = makePedMesh(this.rng);
      scene.add(mesh);
      const p = {
        mesh, x: 0, z: 0, heading: 0, speed: range(this.rng, 0.9, 1.7),
        axis: 'x', dir: 1, road: 0, panic: 0, walkPhase: range(this.rng, 0, 6),
        dead: false, fleeing: false,
      };
      this.respawn(p, true);
      this.peds.push(p);
    }
  }

  respawn(p, anywhere = false) {
    const rc = pick(this.rng, this.roads);
    const horiz = this.rng() < 0.5;
    const dir = this.rng() < 0.5 ? 1 : -1;
    const side = (this.rng() < 0.5 ? -1 : 1) * 8.6; // sidewalk offset
    const t = anywhere ? range(this.rng, -200, 200) : (dir > 0 ? -220 : 220);
    p.axis = horiz ? 'x' : 'z';
    p.dir = dir;
    p.road = rc;
    p.x = horiz ? t : rc + side;
    p.z = horiz ? rc + side : t;
    p.heading = horiz ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    p.mesh.position.set(p.x, 0, p.z);
    p.mesh.rotation.y = p.heading;
    p.panic = 0;
  }

  // Gunfire or a crash nearby makes peds scream and run.
  scare(x, z, radius = 22) {
    for (const p of this.peds) {
      const dx = p.x - x;
      const dz = p.z - z;
      if (dx * dx + dz * dz < radius * radius) {
        p.panic = range(this.rng, 2.5, 5);
        p.fleeing = true;
      }
    }
  }

  update(dt, playerX, playerZ, danger) {
    const half = this.city.half + 20;
    for (const p of this.peds) {
      if (p.dead) continue;
      let speed = p.speed;
      if (p.panic > 0) {
        p.panic -= dt;
        speed = 4.2;
        // Run away from the danger point.
        const dx = p.x - danger.x;
        const dz = p.z - danger.z;
        const len = Math.hypot(dx, dz) || 1;
        p.x += (dx / len) * speed * dt;
        p.z += (dz / len) * speed * dt;
        p.heading = Math.atan2(dx, dz);
      } else {
        const step = speed * dt;
        if (p.axis === 'x') p.x += step * p.dir;
        else p.z += step * p.dir;
        // Turn at intersections sometimes; wrap at the city edge.
        const along = p.axis === 'x' ? p.x : p.z;
        if (Math.abs(along) > half) { this.respawn(p); continue; }
        const cross = this.roads.find((r) => Math.abs((p.axis === 'x' ? p.x : p.z) - r) < 1.2);
        if (cross !== undefined && this.rng() < dt * 0.1) {
          const nd = this.rng() < 0.5 ? 1 : -1;
          const side = (this.rng() < 0.5 ? -1 : 1) * 8.6;
          if (p.axis === 'x') { p.axis = 'z'; p.road = cross; p.dir = nd; p.x = cross + side; p.heading = nd > 0 ? Math.PI / 2 : -Math.PI / 2; }
          else { p.axis = 'x'; p.road = cross; p.dir = nd; p.z = cross + side; p.heading = nd > 0 ? 0 : Math.PI; }
        }
      }
      // Keep peds out of buildings.
      const b = this.city.insideBuilding(p.x, p.z);
      if (b) {
        p.x += (p.x < b.x ? -1 : 1) * 0.5;
        p.z += (p.z < b.z ? -1 : 1) * 0.5;
      }
      p.walkPhase += dt * speed * 3.4;
      const s = Math.sin(p.walkPhase) * 0.5;
      const u = p.mesh.userData;
      u.legL.rotation.x = s;
      u.legR.rotation.x = -s;
      u.armL.rotation.x = -s * 0.7;
      u.armR.rotation.x = s * 0.7;
      p.mesh.position.set(p.x, 0, p.z);
      p.mesh.rotation.y = p.heading;
      void playerX;
      void playerZ;
    }
  }
}
