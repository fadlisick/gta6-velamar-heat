// VELAMAR HEAT — Sunset Run. An open-world crime game in Velamar Bay:
// a city on foot and by car, traffic and pedestrians, cars to steal, a
// 5-star wanted level with police and a helicopter, 8 story missions,
// combat with a weapon wheel, a garage to tune and store cars, street
// races, hidden tokens, a safehouse and a gun shop, a HUD with a live
// minimap, a start screen and a save. Static files only: three.js is
// vendored under game/vendor, every sound is synthesized, nothing is
// fetched over the network.
import * as THREE from 'three';
import { CFG } from './config.js';
import { City } from './city.js';
import { Traffic, Car } from './vehicles.js';
import { Pedestrians } from './pedestrians.js';
import { Player } from './player.js';
import { Driving } from './driving.js';
import { Police } from './police.js';
import { Combat } from './combat.js';
import { MissionManager } from './missions.js';
import { Hud } from './hud.js';
import { AudioSys } from './audio.js';
import { Effects } from './effects.js';
import { Input } from './input.js';
import { Garage } from './garage.js';
import { WeaponWheel } from './weapons.js';
import { Activities } from './activities.js';
import { loadSave, writeSave, saveLabel } from './save.js';
import { stageShot } from './shots.js';

// Pointer lock needs a user gesture; staged runs and headless runs have
// none, so a refused lock must never surface as an unhandled rejection.
function lockPointer() {
  try {
    const r = canvas.requestPointerLock?.();
    if (r && r.catch) r.catch(() => {});
  } catch { /* no pointer lock without a gesture */ }
}

const params = new URLSearchParams(location.search);
const SEED = Number(params.get('seed') || 1);

// ---------- renderer / scene ----------
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xe88a4d, 120, 620);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(-40, 26, 190);

// Golden-hour lighting: warm low sun + purple sky bounce.
const sun = new THREE.DirectionalLight(0xffb36b, 2.4);
sun.position.set(-180, 120, 320);
scene.add(sun);
scene.add(new THREE.HemisphereLight(0x8a5adf, 0x3a2a1a, 0.9));
const fill = new THREE.DirectionalLight(0x6fb7d9, 0.5);
fill.position.set(150, 80, -200);
scene.add(fill);

// ---------- game state ----------
const G = {
  time: 0,
  state: 'menu', // menu | playing | paused | over
  over: false,
  wasted: false,
  busted: false,
  cash: CFG.startCash,
  respect: 0,
  missionsDone: [],
  weapons: ['fists', 'pistol'],
  weapon: 'fists',
  ammo: Infinity,
  reserve: 0,
  garage: [],
  tokensFound: [],
  raceBest: {},
  clockMin: CFG.startClockMin,
  damageFlash: 0,
  lastDamageAt: -99,
  seed: SEED,
  menuOpen: null, // 'garage' | 'shop' | null
  mouseX: 0,
  mouseY: 0,
};
G.scene = scene;
G.camera = camera;
G.city = new City(scene, SEED);
G.traffic = new Traffic(scene, G.city, SEED);
G.peds = new Pedestrians(scene, G.city, SEED);
G.player = new Player(scene, G.city);
G.driving = new Driving(G.city, G.traffic);
G.police = new Police(scene, G.city, G.traffic);
G.combat = new Combat(scene, G.city);
G.effects = new Effects(scene);
G.audio = new AudioSys();
G.hud = new Hud(G);
G.missions = new MissionManager(G);
G.input = new Input(canvas);
G.garageSys = new Garage(G);
G.weaponsSys = new WeaponWheel(G);
G.activities = new Activities(scene, G.city, G);
G.activities.raceBest = G.raceBest;

// Mission beacon: a floating golden diamond over the current objective.
{
  const beacon = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.6),
    new THREE.MeshBasicMaterial({ color: 0xffd94d, transparent: true, opacity: 0.9 }),
  );
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.2, 0.18, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0xffd94d }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.1;
  beacon.add(ring);
  beacon.visible = false;
  scene.add(beacon);
  G.missions.beacon = beacon;
}

G.say = (who, text, secs) => G.hud.say(who, text, secs);
G.toast = (text, secs) => G.hud.toast(text, secs);
G.saveGame = () => { if (writeSave(G)) G.hud.showHint('Game saved'); };

// Menus (garage / gun shop) freeze play while they are up.
G.openMenu = (name) => {
  G.menuOpen = name;
  G.state = 'paused';
  document.getElementById(name === 'garage' ? 'garageMenu' : 'shopMenu').classList.remove('hidden');
  document.exitPointerLock?.();
  // A menu covers the screen: clear the transient banners so they never
  // print over it, and paint the HUD once (it stops updating while paused).
  G.hud.el.dialogue.classList.add('hidden');
  G.hud.el.hint.classList.add('hidden');
  G.hud.el.toast.textContent = '';
  G.hud.update(0);
};
G.closeMenu = () => {
  if (!G.menuOpen) return;
  document.getElementById('garageMenu').classList.add('hidden');
  document.getElementById('shopMenu').classList.add('hidden');
  G.menuOpen = null;
  G.state = 'playing';
  lockPointer();
};

function applyWeapon(name) {
  if (!G.weapons.includes(name)) return;
  G.weapon = name;
  const w = CFG.weapons[name];
  if (name === 'fists') { G.ammo = Infinity; G.reserve = 0; }
  else if (name === 'pistol') { G.ammo = Math.min(w.ammo, 12); G.reserve = 72; }
  else { G.ammo = w.ammo; G.reserve = w.reserve; }
  G.audio.click();
}
G.applyWeapon = applyWeapon;

G.enterCar = (car) => {
  G.driving.enter(car);
  G.player.mesh.visible = false;
  G.audio.ensure();
  if (car.traffic) {
    // Carjacking a moving car: the driver flees and the cops take notice.
    const i = G.traffic.cars.indexOf(car);
    if (i >= 0) G.traffic.cars.splice(i, 1);
    car.traffic = false;
    G.police.addHeat(CFG.heatPerCrime.steal);
    G.toast('CARJACKED — the cops saw that');
    G.peds.scare(car.x, car.z, 18);
  }
  G.hud.showHint(car.police ? 'You stole a police car. Bold.' : `${car.model.toUpperCase()} — yours now. W/S drive, Shift nitro, Space handbrake, E to get out`);
};

G.exitCar = () => {
  const car = G.driving.exit();
  if (!car) return;
  const side = Math.cos(car.heading);
  G.player.pos.set(car.x + Math.sin(car.heading + Math.PI / 2) * 2.4, 0, car.z + side * 2.4);
  G.player.heading = car.heading;
  G.player.mesh.visible = true;
  G.player.mesh.position.copy(G.player.pos);
};

G.startGame = (fromSave) => {
  G.audio.ensure();
  if (fromSave) {
    const s = loadSave();
    if (s) {
      G.cash = s.cash ?? CFG.startCash;
      G.respect = s.respect ?? 0;
      G.missionsDone = s.missionsDone ?? [];
      G.weapons = s.weapons?.length ? s.weapons : ['fists', 'pistol'];
      G.garage = s.garage ?? [];
      G.tokensFound = s.tokens ?? [];
      G.raceBest = s.raceBest ?? {};
      G.activities.raceBest = G.raceBest;
      for (const i of G.tokensFound) {
        const t = G.activities.tokens[i];
        if (t) { t.taken = true; t.mesh.visible = false; }
      }
      G.clockMin = s.clockMin ?? CFG.startClockMin;
      if (s.player) G.player.pos.set(s.player.x, 0, s.player.z);
      applyWeapon('pistol');
      G.toast('Save loaded — welcome back to Velamar Bay');
    }
  } else {
    applyWeapon('pistol');
  }
  document.getElementById('startmenu').classList.add('hidden');
  document.getElementById('missionmenu').classList.add('hidden');
  document.getElementById('pausemenu').classList.add('hidden');
  document.getElementById('endmenu').classList.add('hidden');
  G.hud.show();
  G.state = 'playing';
  G.over = false;
  G.wasted = false;
  G.busted = false;
  G.missions.beacon.visible = true;
  if (!G.missions.active) {
    const next = G.missions.nextMission;
    if (next) {
      G.missions.start(next.id);
      G.hud.showHint(`Job ${next.id}/8: ${next.name} — follow the yellow marker`);
    } else {
      G.hud.showHint('All 8 jobs done — the bay is yours. Free roam, Dario.');
      G.say('MAMA LUZ', 'Every crew in Velamar Bay knows your name now. Drive anywhere. The city is yours.');
    }
  }
  lockPointer();
};

function endScreen(kind) {
  G.state = 'over';
  G.over = true;
  document.exitPointerLock?.();
  G.hud.hide();
  const menu = document.getElementById('endmenu');
  menu.classList.remove('hidden');
  document.getElementById('wasted').classList.toggle('hidden', kind !== 'wasted');
  document.getElementById('busted').classList.toggle('hidden', kind !== 'busted');
  const lost = Math.round(G.cash * 0.1);
  G.cash = Math.max(0, G.cash - lost);
  document.getElementById('endtext').textContent = kind === 'wasted'
    ? `The Tiburones left you in the street. The hospital patched you up for $${lost.toLocaleString()} — the debt still stands.`
    : `The Velamar Bay Police took you in. Bail cost $${lost.toLocaleString()}, and the heat is off — for now.`;
  G.audio.crash();
}

function respawn() {
  G.player.health = CFG.playerHealth;
  G.player.armor = 0;
  G.player.pos.set(0, 0, 10); // Downtown Vela plaza — the "hospital" door
  G.player.mesh.position.copy(G.player.pos);
  G.police.clearHeat();
  G.combat.clearEnemies();
  if (G.driving.active) G.exitCar();
  G.wasted = false;
  G.busted = false;
  document.getElementById('endmenu').classList.add('hidden');
  G.hud.show();
  G.state = 'playing';
  G.over = false;
  G.hud.showHint('Back on your feet. The bay is still yours to take.');
}

// ---------- menus ----------
const saved = loadSave();
document.getElementById('contLabel').textContent = saveLabel(saved);
document.getElementById('btnStart').addEventListener('click', () => G.startGame(false));
document.getElementById('btnContinue').addEventListener('click', () => {
  if (loadSave()) G.startGame(true);
  else G.startGame(false);
});
document.getElementById('btnMissions').addEventListener('click', () => {
  document.getElementById('startmenu').classList.add('hidden');
});
document.getElementById('btnResume').addEventListener('click', () => {
  document.getElementById('pausemenu').classList.add('hidden');
  G.state = 'playing';
  lockPointer();
});
document.getElementById('btnSaveQuit').addEventListener('click', () => {
  writeSave(G);
  document.getElementById('pausemenu').classList.add('hidden');
  document.getElementById('startmenu').classList.remove('hidden');
  document.getElementById('contLabel').textContent = saveLabel(loadSave());
  G.hud.hide();
  G.state = 'menu';
});
document.getElementById('btnRetry').addEventListener('click', respawn);
document.getElementById('btnEndMenu').addEventListener('click', () => {
  writeSave(G);
  document.getElementById('endmenu').classList.add('hidden');
  document.getElementById('startmenu').classList.remove('hidden');
  document.getElementById('contLabel').textContent = saveLabel(loadSave());
  G.hud.hide();
  G.state = 'menu';
  G.player.health = CFG.playerHealth;
  G.police.clearHeat();
});

// E / Escape close an open shop or garage menu (the frame loop is paused
// while a menu is up, so this listener is the only way out by keyboard).
window.addEventListener('keydown', (e) => {
  if (!G.menuOpen) return;
  if (e.code === 'KeyE' || e.code === 'Escape') {
    e.preventDefault();
    G.closeMenu();
  }
});
// Mouse position for the weapon wheel (pointer lock is off while it is open).
window.addEventListener('mousemove', (e) => {
  G.mouseX = e.clientX;
  G.mouseY = e.clientY;
});

// Mission ledger (imported lazily to keep the menu code small).
import('./missions.js').then(({ MISSIONS }) => {
  const render = () => {
    const list = document.getElementById('missionList');
    list.innerHTML = MISSIONS.map((m) => {
      const done = G.missionsDone.includes(m.id);
      const active = G.missions.current?.id === m.id;
      const cls = done ? 'done' : active ? '' : 'locked';
      const mark = done ? '✓ ' : active ? '▶ ' : '· ';
      return `<div class="${cls}">${mark}${m.id}. ${m.name} — $${m.reward.toLocaleString()}${done ? ' — DONE' : ''}</div>`;
    }).join('');
  };
  document.getElementById('btnMissions').addEventListener('click', () => {
    render();
    document.getElementById('missionmenu').classList.remove('hidden');
  });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Tab' && G.state === 'playing') {
      e.preventDefault();
      render();
      document.getElementById('missionmenu').classList.remove('hidden');
      document.exitPointerLock?.();
      G.state = 'paused';
    }
  });
  document.getElementById('btnMissionsBack').addEventListener('click', () => {
    document.getElementById('missionmenu').classList.add('hidden');
    if (G.state === 'paused') { G.state = 'playing'; lockPointer(); }
    else document.getElementById('startmenu').classList.remove('hidden');
  });
});

G.input.onPause = () => {
  if (G.state === 'playing') {
    G.state = 'paused';
    document.exitPointerLock?.();
    document.getElementById('pausemenu').classList.remove('hidden');
  } else if (G.state === 'paused' && !G.menuOpen) {
    document.getElementById('pausemenu').classList.add('hidden');
    G.state = 'playing';
    lockPointer();
  }
};

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- main loop ----------
let last = performance.now();
let prevHealth = CFG.playerHealth;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const input = G.input;
  if (G.state === 'menu') {
    // Slow orbit over the city behind the title screen.
    G.time += dt;
    const a = G.time * 0.03;
    camera.position.set(Math.sin(a) * 190, 55 + Math.sin(G.time * 0.1) * 8, Math.cos(a) * 190 + 40);
    camera.lookAt(0, 10, 20);
    G.traffic.update(dt, null);
    G.peds.update(dt, 0, 0, { x: 0, z: 0 });
    G.effects.update(dt);
    renderer.render(scene, camera);
    input.endFrame();
    return;
  }
  if (G.state === 'paused' || G.state === 'over') {
    renderer.render(scene, camera);
    input.endFrame();
    return;
  }
  // --- playing ---
  G.time += dt;
  G.clockMin = (G.clockMin + dt * CFG.clockRate) % (24 * 60);

  // Weapon wheel: hold Q, aim with the mouse or tap 1–5, release to draw.
  if (input.down('KeyQ')) {
    if (!G.weaponsSys.open) {
      document.exitPointerLock?.();
      G.weaponsSys.openWheel();
    }
    G.weaponsSys.selectByMouse(G.mouseX, G.mouseY);
    for (let i = 0; i < 5; i++) {
      if (input.hit('Digit' + (i + 1))) G.weaponsSys.selectSlot(i);
    }
  } else if (G.weaponsSys.open && !G.pinWheel) {
    G.weaponsSys.closeWheel(true);
    lockPointer();
  } else {
    // Quick weapon keys when the wheel is closed.
    for (let i = 0; i < 5; i++) {
      if (input.hit('Digit' + (i + 1))) applyWeapon(CFG.weaponOrder[i]);
    }
  }
  if (input.hit('KeyR')) G.combat.startReload(G);
  if (input.hit('KeyM')) { G.audio.ensure(); G.audio.nextStation(); G.hud.showHint('♪ ' + G.audio.stationName()); }
  if (input.hit('KeyF')) writeSave(G) && G.hud.showHint('Progress saved');

  // E does the nearest sensible thing: garage, gun shop, race start, car.
  if (input.hit('KeyE')) {
    if (G.menuOpen) {
      G.closeMenu();
    } else if (G.garageSys.nearPad()) {
      G.garageSys.open();
    } else if (!G.driving.active && G.activities.nearGunshop()) {
      G.activities.openShop();
    } else if (G.driving.active && G.activities.nearestRaceStart() >= 0 && !G.activities.race) {
      G.activities.startRace(G.activities.nearestRaceStart());
    } else if (G.driving.active) {
      G.exitCar();
    } else {
      const parked = G.traffic.nearestParked(G.player.x, G.player.z, 6);
      const moving = parked || G.traffic.nearestTraffic(G.player.x, G.player.z, 6);
      if (moving) G.enterCar(moving);
    }
  }

  // Shooting / punching (never while the wheel is open).
  if (!G.weaponsSys.open) {
    if (G.weapon === 'fists') {
      if (input.mouseClicked || input.down('Mouse0')) G.combat.punch(G);
    } else if (CFG.weapons[G.weapon].auto ? input.mouseDown : input.mouseClicked) {
      G.combat.shoot(G, camera);
    }
  }

  // Movement. A race countdown freezes the car on the line.
  const raceFrozen = G.activities.race && G.activities.race.countdown > 0;
  let speedKmh = 0;
  if (G.driving.active) {
    if (!raceFrozen) speedKmh = G.driving.update(dt, input, G.time);
    G.driving.cameraTarget(camera, dt);
    if (Math.abs(G.driving.car.speed) > 20) G.police.addHeat(CFG.heatPerCrime.speeding * dt * 10);
    if (G.driving.nitroOn) G.effects.nitroFlame(G.driving.car.x, G.driving.car.z, G.driving.car.heading);
    // A wrecked ride explodes out from under the player.
    if (G.driving.car.health <= 0 && !G.driving.car.dead) {
      G.driving.car.dead = true;
      G.effects.explosion(G.driving.car.x, G.driving.car.z);
      G.audio.crash();
      G.toast('YOUR RIDE IS WRECKED');
      G.exitCar();
    }
  } else {
    G.player.update(dt, input, false);
    G.player.cameraTarget(camera, dt);
    // Slow health regen out of combat.
    if (G.time - G.lastDamageAt > 8 && G.player.health > 0 && G.player.health < CFG.playerHealth) {
      G.player.heal(2 * dt);
    }
  }
  G.traffic.update(dt, G.driving.active ? G.driving.car : null);
  G.peds.update(dt, G.player.x, G.player.z, { x: G.player.x, z: G.player.z });
  G.police.update(dt, G, G.time);
  G.combat.update(dt, G);
  G.missions.update(dt);
  G.activities.update(dt);
  G.effects.update(dt);
  G.audio.updateEngine(speedKmh, G.police.stars, dt);
  G.hud.update(dt);

  // Damage flash + death checks (regen timer tracks real damage events).
  if (G.player.health < prevHealth) G.lastDamageAt = G.time;
  prevHealth = G.player.health;
  if (G.player.health <= 0 && !G.wasted) { G.wasted = true; endScreen('wasted'); }
  if (G.busted) { G.busted = false; endScreen('busted'); }

  renderer.render(scene, camera);
  input.endFrame();
}

// Shot staging for screenshots (?shot=chase etc.) runs after the first frame.
requestAnimationFrame(frame);
const shot = params.get('shot');
if (shot) {
  setTimeout(() => {
    try { stageShot(G, shot); } catch (e) { console.error('shot staging failed', e); }
  }, 400);
}

// Make the game debuggable from the console and from automated play-tests.
window.__VELAMAR__ = G;
console.log('%cVELAMAR HEAT%c loaded — W/S drive · E enter car · Q weapon wheel · 8 jobs · 5-star police',
  'background:#ff7a3d;color:#fff;padding:2px 6px;border-radius:3px', '');
