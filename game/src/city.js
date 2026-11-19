// Velamar Bay itself: a sun-soaked coastal grid city built from boxes —
// streets, sidewalks, pastel buildings with lit windows, palms, lamps, a
// beach and a living sea to the south. All geometry is procedural and seeded.
import * as THREE from 'three';
import { CFG, PALETTE, DISTRICTS, roadCenters, cityHalf } from './config.js';
import { makeRng, pick, range, int } from './random.js';

export class City {
  constructor(scene, seed) {
    this.scene = scene;
    this.rng = makeRng(seed);
    this.buildings = []; // {x,z,hw,hd,h} collision boxes
    this.roadCenters = roadCenters();
    this.half = cityHalf();
    this.buildGround();
    this.buildRoads();
    this.buildBlocks();
    this.buildBeach();
    this.buildProps();
    this.buildSky();
  }

  buildGround() {
    const g = new THREE.Mesh(
      new THREE.PlaneGeometry(this.half * 2 + 320, this.half * 2 + 320),
      new THREE.MeshLambertMaterial({ color: 0x9a8f7a }),
    );
    g.rotation.x = -Math.PI / 2;
    g.position.set(0, -0.05, 40);
    this.scene.add(g);
  }

  buildRoads() {
    const mat = new THREE.MeshLambertMaterial({ color: PALETTE.road });
    const side = new THREE.MeshLambertMaterial({ color: PALETTE.sidewalk });
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xf2e3a0 });
    const len = this.half * 2 + 40;
    for (const c of this.roadCenters) {
      for (const [w, mat2, y] of [
        [CFG.street + 5, side, 0.01],
        [CFG.street, mat, 0.02],
      ]) {
        const ew = new THREE.Mesh(new THREE.PlaneGeometry(len, w), mat2);
        ew.rotation.x = -Math.PI / 2; ew.position.set(0, y, c);
        const ns = new THREE.Mesh(new THREE.PlaneGeometry(w, len), mat2);
        ns.rotation.x = -Math.PI / 2; ns.position.set(c, y, 0);
        this.scene.add(ew, ns);
      }
      // Centre dashes along both directions.
      for (let d = -this.half; d < this.half; d += 12) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.5), dashMat);
        dash.rotation.x = -Math.PI / 2; dash.position.set(d, 0.03, c);
        const dash2 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 4), dashMat);
        dash2.rotation.x = -Math.PI / 2; dash2.position.set(c, 0.03, d);
        this.scene.add(dash, dash2);
      }
    }
  }

  buildBlocks() {
    const rng = this.rng;
    const step = CFG.block + CFG.street;
    const winMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
    const winGeo = new THREE.BoxGeometry(1.6, 2.2, 0.15);
    for (let ix = -CFG.blocks; ix < CFG.blocks; ix++) {
      for (let iz = -CFG.blocks; iz < CFG.blocks; iz++) {
        const cx = ix * step + step / 2;
        const cz = iz * step + step / 2;
        // Skip the beach strip and the central plaza.
        if (cz > this.half - 30) continue;
        if (ix === 0 && iz === 0) { this.buildPlaza(cx, cz); continue; }
        const n = int(rng, 1, 3);
        for (let b = 0; b < n; b++) {
          const w = range(rng, 12, 20), d = range(rng, 12, 20);
          const h = range(rng, 8, 42) * (rng() < 0.18 ? 1.9 : 1); // a few towers
          const bx = cx + range(rng, -9, 9), bz = cz + range(rng, -9, 9);
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
          // Lit windows on the two street-facing sides.
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

  buildPlaza(cx, cz) {
    // Downtown Vela plaza: fountain, benches, tall palms, no buildings.
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
    rim.rotation.x = Math.PI / 2; rim.position.set(cx, 0.9, cz);
    this.scene.add(rim);
    this.buildings.push({ x: cx, z: cz, hw: 9.5, hd: 9.5, h: 1 });
  }

  buildBeach() {
    // South edge: sand strip, then the sea. The sun sets over it.
    const beach = new THREE.Mesh(
      new THREE.PlaneGeometry(this.half * 2 + 320, 70),
      new THREE.MeshLambertMaterial({ color: PALETTE.sand }),
    );
    beach.rotation.x = -Math.PI / 2;
    beach.position.set(0, 0.0, this.half + 8);
    this.scene.add(beach);
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(this.half * 2 + 400, 320),
      new THREE.MeshLambertMaterial({ color: PALETTE.sea }),
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(0, -0.4, this.half + 200);
    this.scene.add(sea);
    this.sea = sea;
    // Boardwalk lamps along the beach road.
    for (let x = -this.half; x <= this.half; x += 30) {
      this.addLamp(x, this.half - 8);
    }
  }

  addLamp(x, z) {
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

  buildProps() {
    const rng = this.rng;
    const step = CFG.block + CFG.street;
    // Palms along sidewalks and the beach.
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6a42 });
    const leafMat = new THREE.MeshLambertMaterial({ color: PALETTE.palm });
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
    // Neon signs on Neon Mile (east side) — coloured emissive boxes.
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
    void step;
  }

  buildSky() {
    // Golden-hour sky: big gradient dome + a low sun disc.
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

  // Push a circle (player / car) out of buildings. Returns the blocker or null.
  collideCircle(x, z, r) {
    for (const b of this.buildings) {
      const cx = Math.max(b.x - b.hw, Math.min(x, b.x + b.hw));
      const cz = Math.max(b.z - b.hd, Math.min(z, b.z + b.hd));
      const dx = x - cx, dz = z - cz;
      if (dx * dx + dz * dz < r * r) return b;
    }
    return null;
  }

  districtAt(x, z) {
    let best = DISTRICTS[0], bd = Infinity;
    for (const d of DISTRICTS) {
      const dd = (x - d.cx) ** 2 + (z - d.cz) ** 2;
      if (dd < bd) { bd = dd; best = d; }
    }
    return best.name;
  }
}
