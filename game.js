const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const ui = {
  p1Lives: document.getElementById("p1-lives"),
  p2Lives: document.getElementById("p2-lives"),
  enemies: document.getElementById("enemies"),
  score: document.getElementById("score"),
  level: document.getElementById("level"),
  message: document.getElementById("message"),
};

const TILE = 32;
const GRID = 26;
const SIZE = TILE * GRID;
const HALF = TILE / 2;
const QUARTER = TILE / 2;
const TANK_SIZE = TILE - 8;
const SNAP_TOLERANCE = 2.5;
const TURN_SNAP = 320;
const BASE_RING_TILES = [
  [9, 24], [10, 24], [11, 24], [14, 24], [15, 24], [16, 24],
  [9, 25], [10, 25], [11, 25], [14, 25], [15, 25], [16, 25],
  [9, 23], [10, 23], [11, 23], [14, 23], [15, 23], [16, 23],
];

const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const ENEMY_TYPES = [
  { key: "basic", speed: 86, hp: 1, fireCooldown: 1.3, bulletSpeed: 280, score: 100, color: "#c96a45" },
  { key: "fast", speed: 118, hp: 1, fireCooldown: 1.0, bulletSpeed: 320, score: 200, color: "#e4a13e" },
  { key: "power", speed: 96, hp: 1, fireCooldown: 0.82, bulletSpeed: 380, score: 300, color: "#cf4343" },
  { key: "armor", speed: 78, hp: 3, fireCooldown: 1.15, bulletSpeed: 300, score: 400, color: "#95a1b6" },
];

const POWER_UP_TYPES = ["star", "shield", "grenade", "clock", "shovel", "life"];

const PLAYER_CONFIGS = [
  {
    id: "P1",
    x: SIZE / 2 - TILE,
    y: SIZE - TILE * 4.5,
    controls: { up: ["ArrowUp", "KeyW"], down: ["ArrowDown", "KeyS"], left: ["ArrowLeft", "KeyA"], right: ["ArrowRight", "KeyD"], fire: ["Space"] },
    body: "#d3b35c",
    accent: "#f5df96",
  },
  {
    id: "P2",
    x: SIZE / 2 + TILE,
    y: SIZE - TILE * 4.5,
    controls: { up: ["KeyI", "KeyI"], down: ["KeyK"], left: ["KeyJ"], right: ["KeyL"], fire: ["Enter"] },
    body: "#63a8cf",
    accent: "#b7dcf0",
  },
];

const LEVELS = [
  [
    "..........................",
    ".bbbb....ww....bbbb.......",
    ".b..b....ww....b..b.......",
    ".bbbb..........bbbb.......",
    "..........ss..............",
    "...ww..............ww.....",
    "...ww..bbbbbbbb....ww.....",
    ".......b......b...........",
    ".......b..ss..b....bbb....",
    "..bbbb.b......b....b.b....",
    "..b..b.bbbbbbbb....bbb....",
    "..bbbb.....g..............",
    "..........wwww............",
    "..ssss...........ssss.....",
    ".............gg...........",
    "....bbb....bbbb....bbb....",
    "....b.b....b..b....b.b....",
    "....bbb....bbbb....bbb....",
    "..........................",
    "......ww............ww....",
    "......ww....ss......ww....",
    "........ii....ii..........",
    "..........bbbb............",
    "..........b..b............",
    ".........bbEEbb...........",
    ".........bbHHbb...........",
  ],
  [
    "..........................",
    "..ggg.....wwww.....ggg....",
    "..g.g.....wiiw.....g.g....",
    "..ggg.....wwww.....ggg....",
    ".....bbbb........bbbb.....",
    ".....b..b........b..b.....",
    ".....bbbb..ssss..bbbb.....",
    "..........................",
    "...ww............ww.......",
    "...ww..bbbb..bbbbww.......",
    ".......b..b..b..b.........",
    "...gg..bbbb..bbbb..gg.....",
    "...gg.....................",
    ".........ssssss...........",
    "....................ii....",
    "...bbbb....ww....bbbb.....",
    "...b..b....ww....b..b.....",
    "...bbbb..........bbbb.....",
    ".........gggg.............",
    "......ss........ss........",
    "......ss........ss........",
    "...........ii.............",
    "..........bbbb............",
    ".........bb..bb...........",
    ".........bbEEbb...........",
    ".........bbHHbb...........",
  ],
  [
    "..........................",
    ".ssss....gg....ssss.......",
    ".siis....gg....siis.......",
    ".ssss....gg....ssss.......",
    "..........wwww............",
    "...bbbb..........bbbb.....",
    "...bggb..ssssss..bggb.....",
    "...bbbb..........bbbb.....",
    "........ww....ww..........",
    "..gg....ww....ww....gg....",
    "..gg..bbbb....bbbb..gg....",
    "......b..b....b..b........",
    "......bbbb....bbbb........",
    "..........................",
    "..iiii..............iiii..",
    "..i..i....gggg......i..i..",
    "..iiii....g..g......iiii..",
    "..........gggg............",
    "...ww................ww...",
    "...ww....ssssss......ww...",
    ".........s....s...........",
    ".........ssssss...........",
    "..........bbbb............",
    "..........b..b............",
    ".........bbEEbb...........",
    ".........bbHHbb...........",
  ],
];

const spawnPoints = [
  { x: 1, y: 1 },
  { x: 12, y: 1 },
  { x: 23, y: 1 },
];

canvas.width = SIZE;
canvas.height = SIZE;

const keys = new Set();
const keyPriority = [];

const state = {
  map: [],
  brickMasks: new Map(),
  bullets: [],
  enemies: [],
  explosions: [],
  spawnEffects: [],
  muzzleFlashes: [],
  dustPuffs: [],
  powerUps: [],
  players: [],
  score: 0,
  levelIndex: 0,
  enemiesLeft: 20,
  enemiesQueued: 20,
  enemyCap: 4,
  gameOver: false,
  win: false,
  spawnTimer: 0,
  freezeTimer: 0,
  baseFortifyTimer: 0,
  levelTransition: false,
  phase: "title",
  phaseTimer: 0,
  totalLevels: LEVELS.length,
};

function createMap(index) {
  return LEVELS[index].map((row) => row.split(""));
}

function brickKey(tx, ty) {
  return `${tx},${ty}`;
}

function initBrickMasks() {
  state.brickMasks = new Map();
  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      if (state.map[y][x] === "b") {
        state.brickMasks.set(brickKey(x, y), 15);
      }
    }
  }
}

function getBrickMask(tx, ty) {
  return state.brickMasks.get(brickKey(tx, ty)) ?? 0;
}

function setBrickMask(tx, ty, mask) {
  const key = brickKey(tx, ty);
  if (mask > 0) {
    state.brickMasks.set(key, mask);
    state.map[ty][tx] = "b";
  } else {
    state.brickMasks.delete(key);
    state.map[ty][tx] = ".";
  }
}

function normalizeLevelRows() {
  for (const level of LEVELS) {
    for (let i = 0; i < level.length; i += 1) {
      if (level[i].length !== GRID) {
        throw new Error(`Invalid level row length at level ${LEVELS.indexOf(level)} row ${i}`);
      }
    }
  }
}

function tankRect(tank, nextX = tank.x, nextY = tank.y) {
  return {
    x: nextX - TANK_SIZE / 2,
    y: nextY - TANK_SIZE / 2,
    w: TANK_SIZE,
    h: TANK_SIZE,
  };
}

function createPlayer(config) {
  return {
    kind: "player",
    id: config.id,
    x: config.x,
    y: config.y,
    spawnX: config.x,
    spawnY: config.y,
    dir: "up",
    speed: 0,
    maxSpeed: 150,
    accel: 480,
    friction: 620,
    shotCooldown: 0,
    alive: true,
    lives: 3,
    invulnerable: 2,
    spawnTimer: 1.2,
    level: 0,
    shieldTimer: 0,
    slipTimer: 0,
    body: config.body,
    accent: config.accent,
    controls: config.controls,
  };
}

function createEnemy(point, levelIndex) {
  const spec = ENEMY_TYPES[(state.enemiesLeft + levelIndex + Math.floor(Math.random() * 3)) % ENEMY_TYPES.length];
  return {
    kind: "enemy",
    type: spec.key,
    x: point.x * TILE + HALF,
    y: point.y * TILE + HALF,
    dir: "down",
    speed: 0,
    maxSpeed: spec.speed + levelIndex * 6,
    accel: 300,
    friction: 420,
    shotCooldown: 0.5 + Math.random() * 0.6,
    fireCooldown: Math.max(0.55, spec.fireCooldown - levelIndex * 0.04),
    bulletSpeed: spec.bulletSpeed + levelIndex * 10,
    moveTimer: 0.55 + Math.random() * 1.1,
    hp: spec.hp,
    score: spec.score,
    bonusCarrier: Math.random() < 0.18,
    spawnTimer: 1,
    alive: true,
    body: spec.color,
  };
}

function resetPlayers() {
  state.players = PLAYER_CONFIGS.map((config) => createPlayer(config));
}

function resetLevel(fullReset = false) {
  if (fullReset) {
    resetPlayers();
    state.levelIndex = 0;
    state.score = 0;
  }

  state.map = createMap(state.levelIndex);
  initBrickMasks();
  state.bullets = [];
  state.enemies = [];
  state.explosions = [];
  state.spawnEffects = [];
  state.muzzleFlashes = [];
  state.dustPuffs = [];
  state.powerUps = [];
  state.enemiesLeft = 20;
  state.enemiesQueued = 20;
  state.gameOver = false;
  state.win = false;
  state.spawnTimer = 0;
  state.freezeTimer = 0;
  state.baseFortifyTimer = 0;
  state.levelTransition = false;
  state.phase = fullReset ? "title" : "level_intro";
  state.phaseTimer = fullReset ? 0 : 1.8;

  for (const player of state.players) {
    player.x = player.spawnX;
    player.y = player.spawnY;
    player.dir = "up";
    player.speed = 0;
    player.shotCooldown = 0;
    player.invulnerable = 2;
    player.spawnTimer = 1.2;
    player.shieldTimer = 0;
    player.slipTimer = 0;
    player.alive = player.lives > 0;
    if (player.alive) {
      spawnFlash(player.x, player.y);
    }
  }

  ui.message.textContent = `РЈСЂРѕРІРµРЅСЊ ${state.levelIndex + 1}. РЈРЅРёС‡С‚РѕР¶СЊС‚Рµ РІСЃРµ С‚Р°РЅРєРё Рё Р±РµСЂРµРіРёС‚Рµ С€С‚Р°Р±.`;
  syncHud();
}

function syncHud() {
  ui.p1Lives.textContent = state.players[0]?.lives ?? 0;
  ui.p2Lives.textContent = state.players[1]?.lives ?? 0;
  ui.enemies.textContent = state.enemiesLeft;
  ui.score.textContent = state.score;
  ui.level.textContent = `${state.levelIndex + 1}/${state.totalLevels}`;
}

function tileAtPixel(x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || tx >= GRID || ty >= GRID) {
    return { tile: "s", tx, ty };
  }
  return { tile: state.map[ty][tx], tx, ty };
}

function isBrickBlocking(tx, ty, px, py) {
  const mask = getBrickMask(tx, ty);
  if (!mask) {
    return false;
  }
  const localX = ((px % TILE) + TILE) % TILE;
  const localY = ((py % TILE) + TILE) % TILE;
  const bit =
    localY < QUARTER
      ? (localX < QUARTER ? 1 : 2)
      : (localX < QUARTER ? 4 : 8);
  return (mask & bit) !== 0;
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y;
}

function rectHitsBrickMask(rect, tx, ty) {
  const mask = getBrickMask(tx, ty);
  if (!mask) {
    return false;
  }
  const quads = [
    { bit: 1, x: tx * TILE, y: ty * TILE, w: QUARTER, h: QUARTER },
    { bit: 2, x: tx * TILE + QUARTER, y: ty * TILE, w: QUARTER, h: QUARTER },
    { bit: 4, x: tx * TILE, y: ty * TILE + QUARTER, w: QUARTER, h: QUARTER },
    { bit: 8, x: tx * TILE + QUARTER, y: ty * TILE + QUARTER, w: QUARTER, h: QUARTER },
  ];
  for (const quad of quads) {
    if ((mask & quad.bit) !== 0 && rectsOverlap(rect, quad)) {
      return true;
    }
  }
  return false;
}

function sampleTiles(rect) {
  const samples = [];
  const xs = [rect.x + 1, rect.x + rect.w / 2, rect.x + rect.w - 1];
  const ys = [rect.y + 1, rect.y + rect.h / 2, rect.y + rect.h - 1];
  for (const px of xs) {
    for (const py of ys) {
      const hit = tileAtPixel(px, py);
      samples.push({ ...hit, px, py });
    }
  }
  return samples;
}

function rectHasBlockingTile(rect, bulletPower = 0) {
  const startX = Math.max(0, Math.floor(rect.x / TILE));
  const endX = Math.min(GRID - 1, Math.floor((rect.x + rect.w - 1) / TILE));
  const startY = Math.max(0, Math.floor(rect.y / TILE));
  const endY = Math.min(GRID - 1, Math.floor((rect.y + rect.h - 1) / TILE));

  for (let ty = startY; ty <= endY; ty += 1) {
    for (let tx = startX; tx <= endX; tx += 1) {
      const tile = state.map[ty][tx];
      if (tile === "b" && rectHitsBrickMask(rect, tx, ty)) {
        return true;
      }
      if (tile === "w" || tile === "E" || tile === "H") {
        return true;
      }
      if (tile === "s" && bulletPower < 2) {
        return true;
      }
    }
  }
  return false;
}

function tileEffectAtTank(tank) {
  const rect = tankRect(tank);
  const tiles = sampleTiles(rect).map((item) => item.tile);
  return {
    grass: tiles.includes("g"),
    ice: tiles.includes("i"),
  };
}

function tanksOverlap(a, b, nextAX = a.x, nextAY = a.y) {
  if (!b.alive || a === b) {
    return false;
  }
  const ra = tankRect(a, nextAX, nextAY);
  const rb = tankRect(b);
  return ra.x < rb.x + rb.w &&
    ra.x + ra.w > rb.x &&
    ra.y < rb.y + rb.h &&
    ra.y + ra.h > rb.y;
}

function allTanks() {
  return [...state.players, ...state.enemies];
}

function canMoveTank(tank, nx, ny) {
  const rect = tankRect(tank, nx, ny);
  if (rect.x < 0 || rect.y < 0 || rect.x + rect.w > SIZE || rect.y + rect.h > SIZE) {
    return false;
  }
  if (rectHasBlockingTile(rect, 0)) {
    return false;
  }
  for (const other of allTanks()) {
    if (other && tanksOverlap(tank, other, nx, ny)) {
      return false;
    }
  }
  return true;
}

function resolveTankPenetration(tank) {
  if (canMoveTank(tank, tank.x, tank.y)) {
    return true;
  }

  const offsets = [1, 2, 4, 6, 8, 10, 12, 14, 16];
  for (const amount of offsets) {
    const candidates = [
      { x: tank.x - amount, y: tank.y },
      { x: tank.x + amount, y: tank.y },
      { x: tank.x, y: tank.y - amount },
      { x: tank.x, y: tank.y + amount },
      { x: tank.x - amount, y: tank.y - amount },
      { x: tank.x + amount, y: tank.y - amount },
      { x: tank.x - amount, y: tank.y + amount },
      { x: tank.x + amount, y: tank.y + amount },
    ];
    for (const candidate of candidates) {
      if (canMoveTank(tank, candidate.x, candidate.y)) {
        tank.x = candidate.x;
        tank.y = candidate.y;
        return true;
      }
    }
  }

  return false;
}

function resolveAxisMove(tank, vx, vy, dt) {
  let x = tank.x;
  let y = tank.y;
  if (vx !== 0) {
    const distanceX = vx * dt;
    const stepsX = Math.max(1, Math.ceil(Math.abs(distanceX) / 4));
    const stepX = distanceX / stepsX;
    for (let i = 0; i < stepsX; i += 1) {
      const nextX = x + stepX;
      if (canMoveTank(tank, nextX, y)) {
        x = nextX;
      } else {
        tank.speed = 0;
        if (tank.kind === "enemy") {
          chooseEnemyDirection(tank);
        }
        break;
      }
    }
  }
  if (vy !== 0) {
    const distanceY = vy * dt;
    const stepsY = Math.max(1, Math.ceil(Math.abs(distanceY) / 4));
    const stepY = distanceY / stepsY;
    for (let i = 0; i < stepsY; i += 1) {
      const nextY = y + stepY;
      if (canMoveTank(tank, x, nextY)) {
        y = nextY;
      } else {
        tank.speed = 0;
        if (tank.kind === "enemy") {
          chooseEnemyDirection(tank);
        }
        break;
      }
    }
  }
  tank.x = x;
  tank.y = y;
}

function axisCenter(value) {
  return Math.floor(value / TILE) * TILE + HALF;
}

function snapAxis(current, dt) {
  const center = axisCenter(current);
  const delta = center - current;
  if (Math.abs(delta) <= SNAP_TOLERANCE) {
    return center;
  }
  const step = Math.sign(delta) * TURN_SNAP * dt;
  return Math.abs(step) >= Math.abs(delta) ? center : current + step;
}

function moveTowardAxis(tank, axis, target, dt) {
  const current = axis === "x" ? tank.x : tank.y;
  const delta = target - current;
  if (Math.abs(delta) <= SNAP_TOLERANCE) {
    if (axis === "x") {
      tank.x = target;
    } else {
      tank.y = target;
    }
    return true;
  }

  const step = Math.sign(delta) * Math.min(Math.abs(delta), TURN_SNAP * dt);
  const next = current + step;
  const ok = axis === "x"
    ? canMoveTank(tank, next, tank.y)
    : canMoveTank(tank, tank.x, next);

  if (ok) {
    if (axis === "x") {
      tank.x = next;
    } else {
      tank.y = next;
    }
  }

  return Math.abs((axis === "x" ? tank.x : tank.y) - target) <= SNAP_TOLERANCE;
}

function tryTurn(tank, desiredDir, dt) {
  resolveTankPenetration(tank);
  const horizontal = desiredDir === "left" || desiredDir === "right";
  if (horizontal) {
    return moveTowardAxis(tank, "y", axisCenter(tank.y), dt);
  }
  return moveTowardAxis(tank, "x", axisCenter(tank.x), dt);
}

function createBullet(tank) {
  const dir = DIRS[tank.dir];
  const power = tank.kind === "player" ? Math.min(2, tank.level) : tank.type === "power" ? 1 : 0;
  const speed = tank.bulletSpeed ?? (260 + power * 40);
  const radius = 5 + (power > 1 ? 1 : 0);
  let x = tank.x + dir.x * (TANK_SIZE / 2 + radius + 3);
  let y = tank.y + dir.y * (TANK_SIZE / 2 + radius + 3);

  for (let i = 0; i < 3; i += 1) {
    const hit = tileAtPixel(x, y);
    if (!["b", "s", "w", "E", "H"].includes(hit.tile)) {
      break;
    }
    x -= dir.x * 2;
    y -= dir.y * 2;
  }

  return {
    ownerKind: tank.kind,
    ownerId: tank.id ?? tank.type,
    x,
    y,
    vx: dir.x * speed,
    vy: dir.y * speed,
    radius,
    power,
    alive: true,
    color: tank.kind === "player" ? "#fff4bf" : "#ffd3c2",
  };
}

function fireBullet(tank) {
  if (!tank.alive || tank.shotCooldown > 0 || tank.spawnTimer > 0) {
    return;
  }
  const activeBullets = state.bullets.filter((bullet) => bullet.ownerId === (tank.id ?? tank.type) && bullet.alive).length;
  const bulletLimit = tank.kind === "player" && tank.level > 1 ? 2 : 1;
  if (activeBullets >= bulletLimit) {
    return;
  }
  const bullet = createBullet(tank);
  state.bullets.push(bullet);
  state.muzzleFlashes.push({
    x: bullet.x,
    y: bullet.y,
    dir: tank.dir,
    time: 0.12,
    color: tank.kind === "player" ? "#ffe8a8" : "#ffd3b4",
  });
  tank.shotCooldown = tank.kind === "player"
    ? Math.max(0.12, 0.33 - tank.level * 0.05)
    : tank.fireCooldown;
}

function explode(x, y, size = 18, color = "#ffcf66") {
  state.explosions.push({ x, y, time: 0.32, max: size, color });
}

function spawnFlash(x, y, color = "#e9f7ff") {
  state.spawnEffects.push({ x, y, time: 0.9, color });
}

function isPressed(list) {
  return list.some((code) => keys.has(code));
}

function getDesiredDirection(controls) {
  for (let i = keyPriority.length - 1; i >= 0; i -= 1) {
    const code = keyPriority[i];
    if (controls.up.includes(code) && keys.has(code)) {
      return "up";
    }
    if (controls.down.includes(code) && keys.has(code)) {
      return "down";
    }
    if (controls.left.includes(code) && keys.has(code)) {
      return "left";
    }
    if (controls.right.includes(code) && keys.has(code)) {
      return "right";
    }
  }
  return null;
}

function updatePlayerMotion(player, dt) {
  if (!player.alive || state.gameOver || state.phase === "title" || state.phase === "paused" || state.phase === "level_intro") {
    return;
  }

  const desiredDir = getDesiredDirection(player.controls);

  const tileEffect = tileEffectAtTank(player);
  const friction = tileEffect.ice ? player.friction * 0.28 : player.friction;

  if (desiredDir) {
    const aligned = desiredDir === player.dir ? true : tryTurn(player, desiredDir, dt);
    player.dir = desiredDir;
    if (aligned) {
      player.speed = Math.min(player.maxSpeed, player.speed + player.accel * dt);
    } else {
      player.speed = Math.max(player.speed * 0.92, player.maxSpeed * 0.2);
    }
  } else {
    player.speed = Math.max(0, player.speed - friction * dt);
  }

  if (player.speed > 0) {
    const dir = DIRS[player.dir];
    resolveAxisMove(player, dir.x * player.speed, dir.y * player.speed, dt);
    if (player.speed > player.maxSpeed * 0.45) {
      state.dustPuffs.push({
        x: player.x - dir.x * 10 + (Math.random() * 8 - 4),
        y: player.y - dir.y * 10 + (Math.random() * 8 - 4),
        time: 0.26,
        size: 6 + Math.random() * 4,
        color: player.kind === "player" ? "rgba(231, 214, 174, 0.32)" : "rgba(180, 170, 160, 0.22)",
      });
    }
  }

  if (!canMoveTank(player, player.x, player.y)) {
    resolveTankPenetration(player);
  }

  if (isPressed(player.controls.fire)) {
    fireBullet(player);
  }
}

function chooseEnemyDirection(enemy) {
  const directions = ["up", "down", "left", "right"];
  const towardBase = Math.random() < 0.5 ? "down" : directions[Math.floor(Math.random() * directions.length)];
  enemy.dir = towardBase;
}

function spawnEnemy() {
  const available = spawnPoints.find((point) => {
    const probe = createEnemy(point, state.levelIndex);
    return canMoveTank(probe, probe.x, probe.y);
  });
  if (!available) {
    return;
  }
  state.enemies.push(createEnemy(available, state.levelIndex));
  const enemy = state.enemies[state.enemies.length - 1];
  spawnFlash(enemy.x, enemy.y, "#ffd7b8");
  state.enemiesQueued -= 1;
  state.spawnTimer = Math.max(0.75, 1.5 - state.levelIndex * 0.12);
}

function updateEnemies(dt) {
  if (state.phase === "title" || state.phase === "paused" || state.phase === "level_intro") {
    return;
  }
  if (state.freezeTimer <= 0) {
    state.spawnTimer -= dt;
    if (state.enemiesQueued > 0 && state.enemies.length < state.enemyCap && state.spawnTimer <= 0) {
      spawnEnemy();
    }
  }

  for (const enemy of state.enemies) {
    if (!enemy.alive) {
      continue;
    }
    if (state.freezeTimer > 0) {
      continue;
    }
    if (enemy.spawnTimer > 0) {
      continue;
    }

    enemy.moveTimer -= dt;
    if (enemy.moveTimer <= 0) {
      chooseEnemyDirection(enemy);
      enemy.moveTimer = 0.35 + Math.random() * 1.0;
    }

    enemy.speed = Math.min(enemy.maxSpeed, enemy.speed + enemy.accel * dt);
    const dir = DIRS[enemy.dir];
    resolveAxisMove(enemy, dir.x * enemy.speed, dir.y * enemy.speed, dt);
    if (!canMoveTank(enemy, enemy.x, enemy.y)) {
      resolveTankPenetration(enemy);
    }

    const front = tileAtPixel(enemy.x + dir.x * HALF, enemy.y + dir.y * HALF).tile;
    if ((front === "w" || front === "s") && Math.random() < 0.02) {
      chooseEnemyDirection(enemy);
    }
    if (Math.random() < 0.012 + state.levelIndex * 0.002) {
      fireBullet(enemy);
    }
  }

  state.enemies = state.enemies.filter((enemy) => enemy.alive);
}

function applyBaseFortress(tile) {
  for (const [tx, ty] of BASE_RING_TILES) {
    if (state.map[ty][tx] !== "E" && state.map[ty][tx] !== "H") {
      if (tile === "b") {
        setBrickMask(tx, ty, 15);
      } else {
        state.brickMasks.delete(brickKey(tx, ty));
        state.map[ty][tx] = tile;
      }
    }
  }
}

function damageTile(tx, ty, bulletPower = 0) {
  const tile = state.map[ty]?.[tx];
  if (!tile) {
    return false;
  }
  if (tile === "b") {
    setBrickMask(tx, ty, 0);
    return true;
  }
  if (tile === "s" && bulletPower >= 2) {
    state.map[ty][tx] = ".";
    return true;
  }
  if (tile === "E" || tile === "H") {
    state.map[ty][tx] = ".";
    state.gameOver = true;
    state.win = false;
    ui.message.textContent = "РЁС‚Р°Р± СѓРЅРёС‡С‚РѕР¶РµРЅ. РќР°Р¶РјРёС‚Рµ R РґР»СЏ СЂРµСЃС‚Р°СЂС‚Р°.";
    return true;
  }
  return tile === "s" || tile === "w";
}

function damageBrickQuarter(tx, ty, impactX, impactY, bullet) {
  const current = getBrickMask(tx, ty);
  if (!current) {
    return false;
  }
  const localX = impactX - tx * TILE;
  const localY = impactY - ty * TILE;
  const horizontalHit = Math.abs(bullet.vx) > Math.abs(bullet.vy);
  let removeMask = 0;

  if (horizontalHit) {
    removeMask = localX < HALF ? 1 | 4 : 2 | 8;
  } else {
    removeMask = localY < HALF ? 1 | 2 : 4 | 8;
  }

  if ((bullet.power ?? 0) >= 2) {
    removeMask = 15;
  }

  const next = current & ~removeMask;
  setBrickMask(tx, ty, next);
  return next !== current;
}

function bulletHitsTank(bullet, tank) {
  if (!tank.alive) {
    return false;
  }
  const rect = tankRect(tank);
  return bullet.x > rect.x &&
    bullet.x < rect.x + rect.w &&
    bullet.y > rect.y &&
    bullet.y < rect.y + rect.h;
}

function dropPowerUp(x, y) {
  const type = POWER_UP_TYPES[Math.floor(Math.random() * POWER_UP_TYPES.length)];
  state.powerUps.push({
    type,
    x,
    y,
    time: 11,
    blink: 0,
  });
}

function killPlayer(player) {
  if (player.invulnerable > 0 || player.shieldTimer > 0 || !player.alive) {
    return;
  }
  player.lives -= 1;
  explode(player.x, player.y, 24, "#ffd27f");
  if (player.lives <= 0) {
    player.alive = false;
  } else {
    player.x = player.spawnX;
    player.y = player.spawnY;
    player.dir = "up";
    player.speed = 0;
    player.invulnerable = 2;
    player.spawnTimer = 1.2;
    spawnFlash(player.x, player.y);
    ui.message.textContent = `${player.id} РІРѕР·РІСЂР°С‰Р°РµС‚СЃСЏ РІ Р±РѕР№.`;
  }
  if (state.players.every((item) => !item.alive)) {
    state.gameOver = true;
    state.win = false;
    ui.message.textContent = "РћР±Р° С‚Р°РЅРєР° СѓРЅРёС‡С‚РѕР¶РµРЅС‹. РќР°Р¶РјРёС‚Рµ R.";
  }
  syncHud();
}

function damageEnemy(enemy, bullet) {
  enemy.hp -= 1;
  explode(enemy.x, enemy.y, 22, enemy.bonusCarrier ? "#fff087" : "#ff9b54");
  if (enemy.hp > 0) {
    enemy.body = "#e8edf4";
    return;
  }
  enemy.alive = false;
  state.enemiesLeft -= 1;
  state.score += enemy.score;
  if (enemy.bonusCarrier) {
    dropPowerUp(enemy.x, enemy.y);
  }
  syncHud();
  if (!state.levelTransition && state.enemiesLeft <= 0 && state.enemies.length <= 1) {
    if (state.levelIndex + 1 < state.totalLevels) {
      state.levelTransition = true;
      state.levelIndex += 1;
      ui.message.textContent = `РЈСЂРѕРІРµРЅСЊ ${state.levelIndex} РїСЂРѕР№РґРµРЅ. РџРµСЂРµС…РѕРґ Рє СЃР»РµРґСѓСЋС‰РµРјСѓ.`;
      window.setTimeout(() => resetLevel(false), 900);
    } else {
      state.gameOver = true;
      state.win = true;
      ui.message.textContent = "РџРѕР±РµРґР°. Р’СЃРµ СѓСЂРѕРІРЅРё РїСЂРѕР№РґРµРЅС‹.";
    }
  } else if (bullet.ownerKind === "player") {
    ui.message.textContent = "РўР°РЅРє РІСЂР°РіР° СѓРЅРёС‡С‚РѕР¶РµРЅ.";
  }
}

function updateBullets(dt) {
  for (const bullet of state.bullets) {
    if (!bullet.alive) {
      continue;
    }
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;

    if (bullet.x < 0 || bullet.y < 0 || bullet.x > SIZE || bullet.y > SIZE) {
      bullet.alive = false;
      continue;
    }

    const { tile, tx, ty } = tileAtPixel(bullet.x, bullet.y);
    const hitsBrick = tile === "b" && isBrickBlocking(tx, ty, bullet.x, bullet.y);
    const hitsSolid = tile === "s" || tile === "w" || tile === "E" || tile === "H";
    if (hitsBrick || hitsSolid) {
      bullet.alive = false;
      const changed = hitsBrick
        ? damageBrickQuarter(tx, ty, bullet.x, bullet.y, bullet)
        : damageTile(tx, ty, bullet.power);
      if (changed) {
        explode(tx * TILE + HALF, ty * TILE + HALF, 16, tile === "s" ? "#c9d7e4" : "#ff9b54");
      }
      continue;
    }

    if (bullet.ownerKind === "player") {
      for (const enemy of state.enemies) {
        if (bulletHitsTank(bullet, enemy)) {
          bullet.alive = false;
          damageEnemy(enemy, bullet);
          break;
        }
      }
    } else {
      for (const player of state.players) {
        if (bulletHitsTank(bullet, player)) {
          bullet.alive = false;
          killPlayer(player);
          break;
        }
      }
    }
  }

  for (let i = 0; i < state.bullets.length; i += 1) {
    for (let j = i + 1; j < state.bullets.length; j += 1) {
      const a = state.bullets[i];
      const b = state.bullets[j];
      if (!a.alive || !b.alive || a.ownerKind === b.ownerKind) {
        continue;
      }
      if (Math.hypot(a.x - b.x, a.y - b.y) < 10) {
        a.alive = false;
        b.alive = false;
        explode((a.x + b.x) / 2, (a.y + b.y) / 2, 13, "#fff1b8");
      }
    }
  }

  state.bullets = state.bullets.filter((bullet) => bullet.alive);
}

function applyPowerUp(player, powerUp) {
  switch (powerUp.type) {
    case "star":
      player.level = Math.min(3, player.level + 1);
      player.maxSpeed = 150 + player.level * 12;
      ui.message.textContent = `${player.id}: РѕРіРЅРµРІР°СЏ РјРѕС‰СЊ РїРѕРІС‹С€РµРЅР°.`;
      break;
    case "shield":
      player.shieldTimer = 10;
      ui.message.textContent = `${player.id}: Р°РєС‚РёРІРёСЂРѕРІР°РЅ С‰РёС‚.`;
      break;
    case "grenade":
      for (const enemy of state.enemies) {
        if (enemy.alive) {
          damageEnemy(enemy, { ownerKind: "player" });
        }
      }
      ui.message.textContent = `${player.id}: РіСЂР°РЅР°С‚Р° СѓРЅРёС‡С‚РѕР¶РёР»Р° РІСЂР°РіРѕРІ.`;
      break;
    case "clock":
      state.freezeTimer = 7;
      ui.message.textContent = `${player.id}: РІСЂР°РіРё Р·Р°РјРѕСЂРѕР¶РµРЅС‹.`;
      break;
    case "shovel":
      state.baseFortifyTimer = 10;
      applyBaseFortress("s");
      ui.message.textContent = `${player.id}: С€С‚Р°Р± СѓРєСЂРµРїР»РµРЅ СЃС‚Р°Р»СЊСЋ.`;
      break;
    case "life":
      player.lives += 1;
      ui.message.textContent = `${player.id}: РґРѕРїРѕР»РЅРёС‚РµР»СЊРЅР°СЏ Р¶РёР·РЅСЊ.`;
      break;
    default:
      break;
  }
  syncHud();
}

function updatePowerUps(dt) {
  for (const powerUp of state.powerUps) {
    powerUp.time -= dt;
    powerUp.blink += dt;
  }
  for (const player of state.players) {
    if (!player.alive) {
      continue;
    }
    for (const powerUp of state.powerUps) {
      if (Math.abs(player.x - powerUp.x) < 18 && Math.abs(player.y - powerUp.y) < 18) {
        powerUp.time = -1;
        applyPowerUp(player, powerUp);
      }
    }
  }
  state.powerUps = state.powerUps.filter((powerUp) => powerUp.time > 0);
}

function updateTimers(dt) {
  state.freezeTimer = Math.max(0, state.freezeTimer - dt);
  if (state.baseFortifyTimer > 0) {
    state.baseFortifyTimer -= dt;
    if (state.baseFortifyTimer <= 0) {
      applyBaseFortress("b");
      ui.message.textContent = "РЎС‚Р°Р»СЊРЅРѕР№ РїРµСЂРёРјРµС‚СЂ С€С‚Р°Р±Р° РёСЃС‡РµР·.";
    }
  }

  for (const player of state.players) {
    player.shotCooldown = Math.max(0, player.shotCooldown - dt);
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    player.spawnTimer = Math.max(0, player.spawnTimer - dt);
    player.shieldTimer = Math.max(0, player.shieldTimer - dt);
  }
  for (const enemy of state.enemies) {
    enemy.shotCooldown = Math.max(0, enemy.shotCooldown - dt);
    enemy.spawnTimer = Math.max(0, enemy.spawnTimer - dt);
  }
}

function update(dt) {
  if (state.phaseTimer > 0) {
    state.phaseTimer = Math.max(0, state.phaseTimer - dt);
    if (state.phaseTimer === 0 && state.phase === "level_intro") {
      state.phase = "playing";
    }
  }
  updateTimers(dt);
  if (!state.gameOver && state.phase !== "title" && state.phase !== "paused") {
    for (const player of state.players) {
      updatePlayerMotion(player, dt);
    }
    updateEnemies(dt);
    updateBullets(dt);
    updatePowerUps(dt);
  }
  updateExplosions(dt);
}

function updateExplosions(dt) {
  for (const boom of state.explosions) {
    boom.time -= dt;
  }
  state.explosions = state.explosions.filter((boom) => boom.time > 0);
  for (const spawn of state.spawnEffects) {
    spawn.time -= dt;
  }
  state.spawnEffects = state.spawnEffects.filter((spawn) => spawn.time > 0);
  for (const flash of state.muzzleFlashes) {
    flash.time -= dt;
  }
  state.muzzleFlashes = state.muzzleFlashes.filter((flash) => flash.time > 0);
  for (const puff of state.dustPuffs) {
    puff.time -= dt;
  }
  state.dustPuffs = state.dustPuffs.filter((puff) => puff.time > 0);
}

function fillPixelRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function drawPixelCircle(x, y, radius, color) {
  ctx.fillStyle = color;
  for (let py = -radius; py <= radius; py += 2) {
    for (let px = -radius; px <= radius; px += 2) {
      if (px * px + py * py <= radius * radius) {
        ctx.fillRect(Math.round(x + px), Math.round(y + py), 2, 2);
      }
    }
  }
}

function drawAtmosphere() {
  const time = performance.now() * 0.00035;

  ctx.save();
  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 18; i += 1) {
    const x = ((i * 73) + time * 240) % SIZE;
    const y = ((i * 47) + time * 120) % SIZE;
    fillPixelRect(x, y, 2, 2, "#f9e7a6");
    fillPixelRect((x + 260) % SIZE, (y + 140) % SIZE, 2, 2, "#7ce7ff");
  }
  ctx.restore();

  const vignette = ctx.createRadialGradient(SIZE / 2, SIZE / 2, SIZE * 0.24, SIZE / 2, SIZE / 2, SIZE * 0.72);
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.34)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, SIZE, SIZE);
}

function drawGround(tx, ty) {
  const x = tx * TILE;
  const y = ty * TILE;
  const base = (tx + ty) % 2 === 0 ? "#18130f" : "#15100c";
  const dust = (tx * 17 + ty * 23) % 3;
  fillPixelRect(x, y, TILE, TILE, base);
  fillPixelRect(x, y + TILE - 3, TILE, 3, "#0e0a08");
  fillPixelRect(x + 2, y + 2, TILE - 4, 1, "rgba(255,255,255,0.03)");
  if (dust === 0) {
    fillPixelRect(x + 7, y + 9, 3, 3, "#2a2018");
    fillPixelRect(x + 20, y + 18, 2, 2, "#2f251c");
  } else if (dust === 1) {
    fillPixelRect(x + 12, y + 6, 2, 2, "#241a13");
    fillPixelRect(x + 24, y + 22, 3, 3, "#31261d");
  }
}

function drawTile(tx, ty, tile) {
  const x = tx * TILE;
  const y = ty * TILE;
  drawGround(tx, ty);

  if (tile === ".") {
    return;
  }
  if (tile === "b") {
    const mask = getBrickMask(tx, ty);
    const quads = [
      { bit: 1, dx: 0, dy: 0 },
      { bit: 2, dx: QUARTER, dy: 0 },
      { bit: 4, dx: 0, dy: QUARTER },
      { bit: 8, dx: QUARTER, dy: QUARTER },
    ];
    for (const quad of quads) {
      if ((mask & quad.bit) === 0) {
        continue;
      }
      const qx = x + quad.dx;
      const qy = y + quad.dy;
      fillPixelRect(qx + 1, qy + 1, QUARTER - 2, QUARTER - 2, "#7e4629");
      fillPixelRect(qx + 1, qy + 1, QUARTER - 2, 2, "#c78558");
      fillPixelRect(qx + 2, qy + 5, QUARTER - 4, 3, "#ab6c49");
      fillPixelRect(qx + 3, qy + 10, QUARTER - 6, 2, "#603421");
      fillPixelRect(qx + 4, qy + 8, 4, 2, "#d39a71");
    }
    return;
  }
  if (tile === "s") {
    fillPixelRect(x + 1, y + 1, TILE - 2, TILE - 2, "#73808c");
    fillPixelRect(x + 2, y + 2, TILE - 4, 2, "#c6d1d8");
    fillPixelRect(x + 4, y + 6, TILE - 8, 6, "#a4afb7");
    fillPixelRect(x + 4, y + 18, TILE - 8, 6, "#9ba7b0");
    fillPixelRect(x + 8, y + 12, 4, 4, "#66717e");
    fillPixelRect(x + 20, y + 12, 4, 4, "#66717e");
    return;
  }
  if (tile === "w") {
    const shift = performance.now() * 0.02;
    fillPixelRect(x, y, TILE, TILE, "#103f6d");
    fillPixelRect(x, y + 2, TILE, 3, "#1b5e9f");
    fillPixelRect(x + 4, y + ((shift + tx * 5) % TILE), 8, 8, "#55b7ff");
    fillPixelRect(x + 18, y + ((shift * 0.8 + ty * 7) % TILE), 7, 7, "#2f8edf");
    fillPixelRect(x + 8, y + ((shift * 1.3 + tx * 2) % TILE), 5, 4, "rgba(255,255,255,0.25)");
    return;
  }
  if (tile === "g") {
    ctx.fillStyle = "#356f29";
    for (let i = 0; i < 5; i += 1) {
      ctx.fillRect(x + 3 + i * 5, y + 4 + (i % 2) * 3, 3, 22);
      ctx.fillStyle = i % 2 === 0 ? "#67b34b" : "#4f9336";
      ctx.fillRect(x + 2 + i * 5, y + 3 + (i % 2) * 2, 2, 10);
      ctx.fillStyle = "#356f29";
    }
    return;
  }
  if (tile === "i") {
    fillPixelRect(x + 1, y + 1, TILE - 2, TILE - 2, "#91d2ea");
    fillPixelRect(x + 2, y + 2, TILE - 4, 3, "#dff7ff");
    fillPixelRect(x + 6, y + 10, 9, 2, "#dff7ff");
    fillPixelRect(x + 14, y + 18, 10, 2, "#dff7ff");
    fillPixelRect(x + 20, y + 8, 4, 4, "#b5edff");
    return;
  }
  if (tile === "E" || tile === "H") {
    fillPixelRect(x + 2, y + 2, TILE - 4, TILE - 4, "#60491b");
    fillPixelRect(x + 3, y + 3, TILE - 6, 2, "#b69754");
    if (tile === "E") {
      fillPixelRect(x + 14, y + 5, 4, 18, "#d5b65b");
      fillPixelRect(x + 8, y + 10, 16, 4, "#d5b65b");
      fillPixelRect(x + 10, y + 19, 12, 4, "#d5b65b");
      fillPixelRect(x + 12, y + 23, 8, 3, "#d5b65b");
    } else {
      fillPixelRect(x + 10, y + 10, 12, 12, "#8f7232");
      fillPixelRect(x + 13, y + 7, 6, 4, "#c2a565");
    }
  }
}

function drawTracks() {
  for (const bullet of state.bullets) {
    const trailX = bullet.x - bullet.vx * 0.018;
    const trailY = bullet.y - bullet.vy * 0.018;
    drawPixelCircle(trailX, trailY, bullet.radius + 3, "rgba(255, 244, 191, 0.18)");
    drawPixelCircle(bullet.x, bullet.y, bullet.radius + 1, "rgba(255,255,255,0.15)");
    drawPixelCircle(bullet.x, bullet.y, bullet.radius, bullet.color);
    fillPixelRect(bullet.x - 1, bullet.y - 1, 2, 2, "#fffdf0");
  }
}

function drawDustPuffs() {
  for (const puff of state.dustPuffs) {
    const alpha = Math.max(0, puff.time / 0.26);
    drawPixelCircle(puff.x, puff.y, puff.size * alpha, `rgba(222, 207, 173, ${alpha * 0.24})`);
  }
}

function drawMuzzleFlashes() {
  const angleMap = { up: -Math.PI / 2, right: 0, down: Math.PI / 2, left: Math.PI };
  for (const flash of state.muzzleFlashes) {
    const life = flash.time / 0.12;
    ctx.save();
    ctx.translate(flash.x, flash.y);
    ctx.rotate(angleMap[flash.dir]);
    ctx.globalAlpha = Math.max(0, life);
    fillPixelRect(0, -3, 12, 6, flash.color);
    fillPixelRect(8, -1, 8, 2, "#fff8d3");
    fillPixelRect(4, -6, 5, 12, "rgba(255,224,151,0.55)");
    ctx.restore();
  }
}

function drawPowerUp(powerUp) {
  if (powerUp.time < 2 && Math.floor(powerUp.blink * 10) % 2 === 0) {
    return;
  }
  ctx.save();
  ctx.translate(powerUp.x, powerUp.y);
  fillPixelRect(-14, -14, 28, 28, "#2e2112");
  fillPixelRect(-12, -12, 24, 24, "#f6e8a2");
  fillPixelRect(-12, -12, 24, 3, "#fff7c7");
  fillPixelRect(-12, 9, 24, 3, "#c8a85c");
  ctx.fillStyle = "#2d2415";
  ctx.font = "bold 16px Trebuchet MS";
  ctx.textAlign = "center";
  const icon = {
    star: "S",
    shield: "D",
    grenade: "G",
    clock: "C",
    shovel: "H",
    life: "+",
  }[powerUp.type];
  ctx.fillText(icon, 0, 6);
  ctx.restore();
}

function drawSpawnEffects() {
  for (const spawn of state.spawnEffects) {
    const progress = 1 - spawn.time / 0.9;
    ctx.save();
    ctx.translate(spawn.x, spawn.y);
    ctx.strokeStyle = spawn.color;
    ctx.globalAlpha = 1 - progress;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 8 + progress * 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 24 - progress * 10, 0, Math.PI * 2);
    ctx.stroke();
    drawPixelCircle(0, 0, 5 + progress * 8, "rgba(233,247,255,0.18)");
    ctx.restore();
  }
}

function drawTank(tank) {
  if (!tank.alive) {
    return;
  }
  if (tank.kind === "player" && tank.invulnerable > 0 && Math.floor(performance.now() / 80) % 2 === 0) {
    return;
  }

  const effects = tileEffectAtTank(tank);
  const angleMap = { up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 };
  const treadShift = Math.floor(performance.now() / 60) % 3;
  ctx.save();
  ctx.translate(tank.x, tank.y);
  ctx.rotate(angleMap[tank.dir]);

  const shadow = ctx.createRadialGradient(0, 4, 2, 0, 4, 26);
  shadow.addColorStop(0, "rgba(0,0,0,0.28)");
  shadow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = shadow;
  ctx.fillRect(-24, -18, 48, 40);

  fillPixelRect(-18, -16, 6, 32, "#151515");
  fillPixelRect(12, -16, 6, 32, "#151515");
  for (let step = -12; step <= 10; step += 6) {
    const offset = tank.speed > 20 ? ((step / 6 + treadShift) % 3) - 1 : 0;
    fillPixelRect(-17, step + offset, 4, 2, "#4b4b4b");
    fillPixelRect(13, step - offset, 4, 2, "#4b4b4b");
  }

  const hull = ctx.createLinearGradient(-12, -14, 12, 14);
  hull.addColorStop(0, tank.accent ?? "#f0cf84");
  hull.addColorStop(1, tank.body);
  ctx.fillStyle = hull;
  ctx.fillRect(-13, -14, 26, 28);
  fillPixelRect(-11, -12, 22, 4, "rgba(255,255,255,0.16)");
  fillPixelRect(-11, 9, 22, 3, "rgba(0,0,0,0.18)");
  fillPixelRect(-10, -9, 20, 18, tank.accent ?? "#f0cf84");
  fillPixelRect(-7, -6, 14, 12, tank.body);
  fillPixelRect(-5, -26, 10, 24, "#202020");
  fillPixelRect(-3, -24, 6, 18, "#d6d0b4");
  fillPixelRect(-4, -4, 8, 8, tank.kind === "enemy" && tank.bonusCarrier ? "#fff08b" : "#30261d");
  fillPixelRect(-3, -3, 6, 6, "rgba(255,255,255,0.12)");
  if (tank.kind === "player" && tank.level > 0) {
    fillPixelRect(-10, 12, 20, 3, "#fff2b2");
  }
  if (tank.kind === "enemy" && tank.hp > 1) {
    fillPixelRect(-10, 12, 6 * tank.hp, 3, "#e8edf4");
  }
  if (tank.kind === "player" && tank.shieldTimer > 0) {
    ctx.strokeStyle = "#9be8ff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 21, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  if (effects.grass) {
    ctx.fillStyle = "#3f842e";
    ctx.fillRect(tank.x - 16, tank.y - 15, 32, 8);
    ctx.fillRect(tank.x - 13, tank.y + 2, 26, 7);
  }
  if (tank.spawnTimer > 0) {
    const pulse = 0.55 + Math.sin(performance.now() / 40) * 0.2;
    ctx.strokeStyle = `rgba(233,247,255,${pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tank.x, tank.y, 23, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawExplosions() {
  for (const boom of state.explosions) {
    const progress = Math.max(0, boom.time / 0.32);
    drawPixelCircle(boom.x, boom.y, boom.max * (1 - progress * 0.35), boom.color);
    drawPixelCircle(boom.x, boom.y, boom.max * 0.55 * progress + 3, "rgba(255,247,187,0.35)");
    for (let i = 0; i < 6; i += 1) {
      const angle = (Math.PI * 2 * i) / 6 + progress;
      fillPixelRect(
        boom.x + Math.cos(angle) * boom.max * (1 - progress),
        boom.y + Math.sin(angle) * boom.max * (1 - progress),
        3,
        3,
        "#ffd6a3"
      );
    }
  }
}

function drawForegroundAtmosphere() {
  ctx.save();
  ctx.globalAlpha = 0.08;
  for (let y = 0; y < SIZE; y += 4) {
    fillPixelRect(0, y, SIZE, 1, "#ffffff");
  }
  ctx.restore();
}

function renderOverlay() {
  if (state.phase === "title") {
    ctx.fillStyle = "rgba(5, 7, 8, 0.72)";
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = "#f7ecd0";
    ctx.textAlign = "center";
    ctx.font = "bold 78px Trebuchet MS";
    ctx.fillText("РўРђРќР§РРљР", SIZE / 2, 220);
    ctx.font = "24px Trebuchet MS";
    ctx.fillStyle = "#f4c76c";
    ctx.fillText("DENDY ARCADE EDITION", SIZE / 2, 262);
    ctx.font = "22px Trebuchet MS";
    ctx.fillStyle = "#f7ecd0";
    ctx.fillText("ENTER С‡С‚РѕР±С‹ РЅР°С‡Р°С‚СЊ", SIZE / 2, 372);
    ctx.fillText("P РёР»Рё ESC РїР°СѓР·Р° РІРѕ РІСЂРµРјСЏ РёРіСЂС‹", SIZE / 2, 414);
    ctx.fillText("P1: WASD / СЃС‚СЂРµР»РєРё / Space", SIZE / 2, 500);
    ctx.fillText("P2: IJKL / Enter", SIZE / 2, 540);
    return;
  }

  if (state.phase === "level_intro") {
    ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = "#ffe49a";
    ctx.textAlign = "center";
    ctx.font = "bold 64px Trebuchet MS";
    ctx.fillText(`РЈР РћР’Р•РќР¬ ${state.levelIndex + 1}`, SIZE / 2, SIZE / 2 - 10);
    ctx.font = "24px Trebuchet MS";
    ctx.fillStyle = "#f7ecd0";
    ctx.fillText("Р—Р°С‰РёС‚РёС‚Рµ Р±Р°Р·Сѓ Рё СѓРЅРёС‡С‚РѕР¶СЊС‚Рµ РІСЃРµ С‚Р°РЅРєРё", SIZE / 2, SIZE / 2 + 38);
    return;
  }

  if (state.phase === "paused" && !state.gameOver) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, SIZE / 2 - 84, SIZE, 168);
    ctx.fillStyle = "#ffe49a";
    ctx.font = "bold 58px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText("PAUSE", SIZE / 2, SIZE / 2);
    ctx.font = "24px Trebuchet MS";
    ctx.fillStyle = "#f7ecd0";
    ctx.fillText("РќР°Р¶РјРё P РёР»Рё ESC, С‡С‚РѕР±С‹ РїСЂРѕРґРѕР»Р¶РёС‚СЊ", SIZE / 2, SIZE / 2 + 38);
    return;
  }

  if (!state.gameOver) {
    return;
  }
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(0, SIZE / 2 - 84, SIZE, 168);
  ctx.fillStyle = state.win ? "#ffe49a" : "#ff8f6b";
  ctx.font = "bold 54px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText(state.win ? "РџРћР‘Р•Р”Рђ" : "GAME OVER", SIZE / 2, SIZE / 2);
  ctx.font = "24px Trebuchet MS";
  ctx.fillStyle = "#f7ecd0";
  ctx.fillText("РќР°Р¶РјРёС‚Рµ R РґР»СЏ РЅРѕРІРѕР№ РёРіСЂС‹", SIZE / 2, SIZE / 2 + 40);
}

function render() {
  ctx.clearRect(0, 0, SIZE, SIZE);
  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      drawTile(x, y, state.map[y][x]);
    }
  }

  drawAtmosphere();
  for (const powerUp of state.powerUps) {
    drawPowerUp(powerUp);
  }
  drawDustPuffs();
  drawSpawnEffects();
  for (const enemy of state.enemies) {
    drawTank(enemy);
  }
  for (const player of state.players) {
    drawTank(player);
  }
  drawMuzzleFlashes();
  drawTracks();
  drawExplosions();
  drawForegroundAtmosphere();
  renderOverlay();
}

let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.033);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

document.addEventListener("keydown", (event) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "KeyW", "KeyA", "KeyS", "KeyD", "KeyI", "KeyJ", "KeyK", "KeyL", "Enter", "KeyR", "KeyP", "Escape"].includes(event.code)) {
    event.preventDefault();
  }
  keys.add(event.code);
  const existingIndex = keyPriority.indexOf(event.code);
  if (existingIndex >= 0) {
    keyPriority.splice(existingIndex, 1);
  }
  keyPriority.push(event.code);
  if (event.code === "KeyR") {
    for (const player of state.players) {
      player.lives = 3;
      player.level = 0;
      player.maxSpeed = 150;
    }
    resetLevel(true);
  }
  if (event.code === "Enter" && state.phase === "title") {
    state.phase = "level_intro";
    state.phaseTimer = 1.4;
  }
  if ((event.code === "KeyP" || event.code === "Escape") && state.phase !== "title" && !state.gameOver) {
    state.phase = state.phase === "paused" ? "playing" : "paused";
  }
});

document.addEventListener("keyup", (event) => {
  keys.delete(event.code);
  const index = keyPriority.indexOf(event.code);
  if (index >= 0) {
    keyPriority.splice(index, 1);
  }
});

normalizeLevelRows();
resetLevel(true);
requestAnimationFrame(loop);
