(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const W = canvas.width;
  const H = canvas.height;
  const FLOOR_TOP = 350;
  const FLOOR_BOTTOM = 650;
  let worldWidth = 5600;

  const ui = {
    start: document.getElementById("startScreen"),
    pause: document.getElementById("pauseScreen"),
    gameOver: document.getElementById("gameOverScreen"),
    victory: document.getElementById("victoryScreen"),
    gameOverStats: document.getElementById("gameOverStats"),
    victoryStats: document.getElementById("victoryStats"),
    startButton: document.getElementById("startButton"),
    resumeButton: document.getElementById("resumeButton"),
    restartButton: document.getElementById("restartButton"),
    replayButton: document.getElementById("replayButton"),
    pauseRestartButton: document.getElementById("pauseRestartButton"),
    pauseChangeButton: document.getElementById("pauseChangeButton"),
    gameOverChangeButton: document.getElementById("gameOverChangeButton"),
    victoryChangeButton: document.getElementById("victoryChangeButton"),
    soundButton: document.getElementById("soundButton"),
    fullscreenButton: document.getElementById("fullscreenButton"),
    exitDataCenterButton: document.getElementById("exitDataCenterButton"),
    toast: document.getElementById("toast"),
    selectedDescription: document.getElementById("selectedDescription"),
    leaderboardList: document.getElementById("leaderboardList"),
    leaderboardStatus: document.getElementById("leaderboardStatus"),
    gameOverInitials: document.getElementById("gameOverInitials"),
    gameOverSaveButton: document.getElementById("gameOverSaveButton"),
    gameOverSaveMessage: document.getElementById("gameOverSaveMessage"),
    victoryInitials: document.getElementById("victoryInitials"),
    victorySaveButton: document.getElementById("victorySaveButton"),
    victorySaveMessage: document.getElementById("victorySaveMessage"),
    attractBanner: document.getElementById("attractBanner"),
    characterBestLine: document.getElementById("characterBestLine")
  };

  const CHARACTER_DATA = {
    kelly: {
      name: "KELLY",
      maxHp: 108,
      speed: 285,
      attack: 15,
      signature: "DEADLY VELOCITY",
      secondary: "TRACK STAR KICK",
      description: "<b>Kelly:</b> the fastest fighter. Her active skill, Deadly Velocity, grants a four-second speed burst and powers up her next gunshot.",
      palette: { hair:"#3d241d", skin:"#e9a579", top:"#f1c52f", trim:"#222936", legs:"#101622", accent:"#ff7c31" }
    },
    tatsuya: {
      name: "TATSUYA",
      maxHp: 118,
      speed: 255,
      attack: 16,
      signature: "REBEL RUSH",
      secondary: "STREET CYCLONE",
      description: "<b>Tatsuya:</b> a rushdown specialist. His active skill, Rebel Rush, tears through enemies and stores two charges.",
      palette: { hair:"#29231f", skin:"#d89b73", top:"#c62f3b", trim:"#62a5aa", legs:"#242833", accent:"#ef5362" }
    },
    orion: {
      name: "ORION",
      maxHp: 128,
      speed: 235,
      attack: 17,
      signature: "CRIMSON CRUSH",
      secondary: "CRIMSON BURST",
      description: "<b>Orion:</b> controls crowds with Crimson Energy. His active skill, Crimson Crush, grants brief invulnerability while draining nearby enemies.",
      palette: { hair:"#17171e", skin:"#c68c70", top:"#2a2029", trim:"#a82b42", legs:"#17171d", accent:"#ff274f" }
    },
    hayato: {
      name: "HAYATO",
      maxHp: 138,
      speed: 230,
      attack: 18,
      signature: "ART OF BLADES",
      secondary: "IAIJUTSU",
      description: "<b>Hayato:</b> a durable fighter. His active skill, Art of Blades, reduces frontal damage while his gun damage rises as health falls.",
      palette: { hair:"#242125", skin:"#d99870", top:"#513629", trim:"#c23d35", legs:"#29252a", accent:"#ff7a24" }
    }
  };

  const ENEMY_DATA = {
    thug: { hp: 46, speed: 112, damage: 8, score: 100, color:"#8b55d9", accent:"#cab4ff", size:1 },
    gunner: { hp: 38, speed: 84, damage: 7, score: 140, color:"#3c8f68", accent:"#7ef2b4", size:1 },
    brute: { hp: 95, speed: 72, damage: 14, score: 250, color:"#9c4e38", accent:"#ffb05c", size:1.25 },
    boss: { hp: 420, speed: 86, damage: 18, score: 1600, color:"#313d58", accent:"#ff445f", size:1.45 }
  };



const LEVELS = [
  {
    key: "bermuda",
    name: "Level 1 - Bermuda",
    short: "Bermuda",
    worldWidth: 7800,
    arenas: [
      { trigger: 650, left: 500, right: 1320, label: "WAVE 1 · RIVERSIDE ENTRY", units:[["thug",4],["gunner",1]] },
      { trigger: 1780, left: 1600, right: 2480, label: "WAVE 2 · SHIPYARD LANE", units:[["thug",4],["gunner",2],["brute",1]] },
      { trigger: 3040, left: 2860, right: 3780, label: "WAVE 3 · CLOCK TOWER", units:[["thug",5],["gunner",2],["brute",1]] },
      { trigger: 4400, left: 4200, right: 5200, label: "WAVE 4 · HANGAR PUSH", units:[["thug",5],["gunner",3],["brute",2]] },
      { trigger: 5900, left: 5700, right: 6850, label: "BOSS WAVE · CAPE STANDOFF", units:[["thug",4],["gunner",2],["brute",1],["boss",1]] }
    ]
  },
  {
    key: "purgatory",
    name: "Level 2 - Purgatory",
    short: "Purgatory",
    worldWidth: 7900,
    arenas: [
      { trigger: 650, left: 520, right: 1360, label: "WAVE 1 · MOUNTAIN PASS", units:[["thug",4],["gunner",2]] },
      { trigger: 1820, left: 1650, right: 2550, label: "WAVE 2 · LAKESIDE ROAD", units:[["thug",4],["gunner",2],["brute",1]] },
      { trigger: 3160, left: 2980, right: 3920, label: "WAVE 3 · BRIDGE WATCH", units:[["thug",5],["gunner",3],["brute",1]] },
      { trigger: 4560, left: 4380, right: 5400, label: "WAVE 4 · CLIFFSIDE RUN", units:[["thug",5],["gunner",3],["brute",2]] },
      { trigger: 6060, left: 5860, right: 7050, label: "BOSS WAVE · CENTRAL ISLE", units:[["thug",3],["gunner",3],["brute",2],["boss",1]] }
    ]
  },
  {
    key: "kalahari",
    name: "Level 3 - Kalahari",
    short: "Kalahari",
    worldWidth: 7900,
    arenas: [
      { trigger: 650, left: 520, right: 1380, label: "WAVE 1 · CANYON EDGE", units:[["thug",5],["gunner",2]] },
      { trigger: 1840, left: 1660, right: 2580, label: "WAVE 2 · DUST YARD", units:[["thug",4],["gunner",3],["brute",1]] },
      { trigger: 3220, left: 3040, right: 3980, label: "WAVE 3 · ROCKY WASTE", units:[["thug",5],["gunner",3],["brute",1]] },
      { trigger: 4620, left: 4440, right: 5460, label: "WAVE 4 · RUINS LANE", units:[["thug",5],["gunner",3],["brute",2]] },
      { trigger: 6120, left: 5920, right: 7110, label: "BOSS WAVE · COMMAND DUNE", units:[["thug",3],["gunner",3],["brute",2],["boss",1]] }
    ]
  },
  {
    key: "nexterra",
    name: "Level 4 - NexTerra",
    short: "NexTerra",
    worldWidth: 8000,
    arenas: [
      { trigger: 650, left: 520, right: 1400, label: "WAVE 1 · NEON GATE", units:[["thug",4],["gunner",3]] },
      { trigger: 1880, left: 1700, right: 2640, label: "WAVE 2 · DATA STRIP", units:[["thug",4],["gunner",3],["brute",1]] },
      { trigger: 3280, left: 3100, right: 4080, label: "WAVE 3 · CORE PLAZA", units:[["thug",5],["gunner",3],["brute",1]] },
      { trigger: 4740, left: 4560, right: 5620, label: "WAVE 4 · PLASMA LOOP", units:[["thug",5],["gunner",4],["brute",2]] },
      { trigger: 6280, left: 6080, right: 7240, label: "BOSS WAVE · SKY NODE", units:[["thug",3],["gunner",4],["brute",2],["boss",1]] }
    ]
  },
  {
    key: "solara",
    name: "Level 5 - Solara",
    short: "Solara",
    worldWidth: 8100,
    arenas: [
      { trigger: 650, left: 520, right: 1400, label: "WAVE 1 · VILLA ROAD", units:[["thug",5],["gunner",2]] },
      { trigger: 1880, left: 1700, right: 2660, label: "WAVE 2 · SOLAR WALK", units:[["thug",4],["gunner",3],["brute",1]] },
      { trigger: 3320, left: 3140, right: 4120, label: "WAVE 3 · GARDEN MARKET", units:[["thug",5],["gunner",3],["brute",1]] },
      { trigger: 4800, left: 4620, right: 5700, label: "WAVE 4 · COASTAL PLAZA", units:[["thug",5],["gunner",4],["brute",2]] },
      { trigger: 6360, left: 6160, right: 7360, label: "BOSS WAVE · SUNSET CITADEL", units:[["thug",3],["gunner",4],["brute",2],["boss",1]] }
    ]
  }
];

function cloneArenasForLevel(level) {
  return level.arenas.map(arena => ({
    trigger: arena.trigger,
    left: arena.left,
    right: arena.right,
    label: arena.label,
    spawned: false,
    cleared: false,
    units: arena.units.map(([type, count]) => [type, count])
  }));
}




const SUPABASE_URL = "https://ooutjrewmwsixghbouxi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vdXRqcmV3bXdzaXhnaGJvdXhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMjg3NTMsImV4cCI6MjA4MjYwNDc1M30.13WkdGiQH39lZH3iDgVDd_tZrHlI0twhGeiZNdwaMSg";
const globalScoreClient = window.supabase?.createClient && !window.__glooRushSupabaseFailed
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    })
  : null;
let leaderboardCache = [];
let leaderboardMode = "loading";

const LEADERBOARD_KEY = "glooRushArcadeLeaderboard";
const LEADERBOARD_LIMIT = 10;

function sanitizeInitials(value) {
  return (value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3);
}


function getLocalLeaderboard() {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveLocalLeaderboard(entries) {
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries.slice(0, LEADERBOARD_LIMIT)));
}

function scoreSort(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  if ((b.level || 0) !== (a.level || 0)) return (b.level || 0) - (a.level || 0);
  return (a.time || 99999) - (b.time || 99999);
}

function normalizeGlobalEntry(row) {
  return {
    id: row.id,
    initials: row.initials,
    score: Number(row.score || 0),
    enemies: Number(row.enemies || 0),
    time: Number(row.run_seconds || 0),
    level: Number(row.level_reached || 1),
    result: row.result || "run",
    character: row.character || "kelly",
    savedAt: row.created_at || ""
  };
}

function setLeaderboardStatus(mode, text) {
  leaderboardMode = mode;
  if (!ui.leaderboardStatus) return;
  ui.leaderboardStatus.dataset.mode = mode;
  ui.leaderboardStatus.textContent = text;
}

async function refreshLeaderboard() {
  setLeaderboardStatus("loading", "GLOBAL TOP 10 · LOADING");
  if (globalScoreClient) {
    try {
      const { data, error } = await globalScoreClient
        .from("gloo_rush_scores")
        .select("id, initials, score, enemies, run_seconds, level_reached, result, character, created_at")
        .order("score", { ascending: false })
        .order("level_reached", { ascending: false })
        .order("run_seconds", { ascending: true })
        .limit(100);
      if (error) throw error;
      leaderboardCache = (data || []).map(normalizeGlobalEntry).sort(scoreSort);
      setLeaderboardStatus("global", "GLOBAL TOP 10 · LIVE");
      renderLeaderboard();
      return true;
    } catch (error) {
      console.warn("Global Gloo Rush leaderboard unavailable:", error);
    }
  }
  leaderboardCache = getLocalLeaderboard().sort(scoreSort);
  setLeaderboardStatus("local", "LOCAL FALLBACK · DATABASE SETUP NEEDED");
  renderLeaderboard();
  return false;
}

function getCharacterBest(character) {
  return leaderboardCache.filter((entry) => entry.character === character).sort(scoreSort)[0] || null;
}

function renderAttractBanner() {
  if (!ui.attractBanner) return;
  const board = leaderboardCache.slice().sort(scoreSort).slice(0, 3);
  if (!board.length) {
    const modeText = leaderboardMode === "global" ? "Global leaderboard is live." : "Leaderboard database is not connected.";
    ui.attractBanner.innerHTML = `<strong>ARCADE ATTRACT MODE</strong><div class="attract-main"><span class="attract-score">NO HIGH SCORE YET</span><span class="attract-sub">${modeText} Press DROP IN and set the first record.</span></div>`;
    return;
  }
  const top = board[0];
  const rivals = board.slice(1).map((entry) => `${entry.initials} ${entry.score.toLocaleString()}`).join(" · ");
  const scope = leaderboardMode === "global" ? "GLOBAL" : "LOCAL";
  ui.attractBanner.innerHTML = `<strong>${scope} ARCADE ATTRACT MODE</strong><div class="attract-main"><span class="attract-score">HIGH SCORE ${top.score.toLocaleString()}</span><span class="attract-sub">${top.initials} · ${top.character.toUpperCase()} · Lv ${top.level}/5${rivals ? ` · Rivals ${rivals}` : ""}</span></div>`;
}

function updateCharacterBestLine() {
  if (!ui.characterBestLine) return;
  const best = getCharacterBest(selectedCharacter);
  const scope = leaderboardMode === "global" ? "GLOBAL" : "LOCAL";
  if (!best) {
    ui.characterBestLine.innerHTML = `<strong>${CHARACTER_DATA[selectedCharacter].name} ${scope} BEST:</strong> No saved score yet.`;
    return;
  }
  ui.characterBestLine.innerHTML = `<strong>${CHARACTER_DATA[selectedCharacter].name} ${scope} BEST:</strong> ${best.score.toLocaleString()} pts by ${best.initials} · Reached map ${best.level}/5 in ${formatTime(best.time || 0)}.`;
}

function renderLeaderboard() {
  const board = leaderboardCache.slice().sort(scoreSort).slice(0, LEADERBOARD_LIMIT);
  if (!ui.leaderboardList) return;
  if (!board.length) {
    ui.leaderboardList.innerHTML = '<li class="lb-empty">No scores saved yet. Be the first to set the mark.</li>';
  } else {
    ui.leaderboardList.innerHTML = board.map((entry, index) => {
      const stage = `${entry.level || 1}/5`;
      return `<li><strong>${String(index + 1).padStart(2, "0")}. ${entry.initials}</strong> — ${entry.score.toLocaleString()} pts · Lv ${stage} · ${entry.character.toUpperCase()}</li>`;
    }).join("");
  }
  renderAttractBanner();
  updateCharacterBestLine();
}



  const keys = Object.create(null);
  const pressed = Object.create(null);
  let touchState = Object.create(null);
  let selectedCharacter = "kelly";
  let state = "menu";
  let currentLevelIndex = 0;
  let currentLevel = LEVELS[0];
  let levelTransitioning = false;
  let lastTime = performance.now();
  let cameraX = 0;
  let shake = 0;
  let flash = 0;
  let score = 0;
  let defeated = 0;
  let elapsed = 0;
  let combo = 0;
  let comboTimer = 0;
  let scoreSavedThisRun = false;
  let currentRunResult = null;
  let waveBonus = 0;
  let bossBonus = 0;
  let activeArena = -1;
  let arenaLocked = false;
  let arenaRight = 0;
  let nextId = 1;
  let soundEnabled = true;
  let audioCtx = null;
  let toastTimer = 0;
  let zone = {
    visible: false,
    closing: false,
    releasing: false,
    progress: 1,
    duration: 6,
    left: 80,
    right: worldWidth - 90,
    startLeft: 80,
    startRight: worldWidth - 90,
    targetLeft: 80,
    targetRight: worldWidth - 90,
    fade: 0,
    pulse: 0,
    warningStep: 0
  };

  let player;
  let enemies = [];
  let particles = [];
  let projectiles = [];
  let walls = [];
  let pickups = [];
  let floatingTexts = [];

  let arenas = [];

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const sign = v => v < 0 ? -1 : 1;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function setVisible(element, visible) {
    element.classList.toggle("visible", visible);
  }

  function showToast(text, duration = 1300) {
    ui.toast.textContent = text;
    ui.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ui.toast.classList.remove("show"), duration);
  }

  function ensureAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  }

  function beep(freq = 220, duration = .05, type = "square", volume = .035, slide = 0) {
    if (!soundEnabled) return;
    ensureAudio();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slide) osc.frequency.linearRampToValueAtTime(freq + slide, now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  function playHit(heavy = false) {
    beep(heavy ? 95 : 145, heavy ? .11 : .055, "square", heavy ? .06 : .035, heavy ? -35 : -18);
  }

  function playSkill() {
    beep(260, .16, "sawtooth", .04, 340);
  }

  function getDifficultyScale(extraWaveOffset = 0) {
    const waveIndex = activeArena >= 0 ? activeArena : extraWaveOffset;
    return 1 + currentLevelIndex * 0.18 + Math.max(0, waveIndex) * 0.08;
  }


function makeFreshZone() {
  return {
    visible: false,
    closing: false,
    releasing: false,
    progress: 1,
    duration: 6,
    left: 80,
    right: worldWidth - 90,
    startLeft: 80,
    startRight: worldWidth - 90,
    targetLeft: 80,
    targetRight: worldWidth - 90,
    fade: 0,
    pulse: 0,
    warningStep: 0
  };
}

function loadLevel(index, freshRun = false) {
  currentLevelIndex = index;
  currentLevel = LEVELS[index];
  worldWidth = currentLevel.worldWidth;
  arenas = cloneArenasForLevel(currentLevel);
  enemies = [];
  particles = [];
  projectiles = [];
  walls = [];
  pickups = [];
  floatingTexts = [];
  activeArena = -1;
  arenaLocked = false;
  arenaRight = 0;
  cameraX = 0;
  shake = 0;
  flash = 0;
  zone = makeFreshZone();
  levelTransitioning = false;

  if (player) {
    player.x = 270;
    player.y = 535;
    player.vx = 0;
    player.vy = 0;
    player.dir = 1;
    player.state = "idle";
    player.stateTime = 0;
    player.attackCooldown = 0;
    player.hitStun = 0;
    player.invuln = 0;
    player.skillCooldown = 0;
    player.healCooldown = 0;
    player.dashTime = 0;
    player.dashDir = 1;
    player.boostTimer = 0;
    player.empowered = false;
    player.guardTimer = 0;
    player.crushTimer = 0;
    player.trailTimer = 0;
    if (player.character === "tatsuya") {
      player.rebelCharges = 2;
      player.rebelRecharge = 0;
    }
    if (freshRun) {
      player.hp = player.maxHp;
      player.gloo = player.glooMax;
      player.medkits = player.medkitMax;
    } else {
      player.hp = clamp(player.hp + 28, 0, player.maxHp);
      player.gloo = player.glooMax;
      player.medkits = clamp(player.medkits + 1, 0, player.medkitMax);
    }
  }

  if (state !== "menu") {
    showToast(currentLevel.name.toUpperCase(), 1200);
    beep(210, .08, "square", .028, 70);
  }
}

function resetGame() {
  const data = CHARACTER_DATA[selectedCharacter];
  player = {
    id: 0,
    character: selectedCharacter,
    x: 270,
    y: 535,
    vx: 0,
    vy: 0,
    dir: 1,
    w: 42,
    h: 82,
    hp: data.maxHp,
    maxHp: data.maxHp,
    speed: data.speed,
    attackPower: data.attack,
    state: "idle",
    stateTime: 0,
    attackCooldown: 0,
    comboStep: 0,
    invuln: 0,
    hitStun: 0,
    skillCooldown: 0,
    healCooldown: 0,
    dashTime: 0,
    dashDir: 1,
    gloo: 3,
    glooMax: 3,
    medkits: 3,
    medkitMax: 3,
    energy: 100,
    boostTimer: 0,
    empowered: false,
    guardTimer: 0,
    crushTimer: 0,
    rebelCharges: selectedCharacter === "tatsuya" ? 2 : 0,
    rebelRecharge: 0,
    trailTimer: 0
  };
  score = 0;
  defeated = 0;
  elapsed = 0;
  combo = 0;
  comboTimer = 0;
  waveBonus = 0;
  bossBonus = 0;
  nextId = 1;
  loadLevel(0, true);
}


function setSaveMessage(message, kind = "") {
  [ui.gameOverSaveMessage, ui.victorySaveMessage].forEach((el) => {
    if (!el) return;
    el.textContent = message;
    el.classList.remove("success", "error");
    if (kind) el.classList.add(kind);
  });
}

function resetScoreSaveUI() {
  scoreSavedThisRun = false;
  currentRunResult = null;
  [ui.gameOverInitials, ui.victoryInitials].forEach((input) => {
    if (!input) return;
    input.value = "";
    input.disabled = false;
  });
  [ui.gameOverSaveButton, ui.victorySaveButton].forEach((button) => {
    if (!button) return;
    button.disabled = false;
  });
  setSaveMessage("Save your arcade run to the leaderboard.");
}


async function saveCurrentScore(rawInitials) {
  const initials = sanitizeInitials(rawInitials);
  if (initials.length !== 3) return { ok: false, message: "Use exactly 3 letters or numbers." };
  if (scoreSavedThisRun) return { ok: false, message: "This run has already been saved." };

  const payload = {
    p_initials: initials,
    p_score: Math.max(0, Math.floor(score)),
    p_enemies: Math.max(0, Math.floor(defeated)),
    p_run_seconds: Math.max(0, Math.floor(elapsed)),
    p_level_reached: clamp(currentLevelIndex + 1, 1, 5),
    p_result: currentRunResult || "run",
    p_character: selectedCharacter
  };

  if (globalScoreClient) {
    try {
      const { data, error } = await globalScoreClient.rpc("submit_gloo_rush_score", payload);
      if (error) throw error;
      scoreSavedThisRun = true;
      [ui.gameOverInitials, ui.victoryInitials].forEach((input) => { if (input) input.disabled = true; });
      [ui.gameOverSaveButton, ui.victorySaveButton].forEach((button) => { if (button) button.disabled = true; });
      await refreshLeaderboard();
      const returned = Array.isArray(data) ? data[0] : data;
      const rank = returned?.rank_position || leaderboardCache.findIndex((item) => item.id === returned?.score_id) + 1;
      return { ok: true, message: `Global score saved!${rank ? ` Rank #${rank}.` : ""}`, rank, global: true };
    } catch (error) {
      console.warn("Global score submission failed:", error);
    }
  }

  const localBoard = getLocalLeaderboard();
  const entry = {
    initials,
    score,
    enemies: defeated,
    time: Math.floor(elapsed),
    level: currentLevelIndex + 1,
    result: currentRunResult || "run",
    character: selectedCharacter,
    savedAt: Date.now()
  };
  localBoard.push(entry);
  localBoard.sort(scoreSort);
  saveLocalLeaderboard(localBoard);
  leaderboardCache = localBoard;
  setLeaderboardStatus("local", "LOCAL FALLBACK · DATABASE SETUP NEEDED");
  renderLeaderboard();
  scoreSavedThisRun = true;
  [ui.gameOverInitials, ui.victoryInitials].forEach((input) => { if (input) input.disabled = true; });
  [ui.gameOverSaveButton, ui.victorySaveButton].forEach((button) => { if (button) button.disabled = true; });
  return { ok: true, message: "Saved locally only. Run supabase/05_gloo_rush_global_leaderboard.sql to enable the shared Top 10.", global: false };
}

async function handleSaveScore(which) {
  const input = which === "victory" ? ui.victoryInitials : ui.gameOverInitials;
  const button = which === "victory" ? ui.victorySaveButton : ui.gameOverSaveButton;
  if (button) {
    button.disabled = true;
    button.textContent = "SAVING...";
  }
  const result = await saveCurrentScore(input ? input.value : "");
  setSaveMessage(result.message, result.ok ? "success" : "error");
  if (button && !scoreSavedThisRun) {
    button.disabled = false;
    button.textContent = "SAVE SCORE";
  }
  if (result.ok) beep(520, .12, "square", .04, 120);
  else beep(110, .07, "square", .025, -20);
}


  function startGame() {
    ensureAudio();
    resetScoreSaveUI();
    resetGame();
    state = "playing";
    document.body.classList.add("game-running");
    setVisible(ui.start, false);
    setVisible(ui.pause, false);
    setVisible(ui.gameOver, false);
    setVisible(ui.victory, false);
    showToast(`${currentLevel.name.toUpperCase()} · MOVE RIGHT`, 1800);
    beep(180, .12, "square", .04, 260);
  }

  function showCharacterSelect() {
    if (typeof resetJoystick === "function") resetJoystick();
    state = "menu";
    document.body.classList.remove("game-running");
    touchState = Object.create(null);
    setVisible(ui.pause, false);
    setVisible(ui.gameOver, false);
    setVisible(ui.victory, false);
    setVisible(ui.start, true);
    document.querySelectorAll(".fighter").forEach(btn => {
      btn.classList.toggle("selected", btn.dataset.character === selectedCharacter);
    });
    ui.selectedDescription.innerHTML = CHARACTER_DATA[selectedCharacter].description;
    resetScoreSaveUI();
    refreshLeaderboard();
    resetGame();
    lastTime = performance.now();
    showToast("SELECT A SURVIVOR", 700);
  }

  function pauseGame(toggle = true) {
    if (state === "playing" && toggle) {
      if (typeof resetJoystick === "function") resetJoystick();
      state = "paused";
      setVisible(ui.pause, true);
    } else if (state === "paused") {
      state = "playing";
      setVisible(ui.pause, false);
      lastTime = performance.now();
    }
  }

  function endGame(victory) {
    if (typeof resetJoystick === "function") resetJoystick();
    state = victory ? "victory" : "gameover";
    currentRunResult = victory ? "victory" : "gameover";
    document.body.classList.remove("game-running");
    const stats = `Score ${score.toLocaleString()} · ${defeated} enemies · ${formatTime(elapsed)} · Cleared ${currentLevelIndex + 1}/5 maps · Wave Bonus ${waveBonus.toLocaleString()} · Boss Bonus ${bossBonus.toLocaleString()}`;
    setSaveMessage("Enter 3-letter initials to save your score.");
    if (victory) {
      ui.victoryStats.textContent = stats;
      setVisible(ui.victory, true);
      beep(392, .14, "square", .045, 130);
      setTimeout(() => beep(523, .18, "square", .045, 130), 130);
    } else {
      ui.gameOverStats.textContent = stats;
      setVisible(ui.gameOver, true);
      beep(130, .32, "sawtooth", .045, -70);
    }
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }

  function beginClosingZone(arena) {
    zone.visible = true;
    zone.closing = true;
    zone.releasing = false;
    zone.progress = 0;
    zone.duration = 6.5;
    zone.startLeft = Math.max(70, arena.left - 290);
    zone.startRight = Math.min(worldWidth - 70, arena.right + 290);
    zone.targetLeft = arena.left + 20;
    zone.targetRight = arena.right - 25;
    zone.left = zone.startLeft;
    zone.right = zone.startRight;
    zone.fade = 1;
    zone.warningStep = 0;
  }

  function releaseClosingZone() {
    zone.closing = false;
    zone.releasing = true;
    zone.fade = 1;
  }

  function updateZone(dt) {
    zone.pulse += dt;
    if (zone.visible && zone.closing) {
      zone.progress = clamp(zone.progress + dt / zone.duration, 0, 1);
      const eased = 1 - Math.pow(1 - zone.progress, 3);
      zone.left = lerp(zone.startLeft, zone.targetLeft, eased);
      zone.right = lerp(zone.startRight, zone.targetRight, eased);

      const step = Math.floor(zone.progress * 4);
      if (step > zone.warningStep && step < 4) {
        zone.warningStep = step;
        beep(150 + step * 24, .08, "sawtooth", .022, 35);
      }
      if (zone.progress >= 1) {
        zone.closing = false;
        showToast("PLAY ZONE LOCKED", 850);
        beep(270, .12, "square", .035, 90);
      }
    } else if (zone.visible && zone.releasing) {
      zone.left -= 330 * dt;
      zone.right += 330 * dt;
      zone.fade = Math.max(0, zone.fade - dt * 1.45);
      if (zone.fade <= 0) {
        zone.visible = false;
        zone.releasing = false;
      }
    }
  }

  function spawnArena(index) {
    const arena = arenas[index];
    if (arena.spawned) return;
    arena.spawned = true;
    activeArena = index;
    arenaLocked = true;
    arenaRight = arena.right;
    beginClosingZone(arena);
    showToast(`${arena.label} · ZONE SHRINKING`, 1500);
    let slot = 0;
    arena.units.forEach(([type, count]) => {
      for (let i = 0; i < count; i++) {
        const side = slot++ % 2 === 0 ? 1 : -1;
        const x = side > 0 ? arena.right - rand(70, 260) : arena.left + rand(80, 250);
        spawnEnemy(type, x, rand(FLOOR_TOP + 65, FLOOR_BOTTOM - 30), i * .12);
      }
    });
  }

  function spawnEnemy(type, x, y, delay = 0) {
    const d = ENEMY_DATA[type];
    const diff = getDifficultyScale();
    const hp = Math.round(d.hp * diff * (type === "boss" ? 1.12 : 1));
    const speed = d.speed * (1 + (diff - 1) * 0.28);
    const damage = d.damage * (1 + (diff - 1) * 0.35);
    const scoreValue = Math.round(d.score * (1 + (diff - 1) * 0.55));
    enemies.push({
      id: nextId++,
      type, x, y, vx:0, vy:0, dir:-1,
      hp:hp, maxHp:hp, speed:speed, damage:damage,
      score:scoreValue, size:d.size, color:d.color, accent:d.accent,
      state:"spawn", stateTime:0, spawnDelay:delay,
      attackCooldown:rand(.25,.8), shootCooldown:rand(.9,1.5),
      hitStun:0, invuln:0, knockX:0, knockY:0,
      dead:false, bossPhase:0
    });
  }

  function spawnPickup(x, y, forced = null) {
    const type = forced || (Math.random() < .55 ? "heal" : "gloo");
    pickups.push({ id:nextId++, type, x, y, bob:rand(0,6.28), life:14 });
  }

  function deployGloo() {
    if (player.gloo <= 0 || player.hitStun > 0) {
      showToast("NO GLOO WALLS");
      beep(90, .07, "square", .03, -20);
      return;
    }
    if (walls.some(w => Math.abs(w.x - (player.x + player.dir * 105)) < 55 && Math.abs(w.y-player.y) < 90)) return;
    player.gloo--;
    const x = clamp(player.x + player.dir * 105, 120, worldWidth - 120);
    walls.push({
      id: nextId++,
      x, y: player.y,
      hp: 110, maxHp:110,
      life: 12,
      grow:0,
      hit:0
    });
    for (let i=0;i<22;i++) {
      particles.push(makeParticle(x + rand(-22,22), player.y + rand(-75,25), rand(-65,65), rand(-120,-25), rand(.25,.65), "#9df5ff", rand(2,6)));
    }
    showToast("GLOO WALL DEPLOYED", 700);
    beep(190, .16, "triangle", .05, 190);
  }

  function fireGun() {
    if (player.hitStun > 0 || player.attackCooldown > 0 || player.dashTime > 0) return;
    player.state = "shoot";
    player.stateTime = 0;
    player.attackCooldown = .22;

    const hayatoBonus = player.character === "hayato"
      ? 1 + (1 - player.hp / player.maxHp) * .65
      : 1;
    const empoweredBonus = player.empowered ? 1.8 : 1;
    const damage = player.attackPower * 1.08 * hayatoBonus * empoweredBonus;

    projectiles.push({
      id: nextId++,
      type: "playerBullet",
      friendly: true,
      x: player.x + player.dir * 36,
      y: player.y - 50,
      vx: player.dir * 860,
      vy: 0,
      life: 1.25,
      damage,
      w: 18,
      h: 8,
      color: player.empowered ? "#ffdc51" : "#9ef4ff"
    });

    if (player.empowered) {
      player.empowered = false;
      radialBurst(player.x + player.dir * 38, player.y - 50, "#ffdc51", 12);
      showToast("DEADLY VELOCITY SHOT", 550);
    }

    player.vx -= player.dir * 16;
    beep(190, .055, "square", .035, -75);
  }

  function useMedkit() {
    if (player.hitStun > 0 || player.healCooldown > 0) return;
    if (player.medkits <= 0) {
      showToast("NO MED KITS");
      beep(90, .07, "square", .03, -20);
      return;
    }
    if (player.hp >= player.maxHp) {
      showToast("HEALTH ALREADY FULL", 650);
      return;
    }

    player.medkits--;
    player.healCooldown = 1.2;
    const healed = Math.min(40, player.maxHp - player.hp);
    player.hp += healed;
    addFloatingText(player.x, player.y - 96, `+${Math.round(healed)}`, "#75f3a7");
    radialBurst(player.x, player.y - 42, "#75f3a7", 18);
    showToast(`MED KIT USED · ${player.medkits} LEFT`, 800);
    beep(390, .14, "sine", .04, 180);
  }

  function useSignature() {
    if (player.hitStun > 0) return;
    const c = player.character;
    if (c === "kelly") {
      if (player.skillCooldown > 0) return showCooldown();
      player.skillCooldown = 9;
      player.boostTimer = 4;
      player.empowered = true;
      player.invuln = Math.max(player.invuln, .25);
      showToast("DEADLY VELOCITY");
      playSkill();
      radialBurst(player.x, player.y-35, "#ffd843", 22);
    } else if (c === "tatsuya") {
      if (player.rebelCharges <= 0) return showCooldown("REBEL RUSH RECHARGING");
      player.rebelCharges--;
      if (player.rebelCharges < 2 && player.rebelRecharge <= 0) player.rebelRecharge = 7;
      player.state = "skill";
      player.stateTime = 0;
      player.dashTime = .34;
      player.dashDir = player.dir;
      player.invuln = .38;
      showToast("REBEL RUSH", 650);
      playSkill();
    } else if (c === "orion") {
      if (player.skillCooldown > 0) return showCooldown();
      player.skillCooldown = 12;
      player.crushTimer = 2.4;
      player.invuln = 2.4;
      player.state = "skill";
      showToast("CRIMSON CRUSH");
      playSkill();
    } else if (c === "hayato") {
      if (player.skillCooldown > 0) return showCooldown();
      player.skillCooldown = 10;
      player.guardTimer = 5;
      player.state = "skill";
      player.stateTime = 0;
      showToast("ART OF BLADES");
      playSkill();
      radialBurst(player.x, player.y-30, "#ff8d36", 16);
    }
  }


  function showCooldown(message = "SKILL RECHARGING") {
    showToast(message, 650);
    beep(95, .05, "square", .022, -12);
  }


  function hitEnemiesInBox(cx, cy, w, h, damage, knockX, knockY = 0) {
    let hit = false;
    for (const enemy of enemies) {
      if (enemy.dead || enemy.state === "spawn" || enemy.invuln > 0) continue;
      if (Math.abs(enemy.x - cx) < w/2 + 24*enemy.size &&
          Math.abs((enemy.y-35*enemy.size) - cy) < h/2 + 38*enemy.size) {
        damageEnemy(enemy, damage, knockX, knockY);
        hit = true;
      }
    }
    return hit;
  }

  function hitEnemiesRadius(x, y, radius, damage, knock = 160) {
    let hit = false;
    for (const enemy of enemies) {
      if (enemy.dead || enemy.state === "spawn" || enemy.invuln > 0) continue;
      const d = Math.hypot(enemy.x-x, enemy.y-y);
      if (d < radius + 18*enemy.size) {
        const nx = (enemy.x-x)/(d||1);
        damageEnemy(enemy, damage, nx*knock, -25);
        hit = true;
      }
    }
    return hit;
  }

  function damageEnemy(enemy, damage, knockX = 0, knockY = 0) {
    if (enemy.dead || enemy.invuln > 0) return;
    const amount = Math.round(damage);
    enemy.hp -= amount;
    enemy.hitStun = enemy.type === "boss" ? .11 : .25;
    enemy.invuln = .08;
    enemy.knockX += knockX / (enemy.type === "boss" ? 3.2 : enemy.size);
    enemy.knockY += knockY;
    enemy.state = "hit";
    enemy.stateTime = 0;
    addFloatingText(enemy.x, enemy.y - 90*enemy.size, `${amount}`, "#fff1a8");
    combo++;
    comboTimer = 2.1;
    score += Math.round(amount * 2 + combo * 1.5);
    shake = Math.max(shake, damage > 25 ? 9 : 4);
    for (let i=0;i<8;i++) {
      particles.push(makeParticle(enemy.x + rand(-16,16), enemy.y-rand(25,65), rand(-110,110), rand(-130,20), rand(.22,.48), enemy.accent, rand(2,5)));
    }
    if (enemy.hp <= 0) killEnemy(enemy);
  }

  function killEnemy(enemy) {
    enemy.dead = true;
    enemy.state = "dead";
    enemy.stateTime = 0;
    defeated++;
    score += enemy.score + combo*8;
    shake = Math.max(shake, enemy.type === "boss" ? 18 : 8);
    radialBurst(enemy.x, enemy.y-40*enemy.size, enemy.accent, enemy.type === "boss" ? 55 : 20);
    if (enemy.type === "boss") {
      const bonus = 3000 * (currentLevelIndex + 1);
      bossBonus += bonus;
      score += bonus;
      addFloatingText(enemy.x, enemy.y - 130 * enemy.size, `BOSS BONUS +${bonus}`, "#ffd574");
      showToast(`BOSS ELIMINATED · BONUS +${bonus}`, 1700);
    } else if (Math.random() < .23) {
      spawnPickup(enemy.x, enemy.y);
    }
    beep(enemy.type === "boss" ? 70 : 105, enemy.type === "boss" ? .28 : .09, "sawtooth", .05, -35);
  }

  function damagePlayer(amount, sourceX, projectile = false) {
    if (player.invuln > 0 || player.hp <= 0) return;
    let final = amount;
    if (player.character === "hayato" && player.guardTimer > 0) {
      const front = (sourceX - player.x) * player.dir > 0;
      if (front) final *= .35;
      else final *= .8;
    }
    player.hp -= Math.max(1, Math.round(final));
    player.hitStun = .32;
    player.invuln = .62;
    player.vx = sourceX < player.x ? 180 : -180;
    player.state = "hit";
    player.stateTime = 0;
    addFloatingText(player.x, player.y-92, `-${Math.round(final)}`, "#ff798b");
    shake = Math.max(shake, 9);
    flash = .08;
    playHit(true);
    if (player.hp <= 0) {
      player.hp = 0;
      setTimeout(() => endGame(false), 650);
    }
  }

  function wallBlocksSegment(x1, y1, x2, y2) {
    for (const w of walls) {
      if (w.life <= 0 || w.hp <= 0) continue;
      if (Math.abs(w.y-y1) > 100) continue;
      if ((x1 < w.x && x2 >= w.x) || (x1 > w.x && x2 <= w.x)) return w;
    }
    return null;
  }

  function damageWall(wall, amount) {
    wall.hp -= amount;
    wall.hit = .12;
    for (let i=0;i<5;i++) {
      particles.push(makeParticle(wall.x + rand(-23,23), wall.y-rand(10,120), rand(-90,90), rand(-80,20), rand(.2,.45), "#b7f7ff", rand(2,5)));
    }
    if (wall.hp <= 0) {
      wall.life = 0;
      radialBurst(wall.x, wall.y-55, "#9befff", 28);
      beep(160,.12,"triangle",.04,-90);
    }
  }

  function updatePlayer(dt) {
    const data = CHARACTER_DATA[player.character];
    player.attackCooldown = Math.max(0, player.attackCooldown-dt);
    player.skillCooldown = Math.max(0, player.skillCooldown-dt);
    player.healCooldown = Math.max(0, player.healCooldown-dt);
    player.invuln = Math.max(0, player.invuln-dt);
    player.hitStun = Math.max(0, player.hitStun-dt);
    player.boostTimer = Math.max(0, player.boostTimer-dt);
    player.guardTimer = Math.max(0, player.guardTimer-dt);
    player.crushTimer = Math.max(0, player.crushTimer-dt);
    player.stateTime += dt;
    player.energy = clamp(player.energy + 11*dt, 0, 100);

    if (player.character === "tatsuya" && player.rebelCharges < 2) {
      player.rebelRecharge -= dt;
      if (player.rebelRecharge <= 0) {
        player.rebelCharges++;
        player.rebelRecharge = player.rebelCharges < 2 ? 7 : 0;
        showToast("REBEL RUSH CHARGE +1", 700);
      }
    }

    if (player.crushTimer > 0) {
      player.trailTimer -= dt;
      if (player.trailTimer <= 0) {
        player.trailTimer = .09;
        radialBurst(player.x, player.y-35, "#ff244d", 5);
      }
      for (const e of enemies) {
        if (!e.dead && e.state !== "spawn" && dist(e,player) < 120) {
          e.hp -= 18*dt;
          player.hp = clamp(player.hp + 8*dt, 0, player.maxHp);
          e.hitStun = Math.max(e.hitStun,.06);
          if (e.hp <= 0) killEnemy(e);
        }
      }
    }

    if (player.dashTime > 0) {
      player.dashTime -= dt;
      const speed = player.character === "tatsuya" ? 860 : 700;
      const oldX = player.x;
      player.x += player.dashDir * speed * dt;
      player.trailTimer -= dt;
      if (player.trailTimer <= 0) {
        player.trailTimer = .035;
        particles.push({
          x:player.x-player.dashDir*28, y:player.y-43, vx:-player.dashDir*30, vy:0,
          life:.18, maxLife:.18, color:player.character==="tatsuya"?"#f45a67":"#ffd94f",
          size:14, gravity:0, alpha:.45
        });
      }
      const mult = player.character === "tatsuya" ? 1.35 : 1.2;
      hitEnemiesInBox(player.x + player.dashDir*25, player.y-34, 85, 72, player.attackPower*mult, player.dashDir*330, -18);
      const wall = wallBlocksSegment(oldX, player.y, player.x, player.y);
      if (wall) player.x = oldX;
    } else if (player.hitStun <= 0) {
      let mx = Number(touchState.joyX || 0);
      let my = Number(touchState.joyY || 0);
      if (keys.ArrowLeft || keys.KeyA || touchState.left) mx--;
      if (keys.ArrowRight || keys.KeyD || touchState.right) mx++;
      if (keys.ArrowUp || keys.KeyW || touchState.up) my--;
      if (keys.ArrowDown || keys.KeyS || touchState.down) my++;
      const inputMagnitude = Math.min(1, Math.hypot(mx, my));
      if (inputMagnitude > .08) {
        const len = Math.hypot(mx,my);
        mx /= len; my /= len;
        const speed = data.speed * (player.boostTimer > 0 ? 1.72 : 1);
        const oldX = player.x, oldY = player.y;
        const analogSpeed = inputMagnitude < .98 ? Math.max(.38, inputMagnitude) : 1;
        player.x += mx * speed * analogSpeed * dt;
        player.y += my * speed * .72 * analogSpeed * dt;
        if (mx) player.dir = sign(mx);
        player.state = "run";
        const wall = wallBlocksSegment(oldX, oldY, player.x, player.y);
        if (wall) player.x = oldX;
      } else if (!["shoot","skill","spin"].includes(player.state) || player.stateTime > .56) {
        player.state = "idle";
      }
    }

    player.x += player.vx*dt;
    player.y += player.vy*dt;
    player.vx *= Math.pow(.001,dt);
    player.vy *= Math.pow(.001,dt);

    const leftBound = arenaLocked && zone.visible ? zone.left + 24 : (arenaLocked ? arenas[activeArena].left + 20 : 80);
    const rightBound = arenaLocked && zone.visible ? zone.right - 24 : (arenaLocked ? arenaRight - 25 : worldWidth - 90);
    player.x = clamp(player.x, leftBound, rightBound);
    player.y = clamp(player.y, FLOOR_TOP+55, FLOOR_BOTTOM);

    if (pressed.KeyJ || pressed.Numpad1 || touchState.attackPress) fireGun();
    if (pressed.KeyK || touchState.signaturePress) useSignature();
    if (pressed.KeyL || touchState.glooPress) deployGloo();
    if (pressed.KeyI || touchState.healPress) useMedkit();

    touchState.attackPress = false;
    touchState.signaturePress = false;
    touchState.glooPress = false;
    touchState.healPress = false;

    if (player.state === "shoot" && player.stateTime > .18) player.state = "idle";
    if ((player.state === "skill" || player.state === "spin") && player.stateTime > .62 && player.dashTime <= 0 && player.crushTimer <= 0) player.state = "idle";

    for (let i=0;i<arenas.length;i++) {
      if (!arenas[i].spawned && player.x >= arenas[i].trigger) spawnArena(i);
    }
  }

  function updateEnemies(dt) {
    for (const e of enemies) {
      e.stateTime += dt;
      e.attackCooldown -= dt;
      e.shootCooldown -= dt;
      e.hitStun = Math.max(0,e.hitStun-dt);
      e.invuln = Math.max(0,e.invuln-dt);

      if (e.dead) {
        e.y += 6*dt;
        continue;
      }
      if (e.state === "spawn") {
        e.spawnDelay -= dt;
        if (e.spawnDelay <= 0) {
          e.state = "idle";
          radialBurst(e.x,e.y-35,"#9daec5",8);
        }
        continue;
      }
      e.x += e.knockX*dt;
      e.y += e.knockY*dt;
      e.knockX *= Math.pow(.006,dt);
      e.knockY *= Math.pow(.006,dt);
      const enemyLeftBound = arenaLocked && zone.visible ? zone.left + 18 : 70;
      const enemyRightBound = arenaLocked && zone.visible ? zone.right - 18 : worldWidth - 70;
      e.x = clamp(e.x, enemyLeftBound, enemyRightBound);
      e.y = clamp(e.y, FLOOR_TOP+55, FLOOR_BOTTOM);

      if (e.hitStun > 0) continue;
      const dx = player.x-e.x;
      const dy = player.y-e.y;
      e.dir = dx >= 0 ? 1 : -1;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      const wall = wallBlocksSegment(e.x,e.y,player.x,player.y);

      if (e.type === "gunner") {
        if ((absX > 270 || absY > 75) && !wall) {
          e.x += sign(dx)*e.speed*dt*(absX>420?1:.35);
          e.y += sign(dy)*e.speed*.55*dt;
          e.state = "run";
        } else if (wall && absX < 460) {
          if (e.attackCooldown <= 0) {
            e.attackCooldown = .85;
            damageWall(wall, e.damage+3);
            e.state = "attack";
            playHit();
          }
        } else if (e.shootCooldown <= 0 && absX < 560) {
          e.shootCooldown = rand(1.25,1.8);
          e.state = "shoot";
          fireEnemyBullet(e);
        } else {
          e.state = "idle";
        }
      } else {
        const desired = e.type === "boss" ? 82 : 58*e.size;
        if (wall && absX < 220 && absY < 100) {
          if (e.attackCooldown <= 0) {
            e.attackCooldown = e.type==="boss"?.55:.85;
            damageWall(wall,e.damage*(e.type==="boss"?1.7:1));
            e.state = "attack";
            playHit(true);
          }
        } else if (absX > desired || absY > 50) {
          const len = Math.hypot(dx,dy)||1;
          e.x += dx/len*e.speed*dt;
          e.y += dy/len*e.speed*.72*dt;
          e.state = "run";
        } else if (e.attackCooldown <= 0) {
          e.attackCooldown = e.type==="boss" ? .72 : (e.type==="brute"?1.05:.82);
          e.state = "attack";
          e.stateTime = 0;
          setTimeout(() => {
            if (state !== "playing" || e.dead) return;
            if (Math.abs(player.x-e.x) < desired+40 && Math.abs(player.y-e.y)<62) {
              damagePlayer(e.damage,e.x);
            }
          }, e.type==="boss"?210:150);
        } else {
          e.state = "idle";
        }

        if (e.type === "boss") {
          e.bossPhase += dt;
          if (e.bossPhase > 4.2 && e.shootCooldown <= 0) {
            e.bossPhase = 0;
            e.shootCooldown = 1.2;
            for (let a=-1;a<=1;a++) fireEnemyBullet(e, a*.22, 1.25);
            showToast("BOSS: SCATTER SHOT",550);
          }
        }
      }
    }

    enemies = enemies.filter(e => !e.dead || e.stateTime < 1.5);


  if (arenaLocked && activeArena >= 0) {
    const alive = enemies.some(e => !e.dead);
    if (!alive && !levelTransitioning) {
const arena = arenas[activeArena];
arena.cleared = true;
const clearedWave = activeArena;
arenaLocked = false;
releaseClosingZone();
const clearBonus = 500 * (clearedWave + 1);
const endWaveBonus = (750 + clearedWave * 250) * (currentLevelIndex + 1);
score += clearBonus + endWaveBonus;
waveBonus += endWaveBonus;
if (player.gloo < player.glooMax) player.gloo++;
addFloatingText(player.x, player.y - 120, `WAVE BONUS +${endWaveBonus}`, "#8df1ff");
showToast(clearedWave === arenas.length - 1 ? `BOSS WAVE CLEAR · BONUS +${endWaveBonus}` : `WAVE CLEAR · BONUS +${endWaveBonus}`, 1650);
activeArena = -1;

      if (arenas.every(a => a.cleared)) {
        if (currentLevelIndex < LEVELS.length - 1) {
          levelTransitioning = true;
          const nextLevel = LEVELS[currentLevelIndex + 1];
          score += 1000 * (currentLevelIndex + 1);
          player.hp = clamp(player.hp + 24, 0, player.maxHp);
          player.gloo = player.glooMax;
          player.medkits = clamp(player.medkits + 1, 0, player.medkitMax);
          showToast(`LEVEL CLEAR · NEXT ${nextLevel.short.toUpperCase()}`, 1700);
          setTimeout(() => {
            if (state === "playing") loadLevel(currentLevelIndex + 1, false);
          }, 1450);
        } else {
          setTimeout(() => endGame(true), 1200);
        }
      }
    }
  }
}

function fireEnemyBullet(enemy, angleOffset=0, speedMult=1) {
    const dx = player.x-enemy.x;
    const dy = (player.y-38)-(enemy.y-45*enemy.size);
    const angle = Math.atan2(dy,dx)+angleOffset;
    projectiles.push({
      id:nextId++, type:"bullet", friendly:false,
      x:enemy.x+enemy.dir*26*enemy.size, y:enemy.y-48*enemy.size,
      vx:Math.cos(angle)*420*speedMult, vy:Math.sin(angle)*420*speedMult,
      life:2.2, damage:enemy.damage, w:14, h:6, color:"#ffd573"
    });
    beep(115,.045,"square",.025,-20);
  }

  function updateProjectiles(dt) {
    for (const p of projectiles) {
      const oldX=p.x, oldY=p.y;
      p.x += p.vx*dt; p.y += p.vy*dt; p.life -= dt;
      if (p.friendly) {
        for (const e of enemies) {
          if (e.dead || e.state==="spawn") continue;
          if (Math.abs(e.x-p.x)<p.w/2+25*e.size && Math.abs((e.y-40*e.size)-p.y)<p.h/2+45*e.size) {
            damageEnemy(e,p.damage,sign(p.vx)*330,-30);
            p.life=0;
            break;
          }
        }
      } else {
        const wall=wallBlocksSegment(oldX,oldY,p.x,p.y);
        if (wall) {
          damageWall(wall,p.damage*1.2);
          p.life=0;
          continue;
        }
        if (Math.abs(player.x-p.x)<28 && Math.abs((player.y-40)-p.y)<48) {
          damagePlayer(p.damage,p.x,true);
          p.life=0;
        }
      }
    }
    projectiles=projectiles.filter(p=>p.life>0 && p.x>-100 && p.x<worldWidth+100);
  }

  function updateWalls(dt) {
    for (const w of walls) {
      w.life-=dt;
      w.grow=Math.min(1,w.grow+dt*5);
      w.hit=Math.max(0,w.hit-dt);
      if (w.life<1.2) w.grow=clamp(w.life/1.2,0,1);
    }
    walls=walls.filter(w=>w.life>0 && w.hp>0);
  }

  function updatePickups(dt) {
    for (const p of pickups) {
      p.life-=dt; p.bob+=dt*3;
      if (Math.abs(player.x-p.x)<45 && Math.abs(player.y-p.y)<45) {
        if (p.type==="heal") {
          if (player.medkits < player.medkitMax) {
            player.medkits++;
            showToast("MED KIT +1",700);
          } else {
            player.hp=clamp(player.hp+20,0,player.maxHp);
            showToast("MED KIT INVENTORY FULL · +20 HP",850);
          }
          beep(420,.12,"sine",.035,180);
        } else {
          player.gloo=clamp(player.gloo+1,0,player.glooMax);
          showToast("GLOO WALL +1",700);
          beep(250,.12,"triangle",.035,160);
        }
        p.life=0;
      }
    }
    pickups=pickups.filter(p=>p.life>0);
  }

  function makeParticle(x,y,vx,vy,life,color,size) {
    return {x,y,vx,vy,life,maxLife:life,color,size,gravity:260,alpha:1};
  }
  function radialBurst(x,y,color,count) {
    for (let i=0;i<count;i++) {
      const a=rand(0,Math.PI*2), s=rand(45,260);
      particles.push(makeParticle(x,y,Math.cos(a)*s,Math.sin(a)*s,rand(.25,.75),color,rand(2,7)));
    }
  }
  function updateParticles(dt) {
    for (const p of particles) {
      p.life-=dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=(p.gravity||0)*dt;
      p.alpha=clamp(p.life/p.maxLife,0,1);
    }
    particles=particles.filter(p=>p.life>0);
    for (const f of floatingTexts) {
      f.life-=dt; f.y-=45*dt;
    }
    floatingTexts=floatingTexts.filter(f=>f.life>0);
  }
  function addFloatingText(x,y,text,color) {
    floatingTexts.push({x,y,text,color,life:.75,maxLife:.75});
  }

  function update(dt) {
    elapsed += dt;
    comboTimer -= dt;
    if (comboTimer<=0) combo=0;
    updateZone(dt);
    updatePlayer(dt);
    updateEnemies(dt);
    updateProjectiles(dt);
    updateWalls(dt);
    updatePickups(dt);
    updateParticles(dt);
    const target=clamp(player.x-W*.42,0,worldWidth-W);
    cameraX=lerp(cameraX,target,1-Math.pow(.00035,dt));
    shake=Math.max(0,shake-dt*34);
    flash=Math.max(0,flash-dt);
    for (const key in pressed) delete pressed[key];
  }

  function px(x,y,w,h,color) {
    ctx.fillStyle=color;
    ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
  }


function drawBackground() {
  const cam = cameraX;
  const levelKey = currentLevel?.key || "bermuda";
  if (levelKey === "bermuda") drawBermudaBackground(cam);
  else if (levelKey === "purgatory") drawPurgatoryBackground(cam);
  else if (levelKey === "kalahari") drawKalahariBackground(cam);
  else if (levelKey === "nexterra") drawNexTerraBackground(cam);
  else drawSolaraBackground(cam);
  drawStaticPlayAreaEdges(cam);
}

function drawParallaxMountains(cam, color, yBase, height, factor, width = 260) {
  ctx.fillStyle = color;
  for (let i = -2; i < 18; i++) {
    const x = i * width - (cam * factor) % width;
    ctx.beginPath();
    ctx.moveTo(x, yBase);
    ctx.lineTo(x + width * .22, yBase - height * .42);
    ctx.lineTo(x + width * .55, yBase - height);
    ctx.lineTo(x + width * .92, yBase - height * .35);
    ctx.lineTo(x + width, yBase);
    ctx.closePath();
    ctx.fill();
  }
}

function drawPalmTree(x, y, scale = 1) {
  px(x - 5 * scale, y - 70 * scale, 10 * scale, 72 * scale, "#765031");
  px(x - 7 * scale, y - 55 * scale, 14 * scale, 10 * scale, "#8b5e3a");
  const leaves = [
    [-38, -82, 34, 10], [-14, -94, 32, 10], [7, -83, 36, 10],
    [-33, -69, 26, 8], [8, -68, 26, 8]
  ];
  leaves.forEach(([dx, dy, w, h]) => px(x + dx * scale, y + dy * scale, w * scale, h * scale, "#3aa06b"));
  px(x - 4 * scale, y - 86 * scale, 8 * scale, 8 * scale, "#5ec78e");
}

function drawPineTree(x, y, scale = 1) {
  px(x - 4 * scale, y - 60 * scale, 8 * scale, 60 * scale, "#5a4633");
  px(x - 24 * scale, y - 78 * scale, 48 * scale, 16 * scale, "#2e6a52");
  px(x - 20 * scale, y - 96 * scale, 40 * scale, 16 * scale, "#34775b");
  px(x - 16 * scale, y - 114 * scale, 32 * scale, 16 * scale, "#3d8567");
}

function drawCactus(x, y, scale = 1) {
  px(x - 6 * scale, y - 48 * scale, 12 * scale, 48 * scale, "#4c8c62");
  px(x - 18 * scale, y - 34 * scale, 10 * scale, 22 * scale, "#4c8c62");
  px(x + 8 * scale, y - 42 * scale, 10 * scale, 24 * scale, "#4c8c62");
  px(x - 16 * scale, y - 16 * scale, 8 * scale, 8 * scale, "#4c8c62");
  px(x + 10 * scale, y - 24 * scale, 8 * scale, 8 * scale, "#4c8c62");
}

function drawContainer(x, y, color = "#4277b8") {
  px(x, y, 82, 48, color);
  px(x + 4, y + 4, 74, 40, "rgba(255,255,255,.1)");
  for (let i = 0; i < 5; i++) px(x + 8 + i * 14, y + 6, 3, 36, "rgba(0,0,0,.15)");
}

function drawBridgeSegment(x, y, scale = 1) {
  px(x, y, 110 * scale, 10 * scale, "#4b5e6e");
  px(x + 6 * scale, y - 44 * scale, 6 * scale, 54 * scale, "#6e8596");
  px(x + 98 * scale, y - 44 * scale, 6 * scale, 54 * scale, "#6e8596");
  for (let i = 0; i < 6; i++) px(x + 10 * scale + i * 16 * scale, y - 18 * scale, 3 * scale, 18 * scale, "#a0b8c8");
}

function drawNeonTower(x, y, scale = 1) {
  px(x, y - 92 * scale, 68 * scale, 92 * scale, "#17243c");
  px(x + 6 * scale, y - 86 * scale, 56 * scale, 80 * scale, "#24385e");
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 3; col++) {
      px(x + 12 * scale + col * 16 * scale, y - 74 * scale + row * 12 * scale, 8 * scale, 6 * scale, row % 2 ? "#7fe5ff" : "#5c78ff");
    }
  }
  px(x + 28 * scale, y - 108 * scale, 12 * scale, 16 * scale, "#f5568c");
}

function drawSolarPanel(x, y, scale = 1) {
  px(x, y - 4 * scale, 48 * scale, 8 * scale, "#213348");
  px(x + 4 * scale, y - 18 * scale, 40 * scale, 14 * scale, "#3f77a5");
  for (let i = 0; i < 4; i++) px(x + 6 * scale + i * 9 * scale, y - 16 * scale, 2 * scale, 10 * scale, "#9ce3ff");
  px(x + 20 * scale, y, 6 * scale, 16 * scale, "#7f8b94");
}

function drawVilla(x, y, scale = 1) {
  px(x, y - 52 * scale, 78 * scale, 52 * scale, "#efe3cc");
  px(x - 4 * scale, y - 60 * scale, 86 * scale, 12 * scale, "#da7f42");
  px(x + 10 * scale, y - 40 * scale, 16 * scale, 16 * scale, "#7fb5dd");
  px(x + 38 * scale, y - 40 * scale, 16 * scale, 16 * scale, "#7fb5dd");
  px(x + 28 * scale, y - 20 * scale, 16 * scale, 20 * scale, "#91603f");
}

function drawGroundBase(topColor, midColor, bottomColor, markerColor) {
  ctx.fillStyle = midColor; ctx.fillRect(0, FLOOR_TOP, W, H - FLOOR_TOP);
  ctx.fillStyle = topColor; ctx.fillRect(0, FLOOR_TOP, W, 8);
  ctx.fillStyle = bottomColor; ctx.fillRect(0, 590, W, 130);
  const roadOffset = -(cameraX % 240);
  for (let x = roadOffset - 240; x < W + 240; x += 240) {
    ctx.fillStyle = markerColor; ctx.fillRect(x, 520, 92, 8);
    ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(x + 120, 636, 66, 5);
  }
}

function drawBermudaBackground(cam) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#4aa0d7"); sky.addColorStop(.55, "#8bd7e9"); sky.addColorStop(1, "#d5f1f7");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#7dc9d5"; ctx.fillRect(0, 270, W, 55);
  drawParallaxMountains(cam, "#6298ab", 285, 70, .12, 220);
  drawParallaxMountains(cam, "#4b7f93", 310, 92, .22, 260);
  for (let i = -1; i < 14; i++) {
    const x = i * 250 - (cam * .33) % 250;
    drawPalmTree(x + 40, 330, .9);
    if (i % 2 === 0) drawPalmTree(x + 160, 340, .7);
    if (i % 3 === 1) drawContainer(x + 90, 340, i % 2 ? "#a44f44" : "#3c8ab8");
    if (i % 4 === 2) drawVilla(x + 10, 348, .75);
  }
  drawGroundBase("#d4c281", "#8b9d6a", "#5f665d", "#efe7b2");
}

function drawPurgatoryBackground(cam) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#5b7fa2"); sky.addColorStop(.5, "#89a2ba"); sky.addColorStop(1, "#d9e3e9");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#6ea1bf"; ctx.fillRect(0, 300, W, 40);
  drawParallaxMountains(cam, "#536578", 282, 94, .12, 270);
  drawParallaxMountains(cam, "#435564", 325, 118, .24, 300);
  for (let i = -1; i < 16; i++) {
    const x = i * 220 - (cam * .35) % 220;
    drawPineTree(x + 40, 344, .95);
    if (i % 3 === 0) drawPineTree(x + 156, 352, .8);
  }
  for (let i = -1; i < 8; i++) {
    const x = i * 170 - (cam * .25) % 170;
    drawBridgeSegment(x + 40, 250, .9);
  }
  drawGroundBase("#7b8f7d", "#627767", "#49524d", "#d8dfd4");
}

function drawKalahariBackground(cam) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#f0b36a"); sky.addColorStop(.52, "#e6c28a"); sky.addColorStop(1, "#f2e2be");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  drawParallaxMountains(cam, "#b66f3a", 294, 80, .11, 250);
  drawParallaxMountains(cam, "#8f4d2c", 326, 118, .22, 280);
  for (let i = -1; i < 15; i++) {
    const x = i * 240 - (cam * .36) % 240;
    if (i % 2 === 0) drawCactus(x + 40, 352, .95);
    if (i % 3 === 1) drawContainer(x + 80, 338, "#8f5d37");
    if (i % 4 === 2) {
      px(x + 110, 288, 58, 52, "#6d5442");
      px(x + 116, 294, 46, 40, "#876451");
      px(x + 132, 316, 12, 18, "#2d241f");
    }
  }
  drawGroundBase("#c59a54", "#a7854b", "#6d5b41", "#ead39a");
}

function drawNexTerraBackground(cam) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#14173a"); sky.addColorStop(.52, "#243b64"); sky.addColorStop(1, "#4d76a2");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(115,219,255,.12)";
  for (let x = 0; x < W; x += 64) ctx.fillRect((x - cam * .08) % (W + 64), 0, 2, 260);
  drawParallaxMountains(cam, "#1a2854", 296, 80, .12, 250);
  for (let i = -1; i < 14; i++) {
    const x = i * 190 - (cam * .34) % 190;
    drawNeonTower(x + 30, 336, .95);
    if (i % 2 === 0) drawNeonTower(x + 112, 328, .72);
    px(x + 10, 346, 150, 6, "#4be7ff");
  }
  drawGroundBase("#5380a1", "#445a6d", "#263442", "#8df1ff");
}

function drawSolaraBackground(cam) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#7fc4ff"); sky.addColorStop(.5, "#bce4ff"); sky.addColorStop(1, "#fff1da");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#6ea7d5"; ctx.fillRect(0, 286, W, 46);
  drawParallaxMountains(cam, "#7ba388", 286, 78, .12, 250);
  drawParallaxMountains(cam, "#5d7f6e", 322, 104, .22, 280);
  for (let i = -1; i < 14; i++) {
    const x = i * 260 - (cam * .32) % 260;
    drawVilla(x + 20, 344, .9);
    drawSolarPanel(x + 130, 352, 1);
    if (i % 3 === 0) {
      px(x + 214, 250, 8, 90, "#98a3ac");
      px(x + 192, 238, 52, 8, "#dce6ef");
      px(x + 212, 246, 8, 26, "#dce6ef");
    }
  }
  drawGroundBase("#cfc694", "#8c9a70", "#6b7661", "#efeab4");
}

  function drawStaticPlayAreaEdges(cam) {
    const edges = [
      { worldX: 80, inward: 1 },
      { worldX: worldWidth - 90, inward: -1 }
    ];
    const t = performance.now() / 1000;
    for (const edge of edges) {
      const x = edge.worldX - cam;
      if (x < -70 || x > W + 70) continue;
      const pulse = .42 + .22 * Math.sin(t * 5);
      ctx.save();
      ctx.globalAlpha = .72;
      ctx.fillStyle = "#ff3d64";
      ctx.fillRect(x - 4, FLOOR_TOP, 8, H - FLOOR_TOP);
      ctx.globalAlpha = pulse;
      ctx.fillStyle = "#ff8aa0";
      ctx.fillRect(x - 13, FLOOR_TOP, 26, H - FLOOR_TOP);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(7,10,16,.86)";
      ctx.fillRect(x - 45, FLOOR_TOP + 14, 90, 25);
      ctx.fillStyle = "#ff728b";
      ctx.font = "900 11px monospace";
      ctx.textAlign = "center";
      ctx.fillText("PLAY ZONE", x, FLOOR_TOP + 31);
      for (let y = FLOOR_TOP + 72; y < FLOOR_BOTTOM; y += 72) {
        ctx.fillStyle = "#ffd0d8";
        ctx.beginPath();
        ctx.moveTo(x + edge.inward * 24, y);
        ctx.lineTo(x + edge.inward * 7, y - 10);
        ctx.lineTo(x + edge.inward * 7, y + 10);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawZoneField(foreground = false) {
    if (!zone.visible || zone.fade <= 0) return;
    const leftX = zone.left - cameraX;
    const rightX = zone.right - cameraX;
    const alpha = zone.fade;
    const t = zone.pulse;

    ctx.save();
    if (!foreground) {
      const leftWidth = clamp(leftX, 0, W);
      const rightStart = clamp(rightX, 0, W);

      if (leftWidth > 0) {
        const g = ctx.createLinearGradient(0, 0, leftWidth, 0);
        g.addColorStop(0, `rgba(106, 9, 54, ${.48 * alpha})`);
        g.addColorStop(.75, `rgba(255, 27, 86, ${.22 * alpha})`);
        g.addColorStop(1, `rgba(255, 62, 112, ${.05 * alpha})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, FLOOR_TOP, leftWidth, H - FLOOR_TOP);
      }
      if (rightStart < W) {
        const g = ctx.createLinearGradient(rightStart, 0, W, 0);
        g.addColorStop(0, `rgba(255, 62, 112, ${.05 * alpha})`);
        g.addColorStop(.25, `rgba(255, 27, 86, ${.22 * alpha})`);
        g.addColorStop(1, `rgba(106, 9, 54, ${.48 * alpha})`);
        ctx.fillStyle = g;
        ctx.fillRect(rightStart, FLOOR_TOP, W - rightStart, H - FLOOR_TOP);
      }

      ctx.globalAlpha = .18 * alpha;
      ctx.strokeStyle = "#ff6a91";
      ctx.lineWidth = 5;
      const stripeOffset = (t * 90) % 54;
      for (let x = -H + stripeOffset; x < W + H; x += 54) {
        ctx.beginPath();
        ctx.moveTo(x, H);
        ctx.lineTo(x + 180, FLOOR_TOP);
        ctx.stroke();
      }
    } else {
      drawZoneBarrier(leftX, 1, alpha, t);
      drawZoneBarrier(rightX, -1, alpha, t + .7);
    }
    ctx.restore();
  }

  function drawZoneBarrier(x, inward, alpha, t) {
    if (x < -80 || x > W + 80) return;
    const pulse = .55 + .35 * Math.sin(t * 7);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = "#ff285f";
    ctx.shadowBlur = 24 + pulse * 12;
    ctx.fillStyle = `rgba(255, 38, 91, ${.46 + pulse * .18})`;
    ctx.fillRect(x - 16, FLOOR_TOP, 32, H - FLOOR_TOP);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ff3c69";
    ctx.fillRect(x - 4, FLOOR_TOP, 8, H - FLOOR_TOP);
    ctx.fillStyle = "#ffd5df";
    ctx.fillRect(x - 1, FLOOR_TOP, 2, H - FLOOR_TOP);

    // Pixel-lightning segments make the border feel unstable and alive.
    ctx.strokeStyle = "#ffb1c3";
    ctx.lineWidth = 3;
    for (let y = FLOOR_TOP + 20; y < H; y += 48) {
      const jitter = Math.sin(t * 11 + y * .08) * 10;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + jitter, y + 15);
      ctx.lineTo(x - jitter * .55, y + 31);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(8,10,16,.88)";
    ctx.fillRect(x - 42, FLOOR_TOP + 14, 84, 26);
    ctx.fillStyle = "#ff728f";
    ctx.font = "900 11px monospace";
    ctx.textAlign = "center";
    ctx.fillText(zone.closing ? "ZONE SHRINKING" : "ZONE EDGE", x, FLOOR_TOP + 32);

    for (let y = FLOOR_TOP + 76; y < FLOOR_BOTTOM; y += 66) {
      const shift = Math.sin(t * 5 + y) * 4;
      ctx.fillStyle = "#fff1f4";
      ctx.beginPath();
      ctx.moveTo(x + inward * (28 + shift), y);
      ctx.lineTo(x + inward * 8, y - 11);
      ctx.lineTo(x + inward * 8, y + 11);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawZoneScreenWarning() {
    if (!zone.visible || !arenaLocked) return;
    const leftDistance = player.x - zone.left;
    const rightDistance = zone.right - player.x;
    const distance = Math.min(leftDistance, rightDistance);
    if (distance >= 155) return;

    const leftSide = leftDistance < rightDistance;
    const intensity = clamp(1 - distance / 155, 0, 1) * (.55 + .2 * Math.sin(zone.pulse * 8));
    const gradient = ctx.createLinearGradient(leftSide ? 0 : W, 0, leftSide ? 210 : W - 210, 0);
    gradient.addColorStop(0, `rgba(255, 28, 76, ${.42 * intensity})`);
    gradient.addColorStop(1, "rgba(255, 28, 76, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(leftSide ? 0 : W - 210, 0, 210, H);
    ctx.fillStyle = `rgba(255, 220, 227, ${.72 + intensity * .28})`;
    ctx.font = "900 13px monospace";
    ctx.textAlign = leftSide ? "left" : "right";
    ctx.fillText("⚠ PLAY ZONE EDGE", leftSide ? 28 : W - 28, H / 2);
  }

  function drawShadow(x,y,scale=1,alpha=.34) {
    ctx.globalAlpha=alpha;
    ctx.fillStyle="#000";
    ctx.beginPath(); ctx.ellipse(x,y+3,30*scale,10*scale,0,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=1;
  }


function drawEnemySprite(entity) {
  const x = entity.x - cameraX;
  const y = entity.y;
  const dir = entity.dir || 1;
  const t = performance.now() / 1000;
  const running = entity.state === "run";
  const shooting = entity.state === "shoot";
  const hitting = entity.state === "attack";
  const bob = running ? Math.sin(t * 15 + entity.id) * 3 : Math.sin(t * 4 + entity.id) * 1.2;
  const legSwing = running ? Math.sin(t * 15 + entity.id) * 9 : 0;
  const recoil = (shooting || hitting) ? Math.max(0, 1 - entity.stateTime * 7) : 0;
  const flashHit = entity.state === "hit" && Math.floor(entity.stateTime * 22) % 2 === 0;
  const scale = entity.size;
  const col = (base, alt = "#fff") => flashHit ? alt : base;

  drawShadow(x, y, scale * 1.1, .34);
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y + bob));
  ctx.scale(dir * scale, scale);
  ctx.globalAlpha = entity.dead ? clamp(1 - entity.stateTime / 1.5, 0, 1) : 1;

  const r = (x, y, w, h, color) => px(x, y, w, h, col(color));

  const base = {
    thug: { hair:"#1c1b20", skin:"#b67d63", coat:"#6c46a8", coat2:"#8a64c9", trim:"#d0c1ff", pants:"#171a21" },
    gunner: { hair:"#11181b", skin:"#af775a", coat:"#2c7d63", coat2:"#44a183", trim:"#baf8dc", pants:"#182025" },
    brute: { hair:"#17181d", skin:"#ab755d", coat:"#7e4330", coat2:"#a65c44", trim:"#ffb67a", pants:"#1b1d23" },
    boss: { hair:"#10131a", skin:"#c58e70", coat:"#27344f", coat2:"#34486c", trim:"#ff4a68", pants:"#171b22" }
  }[entity.type];

  // Legs
  r(-18 + legSwing * .4, -42, 14, 38, base.pants); r(-19 + legSwing * .55, -8, 17, 8, "#11161b");
  r(4 - legSwing * .4, -42, 14, 38, base.pants); r(3 - legSwing * .55, -8, 18, 8, "#11161b");

  // Torso and armor
  r(-23, -88, 46, 48, base.coat); r(-19, -84, 38, 40, base.coat2);
  r(-23, -84, 8, 34, entity.type === "thug" ? "#22182f" : entity.type === "gunner" ? "#1b3a33" : entity.type === "brute" ? "#5a2c22" : "#192135");
  r(15, -84, 8, 34, base.trim);
  r(-8, -82, 16, 34, entity.type === "gunner" ? "#d7efe4" : entity.type === "boss" ? "#d9e1ef" : "#efe2d6");
  r(-2, -80, 4, 28, entity.type === "boss" ? "#ff4a68" : "#252a31");

  // Head
  r(-9, -100, 18, 12, base.skin); r(-16, -128, 32, 30, base.skin); r(-19, -135, 38, 12, base.hair);
  r(-21, -130, 10, 21, base.hair); r(9, -129, 10, 18, base.hair);
  r(-10, -118, 4, 3, entity.type === "boss" ? "#ff6b80" : "#1b1b1f"); r(6, -118, 4, 3, entity.type === "gunner" ? "#9ff7dc" : "#1b1b1f");

  if (entity.type === "thug") {
    r(-14, -108, 28, 6, "#1b1820");
    r(-6, -100, 12, 6, "#d0c1ff");
  } else if (entity.type === "gunner") {
    r(-18, -108, 36, 7, "#16372d");
    r(-12, -102, 24, 6, "#93f2c8");
    r(-14, -54, 28, 6, "#1a2b25");
  } else if (entity.type === "brute") {
    r(-28, -90, 14, 24, "#ffb67a"); r(14, -90, 14, 24, "#ffb67a");
    r(-31, -86, 20, 8, "#5c241a"); r(11, -86, 20, 8, "#5c241a");
    r(-22, -50, 44, 8, "#12161c");
  } else if (entity.type === "boss") {
    r(-30, -96, 18, 32, "#ff4a68"); r(12, -96, 18, 32, "#ff4a68");
    r(-26, -90, 10, 20, "#2a334b"); r(16, -90, 10, 20, "#2a334b");
    r(-10, -108, 20, 8, "#2a334b");
    r(-4, -56, 8, 12, "#ff4a68");
  }

  // Arms and weapons
  const frontArm = 14 + recoil * 7;
  const backArm = -25;
  r(backArm, -87, 11, 38, entity.type === "brute" || entity.type === "boss" ? base.coat2 : base.skin);
  r(backArm + 1, -61, 10, 12, base.skin);
  r(frontArm, -87, 11, 38, entity.type === "brute" ? base.coat2 : base.skin);
  r(frontArm, -61, 10, 12, base.skin);

  if (entity.type === "gunner" || entity.type === "boss") {
    r(frontArm + 2, -74, 30, 9, "#232c36");
    r(frontArm + 24, -76, 18, 5, entity.type === "boss" ? "#ff4a68" : "#7ef2b4");
    r(frontArm + 11, -66, 6, 12, "#11161b");
    if (shooting && entity.stateTime < .09) {
      r(frontArm + 41, -79, 10, 10, "#fff1a0");
      r(frontArm + 50, -76, 8, 5, "#ff8e43");
    }
  } else {
    r(frontArm + 4, -61, 14, 10, base.trim);
    r(frontArm + 13, -57, 12, 7, "#171c21");
    r(frontArm + 21, -53, 9, 5, "#ffd7ad");
  }

  ctx.restore();
}

  function drawSurvivorBody(g, entity, character, portrait=false) {
    const pal=CHARACTER_DATA[character].palette;
    const t=performance.now()/1000;
    const running=entity.state==="run";
    const shooting=entity.state==="shoot";
    const hit=entity.state==="hit";
    const bob=portrait?0:(running?Math.sin(t*15+(entity.id||0))*3:Math.sin(t*4+(entity.id||0))*1.1);
    const legSwing=portrait?0:(running?Math.sin(t*15+(entity.id||0))*10:0);
    const armSwing=portrait?0:-legSwing*.55;
    const recoil=shooting?Math.max(0,1-(entity.stateTime||0)*9):0;
    const flashHit=hit&&Math.floor((entity.stateTime||0)*22)%2===0;
    const col=(color)=>flashHit?"#ffffff":color;
    const r=(x,y,w,h,color)=>{g.fillStyle=col(color);g.fillRect(Math.round(x),Math.round(y+bob),Math.round(w),Math.round(h));};

    // Legs and shoes, with deliberately higher-resolution pixel clusters.
    r(-16+legSwing*.35,-45,13,43,pal.legs);
    r(-18+legSwing*.50,-12,17,12,pal.shoe||pal.trim);
    r(3-legSwing*.35,-45,13,43,pal.legs);
    r(1-legSwing*.50,-12,18,12,pal.shoe||pal.trim);

    if(character==="kelly") {
      // Bright yellow track pants and white racing stripes.
      r(-16+legSwing*.35,-45,13,43,"#e7bc16");
      r(3-legSwing*.35,-45,13,43,"#f1c924");
      r(-15+legSwing*.35,-44,3,39,"#f5f5ee");
      r(12-legSwing*.35,-44,3,39,"#f5f5ee");
      r(-19+legSwing*.50,-10,18,10,"#f2f4f6");
      r(1-legSwing*.50,-10,19,10,"#f2f4f6");
    } else if(character==="tatsuya") {
      r(-16+legSwing*.35,-45,13,43,"#303238");
      r(3-legSwing*.35,-45,13,43,"#272a30");
      r(-14+legSwing*.35,-44,3,29,"#b71f37");
      r(12-legSwing*.35,-44,3,29,"#b71f37");
      r(4-legSwing*.35,-32,13,12,"#13171d");
      r(-19+legSwing*.50,-10,18,10,"#ac263a");
      r(1-legSwing*.50,-10,19,10,"#ac263a");
      r(-16+legSwing*.50,-7,12,4,"#65727c");
      r(4-legSwing*.50,-7,12,4,"#65727c");
    } else if(character==="orion") {
      r(-16+legSwing*.35,-45,13,43,"#17191d");
      r(3-legSwing*.35,-45,13,43,"#1c1e22");
      r(-13+legSwing*.35,-29,8,5,"#4d5055");
      r(6-legSwing*.35,-29,8,5,"#4d5055");
      r(-15+legSwing*.35,-31,4,4,"#a9283c");
      r(11-legSwing*.35,-31,4,4,"#a9283c");
      r(-19+legSwing*.50,-10,18,10,"#25282e");
      r(1-legSwing*.50,-10,19,10,"#25282e");
    } else if(character==="hayato") {
      r(-16+legSwing*.35,-45,13,43,"#2b2728");
      r(3-legSwing*.35,-45,13,43,"#302a2b");
      r(9-legSwing*.35,-42,5,25,"#b83231");
      r(11-legSwing*.35,-37,4,4,"#ee8a28");
      r(11-legSwing*.35,-27,4,4,"#ee8a28");
      r(-19+legSwing*.50,-10,18,10,"#191d23");
      r(1-legSwing*.50,-10,19,10,"#191d23");
    }

    // Torso and costume silhouette.
    if(character==="kelly") {
      r(-22,-91,44,44,"#e8bd13");
      r(-17,-85,34,36,"#f3c926");
      r(-8,-84,16,31,"#f5f5ef");
      r(-3,-85,6,35,"#252a31");
      r(-22,-86,6,30,"#20262e");
      r(16,-86,6,30,"#20262e");
      r(-17,-52,34,7,"#b88e08");
    } else if(character==="tatsuya") {
      // Long red striped coat, teal lapels, white vest and lightning pendant.
      r(-26,-94,52,52,"#a31834");
      r(-24,-90,10,67,"#c3233e");
      r(14,-90,10,67,"#c3233e");
      r(-14,-91,28,46,"#f0eee5");
      r(-18,-91,7,52,"#527f83");
      r(11,-91,7,52,"#527f83");
      r(-22,-84,5,45,"#25272b");
      r(17,-84,5,45,"#25272b");
      r(-3,-85,6,22,"#e7d05b");
      r(-1,-63,4,8,"#f5b42b");
      r(-22,-40,10,17,"#9e1730");
      r(12,-40,10,17,"#9e1730");
    } else if(character==="orion") {
      // Bare torso, crimson right shoulder and asymmetric armored arm.
      r(-18,-91,36,43,pal.skin);
      r(-15,-88,5,31,"#a86e55");
      r(10,-88,5,31,"#a86e55");
      r(-18,-52,36,8,"#171a20");
      r(-17,-51,5,6,"#ae263a");
      r(8,-51,5,6,"#ae263a");
      r(12,-96,22,20,"#2a2d32");
      r(17,-92,14,14,"#b3263c");
      r(22,-87,10,5,"#ef4057");
      r(-10,-82,20,3,"#b77f62");
      r(-8,-70,16,3,"#b77f62");
      r(-6,-58,12,3,"#b77f62");
    } else if(character==="hayato") {
      // Brown studded jacket, black shirt and red armored shoulder.
      r(-23,-94,46,48,"#3f302b");
      r(-17,-91,34,43,"#14171c");
      r(-23,-91,10,40,"#4f3930");
      r(13,-94,14,43,"#8f312e");
      r(16,-93,12,15,"#c3762b");
      r(19,-88,8,5,"#f0a13c");
      r(-19,-86,4,4,"#c9c4b7");
      r(-19,-74,4,4,"#c9c4b7");
      r(-19,-62,4,4,"#c9c4b7");
      r(-5,-82,10,4,"#24282d");
    }

    // Neck and head.
    r(-9,-101,18,12,pal.skin);
    r(-15,-128,30,31,pal.skin);
    r(-13,-106,26,5,"#9d6651");

    if(character==="kelly") {
      // Straight bob, blunt bangs and black choker.
      r(-18,-136,36,13,"#33231f");
      r(-19,-130,8,29,"#33231f");
      r(11,-130,8,29,"#33231f");
      r(-14,-126,28,7,"#3d2923");
      r(-10,-117,4,3,"#252025");
      r(6,-117,4,3,"#252025");
      r(-10,-98,20,4,"#17191d");
      r(-7,-97,3,3,"#b8b8b8");
      r(4,-97,3,3,"#b8b8b8");
    } else if(character==="tatsuya") {
      // Swept medium hair with longer nape.
      r(-18,-136,33,11,"#282522");
      r(-20,-131,12,21,"#282522");
      r(8,-134,12,18,"#282522");
      r(-16,-139,10,8,"#5d4e3d");
      r(-4,-141,12,9,"#5d4e3d");
      r(-18,-111,6,13,"#282522");
      r(-9,-118,4,3,"#242027");
      r(6,-118,4,3,"#242027");
    } else if(character==="orion") {
      // Wavy black hair and glowing crimson eye.
      r(-19,-137,35,12,"#18191c");
      r(-21,-132,10,21,"#18191c");
      r(8,-134,12,18,"#18191c");
      r(-14,-141,10,7,"#25262a");
      r(-2,-143,11,8,"#25262a");
      r(-8,-119,4,3,"#282027");
      r(6,-119,5,4,"#ff304c");
      r(8,-118,2,2,"#fff0f2");
    } else if(character==="hayato") {
      // Black tied hair with the iconic white front streak.
      r(-18,-137,36,12,"#242225");
      r(-20,-132,10,22,"#242225");
      r(10,-132,9,18,"#242225");
      r(-9,-140,8,24,"#e7e6e1");
      r(18,-130,13,9,"#242225");
      r(26,-128,8,8,"#242225");
      r(-8,-119,4,3,"#242027");
      r(6,-119,4,3,"#242027");
    }

    // Arms, with asymmetry for recognizable costumes.
    const frontArmX=14+recoil*7;
    const backArmX=-25-armSwing*.25;
    if(character==="orion") {
      r(backArmX,-88,10,35,pal.skin);
      r(backArmX-2,-61,13,24,"#1e2228");
      r(frontArmX,-91,14,43,"#272a30");
      r(frontArmX+3,-87,10,10,"#b4263c");
      r(frontArmX+3,-73,9,20,"#8f2136");
      r(frontArmX+6,-58,10,11,"#e1374e");
    } else if(character==="hayato") {
      r(backArmX,-88,11,39,"#7b2929");
      r(backArmX-1,-61,12,13,"#1b1f25");
      r(frontArmX,-91,14,42,"#9b302f");
      r(frontArmX+3,-86,10,28,"#c04736");
      r(frontArmX+5,-57,10,10,"#e06a35");
    } else {
      r(backArmX,-88,11,39,character==="kelly"?"#e8bd13":character==="tatsuya"?"#a61b35":pal.skin);
      r(backArmX+1,-61,10,13,pal.skin);
      r(frontArmX,-88,11,39,character==="kelly"?"#e8bd13":character==="tatsuya"?"#a61b35":pal.skin);
      r(frontArmX,-61,10,13,pal.skin);
      if(character==="tatsuya") {
        r(backArmX+1,-79,9,4,"#536f77");
        r(backArmX+1,-73,9,4,"#d24a46");
        r(backArmX+1,-67,9,4,"#1d252b");
      }
    }

    // Shared gun, scaled up with several pixel clusters.
    const gunX=frontArmX+2;
    r(gunX,-75,30,9,"#27313a");
    r(gunX+24,-77,17,5,"#151a20");
    r(gunX+35,-76,9,3,"#83e5ef");
    r(gunX+9,-67,7,12,"#151a20");
    r(gunX+2,-78,9,3,"#697780");
    if(shooting && (entity.stateTime||0)<.09) {
      r(gunX+44,-81,11,12,"#fff3a0");
      r(gunX+53,-78,9,6,"#ff9840");
    }

    // Hayato sheath and small costume accents.
    if(character==="hayato") {
      r(-30,-84,5,72,"#11171e");
      r(-32,-25,9,6,"#d68b2f");
      r(-7,-72,5,5,"#d0d0cb");
      r(2,-72,5,5,"#d0d0cb");
    }
    if(character==="kelly") {
      r(-29,-82,6,18,"#f4f4ee");
      r(-28,-78,4,3,"#181b20");
      r(-28,-71,4,3,"#181b20");
    }

    // Skill effects.
    if(character==="orion" && entity.crushTimer>0) {
      g.globalAlpha=.35+.2*Math.sin(t*18);
      g.strokeStyle="#ff254d";g.lineWidth=4;
      g.beginPath();g.arc(0,-66,52+Math.sin(t*9)*5,0,Math.PI*2);g.stroke();
      g.globalAlpha=1;
    }
    if(character==="hayato" && entity.guardTimer>0) {
      g.globalAlpha=.48;g.strokeStyle="#ffb35d";g.lineWidth=4;
      g.strokeRect(-34,-144,68,144);g.globalAlpha=1;
    }
  }

  function drawPixelFighter(entity, isPlayer=true, portrait=false) {
    if(!isPlayer) return drawEnemySprite(entity);
    const x=entity.x-(portrait?0:cameraX);
    const y=entity.y;
    const dir=entity.dir||1;
    const scale=portrait?1:1.04;
    if(!portrait) drawShadow(x,y,1.13,.36);
    ctx.save();
    ctx.translate(Math.round(x),Math.round(y));
    ctx.scale(dir*scale,scale);
    ctx.globalAlpha=entity.dead?clamp(1-entity.stateTime/1.5,0,1):1;
    drawSurvivorBody(ctx,entity,entity.character,portrait);
    if(entity.invuln>0 && Math.floor(entity.invuln*18)%2===0) ctx.globalAlpha=.55;
    ctx.restore();
  }

  function drawPortrait(canvasEl, character) {
    const c=canvasEl.getContext("2d");
    c.imageSmoothingEnabled=false;
    c.clearRect(0,0,canvasEl.width,canvasEl.height);
    const g=c.createLinearGradient(0,0,0,canvasEl.height);
    g.addColorStop(0,"#253a52");g.addColorStop(1,"#09111b");
    c.fillStyle=g;c.fillRect(0,0,canvasEl.width,canvasEl.height);
    c.fillStyle="rgba(82,231,255,.10)";
    for(let x=0;x<canvasEl.width;x+=16)c.fillRect(x,0,1,canvasEl.height);
    for(let y=0;y<canvasEl.height;y+=16)c.fillRect(0,y,canvasEl.width,1);
    c.save();
    c.translate(60,116);
    c.scale(.76,.76);
    const preview={id:0,character,state:"idle",stateTime:0,dir:1,crushTimer:character==="orion"?.2:0,guardTimer:0};
    drawSurvivorBody(c,preview,character,true);
    c.restore();
    c.fillStyle="rgba(255,255,255,.08)";c.fillRect(0,0,120,5);
  }

  function drawWalls() {
    for(const w of walls) {
      const x=w.x-cameraX;
      if(x<-100||x>W+100) continue;
      const s=w.grow;
      const height=155*s, width=68*s;
      ctx.save();
      ctx.translate(Math.round(x),Math.round(w.y));
      ctx.globalAlpha=.93;
      ctx.fillStyle=w.hit>0?"#ffffff":"#77dce8";
      // pixel ice silhouette
      px(-width/2,-height,width,height*.85,ctx.fillStyle);
      px(-width*.65,-height*.78,width*1.3,height*.58,ctx.fillStyle);
      px(-width*.52,-height*.98,width*.34,height*.25,"#bffaff");
      px(width*.18,-height*.94,width*.28,height*.22,"#bffaff");
      px(-width*.56,-height*.68,width*.22,height*.46,"#d6fcff");
      px(width*.24,-height*.66,width*.18,height*.42,"#b5f4ff");
      px(-width*.14,-height*.8,width*.24,height*.7,"#5cc3d1");
      ctx.globalAlpha=.6;
      px(-width*.55,-height*.48,width*1.05,5,"#ffffff");
      ctx.globalAlpha=1;
      // hp line
      px(-34,-height-14,68,5,"#16232b");
      px(-34,-height-14,68*clamp(w.hp/w.maxHp,0,1),5,"#8ef4ff");
      ctx.restore();
    }
  }


function drawProjectiles() {
  for (const p of projectiles) {
    const x = p.x - cameraX;
    if (p.type === "bullet") {
      ctx.save();
      ctx.strokeStyle = p.color; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x - p.vx * .035, p.y - p.vy * .035); ctx.lineTo(x, p.y); ctx.stroke();
      ctx.fillStyle = "#fff1c2"; ctx.fillRect(x - 3, p.y - 3, 6, 6);
      ctx.restore();
    } else {
      ctx.save();
      ctx.translate(x, p.y);
      ctx.globalAlpha = clamp(p.life / .2, 0, 1);
      px(-28, -6, 36, 12, p.color);
      px(8, -4, 12, 8, "#dffbff");
      px(-35, -2, 8, 4, "#ffffff");
      px(-42, -1, 7, 2, "#b0effa");
      ctx.restore();
    }
  }
}

  function drawPickups() {
    for(const p of pickups) {
      const x=p.x-cameraX, y=p.y-18+Math.sin(p.bob)*5;
      drawShadow(x,p.y,.65,.28);
      px(x-16,y-16,32,32,p.type==="heal"?"#bd3545":"#4ec7d6");
      px(x-12,y-12,24,24,p.type==="heal"?"#e34f5f":"#77eaf4");
      if(p.type==="heal"){px(x-4,y-10,8,20,"#fff");px(x-10,y-4,20,8,"#fff");}
      else {px(x-8,y-10,16,20,"#d9fcff");px(x-11,y-2,22,5,"#a4eff7");}
    }
  }

  function drawParticles() {
    for(const p of particles) {
      ctx.globalAlpha=p.alpha;
      px(p.x-cameraX,p.y,p.size,p.size,p.color);
    }
    ctx.globalAlpha=1;
    for(const f of floatingTexts) {
      ctx.globalAlpha=clamp(f.life/f.maxLife,0,1);
      ctx.fillStyle=f.color;
      ctx.font="900 20px monospace";
      ctx.textAlign="center";
      ctx.fillText(f.text,f.x-cameraX,f.y);
    }
    ctx.globalAlpha=1;
  }



function drawHUD() {
    const d = CHARACTER_DATA[player.character];
    const leftPanelW = 436;
    const rightPanelX = W - 404;
    const rightTextX = W - 76;
    ctx.fillStyle = "rgba(5,10,16,.84)"; ctx.fillRect(20, 18, leftPanelW, 104);
    ctx.strokeStyle = "#41546a"; ctx.lineWidth = 2; ctx.strokeRect(20, 18, leftPanelW, 104);

    const portraitSource = document.querySelector(`[data-portrait="${player.character}"]`);
    if (portraitSource) {
      ctx.drawImage(portraitSource, 31, 29, 64, 80);
      ctx.strokeStyle = "rgba(255,255,255,.12)";
      ctx.strokeRect(31, 29, 64, 80);
    }

    ctx.fillStyle = "#fff"; ctx.font = "900 23px monospace"; ctx.textAlign = "left"; ctx.fillText(d.name, 108, 45);
    ctx.fillStyle = "#9fc4e0"; ctx.font = "700 11px monospace"; ctx.fillText(currentLevel ? currentLevel.name.toUpperCase() : "", 108, 58);
    const waveText = arenaLocked && activeArena >= 0 ? `WAVE ${activeArena + 1}/${arenas.length}` : `WAVES CLEARED ${arenas.filter(a => a.cleared).length}/${arenas.length}`;
    ctx.fillStyle = "#ffd574"; ctx.fillText(waveText, 300, 58);
    ctx.fillStyle = "#231219"; ctx.fillRect(108, 66, 314, 19);
    ctx.fillStyle = player.hp / player.maxHp < .3 ? "#ff3b55" : "#4ce39a"; ctx.fillRect(108, 66, 314 * (player.hp / player.maxHp), 19);
    ctx.fillStyle = "#fff"; ctx.font = "900 12px monospace"; ctx.fillText(`HP ${Math.ceil(player.hp)} / ${player.maxHp}`, 116, 80);
    ctx.fillStyle = "#141d28"; ctx.fillRect(108, 92, 206, 22);
    ctx.fillStyle = "#183528"; ctx.fillRect(320, 92, 102, 22);
    ctx.fillStyle = "#d9e5ef"; ctx.font = "700 10px monospace";
    const sig = player.character === "tatsuya"
      ? `K ${d.signature} ${player.rebelCharges}/2`
      : `K ${d.signature} ${player.skillCooldown > 0 ? player.skillCooldown.toFixed(1) : "READY"}`;
    ctx.fillText(sig.slice(0, 30), 114, 107);
    ctx.fillStyle = "#91f1b3"; ctx.fillText(`I MED x${player.medkits}`, 327, 107);

    ctx.fillStyle = "rgba(5,10,16,.84)"; ctx.fillRect(rightPanelX, 18, 328, 104);
    ctx.strokeStyle = "#41546a"; ctx.strokeRect(rightPanelX, 18, 328, 104);
    ctx.textAlign = "right";
    ctx.fillStyle = "#fff"; ctx.font = "900 20px monospace"; ctx.fillText(score.toString().padStart(7, "0"), rightTextX, 42);
    ctx.fillStyle = "#9fb0c2"; ctx.font = "700 11px monospace"; ctx.fillText(`${defeated} KOs · ${formatTime(elapsed)}`, rightTextX, 58);
    ctx.fillStyle = "#ffd574"; ctx.fillText(`MAP ${currentLevelIndex + 1}/5 · ${currentLevel ? currentLevel.short.toUpperCase() : ""}`, rightTextX, 74);
    ctx.fillStyle = "#9fb0c2"; ctx.fillText(`DIFF x${getDifficultyScale(arenas.filter(a => a.cleared).length).toFixed(2)}`, rightTextX, 86);
    ctx.fillStyle = "#8df1ff"; ctx.fillText(`L GLOO ${"◆".repeat(player.gloo)}${"◇".repeat(player.glooMax - player.gloo)}`, rightTextX, 98);
    ctx.fillStyle = "#d7ecff"; ctx.fillText(`J GUN · K SKILL`, rightTextX, 112);

    if (combo > 1 && comboTimer > 0) {
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff"; ctx.font = "900 25px monospace"; ctx.fillText(`${combo} HIT COMBO`, W / 2, 53);
      ctx.fillStyle = "#ffcb42"; ctx.font = "900 12px monospace"; ctx.fillText(`+${Math.round(combo * 1.5)} STYLE`, W / 2, 72);
    }

    if (arenaLocked && activeArena >= 0) {
      const alive = enemies.filter(e => !e.dead).length;
      const zoneSeconds = Math.max(0, Math.ceil(zone.duration * (1 - zone.progress)));
      const zoneStatus = zone.closing ? `ZONE SHRINKING · ${zoneSeconds}s` : "PLAY ZONE LOCKED";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(5,10,16,.86)"; ctx.fillRect(W / 2 - 160, H - 96, 320, 30);
      ctx.fillStyle = "#ff6b87"; ctx.font = "900 12px monospace"; ctx.fillText(zoneStatus, W / 2, H - 77);
      ctx.fillStyle = "#32131d"; ctx.fillRect(W / 2 - 142, H - 70, 284, 5);
      ctx.fillStyle = "#ff3e68"; ctx.fillRect(W / 2 - 142, H - 70, 284 * clamp(zone.progress, 0, 1), 5);
      ctx.fillStyle = "rgba(5,10,16,.82)"; ctx.fillRect(W / 2 - 180, H - 58, 360, 34);
      ctx.fillStyle = "#ff9caf"; ctx.font = "900 14px monospace"; ctx.fillText(`${arenas[activeArena].label} · ${alive} REMAIN`, W / 2, H - 36);
    }

    const boss = enemies.find(e => e.type === "boss" && !e.dead);
    if (boss) {
      ctx.fillStyle = "rgba(5,10,16,.88)"; ctx.fillRect(W / 2 - 280, 126, 560, 36);
      ctx.fillStyle = "#33131c"; ctx.fillRect(W / 2 - 260, 143, 520, 10);
      ctx.fillStyle = "#ff425e"; ctx.fillRect(W / 2 - 260, 143, 520 * (boss.hp / boss.maxHp), 10);
      ctx.textAlign = "center"; ctx.fillStyle = "#fff"; ctx.font = "900 13px monospace"; ctx.fillText(`${currentLevel ? currentLevel.short.toUpperCase() : ""} FINAL BOSS`, W / 2, 139);
    }
  }


  function render() {
    const sx=shake?rand(-shake,shake):0, sy=shake?rand(-shake*.45,shake*.45):0;
    ctx.save();ctx.translate(sx,sy);
    drawBackground();
    drawZoneField(false);

    // depth-sort world entities
    const drawables=[];
    for(const w of walls) drawables.push({y:w.y-2, kind:"wall", obj:w});
    for(const p of pickups) drawables.push({y:p.y,kind:"pickup",obj:p});
    for(const e of enemies) drawables.push({y:e.y,kind:"enemy",obj:e});
    drawables.push({y:player.y,kind:"player",obj:player});
    drawables.sort((a,b)=>a.y-b.y);
    for(const d of drawables) {
      if(d.kind==="wall") {
        const arr=walls; const only=d.obj;
        const original=walls; walls=[only]; drawWalls(); walls=original;
      } else if(d.kind==="pickup") {
        const original=pickups; pickups=[d.obj]; drawPickups(); pickups=original;
      } else if(d.kind==="enemy") drawPixelFighter(d.obj,false);
      else drawPixelFighter(d.obj,true);
    }

    drawProjectiles();
    drawParticles();
    drawZoneField(true);
    ctx.restore();

    drawHUD();
    drawZoneScreenWarning();
    if(flash>0){ctx.globalAlpha=flash*4;ctx.fillStyle="#ff334f";ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;}
  }

  function loop(now) {
    const dt=Math.min(.033,(now-lastTime)/1000);
    lastTime=now;
    if(state==="playing") update(dt);
    if(state!=="menu") render();
    else drawMenuBackdrop();
    requestAnimationFrame(loop);
  }

  function drawMenuBackdrop() {
    if(!player) resetGame();
    cameraX=(performance.now()*.035)%Math.max(1,(worldWidth-W));
    drawBackground();
    const demo=[
      {id:91,character:"kelly",x:cameraX+420,y:535,dir:1,state:"run",stateTime:0},
      {id:92,character:"tatsuya",x:cameraX+540,y:505,dir:1,state:"idle",stateTime:0},
      {id:93,character:"orion",x:cameraX+660,y:560,dir:1,state:"idle",stateTime:0,crushTimer:1},
      {id:94,character:"hayato",x:cameraX+780,y:520,dir:1,state:"idle",stateTime:0,guardTimer:1}
    ];
    demo.forEach(d=>drawPixelFighter(d,true));
    ctx.fillStyle="rgba(3,7,12,.32)";ctx.fillRect(0,0,W,H);
  }

  window.addEventListener("keydown",e=>{
    if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code)) e.preventDefault();
    if(!keys[e.code]) pressed[e.code]=true;
    keys[e.code]=true;
    if((e.code==="Escape"||e.code==="KeyP") && (state==="playing"||state==="paused")) pauseGame(true);
  });
  window.addEventListener("keyup",e=>{keys[e.code]=false;});


  const joystickZone = document.getElementById("joystickZone");
  const floatingJoystick = document.getElementById("floatingJoystick");
  const joystickKnob = document.getElementById("joystickKnob");
  const joystick = {
    pointerId: null,
    centerX: 0,
    centerY: 0,
    radius: 42
  };

  function resetJoystick() {
    joystick.pointerId = null;
    touchState.joyX = 0;
    touchState.joyY = 0;
    if (joystickKnob) joystickKnob.style.transform = "translate(-50%, -50%)";
    if (floatingJoystick) floatingJoystick.classList.remove("visible");
    if (joystickZone) joystickZone.classList.remove("active");
  }

  function moveJoystick(clientX, clientY) {
    const dx = clientX - joystick.centerX;
    const dy = clientY - joystick.centerY;
    const distance = Math.hypot(dx, dy);
    const limited = Math.min(joystick.radius, distance);
    const angle = Math.atan2(dy, dx);
    const knobX = Math.cos(angle) * limited;
    const knobY = Math.sin(angle) * limited;
    const deadZone = .14;
    const rawMagnitude = Math.min(1, distance / joystick.radius);
    const magnitude = rawMagnitude <= deadZone ? 0 : (rawMagnitude - deadZone) / (1 - deadZone);
    touchState.joyX = distance ? Math.cos(angle) * magnitude : 0;
    touchState.joyY = distance ? Math.sin(angle) * magnitude : 0;
    joystickKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
  }

  if (joystickZone && floatingJoystick && joystickKnob) {
    joystickZone.addEventListener("pointerdown", event => {
      if (state !== "playing" || joystick.pointerId !== null) return;
      event.preventDefault();
      ensureAudio();
      joystick.pointerId = event.pointerId;
      joystickZone.setPointerCapture?.(event.pointerId);
      const zoneRect = joystickZone.getBoundingClientRect();
      joystick.centerX = event.clientX;
      joystick.centerY = event.clientY;
      floatingJoystick.style.left = `${event.clientX - zoneRect.left}px`;
      floatingJoystick.style.top = `${event.clientY - zoneRect.top}px`;
      floatingJoystick.classList.add("visible");
      joystickZone.classList.add("active");
      moveJoystick(event.clientX, event.clientY);
    });

    joystickZone.addEventListener("pointermove", event => {
      if (event.pointerId !== joystick.pointerId) return;
      event.preventDefault();
      moveJoystick(event.clientX, event.clientY);
    });

    ["pointerup", "pointercancel", "lostpointercapture"].forEach(type => {
      joystickZone.addEventListener(type, event => {
        if (joystick.pointerId !== null && event.pointerId !== undefined && event.pointerId !== joystick.pointerId) return;
        resetJoystick();
      });
    });
  }

  document.querySelectorAll("[data-touch]").forEach(btn=>{
    const name=btn.dataset.touch;
    const start=e=>{
      e.preventDefault(); ensureAudio();
      btn.classList.add("pressed");
      if(["left","right","up","down"].includes(name)) touchState[name]=true;
      else touchState[`${name}Press`]=true;
    };
    const end=e=>{
      e.preventDefault();
      btn.classList.remove("pressed");
      if(["left","right","up","down"].includes(name)) touchState[name]=false;
    };
    btn.addEventListener("pointerdown",start);
    btn.addEventListener("pointerup",end);
    btn.addEventListener("pointercancel",end);
    btn.addEventListener("pointerleave",end);
  });

  document.querySelectorAll(".fighter").forEach(btn=>{
    btn.addEventListener("click",()=>{
      selectedCharacter=btn.dataset.character;
      document.querySelectorAll(".fighter").forEach(x=>x.classList.toggle("selected",x===btn));
      ui.selectedDescription.innerHTML=CHARACTER_DATA[selectedCharacter].description;
      beep(230,.05,"square",.025,60);
    });
  });

  function exitToDataCenter() {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: "gloo-rush-exit" }, "*");
        return;
      }
    } catch (error) {}
    window.location.href = "../../index.html";
  }

  if (ui.exitDataCenterButton) ui.exitDataCenterButton.addEventListener("click", exitToDataCenter);

  ui.startButton.addEventListener("click",startGame);
  ui.gameOverSaveButton.addEventListener("click", () => { void handleSaveScore("gameover"); });
  ui.victorySaveButton.addEventListener("click", () => { void handleSaveScore("victory"); });
  [ui.gameOverInitials, ui.victoryInitials].forEach((input) => {
    if (!input) return;
    input.addEventListener("input", () => { input.value = sanitizeInitials(input.value); });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") void handleSaveScore(input === ui.victoryInitials ? "victory" : "gameover");
    });
  });
  ui.resumeButton.addEventListener("click",()=>pauseGame(false));
  ui.pauseRestartButton.addEventListener("click",startGame);
  ui.pauseChangeButton.addEventListener("click",showCharacterSelect);
  ui.restartButton.addEventListener("click",startGame);
  ui.gameOverChangeButton.addEventListener("click",showCharacterSelect);
  ui.replayButton.addEventListener("click",startGame);
  ui.victoryChangeButton.addEventListener("click",showCharacterSelect);
  ui.soundButton.addEventListener("click",()=>{
    soundEnabled=!soundEnabled;
    ui.soundButton.textContent=`SOUND: ${soundEnabled?"ON":"OFF"}`;
    if(soundEnabled) beep(260,.06,"square",.03,80);
  });
  ui.fullscreenButton.addEventListener("click",async()=>{
    try {
      if(!document.fullscreenElement) {
        await document.querySelector(".game-frame").requestFullscreen();
        if(screen.orientation?.lock) screen.orientation.lock("landscape").catch(()=>{});
      } else await document.exitFullscreen();
    } catch(err) {
      showToast("FULLSCREEN NOT AVAILABLE");
    }
  });

  document.addEventListener("visibilitychange",()=>{
    if(document.hidden && state==="playing") pauseGame(true);
  });

  // Initial UI and portraits
  document.body.classList.remove("game-running");
  ui.selectedDescription.innerHTML=CHARACTER_DATA[selectedCharacter].description;
  document.querySelectorAll("[data-portrait]").forEach(el=>drawPortrait(el,el.dataset.portrait));
  resetGame();
  requestAnimationFrame(loop);
})();
