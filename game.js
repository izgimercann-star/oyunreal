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
let gameOver = false;
let spawnTimer = 0;
let policeCheckActive = false;
let policeCheckDone = false;
let policeTimerMs = 0;

const settings = {
  playerSpeed: 1,
  trafficMinSpeed: 2.1,
  trafficMaxSpeed: 4.2,
  spawnEveryMs: 1180,
  lanePadding: 10,
  policeTriggerScore: 12,
  policeDurationMs: 10000,
};

function playerX() {
  return player.lane * laneWidth + (laneWidth - player.width) / 2;
}

function resetGame() {
  traffic = [];
  roadOffset = 0;
  score = 0;
  gameOver = false;
  spawnTimer = 0;
  player.lane = 1;
  policeCheckActive = false;
  policeCheckDone = false;
  policeTimerMs = 0;

  statusEl.textContent = "Skor: 0";
  statusEl.classList.remove("game-over", "police-check");
  restartBtn.hidden = true;
}

function spawnTrafficCar() {
  const lane = Math.floor(Math.random() * laneCount);
  const width = laneWidth * 0.5;
  const height = 92;

  const palette = ["#f97316", "#22c55e", "#60a5fa", "#fb7185", "#facc15"];
  const color = palette[Math.floor(Math.random() * palette.length)];

  traffic.push({
    lane,
    width,
    height,
    y: -height,
    speed:
      settings.trafficMinSpeed +
      Math.random() * (settings.trafficMaxSpeed - settings.trafficMinSpeed),
    color,
  });
}

function drawRoad() {
  // Şerit dışı alanlar
  ctx.fillStyle = "#4b5563";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Ana asfalt
  ctx.fillStyle = "#1f2937";
  ctx.fillRect(22, 0, canvas.width - 44, canvas.height);

  // Yol kenar çizgileri
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(22, 0, 4, canvas.height);
  ctx.fillRect(canvas.width - 26, 0, 4, canvas.height);

  // Şerit çizgileri
  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = 3;
  ctx.setLineDash([24, 18]);

  roadOffset = (roadOffset + 5) % 42;
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

  // Gövde
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 12);
  ctx.fill();

  // Cam
  ctx.fillStyle = "#bfdbfe";
  ctx.beginPath();
  ctx.roundRect(x + 8, y + 10, width - 16, 24, 8);
  ctx.fill();

  // Orta kabin
  ctx.fillStyle = isPolice ? "#dbeafe" : "#e2e8f0";
  ctx.beginPath();
  ctx.roundRect(x + 10, y + 40, width - 20, 22, 8);
  ctx.fill();

  // Farlar
  ctx.fillStyle = "#fde68a";
  ctx.fillRect(x + 8, y + height - 8, 10, 5);
  ctx.fillRect(x + width - 18, y + height - 8, 10, 5);

  // Tekerlekler
  ctx.fillStyle = "#111827";
  ctx.fillRect(x - 2, y + 16, 6, 22);
  ctx.fillRect(x + width - 4, y + 16, 6, 22);
  ctx.fillRect(x - 2, y + height - 36, 6, 22);
  ctx.fillRect(x + width - 4, y + height - 36, 6, 22);

  if (isPolice) {
    // Polis çizgileri
    ctx.fillStyle = "#1d4ed8";
    ctx.fillRect(x + 7, y + 42, width - 14, 5);

    // Çakar
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
  const sideY = canvas.height * 0.35;

  drawCar(sideX, sideY, policeWidth, policeHeight, "#f8fafc", true);

  // Dubalar (sarı)
  const conesY = canvas.height * 0.48;
  drawCone(canvas.width - 20, conesY);
  drawCone(canvas.width - 44, conesY + 18);
  drawCone(canvas.width - 68, conesY + 36);

  // Kontrol yazısı kutusu
  const remainingSec = Math.ceil((settings.policeDurationMs - policeTimerMs) / 1000);
  const boxText = `Denetleme yapılıyor... ${Math.max(remainingSec, 0)} sn`;

  ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
  ctx.beginPath();
  ctx.roundRect(38, 220, canvas.width - 76, 74, 12);
  ctx.fill();

  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 20px Arial";
  ctx.textAlign = "center";
  ctx.fillText("POLİS KONTROLÜ", canvas.width / 2, 250);
  ctx.font = "16px Arial";
  ctx.fillText(boxText, canvas.width / 2, 274);
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

function update(deltaMs) {
  if (gameOver) return;

  if (!policeCheckActive && !policeCheckDone && score >= settings.policeTriggerScore) {
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
      statusEl.textContent = `✅ Denetleme tamamlandı. Skor: ${score}`;
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
      statusEl.textContent = `💥 Oyun bitti! Skor: ${score}`;
      statusEl.classList.remove("police-check");
      statusEl.classList.add("game-over");
      restartBtn.hidden = false;
      return;
    }
  }

  statusEl.textContent = `Skor: ${score}`;
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
