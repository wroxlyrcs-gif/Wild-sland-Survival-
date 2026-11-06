/* ============================================================
   WILD ISLAND: SURVIVAL — GAME.JS
   Complete Gameplay Controller
   Three.js | Android | Desktop
   ============================================================ */

(() => {
"use strict";

const WI = window.WI = window.WI || {};
const $ = id => document.getElementById(id);
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const smooth = (r,dt) => 1-Math.exp(-r*dt);

const THREE = window.THREE;

if (!THREE) {
  window.showGameError?.("Three.js yüklənmədi!");
  return;
}

if (WI.__gameStarted) return;
WI.__gameStarted = true;

const CONFIG = {
  WALK_SPEED: 4.2,
  RUN_SPEED: 7.2,
  JUMP_POWER: 6.2,
  GRAVITY: 19,
  WORLD_LIMIT: 97,
  RESOURCE_DISTANCE: 3.5,
  DAY_LENGTH: 360,
  SAVE_KEY: "wild_island_save_v1",
  SETTINGS_KEY: "wild_island_settings_v1"
};

const state = {
  mode: "menu",
  paused: false,
  dead: false,

  elapsed: 0,
  day: 0.25,
  dayCount: 1,

  health: 100,
  food: 100,
  water: 100,
  energy: 100,

  inventory: {
    Wood: 0,
    Stone: 0,
    Fiber: 0,
    Berries: 0,
    Banana: 0,
    Coconut: 0
  },

  player: {
    x: 0,
    y: 0,
    z: 10,
    vy: 0,
    grounded: true
  },

  movement: {
    x: 0,
    y: 0,
    sprint: false
  },

  velocity: {
    x: 0,
    z: 0
  },

  camera: {
    yaw: 0,
    pitch: 0.38,
    sensitivity: 1
  },

  settings: {
    quality: "medium",
    sensitivity: 1,
    showFPS: false
  }
};

let scene = null;
let camera = null;
let renderer = null;
let clock = null;

let player = null;
let human = null;
let environment = null;
let world = null;

let initialized = false;
let running = false;
let animationFrame = 0;
let cameraMode = 0;

let fpsFrames = 0;
let fpsTime = 0;
let currentFPS = 0;

let joystickPointer = null;
let lookPointer = null;
let lookLastX = 0;
let lookLastY = 0;

const keys = Object.create(null);

const inventoryIcons = {
  Wood: "🪵",
  Stone: "🪨",
  Fiber: "🌿",
  Berries: "🫐",
  Banana: "🍌",
  Coconut: "🥥"
};

/* ============================================================
   STORAGE
   ============================================================ */

function storageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch(e) {
    return null;
  }
}

function storageSet(key,value) {
  try {
    localStorage.setItem(key,value);
    return true;
  } catch(e) {
    return false;
  }
}

function hasSave() {
  return !!storageGet(CONFIG.SAVE_KEY);
}

function loadSettings() {
  try {
    const saved = JSON.parse(
      storageGet(CONFIG.SETTINGS_KEY) || "null"
    );

    if (!saved) return;

    if (["low","medium","high"].includes(saved.quality)) {
      state.settings.quality = saved.quality;
    }

    if (Number.isFinite(saved.sensitivity)) {
      state.settings.sensitivity =
        clamp(saved.sensitivity,0.5,2);
    }

    state.settings.showFPS = !!saved.showFPS;

    state.camera.sensitivity =
      state.settings.sensitivity;

  } catch(e) {
    console.warn("Settings error:",e);
  }
}

function saveSettings() {
  storageSet(
    CONFIG.SETTINGS_KEY,
    JSON.stringify(state.settings)
  );
}

/* ============================================================
   INTERFACE STYLES
   ============================================================ */

function createInterface() {
  if ($("wi-interface")) return;

  const style = document.createElement("style");
  style.id = "wi-style";

  style.textContent = `
  #wi-interface {
    position:fixed;
    inset:0;
    z-index:20;
    pointer-events:none;
    color:white;
    font-family:Arial,sans-serif;
    user-select:none;
  }

  #wi-interface * {
    box-sizing:border-box;
  }

  .wi-panel {
    background:rgba(8,15,19,.94);
    border:1px solid rgba(255,255,255,.14);
    border-radius:16px;
    padding:20px;
    backdrop-filter:blur(12px);
    box-shadow:0 15px 50px rgba(0,0,0,.35);
  }

  .wi-screen {
    position:absolute;
    inset:0;
    display:flex;
    justify-content:center;
    align-items:center;
    pointer-events:auto;
    background:rgba(0,0,0,.68);
  }

  .wi-screen.hidden {
    display:none;
  }

  .wi-menu {
    width:min(420px,90vw);
    text-align:center;
    max-height:90vh;
    overflow-y:auto;
  }

  .wi-title {
    font-size:34px;
    font-weight:900;
    letter-spacing:3px;
  }

  .wi-subtitle {
    color:#a8c2bd;
    font-size:11px;
    letter-spacing:4px;
    margin:8px 0 25px;
  }

  .wi-button {
    display:block;
    width:100%;
    border:1px solid rgba(255,255,255,.15);
    background:rgba(255,255,255,.08);
    color:white;
    border-radius:10px;
    padding:14px;
    margin-top:10px;
    font-size:14px;
    font-weight:bold;
    cursor:pointer;
  }

  .wi-button.primary {
    background:#287d64;
    border-color:#399d7d;
  }

  .wi-button:active {
    transform:scale(.98);
  }

  .wi-button:disabled {
    opacity:.4;
  }

  #wi-hud {
    position:absolute;
    inset:0;
    pointer-events:none;
  }

  #wi-stats {
    position:absolute;
    top:14px;
    left:14px;
    width:180px;
  }

  .wi-stat {
    display:flex;
    align-items:center;
    gap:7px;
    margin-bottom:7px;
    font-size:11px;
  }

  .wi-stat-name {
    width:49px;
    color:#eee;
  }

  .wi-bar {
    height:7px;
    flex:1;
    background:rgba(255,255,255,.2);
    border-radius:10px;
    overflow:hidden;
  }

  .wi-fill {
    height:100%;
    width:100%;
    background:#55c88a;
    transition:width .2s;
  }

  .wi-fill.low {
    background:#e35d51;
  }

  #wi-day {
    position:absolute;
    top:14px;
    right:14px;
    padding:9px 13px;
    border-radius:10px;
    background:rgba(0,0,0,.6);
    font-size:12px;
  }

  #wi-inventory {
    position:absolute;
    top:145px;
    left:14px;
    width:180px;
    padding:10px;
    background:rgba(0,0,0,.55);
    border-radius:10px;
    font-size:12px;
  }

  .wi-item {
    display:flex;
    justify-content:space-between;
    margin:6px 0;
  }

  #wi-toast {
    position:absolute;
    top:23%;
    left:50%;
    transform:translateX(-50%);
    padding:11px 18px;
    background:rgba(0,0,0,.85);
    border-radius:10px;
    font-size:13px;
    opacity:0;
    transition:opacity .2s;
    white-space:nowrap;
  }

  #wi-toast.show {
    opacity:1;
  }

  #wi-actions {
    position:absolute;
    right:18px;
    bottom:35px;
    display:flex;
    flex-direction:column;
    gap:10px;
    pointer-events:auto;
    z-index:4;
  }

  .wi-action {
    width:55px;
    height:55px;
    border-radius:50%;
    border:1px solid rgba(255,255,255,.3);
    color:white;
    background:rgba(0,0,0,.58);
    font-size:21px;
    touch-action:none;
  }

  #wi-joystick {
    position:absolute;
    left:25px;
    bottom:35px;
    width:125px;
    height:125px;
    border-radius:50%;
    background:rgba(255,255,255,.12);
    border:2px solid rgba(255,255,255,.2);
    pointer-events:auto;
    touch-action:none;
    z-index:4;
  }

  #wi-stick {
    position:absolute;
    width:52px;
    height:52px;
    left:35px;
    top:35px;
    border-radius:50%;
    background:rgba(255,255,255,.48);
    border:2px solid rgba(255,255,255,.6);
  }

  #wi-pause {
    position:absolute;
    top:65px;
    right:15px;
    pointer-events:auto;
    width:42px;
    height:42px;
    border-radius:10px;
    background:rgba(0,0,0,.65);
    color:white;
    border:1px solid #777;
    font-size:18px;
    z-index:5;
  }

  #wi-fps {
    position:absolute;
    top:65px;
    left:15px;
    font-size:11px;
    color:#aaffaa;
  }

  #wi-prompt {
    position:absolute;
    left:50%;
    bottom:190px;
    transform:translateX(-50%);
    background:rgba(0,0,0,.75);
    border-radius:9px;
    padding:10px 15px;
    font-size:13px;
    display:none;
    white-space:nowrap;
  }

  #wi-look {
    position:absolute;
    right:0;
    top:0;
    width:65%;
    height:100%;
    pointer-events:auto;
    touch-action:none;
    z-index:2;
  }

  @media(pointer:fine) {
    #wi-joystick {display:none}
  }

  @media(max-width:600px) {
    #wi-stats {width:155px}
    #wi-inventory {width:155px;top:145px}
    .wi-title {font-size:27px}
    #wi-actions {right:12px;bottom:25px}
    .wi-action {width:50px;height:50px}
  }
  `;

  document.head.appendChild(style);

  const root = document.createElement("div");
  root.id = "wi-interface";

  root.innerHTML = `
    <div id="wi-menu" class="wi-screen">
      <div class="wi-panel wi-menu">
        <div class="wi-title">WILD ISLAND</div>
        <div class="wi-subtitle">SURVIVAL EXPERIENCE</div>

        <button class="wi-button primary" id="wi-new">
          YENİ OYUN
        </button>

        <button class="wi-button" id="wi-continue">
          DEVAM ET
        </button>

        <button class="wi-button" id="wi-settings-open">
          AYARLAR
        </button>

        <div style="margin-top:20px;color:#91aaa0;font-size:11px">
          EXPLORE • COLLECT • SURVIVE
        </div>
      </div>
    </div>

    <div id="wi-settings" class="wi-screen hidden">
      <div class="wi-panel wi-menu">
        <h2>AYARLAR</h2>

        <p>Qrafika keyfiyyəti</p>

        <select id="wi-quality" class="wi-button">
          <option value="low">Aşağı</option>
          <option value="medium">Orta</option>
          <option value="high">Yüksək</option>
        </select>

        <p>Həssaslıq</p>

        <input id="wi-sensitivity" type="range"
          min=".5" max="2" step=".1"
          style="width:100%">

        <button class="wi-button" id="wi-fps-toggle">
          FPS: OFF
        </button>

        <button class="wi-button primary" id="wi-settings-back">
          GERİ
        </button>
      </div>
    </div>

    <div id="wi-pause-screen" class="wi-screen hidden">
      <div class="wi-panel wi-menu">
        <h2>OYUN DAYANDIRILDI</h2>

        <button class="wi-button primary" id="wi-resume">
          DAVAM ET
        </button>

        <button class="wi-button" id="wi-save">
          YADDA SAXLA
        </button>

        <button class="wi-button" id="wi-main-menu">
          ƏSAS MENYU
        </button>
      </div>
    </div>

    <div id="wi-hud" style="display:none">

      <div id="wi-stats">
        ${makeStat("health","Sağlamlıq")}
        ${makeStat("food","Aclıq")}
        ${makeStat("water","Su")}
        ${makeStat("energy","Enerji")}
      </div>

      <div id="wi-day">☀️ Gün 1</div>

      <div id="wi-inventory">
        <b>🎒 İNVENTAR</b>
        <div id="wi-items"></div>
      </div>

      <div id="wi-toast"></div>
      <div id="wi-prompt"></div>
      <div id="wi-fps"></div>

      <button id="wi-pause">Ⅱ</button>

      <div id="wi-look"></div>

      <div id="wi-joystick">
        <div id="wi-stick"></div>
      </div>

      <div id="wi-actions">
        <button class="wi-action" id="wi-collect">✋</button>
        <button class="wi-action" id="wi-jump">⬆</button>
        <button class="wi-action" id="wi-run">🏃</button>
        <button class="wi-action" id="wi-camera">📷</button>
      </div>
    </div>

    <div id="wi-dead" class="wi-screen hidden">
      <div class="wi-panel wi-menu">
        <h2>OYUN BİTDİ</h2>
        <p>Macəran burada dayandı.</p>

        <button class="wi-button primary" id="wi-respawn">
          YENİDƏN BAŞLA
        </button>

        <button class="wi-button" id="wi-dead-menu">
          ƏSAS MENYU
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(root);

  bindInterface();
  setupTouchControls();
}

function makeStat(id,label) {
  return `
    <div class="wi-stat">
      <span class="wi-stat-name">${label}</span>
      <div class="wi-bar">
        <div class="wi-fill" id="wi-fill-${id}"></div>
      </div>
      <span id="wi-value-${id}">100</span>
    </div>
  `;
}

function bindInterface() {

  $("wi-new").onclick = newGame;
  $("wi-continue").onclick = loadGame;

  $("wi-settings-open").onclick =
    () => showScreen("wi-settings");

  $("wi-settings-back").onclick =
    () => showScreen("wi-menu");

  $("wi-resume").onclick = resumeGame;
  $("wi-save").onclick = saveGame;
  $("wi-main-menu").onclick = goMenu;
  $("wi-pause").onclick = pauseGame;

  $("wi-collect").onclick = collectNearby;
  $("wi-jump").onclick = jump;

  $("wi-run").onpointerdown = e => {
    e.preventDefault();
    state.movement.sprint = true;
  };

  $("wi-run").onpointerup = () => {
    state.movement.sprint = false;
  };

  $("wi-run").onpointercancel = () => {
    state.movement.sprint = false;
  };

  $("wi-run").onpointerleave = () => {
    state.movement.sprint = false;
  };

  $("wi-camera").onclick = changeCamera;
  $("wi-respawn").onclick = respawn;
  $("wi-dead-menu").onclick = goMenu;

  $("wi-quality").value = state.settings.quality;
  $("wi-sensitivity").value = state.settings.sensitivity;

  $("wi-quality").onchange = e => {
    state.settings.quality = e.target.value;
    applyQuality();
    saveSettings();
  };

  $("wi-sensitivity").oninput = e => {
    state.settings.sensitivity =
      Number(e.target.value);

    state.camera.sensitivity =
      state.settings.sensitivity;

    saveSettings();
  };

  $("wi-fps-toggle").onclick = () => {
    state.settings.showFPS =
      !state.settings.showFPS;

    $("wi-fps-toggle").textContent =
      "FPS: " +
      (state.settings.showFPS ? "ON" : "OFF");

    saveSettings();
  };

  $("wi-continue").disabled = !hasSave();
}

function showScreen(id) {
  [
    "wi-menu",
    "wi-settings",
    "wi-pause-screen",
    "wi-dead"
  ].forEach(k => {
    $(k)?.classList.add("hidden");
  });

  $(id)?.classList.remove("hidden");
}

let toastTimeout = null;

function toast(message) {
  const el = $("wi-toast");
  if (!el) return;

  el.textContent = message;
  el.classList.add("show");

  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }

  toastTimeout = setTimeout(() => {
    el.classList.remove("show");
  },1800);
}

/* ============================================================
   THREE.JS SCENE
   ============================================================ */

function initScene() {
  if (initialized) return;

  const container = $("game-container");

  if (!container) {
    throw new Error("game-container tapılmadı.");
  }

  if (!WI.createEnvironment) {
    throw new Error("environment.js sistemi tapılmadı.");
  }

  if (!WI.createWorld) {
    throw new Error("world.js sistemi tapılmadı.");
  }

  if (!WI.createHuman) {
    throw new Error("character.js sistemi tapılmadı.");
  }

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    60,
    Math.max(1,innerWidth)/Math.max(1,innerHeight),
    0.1,
    1500
  );

  renderer = new THREE.WebGLRenderer({
    antialias: state.settings.quality !== "low",
    powerPreference: "high-performance"
  });

  renderer.setPixelRatio(
    Math.min(devicePixelRatio || 1,1.5)
  );

  renderer.setSize(innerWidth,innerHeight);

  renderer.shadowMap.enabled =
    state.settings.quality !== "low";

  renderer.shadowMap.type =
    THREE.PCFSoftShadowMap;

  renderer.toneMapping =
    THREE.ACESFilmicToneMapping;

  renderer.toneMappingExposure = 1.1;

  renderer.domElement.style.position = "absolute";
  renderer.domElement.style.inset = "0";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.zIndex = "0";

  container.appendChild(renderer.domElement);

  environment = WI.createEnvironment({
    scene,
    camera,
    renderer,
    quality: state.settings.quality
  });

  world = WI.createWorld({
    scene,
    camera,
    renderer,
    getPlayerPosition: () =>
      player ? player.position : null
  });

  human = WI.createHuman({
    quality: state.settings.quality
  });

  player = human.root;

  if (!player) {
    throw new Error("Character root yaradılmadı.");
  }

  scene.add(player);

  clock = new THREE.Clock();

  applyQuality();

  addEventListener("resize",resize);

  renderer.domElement.addEventListener(
    "webglcontextlost",
    e => {
      e.preventDefault();
      pauseGame();
      toast("Qrafika bağlantısı itirildi.");
    }
  );

  initialized = true;
}

function resize() {
  if (!camera || !renderer) return;

  camera.aspect =
    Math.max(1,innerWidth)/
    Math.max(1,innerHeight);

  camera.updateProjectionMatrix();

  renderer.setSize(innerWidth,innerHeight);
}

function applyQuality() {
  if (!renderer) return;

  const ratios = {
    low: 1,
    medium: 1.35,
    high: 1.65
  };

  renderer.setPixelRatio(
    Math.min(
      devicePixelRatio || 1,
      ratios[state.settings.quality] || 1
    )
  );

  renderer.shadowMap.enabled =
    state.settings.quality !== "low";

  renderer.setSize(innerWidth,innerHeight);

  environment?.setQuality?.(
    state.settings.quality
  );
}

/* ============================================================
   PLAYER
   ============================================================ */

function resetPlayer() {

  state.player.x = 0;
  state.player.y = 0;
  state.player.z = 10;
  state.player.vy = 0;
  state.player.grounded = true;

  state.velocity.x = 0;
  state.velocity.z = 0;

  state.movement.x = 0;
  state.movement.y = 0;
  state.movement.sprint = false;

  state.camera.yaw = 0;
  state.camera.pitch = 0.38;

  if (player) {
    player.position.set(0,0,10);
    player.rotation.set(0,0,0);
    player.visible = true;
  }

  human?.reset?.();
}

function groundHeight(x,z) {

  if (world?.groundHeight) {
    try {
      const h = world.groundHeight(x,z);
      if (Number.isFinite(h)) return h;
    } catch(e) {}
  }

  return 0;
}

function movePlayer(dt) {

  if (
    !player ||
    state.mode !== "game" ||
    state.paused ||
    state.dead
  ) return;

  let mx = state.movement.x;
  let my = state.movement.y;

  if (keys.KeyW || keys.ArrowUp) my = -1;
  if (keys.KeyS || keys.ArrowDown) my = 1;
  if (keys.KeyA || keys.ArrowLeft) mx = -1;
  if (keys.KeyD || keys.ArrowRight) mx = 1;

  const length = Math.hypot(mx,my);

  if (length > 1) {
    mx /= length;
    my /= length;
  }

  const running =
    state.movement.sprint &&
    state.energy > 1;

  const speed = running
    ? CONFIG.RUN_SPEED
    : CONFIG.WALK_SPEED;

  let targetX = 0;
  let targetZ = 0;

  if (length > 0.02) {

    const yaw = state.camera.yaw;

    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);

    const rx = Math.cos(yaw);
    const rz = -Math.sin(yaw);

    targetX =
      (rx*mx+fx*-my)*speed;

    targetZ =
      (rz*mx+fz*-my)*speed;
  }

  const k = smooth(
    length > 0.02 ? 13 : 18,
    dt
  );

  state.velocity.x +=
    (targetX-state.velocity.x)*k;

  state.velocity.z +=
    (targetZ-state.velocity.z)*k;

  const velocity = state.velocity;

  const speedNow =
    Math.hypot(velocity.x,velocity.z);

  if (speedNow > 0.01) {

    let nx =
      player.position.x+velocity.x*dt;

    let nz =
      player.position.z+velocity.z*dt;

    const distance = Math.hypot(nx,nz);

    if (distance > CONFIG.WORLD_LIMIT) {
      nx *= CONFIG.WORLD_LIMIT/distance;
      nz *= CONFIG.WORLD_LIMIT/distance;
    }

    player.position.x = nx;
    player.position.z = nz;

    const targetRotation =
      Math.atan2(velocity.x,velocity.z);

    let difference =
      targetRotation-player.rotation.y;

    difference = Math.atan2(
      Math.sin(difference),
      Math.cos(difference)
    );

    player.rotation.y +=
      difference*smooth(10,dt);
  }

  const pl = state.player;

  if (!pl.grounded) {

    pl.vy -= CONFIG.GRAVITY*dt;

    player.position.y += pl.vy*dt;

    const ground = groundHeight(
      player.position.x,
      player.position.z
    );

    if (player.position.y <= ground) {
      player.position.y = ground;
      pl.vy = 0;
      pl.grounded = true;
    }

  } else {

    const ground = groundHeight(
      player.position.x,
      player.position.z
    );

    player.position.y +=
      (ground-player.position.y)*Math.min(1,dt*15);
  }

  pl.x = player.position.x;
  pl.y = player.position.y;
  pl.z = player.position.z;

  if (length > 0.02 && running) {
    state.energy =
      Math.max(0,state.energy-12*dt);
  } else {
    
    state.energy = Math.min(100, state.energy + 7 * dt);
  }

  if (human && typeof human.update === "function") {
    human.update(dt, {
      speed: speedNow,
      grounded: pl.grounded,
      vy: pl.vy,
      yawRate: 0
    });
  }
}

/* ============================================================
   CAMERA
   ============================================================ */

function updateCamera(dt) {
  if (!camera || !player) return;

  const target = new THREE.Vector3(
    player.position.x,
    player.position.y + (cameraMode === 0 ? 2.2 : 1.65),
    player.position.z
  );

  const yaw = state.camera.yaw;
  const pitch = clamp(state.camera.pitch, -0.5, 1.15);

  const distance = cameraMode === 0 ? 5.5 : 0.15;

  const horizontal = Math.cos(pitch) * distance;

  const offset = new THREE.Vector3(
    Math.sin(yaw) * horizontal,
    Math.sin(pitch) * distance,
    Math.cos(yaw) * horizontal
  );

  const desired = target.clone().add(offset);

  const factor = smooth(9, dt);

  camera.position.lerp(desired, factor);
  camera.lookAt(target);
}

function changeCamera() {
  cameraMode = cameraMode === 0 ? 1 : 0;
  toast(cameraMode === 0 ? "Üçüncü şəxs" : "Birinci şəxs");
}

/* ============================================================
   TOUCH CONTROLS
   ============================================================ */

function setupTouchControls() {
  const joystick = $("wi-joystick");
  const stick = $("wi-stick");
  const look = $("wi-look");

  if (joystick && stick) {
    joystick.addEventListener("pointerdown", e => {
      if (state.mode !== "game" || state.paused) return;

      joystickPointer = e.pointerId;
      joystick.setPointerCapture(e.pointerId);
      updateJoystick(e);
    });

    joystick.addEventListener("pointermove", e => {
      if (e.pointerId !== joystickPointer) return;
      updateJoystick(e);
    });

    const releaseJoystick = e => {
      if (e.pointerId !== joystickPointer) return;

      joystickPointer = null;
      state.movement.x = 0;
      state.movement.y = 0;

      stick.style.transform = "translate(0px,0px)";
    };

    joystick.addEventListener("pointerup", releaseJoystick);
    joystick.addEventListener("pointercancel", releaseJoystick);
  }

  function updateJoystick(e) {
    const rect = joystick.getBoundingClientRect();

    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    let dx = e.clientX - cx;
    let dy = e.clientY - cy;

    const max = 38;
    const length = Math.hypot(dx, dy);

    if (length > max) {
      dx = dx / length * max;
      dy = dy / length * max;
    }

    state.movement.x = dx / max;
    state.movement.y = dy / max;

    stick.style.transform =
      `translate(${dx}px,${dy}px)`;
  }

  if (look) {
    look.addEventListener("pointerdown", e => {
      if (state.mode !== "game" || state.paused) return;

      lookPointer = e.pointerId;
      lookLastX = e.clientX;
      lookLastY = e.clientY;

      try {
        look.setPointerCapture(e.pointerId);
      } catch(err) {}
    });

    look.addEventListener("pointermove", e => {
      if (e.pointerId !== lookPointer) return;

      const dx = e.clientX - lookLastX;
      const dy = e.clientY - lookLastY;

      lookLastX = e.clientX;
      lookLastY = e.clientY;

      state.camera.yaw -=
        dx * 0.004 * state.camera.sensitivity;

      state.camera.pitch = clamp(
        state.camera.pitch +
        dy * 0.003 * state.camera.sensitivity,
        -0.5,
        1.15
      );
    });

    const releaseLook = e => {
      if (e.pointerId === lookPointer) {
        lookPointer = null;
      }
    };

    look.addEventListener("pointerup", releaseLook);
    look.addEventListener("pointercancel", releaseLook);
  }
}

function jump() {
  if (
    state.mode !== "game" ||
    state.paused ||
    state.dead ||
    !state.player.grounded
  ) return;

  state.player.vy = CONFIG.JUMP_POWER;
  state.player.grounded = false;
}

/* ============================================================
   RESOURCE SYSTEM
   ============================================================ */

function getNearbyResource() {
  if (!world || !player || !Array.isArray(world.resources)) {
    return null;
  }

  let nearest = null;
  let nearestDistance = CONFIG.RESOURCE_DISTANCE;

  for (const resource of world.resources) {
    if (!resource || resource.collected) continue;

    const object = resource.object || resource.mesh;
    if (!object || !object.position) continue;

    const distance = player.position.distanceTo(object.position);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = resource;
    }
  }

  return nearest;
}

function collectNearby() {
  if (state.mode !== "game" || state.paused || state.dead) return;

  const resource = getNearbyResource();

  if (!resource) {
    toast("Yaxınlıqda resurs yoxdur.");
    return;
  }

  const type = resource.type;

  if (!Object.prototype.hasOwnProperty.call(state.inventory, type)) {
    toast("Bu resurs tanınmadı.");
    return;
  }

  const amount = Math.max(1, Number(resource.amount) || 1);

  state.inventory[type] += amount;

  if (world && typeof world.collectResource === "function") {
    world.collectResource(resource);
  } else {
    resource.collected = true;

    const object = resource.object || resource.mesh;
    if (object) object.visible = false;
  }

  updateHUD();
  toast(`${inventoryIcons[type] || "📦"} ${type} +${amount}`);
}

/* ============================================================
   SURVIVAL
   ============================================================ */

function updateSurvival(dt) {
  if (
    state.mode !== "game" ||
    state.paused ||
    state.dead
  ) return;

  state.elapsed += dt;

  state.day += dt / CONFIG.DAY_LENGTH;

  if (state.day >= 1) {
    state.day -= 1;
    state.dayCount++;
    toast(`Gün ${state.dayCount} başladı!`);
  }

  state.food = Math.max(0, state.food - 0.18 * dt);
  state.water = Math.max(0, state.water - 0.28 * dt);

  if (state.food <= 0) {
    state.health = Math.max(0, state.health - 1.1 * dt);
  }

  if (state.water <= 0) {
    state.health = Math.max(0, state.health - 1.8 * dt);
  }

  if (state.health <= 0) {
    state.health = 0;
    endGame();
  }
}

function endGame() {
  if (state.dead) return;

  state.dead = true;
  state.paused = true;

  showScreen("wi-dead");

  const hud = $("wi-hud");
  if (hud) hud.style.display = "none";
}

function respawn() {
  state.health = 100;
  state.food = 100;
  state.water = 100;
  state.energy = 100;

  state.dead = false;
  state.paused = false;

  resetPlayer();

  state.mode = "game";

  showScreen("wi-menu");
  const hud = $("wi-hud");
  if (hud) hud.style.display = "block";

  showScreen("wi-menu");
  $("wi-dead")?.classList.add("hidden");

  updateHUD();
}

/* ============================================================
   HUD
   ============================================================ */

function updateHUD() {
  const values = {
    health: state.health,
    food: state.food,
    water: state.water,
    energy: state.energy
  };

  for (const key in values) {
    const value = clamp(values[key], 0, 100);
    const fill = $(`wi-fill-${key}`);
    const label = $(`wi-value-${key}`);

    if (fill) {
      fill.style.width = `${value}%`;
      fill.classList.toggle("low", value < 25);
    }

    if (label) {
      label.textContent = Math.round(value);
    }
  }

  const day = $("wi-day");
  if (day) {
    const isNight = state.day < 0.22 || state.day > 0.78;
    day.textContent =
      `${isNight ? "🌙" : "☀️"} Gün ${state.dayCount}`;
  }

  const items = $("wi-items");

  if (items) {
    items.innerHTML = Object.keys(state.inventory)
      .map(key => `
        <div class="wi-item">
          <span>${inventoryIcons[key] || "📦"} ${key}</span>
          <b>${state.inventory[key]}</b>
        </div>
      `)
      .join("");
  }

  const prompt = $("wi-prompt");
  if (prompt) {
    const resource = getNearbyResource();

    prompt.style.display = resource ? "block" : "none";

    if (resource) {
      prompt.textContent =
        `✋ ${resource.type} toplamaq üçün düyməyə bas`;
    }
  }

  const fps = $("wi-fps");

  if (fps) {
    fps.style.display = state.settings.showFPS ? "block" : "none";
    fps.textContent = `FPS: ${currentFPS}`;
  }
}

/* ============================================================
   SAVE / LOAD
   ============================================================ */

function saveGame() {
  const data = {
    version: 1,
    elapsed: state.elapsed,
    day: state.day,
    dayCount: state.dayCount,
    health: state.health,
    food: state.food,
    water: state.water,
    energy: state.energy,
    inventory: state.inventory,
    player: {
      x: player ? player.position.x : 0,
      y: player ? player.position.y : 0,
      z: player ? player.position.z : 10
    },
    camera: state.camera
  };

  if (!storageSet(CONFIG.SAVE_KEY, JSON.stringify(data))) {
    toast("Yadda saxlamaq mümkün olmadı.");
    return;
  }

  toast("Oyun yadda saxlanıldı!");
  $("wi-continue").disabled = false;
}

function loadGame() {
  const raw = storageGet(CONFIG.SAVE_KEY);

  if (!raw) {
    toast("Yaddaş faylı tapılmadı.");
    return;
  }

  let data;

  try {
    data = JSON.parse(raw);
  } catch(e) {
    toast("Yaddaş faylı zədələnib.");
    return;
  }

  try {
    startGame();

    state.elapsed = Number(data.elapsed) || 0;
    state.day = Number(data.day) || 0.25;
    state.dayCount = Number(data.dayCount) || 1;

    state.health = clamp(Number(data.health) || 100, 0, 100);
    state.food = clamp(Number(data.food) || 100, 0, 100);
    state.water = clamp(Number(data.water) || 100, 0, 100);
    state.energy = clamp(Number(data.energy) || 100, 0, 100);

    if (data.inventory) {
      for (const key of Object.keys(state.inventory)) {
        state.inventory[key] =
          Math.max(0, Number(data.inventory[key]) || 0);
      }
    }

    if (data.player && player) {
      player.position.set(
        Number(data.player.x) || 0,
        Number(data.player.y) || 0,
        Number(data.player.z) || 10
      );
    }

    if (data.camera) {
      state.camera.yaw = Number(data.camera.yaw) || 0;
      state.camera.pitch = Number(data.camera.pitch) || 0.38;
    }

    updateHUD();
    toast("Oyun yükləndi!");
  } catch(e) {
    console.error("Load error:", e);
    toast("Oyun yüklənərkən xəta baş verdi.");
  }
}

/* ============================================================
   GAME STATES
   ============================================================ */

function startGame() {
  if (!initialized) {
    initScene();
  }

  state.mode = "game";
  state.paused = false;
  state.dead = false;

  showScreen("wi-menu");
  $("wi-menu")?.classList.add("hidden");
  $("wi-settings")?.classList.add("hidden");
  $("wi-pause-screen")?.classList.add("hidden");
  $("wi-dead")?.classList.add("hidden");

  const hud = $("wi-hud");
  if (hud) hud.style.display = "block";

  if (clock) clock.start();

  updateHUD();

  if (!running) {
    running = true;
    animate();
  }
}

function newGame() {
  state.elapsed = 0;
  state.day = 0.25;
  state.dayCount = 1;

  state.health = 100;
  state.food = 100;
  state.water = 100;
  state.energy = 100;

  for (const key of Object.keys(state.inventory)) {
    state.inventory[key] = 0;
  }

  resetPlayer();
  startGame();

  toast("Yeni macəra başladı!");
}

function pauseGame() {
  if (state.mode !== "game" || state.paused) return;

  state.paused = true;

  showScreen("wi-pause-screen");
}

function resumeGame() {
  if (state.dead) return;

  state.paused = false;
  $("wi-pause-screen")?.classList.add("hidden");

  if (clock) clock.getDelta();
}

function goMenu() {
  state.mode = "menu";
  state.paused = false;
  state.movement.sprint = false;

  showScreen("wi-menu");

  const hud = $("wi-hud");
  if (hud) hud.style.display = "none";

  if (player) {
    state.player.x = player.position.x;
    state.player.y = player.position.y;
    state.player.z = player.position.z;
  }
}

/* ============================================================
   WORLD UPDATE
   ============================================================ */

function updateWorld(dt) {
  if (state.mode !== "game" || state.paused || state.dead) return;

  if (world && typeof world.update === "function") {
    world.update(dt);
  }

  if (environment && typeof environment.update === "function") {
    environment.update(dt, state.day);
  }
}

/* ============================================================
   INPUT
   ============================================================ */

addEventListener("keydown", e => {
  keys[e.code] = true;

  if (
    ["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"]
      .includes(e.code)
  ) {
    e.preventDefault();
  }

  if (e.code === "Space") jump();

  if (e.code === "KeyE") collectNearby();

  if (e.code === "Escape") {
    if (state.paused) resumeGame();
    else pauseGame();
  }

  if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
    state.movement.sprint = true;
  }
});

addEventListener("keyup", e => {
  keys[e.code] = false;

  if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
    state.movement.sprint = false;
  }
});

addEventListener("blur", () => {
  state.movement.sprint = false;
  for (const key of Object.keys(keys)) keys[key] = false;
});

/* ============================================================
   MAIN LOOP
   ============================================================ */

function animate() {
  if (!running) return;

  animationFrame = requestAnimationFrame(animate);

  if (!renderer || !scene || !camera) return;

  let dt = clock ? clock.getDelta() : 0.016;
  dt = clamp(dt, 0, 0.05);

  fpsFrames++;
  fpsTime += dt;

  if (fpsTime >= 1) {
    currentFPS = Math.round(fpsFrames / fpsTime);
    fpsFrames = 0;
    fpsTime = 0;
  }

  if (state.mode === "game" && !state.paused && !state.dead) {
    movePlayer(dt);
    updateSurvival(dt);
    updateWorld(dt);
    updateHUD();
  }

  if (state.mode === "game") {
    updateCamera(dt);
  }

  renderer.render(scene, camera);
}

/* ============================================================
   BOOT
   ============================================================ */

function boot() {
  try {
    loadSettings();
    createInterface();
    initScene();

    resetPlayer();
    updateHUD();

    WI.debug = true;

    if (typeof window.hideLoadingScreen === "function") {
      window.hideLoadingScreen();
    }

    const continueButton = $("wi-continue");
    if (continueButton) {
      continueButton.disabled = !hasSave();
    }

    if (!running) {
      running = true;
      animate();
    }

    console.log("WILD ISLAND: SURVIVAL hazırdır.");

  } catch(e) {
    console.error("WILD ISLAND boot error:", e);

    WI.debug = false;

    if (typeof window.showGameError === "function") {
      window.showGameError(
        "Oyun başlatıla bilmədi: " + e.message
      );
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}

})();
     
