// Screenshot staging: ?shot=chase|garage|race|mission (and ?seed=N) puts
// the game in a photogenic state after load, so the maker's 4 screenshots
// each show a different system at its best — and each frame shows several
// systems at once. The shots are real renders of the game itself: nothing
// is composited or borrowed.
import { Car } from './vehicles.js';

// Snap the camera to the chase position behind a car. The driving camera
// lerps toward it each frame, but under slow software rendering only a few
// frames run before the screenshot fires — starting from the menu orbit
// would leave the car out of frame. This matches driving.cameraTarget.
function snapChaseCam(G, car) {
  G.camera.position.set(
    car.pos.x - Math.sin(car.heading) * 11,
    4.6,
    car.pos.z - Math.cos(car.heading) * 11,
  );
  G.camera.lookAt(
    car.pos.x + Math.sin(car.heading) * 12,
    2.0,
    car.pos.z + Math.cos(car.heading) * 12,
  );
}
export function stageShot(G, name) {
  // Screenshot runs hide the transient banners so the frame reads clean.
  G.quietShots = true;
  if (name === 'start') {
    // Menu shot: the start screen over the city at golden hour.
    G.state = 'menu';
    G.camera.position.set(-40, 26, 190);
    G.camera.lookAt(0, 12, 0);
    return;
  }
  // Keep the throttle on for staged screenshot runs (no human at the keys).
  if (name === 'play' || name === 'chase' || name === 'race') G.input.keys.add('KeyW');
  if (name === 'play') {
    // Driving through Downtown Vela at speed, traffic ahead, HUD + minimap on.
    G.startGame(false);
    const car = G.traffic.nearestParked(0, 30, 60) || G.traffic.cars[0];
    if (car) {
      G.enterCar(car);
      car.pos.set(0, 0, 150); // avenue x=0, heading north into the city
      car.heading = Math.PI;
      car.speed = 26;
      snapChaseCam(G, car);
    }
    G.missions.start(1);
    G.player.pos.set(0, 0, 120);
    return;
  }
  if (name === 'chase') {
    // 3-star chase: police cars + helicopter, minimap full of blue blips.
    G.startGame(false);
    const car = G.traffic.nearestParked(0, 30, 60) || G.traffic.cars[0];
    if (car) {
      G.enterCar(car);
      car.pos.set(-60, 0, 60); // east-west road z=60, heading east
      car.heading = Math.PI / 2;
      car.speed = 30;
      snapChaseCam(G, car);
    }
    G.police.addHeat(3.2);
    G.police.update(0.5, G, G.time + 1);
    G.police.update(0.5, G, G.time + 2);
    // Put one cruiser ahead of the player so the frame shows the chase,
    // not just the stars: it turns back toward the player and passes by.
    const pc = G.police.cars[0];
    if (pc) { pc.pos.set(-20, 0, 60); pc.speed = 0; }
    G.missions.start(2);
    return;
  }
  if (name === 'garage') {
    // The Calle Sol garage with the tuning menu open over a tuned sportscar.
    G.startGame(false);
    G.cash = 5200;
    const car = new Car(G.scene, 'sport', 0xd9382b, 120, 60, Math.PI / 2, {
      upgrades: { engine: 2, armor: 1, tires: 1, nitro: true },
    });
    G.enterCar(car);
    car.speed = 0;
    G.player.pos.set(120, 0, 60);
    G.garageSys.open();
    return;
  }
  if (name === 'race') {
    // Mid-race on the Downtown Loop: checkpoint ring ahead, timer on the HUD.
    G.startGame(false);
    const car = G.traffic.nearestParked(0, -30, 80) || G.traffic.cars[0];
    if (car) {
      G.enterCar(car);
      car.pos.set(0, 0, -30);
      car.heading = 0;
      car.speed = 28;
      snapChaseCam(G, car);
    }
    G.activities.startRace(0);
    G.activities.race.countdown = 0; // skip the countdown for the shot
    G.activities.race.t = 12.4;
    G.missions.start(1);
    return;
  }
  if (name === 'mission') {
    // Shootout on Calle Sol with the weapon wheel open: mission 5, enemies
    // visible, objective and wheel on the HUD.
    G.startGame(false);
    G.player.pos.set(120, 0, 96);
    G.player.heading = Math.PI; // face north, toward the Tiburones
    G.player.camYaw = 0; // camera south of the player, looking north
    G.weapons = ['fists', 'pistol', 'smg', 'shotgun', 'rifle'];
    G.weapon = 'shotgun';
    G.ammo = 6;
    G.reserve = 30;
    // Pin the wheel open for the shot: the frame loop normally closes it
    // the moment Q is released, and a staged run has no one holding Q.
    G.pinWheel = true;
    G.weaponsSys.openWheel();
    G.weaponsSys.selection = 'shotgun';
    G.weaponsSys.render();
    G.missions.start(5);
    G.missions.stepIndex = 1;
    G.missions.enterStep();
    G.combat.spawnEnemy(120, 70);
    G.combat.spawnEnemy(112, 66);
    G.combat.spawnEnemy(128, 64);
    return;
  }
}
