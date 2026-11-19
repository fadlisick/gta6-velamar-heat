// Side activities: street races, hidden sunset tokens, the safehouse and
// the Ferro Arms gun shop. Races pay cash and respect; tokens pay $150
// each with a $1,000 bonus for all twelve; the safehouse heals, saves and
// lets the heat die down; the shop sells the shotgun, the rifle, ammo and
// vests. Everything here shows on the minimap as a coloured marker.
import * as THREE from 'three';
import { CFG, POIS } from './config.js';
import { makeRng, range } from './random.js';

export class Activities {
  constructor(scene, city, G) {
    this.scene = scene;
    this.city = city;
    this.G = G;
    this.rng = makeRng(0xac71);
    this.race = null; // {def, idx, t, countdown, lastBeep}
    this.raceBest = {};
    this.tokens = [];
    this.tokenMeshes = [];
    this.safeTimer = 0;
    this.buildRaceGates();
    this.buildTokens();
    this.checkpoint = this.buildCheckpointMarker();
  }

  // Checkered start gates at every race start line.
  buildRaceGates() {
    const mat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const mat2 = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (const race of CFG.races) {
      const { x, z } = race.start;
      for (const s of [-6, 6]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 5, 8), mat);
        pole.position.set(x + s, 2.5, z);
        this.scene.add(pole);
      }
      const banner = new THREE.Mesh(new THREE.BoxGeometry(12.6, 1.1, 0.3), mat2);
      banner.position.set(x, 5.2, z);
      this.scene.add(banner);
      const flag = new THREE.Mesh(new THREE.BoxGeometry(12.6, 0.5, 0.32), mat);
      flag.position.set(x, 4.5, z);
      this.scene.add(flag);
    }
  }

  buildCheckpointMarker() {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(5, 0.35, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xffd94d }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.4;
    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.4),
      new THREE.MeshBasicMaterial({ color: 0xffd94d, transparent: true, opacity: 0.9 }),
    );
    gem.position.y = 4;
    g.add(ring, gem);
    g.visible = false;
    this.scene.add(g);
    return g;
  }

  // Twelve gold tokens hidden around the city, never inside a building.
  buildTokens() {
    const geo = new THREE.OctahedronGeometry(0.9);
    for (let i = 0; i < CFG.collectibles; i++) {
      let x = 0;
      let z = 0;
      for (let tries = 0; tries < 40; tries++) {
        x = range(this.rng, -190, 190);
        z = range(this.rng, -190, 190);
        if (!this.city.insideBuilding(x, z)) break;
      }
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffd94d }));
      mesh.position.set(x, 1.6, z);
      this.scene.add(mesh);
      this.tokens.push({ x, z, taken: false, mesh });
      this.tokenMeshes.push(mesh);
    }
  }

  get tokensFound() { return this.tokens.filter((t) => t.taken).length; }

  nearGunshop() {
    const G = this.G;
    const dx = G.player.x - POIS.gunshop.x;
    const dz = G.player.z - POIS.gunshop.z;
    return dx * dx + dz * dz < POIS.gunshop.r * POIS.gunshop.r;
  }

  nearSafehouse() {
    const G = this.G;
    const dx = G.player.x - POIS.safehouse.x;
    const dz = G.player.z - POIS.safehouse.z;
    return dx * dx + dz * dz < POIS.safehouse.r * POIS.safehouse.r;
  }

  nearestRaceStart() {
    const G = this.G;
    const p = G.driving.active ? G.driving.car : G.player;
    for (let i = 0; i < CFG.races.length; i++) {
      const s = CFG.races[i].start;
      const dx = p.x - s.x;
      const dz = p.z - s.z;
      if (dx * dx + dz * dz < 14 * 14) return i;
    }
    return -1;
  }

  // ---- gun shop ----
  openShop() {
    const G = this.G;
    const el = document.getElementById('shopMenu');
    const w = G.weapons;
    const btn = (label, cost, disabled, act) =>
      `<button class="shopbtn" data-act="${act}" ${disabled ? 'disabled' : ''}>${label} — $${cost.toLocaleString()}</button>`;
    let html = '<h1 style="font-size:36px">FERRO ARMS</h1>';
    html += '<p>Licensed dealer, no questions asked. Cash only.</p><div class="shopgrid">';
    html += `<div>SHOTGUN<br>${w.includes('shotgun') ? '<span class="maxed">OWNED</span>' : btn('Buy shotgun', CFG.shop.shotgun, G.cash < CFG.shop.shotgun, 'shotgun')}</div>`;
    html += `<div>RIFLE<br>${w.includes('rifle') ? '<span class="maxed">OWNED</span>' : btn('Buy rifle', CFG.shop.rifle, G.cash < CFG.shop.rifle, 'rifle')}</div>`;
    html += `<div>AMMO BOX<br>${btn('Restock current weapon', CFG.shop.ammoBox, G.cash < CFG.shop.ammoBox, 'ammo')}</div>`;
    html += `<div>KEVLAR VEST<br>${btn('+50 armor', CFG.shop.vest, G.cash < CFG.shop.vest, 'vest')}</div>`;
    html += '</div>';
    html += `<p>Cash: $${Math.round(G.cash).toLocaleString()}</p>`;
    html += '<button class="btn ghost" id="shopClose">CLOSE (E)</button>';
    el.innerHTML = html;
    el.querySelectorAll('[data-act]').forEach((b) => {
      b.addEventListener('click', () => {
        const a = b.dataset.act;
        if (a === 'shotgun') G.weaponsSys.buyWeapon('shotgun');
        else if (a === 'rifle') G.weaponsSys.buyWeapon('rifle');
        else if (a === 'ammo') G.weaponsSys.buyAmmo();
        else if (a === 'vest') G.weaponsSys.buyVest();
        this.openShop();
      });
    });
    el.querySelector('#shopClose').addEventListener('click', () => G.closeMenu());
    G.openMenu('shop');
  }

  // ---- races ----
  startRace(i) {
    const G = this.G;
    if (!G.driving.active) return false;
    const def = CFG.races[i];
    this.race = { def, idx: 0, t: 0, countdown: 3.2, lastBeep: 4 };
    this.moveCheckpoint(def.points[0]);
    G.toast(`${def.name.toUpperCase()} — GET READY`);
    return true;
  }

  moveCheckpoint(p) {
    this.checkpoint.position.set(p.x, 0, p.z);
    this.checkpoint.visible = true;
  }

  finishRace() {
    const G = this.G;
    const r = this.race;
    if (!r) return;
    const secs = r.t;
    const best = this.raceBest[r.def.name];
    const isBest = best === undefined || secs < best;
    if (isBest) this.raceBest[r.def.name] = secs;
    G.cash += r.def.reward;
    G.respect += 5;
    G.audio?.raceWin();
    G.toast(`🏁 ${r.def.name.toUpperCase()} — ${secs.toFixed(1)}s · +$${r.def.reward}${isBest ? ' · NEW BEST' : ''}`);
    G.saveGame();
    this.checkpoint.visible = false;
    this.race = null;
  }

  update(dt) {
    const G = this.G;
    // Tokens spin; collect on touch.
    for (const t of this.tokens) {
      if (t.taken) continue;
      t.mesh.rotation.y += dt * 2;
      t.mesh.position.y = 1.6 + Math.sin(G.time * 2 + t.x) * 0.25;
      const dx = G.player.x - t.x;
      const dz = G.player.z - t.z;
      if (dx * dx + dz * dz < 2.5 * 2.5) {
        t.taken = true;
        t.mesh.visible = false;
        G.cash += CFG.tokenReward;
        G.tokensFound.push(this.tokens.indexOf(t));
        G.effects?.pickup(t.x, t.z);
        G.audio?.pickup();
        G.toast(`SUNSET TOKEN ${this.tokensFound.length}/${CFG.collectibles} — +$${CFG.tokenReward}`);
        if (this.tokensFound.length === CFG.collectibles) {
          G.cash += CFG.tokenBonus;
          G.respect += 15;
          G.toast(`ALL ${CFG.collectibles} TOKENS — BONUS +$${CFG.tokenBonus.toLocaleString()}`);
        }
        G.saveGame();
      }
    }
    // Safehouse: heal, cool the heat, autosave while laying low.
    if (!G.driving.active && this.nearSafehouse()) {
      G.player.heal(10 * dt);
      G.police.heat = Math.max(0, G.police.heat - 0.25 * dt);
      this.safeTimer += dt;
      if (this.safeTimer > 10) {
        this.safeTimer = 0;
        G.saveGame();
      }
      if (Math.floor(G.time * 2) % 4 === 0) G.hud?.showHint('SAFEHOUSE — laying low, heat cooling off', 1);
    } else {
      this.safeTimer = 0;
    }
    // Race clock and checkpoints.
    if (this.race) {
      const r = this.race;
      if (r.countdown > 0) {
        r.countdown -= dt;
        const n = Math.ceil(r.countdown);
        if (n !== r.lastBeep && n > 0) {
          r.lastBeep = n;
          G.audio?.countdown(false);
          G.toast(String(n));
        }
        if (r.countdown <= 0) {
          G.audio?.countdown(true);
          G.toast('GO!');
        }
        return;
      }
      r.t += dt;
      const car = G.driving.active ? G.driving.car : null;
      if (!car) { this.race = null; this.checkpoint.visible = false; return; }
      const target = r.def.points[r.idx];
      const dx = car.x - target.x;
      const dz = car.z - target.z;
      if (dx * dx + dz * dz < 10 * 10) {
        r.idx += 1;
        G.audio?.stepDone();
        if (r.idx >= r.def.points.length) this.finishRace();
        else this.moveCheckpoint(r.def.points[r.idx]);
      }
      this.checkpoint.rotation.y += dt;
    }
  }

  // Markers for the minimap: {x, z, kind}.
  poiMarkers() {
    const out = [
      { x: POIS.garage.x, z: POIS.garage.z, kind: 'garage' },
      { x: POIS.gunshop.x, z: POIS.gunshop.z, kind: 'gunshop' },
      { x: POIS.safehouse.x, z: POIS.safehouse.z, kind: 'safehouse' },
    ];
    for (const race of CFG.races) out.push({ x: race.start.x, z: race.start.z, kind: 'race' });
    for (const t of this.tokens) {
      if (!t.taken) out.push({ x: t.x, z: t.z, kind: 'token' });
    }
    if (this.race) {
      const p = this.race.def.points[this.race.idx];
      out.push({ x: p.x, z: p.z, kind: 'checkpoint' });
    }
    return out;
  }
}
