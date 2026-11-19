// Screenshot staging: ?shot=start|play|chase|mission (and ?seed=N) puts the
// game in a photogenic state after load, so the maker's 4 screenshots each
// show a different system at its best. The shots are real renders of the
// game itself — nothing is composited or borrowed.
export function stageShot(G, name) {
  const city = G.city;
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
  if (name === 'play' || name === 'chase') G.input.keys.add('KeyW');
  if (name === 'play') {
    // Driving through Downtown Vela at speed, traffic ahead, HUD + minimap on.
    G.startGame(false);
    const car = G.traffic.nearestParked(0, 30, 60) || G.traffic.cars[0];
    if (car) {
      G.enterCar(car);
      car.pos.set(0, 0, 150); // avenue x=0, heading north into the city
      car.heading = Math.PI;
      car.speed = 26;
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
    }
    G.police.addHeat(3.2);
    G.police.update(0.5, G, G.time + 1);
    G.police.update(0.5, G, G.time + 2);
    G.missions.start(2);
    return;
  }
  if (name === 'mission') {
    // Shootout on Calle Sol: mission 5, enemies visible, objective on HUD.
    G.startGame(false);
    G.player.pos.set(120, 0, 96);
    G.player.heading = Math.PI; // face north, toward the Tiburones
    G.player.camYaw = 0; // camera south of the player, looking north
    G.weapon = 'smg';
    G.ammo = 30; G.reserve = 120;
    G.weapons = ['fists', 'pistol', 'smg'];
    G.missions.start(5);
    G.missions.stepIndex = 1;
    G.missions.enterStep();
    G.combat.spawnEnemy(120, 70);
    G.combat.spawnEnemy(112, 66);
    G.combat.spawnEnemy(128, 64);
    return;
  }
}
