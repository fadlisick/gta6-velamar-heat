// VELAMAR HEAT — tuning and world constants. One place for every number the
// other modules share, so a balance pass touches this file only.
export const CFG = {
  title: 'VELAMAR HEAT',
  city: 'Velamar Bay',
  // City grid: blocks of BLOCK metres with STREET-wide roads between them.
  block: 46,
  street: 14,
  blocks: 3, // roads at -3..3 steps -> city spans about +/- 210 m
  // Player
  walkSpeed: 6.5,
  runSpeed: 11,
  jumpSpeed: 8.5,
  playerHealth: 100,
  // Driving (arcade)
  carAccel: 26,
  carBrake: 42,
  carReverse: 14,
  carMaxSpeed: 46, // ~165 km/h
  carTurn: 1.9,
  carGrip: 6.5,
  // Wanted
  wantedMax: 5,
  heatDecayPerSec: 0.045, // stars fall when unseen and quiet
  heatPerCrime: { steal: 1, kill: 1, shoot: 0.35, speeding: 0.02 },
  policeCarSpeed: 34,
  policeCarSpeedPerStar: 2.5,
  heliAtStars: 3,
  bustDistance: 3.2,
  // Combat
  weapons: {
    fists: { name: 'FISTS', damage: 12, rate: 0.45, range: 2.6, auto: false, ammo: Infinity },
    pistol: { name: 'PISTOL', damage: 34, rate: 0.28, range: 70, auto: false, ammo: 12, reserve: 72 },
    smg: { name: 'SMG', damage: 18, rate: 0.085, range: 55, auto: true, ammo: 30, reserve: 120 },
  },
  // Traffic / pedestrians
  trafficCars: 16,
  pedestrians: 26,
  // Economy
  startCash: 120,
  missionReward: [400, 650, 900, 1200, 1600, 2200, 3000, 5000],
  // Day cycle: the game opens at golden hour and the sun barely moves.
  startClockMin: 18 * 60 + 42,
  clockRate: 0.35, // game minutes per real second
};

export const DISTRICTS = [
  { name: 'Old Marina', cx: -120, cz: 120 },
  { name: 'Palmera Row', cx: 0, cz: 120 },
  { name: 'Calle Sol', cx: 120, cz: 60 },
  { name: 'The Docks', cx: -120, cz: -60 },
  { name: 'Downtown Vela', cx: 0, cz: 0 },
  { name: 'Neon Mile', cx: 120, cz: -60 },
  { name: 'Sunset Beach', cx: 0, cz: 210 },
];

export const PALETTE = {
  building: [0xd9a066, 0xc97b5a, 0xe8c98f, 0x9fb8c8, 0xf2e3c9, 0xb5654d, 0x7fa88f, 0xd97b8f, 0x8fa3bf, 0xe0b25f],
  roof: [0x8a4b3a, 0x5a6b7a, 0x3d4a5a, 0x7a5a3a],
  car: [0xd9382b, 0x2b6fd9, 0xf2c230, 0x2bd97b, 0xe8e8e8, 0x222226, 0x8a2bd9, 0xff7a2b, 0x3dd9d9, 0xc22b6e],
  pedShirt: [0xff5a5a, 0x5aff8a, 0x5a8aff, 0xffe25a, 0xff8ad9, 0x8affea, 0xffffff, 0x2b2b33],
  palm: 0x2e7d4f,
  sand: 0xe8cf9a,
  sea: 0x1d6f8f,
  road: 0x2e2e38,
  sidewalk: 0x8f8a80,
};

// Road centre coordinates along one axis (streets run both ways).
export function roadCenters() {
  const step = CFG.block + CFG.street;
  const out = [];
  for (let i = -CFG.blocks; i <= CFG.blocks; i++) out.push(i * step);
  return out;
}
export function cityHalf() {
  return CFG.blocks * (CFG.block + CFG.street) + CFG.block / 2 + CFG.street;
}
