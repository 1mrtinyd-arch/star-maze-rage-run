/* ============================================================
   STAR MAZE — RAGE RUN
   V5 / ORIGINAL GIANT-MAZE UPGRADE

   This file keeps the original Giant Maze idea and adds:
   - 2-tile-wide corridors
   - vertically moving traps with end pauses
   - working local MP3 sounds
   - game modes
   - infinite level progression
   - checkpoints, boosts and secret doors
   - TinyD congratulations messages
   - settings, skins, high scores and about screens

   The code is intentionally written vertically with spaces and
   comments so each part is easier to understand in VS Code.
   ============================================================ */


/* ============================================================
   1. GET THE HTML ELEMENTS WE NEED
   ============================================================ */

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const levelEl = document.getElementById("level");
const starsEl = document.getElementById("stars");
const bestEl = document.getElementById("best");
const modeEl = document.getElementById("modeLabel");

const msg = document.getElementById("message");
const soundBtn = document.getElementById("soundBtn");
const dangerFill = document.getElementById("dangerFill");

const complete = document.getElementById("complete");
const dead = document.getElementById("dead");
const clearText = document.getElementById("clearText");
const deadText = document.getElementById("deadText");
const rageText = document.getElementById("rageText");
const tinyDText = document.getElementById("tinyDText");

const nextBtn = document.getElementById("nextBtn");
const respawnBtn = document.getElementById("respawnBtn");
const flash = document.getElementById("flash");

const menu = document.getElementById("menu");
const gameScreen = document.getElementById("gameScreen");
const settingsPanel = document.getElementById("settingsPanel");
const shopPanel = document.getElementById("shopPanel");
const scoresPanel = document.getElementById("scoresPanel");
const aboutPanel = document.getElementById("aboutPanel");
const exitPanel = document.getElementById("exitPanel");


/* ============================================================
   2. THE FIVE REAL SOUND FILES FROM THE ORIGINAL PROJECT

   The paths point to assets/sounds so the sounds work offline.
   ============================================================ */

const S = {

  // Normal gameplay / danger sound.
  sax: new Audio("assets/sounds/the-saxophones-getting-louder.mp3"),

  // Sound played when the player touches a trap.
  slap: new Audio("assets/sounds/slap-oh_LGvkhyt.mp3"),

  // Sound played when a level is completed.
  merlin: new Audio("assets/sounds/somebody-say-merlin.mp3"),

  // Sound played just after a trap is triggered.
  chicken: new Audio("assets/sounds/chicken-on-tree-screaming.mp3"),

  // Sound played when the player collects a boost.
  vine: new Audio("assets/sounds/run-vine-sound-effect.mp3")
};

S.sax.preload = "auto";
S.sax.loop = true;
S.sax.volume = 0;

for (const name of ["slap", "merlin", "chicken", "vine"]) {
  S[name].preload = "auto";
  S[name].volume = 0.9;
}


/* ============================================================
   3. SAVED GAME DATA
   ============================================================ */

let soundOn = localStorage.getItem("starMazeSound") !== "off";
let audioUnlocked = false;

let level = Math.max(
  1,
  Number(localStorage.getItem("starMazeLevel") || 1)
);

let stars = Number(
  localStorage.getItem("starMazeStars") || 0
);

let best = Math.max(
  1,
  Number(localStorage.getItem("starMazeBest") || 1)
);

let selectedSkin = localStorage.getItem("starMazeSkin") || "white";

let highScores = JSON.parse(
  localStorage.getItem("starMazeScores") || "[]"
);

let mode = localStorage.getItem("starMazeMode") || "classic";


/* ============================================================
   4. GAME VARIABLES
   ============================================================ */

let maze;
let player;
let exit;

let traps = [];
let boosts = [];
let checkpoints = [];
let secretDoors = [];
let particles = [];

let cameraShake = 0;
let deadNow = false;
let clearNow = false;
let boostUntil = 0;

let cols = 51;
let rows = 51;
let cell = 20;
let view = 21;

let last = 0;
let moveTimer = 0;

let checkpoint = {
  x: 1,
  y: 1
};

let danger = 0;
let exitFake = false;

let levelStartTime = 0;
let elapsedTime = 0;

let keys = {};


/* ============================================================
   5. FUNNY MESSAGES WHEN THE PLAYER GETS TRAPPED
   ============================================================ */

const taunts = [
  "BRO YOU ACTUALLY FELL FOR THAT 💀",
  "THE FLOOR SAID NOPE 😂",
  "YOU WALKED RIGHT INTO IT.",
  "LEVEL DEVIL WOULD BE PROUD.",
  "THAT TRAP WAS BEGGING YOU TO STEP ON IT.",
  "NAHHH… YOU SAW THE TRIANGLE 😭",
  "THE MAZE JUST ROBBED YOU.",
  "TRY THE OTHER PATH, GENIUS 💀"
];


/* ============================================================
   6. GAME MODE SETTINGS

   All modes use the same Giant Maze.
   They only change difficulty and rules.
   ============================================================ */

const MODE_SETTINGS = {

  classic: {
    name: "CLASSIC",
    trapMultiplier: 1,
    checkpointBonus: 1,
    timeLimit: 0,
    message: "The original Giant Maze experience."
  },

  challenge: {
    name: "CHALLENGE",
    trapMultiplier: 1.35,
    checkpointBonus: 0,
    timeLimit: 0,
    message: "More moving traps. Fewer safe checkpoints."
  },

  endless: {
    name: "ENDLESS",
    trapMultiplier: 1.15,
    checkpointBonus: 1,
    timeLimit: 0,
    message: "Levels keep coming. There is no final level."
  },

  timeattack: {
    name: "TIME ATTACK",
    trapMultiplier: 1.05,
    checkpointBonus: 0,
    timeLimit: 90,
    message: "Reach the exit before the clock reaches zero."
  },

  practice: {
    name: "PRACTICE",
    trapMultiplier: 0.55,
    checkpointBonus: 2,
    timeLimit: 0,
    message: "Fewer traps so you can learn the maze."
  },

  legacy: {
    name: "LEGACY",
    trapMultiplier: 0.8,
    checkpointBonus: 1,
    timeLimit: 0,
    message: "A calmer version inspired by the original build."
  }
};


/* ============================================================
   7. SAVE GAME
   ============================================================ */

function save() {

  localStorage.setItem("starMazeLevel", level);
  localStorage.setItem("starMazeStars", stars);
  localStorage.setItem("starMazeBest", best);
  localStorage.setItem("starMazeSound", soundOn ? "on" : "off");
  localStorage.setItem("starMazeSkin", selectedSkin);
  localStorage.setItem("starMazeMode", mode);
  localStorage.setItem("starMazeScores", JSON.stringify(highScores));
}


/* ============================================================
   8. AUDIO FUNCTIONS
   ============================================================ */

// Browsers normally require a click or key press before audio can play.
function unlockAudio() {

  if (audioUnlocked) {
    return;
  }

  audioUnlocked = true;
}


// Play one of the short sound effects.
function play(name, volume = 1) {

  if (!soundOn || !audioUnlocked) {
    return;
  }

  const audio = S[name];

  if (!audio) {
    return;
  }

  try {
    audio.pause();
    audio.currentTime = 0;
    audio.volume = volume;
    audio.play().catch(() => {});
  } catch (error) {
    // Audio errors should never crash the game.
  }
}


// Start the looping saxophone danger sound.
function startSax() {

  if (!soundOn || !audioUnlocked) {
    return;
  }

  if (S.sax.paused) {
    S.sax.play().catch(() => {});
  }
}


// Stop and reset the danger sound.
function stopSax() {

  if (!S.sax.paused) {
    S.sax.pause();
    S.sax.currentTime = 0;
  }
}


// Turn sound on or off from the button.
function setSound(on) {

  soundOn = on;

  soundBtn.textContent = soundOn
    ? "🔊 SOUND ON"
    : "🔇 SOUND OFF";

  if (!soundOn) {
    stopSax();
  }

  save();
}


soundBtn.onclick = () => {

  unlockAudio();
  setSound(!soundOn);
};


/* ============================================================
   9. CANVAS SIZE
   ============================================================ */

function setupCanvas() {

  const d = Math.min(devicePixelRatio || 1, 2);
  const width = canvas.clientWidth;

  canvas.width = Math.floor(width * d);
  canvas.height = Math.floor(width * d);

  ctx.setTransform(d, 0, 0, d, 0, 0);

  cell = width / view;
}


addEventListener("resize", setupCanvas);


/* ============================================================
   10. SEEDED RANDOM NUMBER GENERATOR
   ============================================================ */

function rngSeeded(seed) {

  let s = seed >>> 0;

  return () => {

    s = (s * 1664525 + 1013904223) >>> 0;

    return s / 4294967296;
  };
}


function shuffle(array, rand) {

  for (let i = array.length - 1; i > 0; i--) {

    const j = Math.floor(rand() * (i + 1));

    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}


/* ============================================================
   11. CREATE THE GIANT MAZE

   IMPORTANT:
   The original game used one-cell corridors.
   Here the carved route is expanded to TWO cells wide.
   The maze still looks like the original Giant Maze.
   ============================================================ */

function makeMaze() {

  const rand = rngSeeded(
    level * 99991 + 77 + mode.length * 31
  );

  /*
     The maze can continue forever by level number.
     The physical maze is capped so the browser stays fast.
  */
  const logicalSize = Math.min(
    51,
    25 + Math.floor((level - 1) / 2) * 2
  );

  const logicalCols = logicalSize % 2
    ? logicalSize
    : logicalSize + 1;

  const logicalRows = logicalCols;

  view = window.innerWidth < 600 ? 17 : 21;

  /*
     First make a normal maze on a smaller grid.
     Then expand every open cell to a 2x2 floor area.
     That is what makes the paths two tiles wide.
  */
  const logicalMaze = Array.from(
    { length: logicalRows },
    () => Array(logicalCols).fill(1)
  );

  function carve(x, y) {

    logicalMaze[y][x] = 0;

    const dirs = shuffle(
      [
        [2, 0],
        [-2, 0],
        [0, 2],
        [0, -2]
      ],
      rand
    );

    for (const [dx, dy] of dirs) {

      const nx = x + dx;
      const ny = y + dy;

      if (
        nx > 0 &&
        ny > 0 &&
        nx < logicalCols - 1 &&
        ny < logicalRows - 1 &&
        logicalMaze[ny][nx]
      ) {

        logicalMaze[y + dy / 2][x + dx / 2] = 0;

        carve(nx, ny);
      }
    }
  }

  carve(1, 1);

  /*
     Expand the logical maze.
     Every floor tile becomes a 2x2 floor block.
  */
  rows = logicalRows * 2;
  cols = logicalCols * 2;

  maze = Array.from(
    { length: rows },
    () => Array(cols).fill(1)
  );

  for (let y = 0; y < logicalRows; y++) {

    for (let x = 0; x < logicalCols; x++) {

      if (logicalMaze[y][x] !== 0) {
        continue;
      }

      const bx = x * 2;
      const by = y * 2;

      maze[by][bx] = 0;
      maze[by][bx + 1] = 0;
      maze[by + 1][bx] = 0;
      maze[by + 1][bx + 1] = 0;
    }
  }

  /*
     Connect the two-wide sections so the player does not get
     stuck because of the expansion step.
  */
  for (let y = 2; y < rows - 2; y += 2) {

    for (let x = 2; x < cols - 2; x += 2) {

      if (maze[y][x] === 0) {
        maze[y][x - 1] = 0;
        maze[y - 1][x] = 0;
      }
    }
  }

  /* Start and exit are always open. */
  maze[1][1] = 0;
  maze[1][2] = 0;
  maze[2][1] = 0;
  maze[2][2] = 0;

  maze[rows - 2][cols - 2] = 0;
  maze[rows - 3][cols - 2] = 0;
  maze[rows - 2][cols - 3] = 0;
  maze[rows - 3][cols - 3] = 0;

  traps = [];
  boosts = [];
  checkpoints = [];
  secretDoors = [];
  particles = [];

  const floor = [];

  for (let y = 1; y < rows - 1; y++) {

    for (let x = 1; x < cols - 1; x++) {

      if (!maze[y][x]) {
        floor.push({ x, y });
      }
    }
  }

  const used = new Set([
    "1,1",
    "1,2",
    "2,1",
    "2,2",
    `${cols - 2},${rows - 2}`
  ]);

  function pick(allowSafe = false) {

    for (let tries = 0; tries < 300; tries++) {

      const p = floor[
        Math.floor(rand() * floor.length)
      ];

      if (!p) {
        return null;
      }

      const key = `${p.x},${p.y}`;

      const farFromStart =
        Math.abs(p.x - 1) + Math.abs(p.y - 1) > 12;

      const farFromExit =
        Math.abs(p.x - (cols - 2)) +
        Math.abs(p.y - (rows - 2)) > 10;

      if (
        (allowSafe || !used.has(key)) &&
        farFromStart &&
        farFromExit
      ) {

        used.add(key);
        return p;
      }
    }

    return null;
  }

  /* ==========================================================
     MOVING VERTICAL TRAPS

     Each trap chooses a vertical section of the corridor.
     It moves DOWN, pauses, moves UP, pauses, then repeats.
     ========================================================== */

  const settings = MODE_SETTINGS[mode];

  const trapCount = Math.min(
    180,
    Math.floor((22 + level * 6) * settings.trapMultiplier)
  );

  for (let i = 0; i < trapCount; i++) {

    const p = pick();

    if (!p) {
      continue;
    }

    /*
       Search for a vertical run of floor tiles around the trap.
       The trap will travel inside this same corridor.
    */
    let top = p.y;
    let bottom = p.y;

    while (
      top > 1 &&
      !maze[top - 1][p.x]
    ) {
      top--;
    }

    while (
      bottom < rows - 2 &&
      !maze[bottom + 1][p.x]
    ) {
      bottom++;
    }

    /*
       Only use a moving trap when the vertical corridor is long
       enough to make the movement visible and fair.
    */
    if (bottom - top < 3) {
      continue;
    }

    traps.push({
      x: p.x,
      y: p.y,
      top,
      bottom,
      direction: i % 2 === 0 ? 1 : -1,
      speed: 1.4 + Math.min(1.8, level * 0.03),
      pause: 0,
      phase: rand() * Math.PI * 2
    });
  }

  /* Boost pads. */
  const boostCount = Math.min(
    24,
    4 + Math.floor(level / 2)
  );

  for (let i = 0; i < boostCount; i++) {

    const p = pick();

    if (p) {
      boosts.push({
        ...p,
        used: false
      });
    }
  }

  /* Checkpoints become more common in Practice mode. */
  const checkpointCount = Math.min(
    10,
    Math.floor((level + 2) / 3) + settings.checkpointBonus
  );

  for (let i = 0; i < checkpointCount; i++) {

    const p = pick();

    if (p) {
      checkpoints.push({ ...p });
    }
  }

  /* Secret shortcuts. */
  const secretCount = Math.min(
    10,
    2 + Math.floor(level / 3)
  );

  for (let i = 0; i < secretCount; i++) {

    const p = pick();

    if (p) {
      secretDoors.push({
        ...p,
        open: false
      });
    }
  }

  exit = {
    x: cols - 2,
    y: rows - 2
  };

  checkpoint = {
    x: 1,
    y: 1
  };

  exitFake = level >= 3 && rand() < 0.75;

  player = {
    x: 1,
    y: 1,
    px: 1,
    py: 1,
    trail: []
  };

  danger = 0;
  levelStartTime = performance.now();
  elapsedTime = 0;

  levelEl.textContent = level;
  starsEl.textContent = stars;
  bestEl.textContent = best;
  modeEl.textContent = MODE_SETTINGS[mode].name;

  msg.textContent = getLevelMessage();

  setupCanvas();
}


/* ============================================================
   12. LEVEL MESSAGE
   ============================================================ */

function getLevelMessage() {

  if (level === 1) {
    return "Level 1: learn the maze. Then it gets mean.";
  }

  if (level < 4) {
    return "The maze is HUGE. Watch the moving traps.";
  }

  if (level < 8) {
    return "RAGE MODE: moving traps, fake routes and secrets.";
  }

  return "NIGHTMARE MODE: trust absolutely nothing.";
}


/* ============================================================
   13. BASIC MAZE HELPERS
   ============================================================ */

function isWall(x, y) {

  return (
    x < 0 ||
    y < 0 ||
    x >= cols ||
    y >= rows ||
    maze[y][x] === 1
  );
}


function dist(a, b) {

  return Math.abs(a.x - b.x) +
         Math.abs(a.y - b.y);
}


/* ============================================================
   14. MOVE THE TRAPS UP AND DOWN
   ============================================================ */

function updateTraps(dt) {

  for (const trap of traps) {

    /*
       When a trap reaches the top or bottom it waits.
       This gives the player a small timing window.
    */
    if (trap.pause > 0) {

      trap.pause -= dt;
      continue;
    }

    trap.y += trap.direction * trap.speed * dt;

    if (trap.direction > 0 && trap.y >= trap.bottom) {

      trap.y = trap.bottom;
      trap.direction = -1;
      trap.pause = 1.25;
    }

    if (trap.direction < 0 && trap.y <= trap.top) {

      trap.y = trap.top;
      trap.direction = 1;
      trap.pause = 1.25;
    }
  }
}


/* ============================================================
   15. DANGER SYSTEM
   ============================================================ */

function nearestDanger() {

  let minimum = 999;

  for (const trap of traps) {

    const distance = Math.abs(
      trap.x - player.x
    ) + Math.abs(
      Math.round(trap.y) - player.y
    );

    if (distance < minimum) {
      minimum = distance;
    }
  }

  return minimum;
}


function updateDanger() {

  const distance = nearestDanger();

  const radius = Math.max(
    5,
    9 - Math.floor(level / 5)
  );

  danger = distance < radius
    ? (radius - distance + 1) / radius
    : 0;

  danger = Math.max(
    0,
    Math.min(1, danger)
  );

  dangerFill.style.width =
    Math.round(danger * 100) + "%";

  if (danger > 0 && soundOn) {

    S.sax.volume = 0.08 + 0.84 * danger;

    startSax();

  } else {

    stopSax();
  }
}


/* ============================================================
   16. CHECK WHETHER A MOVING TRAP HITS THE PLAYER
   ============================================================ */

function checkMovingTrapCollision() {

  for (const trap of traps) {

    if (
      Math.abs(trap.x - player.x) < 0.55 &&
      Math.abs(trap.y - player.y) < 0.55
    ) {

      triggerDeath();
      return true;
    }
  }

  return false;
}


/* ============================================================
   17. PLAYER MOVEMENT
   ============================================================ */

function tryMove(dx, dy) {

  if (deadNow || clearNow) {
    return;
  }

  unlockAudio();

  const nx = player.x + dx;
  const ny = player.y + dy;

  if (isWall(nx, ny)) {

    cameraShake = 4;
    return;
  }

  player.x = nx;
  player.y = ny;

  player.trail.push({
    x: nx,
    y: ny,
    t: performance.now()
  });

  if (player.trail.length > 18) {
    player.trail.shift();
  }

  /* Boost pickup. */
  const boost = boosts.find(
    item =>
      item.x === nx &&
      item.y === ny &&
      !item.used
  );

  if (boost) {

    boost.used = true;
    boostUntil = performance.now() + 1150;

    stars++;
    starsEl.textContent = stars;

    msg.textContent =
      "⚡ RUN! BOOST ACTIVATED!";

    play("vine", 1);

    pulse("#37e8ff");
  }

  /* Checkpoint pickup. */
  const cp = checkpoints.find(
    item =>
      item.x === nx &&
      item.y === ny
  );

  if (cp) {

    checkpoint = {
      x: nx,
      y: ny
    };

    stars++;
    starsEl.textContent = stars;

    msg.textContent =
      "🔷 CHECKPOINT SAVED";

    pulse("#48f2b0");
  }

  /* Secret passage. */
  const secret = secretDoors.find(
    item =>
      item.x === nx &&
      item.y === ny &&
      !item.open
  );

  if (secret) {

    secret.open = true;

    msg.textContent =
      "🌀 SECRET PASSAGE OPEN!";

    stars++;
    starsEl.textContent = stars;

    pulse("#b66cff");
  }

  /* Check moving trap immediately after movement. */
  if (checkMovingTrapCollision()) {
    return;
  }

  /* Exit. */
  if (
    nx === exit.x &&
    ny === exit.y
  ) {

    win();
  }
}


/* ============================================================
   18. TRAP / DEATH EVENT
   ============================================================ */

function triggerDeath() {

  if (deadNow) {
    return;
  }

  deadNow = true;

  stopSax();

  /* First requested trap sound. */
  play("slap", 1);

  /* Second requested trap sound. */
  setTimeout(() => {
    play("chicken", 1);
  }, 180);

  flash.style.opacity = "1";

  setTimeout(() => {
    flash.style.opacity = "0";
  }, 140);

  cameraShake = 15;

  msg.textContent = "💀 TRAPPED!";

  deadText.textContent =
    "You hit a moving trap. Unlimited attempts — keep going.";

  rageText.textContent =
    taunts[Math.floor(Math.random() * taunts.length)];

  dead.classList.remove("hidden");
}


/* ============================================================
   19. RESPAWN AT THE LAST CHECKPOINT
   ============================================================ */

function respawn() {

  dead.classList.add("hidden");

  deadNow = false;

  player.x = checkpoint.x;
  player.y = checkpoint.y;

  player.px = player.x;
  player.py = player.y;

  msg.textContent =
    "Back at your checkpoint. Watch the moving trap.";
}


respawnBtn.onclick = () => {

  unlockAudio();
  respawn();
};


/* ============================================================
   20. LEVEL COMPLETE
   ============================================================ */

function win() {

  if (clearNow) {
    return;
  }

  clearNow = true;

  stopSax();

  /* Merlin sound = level complete. */
  play("merlin", 1);

  const bonus = Math.max(
    5,
    15 - Math.floor(level / 2)
  );

  stars += bonus;

  if (level + 1 > best) {
    best = level + 1;
  }

  const timeTaken = Math.round(
    (performance.now() - levelStartTime) / 1000
  );

  /* Save the score for the High Scores screen. */
  highScores.push({
    level,
    mode: MODE_SETTINGS[mode].name,
    stars: bonus,
    time: timeTaken,
    date: new Date().toLocaleDateString()
  });

  highScores.sort((a, b) => {
    return b.level - a.level || b.stars - a.stars;
  });

  highScores = highScores.slice(0, 10);

  save();

  levelEl.textContent = level;
  starsEl.textContent = stars;
  bestEl.textContent = best;

  clearText.textContent =
    `Level ${level} cleared in ${timeTaken}s. ` +
    `You earned ${bonus} bonus stars.`;

  /* TinyD message requested by the user. */
  tinyDText.textContent =
    `TinyD congratulates you for passing Level ${level}! ` +
    `You survived the Giant Maze. Keep going — the next level is waiting! 🎉`;

  complete.classList.remove("hidden");

  msg.textContent =
    "🗣️ MERLIN! LEVEL COMPLETE!";

  for (let i = 0; i < 110; i++) {

    particles.push({
      x: (player.x + 0.5) * cell,
      y: (player.y + 0.5) * cell,
      vx: (Math.random() - 0.5) * 9,
      vy: (Math.random() - 0.5) * 9,
      life: 1,
      c: "#ffe55b"
    });
  }
}


/* ============================================================
   21. NEXT LEVEL — INFINITE PROGRESSION
   ============================================================ */

nextBtn.onclick = () => {

  unlockAudio();

  level++;

  save();

  complete.classList.add("hidden");

  clearNow = false;

  makeMaze();
};


/* ============================================================
   22. PARTICLE EFFECT
   ============================================================ */

function pulse(color) {

  for (let i = 0; i < 20; i++) {

    particles.push({
      x: (player.x + 0.5) * cell,
      y: (player.y + 0.5) * cell,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5,
      life: 1,
      c: color
    });
  }
}


/* ============================================================
   23. UPDATE EVERYTHING EACH FRAME
   ============================================================ */

function update(dt) {

  if (!deadNow && !clearNow) {

    const now = performance.now();

    const speed = boostUntil > now
      ? 58
      : 105;

    if (now - moveTimer > speed) {

      let dx = 0;
      let dy = 0;

      if (keys.ArrowUp || keys.w) {
        dy = -1;
      } else if (keys.ArrowDown || keys.s) {
        dy = 1;
      } else if (keys.ArrowLeft || keys.a) {
        dx = -1;
      } else if (keys.ArrowRight || keys.d) {
        dx = 1;
      }

      if (dx || dy) {

        tryMove(dx, dy);

        moveTimer = now;
      }
    }

    player.px +=
      (player.x - player.px) *
      Math.min(1, dt * 15);

    player.py +=
      (player.y - player.py) *
      Math.min(1, dt * 15);

    /* Moving traps are updated continuously. */
    updateTraps(dt);

    /* A trap can hit the player even when the player is standing still. */
    checkMovingTrapCollision();

    updateDanger();

    elapsedTime =
      (performance.now() - levelStartTime) / 1000;

    /* Time Attack mode. */
    const limit = MODE_SETTINGS[mode].timeLimit;

    if (
      limit > 0 &&
      elapsedTime >= limit
    ) {

      triggerDeath();

      deadText.textContent =
        "TIME UP! Try the level again and move faster.";
    }

  } else {

    stopSax();
  }

  /* Update particles. */
  for (const particle of particles) {

    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.09;
    particle.life -= dt * 1.7;
  }

  particles = particles.filter(
    particle => particle.life > 0
  );

  cameraShake *= 0.88;
}


/* ============================================================
   24. DRAW A STAR
   ============================================================ */

function drawStar(x, y, radius, fill) {

  ctx.beginPath();

  for (let i = 0; i < 10; i++) {

    const angle =
      -Math.PI / 2 +
      i * Math.PI / 5;

    const r = i % 2
      ? radius
      : radius * 0.43;

    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;

    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }

  ctx.closePath();

  ctx.fillStyle = fill;
  ctx.shadowBlur = 16;
  ctx.shadowColor = fill;
  ctx.fill();
  ctx.shadowBlur = 0;
}


/* ============================================================
   25. DRAW THE GIANT MAZE
   ============================================================ */

function draw(t) {

  const width = canvas.clientWidth;

  ctx.clearRect(0, 0, width, width);

  ctx.save();

  ctx.translate(
    (Math.random() - 0.5) * cameraShake,
    (Math.random() - 0.5) * cameraShake
  );

  const C = cell;
  const half = Math.floor(view / 2);

  const cx = player.px;
  const cy = player.py;

  ctx.fillStyle = "#050814";
  ctx.fillRect(0, 0, width, width);

  const minX =
    Math.floor(cx) - half - 1;

  const maxX =
    Math.floor(cx) + half + 1;

  const minY =
    Math.floor(cy) - half - 1;

  const maxY =
    Math.floor(cy) + half + 1;

  /* Draw walls and floor tiles. */
  for (let y = minY; y <= maxY; y++) {

    for (let x = minX; x <= maxX; x++) {

      const sx =
        (x - cx + view / 2) * C;

      const sy =
        (y - cy + view / 2) * C;

      if (
        x < 0 ||
        y < 0 ||
        x >= cols ||
        y >= rows
      ) {
        continue;
      }

      if (maze[y][x]) {

        ctx.fillStyle = "#18254b";
        ctx.fillRect(
          sx + 1,
          sy + 1,
          C - 2,
          C - 2
        );

        ctx.strokeStyle = "#31457c";
        ctx.strokeRect(
          sx + 1,
          sy + 1,
          C - 2,
          C - 2
        );

      } else {

        ctx.fillStyle =
          (x + y) % 2
            ? "#0c1530"
            : "#0f1938";

        ctx.fillRect(
          sx,
          sy,
          C,
          C
        );
      }
    }
  }

  /* ==========================================================
     Draw the real exit.
     ========================================================== */

  const ex =
    (exit.x - cx + view / 2 + 0.5) * C;

  const ey =
    (exit.y - cy + view / 2 + 0.5) * C;

  if (
    ex > -C &&
    ey > -C &&
    ex < width + C &&
    ey < width + C
  ) {

    ctx.beginPath();
    ctx.arc(
      ex,
      ey,
      C * 0.48,
      0,
      Math.PI * 2
    );

    ctx.fillStyle = "#ffe55b22";
    ctx.fill();

    ctx.strokeStyle = "#ffe55b";
    ctx.lineWidth = 3;
    ctx.stroke();

    drawStar(
      ex,
      ey,
      C * 0.36,
      "#ffe55b"
    );

    ctx.fillStyle = "#ffe55b";
    ctx.font = `900 ${Math.max(10, C * 0.36)}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText(
      "EXIT",
      ex,
      ey + C * 0.72
    );
  }

  /* Fake exits on higher levels. */
  if (exitFake) {

    for (const secret of secretDoors.slice(0, 2)) {

      const fx =
        (secret.x - cx + view / 2 + 0.5) * C;

      const fy =
        (secret.y - cy + view / 2 + 0.5) * C;

      if (
        fx < -C ||
        fy < -C ||
        fx > width + C ||
        fy > width + C
      ) {
        continue;
      }

      ctx.strokeStyle = "#ff4fa3";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        fx - C * 0.35,
        fy - C * 0.35,
        C * 0.7,
        C * 0.7
      );

      ctx.fillStyle = "#ff4fa3";
      ctx.font = `900 ${Math.max(7, C * 0.24)}px Arial`;
      ctx.textAlign = "center";
      ctx.fillText(
        "FAKE",
        fx,
        fy + C * 0.65
      );
    }
  }

  /* Draw boost diamonds. */
  boosts.forEach(boost => {

    if (boost.used) {
      return;
    }

    const x =
      (boost.x - cx + view / 2 + 0.5) * C;

    const y =
      (boost.y - cy + view / 2 + 0.5) * C;

    if (
      x < -C ||
      y < -C ||
      x > width + C ||
      y > width + C
    ) {
      return;
    }

    ctx.save();

    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);

    ctx.shadowBlur = 18;
    ctx.shadowColor = "#37e8ff";
    ctx.fillStyle = "#37e8ff";
    ctx.fillRect(
      -C * 0.18,
      -C * 0.18,
      C * 0.36,
      C * 0.36
    );

    ctx.restore();
  });

  /* Draw checkpoints. */
  checkpoints.forEach(cp => {

    const x =
      (cp.x - cx + view / 2 + 0.5) * C;

    const y =
      (cp.y - cy + view / 2 + 0.5) * C;

    ctx.beginPath();
    ctx.arc(
      x,
      y,
      C * 0.22,
      0,
      Math.PI * 2
    );

    ctx.fillStyle = "#48f2b0";
    ctx.shadowBlur = 13;
    ctx.shadowColor = "#48f2b0";
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  /* Draw secret doors. */
  secretDoors.forEach(secret => {

    const x =
      (secret.x - cx + view / 2 + 0.5) * C;

    const y =
      (secret.y - cy + view / 2 + 0.5) * C;

    ctx.strokeStyle = secret.open
      ? "#b66cff"
      : "#6f4bb5";

    ctx.lineWidth = 2;

    ctx.strokeRect(
      x - C * 0.25,
      y - C * 0.25,
      C * 0.5,
      C * 0.5
    );
  });

  /* ==========================================================
     Draw moving red triangle traps.
     ========================================================== */
  traps.forEach(trap => {

    const x =
      (trap.x - cx + view / 2 + 0.5) * C;

    const y =
      (trap.y - cy + view / 2 + 0.5) * C;

    if (
      x < -C ||
      y < -C ||
      x > width + C ||
      y > width + C
    ) {
      return;
    }

    const pulseAmount =
      1 + Math.sin(
        t / 150 + trap.phase
      ) * 0.1;

    ctx.save();

    ctx.translate(x, y);
    ctx.scale(
      pulseAmount,
      pulseAmount
    );

    ctx.shadowBlur = 17;
    ctx.shadowColor = "#ff526e";
    ctx.fillStyle = "#ff526e";

    ctx.beginPath();
    ctx.moveTo(0, -C * 0.36);
    ctx.lineTo(C * 0.34, C * 0.3);
    ctx.lineTo(-C * 0.34, C * 0.3);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ffe4e9";

    ctx.beginPath();
    ctx.arc(
      0,
      C * 0.05,
      C * 0.08,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.restore();
  });

  /* Player trail. */
  player.trail.forEach((point, index) => {

    const x =
      (point.x - cx + view / 2 + 0.5) * C;

    const y =
      (point.y - cy + view / 2 + 0.5) * C;

    ctx.globalAlpha =
      index / player.trail.length * 0.18;

    drawStar(
      x,
      y,
      C * 0.11,
      getSkinColor()
    );

    ctx.globalAlpha = 1;
  });

  /* Player. */
  drawStar(
    (view / 2 + 0.5) * C,
    (view / 2 + 0.5) * C,
    C * 0.36,
    getSkinColor()
  );

  /* Particles. */
  particles.forEach(particle => {

    ctx.globalAlpha =
      Math.max(0, particle.life);

    ctx.fillStyle = particle.c;

    ctx.fillRect(
      particle.x,
      particle.y,
      4,
      4
    );

    ctx.globalAlpha = 1;
  });

  /* Time Attack timer. */
  const limit = MODE_SETTINGS[mode].timeLimit;

  if (limit > 0) {

    const remaining = Math.max(
      0,
      limit - elapsedTime
    );

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 13px Arial";
    ctx.textAlign = "left";
    ctx.fillText(
      `TIME ${remaining.toFixed(1)}s`,
      12,
      38
    );
  }

  /* Progress bar. */
  const progress = Math.min(
    1,
    dist(player, exit) /
      Math.max(1, (cols - 2) + (rows - 2))
  );

  ctx.fillStyle = "#101a35cc";
  ctx.fillRect(
    10,
    width - 16,
    width - 20,
    5
  );

  ctx.fillStyle = "#37e8ff";
  ctx.fillRect(
    10,
    width - 16,
    (width - 20) * (1 - progress),
    5
  );

  ctx.restore();
}


/* ============================================================
   26. GAME LOOP
   ============================================================ */

function loop(time) {

  const dt = Math.min(
    0.05,
    (time - last) / 1000 || 0
  );

  last = time;

  update(dt);
  draw(time);

  requestAnimationFrame(loop);
}


/* ============================================================
   27. KEYBOARD CONTROLS
   ============================================================ */

addEventListener("keydown", event => {

  const allowed = [
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    " ",
    "w",
    "a",
    "s",
    "d"
  ];

  if (allowed.includes(event.key)) {
    event.preventDefault();
  }

  keys[event.key] = true;

  unlockAudio();
});


addEventListener("keyup", event => {

  keys[event.key] = false;
});


/* ============================================================
   28. MOBILE BUTTON CONTROLS
   ============================================================ */

document
  .querySelectorAll(".controls button")
  .forEach(button => {

    const key = button.dataset.key;

    button.addEventListener("pointerdown", event => {

      event.preventDefault();

      keys[key] = true;

      unlockAudio();
    });

    [
      "pointerup",
      "pointercancel",
      "pointerleave"
    ].forEach(eventName => {

      button.addEventListener(
        eventName,
        event => {

          event.preventDefault();
          keys[key] = false;
        }
      );
    });
  });


/* ============================================================
   29. SKIN SYSTEM
   ============================================================ */

function getSkinColor() {

  const colors = {
    white: "#ffffff",
    cyan: "#37e8ff",
    yellow: "#ffe55b",
    pink: "#ff4fa3"
  };

  return colors[selectedSkin] || colors.white;
}


/* ============================================================
   30. MENU / MODE SYSTEM
   ============================================================ */

function showMenu() {

  menu.classList.remove("hidden");
  gameScreen.classList.add("hidden");
}


function startMode(newMode) {

  if (!MODE_SETTINGS[newMode]) {
    return;
  }

  mode = newMode;
  level = 1;

  localStorage.setItem(
    "starMazeMode",
    mode
  );

  save();

  menu.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  makeMaze();
}


document
  .querySelectorAll("[data-mode]")
  .forEach(button => {

    button.addEventListener("click", () => {

      startMode(button.dataset.mode);
    });
  });


/* ============================================================
   31. SETTINGS PANEL
   ============================================================ */

function openPanel(panel) {

  panel.classList.remove("hidden");
}


function closePanels() {

  settingsPanel.classList.add("hidden");
  shopPanel.classList.add("hidden");
  scoresPanel.classList.add("hidden");
  aboutPanel.classList.add("hidden");
  exitPanel.classList.add("hidden");
}


document
  .querySelectorAll("[data-panel]")
  .forEach(button => {

    button.addEventListener("click", () => {

      closePanels();

      const target = document.getElementById(
        button.dataset.panel
      );

      if (target) {
        openPanel(target);
      }
    });
  });


document
  .querySelectorAll("[data-close-panel]")
  .forEach(button => {

    button.addEventListener("click", closePanels);
  });


/* ============================================================
   32. SETTINGS SOUND BUTTON
   ============================================================ */

const menuSoundButton =
  document.getElementById("menuSoundButton");

if (menuSoundButton) {

  menuSoundButton.onclick = () => {

    unlockAudio();
    setSound(!soundOn);

    menuSoundButton.textContent = soundOn
      ? "🔊 SOUND ON"
      : "🔇 SOUND OFF";
  };
}


/* ============================================================
   33. SIMPLE SKIN SHOP
   ============================================================ */

const skinButtons =
  document.querySelectorAll("[data-skin]");

skinButtons.forEach(button => {

  button.addEventListener("click", () => {

    selectedSkin = button.dataset.skin;

    save();

    msg.textContent =
      `✨ Skin changed to ${selectedSkin.toUpperCase()}.`;
  });
});


/* ============================================================
   34. HIGH SCORE SCREEN
   ============================================================ */

function renderScores() {

  const list =
    document.getElementById("scoreList");

  if (!list) {
    return;
  }

  list.innerHTML = "";

  if (!highScores.length) {

    list.innerHTML =
      "<div class='empty'>No scores yet. Beat a level first!</div>";

    return;
  }

  highScores.forEach((score, index) => {

    const row = document.createElement("div");

    row.className = "score-row";

    row.textContent =
      `#${index + 1}  Level ${score.level} • ` +
      `${score.mode} • ${score.stars}⭐ • ${score.time}s`;

    list.appendChild(row);
  });
}


const scorePanelButton =
  document.querySelector("[data-panel='scoresPanel']");

if (scorePanelButton) {

  scorePanelButton.addEventListener(
    "click",
    renderScores
  );
}


/* ============================================================
   35. RETURN TO THE MENU
   ============================================================ */

const menuButton =
  document.getElementById("menuButton");

if (menuButton) {

  menuButton.onclick = () => {

    stopSax();
    dead.classList.add("hidden");
    complete.classList.add("hidden");
    clearNow = false;
    deadNow = false;
    closePanels();
    showMenu();
  };
}


/* ============================================================
   36. START THE ORIGINAL GIANT MAZE
   ============================================================ */

soundBtn.textContent = soundOn
  ? "🔊 SOUND ON"
  : "🔇 SOUND OFF";

/*
   Start on the menu so the player can choose a mode.
   The actual maze is generated when Play is pressed.
*/

makeMaze();
showMenu();
requestAnimationFrame(loop);
