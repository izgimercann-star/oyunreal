const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const restartBtn = document.getElementById("restartBtn");

const laneCount = 3;
const laneWidth = canvas.width / laneCount;

const player = {
  width: laneWidth * 0.56,
  height: 96,
  lane: 1,
  y: canvas.height - 120,
};

let traffic = [];
let roadOffset = 0;
let score = 0;
let distance = 0;
let elapsedMs = 0;
let gameOver = false;
let spawnTimer = 0;
let policeCheckActive = false;
let policeCheckDone = false;
let policeTimerMs = 0;

const settings = {
  playerSpeed: 1,
  trafficMinSpeed: 1.8,
  trafficMaxSpeed: 3.4,
  spawnEveryMs: 1600,
  maxTrafficOnScreen: 4,
  lanePadding: 10,
  policeTriggerScore: 6,
  policeTriggerElapsedMs: 18000,
  policeDurationMs: 10000,
};

function playerX() {
  return player.lane * laneWidth + (laneWidth - player.width) / 2;
}

function roundedRectPath(x, y, width, height, radius) {
  const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function resetGame() {
  traffic = [];
  roadOffset = 0;
  score = 0;
  distance = 0;
  elapsedMs = 0;
  gameOver = false;
  spawnTimer = 0;
  player.lane = 1;
  policeCheckActive = false;
  policeCheckDone = false;
  policeTimerMs = 0;

  statusEl.textContent = "Skor: 0 | Mesafe: 0 m";
  statusEl.classList.remove("game-over", "police-check");
  restartBtn.hidden = true;
}

function spawnTrafficCar() {
  if (traffic.length >= settings.maxTrafficOnScreen) return;

  const lane = Math.floor(Math.random() * laneCount);
  const width = laneWidth * 0.5;
  const height = 92;

  // Oyuncu şeridinde üst üste spawn'ları azalt
  if (lane === player.lane && Math.random() < 0.55) return;

  const palette = ["#f97316", "#22c55e", "#60a5fa", "#fb7185", "#facc15", "#a78bfa"];
  const color = palette[Math.floor(Math.random() * palette.length)];

  traffic.push({
    lane,
    width,
    height,
    y: -height - Math.random() * 140,
    speed:
      settings.trafficMinSpeed +
      Math.random() * (settings.trafficMaxSpeed - settings.trafficMinSpeed),
    color,
  });
}

function drawRoad() {
  ctx.fillStyle = "#4b5563";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#1f2937";
  ctx.fillRect(22, 0, canvas.width - 44, canvas.height);

  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(22, 0, 4, canvas.height);
  ctx.fillRect(canvas.width - 26, 0, 4, canvas.height);

  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = 3;
  ctx.setLineDash([24, 18]);

  roadOffset = (roadOffset + 4.5) % 42;
  ctx.lineDashOffset = -roadOffset;

  for (let i = 1; i < laneCount; i++) {
    const x = i * laneWidth;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  ctx.setLineDash([]);
}

function drawCar(x, y, width, height, color, isPolice = false) {
  ctx.save();

  ctx.fillStyle = color;
  roundedRectPath(x, y, width, height, 12);
  ctx.fill();

  ctx.fillStyle = "#bfdbfe";
  roundedRectPath(x + 8, y + 10, width - 16, 24, 8);
  ctx.fill();

  ctx.fillStyle = isPolice ? "#dbeafe" : "#e2e8f0";
  roundedRectPath(x + 10, y + 40, width - 20, 22, 8);
  ctx.fill();

  ctx.fillStyle = "#fde68a";
  ctx.fillRect(x + 8, y + height - 8, 10, 5);
  ctx.fillRect(x + width - 18, y + height - 8, 10, 5);

  ctx.fillStyle = "#111827";
  ctx.fillRect(x - 2, y + 16, 6, 22);
  ctx.fillRect(x + width - 4, y + 16, 6, 22);
  ctx.fillRect(x - 2, y + height - 36, 6, 22);
  ctx.fillRect(x + width - 4, y + height - 36, 6, 22);

  if (isPolice) {
    ctx.fillStyle = "#1d4ed8";
    ctx.fillRect(x + 7, y + 42, width - 14, 5);

    ctx.fillStyle = "#ef4444";
    ctx.fillRect(x + width / 2 - 10, y + 4, 8, 5);
    ctx.fillStyle = "#3b82f6";
    ctx.fillRect(x + width / 2 + 2, y + 4, 8, 5);
  }

  ctx.restore();
}

function drawCone(x, y) {
  ctx.fillStyle = "#fbbf24";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - 10, y + 20);
  ctx.lineTo(x + 10, y + 20);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(x - 6, y + 8, 12, 3);
}

function drawPoliceScene() {
  const policeWidth = laneWidth * 0.58;
  const policeHeight = 102;
  const sideX = canvas.width - policeWidth - 10;
  const sideY = canvas.height * 0.34;

  drawCar(sideX, sideY, policeWidth, policeHeight, "#f8fafc", true);

  const conesY = canvas.height * 0.48;
  drawCone(canvas.width - 20, conesY);
  drawCone(canvas.width - 44, conesY + 18);
  drawCone(canvas.width - 68, conesY + 36);

  const remainingSec = Math.ceil((settings.policeDurationMs - policeTimerMs) / 1000);
  const boxText = `Denetleme yapılıyor... ${Math.max(remainingSec, 0)} sn`;

  ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
  roundedRectPath(32, 214, canvas.width - 64, 84, 12);
  ctx.fill();

  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 20px Arial";
  ctx.textAlign = "center";
  ctx.fillText("POLİS KONTROLÜ", canvas.width / 2, 246);
  ctx.font = "16px Arial";
  ctx.fillText(boxText, canvas.width / 2, 272);
  ctx.textAlign = "start";
}

function intersects(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function shouldStartPoliceCheck() {
  return (
    !policeCheckActive &&
    !policeCheckDone &&
    (score >= settings.policeTriggerScore || elapsedMs >= settings.policeTriggerElapsedMs)
  );
}

function update(deltaMs) {
  if (gameOver) return;

  elapsedMs += deltaMs;
  distance += 0.012 * deltaMs;

  if (shouldStartPoliceCheck()) {
    policeCheckActive = true;
    policeTimerMs = 0;
    statusEl.textContent = "🚓 Polis çevirdi: Denetleme başlatıldı";
    statusEl.classList.add("police-check");
  }

  if (policeCheckActive) {
    policeTimerMs += deltaMs;
    if (policeTimerMs >= settings.policeDurationMs) {
      policeCheckActive = false;
      policeCheckDone = true;
      statusEl.classList.remove("police-check");
      statusEl.textContent = `✅ Denetleme tamamlandı. Skor: ${score} | Mesafe: ${Math.floor(distance)} m`;
    }
    return;
  }

  spawnTimer += deltaMs;
  if (spawnTimer >= settings.spawnEveryMs) {
    spawnTimer = 0;
    spawnTrafficCar();
  }

  for (const car of traffic) {
    car.y += car.speed;
  }

  traffic = traffic.filter((car) => {
    if (car.y > canvas.height) {
      score += 1;
      return false;
    }
    return true;
  });

  const p = {
    x: playerX(),
    y: player.y,
    width: player.width,
    height: player.height,
  };

  for (const car of traffic) {
    const padding = settings.lanePadding;
    const t = {
      x: car.lane * laneWidth + (laneWidth - car.width) / 2 + padding,
      y: car.y,
      width: car.width - padding * 2,
      height: car.height,
    };

    if (intersects(p, t)) {
      gameOver = true;
      statusEl.textContent = `💥 Oyun bitti! Skor: ${score} | Mesafe: ${Math.floor(distance)} m`;
      statusEl.classList.remove("police-check");
      statusEl.classList.add("game-over");
      restartBtn.hidden = false;
      return;
    }
  }

  statusEl.textContent = `Skor: ${score} | Mesafe: ${Math.floor(distance)} m`;
}

function draw() {
  drawRoad();

  drawCar(playerX(), player.y, player.width, player.height, "#38bdf8");

  for (const car of traffic) {
    const x = car.lane * laneWidth + (laneWidth - car.width) / 2;
    drawCar(x, car.y, car.width, car.height, car.color);
  }

  if (policeCheckActive) {
    drawPoliceScene();
  }
}

let lastTime = performance.now();
function loop(now) {
  const deltaMs = now - lastTime;
  lastTime = now;

  update(deltaMs);
  draw();

  requestAnimationFrame(loop);
}

document.addEventListener("keydown", (event) => {
  if (gameOver || policeCheckActive) return;

  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
    player.lane = Math.max(0, player.lane - settings.playerSpeed);
  }

  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
    player.lane = Math.min(laneCount - 1, player.lane + settings.playerSpeed);
  }
});

restartBtn.addEventListener("click", resetGame);

resetGame();
requestAnimationFrame(loop);
