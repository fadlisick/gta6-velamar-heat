// HUD: DOM readouts (health, cash, wanted stars, weapon, speed, radio) and
// a canvas minimap — the whole city from above with the player arrow, the
// mission marker, police blips, traffic dots and the beach.
import { CFG } from './config.js';

export class Hud {
  constructor(G) {
    this.G = G;
    this.el = {};
    for (const id of ['hud', 'stars', 'cash', 'respect', 'clock', 'healthbarFill', 'armorbarFill',
      'objective', 'mname', 'mtext', 'mdist', 'minimap', 'speedo', 'speed', 'gear',
      'wname', 'wammo', 'station', 'track', 'hint', 'crosshair', 'toast', 'dialogue', 'dwho', 'dtext', 'damage']) {
      this.el[id] = document.getElementById(id);
    }
    this.map = this.el.minimap.getContext('2d');
    this.toastUntil = 0;
    this.dialogueUntil = 0;
    this.hintUntil = 0;
  }

  show() { this.el.hud.classList.remove('hidden'); }
  hide() { this.el.hud.classList.add('hidden'); }

  toast(text, secs = 2.4) {
    this.el.toast.textContent = text;
    this.toastUntil = this.G.time + secs;
  }
  showHint(text, secs = 5) {
    this.el.hint.textContent = text;
    this.el.hint.classList.remove('hidden');
    this.hintUntil = this.G.time + secs;
  }
  say(who, text, secs = 6) {
    this.el.dwho.textContent = who;
    this.el.dtext.textContent = text;
    this.el.dialogue.classList.remove('hidden');
    this.dialogueUntil = this.G.time + secs;
  }
  setMission(name, text) {
    if (!name) { this.el.objective.classList.add('hidden'); return; }
    this.el.objective.classList.remove('hidden');
    this.el.mname.textContent = name;
    this.el.mtext.textContent = text;
  }
  setDistance(d) { this.el.mdist.textContent = d; }

  update(dt) {
    const G = this.G;
    // Staged screenshot runs keep the transient banners out of the frame.
    if (G.quietShots) {
      this.el.dialogue.classList.add('hidden');
      this.el.toast.textContent = '';
      this.el.hint.classList.add('hidden');
    }
    // Wanted stars.
    const stars = G.police.stars;
    const spans = this.el.stars.children;
    for (let i = 0; i < 5; i++) spans[i].classList.toggle('off', i >= stars);
    this.el.stars.style.color = stars >= 3 ? '#ff5a5a' : '#ffd94d';
    this.el.cash.textContent = '$' + Math.round(G.cash).toLocaleString();
    this.el.respect.textContent = 'RESPECT ' + Math.round(G.respect) + '  ·  ' + G.city.districtAt(G.player.x, G.player.z).toUpperCase();
    const hh = Math.floor(G.clockMin / 60) % 24;
    const mm = Math.floor(G.clockMin % 60);
    this.el.clock.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} · VELAMAR BAY`;
    this.el.healthbarFill.style.width = Math.max(0, G.player.health) + '%';
    this.el.armorbarFill.style.width = Math.max(0, G.player.armor) + '%';
    // Weapon.
    const w = CFG.weapons[G.weapon];
    this.el.wname.textContent = w.name;
    this.el.wammo.textContent = w.ammo === Infinity ? '∞' : `AMMO ${G.ammo} / ${G.reserve}`;
    if (G.time >= this.toastUntil) this.el.toast.textContent = '';
    if (G.time >= this.dialogueUntil) this.el.dialogue.classList.add('hidden');
    if (G.time >= this.hintUntil) this.el.hint.classList.add('hidden');
    // Speedometer (driving only).
    if (G.driving.active) {
      this.el.speedo.classList.remove('hidden');
      const kmh = Math.round(Math.abs(G.driving.car.speed) * 3.6);
      this.el.speed.innerHTML = `${kmh} <small>km/h</small>`;
      this.el.gear.textContent = G.driving.car.speed > 1 ? 'DRIVE' : G.driving.car.speed < -1 ? 'REVERSE' : 'PARK';
    } else {
      this.el.speedo.classList.add('hidden');
    }
    this.el.crosshair.style.display = (!G.driving.active && G.weapon !== 'fists') ? 'block' : 'none';
    // Radio.
    this.el.station.textContent = G.audio.stationName();
    this.el.track.textContent = '— ' + G.audio.trackName();
    // Damage flash.
    this.el.damage.style.opacity = G.damageFlash > 0 ? String(Math.min(1, G.damageFlash)) : '0';
    G.damageFlash = Math.max(0, G.damageFlash - dt * 2.2);
    this.drawMinimap();
  }

  drawMinimap() {
    const G = this.G;
    const ctx = this.map;
    const S = 218;
    const half = G.city.half + 30;
    const toMap = (x, z) => [S / 2 + (x / half) * (S / 2 - 6), S / 2 + (z / half) * (S / 2 - 6)];
    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = '#0d2b45';
    ctx.fillRect(0, 0, S, S);
    // Sea + beach at the bottom (south).
    const [, beachY] = toMap(0, G.city.half);
    ctx.fillStyle = '#1d6f8f';
    ctx.fillRect(0, beachY, S, S - beachY);
    ctx.fillStyle = '#e8cf9a';
    ctx.fillRect(0, beachY - 4, S, 6);
    // Roads.
    ctx.strokeStyle = '#3a3a48';
    ctx.lineWidth = 5;
    for (const c of G.city.roadCenters) {
      const [x1, y1] = toMap(c, -half);
      const [x2, y2] = toMap(c, half);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      const [x3, y3] = toMap(-half, c);
      const [x4, y4] = toMap(half, c);
      ctx.beginPath(); ctx.moveTo(x3, y3); ctx.lineTo(x4, y4); ctx.stroke();
    }
    // Buildings as blocks.
    ctx.fillStyle = '#5a6b7a';
    for (const b of G.city.buildings) {
      const [x, y] = toMap(b.x, b.z);
      const w = Math.max(2, (b.hw * 2 / half) * (S / 2));
      const h = Math.max(2, (b.hd * 2 / half) * (S / 2));
      ctx.fillRect(x - w / 2, y - h / 2, w, h);
    }
    // Mission marker (pulsing yellow diamond).
    const mp = G.missions.markerPos();
    if (mp) {
      const [x, y] = toMap(mp.x, mp.z);
      const r = 7 + Math.sin(G.time * 5) * 2;
      ctx.fillStyle = '#ffd94d';
      ctx.beginPath();
      ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    // Traffic (white dots) and police (flashing blue/red).
    ctx.fillStyle = '#ffffff';
    for (const c of G.traffic.cars) {
      const [x, y] = toMap(c.x, c.z);
      ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
    }
    for (const c of G.police.cars) {
      const [x, y] = toMap(c.x, c.z);
      ctx.fillStyle = Math.sin(G.time * 9) > 0 ? '#ff2a2a' : '#2a6eff';
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    }
    if (G.police.heli) {
      const [x, y] = toMap(G.police.heli.position.x, G.police.heli.position.z);
      ctx.fillStyle = '#2a6eff';
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
    }
    // Player arrow (rotates with heading / car heading).
    const heading = G.driving.active ? G.driving.car.heading : G.player.heading;
    const [px, py] = toMap(G.player.x, G.player.z);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(heading);
    ctx.fillStyle = '#7dff9a';
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -8); ctx.lineTo(5.5, 6); ctx.lineTo(0, 3); ctx.lineTo(-5.5, 6);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    // North tick.
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('N', S / 2 - 4, 12);
  }
}
