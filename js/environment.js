/* ============================================================
   WILD ISLAND: SURVIVAL
   ENVIRONMENT.JS — COMPLETE ENVIRONMENT SYSTEM
   Three.js | Android | Mobile + Desktop
   ============================================================ */

(() => {
"use strict";

const WI = window.WI = window.WI || {};
const T = window.THREE;

if (!T) {
  console.error("WILD ISLAND: Three.js yüklənmədi.");
  return;
}

const clamp = (v,a,b) => Math.max(a,Math.min(b,v));

const lerp = (a,b,t) => a+(b-a)*t;

const smoothstep = (a,b,x) => {
  const t = clamp((x-a)/(b-a),0,1);
  return t*t*(3-2*t);
};

function createEnvironment(opts = {}) {

  const scene = opts.scene;
  const camera = opts.camera;
  const renderer = opts.renderer;

  if (!scene) {
    throw new Error("Environment: scene gerekli.");
  }

  const root = new T.Group();
  root.name = "WI_ENVIRONMENT";

  scene.add(root);

  const objects = [];
  const obstacles = [];

  const state = {
    dayTime: 0.25,
    daylight: 1,
    night: 0,
    sunset: 0,
    elapsed: 0,
    quality: opts.quality || "medium"
  };

  let disposed = false;

  /* ========================================================
     MATERIALS
     ======================================================== */

  const skyUniforms = {
    topColor: {
      value: new T.Color(0x2879b5)
    },
    bottomColor: {
      value: new T.Color(0xa8d9e8)
    },
    nightColor: {
      value: new T.Color(0x071329)
    }
  };

  /* ========================================================
     SKY
     ======================================================== */

  const skyGeometry = new T.SphereGeometry(
    600,32,24
  );

  const skyMaterial = new T.ShaderMaterial({
    uniforms: skyUniforms,

    vertexShader: `
      varying float vHeight;

      void main() {
        vHeight = normalize(position).y;

        gl_Position = projectionMatrix *
          modelViewMatrix *
          vec4(position,1.0);
      }
    `,

    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform vec3 nightColor;

      varying float vHeight;

      void main() {
        float h = smoothstep(-0.15,0.9,vHeight);

        vec3 daySky = mix(
          bottomColor,
          topColor,
          h
        );

        float horizon = smoothstep(
          -0.2,0.45,vHeight
        );

        vec3 nightSky = mix(
          vec3(0.015,0.025,0.07),
          nightColor,
          horizon
        );

        gl_FragColor = vec4(daySky,1.0);
      }
    `,

    side: T.BackSide,
    depthWrite: false,
    depthTest: true
  });

  const sky = new T.Mesh(
    skyGeometry,
    skyMaterial
  );

  sky.name = "WI_SKY";
  sky.renderOrder = -1000;
  sky.frustumCulled = false;

  root.add(sky);
  objects.push(sky);

  /* ========================================================
     LIGHTING
     ======================================================== */

  const hemisphere = new T.HemisphereLight(
    0xbce8ff,
    0x514331,
    0.9
  );

  root.add(hemisphere);

  const ambient = new T.AmbientLight(
    0xffffff,
    0.35
  );

  root.add(ambient);

  const sunLight = new T.DirectionalLight(
    0xffe6b5,
    2.0
  );

  sunLight.position.set(100,200,80);
  sunLight.target.position.set(0,0,0);

  root.add(sunLight);
  root.add(sunLight.target);

  sunLight.castShadow =
    state.quality !== "low";

  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;

  sunLight.shadow.camera.left = -120;
  sunLight.shadow.camera.right = 120;
  sunLight.shadow.camera.top = 120;
  sunLight.shadow.camera.bottom = -120;

  sunLight.shadow.bias = -0.0003;

  const moonLight = new T.DirectionalLight(
    0x7899d9,
    0.18
  );

  moonLight.position.set(-100,100,-80);

  root.add(moonLight);

  /* ========================================================
     SUN
     ======================================================== */

  const sunGeometry = new T.SphereGeometry(
    12,24,16
  );

  const sunMaterial = new T.MeshBasicMaterial({
    color: 0xffe4a3
  });

  const sun = new T.Mesh(
    sunGeometry,
    sunMaterial
  );

  root.add(sun);
  objects.push(sun);

  /* ========================================================
     MOON
     ======================================================== */

  const moonGeometry = new T.SphereGeometry(
    8,20,14
  );

  const moonMaterial = new T.MeshBasicMaterial({
    color: 0xdce8ff
  });

  const moon = new T.Mesh(
    moonGeometry,
    moonMaterial
  );

  root.add(moon);
  objects.push(moon);

  /* ========================================================
     STARS
     ======================================================== */

  const starCount = 650;
  const starPositions = [];

  for (let i=0;i<starCount;i++) {

    const theta = Math.random()*Math.PI*2;
    const phi = Math.random()*Math.PI*0.49;

    const radius = 430;

    const x =
      radius*Math.sin(phi)*Math.cos(theta);

    const y =
      radius*Math.cos(phi);

    const z =
      radius*Math.sin(phi)*Math.sin(theta);

    starPositions.push(x,y,z);
  }

  const starGeometry = new T.BufferGeometry();

  starGeometry.setAttribute(
    "position",
    new T.Float32BufferAttribute(
      starPositions,3
    )
  );

  const starMaterial = new T.PointsMaterial({
    color: 0xffffff,
    size: 1.7,
    transparent: true,
    opacity: 0,
    sizeAttenuation: false,
    depthWrite: false
  });

  const stars = new T.Points(
    starGeometry,
    starMaterial
  );

  root.add(stars);
  objects.push(stars);

  /* ========================================================
     DISTANT MOUNTAINS
     ======================================================== */

  const mountainGroup = new T.Group();

  mountainGroup.name = "WI_DISTANT_MOUNTAINS";

  const mountainMaterials = [
    new T.MeshBasicMaterial({
      color: 0x405b62
    }),
    new T.MeshBasicMaterial({
      color: 0x526b70
    }),
    new T.MeshBasicMaterial({
      color: 0x354b56
    })
  ];

  const mountainGeometry = new T.ConeGeometry(
    1,1,7
  );

  for (let i=0;i<18;i++) {

    const angle =
      (i/18)*Math.PI*2;

    const radius = 240+Math.random()*35;

    const height = 45+Math.random()*65;
    const width = 35+Math.random()*35;

    const mountain = new T.Mesh(
      mountainGeometry,
      mountainMaterials[i%3]
    );

    mountain.position.set(
      Math.cos(angle)*radius,
      height*0.25-12,
      Math.sin(angle)*radius
    );

    mountain.scale.set(
      width,
      height,
      width
    );

    mountain.rotation.y = Math.random()*Math.PI;

    mountainGroup.add(mountain);
  }

  root.add(mountainGroup);

  /* ========================================================
     CLOUDS
     ======================================================== */

  const cloudGroup = new T.Group();

  cloudGroup.name = "WI_CLOUDS";

  const cloudMaterial = new T.MeshBasicMaterial({
    color: 0xf2f6f5,
    transparent: true,
    opacity: 0.78,
    depthWrite: false
  });

  const cloudGeometry = new T.SphereGeometry(
    1,10,8
  );

  const cloudCount =
    state.quality === "low" ? 5 : 10;

  const clouds = [];

  for (let i=0;i<cloudCount;i++) {

    const cloud = new T.Group();

    const pieces =
      4+Math.floor(Math.random()*4);

    for (let j=0;j<pieces;j++) {

      const puff = new T.Mesh(
        cloudGeometry,
        cloudMaterial
      );

      puff.position.set(
        (Math.random()-0.5)*12,
        Math.random()*2,
        (Math.random()-0.5)*7
      );

      const size = 3+Math.random()*4;

      puff.scale.set(
        size,
        size*0.48,
        size*0.7
      );

      cloud.add(puff);
    }

    const angle =
      (i/cloudCount)*Math.PI*2;

    const radius =
      125+Math.random()*70;

    cloud.position.set(
      Math.cos(angle)*radius,
      65+Math.random()*30,
      Math.sin(angle)*radius
    );

    cloud.rotation.y = Math.random()*Math.PI;

    cloud.userData.speed =
      0.001+Math.random()*0.002;

    cloudGroup.add(cloud);
    clouds.push(cloud);
  }

  root.add(cloudGroup);

  /* ========================================================
     ATMOSPHERE FOG
     ======================================================== */

  if (!scene.fog) {
    scene.fog = new T.Fog(
      0xa8d5df,
      100,
      450
    );
  }

  const fogColorDay = new T.Color(0xa8d5df);
  const fogColorSunset = new T.Color(0xd58a65);
  const fogColorNight = new T.Color(0x101c35);

  /* ========================================================
     QUALITY
     ======================================================== */

  function setQuality(quality) {

    if (!["low","medium","high"].includes(quality)) {
      quality = "medium";
    }

    state.quality = quality;

    sunLight.castShadow =
      quality !== "low";

    if (renderer) {
      renderer.shadowMap.enabled =
        quality !== "low";
    }

    clouds.forEach((cloud,i) => {
      cloud.visible =
        quality !== "low" || i<5;
    });
  }

  /* ========================================================
     WEATHER COLORS
     ======================================================== */

  function updateSkyColors(daylight,sunset,night) {

    const topDay = new T.Color(0x2879b5);
    const bottomDay = new T.Color(0xa8d9e8);

    const topSunset = new T.Color(0xe47c52);
    const bottomSunset = new T.Color(0xffc18b);

    const topNight = new T.Color(0x071329);
    const bottomNight = new T.Color(0x26334d);

    const top = topDay.clone();
    const bottom = bottomDay.clone();

    top.lerp(topSunset,sunset);
    bottom.lerp(bottomSunset,sunset);

    top.lerp(topNight,night);
    bottom.lerp(bottomNight,night);

    skyUniforms.topColor.value.copy(top);
    skyUniforms.bottomColor.value.copy(bottom);

    if (scene.fog && scene.fog.color) {

      const fog = fogColorDay.clone();

      fog.lerp(fogColorSunset,sunset);
      fog.lerp(fogColorNight,night);

      scene.fog.color.copy(fog);
    }
  }

  /* ========================================================
     MAIN UPDATE
     ======================================================== */

  function update(delta, externalDay) {

    if (disposed) return;

    let dt = Number(delta);

    if (!Number.isFinite(dt)) {
      dt = 0.016;
    }

    dt = clamp(dt,0,0.08);

    state.elapsed += dt;

    if (
      Number.isFinite(externalDay)
    ) {
      state.dayTime =
        ((externalDay%1)+1)%1;
    } else {
      state.dayTime =
        (state.dayTime+dt/360)%1;
    }

    const day = state.dayTime;

    /*
      Saat 06:00 - gündüz başlayır
      Saat 12:00 - günəş ən yüksək nöqtədədir
      Saat 18:00 - gün batımı
      Saat 00:00 - gecə
    */

    const angle =
      (day-0.25)*Math.PI*2;

    const sunHeight = Math.cos(angle);

    const daylight = smoothstep(
      -0.16,
      0.24,
      sunHeight
    );

    const sunset =
      Math.max(
        smoothstep(0.55,0.95,1-Math.abs(sunHeight)),
        smoothstep(0.55,0.95,1-Math.abs(sunHeight))
      ) * daylight;

    const night = 1-daylight;

    state.daylight = daylight;
    state.night = night;
    state.sunset = sunset;

    /* Sun position */

    const sunX = Math.sin(angle)*300;
    const sunY = sunHeight*280;
    const sunZ = -100;

    sun.position.set(
      sunX,sunY,sunZ
    );

    sun.visible = sunY > -30;

    sunLight.position.set(
      sunX,sunY,sunZ
    );

    sunLight.intensity =
      2.1*daylight;

    /* Moon position */

    moon.position.set(
      -sunX,
      -sunY,
      100
    );

    moon.visible = night > 0.15;

    moonLight.intensity =
      0.22*night;

    /* Ambient lighting */

    hemisphere.intensity =
      0.22+daylight*0.75;

    ambient.intensity =
      0.12+daylight*0.35;

    /* Stars */

    stars.material.opacity =
      smoothstep(0.05,0.8,night)*0.95;

    stars.visible = night > 0.05;

    /* Sky */

    updateSkyColors(
      daylight,
      sunset,
      night
    );

    /* Cloud movement */

    for (const cloud of clouds) {

      cloud.position.x +=
        cloud.userData.speed*dt*35;

      cloud.rotation.y +=
        cloud.userData.speed*dt*0.5;

      if (cloud.position.x > 230) {
        cloud.position.x = -230;
      }
    }

    /* Keep sky around camera */

    if (camera) {
      sky.position.copy(camera.position);
      stars.position.copy(camera.position);
    }

    /* Mountain visibility */

    mountainGroup.visible = true;
  }

  /* ========================================================
     DISPOSE
     ======================================================== */

  function dispose() {

    if (disposed) return;

    disposed = true;

    scene.remove(root);

    const geometries = new Set();
    const materials = new Set();

    root.traverse(object => {

      if (object.geometry) {
        geometries.add(object.geometry);
      }

      if (object.material) {

        if (Array.isArray(object.material)) {
          object.material.forEach(m => materials.add(m));
        } else {
          materials.add(object.material);
        }
      }
    });

    geometries.forEach(geometry => {
      geometry.dispose();
    });

    materials.forEach(material => {
      material.dispose();
    });

    objects.length = 0;
    clouds.length = 0;
    obstacles.length = 0;
  }

  /* ========================================================
     INITIALIZATION
     ======================================================== */

  setQuality(state.quality);
  update(0,0.25);

  return {
    scene,
    camera,
    renderer,

    root,
    objects,
    obstacles,
    state,

    update,
    setQuality,
    dispose,

    get time() {
      return state.dayTime;
    },

    get daylight() {
      return state.daylight;
    },

    get night() {
      return state.night;
    }
  };
}

/* ============================================================
   PUBLIC API
   ============================================================ */

WI.createEnvironment = createEnvironment;

console.log(
  "WILD ISLAND: Environment system loaded."
);

})();
    
