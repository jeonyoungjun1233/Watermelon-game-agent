import Matter from "matter-js";
import { createClient } from "@supabase/supabase-js";
import "./style.css";

const { Engine, World, Bodies, Body, Events, Runner } = Matter;
const KONG_ASSET_BASE = "/assets/kong";

const KONG_STAGES = [
  {
    id: 1,
    key: "baby",
    name: "콩쌤 아기",
    shortName: "아기",
    image: `${KONG_ASSET_BASE}/baby.png`,
    radius: 24,
    score: 0,
    color: "#83d8ff",
    accentColor: "#c9f0ff",
    glowColor: "#65d6ff",
    drawScale: 2.24,
  },
  {
    id: 2,
    key: "elementary",
    name: "콩쌤 초딩",
    shortName: "초딩",
    image: `${KONG_ASSET_BASE}/elementary.png`,
    radius: 29,
    score: 2,
    color: "#39d77d",
    accentColor: "#9cff6b",
    glowColor: "#47e789",
    drawScale: 2.22,
  },
  {
    id: 3,
    key: "thirties",
    name: "30대 콩쌤",
    shortName: "30대",
    image: `${KONG_ASSET_BASE}/thirties.png`,
    radius: 35,
    score: 5,
    color: "#2d75bd",
    accentColor: "#ffd74d",
    glowColor: "#3e96e0",
    drawScale: 2.2,
  },
  {
    id: 4,
    key: "current",
    name: "현재 콩쌤",
    shortName: "현재",
    image: `${KONG_ASSET_BASE}/current.png`,
    radius: 43,
    score: 9,
    color: "#77f0cf",
    accentColor: "#ffffff",
    glowColor: "#6ff7dc",
    drawScale: 2.18,
  },
  {
    id: 5,
    key: "age100",
    name: "100세 콩쌤",
    shortName: "100세",
    image: `${KONG_ASSET_BASE}/age100.png`,
    radius: 53,
    score: 15,
    color: "#a8a197",
    accentColor: "#d6c2a0",
    glowColor: "#cfc3ae",
    drawScale: 2.14,
  },
  {
    id: 6,
    key: "immortal",
    name: "불로장생 콩쌤",
    shortName: "불로장생",
    image: `${KONG_ASSET_BASE}/immortal.png`,
    radius: 64,
    score: 24,
    color: "#f1d45b",
    accentColor: "#9cff70",
    glowColor: "#ffe57b",
    drawScale: 2.14,
  },
  {
    id: 7,
    key: "cyborg",
    name: "사이보그 콩쌤",
    shortName: "사이보그",
    image: `${KONG_ASSET_BASE}/cyborg.png`,
    radius: 77,
    score: 36,
    color: "#2fc7ff",
    accentColor: "#73fff4",
    glowColor: "#32c7ff",
    drawScale: 2.12,
  },
  {
    id: 8,
    key: "cosmic",
    name: "우주적 존재 콩쌤",
    shortName: "우주존재",
    image: `${KONG_ASSET_BASE}/cosmic.png`,
    radius: 91,
    score: 52,
    color: "#8a66ff",
    accentColor: "#20265f",
    glowColor: "#a47dff",
    drawScale: 2.08,
  },
  {
    id: 9,
    key: "god",
    name: "신이 된 콩쌤",
    shortName: "신",
    image: `${KONG_ASSET_BASE}/god.png`,
    radius: 107,
    score: 75,
    color: "#ffd65a",
    accentColor: "#fff4ba",
    glowColor: "#ffe16d",
    drawScale: 2.04,
  },
  {
    id: 10,
    key: "finalBoss",
    name: "최종보스 콩쌤",
    shortName: "최종보스",
    image: `${KONG_ASSET_BASE}/final-boss.png`,
    radius: 124,
    score: 110,
    color: "#a65cff",
    accentColor: "#ff3d55",
    glowColor: "#c04dff",
    drawScale: 2.02,
  },
];

const SCORE_TABLE = Object.fromEntries(KONG_STAGES.map((stage) => [stage.id, stage.score]));
const FINAL_LEVEL = KONG_STAGES.length - 1;
const FINAL_BOSS_BONUS = 150;
const MAX_SPAWN_LEVEL = 2;
const DROP_COOLDOWN = 520;
const DANGER_DELAY = 2000;
const SETTINGS_KEY = "kongSettings";
const NICKNAME_KEY = "kongNickname";
const GUEST_BEST_KEY = "guestBestScore";
const GUEST_LAST_KEY = "guestLastScore";
const RANKINGS_TABLE = "rankings";
const RANKING_SETUP_MESSAGE = "Supabase SQL Editor에서 supabase/ranking.sql을 실행하면 온라인 랭킹이 열립니다.";

const SUPABASE_URL = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL || "");
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const HAS_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const supabase = HAS_SUPABASE
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    })
  : null;

const MEDIA = {
  merge: "/media/merge-pop.mp4",
  button: "/media/button-ding.mp4",
  bgm: "/media/meme-bgm.mp4",
  special: "/media/old100-appear.mp4",
  gameOver: "/media/old100-appear.mp4",
};

const COLORS = KONG_STAGES.map((stage) => stage.color);
const DEFAULT_SETTINGS = {
  music: true,
  sfx: true,
  vibration: true,
};

const app = document.querySelector("#app");
let userSettings = loadSettings();
let currentSession = null;
let currentUser = null;

app.innerHTML = `
  <div id="gameFrame" class="shorts-frame">
    <button id="settingsButton" class="pause-button" type="button" aria-label="설정 열기" hidden>Ⅱ</button>

    <section id="homeScreen" class="screen home-screen">
      <div class="home-copy">
        <p class="kicker">KONG LAB CONTROL</p>
        <h1 class="stacked-title"><span>콩쌤의</span><span>수박게임</span></h1>
        <p class="home-subtitle">괴짜 개발자의 금지된 진화 실험</p>
      </div>
      <div class="home-lab-status" aria-label="실험 상태">
        <div><span>병맛 농도</span><strong>98%</strong></div>
        <div><span>실험 안정도</span><strong>23%</strong></div>
        <div><span>최종보스 위험도</span><strong>매우 높음</strong></div>
      </div>
      <div class="home-face-strip" aria-hidden="true">
        <img src="${KONG_STAGES[4].image}" alt="" decoding="async" />
        <img src="${KONG_STAGES[5].image}" alt="" decoding="async" />
        <img src="${KONG_STAGES[7].image}" alt="" decoding="async" />
      </div>
      <div class="home-actions">
        <button id="guestStartButton" class="primary-action" type="button">🧪 비회원으로 실험 시작</button>
        <button id="loginStartButton" type="button">⚡ 로그인하고 연구원 등록</button>
        <button id="rankingOpenButton" type="button">📊 연구소 랭킹 보기</button>
        <button id="logoutHomeButton" type="button" hidden>로그아웃</button>
      </div>
      <p class="home-warning">※ 경고: 최종보스 콩쌤 생성 시 책임지지 않습니다.</p>
      <p id="homeStatus" class="status-line" aria-live="polite"></p>
    </section>

    <section id="gameScreen" class="game-shell" hidden>
      <header class="top-bar">
        <div class="title-block">
          <h1 class="stacked-title"><span>콩쌤의</span><span>수박게임</span></h1>
          <p id="playerModeLabel">비회원 플레이</p>
        </div>
        <div class="score-card" aria-live="polite">
          <span>이번 점수</span>
          <strong id="scoreValue">0</strong>
          <small id="bestValue">최고 0</small>
        </div>
      </header>

      <main class="game-layout">
        <section class="board-panel" aria-label="콩쌤 수박게임 보드">
          <canvas id="gameCanvas"></canvas>
          <div id="gameMessage" class="game-message" hidden>
            <span>GAME OVER</span>
          </div>
        </section>

        <aside class="guide-panel" aria-label="진화 단계">
          <div class="guide-title">진화</div>
          <div class="guide-list">
            ${KONG_STAGES.map(
              (stage) => `
                <div class="guide-item" style="--stage-color: ${stage.color}; --stage-accent: ${stage.accentColor}">
                  <span class="guide-face">
                    <img src="${stage.image}" data-fallback="${stage.fallbackImage || ""}" alt="${stage.name}" loading="lazy" decoding="async" />
                  </span>
                  <span class="guide-copy">
                    <strong title="${stage.name}">${stage.name}</strong>
                    <small>+${stage.score}점</small>
                  </span>
                </div>
              `,
            ).join("")}
          </div>
        </aside>
      </main>

      <footer class="bottom-bar">
        <div class="next-card">
          <span>다음</span>
          <img id="nextFace" alt="" decoding="async" />
          <strong id="nextStageName">콩쌤 아기</strong>
        </div>
        <button id="restartButton" type="button">처음부터</button>
      </footer>
    </section>

    <section id="rankingScreen" class="screen ranking-screen" hidden>
      <div class="screen-heading">
        <p class="kicker">온라인 TOP 100</p>
        <h2>랭킹 보기</h2>
      </div>
      <div id="myRankBox" class="my-rank-box">로그인하면 내 순위를 확인할 수 있어요.</div>
      <div class="ranking-table-wrap">
        <table class="ranking-table">
          <thead>
            <tr>
              <th>순위</th>
              <th>닉네임</th>
              <th>최고점수</th>
            </tr>
          </thead>
          <tbody id="rankingRows"></tbody>
        </table>
      </div>
      <p id="rankingStatus" class="status-line" aria-live="polite"></p>
      <div class="row-actions">
        <button id="rankingRefreshButton" type="button">새로고침</button>
        <button id="rankingBackButton" type="button">홈으로</button>
      </div>
    </section>

    <div id="settingsPanel" class="modal-overlay" hidden>
      <section class="modal-panel settings-panel" role="dialog" aria-modal="true" aria-labelledby="settingsTitle">
        <h2 id="settingsTitle">설정</h2>
        <label class="toggle-row">
          <span>음악</span>
          <input id="musicToggle" type="checkbox" />
        </label>
        <label class="toggle-row">
          <span>효과음</span>
          <input id="sfxToggle" type="checkbox" />
        </label>
        <label class="toggle-row">
          <span>진동</span>
          <input id="vibrationToggle" type="checkbox" />
        </label>
        <div class="modal-actions">
          <button id="resumeButton" class="primary-action" type="button">게임 재개</button>
          <button id="settingsRestartButton" type="button">처음부터 다시하기</button>
          <button id="settingsHomeButton" type="button">홈으로 나가기</button>
        </div>
      </section>
    </div>

    <div id="authPanel" class="modal-overlay" hidden>
      <section class="modal-panel auth-panel" role="dialog" aria-modal="true" aria-labelledby="authTitle">
        <h2 id="authTitle">랭킹 도전 로그인</h2>
        <label class="input-row">
          <span>닉네임</span>
          <input id="nicknameInput" maxlength="18" autocomplete="nickname" placeholder="콩쌤팬" />
        </label>
        <label class="input-row">
          <span>이메일</span>
          <input id="emailInput" type="email" autocomplete="email" placeholder="you@example.com" />
        </label>
        <label class="input-row">
          <span>비밀번호</span>
          <input id="passwordInput" type="password" autocomplete="current-password" minlength="6" placeholder="6자 이상" />
        </label>
        <p id="authStatus" class="status-line" aria-live="polite"></p>
        <div class="modal-actions">
          <button id="sendLoginButton" class="primary-action" type="button">로그인</button>
          <button id="signupButton" type="button">이메일로 회원가입</button>
          <button id="memberStartButton" type="button" hidden>회원으로 시작</button>
          <button id="logoutButton" type="button" hidden>로그아웃</button>
          <button id="authCloseButton" type="button">닫기</button>
        </div>
      </section>
    </div>

    <div id="gameOverOverlay" class="modal-overlay" hidden>
      <section class="modal-panel game-over-panel" role="dialog" aria-modal="true" aria-labelledby="gameOverTitle">
        <h2 id="gameOverTitle">게임 오버</h2>
        <div class="score-summary">
          <p id="gameOverScore">이번 점수: 0점</p>
          <p id="gameOverBest">내 최고점수: 0점</p>
        </div>
        <p id="gameOverNotice" class="status-line"></p>
        <p id="rankingSubmitStatus" class="status-line" aria-live="polite"></p>
        <div class="modal-actions">
          <button id="gameOverRestartButton" class="primary-action" type="button">다시 하기</button>
          <button id="gameOverRankingButton" type="button">랭킹 보기</button>
          <button id="gameOverHomeButton" type="button">홈으로</button>
        </div>
      </section>
    </div>
  </div>
`;

const homeScreen = document.querySelector("#homeScreen");
const gameScreen = document.querySelector("#gameScreen");
const rankingScreen = document.querySelector("#rankingScreen");
const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");
const scoreValue = document.querySelector("#scoreValue");
const bestValue = document.querySelector("#bestValue");
const playerModeLabel = document.querySelector("#playerModeLabel");
const restartButton = document.querySelector("#restartButton");
const settingsButton = document.querySelector("#settingsButton");
const settingsPanel = document.querySelector("#settingsPanel");
const gameMessage = document.querySelector("#gameMessage");
const nextFace = document.querySelector("#nextFace");
const nextStageName = document.querySelector("#nextStageName");
const guestStartButton = document.querySelector("#guestStartButton");
const loginStartButton = document.querySelector("#loginStartButton");
const rankingOpenButton = document.querySelector("#rankingOpenButton");
const logoutHomeButton = document.querySelector("#logoutHomeButton");
const homeStatus = document.querySelector("#homeStatus");
const musicToggle = document.querySelector("#musicToggle");
const sfxToggle = document.querySelector("#sfxToggle");
const vibrationToggle = document.querySelector("#vibrationToggle");
const resumeButton = document.querySelector("#resumeButton");
const settingsRestartButton = document.querySelector("#settingsRestartButton");
const settingsHomeButton = document.querySelector("#settingsHomeButton");
const authPanel = document.querySelector("#authPanel");
const nicknameInput = document.querySelector("#nicknameInput");
const emailInput = document.querySelector("#emailInput");
const passwordInput = document.querySelector("#passwordInput");
const authStatus = document.querySelector("#authStatus");
const sendLoginButton = document.querySelector("#sendLoginButton");
const signupButton = document.querySelector("#signupButton");
const memberStartButton = document.querySelector("#memberStartButton");
const logoutButton = document.querySelector("#logoutButton");
const authCloseButton = document.querySelector("#authCloseButton");
const rankingRows = document.querySelector("#rankingRows");
const rankingStatus = document.querySelector("#rankingStatus");
const rankingRefreshButton = document.querySelector("#rankingRefreshButton");
const rankingBackButton = document.querySelector("#rankingBackButton");
const myRankBox = document.querySelector("#myRankBox");
const gameOverOverlay = document.querySelector("#gameOverOverlay");
const gameOverScore = document.querySelector("#gameOverScore");
const gameOverBest = document.querySelector("#gameOverBest");
const gameOverNotice = document.querySelector("#gameOverNotice");
const rankingSubmitStatus = document.querySelector("#rankingSubmitStatus");
const gameOverRestartButton = document.querySelector("#gameOverRestartButton");
const gameOverRankingButton = document.querySelector("#gameOverRankingButton");
const gameOverHomeButton = document.querySelector("#gameOverHomeButton");

const images = new Map();
const pieces = new Set();
const effects = [];
const audio = createAudioSystem(() => userSettings);

let engine;
let runner;
let boardWidth = 1;
let boardHeight = 1;
let dropX = 0;
let currentLevel = randomSpawnLevel();
let score = 0;
let canDrop = true;
let isGameOver = false;
let isPaused = false;
let gameActive = false;
let gameOverHandled = false;
let dangerStartedAt = null;
let lastResizeKey = "";
let resizeTimer = 0;
let pieceSeed = 0;
let bgOffset = 0;
let playerMode = "guest";
let shakeStartedAt = 0;
let shakeUntil = 0;
let shakeIntensity = 0;
let shakeDuration = 1;

window.KONG_STAGES = KONG_STAGES;
window.KONG_SCORE_TABLE = SCORE_TABLE;

for (const stage of KONG_STAGES) {
  const image = new Image();
  image.decoding = "async";
  let triedFallback = false;

  image.addEventListener("error", () => {
    if (!triedFallback && stage.fallbackImage) {
      triedFallback = true;
      image.src = stage.fallbackImage;
    }
  });

  scheduleStageImageLoad(image, stage);
  images.set(stage.key, image);
}

bindGuideImageFallbacks();
syncSettingsControls();
initializeAuth();
showHome();
requestAnimationFrame(draw);

function scheduleStageImageLoad(image, stage) {
  const load = () => {
    if (!image.src) image.src = stage.image;
  };

  if (stage.id <= MAX_SPAWN_LEVEL + 1) {
    load();
    return;
  }

  window.setTimeout(() => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(load, { timeout: 1600 });
    } else {
      load();
    }
  }, 600 + stage.id * 180);
}

function bindGuideImageFallbacks() {
  document.querySelectorAll("img[data-fallback]").forEach((image) => {
    image.addEventListener("error", () => {
      const fallback = image.getAttribute("data-fallback");
      if (fallback && image.src !== fallback) image.src = fallback;
    });
  });
}

function createAudioSystem(getSettings) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const fallbackBgm = new Audio(MEDIA.bgm);
  fallbackBgm.loop = true;
  fallbackBgm.preload = "metadata";
  fallbackBgm.volume = 0.2;

  const fallbackPools = {
    merge: createFallbackPool(MEDIA.merge, 6, 0.48),
    button: createFallbackPool(MEDIA.button, 4, 0.34),
    special: createFallbackPool(MEDIA.special, 3, 0.78),
    gameOver: createFallbackPool(MEDIA.gameOver, 2, 0.7),
  };

  const fetchedAudio = new Map();
  const decodedAudio = new Map();
  const volumes = {
    bgm: 0.2,
    merge: 0.48,
    button: 0.34,
    special: 0.78,
    gameOver: 0.7,
  };

  let audioContext = null;
  let bgmGain = null;
  let sfxGain = null;
  let bgmSource = null;
  let bgmStarting = false;
  let unlocked = false;
  let bgmTargetVolume = getSettings().music ? volumes.bgm : 0;

  function createFallbackPool(src, count, volume) {
    return Array.from({ length: count }, () => {
      const clip = new Audio(src);
      clip.preload = "metadata";
      clip.volume = volume;
      return clip;
    });
  }

  function ensureContext() {
    if (!AudioContextClass) return null;

    if (!audioContext) {
      audioContext = new AudioContextClass();
      bgmGain = audioContext.createGain();
      sfxGain = audioContext.createGain();
      bgmGain.gain.value = bgmTargetVolume;
      sfxGain.gain.value = 1;
      bgmGain.connect(audioContext.destination);
      sfxGain.connect(audioContext.destination);
    }

    return audioContext;
  }

  function fetchAudio(key) {
    if (!MEDIA[key]) return Promise.reject(new Error(`Unknown audio key: ${key}`));

    if (!fetchedAudio.has(key)) {
      fetchedAudio.set(
        key,
        fetch(MEDIA[key], { cache: "force-cache" }).then((response) => {
          if (!response.ok) throw new Error(`Audio load failed: ${key}`);
          return response.arrayBuffer();
        }),
      );
    }

    return fetchedAudio.get(key).then((buffer) => buffer.slice(0));
  }

  function decodeAudio(key) {
    const context = ensureContext();
    if (!context) return Promise.reject(new Error("Web Audio is not available"));

    if (!decodedAudio.has(key)) {
      decodedAudio.set(key, fetchAudio(key).then((buffer) => context.decodeAudioData(buffer)));
    }

    return decodedAudio.get(key);
  }

  function setBgmVolume(volume) {
    bgmTargetVolume = volume;
    if (audioContext && bgmGain) {
      bgmGain.gain.setTargetAtTime(volume, audioContext.currentTime, 0.08);
    }
    fallbackBgm.volume = volume;
  }

  function playFallback(key) {
    if (key === "bgm") {
      if (!getSettings().music) return;
      fallbackBgm.volume = bgmTargetVolume;
      fallbackBgm.play().catch(() => {});
      return;
    }

    const pool = fallbackPools[key];
    if (!pool || !getSettings().sfx) return;

    const clip = pool.find((item) => item.paused) || pool[0];
    clip.currentTime = 0;
    clip.volume = volumes[key] ?? 0.5;
    clip.play().catch(() => {});
  }

  function startBgm() {
    if (!unlocked || !getSettings().music) return false;
    if (bgmSource || bgmStarting) return true;

    if (!AudioContextClass) {
      playFallback("bgm");
      return true;
    }

    bgmStarting = true;

    decodeAudio("bgm")
      .then((buffer) => {
        const context = ensureContext();
        bgmStarting = false;
        if (!context || bgmSource || !getSettings().music) return;

        const source = context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.connect(bgmGain);
        source.onended = () => {
          if (bgmSource === source) bgmSource = null;
        };
        fallbackBgm.pause();
        fallbackBgm.currentTime = 0;
        source.start(0);
        bgmSource = source;
      })
      .catch(() => {
        bgmStarting = false;
        if (!bgmSource) playFallback("bgm");
      });

    return true;
  }

  function pauseBgm() {
    setBgmVolume(0);
    fallbackBgm.pause();
  }

  function resumeBgm() {
    if (!unlocked || !getSettings().music) {
      pauseBgm();
      return;
    }

    const context = ensureContext();
    if (context?.state === "suspended") context.resume().catch(() => {});
    setBgmVolume(volumes.bgm);
    const bgmHandled = startBgm();

    if (!bgmHandled && !bgmSource) playFallback("bgm");
  }

  function unlock() {
    const context = ensureContext();
    unlocked = true;

    if (!context) {
      resumeBgm();
      return Promise.resolve();
    }

    const resumePromise = context.resume().catch(() => {});
    resumePromise.then(() => {
      resumeBgm();
      decodeAudio("merge").catch(() => {});
      decodeAudio("button").catch(() => {});
      decodeAudio("special").catch(() => {});
      decodeAudio("gameOver").catch(() => {});
    });

    return resumePromise;
  }

  function playEffect(key) {
    if (!unlocked || !getSettings().sfx) return;

    const context = ensureContext();
    if (context?.state === "suspended") context.resume().catch(() => {});

    decodeAudio(key)
      .then((buffer) => {
        const activeContext = ensureContext();
        if (!activeContext || !getSettings().sfx) {
          playFallback(key);
          return;
        }

        const source = activeContext.createBufferSource();
        const gain = activeContext.createGain();
        gain.gain.value = volumes[key] ?? 0.5;
        source.buffer = buffer;
        source.connect(gain);
        gain.connect(sfxGain);
        source.start(0);
      })
      .catch(() => {
        playFallback(key);
      });
  }

  window.setTimeout(() => {
    fetchAudio("bgm").catch(() => {});
    fetchAudio("merge").catch(() => {});
    fetchAudio("button").catch(() => {});
    fetchAudio("special").catch(() => {});
    fetchAudio("gameOver").catch(() => {});
  }, 250);

  return {
    unlock,
    applySettings() {
      if (getSettings().music) resumeBgm();
      else pauseBgm();
    },
    resumeBgm,
    playMerge() {
      playEffect("merge");
    },
    playButton() {
      playEffect("button");
    },
    playSpecial() {
      playEffect("special");
    },
    playGameOver() {
      playEffect("gameOver");
    },
  };
}

function loadSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    return { ...DEFAULT_SETTINGS, ...stored };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(userSettings));
  audio.applySettings();
}

function syncSettingsControls() {
  musicToggle.checked = userSettings.music;
  sfxToggle.checked = userSettings.sfx;
  vibrationToggle.checked = userSettings.vibration;
}

function updateSetting(key, value) {
  userSettings = { ...userSettings, [key]: value };
  saveSettings();
  syncSettingsControls();
}

function safeVibrate(pattern) {
  if (!userSettings.vibration) return;
  if (typeof navigator.vibrate === "function") navigator.vibrate(pattern);
}

function normalizeSupabaseUrl(value) {
  const rawUrl = String(value || "").trim();
  if (!rawUrl) return "";

  try {
    const parsed = new URL(rawUrl);
    return parsed.origin.replace(/\/$/, "");
  } catch {
    return rawUrl.replace(/\/rest\/v1\/?$/i, "").replace(/\/$/, "");
  }
}

function initializeAuth() {
  renderAuthState();
  if (!supabase) return;

  supabase.auth
    .getSession()
    .then(({ data, error }) => {
      if (error) throw error;
      setAuthSession(data.session);
    })
    .catch(() => {
      setAuthSession(null, "로그인 상태를 확인하지 못했어요. 다시 로그인해주세요.");
    });

  supabase.auth.onAuthStateChange((_event, session) => {
    setAuthSession(session);
  });
}

function setAuthSession(session, message = "") {
  currentSession = session;
  currentUser = session?.user || null;

  if (currentUser?.user_metadata?.nickname) {
    localStorage.setItem(NICKNAME_KEY, sanitizeNickname(currentUser.user_metadata.nickname));
  }

  renderAuthState(message);
}

function getNickname(user = currentUser) {
  const stored = localStorage.getItem(NICKNAME_KEY);
  const fromUser = user?.user_metadata?.nickname || user?.nickname;
  const emailPrefix = user?.email ? user.email.split("@")[0] : "";
  return sanitizeNickname(stored || fromUser || emailPrefix || "콩쌤팬");
}

function sanitizeNickname(value) {
  const nickname = String(value || "").trim().slice(0, 18);
  return nickname || "콩쌤팬";
}

function renderAuthState(message = "") {
  const nickname = getNickname();
  nicknameInput.value = nickname;
  memberStartButton.hidden = !currentUser;
  logoutButton.hidden = !currentUser;
  logoutHomeButton.hidden = !currentUser;
  sendLoginButton.hidden = Boolean(currentUser);
  signupButton.hidden = Boolean(currentUser);
  passwordInput.disabled = Boolean(currentUser);
  emailInput.disabled = Boolean(currentUser);

  if (!HAS_SUPABASE) {
    homeStatus.textContent = message || "Supabase 환경변수 설정 전이라 비회원 플레이만 가능합니다.";
    authStatus.textContent = "VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY를 설정해주세요.";
    loginStartButton.textContent = "⚡ 로그인하고 연구원 등록";
    return;
  }

  if (currentUser) {
    const signedInMessage = message || `${nickname}님 로그인 중입니다.`;
    homeStatus.textContent = signedInMessage;
    authStatus.textContent = signedInMessage;
    loginStartButton.textContent = "⚡ 연구원으로 실험 시작";
    return;
  }

  homeStatus.textContent = message;
  authStatus.textContent = message;
  loginStartButton.textContent = "⚡ 로그인하고 연구원 등록";
}

function randomSpawnLevel() {
  return Math.floor(Math.random() * (MAX_SPAWN_LEVEL + 1));
}

function radiusFor(levelIndex) {
  const base = KONG_STAGES[levelIndex].radius;
  const scale = Math.max(0.78, Math.min(1.18, boardWidth / 360));
  return Math.max(18, Math.min(128, base * scale));
}

function dangerLineY() {
  return Math.max(112, boardHeight * 0.15);
}

function dropYFor(levelIndex) {
  return Math.max(radiusFor(levelIndex) + 16, dangerLineY() * 0.48);
}

function clampDropX(x, levelIndex = currentLevel) {
  const radius = radiusFor(levelIndex);
  return Math.max(radius + 8, Math.min(boardWidth - radius - 8, x));
}

function syncCanvasSize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  boardWidth = Math.max(260, rect.width || 260);
  boardHeight = Math.max(520, rect.height || 520);
  canvas.width = Math.round(boardWidth * dpr);
  canvas.height = Math.round(boardHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  dropX = dropX ? clampDropX(dropX) : boardWidth * 0.5;
}

function showHome() {
  stopGame();
  homeScreen.hidden = false;
  gameScreen.hidden = true;
  rankingScreen.hidden = true;
  settingsButton.hidden = true;
  settingsPanel.hidden = true;
  authPanel.hidden = true;
  gameOverOverlay.hidden = true;
  renderAuthState();
}

function startGame(mode) {
  if (mode === "member" && !currentUser) {
    authStatus.textContent = "로그인한 연구원만 랭킹에 등록할 수 있어요.";
    authPanel.hidden = false;
    return;
  }

  playerMode = mode;
  homeScreen.hidden = true;
  rankingScreen.hidden = true;
  gameScreen.hidden = false;
  settingsButton.hidden = false;
  authPanel.hidden = true;
  gameOverOverlay.hidden = true;
  playerModeLabel.textContent = mode === "guest" ? "비회원 플레이" : `${getNickname()}님 랭킹 도전`;
  audio.unlock();
  window.requestAnimationFrame(() => {
    resetGame();
  });
}

function stopGame() {
  gameActive = false;
  isPaused = false;
  if (runner) Runner.stop(runner);
  runner = null;

  if (engine) {
    World.clear(engine.world, false);
    Engine.clear(engine);
  }

  pieces.clear();
  effects.length = 0;
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
  isPaused = false;
  gameActive = true;
  gameOverHandled = false;
  dangerStartedAt = null;
  shakeUntil = 0;
  shakeStartedAt = 0;
  shakeDuration = 1;
  dropX = clampDropX(boardWidth * 0.5);
  scoreValue.textContent = "0";
  gameMessage.hidden = true;
  gameOverOverlay.hidden = true;
  settingsPanel.hidden = true;
  updateBestDisplay();
  updateNextPreview();

  addBoundaries();
  bindCollisionEvents();
  Runner.run(runner, engine);
}

function pauseGame() {
  if (!gameActive || isGameOver) return;
  isPaused = true;
  if (runner) runner.enabled = false;
}

function resumeGame() {
  if (!gameActive || isGameOver) return;
  isPaused = false;
  if (runner) runner.enabled = true;
}

function addBoundaries() {
  const wallThickness = Math.max(42, boardWidth * 0.09);
  const wallOptions = { isStatic: true, label: "wall", restitution: 0.2, friction: 0.75 };
  const floor = Bodies.rectangle(
    boardWidth * 0.5,
    boardHeight + wallThickness * 0.5,
    boardWidth + wallThickness * 2,
    wallThickness,
    { ...wallOptions, restitution: 0.15, friction: 0.88 },
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
    if (isGameOver || isPaused) return;

    for (const pair of event.pairs) {
      handleFaceCollision(pair.bodyA, pair.bodyB);
    }
  });
}

function handleFaceCollision(first, second) {
  if (!canTouchAsSameStage(first, second)) return;

  if (first.plugin.level === FINAL_LEVEL) {
    clashFinalBoss(first, second);
    return;
  }

  mergePieces(first, second);
}

function canTouchAsSameStage(first, second) {
  if (first.label !== "face" || second.label !== "face") return false;
  if (!pieces.has(first) || !pieces.has(second)) return false;
  if (first.plugin.merging || second.plugin.merging) return false;
  return first.plugin.level === second.plugin.level;
}

function createPiece(levelIndex, x, y) {
  const radius = radiusFor(levelIndex);
  const piece = Bodies.circle(x, y, radius, {
    label: "face",
    restitution: 0.2,
    friction: 0.48,
    frictionAir: 0.012,
    density: 0.0013,
    slop: 0.02,
  });

  piece.plugin = {
    id: `piece-${(pieceSeed += 1)}`,
    level: levelIndex,
    radius,
    bornAt: performance.now(),
    merging: false,
    bossCooldownUntil: 0,
  };

  pieces.add(piece);
  return piece;
}

function mergePieces(first, second) {
  first.plugin.merging = true;
  second.plugin.merging = true;

  const nextLevel = first.plugin.level + 1;
  const nextStage = KONG_STAGES[nextLevel];
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

  addScore(nextStage.score);
  audio.playMerge();
  safeVibrate(24);
  triggerStageEffects(nextLevel, x, y);
}

function clashFinalBoss(first, second) {
  const now = performance.now();
  if (first.plugin.bossCooldownUntil > now || second.plugin.bossCooldownUntil > now) return;

  first.plugin.bossCooldownUntil = now + 1200;
  second.plugin.bossCooldownUntil = now + 1200;

  const x = (first.position.x + second.position.x) * 0.5;
  const y = (first.position.y + second.position.y) * 0.5;
  const dx = first.position.x - second.position.x || 1;
  const dy = first.position.y - second.position.y || 0.2;
  const distance = Math.hypot(dx, dy) || 1;
  const force = 2.1;

  Body.setVelocity(first, {
    x: first.velocity.x + (dx / distance) * force,
    y: first.velocity.y - 2.2,
  });
  Body.setVelocity(second, {
    x: second.velocity.x - (dx / distance) * force,
    y: second.velocity.y - 2.2,
  });

  addScore(FINAL_BOSS_BONUS);
  audio.playSpecial();
  safeVibrate([70, 35, 90]);
  triggerScreenShake(16, 760);
  effects.push(createBossEnergyEffect(x, y));
  effects.push(createTextEffect("게임이 콩쌤에게 지배당했습니다", x, Math.max(80, y - 80), "#f4dcff", 1450));
}

function addScore(points) {
  score += points;
  scoreValue.textContent = score.toLocaleString("ko-KR");
}

function updateBestDisplay() {
  const best = playerMode === "guest" ? getLocalNumber(GUEST_BEST_KEY) : getMemberBestScore();
  bestValue.textContent = playerMode === "guest" ? `비회원 최고 ${formatScore(best)}` : `내 최고 ${formatScore(best)}`;
}

function getMemberBestScore() {
  const key = currentUser?.id ? `memberBestScore:${currentUser.id}` : "memberBestScore:local";
  return getLocalNumber(key);
}

function setMemberBestScore(value) {
  const key = currentUser?.id ? `memberBestScore:${currentUser.id}` : "memberBestScore:local";
  localStorage.setItem(key, String(value));
}

function formatScore(value) {
  return Number(value || 0).toLocaleString("ko-KR");
}

function updateNextPreview() {
  const stage = KONG_STAGES[currentLevel];
  nextStageName.textContent = stage.name;
  nextFace.src = stage.image;
  nextFace.setAttribute("data-fallback", stage.fallbackImage || "");
  nextFace.onerror = () => {
    if (stage.fallbackImage && nextFace.src !== stage.fallbackImage) nextFace.src = stage.fallbackImage;
  };
}

function triggerStageEffects(levelIndex, x, y) {
  const stage = KONG_STAGES[levelIndex];
  effects.push(createMergeEffect(x, y, stage.color));

  if (stage.id === 5) {
    effects.push(createFlashEffect("rgba(255, 248, 190, 0.44)", 360));
  }

  if (stage.id === 6) {
    effects.push(createParticleBurst(x, y, ["#9dff74", "#ffe680", "#ffffff"], 28, "sparkle", 900));
    audio.playSpecial();
  }

  if (stage.id === 7) {
    effects.push(createElectricEffect(x, y, "#6cc8ff"));
    audio.playSpecial();
  }

  if (stage.id === 8) {
    effects.push(createParticleBurst(x, y, ["#ffffff", "#bca4ff", "#65ddff"], 38, "stars", 1100));
    audio.playSpecial();
  }

  if (stage.id === 9) {
    effects.push(createFlashEffect("rgba(255, 218, 83, 0.52)", 520));
    effects.push(createTextEffect("콩멘", x, Math.max(80, y - 70), "#fff0a7", 1300));
    audio.playSpecial();
  }

  if (stage.id === 10) {
    triggerScreenShake(14, 720);
    effects.push(createBossEnergyEffect(x, y));
    effects.push(createTextEffect("최종보스 등장", x, Math.max(78, y - 92), "#f1d6ff", 1250));
    effects.push(createTextEffect("게임이 콩쌤에게 지배당했습니다", x, Math.max(116, y - 48), "#ffffff", 1500, 0.62));
    audio.playSpecial();
    safeVibrate([80, 35, 90]);
  }
}

function createMergeEffect(x, y, color) {
  return { kind: "merge", x, y, color, startedAt: performance.now(), duration: 620 };
}

function createFlashEffect(color, duration) {
  return { kind: "flash", color, startedAt: performance.now(), duration };
}

function createParticleBurst(x, y, colors, count, style, duration) {
  const particles = Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / count + Math.random() * 0.28;
    return {
      angle,
      speed: 36 + Math.random() * 96,
      size: 2.2 + Math.random() * 4.8,
      color: colors[index % colors.length],
      spin: Math.random() * Math.PI,
    };
  });

  return { kind: "particles", style, x, y, particles, startedAt: performance.now(), duration };
}

function createElectricEffect(x, y, color) {
  const bolts = Array.from({ length: 10 }, (_, index) => ({
    angle: (Math.PI * 2 * index) / 10,
    length: 46 + Math.random() * 70,
    color,
  }));

  return { kind: "electric", x, y, bolts, startedAt: performance.now(), duration: 680 };
}

function createTextEffect(text, x, y, color, duration, scale = 1) {
  return { kind: "text", text, x, y, color, scale, startedAt: performance.now(), duration };
}

function createBossEnergyEffect(x, y) {
  return {
    kind: "boss",
    x,
    y,
    particles: Array.from({ length: 42 }, () => ({
      angle: Math.random() * Math.PI * 2,
      speed: 24 + Math.random() * 120,
      size: 3 + Math.random() * 8,
      color: Math.random() > 0.45 ? "#a15cff" : "#08040e",
    })),
    startedAt: performance.now(),
    duration: 1100,
  };
}

function triggerScreenShake(intensity, duration) {
  shakeStartedAt = performance.now();
  shakeDuration = duration;
  shakeIntensity = Math.max(shakeIntensity, intensity);
  shakeUntil = Math.max(shakeUntil, shakeStartedAt + duration);
}

function dropPiece() {
  if (!gameActive || isPaused || !canDrop || isGameOver) return;

  const levelIndex = currentLevel;
  const body = createPiece(levelIndex, clampDropX(dropX, levelIndex), dropYFor(levelIndex));
  Body.setVelocity(body, { x: (Math.random() - 0.5) * 0.45, y: 1.2 });
  Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.035);
  World.add(engine.world, body);

  currentLevel = randomSpawnLevel();
  updateNextPreview();
  dropX = clampDropX(dropX);
  canDrop = false;
  window.setTimeout(() => {
    if (!isGameOver && !isPaused) canDrop = true;
  }, DROP_COOLDOWN);
}

function updateDropPosition(event) {
  if (!event.isPrimary && event.pointerType !== "mouse") return;

  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * boardWidth;
  dropX = clampDropX(x);
}

function checkGameOver(now) {
  if (isGameOver || isPaused || !gameActive) return;

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
    finishGame();
  }
}

function finishGame() {
  if (gameOverHandled) return;

  isGameOver = true;
  gameOverHandled = true;
  canDrop = false;
  if (runner) runner.enabled = false;
  gameMessage.hidden = false;
  audio.playGameOver();
  safeVibrate([42, 24, 52]);
  updateGameRecords();
  gameOverOverlay.hidden = false;
}

function updateGameRecords() {
  gameOverScore.textContent = `이번 점수: ${formatScore(score)}점`;
  rankingSubmitStatus.textContent = "";

  if (playerMode === "guest" || !currentUser) {
    localStorage.setItem(GUEST_LAST_KEY, String(score));
    const best = Math.max(score, getLocalNumber(GUEST_BEST_KEY));
    localStorage.setItem(GUEST_BEST_KEY, String(best));
    gameOverBest.textContent = `비회원 최고점수: ${formatScore(best)}점`;
    gameOverNotice.textContent = "로그인하면 랭킹에 도전할 수 있어요!";
    updateBestDisplay();
    return;
  }

  const localBest = Math.max(score, getMemberBestScore());
  setMemberBestScore(localBest);
  gameOverBest.textContent = `내 최고점수: ${formatScore(localBest)}점`;
  gameOverNotice.textContent = "회원 점수는 온라인 랭킹에 반영됩니다.";
  updateBestDisplay();

  if (!HAS_SUPABASE) {
    rankingSubmitStatus.textContent = "Supabase 환경변수가 없어 온라인 랭킹 저장은 대기 중입니다.";
    return;
  }

  rankingSubmitStatus.textContent = "온라인 랭킹 반영 중...";
  submitMemberScore(score)
    .then(({ bestScore, rank }) => {
      gameOverBest.textContent = `내 최고점수: ${formatScore(bestScore)}점`;
      rankingSubmitStatus.textContent = rank ? `내 순위: ${rank}위` : "랭킹 저장 완료";
    })
    .catch((error) => {
      rankingSubmitStatus.textContent = `랭킹 저장 실패: ${error.message}`;
    });
}

function getLocalNumber(key) {
  return Number.parseInt(localStorage.getItem(key) || "0", 10) || 0;
}

function draw(now) {
  requestAnimationFrame(draw);
  if (!gameActive || gameScreen.hidden) return;

  checkGameOver(now);
  ctx.clearRect(0, 0, boardWidth, boardHeight);

  const shake = getShakeOffset(now);
  ctx.save();
  ctx.translate(shake.x, shake.y);
  drawBoardBackground(now);
  drawDangerLine(now);
  drawDropPreview();
  drawPieces();
  drawEffects(now);
  ctx.restore();
}

function getShakeOffset(now) {
  if (now >= shakeUntil) {
    shakeIntensity = 0;
    return { x: 0, y: 0 };
  }

  const progress = Math.min(1, Math.max(0, (now - shakeStartedAt) / Math.max(1, shakeDuration)));
  const decay = Math.max(0.08, 1 - progress);
  return {
    x: (Math.random() - 0.5) * shakeIntensity * decay,
    y: (Math.random() - 0.5) * shakeIntensity * decay,
  };
}

function drawBoardBackground(now) {
  bgOffset = (bgOffset + (isPaused ? 0 : 0.16)) % 900;
  const gradient = ctx.createLinearGradient(0, 0, boardWidth, boardHeight);
  gradient.addColorStop(0, "#141c1a");
  gradient.addColorStop(0.26, "#2b1630");
  gradient.addColorStop(0.55, "#112934");
  gradient.addColorStop(0.78, "#32220f");
  gradient.addColorStop(1, "#10130f");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, boardWidth, boardHeight);

  ctx.save();
  ctx.globalAlpha = 0.2;
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
  ctx.globalAlpha = 0.16;
  for (let y = 44; y < boardHeight; y += 78) {
    for (let x = 30; x < boardWidth; x += 88) {
      const colorIndex = Math.floor((x + y + now * 0.018) / 70) % COLORS.length;
      ctx.fillStyle = COLORS[colorIndex];
      ctx.fillRect(x + Math.sin(y + now * 0.002) * 8, y, 4, 4);
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
  ctx.strokeStyle = dangerStartedAt ? `rgba(255, 82, 82, ${0.72 + pulse})` : "rgba(255, 255, 255, 0.38)";
  ctx.lineWidth = Math.max(3, boardWidth * 0.006);
  ctx.setLineDash([12, 10]);
  ctx.beginPath();
  ctx.moveTo(16, y);
  ctx.lineTo(boardWidth - 16, y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = `900 ${Math.max(13, boardWidth * 0.034)}px system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillStyle = dangerStartedAt ? "#ff8080" : "rgba(255,255,255,0.68)";
  ctx.fillText("GAME OVER LINE", 18, y - 8);
  ctx.restore();
}

function drawDropPreview() {
  if (isGameOver) return;

  const radius = radiusFor(currentLevel);
  const x = clampDropX(dropX, currentLevel);
  const y = dropYFor(currentLevel);

  ctx.save();
  ctx.globalAlpha = canDrop && !isPaused ? 0.66 : 0.28;
  drawFace(currentLevel, x, y, radius, true);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, Math.max(16, y - radius - 12));
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
  const stage = KONG_STAGES[levelIndex];
  const image = images.get(stage.key);
  const hasImage = image?.complete && image.naturalWidth > 0;
  const box = radius * stage.drawScale;
  const glowColor = stage.glowColor || stage.color;

  ctx.save();
  ctx.globalAlpha *= isPreview ? 0.76 : 1;
  drawFaceAura(stage, x, y, radius, isPreview);
  ctx.shadowColor = hexToRgba(glowColor, isPreview ? 0.38 : 0.62);
  ctx.shadowBlur = Math.max(10, radius * 0.38);
  ctx.shadowOffsetY = Math.max(4, radius * 0.1);

  if (hasImage) {
    const aspect = image.naturalWidth / image.naturalHeight;
    let width = box;
    let height = box;
    if (aspect >= 1) height = box / aspect;
    else width = box * aspect;
    ctx.drawImage(image, x - width * 0.5, y - height * 0.52, width, height);
  } else {
    ctx.shadowBlur = 0;
    ctx.fillStyle = stage.color;
    ctx.font = `900 ${Math.max(14, radius * 0.42)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(stage.name.replace("콩쌤", "").trim(), x, y);
  }

  ctx.restore();
}

function drawFaceAura(stage, x, y, radius, isPreview) {
  const glowColor = stage.glowColor || stage.color;
  const accentColor = stage.accentColor || stage.color;
  const alpha = isPreview ? 0.18 : 0.24;

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const gradient = ctx.createRadialGradient(x, y, radius * 0.18, x, y, radius * 1.46);
  gradient.addColorStop(0, hexToRgba(accentColor, alpha * 0.9));
  gradient.addColorStop(0.48, hexToRgba(glowColor, alpha));
  gradient.addColorStop(1, hexToRgba(glowColor, 0));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(x, y + radius * 0.02, radius * 1.28, radius * 1.46, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEffects(now) {
  for (let i = effects.length - 1; i >= 0; i -= 1) {
    const effect = effects[i];
    if (effect.kind === "merge") drawMergeEffect(effect, now, i);
    else if (effect.kind === "flash") drawFlashEffect(effect, now, i);
    else if (effect.kind === "particles") drawParticleEffect(effect, now, i);
    else if (effect.kind === "electric") drawElectricEffect(effect, now, i);
    else if (effect.kind === "text") drawTextCanvasEffect(effect, now, i);
    else if (effect.kind === "boss") drawBossEffect(effect, now, i);
  }
}

function drawMergeEffect(effect, now, index) {
  const progress = (now - effect.startedAt) / effect.duration;
  if (progress >= 1) {
    effects.splice(index, 1);
    return;
  }

  const alpha = 1 - progress;
  const ringRadius = 20 + progress * 72;
  ctx.save();
  ctx.strokeStyle = hexToRgba(effect.color, alpha);
  ctx.lineWidth = 5 * alpha + 1;
  ctx.beginPath();
  ctx.arc(effect.x, effect.y, ringRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = hexToRgba(effect.color, alpha);
  for (let dot = 0; dot < 10; dot += 1) {
    const angle = (Math.PI * 2 * dot) / 10 + progress * 1.3;
    const distance = 18 + progress * 82;
    ctx.beginPath();
    ctx.arc(
      effect.x + Math.cos(angle) * distance,
      effect.y + Math.sin(angle) * distance,
      Math.max(2, 5.5 * alpha),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.restore();
}

function drawFlashEffect(effect, now, index) {
  const progress = (now - effect.startedAt) / effect.duration;
  if (progress >= 1) {
    effects.splice(index, 1);
    return;
  }

  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - progress);
  ctx.fillStyle = effect.color;
  ctx.fillRect(0, 0, boardWidth, boardHeight);
  ctx.restore();
}

function drawParticleEffect(effect, now, index) {
  const progress = (now - effect.startedAt) / effect.duration;
  if (progress >= 1) {
    effects.splice(index, 1);
    return;
  }

  const alpha = 1 - progress;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (const particle of effect.particles) {
    const distance = particle.speed * progress;
    const px = effect.x + Math.cos(particle.angle) * distance;
    const py = effect.y + Math.sin(particle.angle) * distance + progress * progress * 48;
    ctx.fillStyle = hexToRgba(particle.color, alpha);

    if (effect.style === "stars") {
      drawStar(px, py, particle.size * alpha, particle.spin + progress * Math.PI);
    } else {
      ctx.beginPath();
      ctx.arc(px, py, Math.max(1.4, particle.size * alpha), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawElectricEffect(effect, now, index) {
  const progress = (now - effect.startedAt) / effect.duration;
  if (progress >= 1) {
    effects.splice(index, 1);
    return;
  }

  const alpha = 1 - progress;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.lineWidth = Math.max(2, 6 * alpha);
  for (const bolt of effect.bolts) {
    ctx.strokeStyle = hexToRgba(bolt.color, alpha);
    ctx.beginPath();
    ctx.moveTo(effect.x, effect.y);
    const segments = 4;
    for (let i = 1; i <= segments; i += 1) {
      const distance = (bolt.length * i * (0.46 + progress * 0.64)) / segments;
      const wobble = (Math.random() - 0.5) * 22 * alpha;
      ctx.lineTo(
        effect.x + Math.cos(bolt.angle) * distance + Math.cos(bolt.angle + Math.PI / 2) * wobble,
        effect.y + Math.sin(bolt.angle) * distance + Math.sin(bolt.angle + Math.PI / 2) * wobble,
      );
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawTextCanvasEffect(effect, now, index) {
  const progress = (now - effect.startedAt) / effect.duration;
  if (progress >= 1) {
    effects.splice(index, 1);
    return;
  }

  const alpha = Math.sin(Math.PI * progress);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `1000 ${Math.max(22, boardWidth * 0.1 * effect.scale)}px system-ui, sans-serif`;
  ctx.lineWidth = Math.max(4, boardWidth * 0.012);
  ctx.strokeStyle = "rgba(0,0,0,0.72)";
  ctx.fillStyle = effect.color;
  ctx.strokeText(effect.text, effect.x, effect.y - progress * 32);
  ctx.fillText(effect.text, effect.x, effect.y - progress * 32);
  ctx.restore();
}

function drawBossEffect(effect, now, index) {
  const progress = (now - effect.startedAt) / effect.duration;
  if (progress >= 1) {
    effects.splice(index, 1);
    return;
  }

  const alpha = 1 - progress;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.strokeStyle = `rgba(161, 92, 255, ${alpha})`;
  ctx.lineWidth = Math.max(2, 12 * alpha);
  for (let ring = 0; ring < 3; ring += 1) {
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, 22 + progress * (80 + ring * 42), 0, Math.PI * 2);
    ctx.stroke();
  }

  for (const particle of effect.particles) {
    const distance = particle.speed * progress;
    const px = effect.x + Math.cos(particle.angle) * distance;
    const py = effect.y + Math.sin(particle.angle) * distance;
    ctx.fillStyle = hexToRgba(particle.color, alpha);
    ctx.beginPath();
    ctx.arc(px, py, Math.max(1, particle.size * alpha), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawStar(x, y, radius, rotation) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const angle = rotation + (Math.PI * 2 * i) / 10;
    const size = i % 2 === 0 ? radius * 1.6 : radius * 0.58;
    const px = x + Math.cos(angle) * size;
    const py = y + Math.sin(angle) * size;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function hexToRgba(hex, alpha) {
  if (hex.startsWith("rgba")) return hex;
  const value = Number.parseInt(hex.slice(1), 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function getAuthFormValues() {
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const nickname = sanitizeNickname(nicknameInput.value);
  return { email, password, nickname };
}

function validateAuthForm({ email, password }) {
  if (!supabase) throw new Error("Supabase 환경변수를 먼저 설정해주세요.");
  if (!email) throw new Error("이메일을 입력해주세요.");
  if (!password || password.length < 6) throw new Error("비밀번호는 6자 이상으로 입력해주세요.");
}

async function handleSignUp() {
  const values = getAuthFormValues();

  try {
    validateAuthForm(values);
    localStorage.setItem(NICKNAME_KEY, values.nickname);
    signupButton.disabled = true;
    authStatus.textContent = "회원가입 요청 중...";

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { nickname: values.nickname },
        emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
      },
    });

    if (error) throw error;
    if (data.session) {
      setAuthSession(data.session, "회원가입과 로그인이 완료됐어요.");
    } else {
      renderAuthState("인증 메일을 보냈어요. 이메일 인증 후 로그인해주세요.");
    }
  } catch (error) {
    authStatus.textContent = `회원가입 실패: ${error.message}`;
  } finally {
    signupButton.disabled = false;
  }
}

async function handleSignIn() {
  const values = getAuthFormValues();

  try {
    validateAuthForm(values);
    localStorage.setItem(NICKNAME_KEY, values.nickname);
    sendLoginButton.disabled = true;
    authStatus.textContent = "로그인 중...";

    const { data, error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) throw error;
    setAuthSession(data.session, `${values.nickname}님, 랭킹 도전 준비 완료!`);
  } catch (error) {
    authStatus.textContent = `로그인 실패: ${error.message}`;
  } finally {
    sendLoginButton.disabled = false;
  }
}

async function handleLogout() {
  if (!supabase) return;

  try {
    logoutButton.disabled = true;
    logoutHomeButton.disabled = true;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setAuthSession(null, "로그아웃했습니다.");
  } catch (error) {
    authStatus.textContent = `로그아웃 실패: ${error.message}`;
  } finally {
    logoutButton.disabled = false;
    logoutHomeButton.disabled = false;
  }
}

async function fetchOwnRanking() {
  if (!supabase || !currentUser) return null;

  const { data, error } = await supabase.from(RANKINGS_TABLE).select("*").eq("user_id", currentUser.id).maybeSingle();
  if (error) throw normalizeRankingError(error);
  return data;
}

async function submitMemberScore(finalScore) {
  if (!supabase || !currentUser || !currentSession) throw new Error("로그인이 필요합니다.");

  const nickname = sanitizeNickname(nicknameInput.value || getNickname());
  localStorage.setItem(NICKNAME_KEY, nickname);
  const existing = await fetchOwnRanking();
  const updatedAt = new Date().toISOString();
  let bestScore = finalScore;

  if (existing) {
    bestScore = Math.max(Number(existing.best_score || 0), finalScore);
    const { error } = await supabase
      .from(RANKINGS_TABLE)
      .update({
        nickname,
        best_score: bestScore,
        play_count: Number(existing.play_count || 0) + 1,
        updated_at: updatedAt,
      })
      .eq("user_id", currentUser.id);

    if (error) throw normalizeRankingError(error);
  } else {
    const { error } = await supabase.from(RANKINGS_TABLE).insert({
      user_id: currentUser.id,
      nickname,
      best_score: finalScore,
      play_count: 1,
      updated_at: updatedAt,
    });

    if (error) throw normalizeRankingError(error);
  }

  setMemberBestScore(bestScore);
  updateBestDisplay();
  const rank = await fetchRankForScore(bestScore);
  return { bestScore, rank };
}

async function fetchRankForScore(bestScore) {
  if (!supabase) return null;

  const { count, error } = await supabase
    .from(RANKINGS_TABLE)
    .select("id", { count: "exact", head: true })
    .gt("best_score", bestScore);

  if (error) throw normalizeRankingError(error);
  return Number(count || 0) + 1;
}

async function showRanking() {
  homeScreen.hidden = true;
  gameScreen.hidden = true;
  rankingScreen.hidden = false;
  settingsButton.hidden = true;
  authPanel.hidden = true;
  settingsPanel.hidden = true;
  gameOverOverlay.hidden = true;
  rankingRows.innerHTML = `<tr><td colspan="3">랭킹을 불러오는 중...</td></tr>`;
  rankingStatus.textContent = "";

  if (!HAS_SUPABASE) {
    rankingRows.innerHTML = `<tr><td colspan="3">온라인 랭킹 서버가 아직 연결되지 않았어요.</td></tr>`;
    rankingStatus.textContent = "VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 설정 후 TOP 100이 표시됩니다.";
    myRankBox.textContent = "Supabase 연결 대기 중";
    return;
  }

  try {
    const { data, error } = await supabase
      .from(RANKINGS_TABLE)
      .select("nickname,best_score,updated_at")
      .order("best_score", { ascending: false })
      .order("updated_at", { ascending: true })
      .limit(100);

    if (error) throw normalizeRankingError(error);
    renderRankingRows(data || []);
    await renderMyRank();
  } catch (error) {
    rankingRows.innerHTML = `<tr><td colspan="3">${isMissingRankingTableError(error) ? "랭킹 테이블 생성이 필요해요." : "랭킹을 불러오지 못했어요."}</td></tr>`;
    rankingStatus.textContent = error.message;
    myRankBox.textContent = isMissingRankingTableError(error) ? "Supabase SQL 실행 대기 중" : "랭킹 연결 확인 중";
  }
}

function normalizeRankingError(error) {
  if (isMissingRankingTableError(error)) return new Error(RANKING_SETUP_MESSAGE);
  return error;
}

function isMissingRankingTableError(error) {
  const message = String(error?.message || error || "");
  return error?.code === "PGRST205" || /schema cache|public\.rankings|could not find|does not exist/i.test(message);
}

function renderRankingRows(rows) {
  if (!rows.length) {
    rankingRows.innerHTML = `<tr><td colspan="3">아직 등록된 점수가 없어요.</td></tr>`;
    return;
  }

  rankingRows.innerHTML = rows
    .map(
      (row, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(row.nickname || "콩쌤팬")}</td>
          <td>${formatScore(row.best_score)}점</td>
        </tr>
      `,
    )
    .join("");
}

async function renderMyRank() {
  if (!currentUser) {
    myRankBox.textContent = "로그인하면 내 순위를 확인할 수 있어요.";
    return;
  }

  const own = await fetchOwnRanking();
  if (!own) {
    myRankBox.textContent = `${getNickname()}님은 아직 등록된 점수가 없어요.`;
    return;
  }

  const rank = await fetchRankForScore(Number(own.best_score || 0));
  myRankBox.textContent = `내 순위: ${rank}위 / 내 최고점수: ${formatScore(own.best_score)}점`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function openSettings() {
  syncSettingsControls();
  pauseGame();
  settingsPanel.hidden = false;
}

function closeSettings() {
  settingsPanel.hidden = true;
  resumeGame();
}

guestStartButton.addEventListener("click", () => startGame("guest"));
loginStartButton.addEventListener("click", () => {
  if (currentUser) {
    startGame("member");
    return;
  }
  authStatus.textContent = HAS_SUPABASE ? "닉네임, 이메일, 비밀번호를 입력해주세요." : "Supabase 환경변수 설정이 필요합니다.";
  authPanel.hidden = false;
});
rankingOpenButton.addEventListener("click", showRanking);
logoutHomeButton.addEventListener("click", handleLogout);
rankingRefreshButton.addEventListener("click", showRanking);
rankingBackButton.addEventListener("click", showHome);
settingsButton.addEventListener("click", openSettings);
resumeButton.addEventListener("click", closeSettings);
settingsRestartButton.addEventListener("click", () => {
  settingsPanel.hidden = true;
  resetGame();
});
settingsHomeButton.addEventListener("click", showHome);
musicToggle.addEventListener("change", () => updateSetting("music", musicToggle.checked));
sfxToggle.addEventListener("change", () => updateSetting("sfx", sfxToggle.checked));
vibrationToggle.addEventListener("change", () => updateSetting("vibration", vibrationToggle.checked));
sendLoginButton.addEventListener("click", handleSignIn);
signupButton.addEventListener("click", handleSignUp);
memberStartButton.addEventListener("click", () => {
  localStorage.setItem(NICKNAME_KEY, sanitizeNickname(nicknameInput.value));
  renderAuthState();
  startGame("member");
});
logoutButton.addEventListener("click", handleLogout);
authCloseButton.addEventListener("click", () => {
  authPanel.hidden = true;
  renderAuthState();
});
restartButton.addEventListener("click", resetGame);
gameOverRestartButton.addEventListener("click", resetGame);
gameOverRankingButton.addEventListener("click", showRanking);
gameOverHomeButton.addEventListener("click", showHome);

document.addEventListener("pointerdown", () => audio.unlock(), { capture: true });
document.addEventListener("touchstart", () => audio.unlock(), { capture: true, passive: true });
document.addEventListener("click", () => audio.unlock(), { capture: true });
document.addEventListener("keydown", () => audio.unlock(), { capture: true });

document.addEventListener("click", (event) => {
  if (event.target.closest("button")) audio.playButton();
});

canvas.addEventListener("pointermove", updateDropPosition);
canvas.addEventListener("pointerdown", (event) => {
  updateDropPosition(event);
  dropPiece();
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) audio.resumeBgm();
});

window.addEventListener("keydown", (event) => {
  if (!gameActive || gameScreen.hidden) return;
  if (event.key === "Escape") {
    if (settingsPanel.hidden) openSettings();
    else closeSettings();
  }
  if (event.key === "ArrowLeft") dropX = clampDropX(dropX - boardWidth * 0.06);
  if (event.key === "ArrowRight") dropX = clampDropX(dropX + boardWidth * 0.06);

  if (event.code === "Space") {
    event.preventDefault();
    dropPiece();
  }

  if (event.key.toLowerCase() === "r") resetGame();
});

const resizeObserver = new ResizeObserver(() => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    if (!gameActive || gameScreen.hidden) return;
    const rect = canvas.getBoundingClientRect();
    const nextKey = `${Math.round(rect.width)}x${Math.round(rect.height)}`;
    if (nextKey !== lastResizeKey) {
      lastResizeKey = nextKey;
      resetGame();
    }
  }, 160);
});

resizeObserver.observe(canvas);
