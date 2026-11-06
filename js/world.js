/* WILD ISLAND 2.0 — dünya: bölgeler, yer işaretleri, hayvanlar (YZ + animasyon), yapılar, hava durumu */
(() => {
"use strict";
const WI = (window.WI = window.WI || {});
const R = window.WI_RULES;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const angDiff = d => Math.atan2(Math.sin(d), Math.cos(d));

/* Bölgeler: merkez + yarıçap (düz ada üzerinde, görsel yer işaretleriyle işaretli) */
const REGIONS = [
  { id: "beach",  x: 0,   z: 10,  r: 0 },
  { id: "forest", x: -42, z: -34, r: 26 },
  { id: "river",  x: 34,  z: 4,   r: 9 },
  { id: "falls",  x: 40,  z: -48, r: 11 },
  { id: "cave",   x: 62,  z: -28, r: 10 },
  { id: "camp",   x: -15, z: -18, r: 11 },
  { id: "radio",  x: 52,  z: 44,  r: 13 },
  { id: "tower",  x: 0,   z: -84, r: 13 }
];
const PARTS = [ // 9 radyo parçası: kamp (0-2), radyo istasyonu (3-5), mağara (6-8)
  [-18, -21], [-12, -15], [-16, -14], [49, 41], [56, 47], [53, 38], [60, -26], [64, -31], [66, -25]
];

const SPECIES = {
  wolf:  { hp: 60,  walk: 2.2, run: 7.4, sense: 20, dmg: 9,  danger: true,  meat: 2, home: [-30, -50, 18], count: 4 },
  bear:  { hp: 150, walk: 1.6, run: 6.2, sense: 12, dmg: 22, danger: true,  meat: 4, home: [-58, -8, 14], count: 2 },
  croc:  { hp: 120, walk: 1.2, run: 5.6, sense: 8,  dmg: 18, danger: true,  meat: 3, home: [34, 4, 7],    count: 2 },
  snake: { hp: 20,  walk: 1.0, run: 3.6, sense: 4.5,dmg: 7,  danger: true,  meat: 1, home: [-48, -42, 20],count: 4 },
  deer:  { hp: 50,  walk: 1.8, run: 8.4, sense: 16, dmg: 0,  danger: false, meat: 3, home: [20, 36, 22],  count: 5 },
  rabbit:{ hp: 15,  walk: 1.4, run: 6.8, sense: 10, dmg: 0,  danger: false, meat: 1, home: [-20, 40, 24], count: 7 },
  bird:  { hp: 10,  walk: 2.0, run: 9.0, sense: 14, dmg: 0,  danger: false, meat: 1, home: [0, 30, 40],   count: 8 }
};
const SPECIES_IDS = Object.keys(SPECIES);

WI.createWorld = function (ctx) {
  const T = window.THREE, scene = ctx.scene;
  const mats = {};
  const mat = (c, e) => { const k = c + "|" + (e || 0); return mats[k] || (mats[k] = new T.MeshLambertMaterial(e ? { color: c, emissive: e } : { color: c })); };
  const box = (w, h, d, c, x = 0, y = 0, z = 0, parent) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat(c)); m.position.set(x, y, z); m.castShadow = true; if (parent) parent.add(m); return m; };
  const cyl = (rt, rb, h, c, x, y, z, parent, seg = 7) => { const m = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg), mat(c)); m.position.set(x, y, z); m.castShadow = true; if (parent) parent.add(m); return m; };
  const cone = (r, h, c, x, y, z, parent, seg = 6) => { const m = new T.Mesh(new T.ConeGeometry(r, h, seg), mat(c)); m.position.set(x, y, z); m.castShadow = true; if (parent) parent.add(m); return m; };

  /* ============================ YER İŞARETLERİ ============================ */
  const landmarks = new T.Group(); scene.add(landmarks);
  const partMeshes = [];
  const towerLight = new T.Mesh(new T.SphereGeometry(.5, 8, 6), new T.MeshBasicMaterial({ color: 0xff3322 }));
  function buildLandmarks() {
    // Nehir (kıvrımlı şerit) + şelale
    const riverMat = new T.MeshLambertMaterial({ color: 0x3f9fd0, transparent: true, opacity: .82 });
    for (let i = 0; i < 22; i++) {
      const z = 52 - i * 5.2, x = 34 + Math.sin(i * .5) * 6;
      const seg = new T.Mesh(new T.PlaneGeometry(6.5, 6.2), riverMat); seg.rotation.x = -Math.PI / 2; seg.rotation.z = Math.cos(i * .5) * .3; seg.position.set(x, .05, z); landmarks.add(seg);
    }
    const cliff = box(14, 12, 6, 0x6c6a63, 40, 6, -56, landmarks); cliff.rotation.y = .05;
    box(3.2, 11, .6, 0xcfe9f5, 40, 6, -52.8, landmarks).material = new T.MeshLambertMaterial({ color: 0xcfeaf7, transparent: true, opacity: .8 });
    const pool = new T.Mesh(new T.CircleGeometry(7, 20), riverMat); pool.rotation.x = -Math.PI / 2; pool.position.set(40, .06, -47); landmarks.add(pool);
    // Mağara
    const dome = new T.Mesh(new T.SphereGeometry(7, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x77746c)); dome.position.set(62, 0, -28); dome.castShadow = true; landmarks.add(dome);
    const hole = new T.Mesh(new T.CircleGeometry(2.2, 14), new T.MeshBasicMaterial({ color: 0x050505 })); hole.position.set(62, 2.2, -21.1); landmarks.add(hole);
    // Terk edilmiş kamp: çadır, sönmüş ateş, sandık
    const tent = cone(3, 3, 0x8c7d52, -15, 1.5, -18, landmarks, 4); tent.rotation.y = Math.PI / 4;
    cyl(.7, .9, .35, 0x3a3a36, -10, .18, -14, landmarks, 8); box(1.2, .9, .8, 0x6a4a2c, -19, .45, -12, landmarks);
    // Eski radyo istasyonu
    box(9, 4, 7, 0x8a8f8a, 52, 2, 44, landmarks); box(10, .5, 8, 0x4b4f52, 52, 4.2, 44, landmarks); box(1.6, 2.6, .3, 0x333b3f, 48.2, 1.3, 40.4, landmarks);
    cyl(.18, .25, 10, 0x9aa0a4, 56, 5, 41, landmarks, 6); const dish = new T.Mesh(new T.SphereGeometry(1.6, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2.4), mat(0xc9ced1)); dish.position.set(56, 10.4, 41); dish.rotation.x = -.8; landmarks.add(dish);
    // Dağdaki iletişim kulesi (yükseltilmiş tepe + kafes kule + yanıp sönen ışık)
    const hill = cone(15, 9, 0x6b6f5b, 0, 4.5, -84, landmarks, 10); hill.receiveShadow = true;
    for (const [dx, dz] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) { const leg = cyl(.12, .25, 17, 0x8b9096, dx, 17.5, -84 + dz, landmarks, 5); leg.rotation.z = -dx * .02; leg.rotation.x = dz * .02; }
    for (let i = 0; i < 6; i++) box(3.2 - i * .3, .12, 3.2 - i * .3, 0x8b9096, 0, 11 + i * 2.6, -84, landmarks);
    towerLight.position.set(0, 27, -84); landmarks.add(towerLight);
    // Radyo parçaları (toplanabilir)
    const pm = new T.MeshLambertMaterial({ color: 0xffc93c, emissive: 0x553d00 });
    PARTS.forEach((p, i) => { const m = new T.Mesh(new T.BoxGeometry(.5, .35, .7), pm); m.position.set(p[0], .5, p[1]); m.userData = { part: i, active: true }; landmarks.add(m); partMeshes.push(m); });
  }
  buildLandmarks();

  /* ============================ ÇARPIŞMA ============================ */
  const statics = [], boxes = [];
  const addC = (x, z, r) => statics.push({ x, z, r });
  const addB = (x, z, w, d, rot) => boxes.push({ x, z, hw: w / 2, hd: d / 2, c: Math.cos(rot || 0), s: Math.sin(rot || 0) });
  addB(40, -56, 14, 6, .05); addB(52, 44, 9, 7, 0); addC(62, -28, 6.6); addC(-15, -18, 2.4); addB(-19, -12, 1.2, .8, 0); addC(-10, -14, .8);
  for (const [dx, dz] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) addC(dx, -84 + dz, .45);
  function boxPush(b, px, pz, pr, out) {
    const dx = px - b.x, dz = pz - b.z, lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c;
    const cx = Math.max(-b.hw, Math.min(b.hw, lx)), cz = Math.max(-b.hd, Math.min(b.hd, lz)), ex = lx - cx, ez = lz - cz, d2 = ex * ex + ez * ez;
    if (d2 >= pr * pr) return false;
    let nx, nz;
    if (d2 > 1e-8) { const d = Math.sqrt(d2); nx = cx + ex / d * pr; nz = cz + ez / d * pr; }
    else if (b.hw - Math.abs(lx) < b.hd - Math.abs(lz)) { nx = (lx < 0 ? -1 : 1) * (b.hw + pr); nz = lz; }
    else { nz = (lz < 0 ? -1 : 1) * (b.hd + pr); nx = lx; }
    out.x = b.x + nx * b.c + nz * b.s; out.z = b.z - nx * b.s + nz * b.c; return true;
  }
  function colsFor(o) {
    const c = Math.cos(o.r), s = Math.sin(o.r), L = [], C = [];
    const box = (lx, lz, w, d) => L.push({ x: o.x + lx * c + lz * s, z: o.z - lx * s + lz * c, hw: w / 2, hd: d / 2, c, s });
    if (o.type === "Chest") box(0, 0, 1.2, .8);
    else if (o.type === "WaterCollector") box(0, 0, 1.1, 1.1);
    else if (o.type === "Defense") box(0, 0, 2.4, .3);
    else if (o.type === "Campfire") C.push({ x: o.x, z: o.z, r: .5 });
    else if (o.type === "WoodHouse") { box(0, -2.5, 5, .25); box(-2.5, 0, .25, 5); box(2.5, 0, .25, 5); box(-1.65, 2.5, 1.7, .25); box(1.65, 2.5, 1.7, .25); }
    return { boxes: L, circles: C };
  }
  const _pp = { x: 0, z: 0 }, _bo = { x: 0, z: 0 };
  function pushOut(px, pz, pr) {
    for (let it = 0; it < 3; it++) {
      for (let i = 0; i < statics.length; i++) {
        const c = statics[i], dx = px - c.x, dz = pz - c.z, m = c.r + pr;
        if (dx > m || dx < -m || dz > m || dz < -m) continue;
        const d2 = dx * dx + dz * dz; if (d2 < m * m) { const d = Math.sqrt(d2) || 1e-3; px = c.x + dx / d * m; pz = c.z + dz / d * m; }
      }
      for (let i = 0; i < boxes.length; i++) { const b = boxes[i]; if (Math.abs(px - b.x) > 12 || Math.abs(pz - b.z) > 12) continue; if (boxPush(b, px, pz, pr, _bo)) { px = _bo.x; pz = _bo.z; } }
      for (const o of buildings) {
        if (!o.cols || Math.abs(px - o.x) > 8 || Math.abs(pz - o.z) > 8) continue;
        for (const b of o.cols.boxes) if (boxPush(b, px, pz, pr, _bo)) { px = _bo.x; pz = _bo.z; }
        for (const c of o.cols.circles) { const dx = px - c.x, dz = pz - c.z, m = c.r + pr, d2 = dx * dx + dz * dz; if (d2 < m * m) { const d = Math.sqrt(d2) || 1e-3; px = c.x + dx / d * m; pz = c.z + dz / d * m; } }
      }
    }
    _pp.x = px; _pp.z = pz; return _pp;
  }
  // Dağ başındaki kule tepesi (koni, yarıçap 15, yükseklik 9; 10 kenarlı olduğu için biraz içeriden)
  const groundHeight = (x, z) => { const d = Math.hypot(x, z + 84); return d < 14.2 ? 9 * (1 - d / 14.2) : 0; };
  function addStatics(list) { for (const c of list) statics.push(c); }

  /* ============================ YAPILAR ============================ */
  const buildings = []; const fireLight = new T.PointLight(0xff9a3c, 0, 18, 2); scene.add(fireLight);
  function makeBuildingMesh(type) {
    const g = new T.Group(); const W = 0x7a5532, W2 = 0x946a3f;
    if (type === "Campfire") {
      for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; const s = new T.Mesh(new T.DodecahedronGeometry(.17), mat(0x808078)); s.position.set(Math.cos(a) * .55, .12, Math.sin(a) * .55); g.add(s); }
      const l1 = cyl(.08, .08, .9, W, 0, .2, 0, g, 5); l1.rotation.z = 1.2; const l2 = cyl(.08, .08, .9, W, 0, .22, 0, g, 5); l2.rotation.z = 1.2; l2.rotation.y = 1.5;
      const f = new T.Mesh(new T.ConeGeometry(.3, .85, 6), new T.MeshBasicMaterial({ color: 0xff8a1f, transparent: true, opacity: .9 })); f.position.y = .6; g.add(f); g.userData.flame = f;
      const f2 = new T.Mesh(new T.ConeGeometry(.17, .55, 5), new T.MeshBasicMaterial({ color: 0xffd45a })); f2.position.y = .5; g.add(f2); g.userData.flame2 = f2;
    } else if (type === "Shelter") {
      const a = box(.15, 3, 2.8, W2, -.95, 1.2, 0, g); a.rotation.z = .55; const b = box(.15, 3, 2.8, W2, .95, 1.2, 0, g); b.rotation.z = -.55;
      box(2.4, 1.6, .15, 0x6a7a45, 0, .8, -1.35, g); cyl(.07, .07, 3, W, 0, 2.05, 0, g, 5).rotation.x = Math.PI / 2;
    } else if (type === "WoodHouse") {
      box(5, 2.6, .25, W, 0, 1.3, -2.5, g); box(.25, 2.6, 5, W, -2.5, 1.3, 0, g); box(.25, 2.6, 5, W, 2.5, 1.3, 0, g);
      box(1.7, 2.6, .25, W, -1.65, 1.3, 2.5, g); box(1.7, 2.6, .25, W, 1.65, 1.3, 2.5, g); box(1.6, .7, .25, W, 0, 2.25, 2.5, g);
      const roof = cone(4.4, 2.2, 0x8a4b36, 0, 3.7, 0, g, 4); roof.rotation.y = Math.PI / 4; box(4.8, .15, 4.8, 0x5a3d25, 0, .08, 0, g);
    } else if (type === "Chest") {
      box(1.2, .6, .8, W, 0, .3, 0, g); const lid = cyl(.4, .4, 1.2, W2, 0, .7, 0, g, 8); lid.rotation.z = Math.PI / 2; box(.12, .2, .06, 0xd9b44a, 0, .55, .42, g);
    } else if (type === "WaterCollector") {
      cyl(.45, .45, .9, 0x3d6f9a, 0, .5, 0, g, 10); const fn = new T.Mesh(new T.ConeGeometry(.9, .7, 10, 1, true), new T.MeshLambertMaterial({ color: 0x9fb7c2, side: T.DoubleSide })); fn.position.y = 1.2; fn.rotation.x = Math.PI; g.add(fn);
      for (const [x, z] of [[-.7, -.7], [.7, -.7], [-.7, .7], [.7, .7]]) cyl(.05, .05, 1.1, W, x, .55, z, g, 4);
    } else if (type === "SpikeTrap") {
      box(1.3, .08, 1.3, W, 0, .04, 0, g);
      for (let i = 0; i < 9; i++) { const a = i * 2.4, rr = i ? .15 + (i % 3) * .2 : 0; const sp = cone(.07, .55, 0xc9b98a, Math.cos(a) * rr, .33, Math.sin(a) * rr, g, 4); sp.rotation.set((i % 3 - 1) * .18, 0, (i % 2 - .5) * .2); }
    } else if (type === "Defense") {
      for (let i = -2; i <= 2; i++) { const s = cone(.14, 1.5, W2, i * .5, .75, 0, g, 5); s.rotation.x = i % 2 ? .25 : -.25; }
      box(2.4, .12, .12, W, 0, .5, 0, g);
    }
    return g;
  }
  function addBuilding(b) {
    if (buildings.some(o => o.id === b.id)) return;
    const mesh = makeBuildingMesh(b.type); mesh.position.set(b.x, 0, b.z); mesh.rotation.y = b.r || 0; scene.add(mesh);
    const o = { id: b.id, type: b.type, x: b.x, z: b.z, r: b.r || 0, mesh, store: b.store || {}, fuel: b.fuel != null ? b.fuel : 700, water: b.water || 0, wt: 0 };
    o.cols = colsFor(o); buildings.push(o); return o;
  }
  function clearBuildings() { for (const b of buildings) scene.remove(b.mesh); buildings.length = 0; }
  const nearBuilding = (x, z, type, d) => { let best = null, bd = d; for (const b of buildings) { if (type && b.type !== type) continue; const dd = Math.hypot(b.x - x, b.z - z); if (dd < bd) { bd = dd; best = b; } } return best; };
  const inShelter = (x, z) => buildings.some(b => (b.type === "Shelter" || b.type === "WoodHouse") && Math.hypot(b.x - x, b.z - z) < R.BUILDS[b.type].r + .5);
  const nearFire = (x, z, d = 7) => buildings.some(b => b.type === "Campfire" && b.fuel > 0 && Math.hypot(b.x - x, b.z - z) < d);
  function updateBuildings(dt, time, px, pz, weather) {
    let best = null, bd = 1e9;
    for (const b of buildings) {
      if (b.type === "Campfire") {
        b.fuel = Math.max(0, b.fuel - dt); const on = b.fuel > 0, f = b.mesh.userData.flame; if (f) { f.visible = on; b.mesh.userData.flame2.visible = on; if (on) { const s = 1 + .18 * Math.sin(time * 14 + b.id) + .1 * Math.sin(time * 23); f.scale.set(s, 1 + .25 * Math.sin(time * 11 + b.id), s); } }
        const d = Math.hypot(b.x - px, b.z - pz); if (on && d < bd) { bd = d; best = b; }
      } else if (b.type === "SpikeTrap") {
        b.cd = (b.cd || 0) - dt;
        if (b.cd <= 0) for (const a of animals) {
          if (a.state === "dead" || a.sp === "bird" || a.puppet) continue;
          if (Math.hypot(a.x - b.x, a.z - b.z) < 1.4) { hitAnimal(a.id, 38); a.aggro = 0; if (a.hp > 0) { a.state = "flee"; a.timer = 3; } b.cd = 2.5; break; }
        }
      } else if (b.type === "WaterCollector") {
        b.wt += dt * (weather.rain > .2 ? 1 : .22); if (b.wt > 30 && b.water < 4) { b.wt = 0; b.water++; }
      }
    }
    if (best && bd < 30) { fireLight.position.set(best.x, 1.2, best.z); fireLight.intensity = 1.6 + .35 * Math.sin(time * 17); } else fireLight.intensity = 0;
  }

  /* ============================ HAYVAN MODELLERİ ============================ */
  function legPivot(parent, x, y, z, len, thick, color) { const p = new T.Group(); p.position.set(x, y, z); const l = box(thick, len, thick, color, 0, -len / 2, 0); p.add(l); parent.add(p); return p; }
  function makeAnimalModel(sp) {
    const g = new T.Group(), parts = { legs: [], tail: null, head: null, wings: [], segs: [] };
    const quad = (bw, bh, bl, col, lh, th, hcol, hs) => {
      box(bw, bh, bl, col, 0, lh + bh / 2, 0, g);
      const head = new T.Group(); head.position.set(0, lh + bh * .85, bl / 2); g.add(head); box(hs, hs * .9, hs * 1.2, hcol || col, 0, 0, hs * .45, head); parts.head = head;
      for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) parts.legs.push(legPivot(g, x * (bw / 2 - th / 2), lh, z * (bl / 2 - th), lh, th, col));
      const tail = box(th * .8, th * .8, bl * .3, col, 0, lh + bh * .8, -bl / 2 - bl * .12, g); parts.tail = tail;
    };
    if (sp === "wolf") { quad(.5, .5, 1.1, 0x6f7479, .55, .13, 0x80868b, .38); box(.1, .18, .1, 0x555a5e, -.12, .35, .1, parts.head); box(.1, .18, .1, 0x555a5e, .12, .35, .1, parts.head); }
    else if (sp === "bear") { quad(1, .95, 1.7, 0x4b3322, .6, .3, 0x5a3f2b, .62); box(.18, .18, .12, 0x3a2618, -.22, .38, .1, parts.head); box(.18, .18, .12, 0x3a2618, .22, .38, .1, parts.head); }
    else if (sp === "deer") { quad(.45, .55, 1.1, 0xb3834f, .85, .1, 0xc1925c, .3); const a1 = cyl(.025, .025, .55, 0x5a4026, -.1, .4, .05, parts.head, 4); a1.rotation.z = .35; const a2 = cyl(.025, .025, .55, 0x5a4026, .1, .4, .05, parts.head, 4); a2.rotation.z = -.35; parts.head.position.y += .35; parts.head.position.z += .1; }
    else if (sp === "rabbit") { quad(.22, .22, .38, 0xcfc7b8, .1, .07, 0xd8d1c3, .15); box(.04, .22, .04, 0xcfc7b8, -.04, .17, .06, parts.head); box(.04, .22, .04, 0xcfc7b8, .04, .17, .06, parts.head); }
    else if (sp === "croc") { box(.9, .3, 3, 0x3f5b32, 0, .3, 0, g); const hd = box(.6, .22, 1.1, 0x4a6a3a, 0, .27, 1.9, g); parts.head = hd; const tl = box(.5, .2, 1.6, 0x3a542d, 0, .25, -2.2, g); parts.tail = tl; for (const [x, z] of [[-1, .9], [1, .9], [-1, -.9], [1, -.9]]) parts.legs.push(legPivot(g, x * .55, .25, z, .25, .18, 0x3a542d)); }
    else if (sp === "snake") { for (let i = 0; i < 9; i++) { const s = box(.14 - i * .008, .12, .3, i % 2 ? 0x5c7a3a : 0x3f5b2a, 0, .08, -i * .26, g); parts.segs.push(s); } parts.head = parts.segs[0]; }
    else if (sp === "bird") { box(.16, .14, .3, 0x4b78b0, 0, 0, 0, g); box(.1, .1, .1, 0xe0b04a, 0, .04, .2, g); for (const s of [-1, 1]) { const w = new T.Group(); w.position.set(s * .08, .04, 0); const wm = box(.4, .02, .22, 0x3d6595, s * .2, 0, 0); w.add(wm); g.add(w); parts.wings.push(w); } }
    g.userData.parts = parts; return g;
  }
  const animals = [];
  const labelIdx = { idle: 0, wander: 1, flee: 2, chase: 3, attack: 4, dead: 5, perch: 6, fly: 7 };
  const labels = Object.keys(labelIdx);
  function spawnAnimals() {
    let id = 0;
    for (const sp of SPECIES_IDS) {
      const S = SPECIES[sp];
      for (let i = 0; i < S.count; i++) {
        const a = rand(0, 6.28), rr = Math.sqrt(Math.random()) * S.home[2];
        const x = clamp(S.home[0] + Math.cos(a) * rr, -90, 90), z = clamp(S.home[1] + Math.sin(a) * rr, -90, 90);
        const mesh = makeAnimalModel(sp); mesh.position.set(x, 0, z); scene.add(mesh);
        animals.push({ id: id++, sp, S, mesh, x, z, y: sp === "bird" ? 7 : 0, rot: rand(0, 6.28), hp: S.hp, state: sp === "bird" ? "fly" : "idle", tx: x, tz: z, timer: rand(1, 6), phase: rand(0, 6), speed: 0, cd: 0, aggro: 0, respawn: 0, ang: rand(0, 6.28), puppet: false, nx: x, nz: z, nr: 0 });
      }
    }
  }
  spawnAnimals();

  /* ---- Yapay zeka ---- */
  const world = { animals, buildings, REGIONS, PARTS, partMeshes, SPECIES, weather: { rain: 0, storm: 0, target: 0, timer: 80, flash: 0 }, dangerLevel: 0, nightF: 0, dayCount: 0, isHost: true, online: false };
  function safeSpot(px, pz) { return inShelter(px, pz) || nearFire(px, pz, 6); }
  function nearestPlayer(a, players) { let best = null, bd = 1e9; for (const p of players) { const d = Math.hypot(p.x - a.x, p.z - a.z); if (d < bd) { bd = d; best = p; } } return best ? { p: best, d: bd } : null; }
  function stepTowards(a, tx, tz, spd, dt) {
    const dx = tx - a.x, dz = tz - a.z, d = Math.hypot(dx, dz) || 1, want = Math.atan2(dx, dz);
    a.rot += angDiff(want - a.rot) * Math.min(1, dt * (a.sp === "snake" ? 5 : 8));
    const m = Math.min(spd * dt, d); a.x += Math.sin(a.rot) * m; a.z += Math.cos(a.rot) * m;
    const r = Math.hypot(a.x, a.z); if (r > 94) { a.x *= 93.9 / r; a.z *= 93.9 / r; } a.speed = spd; return d;
  }
  function pickWander(a) { const h = a.S.home, ang = rand(0, 6.28), rr = Math.sqrt(Math.random()) * h[2]; a.tx = clamp(h[0] + Math.cos(ang) * rr, -92, 92); a.tz = clamp(h[1] + Math.sin(ang) * rr, -92, 92); }
  function simAnimal(a, dt, players, hurt) {
    const S = a.S, night = world.nightF > .5, grace = world.dayCount < 1 && !world.survival, boost = world.rescueBoost ? 1.5 : 1;
    const danger = clamp(.35 + world.dayCount * .22, .35, 1.7) * boost;           // gün ilerledikçe tehlike artar
    a.cd = Math.max(0, a.cd - dt); a.aggro = Math.max(0, a.aggro - dt); a.timer -= dt; a.speed = 0;
    const np = nearestPlayer(a, players), d = np ? np.d : 999, pl = np && np.p, safe = pl && (safeSpot(pl.x, pl.z) || (pl.me && world.torchOn && d < 7));
    const hd = Math.hypot(a.x - S.home[0], a.z - S.home[1]);
    if (a.sp === "bird") { // kuşlar: gündüz dairesel uçuş, gece yere konup uyur, oyuncuya yaklaşınca yükselir
      if (night && d
