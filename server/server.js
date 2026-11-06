"use strict";
/* WILD ISLAND: SURVIVAL — gerçek zamanlı oyun sunucusu (WebSocket, 'ws').
   Sunucu: oda yönetimi, oyuncu/oda doğrulaması, envanter/kaynak/inşa doğrulaması, bağlantı kopması ve yeniden bağlanma,
   oda dünyasının diske kaydı. Hayvan simülasyonu oda sahibinde (host) çalışır, sunucu onu doğrulayıp yayar. */
const http = require("http"), fs = require("fs"), path = require("path"), crypto = require("crypto");
const { WebSocketServer } = require("ws");
const R = require("../shared/rules.js");

const PORT = Number(process.env.PORT || 8080);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const MAX_PLAYERS = 4, RESOURCE_COUNT = 75, RECONNECT_MS = 5 * 60 * 1000, MAX_MSG = 4096, MSG_PER_SEC = 40;
const NAME_RE = /[^\p{L}\p{N} _.-]/gu;
fs.mkdirSync(DATA_DIR, { recursive: true });

const rooms = new Map();           // kod -> oda
const rid = n => crypto.randomBytes(n).toString("hex");
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const num = (v, d = 0) => (Number.isFinite(v) ? v : d);

function newCode() {
  for (let i = 0; i < 200; i++) { const c = "WILD-" + (1000 + crypto.randomInt(9000)); if (!rooms.has(c) && !fs.existsSync(roomFile(c))) return c; }
  throw new Error("kod üretilemedi");
}
const cleanCode = v => { const c = String(v || "").toUpperCase().trim().replace(/\s+/g, "-").replace(/[^A-Z0-9-]/g, ""); return /^[A-Z0-9][A-Z0-9-]{2,15}$/.test(c) ? c : null; };
const roomFile = c => path.join(DATA_DIR, c.replace(/[^A-Z0-9-]/g, "") + ".json");
const startInv = () => ({ Banana: 3, Coconut: 2 });
const startStats = () => ({ health: 100, food: 100, water: 100, energy: 100, temp: 36.6 });

function makeRoom(isPublic, customCode, mode) {
  const code = customCode || newCode();
  const room = { code, mode: mode === "survival" ? "survival" : "story", isPublic: !!isPublic, started: false, host: null, players: new Map(), resources: new Uint8Array(RESOURCE_COUNT).fill(1),
    buildings: [], nextBid: 1, quest: { step: 0, prog: 0, found: {} }, day: 0.25, dayCount: 0, created: Date.now(), dirty: false, saved: {} };
  rooms.set(code, room); return room;
}
function loadRoom(code) {
  try {
    const d = JSON.parse(fs.readFileSync(roomFile(code), "utf8"));
    const room = makeRoom(false); rooms.delete(room.code); room.code = code; rooms.set(code, room);
    room.resources = Uint8Array.from(d.resources || []); if (room.resources.length !== RESOURCE_COUNT) room.resources = new Uint8Array(RESOURCE_COUNT).fill(1);
    room.buildings = d.buildings || []; room.nextBid = d.nextBid || 1; room.quest = d.quest || room.quest; room.day = d.day || 0.25; room.dayCount = d.dayCount || 0;
    room.saved = d.saved || {}; room.mode = d.mode === "survival" ? "survival" : "story"; return room;
  } catch (e) { return null; }
}
function saveRoom(room) {
  if (!room.dirty) return; room.dirty = false;
  const saved = Object.assign({}, room.saved);
  for (const p of room.players.values()) saved[p.id] = { token: p.token, inv: p.inv, stats: p.stats, pos: p.pos };
  room.saved = saved;
  const d = { mode: room.mode, resources: Array.from(room.resources), buildings: room.buildings, nextBid: room.nextBid, quest: room.quest, day: room.day, dayCount: room.dayCount, saved };
  fs.writeFile(roomFile(room.code), JSON.stringify(d), () => {});
}
setInterval(() => { for (const r of rooms.values()) saveRoom(r); }, 10000).unref();

const send = (ws, o) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };
const bcast = (room, o, except) => { const s = JSON.stringify(o); for (const p of room.players.values()) if (p.ws && p.ws !== except && p.ws.readyState === 1 && p.connected) p.ws.send(s); };
const roster = room => [...room.players.values()].map(p => ({ id: p.id, name: p.name, host: p.id === room.host, connected: p.connected, ready: true }));
const sendRoster = room => bcast(room, { t: "roster", code: room.code, mode: room.mode, started: room.started, players: roster(room), host: room.host });
const sendInv = p => send(p.ws, { t: "inv", inv: p.inv });
const has = (inv, cost, mul = 1) => Object.entries(cost).every(([k, v]) => (inv[k] || 0) >= v * mul);
const pay = (inv, cost) => { for (const [k, v] of Object.entries(cost)) if (v) inv[k] = (inv[k] || 0) - v; };
const give = (inv, k, n = 1) => { inv[k] = (inv[k] || 0) + n; };

function removePlayer(room, p, why) {
  room.players.delete(p.id); room.dirty = true;
  if (p.ws) { try { send(p.ws, { t: "left", why }); } catch (e) {} p.ws.room = null; p.ws.player = null; }
  if (room.players.size === 0) { saveRoom(room); room.dirty = true; saveRoom(room); rooms.delete(room.code); return; }
  if (room.host === p.id) { room.host = [...room.players.values()].find(x => x.connected)?.id || [...room.players.keys()][0]; bcast(room, { t: "host", id: room.host }); }
  bcast(room, { t: "gone", id: p.id }); sendRoster(room);
}
function joinRoom(ws, room, name, resume) {
  if (resume && room.players.has(resume.id)) {
    const p = room.players.get(resume.id);
    if (p.token === resume.token) { clearTimeout(p.timer); if (p.ws && p.ws !== ws) try { p.ws.close(); } catch (e) {} p.ws = ws; p.connected = true; ws.room = room; ws.player = p; return p; }
  }
  if (room.players.size >= MAX_PLAYERS) return null;
  const id = rid(4), token = rid(16), s = room.saved[resume && resume.id] || null;
  let p;
  if (resume && s && s.token === resume.token) { p = { id: resume.id, token: s.token, inv: s.inv, stats: s.stats, pos: s.pos }; }
  else p = { id, token, inv: startInv(), stats: startStats(), pos: { x: 0, z: 10 } };
  Object.assign(p, { name, ws, connected: true, lastMsg: 0, cnt: 0, cntT: 0, rot: 0, anim: { sp: 0, sprint: 0, air: 0 }, hp: 100, joined: Date.now() });
  room.players.set(p.id, p); if (!room.host) room.host = p.id;
  ws.room = room; ws.player = p; room.dirty = true; return p;
}
const cleanName = n => (String(n || "").replace(NAME_RE, "").trim().slice(0, 16)) || "Oyuncu" + crypto.randomInt(100, 999);
const welcome = (room, p, ws) => send(ws, { t: "welcome", code: room.code, mode: room.mode, id: p.id, token: p.token, host: room.host, started: room.started,
  players: roster(room), inv: p.inv, stats: p.stats, pos: p.pos, resources: Array.from(room.resources), buildings: room.buildings, quest: room.quest, day: room.day, dayCount: room.dayCount });

const HANDLERS = {
  create(ws, m) {
    if (ws.room) return send(ws, { t: "error", code: "already", msg: "Zaten bir odadasın." });
    let custom = null;
    if (m.code != null && String(m.code).trim() !== "") {
      custom = cleanCode(m.code);
      if (!custom) return send(ws, { t: "error", code: "badcode", msg: "Oda kodu 3-16 karakter olmalı (harf, rakam, tire)." });
      if (rooms.has(custom) || fs.existsSync(roomFile(custom))) return send(ws, { t: "error", code: "taken", msg: "Bu oda kodu kullanımda. Başka bir kod yaz." });
    }
    const room = makeRoom(!!m.public, custom, m.mode); const p = joinRoom(ws, room, cleanName(m.name)); welcome(room, p, ws); sendRoster(room);
  },
  join(ws, m) {
    if (ws.room) return send(ws, { t: "error", code: "already", msg: "Zaten bir odadasın." });
    const code = cleanCode(m.code);
    if (!code) return send(ws, { t: "error", code: "badcode", msg: "Geçersiz oda kodu biçimi." });
    let room = rooms.get(code) || (m.resume ? loadRoom(code) : null);
    if (!room) return send(ws, { t: "error", code: "notfound", msg: "Oda bulunamadı." });
    const resume = m.resume && typeof m.resume.id === "string" && typeof m.resume.token === "string" ? m.resume : null;
    const wasIn = resume && (room.players.has(resume.id) || room.saved[resume.id]);
    if (room.started && !wasIn) return send(ws, { t: "error", code: "started", msg: "Oyun başlamış, katılamazsın." });
    const p = joinRoom(ws, room, cleanName(m.name), resume);
    if (!p) return send(ws, { t: "error", code: "full", msg: "Oda dolu (en fazla 4 oyuncu)." });
    welcome(room, p, ws); bcast(room, { t: "joined", id: p.id, name: p.name }, ws); sendRoster(room);
  },
  quick(ws, m) {
    if (ws.room) return send(ws, { t: "error", code: "already", msg: "Zaten bir odadasın." });
    let room = [...rooms.values()].find(r => r.isPublic && !r.started && r.players.size < MAX_PLAYERS);
    if (!room) room = makeRoom(true);
    const p = joinRoom(ws, room, cleanName(m.name)); welcome(room, p, ws); bcast(room, { t: "joined", id: p.id, name: p.name }, ws); sendRoster(room);
  },
  leave(ws) { if (ws.room) removePlayer(ws.room, ws.player, "leave"); },
  start(ws) {
    const room = ws.room; if (!room || room.host !== ws.player.id) return send(ws, { t: "error", code: "nothost", msg: "Sadece oda sahibi başlatabilir." });
    room.started = true; room.dirty = true; bcast(room, { t: "start" }); send(ws, { t: "start" });
  },
  kick(ws, m) {
    const room = ws.room; if (!room || room.host !== ws.player.id) return send(ws, { t: "error", code: "nothost", msg: "Sadece oda sahibi çıkarabilir." });
    const p = room.players.get(String(m.id)); if (!p || p.id === room.host) return;
    removePlayer(room, p, "kicked");
  },
  pos(ws, m) {
    const room = ws.room, p = ws.player; if (!room || !room.started) return;
    const x = clamp(num(m.x), -R.ISLAND_LIMIT, R.ISLAND_LIMIT), z = clamp(num(m.z), -R.ISLAND_LIMIT, R.ISLAND_LIMIT);
    const now = Date.now(), dt = Math.max(0.05, (now - (p.lastPos || now - 100)) / 1000);
    if (p.lastPos && Math.hypot(x - p.pos.x, z - p.pos.z) > 14 * dt + 3) return send(ws, { t: "snap", x: p.pos.x, z: p.pos.z }); // ışınlanma/hız hilesi: geri al
    p.lastPos = now; p.pos = { x, z }; p.rot = num(m.r); p.y = clamp(num(m.y), 0, 4);
    p.anim = { sp: clamp(num(m.sp), 0, 9), sprint: m.sprint ? 1 : 0, air: m.air ? 1 : 0 };
    const st = m.stats; if (st && typeof st === "object") for (const k of ["health", "food", "water", "energy"]) if (Number.isFinite(st[k])) p.stats[k] = clamp(st[k], 0, 100);
    if (st && Number.isFinite(st.temp)) p.stats.temp = clamp(st.temp, 25, 42);
  },
  collect(ws, m) {
    const room = ws.room, p = ws.player; if (!room || !room.started) return;
    const i = m.i | 0, type = String(m.type);
    if (i < 0 || i >= RESOURCE_COUNT || !room.resources[i]) return send(ws, { t: "collect_no", i });
    if (Math.hypot(num(m.x) - p.pos.x, num(m.z) - p.pos.z) > 8) return; // konum tutarlılığı
    const kinds = ["Wood", "Stone", "Fiber", "Berries", "Banana", "Coconut"]; // dünya düzeni sabit tohumlu: i % 6 türü belirler
    const real = kinds[i % kinds.length]; if (type !== real) return;
    room.resources[i] = 0; room.dirty = true; give(p.inv, real); sendInv(p);
    bcast(room, { t: "res", i, by: p.id }); send(ws, { t: "res", i, by: p.id });
  },
  craft(ws, m) {
    const p = ws.player; if (!p) return; const rc = R.RECIPES[String(m.id)]; if (!rc) return;
    if (!has(p.inv, rc.cost)) return send(ws, { t: "error", code: "need", msg: "Yetersiz malzeme." });
    pay(p.inv, rc.cost); give(p.inv, rc.out, rc.n || 1); ws.room.dirty = true; sendInv(p);
  },
  build(ws, m) {
    const room = ws.room, p = ws.player; if (!room || !room.started) return; const b = R.BUILDS[String(m.type)]; if (!b) return;
    const x = clamp(num(m.x), -R.ISLAND_LIMIT, R.ISLAND_LIMIT), z = clamp(num(m.z), -R.ISLAND_LIMIT, R.ISLAND_LIMIT);
    if (room.buildings.length >= R.MAX_BUILDS) return send(ws, { t: "error", code: "limit", msg: "Yapı sınırına ulaşıldı." });
    if (Math.hypot(x - p.pos.x, z - p.pos.z) > 10) return send(ws, { t: "error", code: "far", msg: "Çok uzağa inşa edilemez." });
    if (room.buildings.some(o => Math.hypot(o.x - x, o.z - z) < R.PLACE_MIN_DIST + R.BUILDS[o.type].r)) return send(ws, { t: "error", code: "blocked", msg: "Burada başka yapı var." });
    if (!has(p.inv, b.cost)) return send(ws, { t: "error", code: "need", msg: "Yetersiz malzeme." });
    pay(p.inv, b.cost); const o = { id: room.nextBid++, type: String(m.type), x, z, r: num(m.r), by: p.id, store: {} };
    room.buildings.push(o); room.dirty = true; sendInv(p); bcast(room, { t: "built", b: o }); send(ws, { t: "built", b: o });
  },
  chest(ws, m) { // depolama sandığı: yatır/çek
    const room = ws.room, p = ws.player; if (!room) return; const b = room.buildings.find(o => o.id === (m.id | 0) && o.type === "Chest"); if (!b) return;
    if (Math.hypot(b.x - p.pos.x, b.z - p.pos.z) > 7) return; const k = String(m.item); if (!/^[A-Za-z]{2,20}$/.test(k)) return;
    if (m.dir === "put") { if ((p.inv[k] || 0) < 1) return; p.inv[k]--; b.store[k] = (b.store[k] || 0) + 1; }
    else if (m.dir === "take") { if ((b.store[k] || 0) < 1) return; b.store[k]--; give(p.inv, k); }
    else return; room.dirty = true; sendInv(p); const o = { t: "chest", id: b.id, store: b.store }; bcast(room, o); send(ws, o);
  },
  consume(ws, m) {
    const p = ws.player; if (!p) return; const k = String(m.item), f = R.FOOD[k]; if (!f || (p.inv[k] || 0) < 1) return;
    p.inv[k]--; sendInv(p); ws.room.dirty = true;
  },
  inv(ws, m) { // kısıtlı istemci kaynaklı değişiklikler: yalnızca sunucunun izin verdiği dönüşümler (pişirme, balık, av, su, temiz su, radyo)
    const p = ws.player; if (!p) return; const a = String(m.a), inv = p.inv;
    const T = { cook_meat: [{ RawMeat: 1 }, "CookedMeat"], cook_fish: [{ RawFish: 1 }, "CookedFish"], purify: [{ DirtyWater: 1 }, "CleanWater"] };
    if (T[a]) { if (!has(inv, T[a][0])) return; pay(inv, T[a][0]); give(inv, T[a][1]); }
    else if (a === "fill_dirty") { if (!inv.WaterBottle || (inv.DirtyWater || 0) + (inv.CleanWater || 0) >= inv.WaterBottle * 2) return; give(inv, "DirtyWater"); }
    else if (a === "drink") { const k = m.item === "CleanWater" ? "CleanWater" : "DirtyWater"; if ((inv[k] || 0) < 1) return; inv[k]--; }
    else if (a === "hunt") { const n = clamp(m.n | 0, 1, 3); const rate = Date.now() - (p.lastHunt || 0); if (rate < 1500) return; p.lastHunt = Date.now(); give(inv, "RawMeat", n); }
    else if (a === "fish") { if (!inv.FishingRod) return; give(inv, "RawFish"); }
    else if (a === "part") { const i = m.i | 0; const room = ws.room; if (i < 0 || i > 8) return; room.quest.found = room.quest.found || {}; if (room.quest.found[i]) return; room.quest.found[i] = 1; give(inv, "RadioPart"); room.dirty = true; bcast(room, { t: "part", i }); send(ws, { t: "part", i }); }
    else if (a === "rain") { if (Date.now() - (p.lastRain || 0) < 15000) return; p.lastRain = Date.now(); give(inv, "CleanWater"); }
    else if (a === "arrow") { if ((inv.Arrow || 0) < 1) return; inv.Arrow--; }
    else if (a === "fuel") { if ((inv.Wood || 0) < 1) return; inv.Wood--; }
    else if (a === "signal") { if ((inv.RadioPart || 0) < 3) return; inv.RadioPart -= 3; }
    else return; sendInv(p); ws.room.dirty = true;
  },
  quest(ws, m) {
    const room = ws.room; if (!room) return; const q = room.quest, step = m.step | 0, prog = num(m.prog);
    if (step === q.step + 1 && step <= R.QUESTS.length) { q.step = step; q.prog = 0; room.dirty = true; bcast(room, { t: "quest", quest: q }); send(ws, { t: "quest", quest: q }); }
    else if (step === q.step && prog > q.prog && prog <= R.QUESTS[clamp(step, 0, R.QUESTS.length - 1)].goal) { q.prog = prog; bcast(room, { t: "quest", quest: q }, ws); }
  },
  animals(ws, m) { // yalnızca oda sahibi hayvan durumunu yayınlar
    const room = ws.room; if (!room || room.host !== ws.player.id || !Array.isArray(m.a)) return;
    bcast(room, { t: "animals", a: m.a.slice(0, 64) }, ws);
  },
  hit(ws, m) { const room = ws.room; if (!room) return; const h = room.players.get(room.host); if (h && h.ws !== ws) send(h.ws, { t: "hit", id: m.id | 0, dmg: clamp(num(m.dmg), 0, 40), by: ws.player.id }); },
  hurt(ws, m) { // yalnızca oda sahibi, hayvan hasarını ilgili oyuncuya iletir (üst sınırlı)
    const room = ws.room; if (!room || room.host !== ws.player.id) return; const v = room.players.get(String(m.to)); if (v) send(v.ws, { t: "hurt", dmg: clamp(num(m.dmg), 0, 25) });
  },
  time(ws, m) { const room = ws.room; if (!room || room.host !== ws.player.id) return; room.day = clamp(num(m.day), 0, 1); room.dayCount = clamp(m.dayCount | 0, 0, 999); room.dirty = true; bcast(room, { t: "time", day: room.day, dayCount: room.dayCount, rain: m.rain ? 1 : 0, storm: m.storm ? 1 : 0 }, ws); },
  ping(ws, m) { send(ws, { t: "pong", c: m.c }); },
  chat(ws, m) { const room = ws.room; if (!room) return; bcast(room, { t: "chat", id: ws.player.id, name: ws.player.name, text: String(m.text || "").slice(0, 120) }); }
};

const server = http.createServer((req, res) => {
  if (req.url === "/health") { res.writeHead(200, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: true, rooms: rooms.size })); }
  res.writeHead(404); res.end();
});
const wss = new WebSocketServer({ server, maxPayload: MAX_MSG });
const allowed = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
let alive = 0;
wss.on("connection", (ws, req) => {
  const origin = req.headers.origin;
  if (allowed.length && origin && !allowed.includes(origin)) return ws.close(1008, "origin");
  ws.isAlive = true; ws.on("pong", () => { ws.isAlive = true; }); ws.room = null; ws.player = null; ws.win = { t: 0, n: 0 };
  ws.on("message", raw => {
    const now = Date.now(); if (now - ws.win.t > 1000) { ws.win.t = now; ws.win.n = 0; } if (++ws.win.n > MSG_PER_SEC) return; // istek sınırlama
    let m; try { m = JSON.parse(raw); } catch (e) { return; } if (!m || typeof m.t !== "string") return;
    const h = HANDLERS[m.t]; if (!h || !Object.prototype.hasOwnProperty.call(HANDLERS, m.t)) return;
    if (!ws.room && !["create", "join", "quick", "ping"].includes(m.t)) return;
    try { h(ws, m); } catch (e) { console.error("handler", m.t, e); }
  });
  ws.on("close", () => {
    const room = ws.room, p = ws.player; if (!room || !p || p.ws !== ws) return;
    p.connected = false; bcast(room, { t: "dc", id: p.id }); sendRoster(room);
    if (room.host === p.id) { const n = [...room.players.values()].find(x => x.connected); if (n) { room.host = n.id; bcast(room, { t: "host", id: n.id }); sendRoster(room); } }
    p.timer = setTimeout(() => { if (!p.connected && room.players.get(p.id) === p) removePlayer(room, p, "timeout"); }, RECONNECT_MS);
  });
});
// Anlık oyuncu durumu yayını (10 Hz): sunucu doğrulanmış konumları dağıtır
setInterval(() => {
  for (const room of rooms.values()) if (room.started) {
    const list = [...room.players.values()].filter(p => p.connected).map(p => ({ id: p.id, x: +p.pos.x.toFixed(2), z: +p.pos.z.toFixed(2), y: +(p.y || 0).toFixed(2), r: +p.rot.toFixed(2), sp: p.anim.sp, sprint: p.anim.sprint, air: p.anim.air, h: Math.round(p.stats.health), f: Math.round(p.stats.food), w: Math.round(p.stats.water), e: Math.round(p.stats.energy) }));
    bcast(room, { t: "state", p: list });
  }
}, 100).unref();
setInterval(() => { wss.clients.forEach(ws => { if (!ws.isAlive) return ws.terminate(); ws.isAlive = false; ws.ping(); }); }, 20000).unref();

if (require.main === module) server.listen(PORT, () => console.log("WILD ISLAND sunucusu :" + PORT));
module.exports = { server, rooms, wss };
                                                               
