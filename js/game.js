(() => {
"use strict";
const WI = window.WI;
const t = (k, v) => WI.i18n.t(k, v);
const $ = id => document.getElementById(id);
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const smooth = (rate,dt)=>1-Math.exp(-rate*dt);          // kare hızından bağımsız yumuşatma
const ease = x => x*x*(3-2*x);
const isPortrait = () => innerHeight>innerWidth;
const IS_TOUCH = matchMedia("(pointer:coarse)").matches;

const MENU_DAY = 0.465;                                   // ana menü: gün batımı
const CAM_PITCH_MIN = 0.22, CAM_PITCH_MAX = 1.0;
const PR_MAX = {low:1, medium:1.5, high:2};

const state = {
  mode:"menu", paused:false, transitioning:false, last:0, time:0, elapsed:0, day:0.25, visDay:MENU_DAY,
  stats:{health:100,food:100,water:100,energy:100},
  inventory:{Banana:3,Coconut:2},
  sensitivity:1, quality:"medium", showFps:false,
  player:{x:0,z:10,vy:0,onGround:true,angle:0},
  resources:[], animals:[], buildings:[],
  // Üçüncü şahıs kamera: karakteri arkadan ve hafif yukarıdan (~28°) gösterir.
  camera:{yaw:0,pitch:0.5,tYaw:0,tPitch:0.5,distance:8.5,lookHeight:1.4,snap:true,fy:0,fovBlend:0,intro:0,fov:55},
  move:{x:0,y:0}, vel:{x:0,z:0}, sprint:false, discovered:new Set(["Sahil"]),
  camMode:0, gameMode:"story", raidOn:false, raidT:0, torch:false, torchT:0, loco:{speed:0,sprint:false,grounded:true,vy:0,yawRate:0}, nearType:null, hintT:0, hintTick:0
};
let scene,camera,renderer,player,human,env;
const perf = {acc:0,frames:0,pr:1.5,max:1.5,cool:3};

function toast(message){const el=$("toast");el.textContent=message;el.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove("show"),1700)}
function showModal(id){$(id).classList.remove("hidden");}
function hideModal(id){$(id).classList.add("hidden")}
const itemName = k => t("item_"+k);
function addMesh(geo,mat,x,y,z,parent=scene){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}

/* ------------------------------------------------------------------ */
/* Ayarlar (kalıcı)                                                    */
/* ------------------------------------------------------------------ */
function loadSettings(){
  try{
    const s=JSON.parse(localStorage.getItem("wis-settings")||"null");
    if(s){ if(PR_MAX[s.quality])state.quality=s.quality; if(Number.isFinite(s.sensitivity))state.sensitivity=clamp(s.sensitivity,.5,2); state.showFps=!!s.showFps; }
    else if(navigator.deviceMemory&&navigator.deviceMemory<=2)state.quality="low";   // zayıf cihaz: düşük başla
  }catch(e){}
}
function saveSettings(){try{localStorage.setItem("wis-settings",JSON.stringify({quality:state.quality,sensitivity:state.sensitivity,showFps:state.showFps}))}catch(e){}}
function applyPixelRatio(){renderer.setPixelRatio(perf.pr);renderer.setSize(innerWidth,innerHeight)}
function applyQuality(){
  perf.max=Math.min(devicePixelRatio||1,PR_MAX[state.quality]);perf.pr=perf.max;perf.cool=3;
  if(renderer)applyPixelRatio();
  if(env)env.setQuality(state.quality);
  $("fps").classList.toggle("hidden",!state.showFps);
}

/* ------------------------------------------------------------------ */
/* Sahne                                                               */
/* ------------------------------------------------------------------ */
function initScene(){
  scene=new THREE.Scene();
  camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.25,2000);
  renderer=new THREE.WebGLRenderer({antialias:state.quality!=="low",powerPreference:"high-performance"});
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  $("game-container").appendChild(renderer.domElement);
  renderer.domElement.addEventListener("webglcontextlost",e=>{e.preventDefault();showFatal(new Error("WebGL baglami kayboldu (ekran karti/surucu). Ayarlar'dan kaliteyi Dusuk yapip sayfayi yenileyin."))});
  renderer.domElement.addEventListener("webglcontextrestored",()=>location.reload());
  env=WI.createEnvironment({scene,camera,renderer,quality:state.quality});
  applyQuality();
  scene.add(camera);makePlayer();world=WI.createWorld({scene});world.addStatics(env.obstacles);spawnResources();initFlash();
  addEventListener("resize",resize);
  addEventListener("orientationchange",()=>setTimeout(resize,250));
}
function makePlayer(){
  human=WI.createHuman({quality:state.quality});
  player=human.root;
  scene.add(player);
  placeMenuPlayer();
}
function placeMenuPlayer(){
  const s=env.menuSpot;
  player.position.set(s.x,0,s.z);player.rotation.y=s.yaw;
  state.vel.x=state.vel.z=0;state.player.vy=0;state.player.onGround=true;
  human.reset();player.visible=true;
}
function spawnResources(){
  // Sabit tohumlu yerleşim: kayıtlı kaynak durumları (indeks) her açılışta aynı nesnelere denk gelir.
  const rnd=WI.mulberry32(777);
  const types=[["Wood",0x8d633e],["Stone",0x85877e],["Fiber",0x5d9c54],["Berries",0x8e4e9c],["Banana",0xe5c64b],["Coconut",0x79543b]];
  const shared={
    Wood:[new THREE.CylinderGeometry(.12,.15,1.5,6),new THREE.MeshStandardMaterial({color:types[0][1],roughness:.95})],
    Stone:[new THREE.DodecahedronGeometry(.55),new THREE.MeshStandardMaterial({color:types[1][1],roughness:1})]
  };
  const fruitGeo=new THREE.IcosahedronGeometry(.42);
  for(let i=0;i<75;i++){
    const type=types[i%types.length],a=rnd()*Math.PI*2,r=8+rnd()*88,x=Math.cos(a)*r,z=Math.sin(a)*r;
    let mesh;
    if(type[0]==="Wood"){mesh=addMesh(shared.Wood[0],shared.Wood[1],x,.55,z);mesh.rotation.set(0,rnd()*3,Math.PI/2);mesh.position.y=.18}
    else if(type[0]==="Stone")mesh=addMesh(shared.Stone[0],shared.Stone[1],x,.4,z);
    else {
      if(!shared[type[0]])shared[type[0]]=[fruitGeo,new THREE.MeshStandardMaterial({color:type[1],roughness:.8})];
      mesh=addMesh(shared[type[0]][0],shared[type[0]][1],x,.55,z);
    }
    mesh.castShadow=false;
    mesh.userData={type:type[0],active:true,baseY:mesh.position.y,i:state.resources.length};state.resources.push(mesh);
  }
}
let torchL=null,torchObj=null;
function initFlash(){
  torchL=new THREE.PointLight(0xffa040,0,16,2);scene.add(torchL);
  torchObj=new THREE.Group();{const st=new THREE.Mesh(new THREE.CylinderGeometry(.035,.045,.55,6),new THREE.MeshLambertMaterial({color:0x6a4a2c}));const fl=new THREE.Mesh(new THREE.ConeGeometry(.11,.3,6),new THREE.MeshBasicMaterial({color:0xff9a2a}));fl.position.y=.4;torchObj.add(st,fl);}torchObj.visible=false;scene.add(torchObj);
  flashL=new THREE.SpotLight(0xfff2cf,0,70,.5,.45,1.4);flashL.visible=false;flashL.position.set(0,0,0);
  const tg=new THREE.Object3D();tg.position.set(0,-.35,-12);camera.add(flashL);camera.add(tg);flashL.target=tg;
}
function resize(){if(!camera||!renderer)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)}

/* ------------------------------------------------------------------ */
/* Kamera                                                              */
/* ------------------------------------------------------------------ */
const _camTarget=new THREE.Vector3(), _look=new THREE.Vector3();
function snapCamera(){state.camera.snap=true}
function setFov(v){const c=state.camera;if(Math.abs(v-c.fov)>.02){c.fov=v;camera.fov=v;camera.updateProjectionMatrix()}}
function menuCamera(dt){
  const T=state.time,s=env.menuSpot,c=state.camera;
  const phi=0.15+0.62*Math.sin(T*0.075), dist=6.6+0.9*Math.sin(T*0.11+1), h=1.55+0.3*Math.sin(T*0.09);
  const fx=-Math.cos(phi), fz=-Math.sin(phi);              // kameradan karaktere bakış yönü
  const shift=dist*0.19;                                   // karakter ekranın solunda dursun (sağda menü var)
  _look.set(s.x+(-fz)*shift, 1.3, s.z+fx*shift);
  camera.position.set(s.x+Math.cos(phi)*dist+Math.sin(T*.7)*.03, h+Math.sin(T*.9)*.02, s.z+Math.sin(phi)*dist+Math.cos(T*.6)*.03);
  camera.lookAt(_look);
  setFov(c.fov+(48-c.fov)*smooth(3,dt));
}
const CAMS=[
  {id:"third",    name:"Üçüncü şahıs",              dist:8.5, look:1.4,  side:0,   pitchAdd:0,    fov:55},
  {id:"first",    name:"Birinci şahıs (oyuncunun gözü)", fp:true, fov:72},
  {id:"shoulder", name:"Omuz üstü (yakın)",         dist:3.4, look:1.55, side:.75, pitchAdd:-.12, fov:62},
  {id:"top",      name:"Kuş bakışı (yukarıdan)",    dist:20,  look:.6,   side:0,   pitchAdd:.55,  fov:50}
];
function cycleCamera(){
  state.camMode=(state.camMode+1)%CAMS.length;snapCamera();
  toast("📷 "+CAMS[state.camMode].name);
  try{localStorage.setItem("wis-cam",String(state.camMode))}catch(e){}
}
function gameCamera(dt){
  const p=player.position,c=state.camera,M=CAMS[state.camMode]||CAMS[0];
  const gh=world.groundHeight(p.x,p.z), fyT=gh+(p.y-gh)*.5;
  c.tPitch=clamp(c.tPitch,CAM_PITCH_MIN,CAM_PITCH_MAX);
  if(c.snap){c.yaw=c.tYaw;c.pitch=c.tPitch;c.fy=fyT}
  else{const k=smooth(26,dt);c.yaw+=(c.tYaw-c.yaw)*k;c.pitch+=(c.tPitch-c.pitch)*k;c.fy+=(fyT-c.fy)*smooth(7,dt)}
  c.intro=Math.max(0,c.intro-dt/1.9);
  const ie=ease(c.intro);
  c.fovBlend+=((state.loco.sprint&&state.loco.speed>4?1:0)-c.fovBlend)*smooth(3.5,dt);
  player.visible=!M.fp;                                    // birinci şahısta karakter gizlenir
  if(M.fp){
    const look=(c.pitch-.55)*1.5, fx=-Math.sin(c.yaw), fz=-Math.cos(c.yaw);   // look>0: aşağı bak
    const bob=state.loco.grounded?Math.sin(state.time*(state.loco.sprint?13:9))*Math.min(state.loco.speed,7)*.006:0;
    camera.position.set(p.x+fx*.22,p.y+1.62+bob,p.z+fz*.22);
    camera.lookAt(camera.position.x+fx*Math.cos(look),camera.position.y-Math.sin(look),camera.position.z+fz*Math.cos(look));
    c.snap=false;setFov(M.fov+5*c.fovBlend);return;
  }
  const pitch=clamp(c.pitch+M.pitchAdd+.22*ie,.05,1.35), dist=M.dist*(1+.85*ie*(M.dist>5?1:.3));
  const horizontal=Math.cos(pitch)*dist, rx=Math.cos(c.yaw), rz=-Math.sin(c.yaw);
  _camTarget.set(p.x+Math.sin(c.yaw)*horizontal+rx*M.side,Math.max(.9,c.fy+Math.sin(pitch)*dist+M.look),p.z+Math.cos(c.yaw)*horizontal+rz*M.side);
  _look.set(p.x+rx*M.side,c.fy+M.look,p.z+rz*M.side);
  if(c.snap){camera.position.copy(_camTarget);c.snap=false}
  else camera.position.lerp(_camTarget,smooth(18,dt));
  camera.lookAt(_look);
  setFov(M.fov+5*c.fovBlend+9*ie);
}

/* ------------------------------------------------------------------ */
/* Oyuncu / hayatta kalma                                              */
/* ------------------------------------------------------------------ */
function updatePlayer(dt){
  const m=(state.sleeping||state.dead)?{x:0,y:0}:state.move, len=Math.hypot(m.x,m.y), pl=state.player;
  const sprinting=state.sprint&&state.stats.energy>1;
  const speed=sprinting?7.5:4.2;
  // Hedef hız (kameraya göre); gerçek hız hedefe yumuşakça yaklaşır -> ani kalkış/duruş yok
  let tvx=0,tvz=0;
  if(len>.02){
    const x=m.x/Math.max(1,len),y=m.y/Math.max(1,len);
    const yaw=state.camera.yaw;
    const forwardX=-Math.sin(yaw),forwardZ=-Math.cos(yaw),rightX=Math.cos(yaw),rightZ=-Math.sin(yaw);
    tvx=(rightX*x+forwardX*(-y))*speed;tvz=(rightZ*x+forwardZ*(-y))*speed;
  }
  const v=state.vel,k=smooth(len>.02?14:18,dt);
  v.x+=(tvx-v.x)*k;v.z+=(tvz-v.z)*k;
  const sp=Math.hypot(v.x,v.z);
  if(sp>.01){
    let nx=player.position.x+v.x*dt,nz=player.position.z+v.z*dt;
    const r=Math.hypot(nx,nz);if(r>=98){nx*=97.9/r;nz*=97.9/r}   // ada sınırı: kenarda kayarak dur
    const q=world.pushOut(nx,nz,.38);nx=q.x;nz=q.z;               // ağaç, kaya, bina vb. içinden geçilmez
    player.position.x=nx;player.position.z=nz;
  }
  const prevRot=player.rotation.y;
  if(sp>.15){ // karakter hareket yönüne yumuşakça döner
    const want=Math.atan2(v.x,v.z);let d=want-player.rotation.y;d=Math.atan2(Math.sin(d),Math.cos(d));
    player.rotation.y+=d*smooth(sp>1?14:8,dt);
  }
  let dyaw=player.rotation.y-prevRot;dyaw=Math.atan2(Math.sin(dyaw),Math.cos(dyaw));
  const lo=state.loco;lo.yawRate+=(dyaw/Math.max(dt,1e-4)-lo.yawRate)*smooth(14,dt);
  if(len>.02){if(sprinting)state.stats.energy=Math.max(0,state.stats.energy-13*dt)}
  else state.stats.energy=Math.min(100,state.stats.energy+5*dt);
  // Zıplama
  const gh=world.groundHeight(player.position.x,player.position.z);
  if(!pl.onGround){pl.vy-=20*dt;player.position.y+=pl.vy*dt;if(player.position.y<=gh){player.position.y=gh;pl.onGround=true}}
  else player.position.y+=(gh-player.position.y)*Math.min(1,dt*20);
  lo.speed=sp;lo.sprint=sprinting&&len>.02;lo.grounded=pl.onGround;lo.vy=pl.vy;lo.input=len;
}
function jump(){const pl=state.player;if(pl.onGround&&state.mode==="game"&&!state.paused){pl.vy=6.4;pl.onGround=false}}
/* ================= 2.0: oyun mantığı (hayatta kalma, hayvanlar, inşaat, görev, çevrimiçi) ================= */
const RU = window.WI_RULES, FOODS = RU.FOOD;
const UNIQUE = new Set(["Axe","Spear","Bow","Flashlight","FishingRod","WaterBottle","Backpack","Club"]);
const WEAPONS = { Axe:{dmg:14,reach:2.6,cd:.6}, Spear:{dmg:22,reach:3.4,cd:.7}, Bow:{dmg:30,reach:32,cd:1.1,ranged:true}, Club:{dmg:11,reach:2.3,cd:.42}, Torch:{dmg:7,reach:2.2,cd:.5}, none:{dmg:4,reach:1.9,cd:.5} };
const ICONS = {Wood:"🪵",Stone:"🪨",Fiber:"🌿",Berries:"🫐",Banana:"🍌",Coconut:"🥥",Axe:"🪓",Spear:"🔱",Bow:"🏹",Arrow:"➳",Flashlight:"🔦",Backpack:"🎒",FishingRod:"🎣",WaterBottle:"🧴",RawMeat:"🥩",CookedMeat:"🍖",RawFish:"🐟",CookedFish:"🍣",DirtyWater:"💧",CleanWater:"🚰",RadioPart:"📻",Torch:"🔥",Club:"🏏"};
const FOOD_ORDER = ["Banana","Coconut","Berries","CookedMeat","CookedFish","RawMeat","RawFish"];
let world = null, flashL = null, remotes = new Map(), net = null;
const online = state.online = { on:false, id:null, host:false, code:null, players:[], hostId:null, reconnected:false };
state.stats.temp = 36.6; state.equipped = null; state.dayCount = 0; state.quest = {step:0,prog:0}; state.counters = {supplies:0};
state.sleeping = false; state.wet = 0; state.flash = false; state.fishT = 0; state.atkCd = 0; state.rescueT = 0; state.dead = false; state.win = false; state.lastRegion = "beach";
const inGame = () => state.mode === "game" && !state.paused && !state.dead;
const isHostOrSolo = () => !online.on || online.host;
const REGION_IDS = ["beach","forest","river","falls","cave","camp","radio","tower"];
const regName = id => t("reg_" + id);
function invCount(){ let n=0; for(const [k,v] of Object.entries(state.inventory)) if(!UNIQUE.has(k)) n+=v; return n; }
function invCap(){ return 30 + (state.inventory.Backpack ? 30 : 0); }
function invAdd(k, n=1){ state.inventory[k] = (state.inventory[k]||0) + n; }
function invSub(k, n=1){ state.inventory[k] = Math.max(0,(state.inventory[k]||0) - n); }
const hasAll = (cost, mul=1) => Object.entries(cost).every(([k,v]) => (state.inventory[k]||0) >= v*mul);
function costText(c){ return Object.entries(c).filter(([k,v])=>v).map(([k,v]) => (ICONS[k]||"")+itemName(k)+" "+v+"/"+(state.inventory[k]||0)).join("  "); }
const nsend = o => { if(online.on && net) net.send(o); };

/* ---------- Hayatta kalma ---------- */
function updateStats(){
  const s = state.stats;
  for(const key of ["health","food","water","energy"]){ const v=s[key]; $(key+"-val").textContent=Math.round(v); $(key+"-fill").style.width=v+"%"; $(key+"-fill").closest(".stat").classList.toggle("low", v<25); }
  const tp = s.temp, pct = clamp((tp-32)/(37-32)*100,0,100); $("temp-val").textContent = tp.toFixed(1); $("temp-fill").style.width = pct+"%"; $("temp-fill").closest(".stat").classList.toggle("low", tp<35.3);
}
function damage(n, src){
  if(state.dead || state.win || n<=0) return;
  state.stats.health = Math.max(0, state.stats.health - n); if(state.sleeping) wake();
  if(WI.audio) WI.audio.sfx.hurt(); const v = $("fade"); v.classList.add("hurt"); setTimeout(()=>v.classList.remove("hurt"),180);
  if(src) toast(t("hurt_by",{sp:t("sp_"+src)}));
  if(state.stats.health <= 0) die();
}
function die(){ const dp=$("dead-modal").querySelector(".quit-text"); if(dp) dp.textContent = (state.gameMode==="survival") ? t("dead_surv",{n:state.dayCount+1}) : t("dead_text"); state.dead = true; resetInputs(); wake(true); showModal("dead-modal"); }
function respawn(){
  hideModal("dead-modal"); const s = state.stats; s.health = 60; s.food = Math.max(s.food, 50); s.water = Math.max(s.water, 50); s.energy = Math.max(s.energy, 50); s.temp = 36.4;
  player.position.set(0,0,10); state.vel.x=state.vel.z=0; state.dead = false; snapCamera(); state.last = performance.now(); updateStats();
}
function wake(silent){ if(!state.sleeping) return; state.sleeping=false; $("sleep-veil").classList.remove("on"); if(!silent) toast(t("slept")); }
function startSleep(){
  if(!inGame()) return; const p = player.position;
  if(!(world.inShelter(p.x,p.z) || world.nearFire(p.x,p.z,6))){ toast(t("cant_sleep")); return; }
  if(state.sleeping){ wake(); return; }
  state.sleeping = true; state.vel.x = state.vel.z = 0; $("sleep-veil").classList.add("on"); toast(t("sleeping"));
}
function onNewDay(){ if(state.gameMode==="survival") bestDays(state.dayCount+1); toast(t("day_n",{n:state.dayCount+1})); if(isHostOrSolo()) nsend({t:"time",day:state.day,dayCount:state.dayCount,rain:world.weather.rain>.2,storm:world.weather.storm}); }
function raidTick(dt){
  const n=env.state.wN;
  if(!state.raidOn && n>.65){ state.raidOn=true; state.raidT=0; startRaid(); }
  else if(state.raidOn && n<.3){ state.raidOn=false; for(const a of world.animals) if(a.raider){ a.raider=false; a.aggro=0; } toast(t("raid_end")); }
  if(state.raidOn){ state.raidT+=dt; if((state.raidT%20)<dt){ for(const a of world.animals) if(a.raider&&a.state!=="dead") a.aggro=Math.max(a.aggro,30); } }
}
function startRaid(){
  const n=state.dayCount, pp=playersPos(), want={wolf:Math.min(4,2+n), bear:n>=4?2:n>=2?1:0};
  for(const sp of ["wolf","bear"]){ let k=want[sp];
    for(const a of world.animals){ if(k<=0) break; if(a.sp!==sp||a.state==="dead") continue; k--;
      const p=pp[Math.floor(Math.random()*pp.length)], ang=Math.random()*6.283, d=34+Math.random()*12; let x=p.x+Math.cos(ang)*d, z=p.z+Math.sin(ang)*d; const r=Math.hypot(x,z); if(r>92){ x*=92/r; z*=92/r; }
      a.x=x; a.z=z; a.state="chase"; a.aggro=30; a.raider=true; a.mesh.position.set(x,0,z); } }
  toast(t("raid_warn")); WI.audio&&WI.audio.sfx.animal("wolf",4);
}
function updateSurvival(dt){
  world.survival = state.gameMode==="survival"; if(world.survival && isHostOrSolo()) raidTick(dt);
  if(state.torch && !online.on){ state.torchT+=dt; if(state.torchT>=300){ state.torchT=0; invSub("Torch"); if(!(state.inventory.Torch>0)){ state.equipped=null; state.torch=false; updateUseIcon(); } toast(t("torch_out")); renderInventory(); } }
  const s = state.stats, p = player.position, W = world.weather, night = env.state.wN, ts = state.sleeping && !online.on ? 25 : 1;
  state.elapsed += dt;
  // zaman: tek oyuncu / oda sahibi saati yürütür, diğerleri oda sahibinin saatine yumuşak uyar
  state.day += dt*ts/360; if(state.day>=1){ state.day-=1; if(isHostOrSolo()){ state.dayCount++; onNewDay(); } }
  world.dayCount = state.dayCount; world.nightF = night;
  const shelter = world.inShelter(p.x,p.z), fire = world.nearFire(p.x,p.z,7);
  // ıslanma ve sıcaklık
  state.wet = clamp(state.wet + ((W.rain>.2 && !shelter ? .06 : -.04)*dt*ts), 0, 1);
  const ambient = 12 + 17*(1-night) - W.rain*6 - W.storm*4 - state.wet*5 + (shelter?6:0) + (fire?13:0);
  const target = ambient >= 18 ? 36.6 : 36.6 - (18-ambient)*.24;
  s.temp += (target - s.temp) * Math.min(1, dt*ts*.06);
  const moving = Math.hypot(state.vel.x,state.vel.z) > .5, sprint = state.loco.sprint;
  const k = dt*ts, eff = state.sleeping ? .6 : 1;
  s.food = Math.max(0, s.food - (.055 + (sprint?.05:0))*k*eff*(1+Math.max(0,35.5-s.temp)*.15));
  s.water = Math.max(0, s.water - (.085 + (sprint?.07:0))*k*eff);
  if(state.sleeping){ s.energy = Math.min(100, s.energy + (online.on?3:2.2)*dt*(shelter||fire?1.3:1)); if(s.energy>=99 || state.stats.health<=0) wake(); }
  let drain = 0; if(s.food===0) drain += 1.0; if(s.water===0) drain += 1.3; if(s.temp<35.2) drain += (35.2-s.temp)*.9; if(s.energy<=0) drain += .5;
  if(drain>0){ s.heal
