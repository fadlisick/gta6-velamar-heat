// The Calle Sol garage: store stolen cars, tune them and repair them.
// Drive onto the orange pad and press E. Upgrades stay on the car and are
// saved with it; a stored car waits in the garage until you take it out.
import { CFG, POIS } from './config.js';
import { Car } from './vehicles.js';

export class Garage {
  constructor(G) {
    this.G = G;
  }

  // Player (on foot or in the car) standing on the garage pad.
  nearPad() {
    const G = this.G;
    const p = G.driving.active ? G.driving.car : G.player;
    const dx = p.x - POIS.garage.x;
    const dz = p.z - POIS.garage.z;
    return dx * dx + dz * dz < POIS.garage.r * POIS.garage.r;
  }

  open() {
    this.render();
    this.G.openMenu('garage');
  }

  close() {
    this.G.closeMenu();
  }

  levelName(kind, level) {
    if (kind === 'nitro') return level ? 'FITTED' : 'NOT FITTED';
    return `LV ${level}`;
  }

  render() {
    const G = this.G;
    const el = document.getElementById('garageMenu');
    const car = G.driving.active ? G.driving.car : null;
    const up = car ? car.upgrades : null;
    const rows = [];
    const mkBtn = (label, cost, disabled, action) =>
      `<button class="shopbtn" data-act="${action}" ${disabled ? 'disabled' : ''}>${label} — $${cost.toLocaleString()}</button>`;
    let html = '<h1 style="font-size:36px">CALLE SOL GARAGE</h1>';
    html += `<p>${car ? `Current ride: <b>${car.model.toUpperCase()}</b> · health ${Math.round(car.health)}/${car.maxHealth}` : 'No car with you — drive one onto the pad.'}</p>`;
    if (car) {
      const g = CFG.garage;
      html += '<div class="shopgrid">';
      html += `<div>ENGINE ${this.levelName('engine', up.engine)}<br>${up.engine < 3 ? mkBtn('Upgrade engine', g.engine[up.engine], G.cash < g.engine[up.engine], 'engine') : '<span class="maxed">MAXED</span>'}</div>`;
      html += `<div>ARMOR ${this.levelName('armor', up.armor)}<br>${up.armor < 3 ? mkBtn('Upgrade armor', g.armor[up.armor], G.cash < g.armor[up.armor], 'armor') : '<span class="maxed">MAXED</span>'}</div>`;
      html += `<div>TIRES ${this.levelName('tires', up.tires)}<br>${up.tires < 2 ? mkBtn('Upgrade tires', g.tires[up.tires], G.cash < g.tires[up.tires], 'tires') : '<span class="maxed">MAXED</span>'}</div>`;
      html += `<div>NITRO ${this.levelName('nitro', up.nitro ? 1 : 0)}<br>${!up.nitro ? mkBtn('Fit nitro (Shift to boost)', g.nitro, G.cash < g.nitro, 'nitro') : '<span class="maxed">FITTED</span>'}</div>`;
      html += `<div>REPAIR<br>${mkBtn('Repair to full', g.repairCost, G.cash < g.repairCost || car.health >= car.maxHealth, 'repair')}</div>`;
      html += `<div>STORE CAR<br>${mkBtn('Store this car', 0, G.garage.length >= CFG.garage.storeCap, 'store')}</div>`;
      html += '</div>';
    }
    html += `<p>Stored cars (${G.garage.length}/${CFG.garage.storeCap}):</p><div class="shopgrid">`;
    if (!G.garage.length) html += '<div>— empty —</div>';
    G.garage.forEach((c, i) => {
      const u = c.upgrades || { engine: 0, armor: 0, tires: 0, nitro: false };
      html += `<div>${c.model.toUpperCase()} · ENG ${u.engine} · ARM ${u.armor} · ${u.nitro ? 'NITRO' : 'no nitro'}<br><button class="shopbtn" data-act="take" data-i="${i}">TAKE OUT</button></div>`;
    });
    html += '</div>';
    html += `<p>Cash: $${Math.round(G.cash).toLocaleString()}</p>`;
    html += '<button class="btn ghost" id="garageClose">CLOSE (E)</button>';
    el.innerHTML = html;
    el.querySelectorAll('[data-act]').forEach((b) => {
      b.addEventListener('click', () => this.act(b.dataset.act, Number(b.dataset.i ?? -1)));
    });
    el.querySelector('#garageClose').addEventListener('click', () => this.close());
  }

  act(action, i) {
    const G = this.G;
    const car = G.driving.active ? G.driving.car : null;
    const g = CFG.garage;
    const spend = (cost) => {
      if (G.cash < cost) { G.audio?.denied(); G.toast('NOT ENOUGH CASH'); return false; }
      G.cash -= cost;
      return true;
    };
    if (action === 'engine' && car) {
      const cost = g.engine[car.upgrades.engine];
      if (car.upgrades.engine < 3 && this.spend(cost)) {
        car.upgrades.engine += 1;
        car.applyUpgrades();
        G.audio?.buy();
        G.toast('ENGINE UPGRADED');
      }
    } else if (action === 'armor' && car) {
      const cost = g.armor[car.upgrades.armor];
      if (car.upgrades.armor < 3 && this.spend(cost)) {
        car.upgrades.armor += 1;
        car.applyUpgrades();
        G.audio?.buy();
        G.toast('ARMOR UPGRADED');
      }
    } else if (action === 'tires' && car) {
      const cost = g.tires[car.upgrades.tires];
      if (car.upgrades.tires < 2 && this.spend(cost)) {
        car.upgrades.tires += 1;
        car.applyUpgrades();
        G.audio?.buy();
        G.toast('TIRES UPGRADED');
      }
    } else if (action === 'nitro' && car) {
      if (!car.upgrades.nitro && this.spend(g.nitro)) {
        car.upgrades.nitro = true;
        car.applyUpgrades();
        G.audio?.buy();
        G.toast('NITRO FITTED — hold Shift while driving');
      }
    } else if (action === 'repair' && car) {
      if (car.health < car.maxHealth && this.spend(g.repairCost)) {
        car.health = car.maxHealth;
        G.audio?.buy();
        G.toast('REPAIRED');
      }
    } else if (action === 'store' && car) {
      if (G.garage.length >= CFG.garage.storeCap) { G.audio?.denied(); return; }
      G.garage.push({ model: car.model, color: car.color, upgrades: { ...car.upgrades } });
      this.removeFromWorld(car);
      G.exitCar();
      G.audio?.buy();
      G.toast(`${car.model.toUpperCase()} STORED IN THE GARAGE`);
      G.saveGame();
    } else if (action === 'take' && i >= 0 && G.garage[i]) {
      const stored = G.garage.splice(i, 1)[0];
      const pad = POIS.garage;
      const fresh = new Car(G.scene, stored.model, stored.color, pad.x, pad.z - 4, Math.PI, {
        upgrades: stored.upgrades,
      });
      G.enterCar(fresh);
      G.audio?.buy();
      G.toast(`${stored.model.toUpperCase()} — YOURS AGAIN`);
      this.close();
      return;
    }
    this.render();
  }

  // Take a car out of traffic / parked lists and off the scene.
  removeFromWorld(car) {
    const G = this.G;
    const ti = G.traffic.cars.indexOf(car);
    if (ti >= 0) G.traffic.cars.splice(ti, 1);
    const pi = G.traffic.parked.indexOf(car);
    if (pi >= 0) G.traffic.parked.splice(pi, 1);
    car.dispose();
  }
}
