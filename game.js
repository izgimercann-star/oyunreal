const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const restartBtn = document.getElementById("restartBtn");

const laneCount = 3;
const laneWidth = canvas.width / laneCount;

const player = {
  width: laneWidth * 0.55,
  height: 92,
  lane: 1,
  y: canvas.height - 120,
};

let traffic = [];
let roadOffset = 0;
let score = 0;
let gameOver = false;
let spawnTimer = 0;

const settings = {
  playerSpeed: 1,
  trafficMinSpeed: 2.6,
  trafficMaxSpeed: 5.2,
  spawnEveryMs: 700,
  lanePadding: 8,
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

  statusEl.textContent = "Skor: 0";
  statusEl.classList.remove("game-over");
  restartBtn.hidden = true;
}

function spawnTrafficCar() {
  const lane = Math.floor(Math.random() * laneCount);
  const width = laneWidth * 0.5;
  const height = 90;

  traffic.push({
    lane,
    width,
    height,
    y: -height,
    speed:
      settings.trafficMinSpeed +
      Math.random() * (settings.trafficMaxSpeed - settings.trafficMinSpeed),
    color: `hsl(${Math.floor(Math.random() * 360)} 75% 55%)`,
  });
}

function drawRoad() {
  ctx.fillStyle = "#1f2937";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = 4;
  ctx.setLineDash([24, 18]);

  roadOffset = (roadOffset + 6) % 42;
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

function drawCar(x, y, width, height, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(x + 6, y + 12, width - 12, 20);
  ctx.fillRect(x + 6, y + height - 30, width - 12, 18);

  ctx.fillStyle = "#1e293b";
  ctx.fillRect(x - 2, y + 15, 6, 22);
  ctx.fillRect(x + width - 4, y + 15, 6, 22);
  ctx.fillRect(x - 2, y + height - 35, 6, 22);
  ctx.fillRect(x + width - 4, y + height - 35, 6, 22);
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
  if (gameOver) return;

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
