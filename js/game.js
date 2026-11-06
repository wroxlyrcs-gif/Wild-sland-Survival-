/* ============================================================
   WILD ISLAND: SURVIVAL — GAME.JS
   Complete gameplay controller
   Three.js | Android | Mobile + Desktop
   ============================================================ */

(() => {
"use strict";

const WI = window.WI = window.WI || {};
const $ = id => document.getElementById(id);
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const smooth = (r,dt) => 1 - Math.exp(-r*dt);

if (!window.THREE) {
  window.showGameError?.("Three.js yüklənmədi!");
  return;
}

const THREE = window.THREE;

const CONFIG = {
  WALK_SPEED: 4.2,
  RUN_SPEED: 7.2,
  JUMP_POWER: 6.2,
  GRAVITY: 19,
  WORLD_LIMIT: 97,
  RESOURCE_DISTANCE: 3.2,
  DAY_LENGTH: 360,
  SAVE_KEY: "wild_island_save_v1",
  SETTINGS_KEY: "wild_island_settings_v1"
};

const state = {
  mode: "menu",
  paused: false,
  dead: false,

  time: 0,
  day: 0.25,
  dayCount: 0,

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
    grounded: true,
    rotation: 0
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
    pitch: 0.48,
    distance: 8,
    sensitivity: 1
  },

  settings: {
    quality: "medium",
    sensitivity: 1,
    showFPS: false
  },

  resources: [],
  toastTimer: 0,
  fps: 0,
  elapsed: 0
};

let scene = null;
let camera = null;
let renderer = null;
let clock = null;
let player = null;
let human = null;
let environment = null;
let world = null;

let animationFrame = 0;
let lastTime = 0;
let initialized = false;
let disposed = false;

let joystickPointer = null;
let lookPointer = null;
let lookLastX = 0;
let lookLastY = 0;

let fpsFrames = 0;
let fpsTime = 0;

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
   SETTINGS
   ============================================================ */

function loadSettings() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(CONFIG.SETTINGS_KEY) || "null"
    );

    if (!saved) return;

    if (["low","medium","high"].includes(saved.quality)) {
      state.settings.quality = saved.quality;
    }

    if (Number.isFinite(saved.sensitivity)) {
      state.settings.sensitivity = clamp(saved.sensitivity,0.5,2);
      state.camera.sensitivity = state.settings.sensitivity;
    }

    state.settings.showFPS = !!saved.showFPS;

  } catch (e) {
    console.warn("Settings could not be loaded:",e);
  }
}

function saveSettings() {
  try {
    localStorage.setItem(
      CONFIG.SETTINGS_KEY,
      JSON.stringify(state.settings)
    );
  } catch (e) {}
}

function applyQuality() {
  if (!renderer) return;

  const ratios = {
    low: 1,
    medium: 1.35,
    high: 1.75
  };

  const ratio = Math.min(
    window.devicePixelRatio || 1,
    ratios[state.settings.quality] || 1
  );

  renderer.setPixelRatio(ratio);
  renderer.setSize(innerWidth,innerHeight);

  renderer.shadowMap.enabled =
    state.settings.quality !== "low";

  if (environment?.setQuality) {
    environment.setQuality(state.settings.quality);
  }
}

/* ============================================================
   INTERFACE
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
    font-family:Arial,sans-serif;
    color:white;
    user-select:none;
  }

  #wi-interface * {
    box-sizing:border-box;
  }

  .wi-panel {
    background:rgba(8,15,19,.91);
    border:1px solid rgba(255,255,255,.13);
    border-radius:15px;
    padding:18px;
    backdrop-filter:blur(12px);
  }

  .wi-screen {
    position:absolute;
    inset:0;
    display:flex;
    justify-content:center;
    align-items:center;
    pointer-events:auto;
    background:rgba(0,0,0,.66);
  }

  .wi-screen.hidden {
    display:none;
  }

  .wi-menu {
    width:min(420px,90vw);
    text-align:center;
  }

  .wi-title {
    font-size:34px;
    font-weight:900;
    letter-spacing:3px;
    margin-bottom:5px;
  }

  .wi-subtitle {
    color:#a8c2bd;
    font-size:12px;
    letter-spacing:4px;
    margin-bottom:28px;
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
    font-size:15px;
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
    width:48px;
    color:#ddd;
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
    background:rgba(0,0,0,.55);
    font-size:12px;
  }

  #wi-inventory {
    position:absolute;
    top:145px;
    left:14px;
    width:180px;
    padding:10px;
    background:rgba(0,0,0,.5);
    border-radius:10px;
    font-size:12px;
  }

  .wi-item {
    display:flex;
    justify-content:space-between;
    margin:5px 0;
  }

  #wi-toast {
    position:absolute;
    top:23%;
    left:50%;
    transform:translateX(-50%);
    padding:11px 18px;
    background:rgba(0,0,0,.8);
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
  }

  .wi-action {
    width:58px;
    height:58px;
    border-radius:50%;
    border:1px solid rgba(255,255,255,.3);
    color:white;
    background:rgba(0,0,0,.55);
    font-size:22px;
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
    background:rgba(0,0,0,.55);
    color:white;
    border:1px solid #777;
    font-size:18px;
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
    background:rgba(0,0,0,.7);
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
  }

  @media (pointer:fine) {
    #wi-joystick {display:none}
    #wi-actions {bottom:25px}
  }

  @media (max-width:600px) {
    #wi-stats {width:155px}
    #wi-inventory {width:155px;top:145px}
    .wi-title {font-size:27px}
    #wi-actions {right:12px;bottom:25px}
    .wi-action {width:51px;height:51px}
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

        <div style="margin-top:20px;color:#8ca49c;font-size:11px">
          Explore • Collect • Survive
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
          min=".5" max="2" step=".1" style="width:100%">

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

  $("wi-new").onclick = newGame;
  $("wi-continue").onclick = loadGame;
  $("wi-settings-open").onclick = () => showScreen("wi-settings");
  $("wi-settings-back").onclick = () => showScreen("wi-menu");
  $("wi-resume").onclick = resumeGame;
  $("wi-save").onclick = saveGame;
  $("wi-main-menu").onclick = goMenu;
  $("wi-pause").onclick = pauseGame;
  $("wi-collect").onclick = collectNearby;
  $("wi-jump").onclick = jump;
  $("wi-run").onpointerdown = () => state.movement.sprint = true;
  $("wi-run").onpointerup = () => state.movement.sprint = false;
  $("wi-run").onpointerleave = () => state.movement.sprint = false;
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
    state.settings.sensitivity = Number(e.target.value);
    state.camera.sensitivity = state.settings.sensitivity;
    saveSettings();
  };

  $("wi-fps-toggle").onclick = () => {
    state.settings.showFPS = !state.settings.showFPS;
    $("wi-fps-toggle").textContent =
      "FPS: " + (state.settings.showFPS ? "ON" : "OFF");
    saveSettings();
  };

  $("wi-continue").disabled = !hasSave();
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

function showScreen(id) {
  ["wi-menu","wi-settings","wi-pause-screen","wi-dead"]
    .forEach(k => $(k)?.classList.add("hidden"));

  $(id)?.classList.remove("hidden");
}

function toast(message) {
  const el = $("wi-toast");
  if (!el) return;

  el.textContent = message;
  el.classList.add("show");

  clearTimeout(toast.timer);

  toast.timer = setTimeout(() => {
    el.classList.remove("show");
  },1800);
}

/* ============================================================
   THREE.JS SCENE
   ============================================================ */

function initScene() {
  if (initialized) return;

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    55,
    innerWidth / innerHeight,
    0.1,
    1500
  );

  renderer = new THREE.WebGLRenderer({
    antialias: state.settings.quality !== "low",
    powerPreference: "high-performance"
  });

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  renderer.domElement.style.position = "absolute";
  renderer.domElement.style.inset = "0";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.zIndex = "0";

  $("game-container").appendChild(renderer.domElement);

  environment = WI.createEnvironment({
    scene,
    camera,
    renderer,
    quality: state.settings.quality
  });

  world = WI.createWorld({
    scene,
    camera,
    renderer
  });

  if (world.addStatics && environment?.obstacles) {
    world.addStatics(environment.obstacles);
  }

  human = WI.createHuman({
    quality: state.settings.quality
  });

  player = human.root;

  scene.add(player);

  applyQuality();

  clock = new THREE.Clock();

  addEventListener("resize", resize);

  renderer.domElement.addEventListener(
    "webglcontextlost",
    e => {
      e.preventDefault();
      pauseGame();
      toast("Qrafika bağlantısı itirildi. Səhifəni yenilə.");
    }
  );

  initialized = true;
}

function resize() {
  if (!camera || !renderer) return;

  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(innerWidth,innerHeight);
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

  player.position.set(0,0,10);
  player.rotation.set(0,0,0);

  player.visible = true;

  human?.reset?.();
}

function groundHeight(x,z) {
  try {
    if (world?.groundHeight) {
      return world.groundHeight(x,z);
    }
  } catch(e) {}

  return 0;
}

function movePlayer(dt) {
  if (!player || state.mode !== "game" || state.paused || state.dead) {
    return;
  }

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

    targetX = (rx * mx + fx * -my) * speed;
    targetZ = (rz * mx + fz * -my) * speed;
  }

  const k = smooth(length > 0.02 ? 13 : 18,dt);

  state.velocity.x += (targetX-state.velocity.x)*k;
  state.velocity.z += (targetZ-state.velocity.z)*k;

  const velocity = state.velocity;

  const speedNow = Math.hypot(velocity.x,velocity.z);

  if (speedNow > 0.01) {
    let nx = player.position.x + velocity.x*dt;
    let nz = player.position.z + velocity.z*dt;

    const distance = Math.hypot(nx,nz);

    if (distance > CONFIG.WORLD_LIMIT) {
      nx *= CONFIG.WORLD_LIMIT/distance;
      nz *= CONFIG.WORLD_LIMIT/distance;
    }

    if (world?.pushOut) {
      try {
        const result = world.pushOut(nx,nz,0.38);
        if (result) {
          nx = result.x;
          nz = result.z;
        }
      } catch(e) {}
    }

    player.position.x = nx;
    player.position.z = nz;

    const targetRotation = Math.atan2(velocity.x,velocity.z);

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

  if (length > 0.02 && running) {
    state.energy = Math.max(0,state.energy-12*dt);
  } else {
    state.energy = Math.min(100,state.energy+5*dt);
  }

  if (human?.update) {
    human.update(dt,{
      speed:speedNow,
      grounded:pl.grounded,
      vy:pl.vy,
      yawRate:0
    });
  }
}

function jump() {
  if (
    state.mode !== "game" ||
    state.paused ||
    !state.player.grounded
  ) return;

  state.player.vy = CONFIG.JUMP_POWER;
  state.player.grounded = false;
}

/* ============================================================
   CAMERA
   ============================================================ */

let cameraMode = 0;

function changeCamera() {
  cameraMode = (cameraMode+1)%3;

  const names = [
    "Üçüncü şəxs",
    "Yaxın kamera",
    "Birinci şəxs"
  ];

  toast("Kamera: "+names[cameraMode]);
}

function updateCamera(dt) {
  if (!camera || !player) return;

  const p = player.position;
  const yaw = state.camera.yaw;
  const pitch = state.camera.pitch;

  if (cameraMode === 2) {
    player.visible = false;

    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);

    camera.position.set(
      p.x+fx*0.2,
      p.y+1.6,
      p.z+fz*0.2
    );

    camera.lookAt(
      p.x+fx*10,
      p.y+1.5-Math.sin(pitch)*5,
      p.z+fz*10
    );

    return;
  }

  player.visible = true;

  const distance = cameraMode === 1 ? 4.2 : 8;

  const horizontal = Math.cos(pitch)*distance;
  const height = Math.sin(pitch)*distance;

  const target = new THREE.Vector3(
    p.x+Math.sin(yaw)*horizontal,
   
