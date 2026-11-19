// VELAMAR HEAT — every shared number lives here. Balance passes touch
// this file and nothing else: speeds, wanted heat, weapon stats, prices,
// race routes and the shape of the city itself.
export const CFG = {
  title: 'VELAMAR HEAT',
  city: 'Velamar Bay',
  // City layout: square blocks separated by streets, roads at every step.
  block: 46,
  street: 14,
  blocks: 3, // roads at -3..3 steps, city spans about +/- 210 m
  // Dario on foot
  walkSpeed: 6.5,
  runSpeed: 11,
  jumpSpeed: 8.5,
  playerHealth: 100,
  // Arcade driving
  carAccel: 26,
  carBrake: 42,
  carReverse: 14,
  carMaxSpeed: 46, // ~165 km/h
  carTurn: 1.9,
  carGrip: 6.5,
  nitroBoost: 1.35, // top-speed multiplier while nitro burns
  nitroDrain: 34, // juice per second
  nitroRegen: 7, // juice per second when not burning
  // Wanted level
  wantedMax: 5,
  heatDecayPerSec: 0.045, // stars fall when unseen and quiet
  heatPerCrime: { steal: 1, kill: 1, shoot: 0.35, speeding: 0.02 },
  policeCarSpeed: 34,
  policeCarSpeedPerStar: 2.5,
  heliAtStars: 3,
  bustDistance: 3.2,
  // Weapons. ammo = magazine size, reserve = spare carried rounds.
  // shotgun fires `pellets` rays in a cone; rifle is the long-range auto.
  weapons: {
    fists: { name: 'FISTS', damage: 12, rate: 0.45, range: 2.6, auto: false, ammo: Infinity },
    pistol: { name: 'PISTOL', damage: 34, rate: 0.28, range: 70, auto: false, ammo: 12, reserve: 72 },
    smg: { name: 'SMG', damage: 18, rate: 0.085, range: 55, auto: true, ammo: 30, reserve: 120 },
    shotgun: { name: 'SHOTGUN', damage: 11, pellets: 6, spread: 0.14, rate: 0.85, range: 32, auto: false, ammo: 6, reserve: 30 },
    rifle: { name: 'RIFLE', damage: 52, rate: 0.13, range: 130, auto: true, ammo: 30, reserve: 90 },
  },
  weaponOrder: ['fists', 'pistol', 'smg', 'shotgun', 'rifle'],
  // Shops and garage (Ferro Arms gun shop, Calle Sol garage).
  shop: {
    shotgun: 600,
    rifle: 1200,
    ammoBox: 80, // refills the current weapon's reserve to full
    vest: 250, // +50 armor
  },
  garage: {
    storeCap: 4,
    repairCost: 150,
    engine: [400, 900, 1600], // +12% top speed a level
    armor: [300, 700, 1200], // +50 max car health a level
    tires: [250, 600], // +grip and steering a level
    nitro: 800, // unlocks Shift boost while driving
  },
  // Street races: start pad, checkpoint ring positions, payout.
  races: [
    {
      name: 'Downtown Loop', reward: 300,
      start: { x: 0, z: -30 },
      points: [{ x: 120, z: -60 }, { x: 120, z: 120 }, { x: -120, z: 120 }, { x: -120, z: -60 }, { x: 0, z: -30 }],
    },
    {
      name: 'Beach Sprint', reward: 500,
      start: { x: -150, z: 150 },
      points: [{ x: 0, z: 200 }, { x: 150, z: 150 }, { x: 150, z: -60 }, { x: 0, z: -60 }],
    },
    {
      name: 'Neon Mile Dash', reward: 800,
      start: { x: 150, z: 60 },
      points: [{ x: 150, z: -120 }, { x: -60, z: -120 }, { x: -60, z: 120 }, { x: 150, z: 120 }],
    },
  ],
  // Hidden sunset tokens scattered through the city.
  collectibles: 12,
  tokenReward: 150,
  tokenBonus: 1000, // for finding all twelve
  // Traffic and pedestrians
  trafficCars: 16,
  pedestrians: 26,
  // Economy
  startCash: 120,
  missionReward: [400, 650, 900, 1200, 1600, 2200, 3000, 5000],
  // The game opens at golden hour and the clock barely moves.
  startClockMin: 18 * 60 + 42,
  clockRate: 0.35, // game minutes per real second
};

// Named neighbourhoods, used by the HUD district readout.
export const DISTRICTS = [
  { name: 'Old Marina', cx: -120, cz: 120 },
  { name: 'Palmera Row', cx: 0, cz: 120 },
  { name: 'Calle Sol', cx: 120, cz: 60 },
  { name: 'The Docks', cx: -120, cz: -60 },
  { name: 'Downtown Vela', cx: 0, cz: 0 },
  { name: 'Neon Mile', cx: 120, cz: -60 },
  { name: 'Sunset Beach', cx: 0, cz: 210 },
];

// Places you can walk or drive into: garage, gun shop, safehouse, race pads.
export const POIS = {
  garage: { x: 120, z: 60, r: 12 },
  gunshop: { x: 150, z: -60, r: 9 },
  safehouse: { x: 0, z: 120, r: 9 },
};

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

// Road centre lines along one axis; the grid runs both ways.
export function roadCenters() {
  const step = CFG.block + CFG.street;
  const out = [];
  for (let i = -CFG.blocks; i <= CFG.blocks; i++) out.push(i * step);
  return out;
}

// Half the city's built-up width, in metres.
export function cityHalf() {
  return CFG.blocks * (CFG.block + CFG.street) + CFG.block / 2 + CFG.street;
}
