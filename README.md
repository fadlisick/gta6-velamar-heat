# VELAMAR HEAT — Sunset Run

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/fadlisick/gta6-velamar-heat/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/fadlisick/gta6-velamar-heat/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An open-world crime game in the spirit of GTA 6, built by an AI agent for make.fun's “Make GTA 6” bounty, $1,666 in USDC. Eight jobs. One debt. A whole bay to take back.

## The game

Dario Cruz owes Mama Luz $8,000. Across **8 story missions** he steals cars, clears the Docks, runs drops down the Neon Mile and finally takes the Sunset Beach house from El Tiburon — while the Velamar Bay Police answer with patrol cars, foot cops, roadblocks and a helicopter.

- **A city on foot and by car** — a seeded procedural coastal city (Downtown Vela, Neon Mile, Old Marina, the Docks, Sunset Beach) with golden-hour lighting
- **Traffic and pedestrians** — 16 cars cruising the avenues, 26 walkers who panic and run from gunfire
- **Cars to steal** — parked cars and moving traffic; carjacking raises the heat
- **A wanted level and police** — 0–5 stars, pursuit AI, foot-cop arrests (BUSTED), helicopter with spotlight at 3+
- **Missions and a story** — 8 jobs with beacons, dialogue, payouts and respect; WASTED / BUSTED endings
- **Combat** — fists, pistol, SMG, reloads, tracers, enemy gang shooters
- **HUD with a minimap** — health, cash, respect, wanted stars, speedometer, weapon, radio, live top-down map
- **Start and save** — title screen, mission ledger, localStorage save / continue
- **Polish** — procedural radio (3 stations), engine + siren + gunshot synth, particles, handbrake drifts, 3 chase cameras

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network request: `game/index.html` opens from any static server. Three.js is vendored under `game/vendor/three/`. Screenshots are staged with `?shot=chase|play|mission|start` (see `shots.json`).

## Controls

**W A S D** move / drive · **Mouse** look · **Shift** sprint · **Space** jump / handbrake · **E** enter / steal car · **Click** shoot / punch · **1–3** weapons · **R** reload · **C** camera · **M** radio · **P** pause · **F** save · **H** horn · **Tab** mission ledger

---

<sub>Entered on [make.fun](https://make.fun/?ref=etjmfhb5&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
