const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const statsEl = document.getElementById("stats");
const missionEl = document.getElementById("mission");
const startBtn = document.getElementById("startBtn");
const difficultyEl = document.getElementById("difficulty");

const world = { width: 2200, height: 1600, roadSize: 120, blockSize: 280 };
const keys = new Set();
const rand = (min, max) => Math.random() * (max - min) + min;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const difficultySettings = {
  easy: { playerSpeed: 2.8, sprint: 4.6, time: 220, missionTTL: 75 },
  normal: { playerSpeed: 2.4, sprint: 4.0, time: 180, missionTTL: 60 },
  hard: { playerSpeed: 2.1, sprint: 3.4, time: 150, missionTTL: 45 },
};

const state = {
  score: 0,
  wanted: 0,
  time: 180,
  message: "Premi Inizia partita.",
  over: false,
  started: false,
  inVehicle: null,
  mission: null,
};

const player = {
  x: world.width * 0.4,
  y: world.height * 0.5,
  size: 18,
  speed: 2.4,
  sprint: 4,
  hp: 100,
  angle: 0,
  color: "#57f26f",
};

const camera = { x: 0, y: 0 };
const segment = world.blockSize + world.roadSize;
const verticalRoads = [];
const horizontalRoads = [];
for (let x = world.blockSize; x < world.width; x += segment) verticalRoads.push(x);
for (let y = world.blockSize; y < world.height; y += segment) horizontalRoads.push(y);

const blockDecor = buildBlockDecor();
const cars = Array.from({ length: 26 }, () => spawnCar());
const peds = Array.from({ length: 75 }, () => spawnPed());
const pickups = [];

function currentDifficulty() {
  return difficultySettings[difficultyEl?.value] || difficultySettings.normal;
}

function buildBlockDecor() {
  const blocks = [];
  for (let gy = 0; gy < world.height; gy += segment) {
    for (let gx = 0; gx < world.width; gx += segment) {
      blocks.push({
        x: gx + 18,
        y: gy + 18,
        w: world.blockSize - 36,
        h: world.blockSize - 36,
        style: Math.random() > 0.55 ? "building" : "park",
        tone: Math.random() > 0.5 ? "light" : "dark",
      });
    }
  }
  return blocks;
}

function spawnCar() {
  const onHorizontal = Math.random() > 0.5;
  const laneOffset = rand(-24, 24);
  let x, y, vx, vy;
  if (onHorizontal) {
    y = pickRoadCenter("h") + laneOffset;
    x = rand(0, world.width);
    vx = rand(1.3, 2.8) * (Math.random() > 0.5 ? 1 : -1);
    vy = 0;
  } else {
    x = pickRoadCenter("v") + laneOffset;
    y = rand(0, world.height);
    vx = 0;
    vy = rand(1.3, 2.8) * (Math.random() > 0.5 ? 1 : -1);
  }

  const palettes = [
    ["#315efb", "#a6c3ff"],
    ["#ca4242", "#ffb5b5"],
    ["#f2bb13", "#ffeb8c"],
    ["#2fb374", "#9beac1"],
    ["#5c4aa8", "#b7a8ef"],
    ["#80838c", "#dadde6"],
  ];
  const [base, roof] = palettes[Math.floor(rand(0, palettes.length))];
  return { x, y, w: 34, h: 18, vx, vy, base, roof };
}

function spawnPed() {
  return {
    x: rand(0, world.width),
    y: rand(0, world.height),
    r: 8,
    vx: rand(-0.8, 0.8),
    vy: rand(-0.8, 0.8),
    shirt: Math.random() > 0.5 ? "#2db4ff" : "#f05454",
    pants: Math.random() > 0.5 ? "#263046" : "#2f5d31",
  };
}

function pickRoadCenter(axis) {
  if (axis === "h") {
    const y = horizontalRoads[Math.floor(rand(0, horizontalRoads.length))] ?? world.blockSize;
    return y + world.roadSize / 2;
  }
  const x = verticalRoads[Math.floor(rand(0, verticalRoads.length))] ?? world.blockSize;
  return x + world.roadSize / 2;
}

function initMission() {
  const d = currentDifficulty();
  state.mission = {
    label: "Consegna rapida",
    objective: "Raggiungi il punto lampeggiante entro il tempo limite",
    target: { x: rand(180, world.width - 180), y: rand(180, world.height - 180) },
    ttl: d.missionTTL,
    reward: 300,
  };
}

function restartGame() {
  const d = currentDifficulty();
  state.score = 0;
  state.wanted = 0;
  state.time = d.time;
  state.message = "Nuova partita avviata.";
  state.over = false;
  state.started = true;
  state.inVehicle = null;
  player.x = world.width * 0.4;
  player.y = world.height * 0.5;
  player.hp = 100;
  player.speed = d.playerSpeed;
  player.sprint = d.sprint;
  cars.splice(0, cars.length, ...Array.from({ length: 26 }, () => spawnCar()));
  peds.splice(0, peds.length, ...Array.from({ length: 75 }, () => spawnPed()));
  pickups.length = 0;
  initMission();
}

function drawBuildingBlock(b) {
  const blockColor = b.tone === "light" ? "#d6d0c2" : "#beb6a9";
  const roofColor = b.tone === "light" ? "#7f888f" : "#5b646b";
  ctx.fillStyle = blockColor;
  ctx.fillRect(b.x, b.y, b.w, b.h);

  const padding = 20;
  ctx.fillStyle = roofColor;
  ctx.fillRect(b.x + padding, b.y + padding, b.w - padding * 2, b.h - padding * 2);

  ctx.fillStyle = "#939ca8";
  for (let x = b.x + padding + 8; x < b.x + b.w - padding - 8; x += 18) {
    for (let y = b.y + padding + 8; y < b.y + b.h - padding - 8; y += 18) {
      ctx.fillRect(x, y, 6, 8);
    }
  }
}

function drawParkBlock(b) {
  ctx.fillStyle = "#d1c8b5";
  ctx.fillRect(b.x, b.y, b.w, b.h);

  ctx.fillStyle = "#659747";
  ctx.fillRect(b.x + 16, b.y + 16, b.w - 32, b.h - 32);

  ctx.fillStyle = "#3f6e2e";
  for (let i = 0; i < 9; i++) {
    const tx = b.x + 26 + (i % 3) * ((b.w - 56) / 3) + rand(-10, 10);
    const ty = b.y + 26 + Math.floor(i / 3) * ((b.h - 56) / 3) + rand(-10, 10);
    ctx.beginPath();
    ctx.arc(tx, ty, 7, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRoads() {
  ctx.fillStyle = "#6f767e";
  ctx.fillRect(0, 0, world.width, world.height);

  for (const b of blockDecor) {
    if (b.style === "building") drawBuildingBlock(b);
    else drawParkBlock(b);
  }

  ctx.fillStyle = "#5f666f";
  for (const x of verticalRoads) ctx.fillRect(x, 0, world.roadSize, world.height);
  for (const y of horizontalRoads) ctx.fillRect(0, y, world.width, world.roadSize);

  ctx.fillStyle = "#aab2bb";
  for (const x of verticalRoads) {
    ctx.fillRect(x - 8, 0, 8, world.height);
    ctx.fillRect(x + world.roadSize, 0, 8, world.height);
  }
  for (const y of horizontalRoads) {
    ctx.fillRect(0, y - 8, world.width, 8);
    ctx.fillRect(0, y + world.roadSize, world.width, 8);
  }

  ctx.strokeStyle = "#e6d45a";
  ctx.lineWidth = 3;
  ctx.setLineDash([18, 16]);
  for (const x of verticalRoads) {
    const cx = x + world.roadSize / 2;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, world.height);
    ctx.stroke();
  }
  for (const y of horizontalRoads) {
    const cy = y + world.roadSize / 2;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(world.width, cy);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  ctx.strokeStyle = "#d8dde4";
  ctx.lineWidth = 2;
  for (const x of verticalRoads) {
    for (const y of horizontalRoads) {
      ctx.strokeRect(x + 10, y + 10, world.roadSize - 20, world.roadSize - 20);
    }
  }
}

function drawCar(car) {
  const vertical = Math.abs(car.vy) > Math.abs(car.vx);
  const bodyW = vertical ? 18 : 34;
  const bodyH = vertical ? 34 : 18;

  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.fillStyle = car.base;
  ctx.fillRect(-bodyW / 2, -bodyH / 2, bodyW, bodyH);
  ctx.fillStyle = car.roof;
  ctx.fillRect(-bodyW / 3, -bodyH / 3, (bodyW * 2) / 3, (bodyH * 2) / 3);
  ctx.fillStyle = "#21252c";

  if (vertical) {
    ctx.fillRect(-bodyW / 2 - 2, -bodyH / 2 + 3, 3, 6);
    ctx.fillRect(bodyW / 2 - 1, -bodyH / 2 + 3, 3, 6);
    ctx.fillRect(-bodyW / 2 - 2, bodyH / 2 - 9, 3, 6);
    ctx.fillRect(bodyW / 2 - 1, bodyH / 2 - 9, 3, 6);
  } else {
    ctx.fillRect(-bodyW / 2 + 3, -bodyH / 2 - 2, 6, 3);
    ctx.fillRect(bodyW / 2 - 9, -bodyH / 2 - 2, 6, 3);
    ctx.fillRect(-bodyW / 2 + 3, bodyH / 2 - 1, 6, 3);
    ctx.fillRect(bodyW / 2 - 9, bodyH / 2 - 1, 6, 3);
  }
  ctx.restore();
}

function drawPed(p) {
  ctx.fillStyle = "#e6c7a5";
  ctx.beginPath();
  ctx.arc(p.x, p.y - 5, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = p.shirt;
  ctx.fillRect(p.x - 3, p.y - 2, 6, 6);
  ctx.fillStyle = p.pants;
  ctx.fillRect(p.x - 3, p.y + 4, 2, 5);
  ctx.fillRect(p.x + 1, p.y + 4, 2, 5);
}

function drawPlayer() {
  if (state.inVehicle) return;
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);
  ctx.fillStyle = "#e7c89c";
  ctx.beginPath();
  ctx.arc(0, -5, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = player.color;
  ctx.fillRect(-4, -1, 8, 8);
  ctx.fillStyle = "#1e2f45";
  ctx.fillRect(-4, 7, 3, 6);
  ctx.fillRect(1, 7, 3, 6);
  ctx.restore();
}

function drawMission() {
  if (!state.mission) return;
  const pulse = 14 + Math.sin(performance.now() / 180) * 5;
  ctx.strokeStyle = "#6cf3ff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(state.mission.target.x, state.mission.target.y, pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#6cf3ff";
  ctx.fillRect(state.mission.target.x - 3, state.mission.target.y - 3, 6, 6);
}

function intersectsCircleRect(cx, cy, cr, rx, ry, rw, rh) {
  const closestX = clamp(cx, rx, rx + rw);
  const closestY = clamp(cy, ry, ry + rh);
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy <= cr * cr;
}

function handleInput() {
  if (state.over || !state.started) return;
  let dx = 0;
  let dy = 0;
  if (keys.has("w") || keys.has("ArrowUp")) dy -= 1;
  if (keys.has("s") || keys.has("ArrowDown")) dy += 1;
  if (keys.has("a") || keys.has("ArrowLeft")) dx -= 1;
  if (keys.has("d") || keys.has("ArrowRight")) dx += 1;

  const mag = Math.hypot(dx, dy) || 1;
  dx /= mag;
  dy /= mag;
  if (dx || dy) player.angle = Math.atan2(dy, dx);

  if (state.inVehicle) {
    const car = state.inVehicle;
    car.vx = dx * 4.6;
    car.vy = dy * 4.6;
    car.x += car.vx;
    car.y += car.vy;
    player.x = car.x;
    player.y = car.y;
  } else {
    const speed = keys.has("Shift") ? player.sprint : player.speed;
    player.x += dx * speed;
    player.y += dy * speed;
  }

  player.x = clamp(player.x, player.size, world.width - player.size);
  player.y = clamp(player.y, player.size, world.height - player.size);
}

function updateCars() {
  for (const car of cars) {
    if (car === state.inVehicle) continue;
    car.x += car.vx;
    car.y += car.vy;

    if (car.x < -50) car.x = world.width + 50;
    if (car.x > world.width + 50) car.x = -50;
    if (car.y < -50) car.y = world.height + 50;
    if (car.y > world.height + 50) car.y = -50;

    if (intersectsCircleRect(player.x, player.y, player.size / 2, car.x - 18, car.y - 18, 36, 36)) {
      player.hp -= 0.18;
      if (!state.inVehicle) state.wanted = clamp(state.wanted + 0.002, 0, 5);
    }
  }
}

function updatePeds() {
  for (const p of peds) {
    p.x += p.vx;
    p.y += p.vy;

    if (Math.random() > 0.985) {
      p.vx = rand(-1, 1);
      p.vy = rand(-1, 1);
    }

    if (p.x < 0 || p.x > world.width) p.vx *= -1;
    if (p.y < 0 || p.y > world.height) p.vy *= -1;

    const dx = p.x - player.x;
    const dy = p.y - player.y;
    const d = Math.hypot(dx, dy);

    if (d < 42) {
      p.vx = (dx / (d || 1)) * 2.2;
      p.vy = (dy / (d || 1)) * 2.2;
      if (state.inVehicle) {
        state.score += 1;
        state.wanted = clamp(state.wanted + 0.003, 0, 5);
      }
    }
  }
}

function updateMission(dt) {
  if (!state.mission || state.over || !state.started) return;
  state.mission.ttl -= dt;
  const dist = Math.hypot(player.x - state.mission.target.x, player.y - state.mission.target.y);
  if (dist < 28) {
    state.score += state.mission.reward;
    state.message = `Missione completata! +${state.mission.reward}$`;
    initMission();
    state.wanted = clamp(state.wanted + 0.4, 0, 5);
  } else if (state.mission.ttl <= 0) {
    state.message = "Missione fallita: tempo scaduto.";
    initMission();
    state.wanted = clamp(state.wanted + 0.15, 0, 5);
  }
}

function updatePickups() {
  if (Math.random() > 0.995 && pickups.length < 4) {
    pickups.push({
      x: rand(80, world.width - 80),
      y: rand(80, world.height - 80),
      type: Math.random() > 0.5 ? "cash" : "heal",
      ttl: 20,
    });
  }

  for (let i = pickups.length - 1; i >= 0; i--) {
    const item = pickups[i];
    item.ttl -= 1 / 60;
    const d = Math.hypot(player.x - item.x, player.y - item.y);
    if (d < 22) {
      if (item.type === "cash") state.score += 80;
      else player.hp = clamp(player.hp + 20, 0, 100);
      pickups.splice(i, 1);
      state.message = item.type === "cash" ? "Hai raccolto denaro." : "Kit medico raccolto.";
    } else if (item.ttl <= 0) pickups.splice(i, 1);
  }
}

function drawPickups() {
  for (const item of pickups) {
    if (item.type === "cash") {
      ctx.fillStyle = "#f7d14f";
      ctx.fillRect(item.x - 9, item.y - 7, 18, 14);
      ctx.fillStyle = "#af8a1e";
      ctx.fillRect(item.x - 2, item.y - 3, 4, 6);
    } else {
      ctx.fillStyle = "#fb5a5a";
      ctx.fillRect(item.x - 8, item.y - 8, 16, 16);
      ctx.fillStyle = "#fff";
      ctx.fillRect(item.x - 2, item.y - 6, 4, 12);
      ctx.fillRect(item.x - 6, item.y - 2, 12, 4);
    }
  }
}

function tryEnterExitVehicle() {
  if (state.over || !state.started) return;
  if (state.inVehicle) {
    state.inVehicle = null;
    state.message = "Sei sceso dal veicolo.";
    return;
  }

  let closest = null;
  let best = 52;
  for (const car of cars) {
    const d = Math.hypot(player.x - car.x, player.y - car.y);
    if (d < best) {
      best = d;
      closest = car;
    }
  }

  if (closest) {
    state.inVehicle = closest;
    state.message = "Veicolo rubato.";
    state.wanted = clamp(state.wanted + 0.7, 0, 5);
  }
}

function updateUI() {
  if (!state.started) {
    statsEl.innerHTML = "<strong>Stato:</strong> in attesa avvio";
    missionEl.innerHTML = "<strong>Premi Inizia partita</strong><br>Seleziona la difficoltà e avvia.";
    return;
  }

  const stars = "★".repeat(Math.floor(state.wanted));
  statsEl.innerHTML = `<strong>Punteggio:</strong> ${Math.floor(state.score)}<br><strong>Vita:</strong> ${Math.floor(player.hp)} / 100<br><strong>Ricercato:</strong> ${stars || "-"}<br><strong>Tempo:</strong> ${Math.ceil(state.time)}s`;

  if (state.mission) {
    missionEl.innerHTML = `<strong>${state.mission.label}</strong><br>${state.mission.objective}<br>Tempo missione: ${Math.ceil(state.mission.ttl)}s`;
  }
}

function updateCamera() {
  camera.x = clamp(player.x - canvas.width / 2, 0, world.width - canvas.width);
  camera.y = clamp(player.y - canvas.height / 2, 0, world.height - canvas.height);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  drawRoads();
  drawMission();
  drawPickups();
  for (const car of cars) drawCar(car);
  for (const p of peds) drawPed(p);
  if (state.inVehicle) drawCar(state.inVehicle);
  drawPlayer();

  ctx.restore();

  if (state.message && state.started) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(12, canvas.height - 40, canvas.width - 24, 28);
    ctx.fillStyle = "#d8ecff";
    ctx.font = "16px sans-serif";
    ctx.fillText(state.message, 20, canvas.height - 20);
  }

  if (!state.started) {
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "700 36px sans-serif";
    ctx.fillText("GRAND SHOOT", canvas.width / 2 - 140, canvas.height / 2 - 24);
    ctx.font = "18px sans-serif";
    ctx.fillText("Seleziona la difficoltà e premi Inizia partita", canvas.width / 2 - 190, canvas.height / 2 + 10);
  }

  if (state.over) {
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "700 42px sans-serif";
    ctx.fillText("GAME OVER", canvas.width / 2 - 140, canvas.height / 2 - 12);
    ctx.font = "20px sans-serif";
    ctx.fillText("Premi R per ricominciare", canvas.width / 2 - 120, canvas.height / 2 + 24);
  }
}

let previous = performance.now();
function loop(now) {
  const dt = Math.min(0.1, (now - previous) / 1000);
  previous = now;

  if (!state.over && state.started) {
    handleInput();
    updateCars();
    updatePeds();
    updateMission(dt);
    updatePickups();
    updateCamera();

    state.time -= dt;
    state.wanted = clamp(state.wanted - 0.03 * dt, 0, 5);

    if (player.hp <= 0 || state.time <= 0) {
      state.over = true;
      state.message = "";
    }
  }

  draw();
  updateUI();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (e) => {
  keys.add(e.key);
  if (e.key === " ") {
    e.preventDefault();
    tryEnterExitVehicle();
  }
  if (e.key.toLowerCase() === "r" && state.started) restartGame();
});
window.addEventListener("keyup", (e) => keys.delete(e.key));

startBtn?.addEventListener("click", () => {
  restartGame();
  canvas.focus();
});

updateUI();
requestAnimationFrame(loop);
