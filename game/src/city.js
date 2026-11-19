// Velamar Bay: a sun-soaked coastal grid city, built from boxes. Streets
// and sidewalks, pastel blocks with lit windows, palms, lamps, a beach and
// a living sea to the south — plus the places that matter to the game: the
// Calle Sol garage, Ferro Arms gun shop and Dario's safehouse. Everything
// is procedural and seeded, so one seed rebuilds the same city.
import * as THREE from 'three';
import { CFG, PALETTE, DISTRICTS, POIS, roadCenters, cityHalf } from './config.js';
import { makeRng, pick, range, int } from './random.js';

export class City {
  constructor(scene, seed) {
    this.scene = scene;
    this.rng = makeRng(seed);
    this.buildings = []; // {x,z,hw,hd,h} collision boxes
    this.roadCenters = roadCenters();
    this.half = cityHalf();
    this.ground();
    this.roads();
    this.blocks();
    this.beach();
    this.places();
    this.props();
    this.sky();
  }

  ground() {
    const g = new THREE.Mesh(
      new THREE.PlaneGeometry(this.half * 2 + 320, this.half * 2 + 320),
      new THREE.MeshLambertMaterial({ color: 0x9a8f7a }),
    );
    g.rotation.x = -Math.PI / 2;
    g.position.set(0, -0.05, 40);
    this.scene.add(g);
  }

  roads() {
    const asphalt = new THREE.MeshLambertMaterial({ color: PALETTE.road });
    const walk = new THREE.MeshLambertMaterial({ color: PALETTE.sidewalk });
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xf2e3a0 });
    const len = this.half * 2 + 40;
    for (const c of this.roadCenters) {
      for (const [w, mat, y] of [[CFG.street + 5, walk, 0.01], [CFG.street, asphalt, 0.02]]) {
        const ew = new THREE.Mesh(new THREE.PlaneGeometry(len, w), mat);
        ew.rotation.x = -Math.PI / 2;
        ew.position.set(0, y, c);
        const ns = new THREE.Mesh(new THREE.PlaneGeometry(w, len), mat);
        ns.rotation.x = -Math.PI / 2;
        ns.position.set(c, y, 0);
        this.scene.add(ew, ns);
      }
      // Dashed centre lines, both directions.
      for (let d = -this.half; d < this.half; d += 12) {
        const a = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.5), dashMat);
        a.rotation.x = -Math.PI / 2;
        a.position.set(d, 0.03, c);
        const b = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 4), dashMat);
        b.rotation.x = -Math.PI / 2;
        b.position.set(c, 0.03, d);
        this.scene.add(a, b);
      }
    }
  }

  blocks() {
    const rng = this.rng;
    const step = CFG.block + CFG.street;
    const winMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
    const winGeo = new THREE.BoxGeometry(1.6, 2.2, 0.15);
    for (let ix = -CFG.blocks; ix < CFG.blocks; ix++) {
      for (let iz = -CFG.blocks; iz < CFG.blocks; iz++) {
        const cx = ix * step + step / 2;
        const cz = iz * step + step / 2;
        if (cz > this.half - 30) continue; // beach strip
        if (ix === 0 && iz === 0) { this.plaza(cx, cz); continue; }
        const n = int(rng, 1, 3);
        for (let b = 0; b < n; b++) {
          const w = range(rng, 12, 20);
          const d = range(rng, 12, 20);
          const h = range(rng, 8, 42) * (rng() < 0.18 ? 1.9 : 1); // a few towers
          const bx = cx + range(rng, -9, 9);
          const bz = cz + range(rng, -9, 9);
          const color = pick(rng, PALETTE.building);
          const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, d),
            new THREE.MeshLambertMaterial({ color }),
          );
          mesh.position.set(bx, h / 2, bz);
          this.scene.add(mesh);
          const roof = new THREE.Mesh(
            new THREE.BoxGeometry(w * 0.7, 1.2, d * 0.7),
            new THREE.MeshLambertMaterial({ color: pick(rng, PALETTE.roof) }),
          );
          roof.position.set(bx, h + 0.6, bz);
          this.scene.add(roof);
          // Lit windows on the street-facing sides.
          const floors = Math.max(1, Math.floor(h / 4));
          for (let f = 0; f < floors; f++) {
            for (let wx = -1; wx <= 1; wx++) {
              if (rng() < 0.45) continue;
              const win = new THREE.Mesh(winGeo, winMat);
              win.position.set(bx + wx * (w / 3.4), 3 + f * 4, bz + d / 2 + 0.08);
              this.scene.add(win);
            }
          }
          this.buildings.push({ x: bx, z: bz, hw: w / 2 + 0.4, hd: d / 2 + 0.4, h });
        }
      }
    }
  }

  plaza(cx, cz) {
    // Downtown Vela plaza: fountain, rim, tall palms, no buildings.
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(9, 9, 0.8, 24),
      new THREE.MeshLambertMaterial({ color: 0x6fb7d9 }),
    );
    disc.position.set(cx, 0.4, cz);
    this.scene.add(disc);
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(9, 0.7, 8, 24),
      new THREE.MeshLambertMaterial({ color: 0xe8e0cc }),
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.set(cx, 0.9, cz);
    this.scene.add(rim);
    this.buildings.push({ x: cx, z: cz, hw: 9.5, hd: 9.5, h: 1 });
  }

  beach() {
    const sand = new THREE.Mesh(
      new THREE.PlaneGeometry(this.half * 2 + 320, 70),
      new THREE.MeshLambertMaterial({ color: PALETTE.sand }),
    );
    sand.rotation.x = -Math.PI / 2;
    sand.position.set(0, 0.0, this.half + 8);
    this.scene.add(sand);
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(this.half * 2 + 400, 320),
      new THREE.MeshLambertMaterial({ color: PALETTE.sea }),
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(0, -0.4, this.half + 200);
    this.scene.add(sea);
    this.sea = sea;
    for (let x = -this.half; x <= this.half; x += 30) this.lamp(x, this.half - 8);
  }

  lamp(x, z) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.16, 6, 6),
      new THREE.MeshLambertMaterial({ color: 0x33333a }),
    );
    pole.position.set(x, 3, z);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffe9a8 }),
    );
    bulb.position.set(x, 6.2, z);
    this.scene.add(pole, bulb);
  }

  // The three places the side systems live in. Each gets a building, a
  // glowing sign and a marked pad on the ground that the player drives or
  // walks into; the pad, not the wall, is the trigger.
  places() {
    this.placeGarage();
    this.placeGunshop();
    this.placeSafehouse();
  }

  sign(text, color, x, y, z, w = 6) {
    const s = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 1.6, w),
      new THREE.MeshBasicMaterial({ color }),
    );
    s.position.set(x, y, z);
    this.scene.add(s);
    return s;
  }

  pad(x, z, r, color) {
    const p = new THREE.Mesh(
      new THREE.CircleGeometry(r, 28),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3 }),
    );
    p.rotation.x = -Math.PI / 2;
    p.position.set(x, 0.06, z);
    this.scene.add(p);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.22, 8, 40),
      new THREE.MeshBasicMaterial({ color }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, 0.08, z);
    this.scene.add(ring);
  }

  placeGarage() {
    const { x, z } = POIS.garage;
    const hall = new THREE.Mesh(
      new THREE.BoxGeometry(24, 7, 14),
      new THREE.MeshLambertMaterial({ color: 0xb5654d }),
    );
    hall.position.set(x + 16, 3.5, z);
    this.scene.add(hall);
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 5, 10),
      new THREE.MeshLambertMaterial({ color: 0x3a3a44 }),
    );
    door.position.set(x + 3.8, 2.5, z);
    this.scene.add(door);
    this.sign('GARAGE', 0xffb84d, x + 3.4, 8.2, z, 8);
    this.pad(x, z, POIS.garage.r, 0xffb84d);
    this.buildings.push({ x: x + 16, z, hw: 12.4, hd: 7.4, h: 7 });
  }

  placeGunshop() {
    const { x, z } = POIS.gunshop;
    const shop = new THREE.Mesh(
      new THREE.BoxGeometry(14, 8, 10),
      new THREE.MeshLambertMaterial({ color: 0x5a4a7a }),
    );
    shop.position.set(x + 12, 4, z);
    this.scene.add(shop);
    this.sign('FERRO ARMS', 0x7bff2e, x + 4.6, 7, z, 7);
    this.pad(x, z, POIS.gunshop.r, 0x7bff2e);
    this.buildings.push({ x: x + 12, z, hw: 7.4, hd: 5.4, h: 8 });
  }

  placeSafehouse() {
    const { x, z } = POIS.safehouse;
    const house = new THREE.Mesh(
      new THREE.BoxGeometry(12, 6, 9),
      new THREE.MeshLambertMaterial({ color: 0xe8c98f }),
    );
    house.position.set(x - 11, 3, z);
    this.scene.add(house);
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(13, 1, 10),
      new THREE.MeshLambertMaterial({ color: 0x2e7d4f }),
    );
    roof.position.set(x - 11, 6.5, z);
    this.scene.add(roof);
    this.sign('SAFEHOUSE', 0x7dff9a, x - 4.6, 5, z, 6);
    this.pad(x, z, POIS.safehouse.r, 0x7dff9a);
    this.buildings.push({ x: x - 11, z, hw: 6.4, hd: 4.9, h: 6 });
  }

  props() {
    const rng = this.rng;
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6a42 });
    const leafMat = new THREE.MeshLambertMaterial({ color: PALETTE.palm });
    // Palms along sidewalks and the beach.
    for (let i = 0; i < 90; i++) {
      const alongRoad = rng() < 0.5;
      const rc = pick(rng, this.roadCenters);
      const t = range(rng, -this.half, this.half);
      const x = alongRoad ? t : rc + (rng() < 0.5 ? -8.5 : 8.5);
      const z = alongRoad ? rc + (rng() < 0.5 ? -8.5 : 8.5) : t;
      if (z > this.half - 30) continue;
      if (this.insideBuilding(x, z)) continue;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 5.5, 6), trunkMat);
      trunk.position.set(x, 2.75, z);
      trunk.rotation.z = range(rng, -0.08, 0.08);
      const leaves = new THREE.Mesh(new THREE.ConeGeometry(2.6, 2.2, 7), leafMat);
      leaves.position.set(x, 6.2, z);
      this.scene.add(trunk, leaves);
    }
    // Neon signs on Neon Mile — coloured glowing boxes on tall buildings.
    const neonColors = [0xff2e88, 0x2ee6ff, 0xffe62e, 0x7bff2e];
    for (let i = 0; i < 14; i++) {
      const b = this.buildings[int(rng, 0, this.buildings.length - 1)];
      if (!b || b.h < 10) continue;
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, range(rng, 1.5, 3.5), range(rng, 3, 7)),
        new THREE.MeshBasicMaterial({ color: pick(rng, neonColors) }),
      );
      sign.position.set(b.x + b.hw + 0.25, range(rng, 4, b.h - 2), b.z);
      this.scene.add(sign);
    }
  }

  sky() {
    // Golden-hour sky: gradient dome plus a low sun disc over the sea.
    const skyGeo = new THREE.SphereGeometry(900, 16, 12);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: new THREE.Color(0x3a2a6e) },
        mid: { value: new THREE.Color(0xff7a3d) },
        bot: { value: new THREE.Color(0xffc46b) },
      },
      vertexShader: 'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 bot;
        void main(){ float h=normalize(vP).y; vec3 c = h>0.25 ? mix(mid,top,smoothstep(0.25,0.8,h)) : mix(bot,mid,smoothstep(-0.05,0.25,h));
        gl_FragColor=vec4(c,1.0); }`,
    });
    this.scene.add(new THREE.Mesh(skyGeo, skyMat));
    const sun = new THREE.Mesh(
      new THREE.CircleGeometry(34, 32),
      new THREE.MeshBasicMaterial({ color: 0xffdf8a, fog: false }),
    );
    sun.position.set(-260, 95, 620);
    sun.lookAt(0, 40, 0);
    this.scene.add(sun);
  }

  insideBuilding(x, z) {
    for (const b of this.buildings) {
      if (Math.abs(x - b.x) < b.hw && Math.abs(z - b.z) < b.hd) return b;
    }
    return null;
  }

  // Push a circle (player / car) out of buildings. Returns the blocker.
  collideCircle(x, z, r) {
    for (const b of this.buildings) {
      const cx = Math.max(b.x - b.hw, Math.min(x, b.x + b.hw));
      const cz = Math.max(b.z - b.hd, Math.min(z, b.z + b.hd));
      const dx = x - cx;
      const dz = z - cz;
      if (dx * dx + dz * dz < r * r) return b;
    }
    return null;
  }

  districtAt(x, z) {
    let best = DISTRICTS[0];
    let bd = Infinity;
    for (const d of DISTRICTS) {
      const dd = (x - d.cx) ** 2 + (z - d.cz) ** 2;
      if (dd < bd) { bd = dd; best = d; }
    }
    return best.name;
  }
}
