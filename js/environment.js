/* WILD ISLAND: SURVIVAL — ENVIRONMENT.JS
 * Complete tropical island environment
 * Three.js + mobile-friendly InstancedMesh
 */
(() => {
"use strict";

const WI = window.WI = window.WI || {};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

function mulberry32(seed) {
  return function () {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

WI.mulberry32 = mulberry32;

function makeGlow(T, color, size = 128) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new T.CanvasTexture(canvas);
  if (T.SRGBColorSpace) tex.colorSpace = T.SRGBColorSpace;
  return tex;
}

function createEnvironment(opts = {}) {
  const T = window.THREE;
  if (!T) throw new Error("Three.js tapılmadı.");
  if (!opts.scene) throw new Error("Environment üçün scene lazımdır.");

  const scene = opts.scene;
  const rng = mulberry32(20240611);
  const obstacles = [];
  const objects = [];
  const clock = new T.Clock();

  const ISLAND_RADIUS = 105;
  const menuSpot = { x: -90, z: 16, yaw: Math.atan2(-1, 0.18) };

  const add = (obj) => {
    scene.add(obj);
    objects.push(obj);
    return obj;
  };

  const random = (a, b) => a + rng() * (b - a);

  /* ---------------- LIGHTING ---------------- */

  const hemi = new T.HemisphereLight(0xc7e8ff, 0x52613b, 1.3);
  add(hemi);

  const sun = new T.DirectionalLight(0xffe0b0, 1.7);
  sun.position.set(-100, 150, -80);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -130;
  sun.shadow.camera.right = 130;
  sun.shadow.camera.top = 130;
  sun.shadow.camera.bottom = -130;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 350;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  sun.shadow.camera.updateProjectionMatrix();
  add(sun);
  add(sun.target);

  scene.background = new T.Color(0x8cc8d2);
  scene.fog = new T.Fog(0xb4dcea, 90, 520);

  /* ---------------- SKY ---------------- */

  const skyMaterial = new T.ShaderMaterial({
    side: T.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new T.Color(0x2f7fd0) },
      horizonColor: { value: new T.Color(0xc2e6f4) },
      glowColor: { value: new T.Color(0xfff2c0) },
      sunDirection: { value: new T.Vector3(0, 1, 0) },
      glow: { value: 0.3 }
    },
    vertexShader: `
      varying vec3 vDirection;
      void main() {
        vDirection = position;
        gl_Position = projectionMatrix *
          modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 glowColor;
      uniform vec3 sunDirection;
      uniform float glow;
      varying vec3 vDirection;

      void main() {
        vec3 d = normalize(vDirection);
        float h = clamp(d.y, 0.0, 1.0);
        vec3 col = mix(horizonColor, topColor, pow(h, 0.55));
        float s = max(dot(d, normalize(sunDirection)), 0.0);
        col += glowColor *
          (pow(s, 5.0) * 0.45 + pow(s, 48.0) * 0.9) * glow;
        float horizon = 1.0 - smoothstep(-0.25, 0.0, d.y);
        col = mix(col, horizonColor * 0.9, horizon);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `
  });

  const sky = new T.Mesh(
    new T.SphereGeometry(900, 32, 16),
    skyMaterial
  );
  sky.frustumCulled = false;
  sky.renderOrder = -100;
  add(sky);

  /* ---------------- SUN ---------------- */

  const sunGlow = new T.Sprite(
    new T.SpriteMaterial({
      map: makeGlow(T, "rgba(255,210,130,0.9)"),
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
      fog: false
    })
  );

  sunGlow.scale.set(260, 260, 1);
  sunGlow.position.set(-400, 150, -450);
  sunGlow.renderOrder = -90;
  sunGlow.frustumCulled = false;
  add(sunGlow);

  const sunCore = new T.Sprite(
    new T.SpriteMaterial({
      map: makeGlow(T, "rgba(255,250,220,1)"),
      transparent: true,
      depthWrite: false,
      fog: false
    })
  );

  sunCore.scale.set(65, 65, 1);
  sunCore.position.copy(sunGlow.position);
  sunCore.renderOrder = -89;
  sunCore.frustumCulled = false;
  add(sunCore);

  /* ---------------- STARS ---------------- */

  const starPositions = [];
  for (let i = 0; i < 350; i++) {
    const a = rng() * Math.PI * 2;
    const y = random(0.05, 0.95);
    const r = 820;
    const horizontal = Math.sqrt(1 - y * y);
    starPositions.push(
      Math.cos(a) * horizontal * r,
      y * r,
      Math.sin(a) * horizontal * r
    );
  }

  const starGeometry = new T.BufferGeometry();
  starGeometry.setAttribute(
    "position",
    new T.Float32BufferAttribute(starPositions, 3)
  );

  const starMaterial = new T.PointsMaterial({
    color: 0xffffff,
    size: 2,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false
  });

  const stars = new T.Points(starGeometry, starMaterial);
  stars.frustumCulled = false;
  stars.renderOrder = -95;
  add(stars);

  /* ---------------- OCEAN ---------------- */

  const farSea = new T.Mesh(
    new T.PlaneGeometry(6000, 6000),
    new T.MeshStandardMaterial({
      color: 0x0c557d,
      roughness: 0.35,
      metalness: 0.05
    })
  );

  farSea.rotation.x = -Math.PI / 2;
  farSea.position.y = -1.5;
  farSea.receiveShadow = false;
  add(farSea);

  const SEA_SIZE = 520;
  const seaGeometry = new T.PlaneGeometry(
    SEA_SIZE, SEA_SIZE, 64, 64
  );
  seaGeometry.rotateX(-Math.PI / 2);

  const seaPositions = seaGeometry.attributes.position;
  const originalSea = new Float32Array(seaPositions.array);
  const seaColors = [];

  const shallow = new T.Color(0x38c4c8);
  const middle = new T.Color(0x1d97b8);
  const deep = new T.Color(0x0e5c8a);
  const tempColor = new T.Color();

  for (let i = 0; i < seaPositions.count; i++) {
    const x = seaPositions.getX(i);
    const z = seaPositions.getZ(i);
    const d = Math.hypot(x, z);

    tempColor.copy(shallow)
      .lerp(middle, smooth(115, 165, d))
      .lerp(deep, smooth(155, 245, d));

    seaColors.push(tempColor.r, tempColor.g, tempColor.b);
  }

  seaGeometry.setAttribute(
    "color",
    new T.Float32BufferAttribute(seaColors, 3)
  );

  const sea = new T.Mesh(
    seaGeometry,
    new T.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.28,
      metalness: 0.08,
      flatShading: true
    })
  );

  sea.position.y = -1.2;
  add(sea);

  /* ---------------- ISLAND GROUND ---------------- */

  const groundGeometry = new T.CircleGeometry(
    ISLAND_RADIUS, 112
  );

  const groundPositions = groundGeometry.attributes.position;
  const groundColors = [];

  const grass1 = new T.Color(0x3f7a3a);
  const grass2 = new T.Color(0x5f9a45);
  const sand = new T.Color(0xe0cc92);
  const dirt = new T.Color(0x806c46);

  function noise(x, z) {
    return (
      Math.sin(x * 0.13) * 0.5 +
      Math.cos(z * 0.16) * 0.3 +
      Math.sin((x + z) * 0.08) * 0.2
    );
  }

  for (let i = 0; i < groundPositions.count; i++) {
    const x = groundPositions.getX(i);
    const z = groundPositions.getY(i);
    const r = Math.hypot(x, z);
    const n = noise(x, z);

    tempColor.copy(grass1).lerp(grass2, clamp(n + 0.5, 0, 1));
    tempColor.lerp(dirt, smooth(55, 75, r) * 0.3);
    tempColor.lerp(sand, smooth(72 + n * 4, 91 + n * 3, r));

    groundColors.push(
      tempColor.r,
      tempColor.g,
      tempColor.b
    );
  }

  groundGeometry.setAttribute(
    "color",
    new T.Float32BufferAttribute(groundColors, 3)
  );

  const ground = new T.Mesh(
    groundGeometry,
    new T.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 1
    })
  );

  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.03;
  ground.receiveShadow = true;
  add(ground);

  /* ---------------- SHORE ---------------- */

  const shore = new T.Mesh(
    new T.CylinderGeometry(
      ISLAND_RADIUS,
      ISLAND_RADIUS + 8,
      2.5,
      112,
      1,
      true
    ),
    new T.MeshStandardMaterial({
      color: 0x9c9a68,
      roughness: 1,
      side: T.DoubleSide
    })
  );

  shore.position.y = -1.25;
  shore.receiveShadow = true;
  add(shore);

  const foam = new T.Mesh(
    new T.RingGeometry(105, 111, 112),
    new T.MeshBasicMaterial({
      color: 0xe1ffff,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      side: T.DoubleSide
    })
  );

  foam.rotation.x = -Math.PI / 2;
  foam.position.y = -1.05;
  add(foam);

  /* ---------------- MOUNTAINS ---------------- */

  const mountainMaterial = new T.MeshStandardMaterial({
    color: 0x777365,
    flatShading: true,
    roughness: 1
  });

  const mountainGeometry = new T.IcosahedronGeometry(1, 2);

  const mountainData = [
    [200, 390, 145, 105],
    [115, 430, 120, 85],
    [130, 470, 110, 75],
    [175, 380, 100, 90],
    [235, 450, 160, 110],
    [20, 400, 130, 80],
    [65, 440, 120, 95],
    [265, 430, 150, 110],
    [300, 410, 130, 75],
    [340, 450, 140, 100]
  ];

  for (const m of mountainData) {
    const angle = m[0] * Math.PI / 180;
    const mesh = new T.Mesh(
      mountainGeometry,
      mountainMaterial
    );

    mesh.position.set(
      Math.cos(angle) * m[1],
      m[3] * 0.35,
      Math.sin(angle) * m[1]
    );

    mesh.scale.set(m[2], m[3], m[2]);
    mesh.rotation.y = random(0, Math.PI);
    mesh.receiveShadow = true;
    add(mesh);
  }

  /* ---------------- CLOUDS ---------------- */

  const clouds = [];
  const cloudTexture = makeGlow(
    T, "rgba(255,255,255,0.6)", 128
  );

  for (let i = 0; i < 14; i++) {
    const material = new T.SpriteMaterial({
      map: cloudTexture,
      transparent: true,
      opacity: random(0.35, 0.75),
      depthWrite: false,
      fog: false
    });

    const cloud = new T.Sprite(material);
    const angle = rng() * Math.PI * 2;
    const distance = random(230, 520);
    const width = random(100, 190);

    cloud.position.set(
      Math.cos(angle) * distance,
      random(100, 180),
      Math.sin(angle) * distance
    );

    cloud.scale.set(width, width * 0.35, 1);
    cloud.userData.speed = random(0.7, 2.0);
    cloud.frustumCulled = false;
    add(cloud);
    clouds.push(cloud);
  }

  /* ---------------- VEGETATION ---------------- */

  const taken = [];

  function isClear(x, z) {
    return (
      Math.hypot(x, z - 10) < 9 ||
      Math.hypot(x + 15, z + 18) < 9 ||
      Math.hypot(x - menuSpot.x, z - menuSpot.z) < 8
    );
  }

  function scatter(count, minRadius, maxRadius, minDistance) {
    const points = [];
    let tries = 0;

    while (points.length < count && tries < count * 80) {
      tries++;

      const angle = rng() * Math.PI * 2;
      const radius = Math.sqrt(
        rng() * (maxRadius * maxRadius - minRadius * minRadius) +
        minRadius * minRadius
      );

      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      if (isClear(x, z)) continue;

      let valid = true;

      for (const p of taken) {
        if (Math.hypot(p.x - x, p.z - z) < minDistance) {
          valid = false;
          break;
        }
      }

      if (!valid) continue;

      const point = { x, z };
      points.push(point);
      taken.push(point);
    }

    return points;
  }

  const dummy = new T.Object3D();

  /* ---------------- PALM TREES ---------------- */

  const palmTrunkGeometry = new T.CylinderGeometry(
    0.18, 0.34, 6.5, 7, 5
  );

  const palmTrunkMaterial = new T.MeshStandardMaterial({
    color: 0x795334,
    roughness: 1
  });

  const palmLeafGeometry = new T.ConeGeometry(
    2.2, 0.16, 5, 1
  );

  const palmLeafMaterial = new T.MeshStandardMaterial({
    color: 0x397b32,
    roughness: 0.9,
    side: T.DoubleSide
  });

  const palmPoints = scatter(75, 18, 88, 5);

  const palmTrunks = new T.InstancedMesh(
    palmTrunkGeometry,
    palmTrunkMaterial,
    palmPoints.length
  );

  const palmLeaves = new T.InstancedMesh(
    palmLeafGeometry,
    palmLeafMaterial,
    palmPoints.length * 7
  );

  palmTrunks.castShadow = true;
  palmTrunks.receiveShadow = true;
  palmLeaves.castShadow = true;

  palmPoints.forEach((p, i) => {
    const height = random(0.8, 1.25);
    const scale = random(0.85, 1.2);

    dummy.position.set(p.x, 3.2 * height, p.z);
    dummy.rotation.set(
      random(-0.04, 0.04),
      random(0, Math.PI * 2),
      random(-0.08, 0.08)
    );
    dummy.scale.set(scale, height, scale);
    dummy.updateMatrix();
    palmTrunks.setMatrixAt(i, dummy.matrix);

    obstacles.push({
      x: p.x,
      z: p.z,
      r: 0.85 * scale,
      type: "tree"
    });

    for (let j = 0; j < 7; j++) {
      const angle = j / 7 * Math.PI * 2;
      const radius = random(1.3, 2.1) * scale;

      dummy.position.set(
        p.x + Math.cos(angle) * radius,
        6.4 * height,
        p.z + Math.sin(angle) * radius
      );

      dummy.rotation.set(
        random(-0.3, 0.3),
        -angle,
        random(-0.3, 0.3)
      );

      dummy.scale.set(
        random(0.8, 1.2),
        random(0.8, 1.4),
        random(0.8, 1.2)
      );

      dummy.updateMatrix();
      palmLeaves.setMatrixAt(i * 7 + j, dummy.matrix);
    }
  });

  palmTrunks.instanceMatrix.needsUpdate = true;
  palmLeaves.instanceMatrix.needsUpdate = true;
  add(palmTrunks);
  add(palmLeaves);

  /* ---------------- BROADLEAF TREES ---------------- */

  const treePoints = scatter(65, 20, 84, 5);

  const treeTrunkGeometry = new T.CylinderGeometry(
    0.22, 0.38, 4.5, 7
  );

  const treeCrownGeometry = new T.IcosahedronGeometry(1, 1);

  const treeTrunks = new T.InstancedMesh(
    treeTrunkGeometry,
    new T.MeshStandardMaterial({ color: 0x61452c }),
    treePoints.length
  );

  const treeCrowns = new T.InstancedMesh(
    treeCrownGeometry,
    new T.MeshStandardMaterial({
      color: 0x34783a,
      roughness: 1
    }),
    treePoints.length
  );

  treeTrunks.castShadow = true;
  treeCrowns.castShadow = true;
  treeCrowns.receiveShadow = true;

  treePoints.forEach((p, i) => {
    const h = random(0.8, 1.3);
    const crown = random(2.1, 3.3);

    dummy.position.set(p.x, 2.2 * h, p.z);
    dummy.scale.set(1, h, 1);
    dummy.rotation.y = random(0, Math.PI * 2);
    dummy.updateMatrix();
    treeTrunks.setMatrixAt(i, dummy.matrix);

    dummy.position.set(p.x, 4.7 * h, p.z);
    dummy.scale.set(crown, crown * 0.75, crown);
    dummy.rotation.set(
      random(-0.15, 0.15),
      random(0, Math.PI * 2),
      random(-0.15, 0.15)
    );
    dummy.updateMatrix();
    treeCrowns.setMatrixAt(i, dummy.matrix);

    obstacles.push({
      x: p.x,
      z: p.z,
      r: 0.9,
      type: "tree"
    });
  });

  treeTrunks.instanceMatrix.needsUpdate = true;
  treeCrowns.instanceMatrix.needsUpdate = true;
  add(treeTrunks);
  add(treeCrowns);

  /* ---------------- BUSHES ---------------- */

  const bushPoints = scatter(150, 12, 94, 2.2);

  const bushGeometry = new T.IcosahedronGeometry(1, 1);
  const bushMesh = new T.InstancedMesh(
    bushGeometry,
    new T.MeshStandardMaterial({
      color: 0x477e35,
      roughness: 1
    }),
    bushPoints.length
  );

  bushPoints.forEach((p, i) => {
    const s = random(0.45, 1.0);
    dummy.position.set(p.x, s * 0.55, p.z);
    dummy.scale.set(s * 1.3, s, s * 1.3);
    dummy.rotation.y = random(0, Math.PI * 2);
    dummy.updateMatrix();
    bushMesh.setMatrixAt(i, dummy.matrix);
  });

  bushMesh.instanceMatrix.needsUpdate = true;
  add(bushMesh);

  /* ---------------- ROCKS ---------------- */

  const rockPoints = scatter(95, 12, 98, 2.4);

  const rockGeometry = new T.IcosahedronGeometry(1, 1);
  const rockMesh = new T.InstancedMesh(
    rockGeometry,
    new T.MeshStandardMaterial({
      color: 0x77766b,
      roughness: 1,
      flatShading: true
    }),
    rockPoints.length
  );

  rockMesh.castShadow = true;
  rockMesh.receiveShadow = true;

  rockPoints.forEach((p, i) => {
    const s = random(0.35, 1.2);

    dummy.position.set(p.x, s * 0.45, p.z);
    dummy.scale.set(
      s * random(0.8, 1.5),
      s * random(0.5, 0.9),
      s * random(0.8, 1.4)
    );
    dummy.rotation.set(
      random(0, 0.3),
      random(0, Math.PI),
      random(0, 0.3)
    );

    dummy.updateMatrix();
    rockMesh.setMatrixAt(i, dummy.matrix);

    obstacles.push({
      x: p.x,
      z: p.z,
      r: s * 0.8,
      type: "rock"
    });
  });

  rockMesh.instanceMatrix.needsUpdate = true;
  add(rockMesh);

  /* ---------------- GRASS ---------------- */

  const grassPoints = scatter(500, 10, 95, 0.8);
  const grassGeometry = new T.ConeGeometry(0.12, 0.7, 3);

  const grassMesh = new T.InstancedMesh(
    grassGeometry,
    new T.MeshStandardMaterial({
      color: 0x609b43,
      roughness: 1
    }),
    grassPoints.length
  );

  grassPoints.forEach((p, i) => {
    dummy.position.set(p.x, 0.28, p.z);
    dummy.scale.setScalar(random(0.5, 1.4));
    dummy.rotation.z = random(-0.2, 0.2);
    dummy.rotation.y = random(0, Math.PI * 2);
    dummy.updateMatrix();
    grassMesh.setMatrixAt(i, dummy.matrix);
  });

  grassMesh.instanceMatrix.needsUpdate = true;
  add(grassMesh);

  /* ---------------- BEACH DETAILS ---------------- */

  const beachPoints = [];
  for (let i = 0; i < 100; i++) {
    const angle = rng() * Math.PI * 2;
    const radius = random(76, 91);
    beachPoints.push({
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius
    });
  }

  const shellGeometry = new T.SphereGeometry(0.13, 6, 5);
  const shellMesh = new T.InstancedMesh(
    shellGeometry,
    new T.MeshStandardMaterial({
      color: 0xe7d5ae,
      roughness: 0.9
    }),
    beachPoints.length
  );

  beachPoints.forEach((p, i) => {
    dummy.position.set(p.x, 0.08, p.z);
    dummy.scale.set(1.3, 0.5, 0.8);
    dummy.rotation.y = random(0, Math.PI);
    dummy.updateMatrix();
    shellMesh.setMatrixAt(i, dummy.matrix);
  });

  shellMesh.instanceMatrix.needsUpdate = true;
  add(shellMesh);

  /* ---------------- ENVIRONMENT UPDATE ---------------- */

  let elapsed = 0;
  let dayTime = 0.28;

  function update(delta, timeValue) {
    if (typeof delta !== "number" || !Number.isFinite(delta)) {
      delta = clock.getDelta();
    }

    delta = clamp(delta, 0, 0.08);
    elapsed += delta;

    const daySpeed = 0.003;
    dayTime = (dayTime + delta * daySpeed) % 1;

    const angle = dayTime * Math.PI * 2 - Math.PI / 2;
    const sunHeight = Math.sin(angle);
    const daylight = smooth(-0.18, 0.35, sunHeight);

    const sunset = 1 - smooth(0.05, 0.65, Math.abs(sunHeight));
    const night = 1 - daylight;

    const sunX = Math.cos(angle) * 180;
    const sunY = Math.max(-20, sunHeight * 190);
    const sunZ = -100;

    sun.position.set(sunX, sunY, sunZ);
    sun.target.position.set(0, 0, 0);

    hemi.intensity = lerp(0.28, 1.4, daylight);
    sun.intensity = lerp(0.08, 1.7, daylight);

    skyMaterial.uniforms.sunDirection.value
      .set(sunX, sunY, sunZ).normalize();

    const dayTop = new T.Color(0x2f7fd0);
    const nightTop = new T.Color(0x040a1c);
    const sunsetTop = new T.Color(0x34447f);

    const dayHorizon = new T.Color(0xc2e6f4);
    const nightHorizon = new T.Color(0x14234a);
    const sunsetHorizon = new T.Color(0xff9b5a);

    const top = new T.Color();
    const horizon = new T.Color();

    top.copy(nightTop).lerp(dayTop, daylight);
    top.lerp(sunsetTop, sunset * 0.8);

    horizon.copy(nightHorizon).lerp(dayHorizon, daylight);
  
