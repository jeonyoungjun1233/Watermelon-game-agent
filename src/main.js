import Matter from "matter-js";
import "./style.css";

const { Engine, World, Bodies, Body, Events, Runner } = Matter;

const LEVELS = [
  { key: "baby", label: "0살", color: "#ff5fa2", image: "/faces/baby.png", radius: 0.055, points: 10 },
  { key: "elementary", label: "초딩", color: "#40c8ff", image: "/faces/elementary.png", radius: 0.067, points: 25 },
  { key: "teen", label: "10대", color: "#ffd447", image: "/faces/teen.png", radius: 0.082, points: 55 },
  { key: "thirties", label: "30대", color: "#4ade80", image: "/faces/thirties.png", radius: 0.103, points: 120 },
  { key: "current", label: "현재", color: "#ff9638", image: "/faces/current.png", radius: 0.129, points: 260 },
  { key: "old100", label: "100세", color: "#a978ff", image: "/faces/old100.png", radius: 0.162, points: 600 },
];

const MEDIA = {
  merge: "/media/merge-pop.mp4",
  button: "/media/button-ding.mp4",
  bgm: "/media/meme-bgm.mp4",
  old100: "/media/old100-appear.mp4",
  celebration: "/media/old100-celebration.mp4",
};

const MAX_SPAWN_LEVEL = 2;
const FINAL_LEVEL = LEVELS.length - 1;
const DROP_COOLDOWN = 520;
const DANGER_DELAY = 2000;
const COLORS = ["#ff4f9a", "#47d6ff", "#ffe04c", "#59f28b", "#ff9238", "#b37dff"];

const app = document.querySelector("#app");

app.innerHTML = `
  <div class="shorts-frame">
    <header class="top-bar">
      <div>
        <h1>콩쌤 수박게임</h1>
        <p>같은 얼굴 2개가 합쳐지면 나이가 먹습니다</p>
      </div>
      <div class="score-card" aria-live="polite">
        <span>점수</span>
        <strong id="scoreValue">0</strong>
      </div>
    </header>

    <main class="game-layout">
      <section class="board-panel" aria-label="콩쌤 수박게임 보드">
        <canvas id="gameCanvas"></canvas>
        <div id="gameMessage" class="game-message" hidden>
          <span>GAME OVER</span>
        </div>
      </section>

      <aside class="guide-panel" aria-label="진화 가이드">
        <div class="guide-title">진화</div>
        <div class="guide-list">
          ${LEVELS.map(
            (level) => `
              <div class="guide-item" style="--stage-color: ${level.color}">
                <span class="guide-face">
                  <img src="${level.image}" alt="${level.label}" />
                </span>
                <strong>${level.label}</strong>
              </div>
            `,
          ).join("")}
        </div>
      </aside>
    </main>

    <footer class="bottom-bar">
      <button id="restartButton" type="button">다시 시작</button>
    </footer>

    <div id="celebrationOverlay" class="celebration-overlay" hidden>
      <div class="celebration-card" role="dialog" aria-modal="true" aria-label="100세 콩쌤 축하 영상">
        <div class="celebration-kicker">100세 콩쌤 등장</div>
        <video id="celebrationVideo" src="${MEDIA.celebration}" playsinline controls preload="auto"></video>
        <button id="celebrationCloseButton" type="button">게임으로 돌아가기</button>
      </div>
    </div>
  </div>
`;

const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");
const scoreValue = document.querySelector("#scoreValue");
const restartButton = document.querySelector("#restartButton");
const gameMessage = document.querySelector("#gameMessage");
const celebrationOverlay = document.querySelector("#celebrationOverlay");
const celebrationVideo = document.querySelector("#celebrationVideo");
const celebrationCloseButton = document.querySelector("#celebrationCloseButton");

const images = new Map();
const faceSprites = new Map();
const audio = createAudioSystem();

let engine;
let runner;
let boardWidth = 1;
let boardHeight = 1;
let dropX = 0;
let currentLevel = randomSpawnLevel();
let score = 0;
let canDrop = true;
let isGameOver = false;
let isCelebrating = false;
let dangerStartedAt = null;
let lastResizeKey = "";
let resizeTimer = 0;
let pieceSeed = 0;
let bgOffset = 0;

const pieces = new Set();
const effects = [];

for (const level of LEVELS) {
  const image = new Image();
  image.decoding = "async";
  image.addEventListener("load", () => {
    faceSprites.set(level.key, createCutoutSprite(image));
  });
  image.src = level.image;
  if (image.complete && image.naturalWidth > 0) {
    faceSprites.set(level.key, createCutoutSprite(image));
  }
  images.set(level.key, image);
}

function createAudioSystem() {
  const bgm = document.createElement("video");
  bgm.src = MEDIA.bgm;
  bgm.loop = true;
  bgm.preload = "auto";
  bgm.playsInline = true;
  bgm.controls = false;
  bgm.muted = false;
  bgm.volume = 0.2;
  bgm.setAttribute("playsinline", "");
  bgm.setAttribute("webkit-playsinline", "");
  bgm.setAttribute("aria-hidden", "true");
  bgm.style.position = "fixed";
  bgm.style.width = "1px";
  bgm.style.height = "1px";
  bgm.style.opacity = "0";
  bgm.style.pointerEvents = "none";
  bgm.style.left = "-10px";
  bgm.style.top = "-10px";
  document.body.append(bgm);

  const old100 = new Audio(MEDIA.old100);
  old100.preload = "auto";
  old100.volume = 0.72;

  const mergePool = createPool(MEDIA.merge, 8, 0.5);
  const buttonPool = createPool(MEDIA.button, 5, 0.35);

  let unlocked = false;
  let bgmTargetVolume = 0.2;

  function createPool(src, count, volume) {
    return Array.from({ length: count }, () => {
      const clip = new Audio(src);
      clip.preload = "auto";
      clip.volume = volume;
      return clip;
    });
  }

  function playFromPool(pool) {
    if (!unlocked) return;
    const clip = pool.find((item) => item.paused) || pool[0];
    clip.currentTime = 0;
    clip.play().catch(() => {});
  }

  function unlock() {
    if (unlocked) {
      resumeBgm();
      return;
    }

    unlocked = true;
    resumeBgm();

    Promise.allSettled(
      [...mergePool, ...buttonPool, old100].map(async (clip) => {
        const originalVolume = clip.volume;
        clip.volume = 0;
        await clip.play();
        clip.pause();
        clip.currentTime = 0;
        clip.volume = originalVolume;
      }),
    );
  }

  function resumeBgm() {
    if (!unlocked) return;
    bgm.volume = bgmTargetVolume;
    bgm.play().catch(() => {});
  }

  function setBgmVolume(volume) {
    bgmTargetVolume = volume;
    bgm.volume = volume;
  }

  return {
    unlock,
    resumeBgm,
    duckBgm() {
      setBgmVolume(0.08);
    },
    restoreBgm() {
      setBgmVolume(0.2);
      resumeBgm();
    },
    playMerge() {
      playFromPool(mergePool);
    },
    playButton() {
      playFromPool(buttonPool);
    },
    playOld100() {
      if (!unlocked) return;
      old100.currentTime = 0;
      old100.play().catch(() => {});
    },
  };
}

function randomSpawnLevel() {
  return Math.floor(Math.random() * (MAX_SPAWN_LEVEL + 1));
}

function radiusFor(levelIndex) {
  return Math.max(18, Math.min(126, boardWidth * LEVELS[levelIndex].radius));
}

function dangerLineY() {
  return Math.max(122, boardHeight * 0.16);
}

function dropYFor(levelIndex) {
  return Math.max(radiusFor(levelIndex) + 14, dangerLineY() * 0.48);
}

function clampDropX(x, levelIndex = currentLevel) {
  const radius = radiusFor(levelIndex);
  return Math.max(radius + 8, Math.min(boardWidth - radius - 8, x));
}

function syncCanvasSize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  boardWidth = Math.max(260, rect.width);
  boardHeight = Math.max(520, rect.height);
  canvas.width = Math.round(boardWidth * dpr);
  canvas.height = Math.round(boardHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  dropX = dropX ? clampDropX(dropX) : boardWidth * 0.5;
}

function resetGame() {
  if (runner) Runner.stop(runner);

  if (engine) {
    World.clear(engine.world, false);
    Engine.clear(engine);
  }

  syncCanvasSize();
  engine = Engine.create();
  engine.gravity.y = 1.08;
  runner = Runner.create();
  pieces.clear();
  effects.length = 0;
  currentLevel = randomSpawnLevel();
  score = 0;
  canDrop = true;
  isGameOver = false;
  isCelebrating = false;
  dangerStartedAt = null;
  dropX = clampDropX(boardWidth * 0.5);
  scoreValue.textContent = "0";
  gameMessage.hidden = true;
  hideCelebration();

  addBoundaries();
  bindCollisionEvents();
  Runner.run(runner, engine);
}

function addBoundaries() {
  const wallThickness = Math.max(42, boardWidth * 0.09);
  const wallOptions = { isStatic: true, label: "wall", restitution: 0.2, friction: 0.75 };
  const floor = Bodies.rectangle(
    boardWidth * 0.5,
    boardHeight + wallThickness * 0.5,
    boardWidth + wallThickness * 2,
    wallThickness,
    { ...wallOptions, restitution: 0.15, friction: 0.85 },
  );
  const leftWall = Bodies.rectangle(-wallThickness * 0.5, boardHeight * 0.5, wallThickness, boardHeight * 1.25, wallOptions);
  const rightWall = Bodies.rectangle(
    boardWidth + wallThickness * 0.5,
    boardHeight * 0.5,
    wallThickness,
    boardHeight * 1.25,
    wallOptions,
  );

  World.add(engine.world, [floor, leftWall, rightWall]);
}

function bindCollisionEvents() {
  Events.on(engine, "collisionStart", (event) => {
    if (isGameOver) return;

    for (const pair of event.pairs) {
      if (canMerge(pair.bodyA, pair.bodyB)) {
        mergePieces(pair.bodyA, pair.bodyB);
      }
    }
  });
}

function canMerge(first, second) {
  if (first.label !== "face" || second.label !== "face") return false;
  if (!pieces.has(first) || !pieces.has(second)) return false;
  if (first.plugin.merging || second.plugin.merging) return false;
  return first.plugin.level === second.plugin.level && first.plugin.level < FINAL_LEVEL;
}

function createPiece(levelIndex, x, y) {
  const radius = radiusFor(levelIndex);
  const piece = Bodies.circle(x, y, radius, {
    label: "face",
    restitution: 0.22,
    friction: 0.5,
    frictionAir: 0.012,
    density: 0.0013,
    slop: 0.02,
  });

  piece.plugin = {
    id: `piece-${pieceSeed += 1}`,
    level: levelIndex,
    radius,
    bornAt: performance.now(),
    merging: false,
  };

  pieces.add(piece);
  return piece;
}

function mergePieces(first, second) {
  first.plugin.merging = true;
  second.plugin.merging = true;

  const nextLevel = first.plugin.level + 1;
  const x = (first.position.x + second.position.x) * 0.5;
  const y = (first.position.y + second.position.y) * 0.5;
  const velocity = {
    x: (first.velocity.x + second.velocity.x) * 0.32,
    y: (first.velocity.y + second.velocity.y) * 0.32 - 1.3,
  };

  pieces.delete(first);
  pieces.delete(second);
  World.remove(engine.world, [first, second]);

  const merged = createPiece(nextLevel, x, y);
  Body.setVelocity(merged, velocity);
  Body.setAngularVelocity(merged, (first.angularVelocity + second.angularVelocity) * 0.2);
  World.add(engine.world, merged);

  score += LEVELS[nextLevel].points;
  scoreValue.textContent = score.toLocaleString("ko-KR");
  audio.playMerge();
  effects.push(createMergeEffect(x, y, LEVELS[nextLevel].color));

  if (nextLevel === FINAL_LEVEL) {
    celebrateOld100(x, y);
  }
}

function createMergeEffect(x, y, color) {
  return { kind: "merge", x, y, color, startedAt: performance.now() };
}

function createFirework(x, y, color, delay = 0) {
  const particles = Array.from({ length: 34 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 34 + Math.random() * 0.2;
    return {
      angle,
      speed: 54 + Math.random() * 92,
      size: 2.5 + Math.random() * 4.5,
      color: COLORS[(index + Math.floor(Math.random() * COLORS.length)) % COLORS.length],
    };
  });

  return { kind: "firework", x, y, color, particles, startedAt: performance.now() + delay };
}

function celebrateOld100(x, y) {
  audio.playOld100();
  effects.push(createFirework(x, y, LEVELS[FINAL_LEVEL].color));

  for (let i = 0; i < 7; i += 1) {
    effects.push(
      createFirework(
        boardWidth * (0.18 + Math.random() * 0.64),
        boardHeight * (0.12 + Math.random() * 0.42),
        COLORS[i % COLORS.length],
        i * 95,
      ),
    );
  }

  window.setTimeout(showCelebration, 760);
}

function showCelebration() {
  isCelebrating = true;
  canDrop = false;
  audio.duckBgm();
  celebrationOverlay.hidden = false;
  celebrationVideo.currentTime = 0;
  celebrationVideo.volume = 0.64;
  celebrationVideo.play().catch(() => {});
}

function hideCelebration() {
  celebrationVideo.pause();
  celebrationOverlay.hidden = true;
  audio.restoreBgm();

  if (!isGameOver) {
    isCelebrating = false;
    canDrop = true;
  }
}

function dropPiece() {
  if (!canDrop || isGameOver || isCelebrating) return;

  const levelIndex = currentLevel;
  const body = createPiece(levelIndex, clampDropX(dropX, levelIndex), dropYFor(levelIndex));
  Body.setVelocity(body, { x: (Math.random() - 0.5) * 0.45, y: 1.2 });
  Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.035);
  World.add(engine.world, body);

  currentLevel = randomSpawnLevel();
  dropX = clampDropX(dropX);
  canDrop = false;
  window.setTimeout(() => {
    if (!isGameOver && !isCelebrating) canDrop = true;
  }, DROP_COOLDOWN);
}

function updateDropPosition(event) {
  if (!event.isPrimary && event.pointerType !== "mouse") return;

  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * boardWidth;
  dropX = clampDropX(x);
}

function checkGameOver(now) {
  if (isGameOver || isCelebrating) return;

  const lineY = dangerLineY();
  const hasDangerPiece = [...pieces].some((piece) => {
    const age = now - piece.plugin.bornAt;
    const top = piece.position.y - piece.plugin.radius;
    return age > 1400 && top < lineY;
  });

  if (!hasDangerPiece) {
    dangerStartedAt = null;
    return;
  }

  dangerStartedAt ??= now;
  if (now - dangerStartedAt >= DANGER_DELAY) {
    isGameOver = true;
    canDrop = false;
    gameMessage.hidden = false;
  }
}

function drawBoardBackground(now) {
  bgOffset = (bgOffset + 0.18) % 900;
  const gradient = ctx.createLinearGradient(0, 0, boardWidth, boardHeight);
  gradient.addColorStop(0, "#14221a");
  gradient.addColorStop(0.25, "#311536");
  gradient.addColorStop(0.52, "#102832");
  gradient.addColorStop(0.76, "#3a2410");
  gradient.addColorStop(1, "#12170c");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, boardWidth, boardHeight);

  ctx.save();
  ctx.globalAlpha = 0.24;
  for (let i = -8; i < 18; i += 1) {
    const x = i * 92 + (bgOffset % 92);
    ctx.fillStyle = COLORS[(i + 18) % COLORS.length];
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 34, 0);
    ctx.lineTo(x - boardHeight * 0.55, boardHeight);
    ctx.lineTo(x - boardHeight * 0.55 - 34, boardHeight);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.2;
  for (let y = 36; y < boardHeight; y += 72) {
    for (let x = 28; x < boardWidth; x += 84) {
      const colorIndex = Math.floor((x + y + now * 0.02) / 70) % COLORS.length;
      ctx.fillStyle = COLORS[colorIndex];
      ctx.beginPath();
      ctx.arc(x + Math.sin(y + now * 0.002) * 8, y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= boardWidth; x += boardWidth / 7) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, boardHeight);
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = "rgba(255, 240, 130, 0.12)";
  ctx.fillRect(0, boardHeight - 10, boardWidth, 10);
}

function drawDangerLine(now) {
  const y = dangerLineY();
  const pulse = dangerStartedAt ? 0.35 + Math.sin(now * 0.012) * 0.18 : 0;

  ctx.save();
  ctx.strokeStyle = dangerStartedAt ? `rgba(255, 82, 82, ${0.72 + pulse})` : "rgba(255, 255, 255, 0.42)";
  ctx.lineWidth = Math.max(3, boardWidth * 0.006);
  ctx.setLineDash([12, 10]);
  ctx.beginPath();
  ctx.moveTo(16, y);
  ctx.lineTo(boardWidth - 16, y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = `900 ${Math.max(14, boardWidth * 0.036)}px system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillStyle = dangerStartedAt ? "#ff7676" : "rgba(255,255,255,0.72)";
  ctx.fillText("GAME OVER LINE", 18, y - 8);
  ctx.restore();
}

function drawDropPreview() {
  if (isGameOver || isCelebrating) return;

  const radius = radiusFor(currentLevel);
  const x = clampDropX(dropX, currentLevel);
  const y = dropYFor(currentLevel);

  ctx.save();
  ctx.globalAlpha = canDrop ? 0.62 : 0.3;
  drawFace(currentLevel, x, y, radius, true);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.24)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, Math.max(16, y - radius - 10));
  ctx.stroke();
  ctx.restore();
}

function drawPieces() {
  const orderedPieces = [...pieces].sort((a, b) => a.position.y - b.position.y);
  for (const piece of orderedPieces) {
    drawFace(piece.plugin.level, piece.position.x, piece.position.y, piece.plugin.radius, false);
  }
}

function drawFace(levelIndex, x, y, radius, isPreview) {
  const level = LEVELS[levelIndex];
  const image = images.get(level.key);
  const sprite = faceSprites.get(level.key);
  const border = Math.max(4, radius * 0.12);
  const innerRadius = radius - border * 0.82;

  ctx.save();
  ctx.fillStyle = isPreview ? "rgba(0,0,0,0.26)" : "rgba(0,0,0,0.46)";
  ctx.beginPath();
  ctx.arc(x + radius * 0.08, y + radius * 0.16, radius * 0.96, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  const ballGradient = ctx.createRadialGradient(x - radius * 0.35, y - radius * 0.42, radius * 0.12, x, y, radius);
  ballGradient.addColorStop(0, "rgba(255,255,255,0.82)");
  ballGradient.addColorStop(0.34, hexToRgba(level.color, 0.58));
  ballGradient.addColorStop(1, hexToRgba(level.color, 0.16));
  ctx.fillStyle = ballGradient;
  ctx.beginPath();
  ctx.arc(x, y, innerRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.clip();

  if (sprite) {
    const spriteScale = levelIndex === FINAL_LEVEL ? 2.34 : 2.24;
    const drawSize = radius * spriteScale;
    ctx.drawImage(sprite, x - drawSize * 0.5, y - drawSize * 0.57, drawSize, drawSize);
  } else if (image?.complete && image.naturalWidth > 0) {
    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
    const sourceX = (image.naturalWidth - sourceSize) * 0.5;
    ctx.drawImage(image, sourceX, 0, sourceSize, sourceSize, x - radius, y - radius, radius * 2, radius * 2);
  } else {
    ctx.fillStyle = level.color;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  ctx.restore();

  ctx.save();
  ctx.globalAlpha = isPreview ? 0.88 : 1;
  ctx.strokeStyle = "rgba(255,255,255,0.96)";
  ctx.lineWidth = border + 2;
  ctx.beginPath();
  ctx.arc(x, y, radius - border * 0.56, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = level.color;
  ctx.lineWidth = border;
  ctx.beginPath();
  ctx.arc(x, y, radius - border * 0.55, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.68)";
  ctx.lineWidth = Math.max(1.5, border * 0.26);
  ctx.beginPath();
  ctx.arc(x, y, radius - border * 1.1, -Math.PI * 0.72, -Math.PI * 0.18);
  ctx.stroke();
  ctx.restore();
}

function createCutoutSprite(image) {
  const size = 720;
  const sprite = document.createElement("canvas");
  sprite.width = size;
  sprite.height = size;
  const spriteCtx = sprite.getContext("2d", { willReadFrequently: true });
  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = (image.naturalWidth - sourceSize) * 0.5;

  spriteCtx.drawImage(image, sourceX, 0, sourceSize, sourceSize, 0, 0, size, size);

  const imageData = spriteCtx.getImageData(0, 0, size, size);
  const data = imageData.data;
  const samples = [
    sampleColor(data, size, 8, 8),
    sampleColor(data, size, size - 9, 8),
    sampleColor(data, size, 8, size - 9),
    sampleColor(data, size, size - 9, size - 9),
  ];

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const brightness = (r + g + b) / 3;
    const saturation = max === 0 ? 0 : (max - min) / max;
    const closeToBg = samples.some((sample) => colorDistance(sample, [r, g, b]) < 62);
    const paleBackdrop = brightness > 170 && b > r + 8 && g > r - 8 && saturation < 0.22;
    const labCoatWhite = brightness > 214 && saturation < 0.16;

    if (closeToBg || paleBackdrop || labCoatWhite) {
      data[i + 3] = 0;
    } else if (brightness > 190 && saturation < 0.24) {
      data[i + 3] = Math.min(data[i + 3], 110);
    }
  }

  spriteCtx.putImageData(imageData, 0, 0);
  return sprite;
}

function sampleColor(data, width, x, y) {
  const index = (y * width + x) * 4;
  return [data[index], data[index + 1], data[index + 2]];
}

function colorDistance(first, second) {
  return Math.hypot(first[0] - second[0], first[1] - second[1], first[2] - second[2]);
}

function drawEffects(now) {
  for (let i = effects.length - 1; i >= 0; i -= 1) {
    const effect = effects[i];
    if (effect.kind === "merge") {
      drawMergeEffect(effect, now, i);
    } else {
      drawFirework(effect, now, i);
    }
  }
}

function drawMergeEffect(effect, now, index) {
  const progress = (now - effect.startedAt) / 620;
  if (progress >= 1) {
    effects.splice(index, 1);
    return;
  }

  const alpha = 1 - progress;
  const ringRadius = 22 + progress * 72;
  ctx.save();
  ctx.strokeStyle = hexToRgba(effect.color, alpha);
  ctx.lineWidth = 5 * alpha + 1;
  ctx.beginPath();
  ctx.arc(effect.x, effect.y, ringRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = hexToRgba(effect.color, alpha);
  for (let dot = 0; dot < 10; dot += 1) {
    const angle = (Math.PI * 2 * dot) / 10 + progress * 1.3;
    const distance = 18 + progress * 88;
    ctx.beginPath();
    ctx.arc(
      effect.x + Math.cos(angle) * distance,
      effect.y + Math.sin(angle) * distance,
      Math.max(2, 6 * alpha),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.restore();
}

function drawFirework(effect, now, index) {
  const progress = (now - effect.startedAt) / 1200;
  if (progress < 0) return;

  if (progress >= 1) {
    effects.splice(index, 1);
    return;
  }

  const alpha = 1 - progress;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.strokeStyle = hexToRgba(effect.color, alpha);
  ctx.lineWidth = Math.max(2, 9 * alpha);
  ctx.beginPath();
  ctx.arc(effect.x, effect.y, 18 + progress * 120, 0, Math.PI * 2);
  ctx.stroke();

  for (const particle of effect.particles) {
    const distance = particle.speed * progress;
    const gravity = progress * progress * 72;
    const px = effect.x + Math.cos(particle.angle) * distance;
    const py = effect.y + Math.sin(particle.angle) * distance + gravity;
    ctx.fillStyle = hexToRgba(particle.color, alpha);
    ctx.beginPath();
    ctx.arc(px, py, particle.size * alpha, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = hexToRgba(particle.color, alpha * 0.65);
    ctx.lineWidth = Math.max(1, particle.size * 0.55 * alpha);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px - Math.cos(particle.angle) * 18, py - Math.sin(particle.angle) * 18);
    ctx.stroke();
  }
  ctx.restore();
}

function hexToRgba(hex, alpha) {
  const value = Number.parseInt(hex.slice(1), 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function draw(now) {
  checkGameOver(now);
  ctx.clearRect(0, 0, boardWidth, boardHeight);
  drawBoardBackground(now);
  drawDangerLine(now);
  drawDropPreview();
  drawPieces();
  drawEffects(now);
  requestAnimationFrame(draw);
}

document.addEventListener("pointerdown", () => audio.unlock(), { capture: true });
document.addEventListener("touchstart", () => audio.unlock(), { capture: true, passive: true });
document.addEventListener("click", () => audio.unlock(), { capture: true });
document.addEventListener("keydown", () => audio.unlock(), { capture: true });

document.addEventListener("click", (event) => {
  if (event.target.closest("button")) {
    audio.playButton();
  }
});

canvas.addEventListener("pointermove", updateDropPosition);
canvas.addEventListener("pointerdown", (event) => {
  updateDropPosition(event);
  dropPiece();
});

restartButton.addEventListener("click", resetGame);
celebrationCloseButton.addEventListener("click", hideCelebration);
celebrationVideo.addEventListener("ended", hideCelebration);

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    celebrationVideo.pause();
  } else {
    audio.resumeBgm();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") dropX = clampDropX(dropX - boardWidth * 0.06);
  if (event.key === "ArrowRight") dropX = clampDropX(dropX + boardWidth * 0.06);

  if (event.code === "Space") {
    event.preventDefault();
    dropPiece();
  }

  if (event.key.toLowerCase() === "r") {
    resetGame();
  }
});

const resizeObserver = new ResizeObserver(() => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    const rect = canvas.getBoundingClientRect();
    const nextKey = `${Math.round(rect.width)}x${Math.round(rect.height)}`;
    if (nextKey !== lastResizeKey) {
      lastResizeKey = nextKey;
      resetGame();
    }
  }, 160);
});

resizeObserver.observe(canvas);
syncCanvasSize();
lastResizeKey = `${Math.round(boardWidth)}x${Math.round(boardHeight)}`;
resetGame();
requestAnimationFrame(draw);
