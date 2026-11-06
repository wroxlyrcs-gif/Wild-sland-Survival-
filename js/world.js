/* WILD ISLAND: SURVIVAL
   WORLD.JS — FULL WORLD SYSTEM
*/
(() => {
"use strict";

const WI = window.WI = window.WI || {};
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const rand = (a,b)=>a+Math.random()*(b-a);
const pick = a=>a[Math.floor(Math.random()*a.length)];

WI.createWorld = function(ctx={}) {
  const THREE=window.THREE;
  if(!THREE) throw new Error("Three.js tapılmadı");

  const scene=ctx.scene || new THREE.Scene();
  const world={};
  const objects=[];
  const colliders=[];
  const animals=[];
  const resources=[];
  const structures=[];
  const landmarks=[];
  const effects=[];

  const state={
    time:0,
    day:1,
    night:false,
    weather:"clear",
    temperature:25,
    wind:0,
    rain:0,
    storm:false
  };

  world.scene=scene;
  world.objects=objects;
  world.colliders=colliders;
  world.animals=animals;
  world.resources=resources;
  world.structures=structures;
  world.landmarks=landmarks;
  world.state=state;

  const mat=(color,roughness=0.9)=>new THREE.MeshStandardMaterial({
    color,roughness
  });

  const M={
    grass:mat(0x477b36),
    grass2:mat(0x668b3e),
    sand:mat(0xcab27c),
    water:mat(0x187eaa,0.25),
    wood:mat(0x79502e),
    darkWood:mat(0x49301f),
    rock:mat(0x777777),
    leaf:mat(0x245a2b),
    leaf2:mat(0x36743b),
    metal:mat(0x777e83,0.4),
    fire:mat(0xff8b24,0.4)
  };

  function add(geo,material,x,y,z,parent=scene) {
    const m=new THREE.Mesh(geo,material);
    m.position.set(x,y,z);
    m.castShadow=true;
    m.receiveShadow=true;
    parent.add(m);
    objects.push(m);
    return m;
  }

  function group(x=0,y=0,z=0) {
    const g=new THREE.Group();
    g.position.set(x,y,z);
    scene.add(g);
    objects.push(g);
    return g;
  }

  // WORLD SKY
  scene.background=new THREE.Color(0x91c6e8);
  scene.fog=new THREE.Fog(0x91c6e8,100,330);

  // ISLAND
  add(
    new THREE.CylinderGeometry(115,125,10,72),
    M.grass,0,-5,0
  );

  add(
    new THREE.CylinderGeometry(123,132,2,72),
    M.sand,0,-1,0
  );

  const sea=add(
    new THREE.PlaneGeometry(1500,1500),
    M.water,0,-1.8,0
  );
  sea.rotation.x=-Math.PI/2;

  // REGIONS
  const regions=[
    {id:"beach",name:"Beach",x:0,z:85,r:30},
    {id:"forest",name:"Forest",x:-55,z:-35,r:38},
    {id:"mountain",name:"Mountain",x:55,z:-55,r:35},
    {id:"jungle",name:"Jungle",x:-65,z:45,r:30},
    {id:"meadow",name:"Meadow",x:40,z:45,r:30},
    {id:"river",name:"River",x:0,z:-45,r:20},
    {id:"cave",name:"Cave",x:85,z:5,r:15},
    {id:"ruins",name:"Ruins",x:-15,z:-80,r:20}
  ];

  world.regions=regions;

  // HILLS
  for(let i=0;i<35;i++){
    const x=rand(-100,100);
    const z=rand(-100,100);
    if(x*x+z*z>105*105)continue;

    const h=rand(2,9);
    const hill=add(
      new THREE.SphereGeometry(1,12,10),
      M.grass2,x,h/2,z
    );
    hill.scale.set(rand(5,13),h,rand(5,13));
  }

  // TREES
  function createTree(x,z,type="normal") {
    const g=group(x,0,z);
    const height=type==="palm"?7:rand(4,7);

    const trunk=add(
      new THREE.CylinderGeometry(.3,.55,height,8),
      M.wood,0,height/2,0,g
    );

    if(type==="palm"){
      for(let i=0;i<7;i++){
        const leaf=add(
          new THREE.ConeGeometry(.45,5,5),
          M.leaf,0,0,0,g
        );
        leaf.position.set(
          Math.sin(i*Math.PI/3)*2,
          height+Math.cos(i*Math.PI/3)*.5,
          Math.cos(i*Math.PI/3)*2
        );
        leaf.rotation.z=Math.PI/2;
      }
    }else{
      for(let i=0;i<3;i++){
        add(
          new THREE.ConeGeometry(2.8-i*.4,3.5,8),
          i%2?M.leaf:M.leaf2,
          0,height+i*1.7,0,g
        );
      }
    }

    colliders.push({x,z,r:1.1,type:"tree"});
    return g;
  }

  for(let i=0;i<130;i++){
    const x=rand(-100,100);
    const z=rand(-100,100);
    if(x*x+z*z>105*105)continue;
    if(x*x+z*z<15*15)continue;
    createTree(x,z,Math.random()<.15?"palm":"normal");
  }

  // ROCKS
  for(let i=0;i<65;i++){
    const x=rand(-100,100);
    const z=rand(-100,100);
    if(x*x+z*z>105*105)continue;

    const r=rand(.7,2.5);
    const rock=add(
      new THREE.DodecahedronGeometry(r,0),
      M.rock,x,r*.6,z
    );
    rock.rotation.set(rand(0,2),rand(0,2),rand(0,2));
    colliders.push({x,z,r:r,type:"rock"});
  }

  // BUSHES
  for(let i=0;i<100;i++){
    const x=rand(-95,95);
    const z=rand(-95,95);
    if(x*x+z*z>100*100)continue;

    add(
      new THREE.SphereGeometry(rand(.5,1.1),7,6),
      M.leaf,x,.5,z
    );
  }

  // LANDMARKS
  function createLandmark(name,x,z,type="camp") {
    const g=group(x,0,z);

    if(type==="tower"){
      add(new THREE.CylinderGeometry(.25,.4,12,8),
        M.metal,0,6,0,g);
      add(new THREE.BoxGeometry(4,.3,4),
        M.metal,0,12,0,g);
    }else if(type==="ruins"){
      for(let i=0;i<4;i++){
        add(new THREE.BoxGeometry(.8,5,.8),
          M.rock,Math.sin(i*Math.PI/2)*4,2.5,
          Math.cos(i*Math.PI/2)*4,g);
      }
    }else{
      add(new THREE.BoxGeometry(6,3,5),
        M.wood,0,1.5,0,g);
      add(new THREE.ConeGeometry(5,3,4),
        M.darkWood,0,4.5,0,g);
    }

    landmarks.push({
      name,
      type,
      position:g.position,
      object:g
    });
    return g;
  }

  createLandmark("Old Camp",-35,-25);
  createLandmark("Abandoned Ruins",-15,-80,"ruins");
  createLandmark("Radio Tower",65,-55,"tower");
  createLandmark("Mountain Shelter",55,55);

  // RESOURCES
  const resourceTypes=[
    {id:"wood",color:0x9a6838},
    {id:"stone",color:0x888888},
    {id:"fiber",color:0x8eaa42},
    {id:"berries",color:0xc52d48},
    {id:"metal",color:0x8b969c}
  ];

  function spawnResource(type,x,z) {
    const data=resourceTypes.find(r=>r.id===type);
    if(!data)return null;

    const obj=add(
      new THREE.IcosahedronGeometry(.4,0),
      mat(data.color),x,.5,z
    );

    const r={
      type,
      object:obj,
      amount:Math.floor(rand(1,4)),
      collected:false
    };

    resources.push(r);
    return r;
  }

  resourceTypes.forEach(t=>{
    for(let i=0;i<18;i++){
      spawnResource(t.id,rand(-95,95),rand(-95,95));
    }
  });

  // ANIMALS
  const species={
    deer:{color:0x96623b,speed:3.5,size:1.1,aggressive:false},
    boar:{color:0x49352a,speed:2.5,size:1,aggressive:false},
    wolf:{color:0x777777,speed:4.5,size:1,aggressive:true},
    rabbit:{color:0xc5b9a4,speed:4,size:.45,aggressive:false},
    fox:{color:0xc66b2b,speed:4.2,size:.7,aggressive:false},
    bird:{color:0x344f83,speed:6,size:.4,aggressive:false},
    bear:{color:0x493224,speed:3,size:1.7,aggressive:true}
  };

  function spawnAnimal(type,x,z) {
    const s=species[type];
    if(!s)return null;

    const g=group(x,0,z);
    const bodyMat=mat(s.color);

    add(
      new THREE.BoxGeometry(s.size*1.5,s.size,s.size*2),
      bodyMat,0,s.size,0,g
    );

    add(
      new THREE.SphereGeometry(s.size*.45,10,8),
      bodyMat,0,s.size*1.4,s.size,g
    );

    for(let i=0;i<4;i++){
      add(
        new THREE.CylinderGeometry(.08,.12,s.size,6),
        bodyMat,
        (i%2?1:-1)*s.size*.45,
        s.size*.45,
        (i<2?1:-1)*s.size*.6,g
      );
    }

    const a={
      type,
      object:g,
      speed:s.speed,
      aggressive:s.aggressive,
      state:"wander",
      direction:rand(0,Math.PI*2),
      timer:rand(2,6),
      alive:true,
      health:100
    };

    animals.push(a);
    return a;
  }

  Object.keys(species).forEach(type=>{
    const count=type==="bird"?15:type==="bear"?2:6;
    for(let i=0;i<count;i++){
      spawnAnimal(type,rand(-90,90),rand(-90,90));
    }
  });

  // STRUCTURES
  function build(type,x,z) {
    const g=group(x,0,z);

    if(type==="campfire"){
      add(new THREE.CylinderGeometry(.8,1,.3,8),
        M.rock,0,.15,0,g);
      add(new THREE.ConeGeometry(.45,1.5,6),
        M.fire,0,1,0,g);
    }

    if(type==="shelter"){
      add(new THREE.BoxGeometry(5,3,5),
        M.wood,0,1.5,0,g);
      add(new THREE.ConeGeometry(4,2,4),
        M.darkWood,0,4,0,g);
    }

    if(type==="chest"){
      add(new THREE.BoxGeometry(2,1.2,1.5),
        M.wood,0,.6,0,g);
      add(new THREE.BoxGeometry(2.1,.2,1.6),
        M.darkWood,0,1.3,0,g);
    }

    if(type==="wall"){
      add(new THREE.BoxGeometry(5,2.5,.4),
        M.wood,0,1.25,0,g);
    }

    structures.push({type,object:g,x,z});
    colliders.push({x,z,r:2,type:"structure"});
    return g;
  }

  world.build=build;

  // LIGHTS
  const sun=new THREE.DirectionalLight(0xffe0ae,1.4);
  sun.position.set(70,100,40);
  sun.castShadow=true;
  scene.add(sun);

  const ambient=new THREE.AmbientLight(0xffffff,.55);
  scene.add(ambient);

  // WEATHER
  const rainGeometry=new THREE.BufferGeometry();
  const rainCount=700;
  const rainPositions=new Float32Array(rainCount*3);

  for(let i=0;i<rainCount;i++){
    rainPositions[i*3]=rand(-100,100);
    rainPositions[i*3+1]=rand(0,70);
    rainPositions[i*3+2]=rand(-100,100);
  }

  rainGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(rainPositions,3)
  );

  const rain=new THREE.Points(
    rainGeometry,
    new THREE.PointsMaterial({
      color:0xbad8ed,
      size:.13,
      transparent:true,
      opacity:.7
    })
  );
  rain.visible=false;
  scene.add(rain);

  function setWeather(type) {
    if(!["clear","rain","storm","fog"].includes(type))return;
    state.weather=type;
    state.storm=type==="storm";
    rain.visible=type==="rain"||type==="storm";
    scene.fog.density=type==="fog"?.025:0;
  }

  world.setWeather=setWeather;

  // PLAYER DISTANCE
  function getPlayerPosition() {
    if(ctx.getPlayerPosition)return ctx.getPlayerPosition();
    if(ctx.player?.position)return ctx.player.position;
    return null;
  }

  // ANIMAL AI
  function updateAnimals(dt) {
    const pp=getPlayerPosition();

    animals.forEach(a=>{
      if(!a.alive)return;

      const p=a.object.position;
      let distance=Infinity;

      if(pp){
        distance=p.distanceTo(pp);
      }

      if(a.aggressive&&distance<12){
        a.state="alert";
        if(distance<8){
          a.state="chase";
          const target=new THREE.Vector3(pp.x-p.x,0,pp.z-p.z);
          if(target.lengthSq()>0){
            target.normalize();
            p.addScaledVector(target,a.speed*dt);
            a.object.rotation.y=Math.atan2(target.x,target.z);
          }
        }
      }else if(!a.aggressive&&distance<7){
        a.state="flee";
        const dx=p.x-pp.x;
        const dz=p.z-pp.z;
        const l=Math.sqrt(dx*dx+dz*dz)||1;
        p.x+=dx/l*a.speed*dt;
        p.z+=dz/l*a.speed*dt;
      }else{
        a.state="wander";
      }

      if(a.state==="wander"||a.state==="alert"){
        a.timer-=dt;
        if(a.timer<=0){
          a.direction=rand(0,Math.PI*2);
          a.timer=rand(2,6);
        }
        p.x+=Math.sin(a.direction)*a.speed*.35*dt;
        p.z+=Math.cos(a.direction)*a.speed*.35*dt;
        a.object.rotation.y=a.direction;
      }

      p.x=clamp(p.x,-108,108);
      p.z=clamp(p.z,-108,108);

      if(a.type==="bird"){
        p.y=5+Math.sin(state.time*3+p.x)*1.5;
      }else{
        p.y=Math.abs(Math.sin(state.time*5))*0.05;
      }
    });
  }

  // DAY NIGHT
  function updateDayNight(dt) {
    state.time+=dt;
    const cycle=(state.time/600)%(Math.PI*2);
    const light=(Math.sin(cycle)+1)/2;

    state.night=light<.2;
    sun.intensity=.1+light*1.5;
    ambient.intensity=.12+light*.5;

    const color=new THREE.Color().setHSL(
      .56,.35,.12+light*.4
    );

    scene.background.copy(color);
    scene.fog.color.copy(color);
  }

  // COLLISION
  function checkCollision(position,radius=.5) {
    return colliders.some(c=>{
      const dx=position.x-c.x;
      const dz=position.z-c.z;
      return Math.sqrt(dx*dx+dz*dz)<c.r+radius;
    });
  }

  function getNearbyAnimals(position,distance=15) {
    return animals.filter(a=>
      a.alive&&a.object.position.distanceTo(position)<distance
    );
  }

  function getNearbyResources(position,distance=4) {
    return resources.filter(r=>
      !r.collected&&r.object.position.distanceTo(position)<distance
    );
  }

  function getNearbyLandmarks(position,distance=30) {
    return landmarks.filter(l=>
      l.position.distanceTo(position)<distance
    );
  }

  function getRegion(position) {
    let best=null;
    let min=Infinity;

    regions.forEach(r=>{
      const d=Math.hypot(position.x-r.x,position.z-r.z);
      if(d<r.r&&d<min){
        min=d;
        best=r;
      }
    });

    return best||{id:"island",name:"Island"};
  }

  function collectResource(resource) {
    if(!resource||resource.collected)return false;
    resource.collected=true;
    resource.object.visible=false;
    return {
      type:resource.type,
      amount:resource.amount
    };
  }

  function update(dt=0.016) {
    dt=clamp(dt,0,.05);

    updateDayNight(dt);
    updateAnimals(dt);

    if(state.weather==="rain"||state.weather==="storm"){
      const positions=rain.geometry.attributes.position;
      for(let i=0;i<rainCount;i++){
        positions.array[i*3+1]-=30*dt;
        if(positions.array[i*3+1]<0){
          positions.array[i*3+1]=rand(35,70);
        }
      }
      positions.needsUpdate=true;
    }

    sea.position.y=-1.8+Math.sin(state.time)*.08;
  }

  world.update=update;
  world.checkCollision=checkCollision;
  world.getNearbyAnimals=getNearbyAnimals;
  world.getNearbyResources=getNearbyResources;
  world.getNearbyLandmarks=getNearbyLandmarks;
  world.getRegion=getRegion;
  world.collectResource=collectResource;
  world.spawnAnimal=spawnAnimal;

  world.dispose=function(){
    objects.forEach(o=>{
      if(o.parent)o.parent.remove(o);
    });
    scene.remove(rain);
    scene.remove(sun);
    scene.remove(ambient);
  };

  return world;
};

})();
