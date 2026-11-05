/* WILD ISLAND: SURVIVAL — insan karakteri
 *
 * Anatomik oranlı (≈1,78 m) eklemli karakter: baş, boyun, gövde (karın + göğüs), iki kol (omuz/dirsek/el),
 * iki bacak (kalça/diz/bilek) ve bot. Hayatta kalma kıyafeti: tişört, pantolon, kemer, bot, sırt çantası.
 * Yüz yönü +Z, sol taraf +X.
 *
 * Animasyon tamamen prosedüreldir ve hızdan türetilir:
 *  - adım sıklığı/uzunluğu hıza bağlıdır; basan ayak yerde kayma yapmaz,
 *  - kalça yüksekliği basan bacağın uzunluğundan hesaplanır (ayak zeminde kalır),
 *  - yürü -> koş geçişi sürekli (blend) olduğu için kesinti yoktur,
 *  - zıplama: kalkış / havada / iniş (yay-sönüm ile diz bükme),
 *  - durma: genlikler yumuşakça sıfırlanır, nefes alma + bakınma + göz kırpma başlar,
 *  - dönüş: gövde dönüş yönüne yatar, baş önden gider, yerinde dönüşte ayaklar adım atar.
 */
(() => {
"use strict";
const WI = (window.WI = window.WI || {});
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const sm = (rate, dt) => 1 - Math.exp(-rate * dt);

// Ölçüler (metre)
const THIGH = 0.44, SHIN = 0.42, ANKLE_H = 0.06, HIP_JOINT_DY = -0.01;
const HIP_Y = THIGH + SHIN + ANKLE_H - HIP_JOINT_DY;           // 0.93: ayakta kalça yüksekliği

const NAMES = ["hips", "spine", "chest", "neck", "head", "armL", "armR", "elbowL", "elbowR", "handL", "handR", "thighL", "thighR", "kneeL", "kneeR", "ankleL", "ankleR"];
const J = {}; NAMES.forEach((n, i) => { J[n] = i; });
const N = NAMES.length;

WI.createHuman = function (opts) {
  const T = window.THREE;
  const quality = (opts && opts.quality) || "medium";
  const seg = quality === "low" ? 8 : quality === "high" ? 16 : 12;

  /* ---------- malzemeler ---------- */
  const M = (color, rough, metal) => new T.MeshStandardMaterial({ color, roughness: rough === undefined ? 0.85 : rough, metalness: metal || 0 });
  const mat = {
    skin: M(0xc99568, 0.6), shirt: M(0x5f7c47, 0.95), shirtDark: M(0x486136, 0.95), pants: M(0x6d5c41, 0.95), belt: M(0x2b2017, 0.7),
    buckle: M(0xbba66b, 0.35, 0.7), boot: M(0x3b2b1e, 0.8), sole: M(0x1b1612, 0.95), hair: M(0x2a1c14, 0.8), band: M(0x9b3a2e, 0.9),
    eye: M(0x120d0a, 0.3), brow: M(0x241810, 0.9), pack: M(0x80582f, 0.9), packDark: M(0x56402a, 0.9), strap: M(0x2a2622, 0.9),
    roll: M(0x5b7079, 0.95), metal: M(0x8d9296, 0.4, 0.6), watch: M(0x1f2428, 0.5, 0.3)
  };

  /* ---------- yardımcılar ---------- */
  const sph = r => new T.SphereGeometry(r, seg, Math.max(6, seg - 3));
  const cyl = (rt, rb, h, s) => new T.CylinderGeometry(rt, rb, h, s || seg);
  const box = (w, h, d) => new T.BoxGeometry(w, h, d);
  function mesh(geo, m, parent, x, y, z, sx, sy, sz) {
    const o = new T.Mesh(geo, m);
    o.position.set(x || 0, y || 0, z || 0);
    if (sx !== undefined) o.scale.set(sx, sy === undefined ? sx : sy, sz === undefined ? sx : sz);
    o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
  }
  function grp(parent, x, y, z) { const g = new T.Group(); g.position.set(x || 0, y || 0, z || 0); parent.add(g); return g; }

  /* ---------- iskelet ve gövde ---------- */
  const root = new T.Group(); root.name = "human";
  const hips = grp(root, 0, HIP_Y, 0);
  mesh(sph(1), mat.pants, hips, 0, -0.025, 0, 0.158, 0.12, 0.118);                     // leğen
  mesh(cyl(0.152, 0.152, 0.05, seg), mat.belt, hips, 0, 0.075, 0, 1, 1, 0.78);          // kemer
  mesh(box(0.045, 0.036, 0.012), mat.buckle, hips, 0, 0.075, 0.121);                    // toka

  const spine = grp(hips, 0, 0.08, 0);
  mesh(cyl(0.148, 0.142, 0.2, seg), mat.shirt, spine, 0, 0.1, 0, 1, 1, 0.72);           // karın/bel

  const chest = grp(spine, 0, 0.2, 0);
  mesh(cyl(0.192, 0.152, 0.27, seg), mat.shirt, chest, 0, 0.13, 0, 1, 1, 0.66);         // göğüs kafesi
  mesh(sph(1), mat.shirt, chest, 0, 0.255, 0, 0.19, 0.075, 0.125);                      // omuz hattı (trapez)
  mesh(cyl(0.062, 0.07, 0.03, seg), mat.shirtDark, chest, 0, 0.285, 0);                 // tişört yaka

  const neck = grp(chest, 0, 0.28, 0);
  mesh(cyl(0.042, 0.05, 0.11, 10), mat.skin, neck, 0, 0.04, 0);                         // boyun

  const head = grp(neck, 0, 0.08, 0);
  mesh(sph(1), mat.skin, head, 0, 0.095, 0, 0.104, 0.12, 0.114);                        // kafatası
  mesh(sph(1), mat.skin, head, 0, 0.04, 0.012, 0.076, 0.07, 0.088);                     // çene/yanak
  mesh(sph(1), mat.skin, head, 0, 0.075, 0.108, 0.014, 0.02, 0.022);                    // burun
  mesh(sph(1), mat.skin, head, 0.105, 0.09, -0.005, 0.014, 0.03, 0.022);                // kulaklar
  mesh(sph(1), mat.skin, head, -0.105, 0.09, -0.005, 0.014, 0.03, 0.022);
  const eyeL = mesh(sph(1), mat.eye, head, 0.037, 0.098, 0.1, 0.0125, 0.0125, 0.01);
  const eyeR = mesh(sph(1), mat.eye, head, -0.037, 0.098, 0.1, 0.0125, 0.0125, 0.01);
  const browL = mesh(box(0.04, 0.008, 0.01), mat.brow, head, 0.037, 0.117, 0.104); browL.rotation.z = -0.08;
  const browR = mesh(box(0.04, 0.008, 0.01), mat.brow, head, -0.037, 0.117, 0.104); browR.rotation.z = 0.08;
  const hair = mesh(new T.SphereGeometry(1, seg, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), mat.hair, head, 0, 0.1, -0.006, 0.112, 0.126, 0.124);
  mesh(sph(1), mat.hair, head, 0, 0.075, -0.05, 0.1, 0.09, 0.075);                       // ense saçı
  const bandGeo = new T.TorusGeometry(0.106, 0.011, 6, 18); bandGeo.rotateX(Math.PI / 2);
  mesh(bandGeo, mat.band, head, 0, 0.122, 0.002);                                         // kafa bandı

  /* ---------- kollar ---------- */
  function buildArm(side) {
    const sg = side === "L" ? 1 : -1;
    const arm = grp(chest, 0.205 * sg, 0.235, 0);
    mesh(sph(1), mat.shirt, arm, 0, 0, 0, 0.068);                                          // omuz başı
    mesh(cyl(0.052, 0.044, 0.29, 10), mat.skin, arm, 0, -0.145, 0);                        // üst kol
    mesh(cyl(0.063, 0.059, 0.15, 10), mat.shirt, arm, 0, -0.085, 0);                       // kısa kol (tişört)
    const elbow = grp(arm, 0, -0.29, 0);
    mesh(sph(1), mat.skin, elbow, 0, 0, 0, 0.045);
    mesh(cyl(0.043, 0.032, 0.26, 10), mat.skin, elbow, 0, -0.13, 0);                       // ön kol
    const hand = grp(elbow, 0, -0.27, 0);
    mesh(sph(1), mat.skin, hand, 0, -0.05, 0, 0.037, 0.054, 0.027);                        // avuç/parmaklar
    mesh(sph(1), mat.skin, hand, 0.024 * -sg, -0.04, 0.014, 0.012, 0.026, 0.013);          // başparmak (içe doğru)
    if (side === "L") mesh(cyl(0.037, 0.037, 0.028, 10), mat.watch, hand, 0, -0.008, 0);   // saat
    return { arm, elbow, hand };
  }
  const aL = buildArm("L"), aR = buildArm("R");

  /* ---------- bacaklar ---------- */
  function buildLeg(side) {
    const sg = side === "L" ? 1 : -1;
    const thigh = grp(hips, 0.09 * sg, HIP_JOINT_DY, 0);
    mesh(cyl(0.088, 0.062, THIGH, 10), mat.pants, thigh, 0, -THIGH / 2, 0, 1, 1, 0.96);   // uyluk
    const knee = grp(thigh, 0, -THIGH, 0);
    mesh(sph(1), mat.pants, knee, 0, 0, 0, 0.063);
    mesh(cyl(0.06, 0.047, SHIN - 0.02, 10), mat.pants, knee, 0, -(SHIN - 0.02) / 2, 0);    // baldır
    const ankle = grp(knee, 0, -SHIN, 0);
    mesh(cyl(0.056, 0.064, 0.17, 10), mat.boot, ankle, 0, 0.02, 0);                        // bot konçu
    mesh(box(0.104, 0.07, 0.19), mat.boot, ankle, 0, -0.025, 0.05);                        // ayak gövdesi
    mesh(sph(1), mat.boot, ankle, 0, -0.028, 0.145, 0.052, 0.036, 0.056);                  // burun kısmı
    mesh(box(0.11, 0.026, 0.27), mat.sole, ankle, 0, -0.047, 0.07);                        // taban
    mesh(box(0.1, 0.01, 0.07), mat.strap, ankle, 0, 0.056, 0.04);         // bağcık/dil
    return { thigh, knee, ankle };
  }
  const lL = buildLeg("L"), lR = buildLeg("R");

  /* ---------- sırt çantası (göğüs kafesine bağlı, gövdeyle birlikte döner) ---------- */
  const pack = grp(chest, 0, 0.1, -0.205);
  mesh(box(0.3, 0.38, 0.14), mat.pack, pack, 0, 0, 0);                                      // ana hazne
  mesh(box(0.312, 0.08, 0.156), mat.packDark, pack, 0, 0.2, 0.002);                         // kapak
  mesh(box(0.07, 0.2, 0.1), mat.packDark, pack, 0.175, -0.07, 0.005);                       // yan cepler
  mesh(box(0.07, 0.2, 0.1), mat.packDark, pack, -0.175, -0.07, 0.005);
  const rollGeo = cyl(0.062, 0.062, 0.36, 10); rollGeo.rotateZ(Math.PI / 2);
  mesh(rollGeo, mat.roll, pack, 0, 0.275, -0.01);                                            // üstte uyku tulumu
  mesh(cyl(0.032, 0.032, 0.11, 8), mat.metal, pack, 0.19, -0.14, -0.04);                     // matara
  for (const sg of [1, -1]) {
    mesh(box(0.05, 0.016, 0.26), mat.strap, chest, 0.105 * sg, 0.272, -0.065);               // omuz askısı (üstten)
    mesh(box(0.05, 0.3, 0.014), mat.strap, chest, 0.105 * sg, 0.135, 0.114);                 // göğüs askısı (önde)
  }
  mesh(box(0.2, 0.02, 0.01), mat.strap, chest, 0, 0.15, 0.124);                              // göğüs kemeri

  /* ---------- animasyon durumu ---------- */
  const joints = [hips, spine, chest, neck, head, aL.arm, aR.arm, aL.elbow, aR.elbow, aL.hand, aR.hand, lL.thigh, lR.thigh, lL.knee, lR.knee, lL.ankle, lR.ankle];
  const pg = new Float32Array(N * 3), pa = new Float32Array(N * 3);
  const A = { phase: 0, sp: 0, acc: 0, prevSp: 0, air: 0, crouch: 0, crouchV: 0, grounded: true, lastVy: 0, lead: 1, t: 0, blinkT: 0, nextBlink: 2.2, yawRate: 0, hipsY: HIP_Y, hipsX: 0 };
  const put = (arr, name, x, y, z) => { const k = J[name] * 3; arr[k] = x; arr[k + 1] = y; arr[k + 2] = z; };

  function update(dt, s, snap) {
    dt = clamp(dt, 0, 0.05);
    s = s || {};
    A.t += dt;
    const grounded = s.grounded !== false, vy = s.vy || 0;
    A.sp += ((s.speed || 0) - A.sp) * (snap ? 1 : sm(16, dt));
    const sp = A.sp;
    A.acc += (((sp - A.prevSp) / Math.max(dt, 1e-3)) - A.acc) * sm(10, dt); A.prevSp = sp;
    A.yawRate += ((s.yawRate || 0) - A.yawRate) * (snap ? 1 : sm(10, dt));

    // kalkış / iniş olayları
    if (A.grounded && !grounded) A.lead = Math.sin(A.phase) >= 0 ? 1 : -1;
    if (!A.grounded && grounded) A.crouchV += 2.2 + clamp(-A.lastVy / 8, 0, 1) * 5;
    A.grounded = grounded; A.lastVy = vy;
    // iniş yayı (sönümlü): diz bükülüp toparlanır
    A.crouchV += (-150 * A.crouch - 17 * A.crouchV) * dt; A.crouch = clamp(A.crouch + A.crouchV * dt, -0.05, 0.6);
    A.air += ((grounded ? 0 : 1) - A.air) * (snap ? 1 : sm(grounded ? 18 : 26, dt));

    // yerinde dönüşte adım atma (hızlı yön değişimi, hareket yokken)
    const stepW = smoothstep(0.9, 3.2, Math.abs(A.yawRate)) * (1 - smoothstep(0.3, 1.2, sp));
    const spEff = Math.max(sp, 1.3 * stepW);
    const moveW = smoothstep(0.12, 1.0, spEff);
    const idleW = 1 - moveW;
    const u = clamp(spEff / 7.5, 0, 1);
    const runW = smoothstep(2.8, 5.8, spEff);
    const f = 0.7 + 0.2 * spEff;                                  // adım sıklığı (çevrim/sn)
    const w = Math.PI * 2 * f;
    A.phase = (A.phase + w * dt) % (Math.PI * 2);

    // --- genlikler: basan ayak yerde kaymasın diye adım uzunluğu hızla orantılı ---
    const ampT = clamp(spEff * 1.08 / (0.86 * w), 0, 0.78);
    const flexScale = smoothstep(0.0, 0.35, ampT);
    const K = (0.28 + 1.05 * Math.pow(u, 0.9)) * flexScale;
    const thetaC = clamp(A.crouch * 1.35, -0.07, 0.85);          // iniş çömelmesi (rad)

    // --- bacaklar ---
    const legAng = {};
    for (const side of [1, -1]) {
      const phi = A.phase + (side === 1 ? 0 : Math.PI), sn = Math.sin(phi), cs = Math.cos(phi);
      let thigh = -ampT * sn - 0.32 * runW * Math.max(0, sn);
      // diz yalnızca salınım evresinde bükülür; ayak en öndeyken (yere basarken) düzdür -> kayma yok
      const ph = ((phi + Math.PI / 2) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      const swingFlex = ph < Math.PI ? Math.pow(Math.sin(Math.PI * Math.pow(ph / Math.PI, 1.4)), 1.2) : 0;
      let knee = 0.05 + 0.12 * runW * moveW + K * swingFlex;
      thigh -= thetaC; knee += 2 * thetaC;
      const ank = -(thigh + knee) * 0.8 + 0.5 * Math.max(0, thigh);
      const nm = side === 1 ? "L" : "R";
      put(pg, "thigh" + nm, thigh, 0, 0); put(pg, "knee" + nm, knee, 0, 0); put(pg, "ankle" + nm, ank, side * 0.1, 0);
      legAng[nm] = THIGH * Math.cos(thigh) + SHIN * Math.cos(thigh + knee);
    }
    // kalça yüksekliği: basan bacağın uzunluğuna göre (ayak zeminde kalır); koşuda uçuş evresi eklenir
    const lift = runW * (0.04 + 0.06 * u) * (0.5 - 0.5 * Math.cos(2 * A.phase));
    const plantedY = Math.max(legAng.L, legAng.R) - HIP_JOINT_DY + ANKLE_H + lift;

    // --- gövde ---
    const sinP = Math.sin(A.phase);
    const yh = (0.09 + 0.06 * u) * moveW, yc = (0.13 + 0.08 * u) * moveW;
    const lean = (0.03 + 0.2 * Math.pow(u, 1.1)) * moveW + clamp(A.acc * 0.012, -0.08, 0.12) * moveW + thetaC * 0.45;
    const roll = clamp(-A.yawRate * 0.045 * clamp(sp / 5, 0, 1), -0.2, 0.2);
    const breath = Math.sin(A.t * 1.7);
    const shift = Math.sin(A.t * 0.45) * idleW;
    const hipsYaw = -yh * sinP, spineYaw = 0.5 * (yc + yh) * sinP, chestYaw = 0.5 * (yc + yh) * sinP;
    put(pg, "hips", 0, hipsYaw, roll * 0.4 + 0.014 * Math.sin(A.t * 0.45 + 0.6) * idleW);
    put(pg, "spine", lean * 0.55, spineYaw, roll * 0.35 - 0.011 * shift);
    put(pg, "chest", lean * 0.45 + 0.013 * breath * (0.4 + idleW), chestYaw, roll * 0.25);
    put(pg, "neck", -lean * 0.3, 0, 0);
    const lookYaw = clamp(A.yawRate * 0.07, -0.45, 0.45) * (0.4 + 0.6 * moveW) + 0.35 * Math.sin(A.t * 0.31) * Math.sin(A.t * 0.13 + 1) * idleW;
    const lookPitch = 0.05 * Math.sin(A.t * 0.23) * idleW;
    put(pg, "head", -lean * 0.7 + lookPitch, -(hipsYaw + spineYaw + chestYaw) * 0.8 + lookYaw, -roll * 0.5);

    // --- kollar: karşı bacakla ters yönde sallanır ---
    const B = (0.28 + 0.78 * u) * moveW;
    const eBase = 0.12 * idleW + (0.16 + 0.95 * runW) * moveW, eSwing = (0.2 + 0.3 * u) * moveW;
    for (const side of [1, -1]) {
      const nm = side === 1 ? "L" : "R", sg = side * sinP;     // sol kol +sin, sağ kol -sin
      const armX = B * sg + thetaC * 0.9 + 0.025 * Math.sin(A.t * 1.1 + (side === 1 ? 0 : 2)) * idleW;
      put(pg, "arm" + nm, armX, 0, side * (0.08 + 0.06 * u + 0.012 * breath));
      put(pg, "elbow" + nm, -(eBase + eSwing * (0.5 - 0.5 * sg)), 0, 0);
      put(pg, "hand" + nm, -0.12, 0, side * 0.04);
    }

    // --- havada: kalkış / yükselme / düşme duruşu ---
    const t01 = (clamp(vy / 6.4, -1, 1) + 1) / 2;                 // 1 = yükseliyor, 0 = düşüyor
    for (const side of [1, -1]) {
      const nm = side === 1 ? "L" : "R", lead = side === A.lead;
      const thL = -(0.3 + 0.55 * t01), kL = 0.35 + 0.9 * t01;
      let th = lead ? thL : lerp(0.15 + 0.25 * t01, thL * 0.6, (1 - t01) * 0.5), kn = lead ? kL : 0.5 + 0.8 * t01;
      put(pa, "thigh" + nm, th, 0, 0); put(pa, "knee" + nm, kn, 0, 0); put(pa, "ankle" + nm, -(th + kn) * 0.4 + 0.3, side * 0.08, 0);
      put(pa, "arm" + nm, -(0.25 + 0.65 * t01), 0, side * (0.25 + 0.6 * (1 - t01)));
      put(pa, "elbow" + nm, -(0.5 + 0.2 * t01), 0, 0);
      put(pa, "hand" + nm, -0.15, 0, side * 0.05);
    }
    put(pa, "hips", 0, 0, 0); put(pa, "spine", 0.08 + 0.1 * t01, 0, 0); put(pa, "chest", 0.04, 0, 0);
    put(pa, "neck", -0.05, 0, 0); put(pa, "head", -0.1 + 0.1 * (1 - t01), 0, 0);

    // --- hedef pozları uygula (kareler arası yumuşatma: sıçrama yok) ---
    const kJ = snap ? 1 : sm(34, dt), kB = snap ? 1 : sm(24, dt);
    for (let i = 0; i < N; i++) {
      const j = joints[i], leg = i >= J.thighL, kk = leg ? kJ : kB;
      for (let c = 0; c < 3; c++) {
        const target = lerp(pg[i * 3 + c], pa[i * 3 + c], A.air), key = c === 0 ? "x" : c === 1 ? "y" : "z";
        j.rotation[key] += (target - j.rotation[key]) * kk;
      }
    }
    const targetY = lerp(plantedY, HIP_Y + 0.03 * t01, A.air);
    const targetX = -(0.025 * (1 - 0.5 * runW)) * Math.cos(A.phase) * moveW + 0.012 * shift;   // basan bacağa doğru hafif kayma
    hips.position.y += (targetY - hips.position.y) * kJ;
    hips.position.x += (targetX - hips.position.x) * kB;

    // --- göz kırpma ---
    A.nextBlink -= dt;
    if (A.nextBlink <= 0) { A.blinkT = 0.14; A.nextBlink = 2 + Math.random() * 3.5; }
    let bl = 0; if (A.blinkT > 0) { A.blinkT -= dt; bl = Math.sin(Math.PI * clamp(1 - A.blinkT / 0.14, 0, 1)); }
    eyeL.scale.y = eyeR.scale.y = 0.0125 * (1 - 0.92 * bl);
  }

  function reset() {
    A.phase = 0; A.sp = 0; A.acc = 0; A.prevSp = 0; A.air = 0; A.crouch = 0; A.crouchV = 0; A.grounded = true; A.lastVy = 0; A.yawRate = 0; A.blinkT = 0;
    for (let i = 0; i < 4; i++) update(0.016, { speed: 0, grounded: true, vy: 0, yawRate: 0 }, true);
  }
  reset();

  return { root, joints: { hips, spine, chest, neck, head, armL: aL.arm, armR: aR.arm, elbowL: aL.elbow, elbowR: aR.elbow, handL: aL.hand, handR: aR.hand, thighL: lL.thigh, thighR: lR.thigh, kneeL: lL.knee, kneeR: lR.knee, ankleL: lL.ankle, ankleR: lR.ankle, pack, hair }, update, reset, anim: A, constants: { THIGH, SHIN, ANKLE_H, HIP_Y } };
};
})();
  
