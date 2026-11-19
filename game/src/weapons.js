// The weapon wheel: hold Q and a radial menu opens over the game. Aim the
// mouse at a slice, or tap 1–5, and let go of Q to draw that weapon. Guns
// the player does not own yet show locked; Ferro Arms sells them. Ammo
// boxes and vests come from the same shop.
import { CFG } from './config.js';

export class WeaponWheel {
  constructor(G) {
    this.G = G;
    this.open = false;
    this.selection = G.weapon;
  }

  owned(id) {
    return this.G.weapons.includes(id);
  }

  openWheel() {
    if (this.open) return;
    this.open = true;
    this.selection = this.G.weapon;
    document.getElementById('wheel').classList.remove('hidden');
    this.render();
  }

  closeWheel(confirm = true) {
    if (!this.open) return;
    this.open = false;
    document.getElementById('wheel').classList.add('hidden');
    if (confirm && this.owned(this.selection)) this.G.applyWeapon(this.selection);
  }

  // Mouse angle from the wheel centre picks a slice.
  selectByMouse(mx, my) {
    const el = document.getElementById('wheel');
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = mx - cx;
    const dy = my - cy;
    if (Math.hypot(dx, dy) < 30) return;
    let a = Math.atan2(dy, dx) + Math.PI / 2;
    if (a < 0) a += Math.PI * 2;
    const idx = Math.floor((a / (Math.PI * 2)) * CFG.weaponOrder.length) % CFG.weaponOrder.length;
    this.selection = CFG.weaponOrder[idx];
    this.render();
  }

  selectSlot(i) {
    const id = CFG.weaponOrder[i];
    if (id) {
      this.selection = id;
      this.render();
    }
  }

  render() {
    const G = this.G;
    const el = document.getElementById('wheel');
    const n = CFG.weaponOrder.length;
    el.innerHTML = CFG.weaponOrder.map((id, i) => {
      const w = CFG.weapons[id];
      const own = this.owned(id);
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      const x = 50 + Math.cos(angle) * 34;
      const y = 50 + Math.sin(angle) * 34;
      const ammo = id === 'fists' ? '∞' : own && G.weapon === id ? `${G.ammo} / ${G.reserve}` : '';
      const price = id === 'shotgun' ? `$${CFG.shop.shotgun}` : id === 'rifle' ? `$${CFG.shop.rifle}` : '';
      return `<div class="wslice ${this.selection === id ? 'sel' : ''} ${own ? '' : 'locked'}" style="left:${x}%;top:${y}%">`
        + `<b>${w.name}</b><span>${own ? ammo : 'LOCKED ' + price}</span></div>`;
    }).join('') + '<div class="wcenter">Q</div>';
  }

  buyWeapon(id) {
    const G = this.G;
    const price = CFG.shop[id];
    if (price === undefined) return false;
    if (this.owned(id)) return false;
    if (G.cash < price) {
      G.audio?.denied();
      G.toast('NOT ENOUGH CASH');
      return false;
    }
    G.cash -= price;
    G.weapons.push(id);
    G.applyWeapon(id);
    G.audio?.buy();
    G.toast(`${CFG.weapons[id].name} BOUGHT`);
    G.saveGame();
    return true;
  }

  buyAmmo() {
    const G = this.G;
    const w = CFG.weapons[G.weapon];
    if (!w || !w.reserve) {
      G.audio?.denied();
      return false;
    }
    if (G.cash < CFG.shop.ammoBox) {
      G.audio?.denied();
      G.toast('NOT ENOUGH CASH');
      return false;
    }
    G.cash -= CFG.shop.ammoBox;
    G.reserve = w.reserve;
    G.audio?.buy();
    G.toast('AMMO RESTOCKED');
    return true;
  }

  buyVest() {
    const G = this.G;
    if (G.cash < CFG.shop.vest) {
      G.audio?.denied();
      G.toast('NOT ENOUGH CASH');
      return false;
    }
    G.cash -= CFG.shop.vest;
    G.player.armor = Math.min(100, G.player.armor + 50);
    G.audio?.buy();
    G.toast('KEVLAR VEST — +50 ARMOR');
    return true;
  }
}
