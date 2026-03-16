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
  color: "#76f08e",
};

const camera = { x: 0, y: 0 };
const cars = Array.from({ length: 22 }, () => spawnCar());
const peds = Array.from({ length: 60 }, () => spawnPed());
const pickups = [];

function currentDifficulty() {
  return difficultySettings[difficultyEl?.value] || difficultySettings.normal;
}

function spawnCar() {
  const onHorizontal = Math.random() > 0.5;
  const laneOffset = rand(-22, 22);
  let x, y, vx, vy;
  if (onHorizontal) {
    y = pickRoadCenter() + laneOffset;
    x = rand(0, world.width);
    vx = rand(1.2, 2.6) * (Math.random() > 0.5 ? 1 : -1);
    vy = 0;
  } else {
    x = pickRoadCenter() + laneOffset;
    y = rand(0, world.height);
    vx = 0;
    vy = rand(1.2, 2.6) * (Math.random() > 0.5 ? 1 : -1);
  }
  return { x, y, w: 34, h: 18, vx, vy, color: `hsl(${rand(0, 360)} 70% 58%)` };
}

function spawnPed() {
  return {
    x: rand(0, world.width),
    y: rand(0, world.height),
    r: 8,
    vx: rand(-0.8, 0.8),
    vy: rand(-0.8, 0.8),
    color: `hsl(${rand(0, 360)} 50% 70%)`,
  };
}

function pickRoadCenter() {
  const segment = world.blockSize + world.roadSize;
  const index = Math.floor(rand(0, world.width / segment));
  return index * segment + world.blockSize + world.roadSize / 2;
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
  cars.splice(0, cars.length, ...Array.from({ length: 22 }, () => spawnCar()));
  peds.splice(0, peds.length, ...Array.from({ length: 60 }, () => spawnPed()));
  pickups.length = 0;
  initMission();
}

function drawMap() {
  ctx.fillStyle = "#2a5b35";
  ctx.fillRect(0, 0, world.width, world.height);
  const segment = world.blockSize + world.roadSize;
  ctx.fillStyle = "#31363f";
  for (let x = world.blockSize; x < world.width; x += segment) ctx.fillRect(x, 0, world.roadSize, world.height);
  for (let y = world.blockSize; y < world.height; y += segment) ctx.fillRect(0, y, world.width, world.roadSize);
  ctx.strokeStyle = "#ecf0a4";
  ctx.lineWidth = 2;
  ctx.setLineDash([14, 14]);
  for (let x = world.blockSize + world.roadSize / 2; x < world.width; x += segment) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, world.height);
    ctx.stroke();
  }
  for (let y = world.blockSize + world.roadSize / 2; y < world.height; y += segment) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(world.width, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawEntityRect(e) {
  ctx.fillStyle = e.color;
  ctx.fillRect(e.x - e.w / 2, e.y - e.h / 2, e.w, e.h);
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.strokeRect(e.x - e.w / 2, e.y - e.h / 2, e.w, e.h);
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);
  if (state.inVehicle) {
    ctx.fillStyle = "#ffe57f";
    ctx.fillRect(-11, -7, 22, 14);
  } else {
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(0, 0, player.size / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawMission() {
  if (!state.mission) return;
  const pulse = 12 + Math.sin(performance.now() / 180) * 5;
  ctx.strokeStyle = "#6cf3ff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(state.mission.target.x, state.mission.target.y, pulse, 0, Math.PI * 2);
  ctx.stroke();
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
    car.vx = dx * 4.5;
    car.vy = dy * 4.5;
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
    if (intersectsCircleRect(player.x, player.y, player.size / 2, car.x - car.w / 2, car.y - car.h / 2, car.w, car.h)) {
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
  if (Math.random() > 0.995 && pickups.length < 4) pickups.push({ x: rand(80, world.width - 80), y: rand(80, world.height - 80), type: Math.random() > 0.5 ? "cash" : "heal", ttl: 20 });
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
    ctx.fillStyle = item.type === "cash" ? "#ffd166" : "#ff6b6b";
    ctx.fillRect(item.x - 8, item.y - 8, 16, 16);
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
  let best = 48;
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
  if (state.mission) missionEl.innerHTML = `<strong>${state.mission.label}</strong><br>${state.mission.objective}<br>Tempo missione: ${Math.ceil(state.mission.ttl)}s`;
}

function updateCamera() {
  camera.x = clamp(player.x - canvas.width / 2, 0, world.width - canvas.width);
  camera.y = clamp(player.y - canvas.height / 2, 0, world.height - canvas.height);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(-camera.x, -camera.y);
  drawMap();
  drawMission();
  drawPickups();
  for (const car of cars) drawEntityRect(car);
  for (const p of peds) {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
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
