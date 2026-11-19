// Save / load through localStorage. One small JSON blob: cash, respect,
// missions finished, owned weapons, garage cars with their upgrades, the
// sunset tokens found, race best times and the last position.
const KEY = 'velamar-heat-save-v1';

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (typeof s !== 'object' || !s) return null;
    return s;
  } catch {
    return null;
  }
}

export function writeSave(state) {
  try {
    const s = {
      cash: Math.round(state.cash),
      respect: Math.round(state.respect),
      missionsDone: [...state.missionsDone],
      weapons: [...state.weapons],
      garage: (state.garage || []).map((c) => ({
        color: c.color,
        model: c.model,
        upgrades: { ...(c.upgrades || { engine: 0, armor: 0, tires: 0, nitro: false }) },
      })),
      tokens: [...(state.tokensFound || [])],
      raceBest: { ...(state.raceBest || {}) },
      player: { x: state.player.pos.x, z: state.player.pos.z },
      clockMin: state.clockMin,
      savedAt: Date.now(),
    };
    localStorage.setItem(KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch { /* private mode */ }
}

export function saveLabel(s) {
  if (!s) return 'NO SAVE YET';
  const done = (s.missionsDone || []).length;
  return `$${(s.cash || 0).toLocaleString()} · ${done}/8 JOBS`;
}
