/* WILD ISLAND: SURVIVAL — tropikal ada ortamı
 * Gökyüzü (gün batımı), deniz, kıyı, dağlar, palmiye/orman, bulutlar, rüzgâr, ışık ve gölge.
 * Mobil performans: ağaç/çalı/kaya InstancedMesh (tek çizim çağrısı), ortak geometri ve malzemeler.
 */
(() => {
"use strict";
const WI = (window.WI = window.WI || {});

/* ---------------- yardımcılar ---------------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
WI.mulberry32 = mulberry32;
function hash2(ix, iz) {
  let h = (Math.imul(ix, 374761393) + Math.imul(iz, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}
function vnoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz), b = hash2(ix + 1, iz), c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, z) => vnoise(x, z) * 0.6 + vnoise(x * 2.1 + 11, z * 2.1 + 5) * 0.3 + vnoise(x * 4.3 + 3, z * 4.3 + 9) * 0.1;

/* ---------------- gün döngüsü paletleri ---------------- */
const PALETTE = {
  //            gökyüzü tepe, ufuk,      sis,       güneş ışığı, hemi gökyüzü, hemi zemin, parıltı
  night: { top: 0x040a1c, hor: 0x14234a, fog: 0x0d1936, sun: 0x8aa0ff, hemiS: 0x2b3a66, hemiG: 0x0d1218, glow: 0x000000, sunI: 0.30, hemiI: 0.70, glowI: 0.0 },
  gold:  { top: 0x34447f, hor: 0xff9b5a, fog: 0xd98b62, sun: 0xffa65a, hemiS: 0xffc79a, hemiG: 0x4a3b2e, glow: 0xff7a3a, sunI: 1.55, hemiI: 0.95, glowI: 1.0 },
  day:   { top: 0x2f7fd0, hor: 0xc2e6f4, fog: 0xb4dcea, sun: 0xfff0cf, hemiS: 0xd5ecff, hemiG: 0x58693a, glow: 0xfff2c0, sunI: 1.60, hemiI: 1.35, glowI: 0.35 }
};

/* ---------------- geometri üreticileri (ham dizilerden) ---------------- */
function buildRadialDisc(T, R, nRings, nSeg, y, colorFn) {
  const pos = [], col = [], nor = [], idx = [], c = new T.Color();
  for (let i = 0; i <= nRings; i++) {
    const r = R * i / nRings;
    for (let j = 0; j < nSeg; j++) {
      const a = j / nSeg * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r;
      pos.push(x, y, z); nor.push(0, 1, 0);
      colorFn(c, x, z, r); col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < nRings; i++) {
    for (let j = 0; j < nSeg; j++) {
      const j2 = (j + 1) % nSeg, A = i * nSeg + j, D = i * nSeg + j2, B = (i + 1) * nSeg + j, C = (i + 1) * nSeg + j2;
      idx.push(A, C, B, A, D, C);
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new T.Float32BufferAttribute(nor, 3));
  g.setAttribute("color", new T.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

/* Palmiye gövdesi: hafif eğik, tabanı geniş, halkalı doku. Yerel orijin = taban. */
function buildPalmTrunk(T, H, lean) {
  const rings = 14, sides = 8, pos = [], col = [], idx = [], c1 = new T.Color(0x7d5c3b), c2 = new T.Color(0x5e4329), c = new T.Color();
  for (let i = 0; i < rings; i++) {
    const t = i / (rings - 1);
    const cx = lean * t * t, cy = H * t;
    let tx = 2 * lean * t, ty = H; const tl = Math.hypot(tx, ty); tx /= tl; ty /= tl;
    const nx = -ty, ny = tx;                       // gövdeye dik (xy düzleminde)
    const r = (0.30 - 0.13 * t) * (1 + 0.55 * Math.max(0, 1 - t * 7));
    c.copy(i % 2 ? c1 : c2);
    for (let j = 0; j < sides; j++) {
      const a = j / sides * Math.PI * 2, ca = Math.cos(a) * r, sa = Math.sin(a) * r;
      pos.push(cx + nx * ca, cy + ny * ca, sa);
      col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < rings - 1; i++) {
    for (let j = 0; j < sides; j++) {
      const j2 = (j + 1) % sides, a = i * sides + j, b = i * sides + j2, cc = (i + 1) * sides + j, d = (i + 1) * sides + j2;
      idx.push(a, b, cc, b, d, cc);
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new T.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* Palmiye yaprakları: gövdenin tepesinde (yerel orijin) yıldız gibi açılan V kesitli şeritler. */
function buildPalmFronds(T, rng, count) {
  const pos = [], col = [], idx = [], stations = 7, cLow = new T.Color(0x2b6a2d), cHigh = new T.Color(0x6fae3e), c = new T.Color();
  for (let f = 0; f < count; f++) {
    const yaw = f / count * Math.PI * 2 + (rng() - 0.5) * 0.35;
    const pb = 0.32 + rng() * 0.28, L = 2.35 + rng() * 0.6, light = 0.88 + rng() * 0.24;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pb), sp = Math.sin(pb), base = pos.length / 3;
    for (let s = 0; s < stations; s++) {
      const u = s / (stations - 1);
      const xl = L * u, yl = L * (0.55 * u - 1.05 * u * u);
      const x1 = xl * cp - yl * sp, y1 = xl * sp + yl * cp;
      const w = 0.36 * Math.sin(Math.PI * Math.pow(u, 0.65)) * (L / 2.4);
      c.copy(cLow).lerp(cHigh, u); c.r *= light; c.g *= light; c.b *= light;
      const pts = [[x1, y1 - 0.3 * w, w], [x1, y1 + 0.04, 0], [x1, y1 - 0.3 * w, -w]];
      for (const p of pts) {
        // Y ekseni etrafında yaw kadar döndür
        pos.push(p[0] * cy + p[2] * sy, p[1], -p[0] * sy + p[2] * cy);
        col.push(c.r, c.g, c.b);
      }
    }
    for (let s = 0; s < stations - 1; s++) {
      const a = base + s * 3, b = base + (s + 1) * 3;
      idx.push(a, b, a + 1, a + 1, b, b + 1, a + 1, b + 1, a + 2, a + 2, b + 1, b + 2);
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new T.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* Geniş yapraklı ağaç tacı: birkaç düz gölgeli küre öbeğinin tek geometride birleşimi. Yerel orijin = taç merkezi. */
function buildCrown(T, rng) {
  const blobs = [[0, 0, 0, 2.5], [1.5, -0.5, 0.6, 1.9], [-1.4, -0.4, -0.5, 2.0], [0.2, 1.1, -0.9, 1.7], [-0.3, 0.9, 1.3, 1.6]];
  const parts = [], c = new T.Color();
  let total = 0;
  for (const b of blobs) {
    let g = new T.IcosahedronGeometry(1, 1);
    if (g.index) g = g.toNonIndexed();
    parts.push({ g, b }); total += g.attributes.position.count;
  }
  const pos = new Float32Array(total * 3), col = new Float32Array(total * 3);
  let o = 0;
  for (const { g, b } of parts) {
    const p = g.attributes.position, shade = 0.85 + rng() * 0.3;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      pos[o * 3] = p.getX(i) * b[3] * 1.05 + b[0];
      pos[o * 3 + 1] = y * b[3] * 0.78 + b[1];
      pos[o * 3 + 2] = p.getZ(i) * b[3] * 1.05 + b[2];
      c.setHex(0x2f7a3f).lerp(new T.Color(0x6fb04a), clamp(y * 0.5 + 0.5, 0, 1) * 0.8);
      col[o * 3] = c.r * shade; col[o * 3 + 1] = c.g * shade; col[o * 3 + 2] = c.b * shade;
      o++;
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new T.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

function buildMountain(T, R, H, seed, detail) {
  let g = new T.IcosahedronGeometry(1, detail);
  if (g.index) g = g.toNonIndexed();
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3), c = new T.Color(), rock = new T.Color(0x6f6454), peak = new T.Color(0x9c9484);
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const len = Math.hypot(x, y, z) || 1; x /= len; y /= len; z /= len;
    const n = fbm(x * 2.2 + seed, z * 2.2 + seed * 1.7 + y * 1.3);
    const ridge = 1 - Math.abs(fbm(x * 3.1 + seed * 0.3, z * 3.1 + y) * 2 - 1);
    let h = Math.pow(Math.max(0, y), 0.85) * (0.72 + 0.6 * ridge) * (0.8 + 0.5 * n);
    const rad = R * (0.85 + 0.3 * n);
    pos.setXYZ(i, x * rad, h * H - 2, z * rad);
    c.setHex(0x2d5a33).lerp(rock, smoothstep(0.18, 0.5, h)).lerp(peak, smoothstep(0.62, 0.95, h));
    const v = 0.82 + 0.3 * n;
    col[i * 3] = c.r * v; col[i * 3 + 1] = c.g * v; col[i * 3 + 2] = c.b * v;
  }
  g.setAttribute("color", new T.Float32BufferAttribute(col, 3));
  pos.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

function makeGlowTexture(T, stops, size) {
  const cv = document.createElement("canvas"); cv.width = cv.height = size;
  const x = cv.getContext("2d"), g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(s => g.addColorStop(s[0], s[1]));
  x.fillStyle = g; x.fillRect(0, 0, size, size);
  const tex = new T.CanvasTexture(cv); if (T.SRGBColorSpace) tex.colorSpace = T.SRGBColorSpace;
  return tex;
}
function makeCloudTexture(T, rng) {
  const cv = document.createElement("canvas"); cv.width = 256; cv.height = 96;
  const x = cv.getContext("2d");
  for (let i = 0; i < 16; i++) {
    const px = 40 + rng() * 176, py = 36 + rng() * 26, r = 22 + rng() * 26;
    const g = x.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, "rgba(255,255,255,0.55)"); g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g; x.fillRect(0, 0, 256, 96);
  }
  const tex = new T.CanvasTexture(cv); if (T.SRGBColorSpace) tex.colorSpace = T.SRGBColorSpace;
  return tex;
}

/* ---------------- sky shader ---------------- */
const SKY_VERT = "varying vec3 vDir;\nvoid main(){\n  vDir = position;\n  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n}\n";
const SKY_FRAG = [
  "uniform vec3 topColor;", "uniform vec3 horizonColor;", "uniform vec3 glowColor;", "uniform vec3 sunDir;", "uniform float glow;",
  "varying vec3 vDir;", "void main(){",
  "  vec3 d = normalize(vDir);",
  "  float h = clamp(d.y, 0.0, 1.0);",
  "  vec3 col = mix(horizonColor, topColor, pow(h, 0.55));",
  "  float s = max(dot(d, normalize(sunDir)), 0.0);",
  "  col += glowColor * (pow(s, 5.0) * 0.45 + pow(s, 48.0) * 0.9) * glow;",
  "  col = mix(col, horizonColor * 0.9, smoothstep(0.0, -0.25, d.y));",
  "  gl_FragColor = vec4(col, 1.0);",
  "  #include <tonemapping_fragment>", "  #include <colorspace_fragment>", "}"
].join("\n");

  WI.createEnvironment = function (opts) {
  const T = window.THREE, scene = opts.scene, camera = opts.camera;
  const rng = mulberry32(20240611);
  const ISLAND_R = 105;
  const menuSpot = { x: -90, z: 16, yaw: Math.atan2(-1, 0.18) };

  /* ---- ışıklar ---- */
  const hemi = new T.HemisphereLight(0xd8f1ff, 0x52613b, 1.35); scene.add(hemi);
  const sun = new T.DirectionalLight(0xffe2ad, 1.6);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  const SH = 30; sun.shadow.camera.left = -SH; sun.shadow.camera.right = SH; sun.shadow.camera.top = SH; sun.shadow.camera.bottom = -SH;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 260; sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.35;
  scene.add(sun); scene.add(sun.target);

  scene.background = new T.Color(0x8cc8d2);
  scene.fog = new T.Fog(0x8cc8d2, 70, 560);

  /* ---- gökyüzü ---- */
  const skyU = {
    topColor: { value: new T.Color(PALETTE.day.top) }, horizonColor: { value: new T.Color(PALETTE.day.hor) },
    glowColor: { value: new T.Color(PALETTE.day.glow) }, sunDir: { value: new T.Vector3(0, 1, 0) }, glow: { value: 0.3 }
  };
  const sky = new T.Mesh(new T.SphereGeometry(900, 32, 16), new T.ShaderMaterial({ uniforms: skyU, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: T.BackSide, depthWrite: false, fog: false }));
  sky.renderOrder = -100; sky.frustumCulled = false; scene.add(sky);

  const glowTex = makeGlowTexture(T, [[0, "rgba(255,255,255,1)"], [0.12, "rgba(255,236,180,0.95)"], [0.35, "rgba(255,160,80,0.4)"], [1, "rgba(255,110,40,0)"]], 128);
  const coreTex = makeGlowTexture(T, [[0, "rgba(255,255,245,1)"], [0.55, "rgba(255,246,210,1)"], [0.62, "rgba(255,230,160,0.5)"], [1, "rgba(255,200,120,0)"]], 128);
  const sunGlow = new T.Sprite(new T.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, fog: false, blending: T.AdditiveBlending }));
  const sunCore = new T.Sprite(new T.SpriteMaterial({ map: coreTex, transparent: true, depthWrite: false, fog: false }));
  sunGlow.scale.set(760, 760, 1); sunCore.scale.set(120, 120, 1); sunGlow.renderOrder = -90; sunCore.renderOrder = -89;
  sunGlow.frustumCulled = false; sunCore.frustumCulled = false; scene.add(sunGlow); scene.add(sunCore);

  // yıldızlar (gece)
  const starPos = [];
  for (let i = 0; i < 260; i++) {
    const a = rng() * Math.PI * 2, e = Math.asin(0.05 + rng() * 0.95), r = 820;
    starPos.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r);
  }
  const starGeo = new T.BufferGeometry(); starGeo.setAttribute("position", new T.Float32BufferAttribute(starPos, 3));
  const starMat = new T.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false });
  const stars = new T.Points(starGeo, starMat); stars.frustumCulled = false; stars.renderOrder = -95; scene.add(stars);

  // bulutlar
  const clouds = [], cloudTex = [makeCloudTexture(T, rng), makeCloudTexture(T, rng), makeCloudTexture(T, rng)];
  for (let i = 0; i < 12; i++) {
    const m = new T.SpriteMaterial({ map: cloudTex[i % 3], transparent: true, depthWrite: false, fog: false, opacity: 0.85 });
    const s = new T.Sprite(m), ang = rng() * Math.PI * 2, d = 260 + rng() * 360, w = 170 + rng() * 150;
    s.scale.set(w, w * 0.36, 1); s.userData = { ang, d, y: 95 + rng() * 120, spd: 0.0006 + rng() * 0.0009 };
    s.position.set(Math.cos(ang) * d, s.userData.y, Math.sin(ang) * d); s.renderOrder = -80; s.frustumCulled = false;
    scene.add(s); clouds.push(s);
  }

  /* ---- deniz ---- */
  const farSea = new T.Mesh(new T.PlaneGeometry(6000, 6000), new T.MeshStandardMaterial({ color: 0x0e5c8a, roughness: 0.4, metalness: 0.05 }));
  farSea.rotation.x = -Math.PI / 2; farSea.position.y = -1.28; farSea.receiveShadow = false; scene.add(farSea);

  const SEA_SIZE = 520, SEA_SEG = 80;
  const seaGeo = new T.PlaneGeometry(SEA_SIZE, SEA_SIZE, SEA_SEG, SEA_SEG); seaGeo.rotateX(-Math.PI / 2);
  const seaPos = seaGeo.attributes.position, seaN = seaPos.count, seaX = new Float32Array(seaN), seaZ = new Float32Array(seaN), seaTaper = new Float32Array(seaN), seaCol = new Float32Array(seaN * 3);
  {
    const shallow = new T.Color(0x38c4c8), mid = new T.Color(0x1d97b8), deep = new T.Color(0x0e5c8a), c = new T.Color();
    for (let i = 0; i < seaN; i++) {
      const x = seaPos.getX(i), z = seaPos.getZ(i), d = Math.hypot(x, z);
      seaX[i] = x; seaZ[i] = z; seaTaper[i] = 1 - smoothstep(170, 245, d);
      c.copy(shallow).lerp(mid, smoothstep(118, 160, d)).lerp(deep, smoothstep(150, 240, d));
      seaCol[i * 3] = c.r; seaCol[i * 3 + 1] = c.g; seaCol[i * 3 + 2] = c.b;
    }
  }
  seaGeo.setAttribute("color", new T.Float32BufferAttribute(seaCol, 3));
  const seaMat = new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.3, metalness: 0.1, flatShading: true });
  const sea = new T.Mesh(seaGeo, seaMat); sea.position.y = -1.2; scene.add(sea);

  const foamMat = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false });
  const foamGeo = new T.RingGeometry(116, 125, 96, 1); foamGeo.rotateX(-Math.PI / 2);
  const foam = new T.Mesh(foamGeo, foamMat); foam.position.y = -1.17; scene.add(foam);

  /* ---- ada zemini + kıyı ---- */
  const cGrass1 = new T.Color(0x3f7a3a), cGrass2 = new T.Color(0x5f9a45), cDry = new T.Color(0x8a9a4c), cDirt = new T.Color(0x7a6a45), cSand = new T.Color(0xe0cc92), cSand2 = new T.Color(0xcdb87c), cWet = new T.Color(0xb3a06f);
  const groundGeo = buildRadialDisc(T, ISLAND_R, 40, 112, -0.02, (c, x, z, r) => {
    const n1 = fbm(x * 0.07, z * 0.07), n2 = vnoise(x * 0.16 + 50, z * 0.16 + 20), jitter = (vnoise(x * 0.12, z * 0.12) - 0.5) * 9;
    c.copy(cGrass1).lerp(cGrass2, n1);
    c.lerp(cDry, smoothstep(0.55, 0.9, n2) * 0.45);
    c.lerp(cDirt, smoothstep(0.76, 0.92, vnoise(x * 0.2 + 3, z * 0.2 + 9)) * 0.5);
    const sandT = smoothstep(74, 86, r + jitter);
    c.lerp(n2 > 0.5 ? cSand : cSand2, sandT);
    c.lerp(cWet, smoothstep(97, 105, r));
    const v = 0.93 + 0.14 * vnoise(x * 0.9, z * 0.9);
    c.r *= v; c.g *= v; c.b *= v;
  });
  const ground = new T.Mesh(groundGeo, new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 1 }));
  ground.receiveShadow = true; scene.add(ground);

  const shoreGeo = new T.CylinderGeometry(ISLAND_R, 132, 2.3, 112, 1, true);
  {
    const p = shoreGeo.attributes.position, col = new Float32Array(p.count * 3), top = new T.Color(0xb3a06f), bot = new T.Color(0x2f9aa0);
    for (let i = 0; i < p.count; i++) { const c = p.getY(i) > 0 ? top : bot; col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    shoreGeo.setAttribute("color", new T.Float32BufferAttribute(col, 3));
  }
  const shore = new T.Mesh(shoreGeo, new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 1, side: T.DoubleSide }));
  shore.position.y = -1.17; shore.receiveShadow = true; scene.add(shore);

  /* ---- dağlar ve adacıklar (uzak, sisle yumuşar) ---- */
  const mountainMat = new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, flatShading: true, roughness: 1 });
  const MOUNTAINS = [
    [205, 390, 150, 112, 1, 3], [112, 430, 120, 85, 2, 3], [128, 470, 110, 40, 3, 2], [176, 380, 100, 20, 4, 2],
    [232, 450, 160, 100, 5, 2], [20, 400, 130, 80, 6, 2], [62, 440, 120, 95, 7, 2], [265, 430, 150, 110, 8, 2], [300, 410, 130, 75, 9, 2], [340, 450, 140, 100, 10, 2]
  ];
  const mountains = [];
  for (const m of MOUNTAINS) {
    const a = m[0] * Math.PI / 180, mesh = new T.Mesh(buildMountain(T, m[2], m[3], m[4] * 7.3, m[5]), mountainMat);
    mesh.position.set(Math.cos(a) * m[1], 0, Math.sin(a) * m[1]); mesh.rotation.y = m[4]; scene.add(mesh); mountains.push(mesh);
  }
  for (const m of [[150, 215, 26, 15, 21], [178, 250, 20, 11, 22], [235, 205, 24, 13, 23]]) {
    const a = m[0] * Math.PI / 180, mesh = new T.Mesh(buildMountain(T, m[2], m[3], m[4], 2), mountainMat);
    mesh.position.set(Math.cos(a) * m[1], 0, Math.sin(a) * m[1]); mesh.rotation.y = m[4]; scene.add(mesh); mountains.push(mesh);
  }

  /* ---- bitki örtüsü ---- */
  const taken = [];
  const obstacles = [];
  function scatter(count, rmin, rmax, minDist, avoid) {
    const pts = []; let tries = 0;
    while (pts.length < count && tries < count * 60) {
      tries++;
      const a = rng() * Math.PI * 2, r = Math.sqrt(rng() * (rmax * rmax - rmin * rmin) + rmin * rmin), x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (avoid && avoid(x, z)) continue;
      let ok = true;
      for (const q of taken) { const dx = q.x - x, dz = q.z - z; if (dx * dx + dz * dz < minDist * minDist) { ok = false; break; } }
      if (!ok) continue;
      const p = { x, z, r, a }; pts.push(p); taken.push(p);
    }
    return pts;
  }
  const avoidClear = (x, z) =>
    Math.hypot(x, z - 10) < 9 ||
    Math.hypot(x + 15, z + 18) < 9 ||
    Math.hypot(x - menuSpot.x, z - menuSpot.z) < 6.5;

  // --- palmiyeler ---
  const palmH = 6.4, palmLean = 1.3;
  const palmTrunkGeo = buildPalmTrunk(T, palmH, palmLean), palmFrondGeo = buildPalmFronds(T, rng, 9);
  const palmTrunkMat = new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.95 });
  const palmFrondMat = new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.8, side: T.DoubleSide });
  const palmData = [];
  const heroPalms = [[-96, 8.5, 1.15], [-96, 24.5, 1.1], [-99, 13.5, 1.2], [-100.5, 20, 1.0], [-92, 34, 1.0], [-91, -2, 1.05]];
  for (const h of heroPalms) { const p = { x: h[0], z: h[1], a: Math.atan2(h[1], h[0]), s: h[2] }; taken.push(p); palmData.push(p); }
  for (const p of scatter(24, 80, 97, 4.0, avoidClear)) { p.s = 0.85 + rng() * 0.4; palmData.push(p); }
  for (const p of scatter(70, 14, 80, 4.2, avoidClear)) { p.s = 0.8 + rng() * 0.45; p.inland = true; palmData.push(p); }
  const palmTrunks = new T.InstancedMesh(palmTrunkGeo, palmTrunkMat, palmData.length);
  const palmFronds = new T.InstancedMesh(palmFrondGeo, palmFrondMat, palmData.length);
  const palms = palmData.map(p => {
    const yaw = p.inland ? rng() * Math.PI * 2 : -p.a + (rng() - 0.5) * 0.9;
    const q = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), yaw);
    const base = new T.Matrix4().compose(new T.Vector3(p.x, 0, p.z), q, new T.Vector3(p.s, p.s * (0.9 + rng() * 0.2), p.s));
    return { base, ph: rng() * 6.28, s: p.s, x: p.x, z: p.z };
  });
  const palmTop = new T.Vector3(palmLean, palmH, 0);

