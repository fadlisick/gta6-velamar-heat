// The story: eight jobs to clear Dario's debt to Mama Luz and take Velamar
// Bay back from Los Tiburones. Each mission is a chain of steps — drive,
// steal, chase, shoot, deliver, escape — with a beacon, dialogue and a
// payout. The ledger (Tab) lists them; finishing all eight ends the debt.
import { CFG } from './config.js';

export const MISSIONS = [
  {
    id: 1, name: 'First Light', giver: 'MAMA LUZ',
    intro: 'You owe me $8,000, Dario. Start small: my courier van is parked by the Old Marina. Bring it to the garage on Calle Sol — and don\'t scratch it.',
    steps: [
      { type: 'goto', x: -150, z: 150, text: 'Get to the courier van at the Old Marina' },
      { type: 'steal', x: -150, z: 150, text: 'Take the van (E to get in)' },
      { type: 'deliver', x: 120, z: 60, text: 'Deliver the van to the Calle Sol garage' },
    ],
    reward: 400,
  },
  {
    id: 2, name: 'Hot Wheels', giver: 'MAMA LUZ',
    intro: 'A Tiburon sportscar is parked on the Neon Mile. They took my nephew\'s bike — take their car. Bring it to me in one piece, and mind the cops.',
    steps: [
      { type: 'goto', x: 150, z: -60, text: 'Find the Tiburon sportscar on the Neon Mile' },
      { type: 'steal', x: 150, z: -60, text: 'Steal the sportscar — the cops will notice' },
      { type: 'deliver', x: 0, z: 0, text: 'Lose the heat, then bring the car to Downtown Vela' },
    ],
    reward: 650,
  },
  {
    id: 3, name: 'Dockside Debt', giver: 'RICO',
    intro: 'Tiburones are shaking down the dock workers. Go to the Docks, show them the bay has a new answer, and make sure their lieutenant walks away with the message.',
    steps: [
      { type: 'goto', x: -120, z: -60, text: 'Head to the Docks' },
      { type: 'shoot', x: -120, z: -60, count: 4, text: 'Clear out the Tiburones (4 left)' },
      { type: 'goto', x: 0, z: 120, text: 'Report back to Rico on Palmera Row' },
    ],
    reward: 900,
  },
  {
    id: 4, name: 'The Long Way Home', giver: 'MAMA LUZ',
    intro: 'A buyer in Sunset Beach is waiting on a package. The cops have the beach road watched — take the back streets, keep it under 3 stars, and don\'t stop for anyone.',
    steps: [
      { type: 'goto', x: 0, z: 120, text: 'Pick up the package on Palmera Row' },
      { type: 'deliver', x: 0, z: 200, text: 'Deliver it to Sunset Beach — stay under 3 stars' },
    ],
    reward: 1200,
  },
  {
    id: 5, name: 'Turf War', giver: 'RICO',
    intro: 'Tonight we take Calle Sol back. Their crew holds the plaza — bring the SMG I left in the Downtown garage and take the ground, block by block.',
    steps: [
      { type: 'goto', x: 0, z: 0, text: 'Pick up the SMG at the Downtown garage' },
      { type: 'shoot', x: 120, z: 60, count: 6, text: 'Take Calle Sol (6 Tiburones left)' },
      { type: 'goto', x: 0, z: 0, text: 'Hold the plaza — meet Rico downtown' },
    ],
    reward: 1600,
  },
  {
    id: 6, name: 'The Getaway', giver: 'MAMA LUZ',
    intro: 'My driver got pinched. You drive the getaway: pick up the crew at the Docks, then lose a 4-star tail before the bridge. If the car dies, so does the job.',
    steps: [
      { type: 'goto', x: -120, z: -60, text: 'Pick up the crew at the Docks' },
      { type: 'escape', x: 150, z: 150, text: 'Escape the police — reach the Old Marina hideout' },
    ],
    reward: 2200,
  },
  {
    id: 7, name: 'Neon Mile Run', giver: 'RICO',
    intro: 'Three drops, one night, the whole Mile watching. Hit the Neon Mile, Palmera Row and the Marina — fast. The Tiburones will try to stop the second drop.',
    steps: [
      { type: 'deliver', x: 150, z: -60, text: 'Drop 1/3 — Neon Mile' },
      { type: 'shoot', x: 0, z: 120, count: 3, text: 'Ambush on Palmera Row — clear them (3 left)' },
      { type: 'deliver', x: -150, z: 150, text: 'Drop 3/3 — Old Marina' },
    ],
    reward: 3000,
  },
  {
    id: 8, name: 'Sunset Ledger', giver: 'MAMA LUZ',
    intro: 'El Tiburon himself is at the Sunset Beach house, counting my money. End this, Dario. Take the house, take the ledger, and the bay is yours.',
    steps: [
      { type: 'goto', x: 0, z: 200, text: 'Reach the beach house at Sunset Beach' },
      { type: 'shoot', x: 0, z: 205, count: 8, text: 'Take the house (8 guards left)' },
      { type: 'deliver', x: 0, z: 0, text: 'Bring the ledger home to Downtown Vela' },
    ],
    reward: 5000,
  },
];

export class MissionManager {
  constructor(G) {
    this.G = G;
    this.current = null; // mission object
    this.stepIndex = 0;
    this.stepState = null;
    this.beacon = null; // THREE.Mesh, set by main
    this.killsLeft = 0;
  }

  get active() { return this.current !== null; }
  get step() { return this.current ? this.current.steps[this.stepIndex] : null; }

  get nextMission() {
    const done = this.G.missionsDone;
    return MISSIONS.find((m) => !done.includes(m.id)) || null;
  }

  start(id) {
    const m = MISSIONS.find((x) => x.id === id);
    if (!m) return false;
    this.current = m;
    this.stepIndex = 0;
    this.enterStep();
    this.G.say(m.giver, m.intro);
    this.G.hud?.setMission(m.name, m.steps[0].text);
    return true;
  }

  enterStep() {
    const s = this.step;
    if (!s) return;
    if (s.type === 'shoot') {
      this.killsLeft = s.count;
      this.G.combat.clearEnemies();
      for (let i = 0; i < s.count + 1; i++) {
        const a = (i / (s.count + 1)) * Math.PI * 2;
        this.G.combat.spawnEnemy(s.x + Math.sin(a) * 16, s.z + Math.cos(a) * 16);
      }
    }
    if (s.type === 'escape') {
      this.G.police.addHeat(4 - this.G.police.heat);
    }
    // A steal step needs a car at the marker; the traffic system keeps
    // parked cars along every curb, and the marker guides the player to one.
    this.G.hud?.setMission(this.current.name, this.stepText());
    this.G.audio?.missionPing();
  }

  stepText() {
    const s = this.step;
    if (!s) return '';
    if (s.type === 'shoot') return s.text.replace(/\(\d+ left\)/, `(${this.killsLeft} left)`);
    return s.text;
  }

  markerPos() {
    const s = this.step;
    return s ? { x: s.x, z: s.z } : null;
  }

  // Called every frame; returns nothing, completes steps as they land.
  update(dt) {
    if (!this.current) return;
    const G = this.G;
    const s = this.step;
    if (!s) return;
    const px = G.player.x;
    const pz = G.player.z;
    const inCar = G.driving.active;
    const carPos = inCar ? { x: G.driving.car.x, z: G.driving.car.z } : { x: px, z: pz };
    const d = Math.hypot(carPos.x - s.x, carPos.z - s.z);
    if (s.type === 'goto' && d < 9) this.completeStep();
    else if (s.type === 'deliver' && d < 10) this.completeStep();
    else if (s.type === 'steal' && inCar && d < 26) this.completeStep();
    else if (s.type === 'escape' && d < 12 && G.police.stars === 0) this.completeStep();
    else if (s.type === 'shoot') {
      const dead = G.combat.enemies.filter((e) => e.dead).length;
      this.killsLeft = Math.max(0, s.count - dead);
      G.hud?.setMission(this.current.name, this.stepText());
      if (this.killsLeft <= 0) this.completeStep();
    }
    // Beacon bobs over the objective; HUD shows the distance.
    if (this.beacon) {
      this.beacon.position.set(s.x, 3 + Math.sin(G.time * 2) * 0.5, s.z);
      this.beacon.rotation.y += dt * 1.5;
    }
    G.hud?.setDistance(Math.round(d) + ' m');
  }

  completeStep() {
    const G = this.G;
    this.stepIndex += 1;
    G.audio?.stepDone();
    if (this.stepIndex >= this.current.steps.length) this.finishMission();
    else {
      this.enterStep();
      G.toast('OBJECTIVE UPDATED');
    }
  }

  finishMission() {
    const G = this.G;
    const m = this.current;
    G.cash += m.reward;
    G.respect += 10 + m.id * 2;
    G.missionsDone.push(m.id);
    G.combat.clearEnemies();
    G.toast(`JOB DONE — +$${m.reward.toLocaleString()}`);
    G.say('MAMA LUZ', m.id === 8
      ? 'The ledger is ours. The bay is yours now, Dario. Velamar Heat — that\'s your name on every wall from the Marina to the Mile.'
      : 'Good work. The next job is already waiting when you are.');
    G.audio?.missionDone();
    G.saveGame();
    this.current = null;
    this.stepIndex = 0;
    G.hud?.setMission(null);
    // Chain the next job after a beat.
    setTimeout(() => {
      if (!this.current && !G.over) {
        const n = this.nextMission;
        if (n) G.hud?.showHint(`Next job: ${n.name} — drive to the yellow marker, or press TAB for the Ledger`);
      }
    }, 4000);
  }
}
