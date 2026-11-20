import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const stage=$('#stage'),toast=$('#toast');let toastTimer;
function say(t){toast.textContent=t;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2400)}
const scene=new THREE.Scene();scene.background=new THREE.Color(0x090e16);scene.fog=new THREE.FogExp2(0x090e16,.028);
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.13;renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<850?1.25:1.65));renderer.setSize(innerWidth,innerHeight);stage.appendChild(renderer.domElement);
const camera=new THREE.PerspectiveCamera(34,innerWidth/innerHeight,.035,150);camera.position.set(4.30,2.85,8.45);
const lookTarget=new THREE.Vector3(-.65,1.12,0),desiredCam=new THREE.Vector3(4.45,2.65,7.55),desiredLook=new THREE.Vector3(-.65,1.12,0);
// Luminous studio environment, broad reflection panels, not harsh point sources.
const env=document.createElement('canvas');env.width=2048;env.height=1024;let c=env.getContext('2d');let gr=c.createLinearGradient(0,0,0,1024);gr.addColorStop(0,'#3b536a');gr.addColorStop(.42,'#192a3d');gr.addColorStop(.62,'#132334');gr.addColorStop(1,'#101924');c.fillStyle=gr;c.fillRect(0,0,2048,1024);
function softbox(x,y,w,h,alpha){c.save();c.globalAlpha=alpha;c.shadowColor='#dbeeff';c.shadowBlur=52;let g=c.createLinearGradient(x,y,x+w,y);g.addColorStop(0,'#647c91');g.addColorStop(.12,'#d5e7f5');g.addColorStop(.5,'#ffffff');g.addColorStop(.9,'#d1e4f4');g.addColorStop(1,'#728ca3');c.fillStyle=g;c.fillRect(x,y,w,h);c.restore()}
softbox(95,170,140,590,.95);softbox(440,145,420,130,.96);softbox(1090,145,150,570,.88);softbox(1460,180,410,140,.89);softbox(490,65,1060,36,.58);softbox(1950,280,50,380,.6);
const environment=new THREE.CanvasTexture(env);environment.mapping=THREE.EquirectangularReflectionMapping;environment.colorSpace=THREE.SRGBColorSpace;
const pmrem=new THREE.PMREMGenerator(renderer),envRT=pmrem.fromEquirectangular(environment);scene.environment=envRT.texture;scene.environmentIntensity=1.05;environment.dispose();pmrem.dispose();
scene.add(new THREE.HemisphereLight(0xc9e5fd,0x151b25,.82));
RectAreaLightUniformsLib.init();function area(x,y,z,w,h,intensity,color){let l=new THREE.RectAreaLight(color,intensity,w,h);l.position.set(x,y,z);l.lookAt(0,1,0);scene.add(l)}area(-4.5,5,3.5,5,5,2.5,0xdcefff);area(4,4.8,-3.7,4,6,3.1,0xf4f8ff);area(0,7,1,10,2.6,2.25,0xd7edff);
const key=new THREE.DirectionalLight(0xe6f3ff,1.3);key.position.set(-5.3,9,6);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-9;key.shadow.camera.right=9;key.shadow.camera.top=9;key.shadow.camera.bottom=-9;key.shadow.bias=-.0003;scene.add(key);
const rimLight=new THREE.DirectionalLight(0xb2dbff,1.25);rimLight.position.set(5,6,-4);scene.add(rimLight);
const mat=(hex,metalness=0,roughness=.5)=>new THREE.MeshStandardMaterial({color:hex,metalness,roughness});
const floor=new THREE.Mesh(new THREE.PlaneGeometry(90,90),mat(0x0c1118,.56,.32));floor.rotation.x=-Math.PI/2;floor.position.y=-.055;floor.receiveShadow=true;scene.add(floor);
const podium=new THREE.Group();podium.position.x=-.70;scene.add(podium);const base=new THREE.Mesh(new THREE.CylinderGeometry(3.67,3.7,.25,128),mat(0x0b131d,.52,.3));base.position.y=.06;base.receiveShadow=true;podium.add(base);const upper=new THREE.Mesh(new THREE.CylinderGeometry(3.66,3.66,.012,128),mat(0x121923,.42,.38));upper.position.y=.192;upper.receiveShadow=true;podium.add(upper);const ring=new THREE.Mesh(new THREE.TorusGeometry(3.665,.016,10,160),new THREE.MeshBasicMaterial({color:0xa2dbff}));ring.rotation.x=-Math.PI/2;ring.position.y=.204;podium.add(ring);const ringHalo=new THREE.Mesh(new THREE.TorusGeometry(3.69,.032,6,160),new THREE.MeshBasicMaterial({color:0x244a67,transparent:true,opacity:.4}));ringHalo.rotation.x=-Math.PI/2;ringHalo.position.y=.192;podium.add(ringHalo);
const wallMat=mat(0x171b23,.44,.56);function wall(x,y,z,w,h,ry){let mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),wallMat);mesh.position.set(x,y,z);mesh.rotation.y=ry;scene.add(mesh)}wall(0,4,-13,29,9,0);wall(-13.8,4,0,25,9,Math.PI/2);wall(13.8,4,0,25,9,-Math.PI/2);
for(let x=-12;x<=12;x+=3.4){let p=new THREE.Mesh(new THREE.BoxGeometry(.075,8,.1),mat(0x30475b,.55,.4));p.position.set(x,4,-12.86);scene.add(p);let line=new THREE.Mesh(new THREE.BoxGeometry(.026,6.9,.055),new THREE.MeshBasicMaterial({color:0x397298}));line.position.set(x+.12,4,-12.78);scene.add(line)}
const ceilingLine=new THREE.Mesh(new THREE.TorusGeometry(10.3,.035,7,180,Math.PI),new THREE.MeshBasicMaterial({color:0xc2e5ff}));ceilingLine.rotation.set(Math.PI/2,0,-.1);ceilingLine.position.set(0,4.8,-4.8);scene.add(ceilingLine);
// Recessed panes, brushed mullions and indirect lighting give the room a second depth plane.
const graphite = mat(0x10151c, .66, .37);
const glazing = mat(0x243846, .79, .19);
const whiteLight = new THREE.MeshBasicMaterial({ color: 0xb8ddff });
const galleryLight = new THREE.MeshBasicMaterial({ color: 0xab8b64 });

function architecturalBox(size, position, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  scene.add(mesh);
  return mesh;
}

for (let x = -10; x <= 9; x += 2.5) {
  architecturalBox([2.37, 5.2, .07], [x, 2.6, -12.55], glazing);
  architecturalBox([.10, 5.6, .21], [x + 1.23, 2.8, -12.36], graphite);
}
architecturalBox([27, .08, .18], [0, .11, -12.2], whiteLight);
architecturalBox([27, .037, .12], [0, 4.7, -12.2], whiteLight);
architecturalBox([.10, .038, 21], [-13.65, 4.7, -2.2], whiteLight);
for (let z = -11.5; z < -5; z += 1.9) {
  architecturalBox([5.5, .018, .06], [6.5, 4.27, z], galleryLight);
}

// Keep a soft contact shadow beneath all four tyres, even in low-power graphics modes.
const shadowCanvas = document.createElement('canvas');
shadowCanvas.width = 128;
shadowCanvas.height = 128;
const shadowContext = shadowCanvas.getContext('2d');
const shade = shadowContext.createRadialGradient(64, 64, 5, 64, 64, 64);
shade.addColorStop(0, 'rgba(0,0,0,.82)');
shade.addColorStop(.5, 'rgba(0,0,0,.62)');
shade.addColorStop(1, 'rgba(0,0,0,0)');
shadowContext.fillStyle = shade;
shadowContext.fillRect(0, 0, 128, 128);
const contactShadow = new THREE.Mesh(
  new THREE.PlaneGeometry(3.38, 6.25),
  new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false })
);
contactShadow.rotation.x = -Math.PI / 2;
contactShadow.position.y = .202;
podium.add(contactShadow);
const carRoot=new THREE.Group();carRoot.position.x=-.70;scene.add(carRoot);let carInner=null,carScale=1,carCenter=new THREE.Vector3(),isLoaded=false,originalWing=null,wingHigh=null;
const state={tab:'overview',color:'black',finish:'gloss',wheel:'dark',spoiler:'low',seat:'leather',view:'hero',interior:null,light:'drl',signal:'off',rear:true,ambient:true,engine:false,auto:false,rotation:-.28,zoom:1,doors:{fl:0,fr:0,rl:0,rr:0,trunk:0},targetDoors:{fl:0,fr:0,rl:0,rr:0,trunk:0}};
const paints=[],glass=[],seatMaterials=[],wheelMaterials=[],lightMeshes={drl:[],low:[],rear:[],blink:[],dash:[],cabin:[]},blinkSideMap=new WeakMap(),pivots={};const lights=[];
const colors={black:0x111b28,white:0xe4e7ea,blue:0x164c95};
function partFromName(name) {
  if (/povorotnik|indicator|blinker/.test(name)) return 'blink';
  if (/lowhighbeam/.test(name)) return 'low';
  if (/led_[lr]_white/.test(name)) return 'drl';
  if (/red_glass_fonari|light_tlmid/.test(name)) return 'rear';
  if (/emissiveinterior|emissivedriverdoor|emissivepassdoor/.test(name)) return 'cabin';
  if (/priority_center_display/.test(name)) return 'dash';
  return null;
}
function setMaterialOnce(mesh,handler){if(Array.isArray(mesh.material)){mesh.material=mesh.material.map(m=>handler(m))}else mesh.material=handler(mesh.material)}
function changeColor(){const hex=colors[state.color];for(const m of paints){m.color.setHex(hex);m.metalness=state.finish==='matte'?.18:.55;m.roughness=state.finish==='matte'?.64:.22;m.clearcoat=state.finish==='matte'?0:1;m.clearcoatRoughness=.12;m.envMapIntensity=state.finish==='matte'?.7:1.35;m.needsUpdate=true}setSelected('[data-color]','color',state.color);setSelected('[data-finish]','finish',state.finish)}
function changeWheels(){
 const silver=state.wheel==='silver';
 for(const m of wheelMaterials){m.color.setHex(silver?0xb6bdc6:0x20262d);m.metalness=.78;m.roughness=silver?.29:.34;m.envMapIntensity=silver?1.2:.9;m.needsUpdate=true}
 // Both choices use the four original BMW rims. No new wheels float over the tyres.
 setSelected('[data-wheel]','wheel',state.wheel);
}
function changeSeat(){let col=state.seat==='cognac'?0x805137:state.seat==='cloth'?0x202b35:0x171b23;for(const m of seatMaterials){m.color.setHex(col);m.metalness=0;m.roughness=state.seat==='cloth'?.97:.71;m.clearcoat=state.seat==='cloth'?0:.13;m.needsUpdate=true}setSelected('[data-seat]','seat',state.seat)}
function changeSpoiler(){if(originalWing)originalWing.visible=state.spoiler==='low';if(wingHigh)wingHigh.visible=state.spoiler==='high';setSelected('[data-spoiler]','spoiler',state.spoiler)}
function setSelected(query,attr,value){$$(query).forEach(b=>{const selected=b.dataset[attr]===value;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected))})}
const openingRig = {fl:'MERIDIAM_RIG_DOOR_FRONT_LEFT',fr:'MERIDIAM_RIG_DOOR_FRONT_RIGHT',rl:'MERIDIAM_RIG_DOOR_REAR_LEFT',rr:'MERIDIAM_RIG_DOOR_REAR_RIGHT',trunk:'MERIDIAM_RIG_TRUNK_LID'};
let doorFocus = null;
function updateDoorButtons() {
  $$('[data-part]').forEach(button => {
    const opened = state.targetDoors[button.dataset.part] > 0;
    button.classList.toggle('selected', opened);
    button.setAttribute('aria-pressed', String(opened));
  });
}

function toggleDoor(part) {
  if (!pivots[openingRig[part]]) {
    say('Деталь не найдена в модели');
    return;
  }
  state.targetDoors[part] = 1 - state.targetDoors[part];
  if (part === 'fr' || part === 'rl') {
    doorFocus = state.targetDoors[part] ? part : (doorFocus === part ? null : doorFocus);
    state.zoom = 1;
  }
  updateDoorButtons();
}

function closeDoors() {
  for (const part of Object.keys(openingRig)) state.targetDoors[part] = 0;
  if (doorFocus) state.zoom = 1;
  doorFocus = null;
  updateDoorButtons();
}
function angularTarget(p,v){const signs={fl:-1,fr:1,rl:-1,rr:1};return p==='trunk'?v*.88:(signs[p]||1)*v*.67}
// Light effects target actual original GLB lenses; original albedo, opacity and geometry are retained.
function illuminate(materials, color, intensity) {
  for (const material of materials) {
    material.emissive.setHex(color);
    material.emissiveIntensity = intensity;
  }
}

function configureLights() {
  const low = state.light === 'low';
  illuminate(lightMeshes.drl, 0xd6f0ff, state.light === 'off' ? 0 : 1.8);
  illuminate(lightMeshes.low, 0xe1f2ff, low ? 2.5 : 0);
  illuminate(lightMeshes.rear, 0xff1628, state.rear ? 1.05 : 0);
  illuminate(lightMeshes.cabin, 0x58bdff, state.ambient ? 0.5 : 0);
  for (const lamp of lights) lamp.intensity = low ? 16 : 0;
  setSelected('[data-light]', 'light', state.light);
  setSelected('[data-signal]', 'signal', state.signal);
  $('#rearLight').classList.toggle('selected', state.rear);
  $('#interiorLight').classList.toggle('selected', state.ambient);
}
let audioContext;
let activeEngine;

function synthesizeEngine(context) {
  const start = context.currentTime;
  const oscillator = context.createOscillator();
  const volume = context.createGain();
  const filter = context.createBiquadFilter();

  oscillator.type = 'sawtooth';
  oscillator.frequency.setValueAtTime(31, start);
  oscillator.frequency.exponentialRampToValueAtTime(75, start + .48);
  oscillator.frequency.exponentialRampToValueAtTime(40, start + 1.55);
  filter.type = 'lowpass';
  filter.frequency.value = 230;
  volume.gain.setValueAtTime(.0001, start);
  volume.gain.exponentialRampToValueAtTime(.06, start + .14);
  volume.gain.exponentialRampToValueAtTime(.025, start + 1.5);
  oscillator.connect(filter).connect(volume).connect(context.destination);
  oscillator.start();
  return { oscillator, volume };
}

function engineSound(on) {
  if (!on) {
    if (!activeEngine) return;
    const { oscillator, volume } = activeEngine;
    activeEngine = null;
    const stop = audioContext.currentTime;
    volume.gain.cancelScheduledValues(stop);
    volume.gain.setTargetAtTime(.0001, stop, .038);
    oscillator.stop(stop + .16);
    return;
  }
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return;
  try {
    audioContext ??= new Audio();
    activeEngine = synthesizeEngine(audioContext);
    audioContext.resume().catch(error => console.warn('Web Audio:', error.message));
  } catch (error) {
    console.warn('Web Audio:', error.message);
  }
}
function toggleEngine(){state.engine=!state.engine;engineSound(state.engine);$('#digitalText').textContent=state.engine?'READY / P':'OFF';$('#rpmLevel').style.width=state.engine?'28%':'12%';$('#engineCaption').textContent=state.engine?'Двигатель запущен · приборы активны':'Система выключена';$$('[data-start-engine]').forEach(b=>b.classList.toggle('selected',state.engine));for(const m of lightMeshes.dash){m.emissive.setHex(state.engine?0x75bffc:0);m.emissiveIntensity=state.engine?.7:0}say(state.engine?'Двигатель запущен':'Двигатель выключен')}
// This export packs trim from multiple doors into shared indexed meshes.
const sharedDoorTrim = ['Object_37', 'Object_64', 'Object_79', 'Object_223', 'Object_232', 'Object_1063'];

function attachDoorTrim(car) {
  const position = new THREE.Vector3();
  const boundsPoint = new THREE.Vector3();
  carRoot.updateMatrixWorld(true);
  const toCar = carRoot.matrixWorld.clone().invert();
  for (const name of sharedDoorTrim) {
    const mesh = car.getObjectByName(name);
    if (!mesh?.isMesh || !mesh.geometry.index) continue;
    const geometry = mesh.geometry;
    const vertices = geometry.getAttribute('position');
    const index = geometry.index.array;
    const transform = toCar.clone().multiply(mesh.matrixWorld);
    const groups = { fl: [], fr: [], rl: [], rr: [], fixed: [] };
    // Classify the disjoint card islands by their position in the closed car.
    // The dashboard and central tunnel stay on the body.
    for (let i = 0; i < index.length; i += 3) {
      position.fromBufferAttribute(vertices, index[i]);
      position.add(boundsPoint.fromBufferAttribute(vertices, index[i + 1]));
      position.add(boundsPoint.fromBufferAttribute(vertices, index[i + 2]));
      position.multiplyScalar(1 / 3).applyMatrix4(transform);
      const side = position.x > 0 ? 'l' : 'r';
      const row = position.z < -.28 ? 'r' : 'f';
      const central = Math.abs(position.x) < .69;
      const dashboard = name === 'Object_223' && position.z > .57;
      const fixed = central || dashboard || (name === 'Object_64' && position.z > .58 && Math.abs(position.x) < .73);
      groups[fixed ? 'fixed' : row + side].push(index[i], index[i + 1], index[i + 2]);
    }
    for (const [part, indices] of Object.entries(groups)) {
      if (!indices.length) continue;
      const piece = new THREE.BufferGeometry();
      for (const [attribute, data] of Object.entries(geometry.attributes)) piece.setAttribute(attribute, data);
      piece.setIndex(indices);
      piece.boundingBox = new THREE.Box3();
      for (const index of indices) piece.boundingBox.expandByPoint(boundsPoint.fromBufferAttribute(vertices, index));
      piece.boundingSphere = piece.boundingBox.getBoundingSphere(new THREE.Sphere());
      const trim = new THREE.Mesh(piece, mesh.material);
      trim.name = name + '_trim_' + part;
      trim.position.copy(mesh.position);
      trim.quaternion.copy(mesh.quaternion);
      trim.scale.copy(mesh.scale);
      trim.castShadow = mesh.castShadow;
      trim.receiveShadow = mesh.receiveShadow;
      mesh.parent.add(trim);
      if (part !== 'fixed') pivots[openingRig[part]].attach(trim);
    }
    mesh.removeFromParent();
  }
}
function normalize(glb){if(carInner){carRoot.clear();carInner=null}paints.length=0;glass.length=0;seatMaterials.length=0;wheelMaterials.length=0;originalWing=null;wingHigh=null;Object.values(lightMeshes).forEach(a=>a.length=0);Object.keys(pivots).forEach(k=>delete pivots[k]);
 const car=glb.scene;car.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(car),size=b.getSize(new THREE.Vector3());carCenter=b.getCenter(new THREE.Vector3());carScale=5.45/Math.max(size.x,size.z);if(!Number.isFinite(carScale)||carScale<.0001)throw Error('Некорректный масштаб BMW');
 car.position.sub(carCenter);carInner=new THREE.Group();carInner.scale.setScalar(carScale);carInner.add(car);carRoot.add(carInner);carRoot.position.y=.204+size.y*carScale/2;
 const uniq={paint:new Set(),seats:new Set(),wheels:new Set(),glass:new Set()};let nodes=0;
 const parentPath=(obj)=>{let result=[],p=obj;for(let i=0;p&&i<9;i++,p=p.parent)result.push(p.name||'');return result.join(' ').toLowerCase()};
 car.traverse(o=>{nodes++;if(o.name.startsWith('MERIDIAM_RIG_')&&!o.name.endsWith('COUNTER_OFFSET'))pivots[o.name]=o;
 if(o.name==='wing_a_002_1039')originalWing=o;
 if(!o.isMesh)return;
 o.castShadow=!/windows|windshield/i.test(o.name);o.receiveShadow=true;
 setMaterialOnce(o,m=>{let name=(m.name||'').toLowerCase(),oname=parentPath(o),kind=partFromName(oname+' '+name);
 if(name.includes('sapphire black')||(/paint_(hood|doors|trunk|fender|top|front|rear|bumper|fb|rb|gascap)/.test(oname)&&name.includes('paint'))){let clone=m.clone();clone.name='MERIDIAM_PAINT_'+o.name;clone.map=null;clone.color.setHex(colors[state.color]);clone.metalness=.55;clone.roughness=.22;clone.clearcoat=1;clone.clearcoatRoughness=.12;clone.envMapIntensity=1.35;paints.push(clone);return clone}
 if(name.includes('meridiam | windshield')||name.includes('meridiam | side windows')||name.includes('meridiam | rear window')||name.includes('meridiam | interior glazing')){let clone=m.clone();clone.depthWrite=false;clone.transparent=true;clone.side=THREE.FrontSide;clone.opacity=name.includes('inner')?.04:.26;clone.color.setHex(0x19222b);clone.metalness=.2;clone.roughness=.16;clone.envMapIntensity=.34;glass.push(clone);o.castShadow=false;return clone}
 if(/meridiam.*(seat bolsters|seat inserts)|seat_leather|alkantaraseat|seat_koga|seat_alc|int_paint3/i.test(name+' '+oname)){let clone=m.clone();clone.name='MERIDIAM_SEAT_'+o.name;clone.color.setHex(0x242931);clone.metalness=0;clone.roughness=.75;seatMaterials.push(clone);return clone}
 if(/g80_rim_|rim(_|[0-9])|rim_metal|rim_ring/.test(oname)&&!/brake|disc|tyre|tire|rim_badge|rim_m_badge|rim_logo|nipel|screws/i.test(oname)){let clone=m.clone();clone.name='MERIDIAM_RIM_'+o.name;clone.map=null;clone.metalness=.78;clone.roughness=.34;wheelMaterials.push(clone);return clone}
 if(kind){let clone=m.clone();clone.emissive=new THREE.Color(0);clone.emissiveIntensity=0;lightMeshes[kind].push(clone);if(kind==='blink'||kind==='drl')blinkSideMap.set(clone,/_r_|right|_rf_/.test(oname)?'right':'left');if(kind==='dash')clone.emissiveMap=clone.map;return clone}
 if (!m.map && m.color.r > .55 && /cockpit|volan|interior|console|roofinside/.test(oname)) {
   const trim = m.clone();
   trim.color.setHex(0x25292e);
   trim.metalness = .06;
   trim.roughness = .63;
   return trim;
 }
 return m})});
 // The exported wrapper has scale .01. Lift the packaged hinge offsets into
 // source units while cancelling the offset on each original child group.
 for (const hinge of Object.values(pivots)) {
   const counter = hinge.children.find(child => child.name === hinge.name + '_COUNTER_OFFSET');
   if (counter) {
     hinge.position.multiplyScalar(100);
     counter.position.multiplyScalar(100);
   }
 }
 carRoot.updateMatrixWorld(true);
 attachDoorTrim(car);
 // Mount the factory lip and its wider derivative to the animated trunk hinge.
 if (originalWing && pivots.MERIDIAM_RIG_TRUNK_LID) {
   const hinge = pivots.MERIDIAM_RIG_TRUNK_LID;
   hinge.attach(originalWing);
   wingHigh = originalWing.clone(true);
   wingHigh.name = 'MERIDIAM_ALTERNATE_SPOILER';
   wingHigh.scale.x *= 1.055;
   wingHigh.scale.y *= 1.07;
   hinge.add(wingHigh);
 }
 // Actual light beam originates near the original headlights, moves with model.
 lights.forEach(l=>l.parent?.remove(l));lights.length=0;
 for(const x of [-.78,.78]){const lamp=new THREE.SpotLight(0xd3edff,0,15,Math.PI/8,.66,2);lamp.position.set(x,-.055,2.45);lamp.target.position.set(x,-.92,9);carRoot.add(lamp,lamp.target);lights.push(lamp)}
 // Surface names and selectables present in the real asset.
 changeColor();changeWheels();changeSeat();changeSpoiler();configureLights();
 isLoaded=true;redraw=true;$('#loader').classList.add('hidden');say('BMW загружена · '+nodes+' узлов');setTab('config');setView('hero');resize();
 if (new URLSearchParams(location.search).has('qa')) {
   window.__MERIDIAM_QA = () => ({
     paint: paints.map(m => [m.color.getHex(), m.roughness, m.clearcoat]),
     rims: wheelMaterials.map(m => m.color.getHex()),
     seats: seatMaterials.map(m => [m.color.getHex(), m.roughness]),
     lamps: Object.fromEntries(Object.entries(lightMeshes).map(([kind, list]) =>
       [kind, list.map(m => [m.emissiveIntensity, blinkSideMap.get(m) ?? null])])),
     beams: lights.map(lamp => lamp.intensity),
     spoilers: [originalWing?.visible, wingHigh?.visible],
     hinges: Object.fromEntries(Object.entries(pivots).map(([name, node]) =>
       [name, { angles: node.rotation.toArray().slice(0, 3), pivot: node.getWorldPosition(new THREE.Vector3()).toArray(), meshes: new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3()).toArray() }])),
     camera: camera.position.toArray(),
     trim: Object.fromEntries(['fr', 'rl'].map(part => {
       const hinge = pivots[openingRig[part]];
       return [part, hinge.children.filter(node => node.name.endsWith('_trim_' + part)).map(node => ({
         name: node.name, position: node.getWorldPosition(new THREE.Vector3()).toArray()
       }))];
     })),
     yaw: carRoot.rotation.y,
     audio: activeEngine ? audioContext.state : null,
     drawCalls: renderer.info.render.calls
   });
   window.__MERIDIAM_AUDIO_QA = async () => {
     const offline = new OfflineAudioContext(1, 16000, 16000);
     synthesizeEngine(offline);
     const samples = (await offline.startRendering()).getChannelData(0);
     return Math.sqrt(samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length);
   };
 }
 console.info('MERIDIAM model', {nodes,materials:{paint:paints.length,glass:glass.length,seats:seatMaterials.length,wheels:wheelMaterials.length},pivots:Object.keys(pivots)});
}
const fileInput = $('#fileInput');
const filePicker = fileInput.closest('label');
const modelHash = '7229ea2876f2497f779574e3e094c4ad97b94eaad941cbca6975411560e68ea9';
const loader = new GLTFLoader();

async function loadInteractiveModel(bytes) {
  $('#status').textContent = 'Проверяем 3D-модель BMW…';
  const glb = await loader.parseAsync(bytes, '');
  for (const name of Object.values(openingRig)) {
    const hinge = glb.scene.getObjectByName(name);
    if (!hinge || !hinge.getObjectByProperty('isMesh', true)) {
      throw new Error('В этом GLB нет механизма дверей и багажника. Нужен bmw_m3_g80_meridiam.glb из архива шоурума.');
    }
  }
  normalize(glb);
}

async function autoload() {
  if (!location.protocol.startsWith('http')) {
    $('#status').textContent = 'Выбери bmw_m3_g80_meridiam.glb из архива шоурума';
    return;
  }
  filePicker.classList.add('hidden');
  fileInput.disabled = true;
  const modelUrl = './bmw_m3_g80_meridiam.glb?v=' + modelHash.slice(0, 12);
  try {
    const response = await fetch(modelUrl);
    if (!response.ok) throw new Error('Сайт не смог скачать модель BMW.');
    const total = Number(response.headers.get('Content-Length')) || 0;
    let bytes;
    if (response.body) {
      let downloaded = 0;
      const tracked = response.body.pipeThrough(new TransformStream({
        transform(chunk, controller) {
          downloaded += chunk.byteLength;
          if (total) $('#progress').style.width = Math.min(100, downloaded / total * 100) + '%';
          $('#status').textContent = 'Загрузка BMW: ' + (downloaded / 1e6).toFixed(1) + ' МБ';
          controller.enqueue(chunk);
        }
      }));
      bytes = await new Response(tracked).arrayBuffer();
    } else {
      bytes = await response.arrayBuffer();
    }
    if (globalThis.crypto?.subtle) {
      const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
      const actual = Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
      if (actual !== modelHash) throw new Error('Сайт получил другую версию BMW. Обнови страницу или выбери GLB из архива шоурума.');
    }
    await loadInteractiveModel(bytes);
  } catch (error) {
    fileInput.disabled = false;
    filePicker.classList.remove('hidden');
    $('#status').textContent = error.message;
  }
}

fileInput.addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  fileInput.disabled = true;
  $('#status').textContent = 'Чтение ' + (file.size / 1e6).toFixed(1) + ' МБ…';
  try {
    await loadInteractiveModel(await file.arrayBuffer());
  } catch (error) {
    $('#status').textContent = error.message;
    fileInput.value = '';
  } finally {
    fileInput.disabled = false;
  }
});
autoload();
function setTab(tab){state.tab=tab;const titles={overview:'Управление',salon:'Салон',config:'Конфигурация',light:'Освещение',specs:'О проекте'};$('#panelTitle').textContent=titles[tab];for(const s of ['overview','salon','config','light','specs'])$('#'+s+'-body').hidden=tab!==s;setSelected('[data-tab]','tab',tab);$('#views').classList.toggle('hidden',tab==='salon');if(tab!=='salon'&&state.interior){state.interior=null;setView('hero');$('#hint').textContent='Вращайте BMW мышью или касанием'}if(tab==='salon'){state.interior='driver';setCabin('driver')};$('.configuration').scrollTop=0}
function setView(key){doorFocus=null;state.interior=null;state.view=key;const headOn=Math.atan2(4.30,8.45);const angles={hero:headOn+.79,front:headOn,side:headOn-Math.PI/2,rear:headOn-Math.PI};state.rotation=angles[key]??angles.hero;state.zoom=1;state.auto=false;$('#rotation').classList.remove('selected');setSelected('[data-view]','view',key)}
// Cabin anchors are in the normalized model's coordinates; +X is the driver side.
const cabinViews = {
  driver: [[.46,.47,-.34], [.10,.02,1.05]],
  passenger: [[-.46,.43,.07], [-.28,.15,1.55]],
  rear: [[.24,.42,-1.21], [.02,.25,.72]]
};
const cabinEye = new THREE.Vector3();
const cabinFocus = new THREE.Vector3();

function setCabin(which) {
  state.interior = which;
  state.rotation = 0;
  setSelected('[data-cabin]', 'cabin', which);
  closeDoors();
  $('#hint').textContent = 'Осмотр салона · выберите ракурс';
}
$$('[data-tab]').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));$$('[data-view]').forEach(b=>b.onclick=()=>{setTab('overview');setView(b.dataset.view)});$$('[data-cabin]').forEach(b=>b.onclick=()=>setCabin(b.dataset.cabin));$$('[data-color]').forEach(b=>b.onclick=()=>{state.color=b.dataset.color;changeColor()});$$('[data-finish]').forEach(b=>b.onclick=()=>{state.finish=b.dataset.finish;changeColor()});$$('[data-wheel]').forEach(b=>b.onclick=()=>{state.wheel=b.dataset.wheel;changeWheels()});$$('[data-seat]').forEach(b=>b.onclick=()=>{state.seat=b.dataset.seat;changeSeat()});$$('[data-spoiler]').forEach(b=>b.onclick=()=>{state.spoiler=b.dataset.spoiler;changeSpoiler()});$$('[data-part]').forEach(b=>b.onclick=()=>toggleDoor(b.dataset.part));$$('[data-start-engine]').forEach(b=>b.onclick=toggleEngine);$$('[data-light]').forEach(b=>b.onclick=()=>{state.light=b.dataset.light;configureLights()});$$('[data-signal]').forEach(b=>b.onclick=()=>{state.signal=b.dataset.signal;configureLights()});$('#rearLight').onclick=()=>{state.rear=!state.rear;configureLights()};$('#interiorLight').onclick=()=>{state.ambient=!state.ambient;configureLights()};$('#closeAll').onclick=closeDoors;$('#rotation').onclick=()=>{state.auto=!state.auto;$('#rotation').classList.toggle('selected',state.auto)};$('#resetView').onclick=()=>{setTab('overview');setView('hero')};
for(const k of Object.keys(state.targetDoors))$('#spot-'+k).onclick=()=>toggleDoor(k);
$('#contact').onclick=()=>$('#contactModal').classList.remove('hidden');$('#closeContact').onclick=()=>$('#contactModal').classList.add('hidden');$('#copyRequest').onclick=async()=>{const msg='Здравствуйте! Хочу обсудить разработку интерактивного 3D-шоурума/конфигуратора для нашей компании.';try{await navigator.clipboard.writeText(msg);say('Текст заявки скопирован')}catch{prompt('Скопируйте текст заявки:',msg)}};
// Interaction rotates the car and podium, not the room or camera; never crosses the floor.
let dragging=false,px=0,py=0,downX=0,downY=0;
renderer.domElement.addEventListener('pointerdown',e=>{if(!isLoaded||state.interior)return;dragging=true;px=e.clientX;py=e.clientY;downX=px;downY=py;renderer.domElement.setPointerCapture(e.pointerId)});
renderer.domElement.addEventListener('pointermove',e=>{if(dragging){state.rotation+=(e.clientX-px)*.0067;px=e.clientX;py=e.clientY}});
renderer.domElement.addEventListener('pointerup',e=>{dragging=false});renderer.domElement.addEventListener('pointercancel',()=>dragging=false);
function changeExteriorZoom(amount) {
  if (!isLoaded || state.interior) return;
  const closest = doorFocus ? .7 : .55;
  state.zoom = THREE.MathUtils.clamp(state.zoom + amount, closest, 1.55);
}
renderer.domElement.addEventListener('wheel', event => {
  if (state.interior) return;
  event.preventDefault();
  changeExteriorZoom(event.deltaY * .00065);
}, { passive: false });
for (const [label, symbol, amount] of [['Приблизить BMW', '+', -.17], ['Отдалить BMW', '−', .17]]) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = symbol;
  button.title = label;
  button.setAttribute('aria-label', label);
  button.onclick = () => changeExteriorZoom(amount);
  $('#views').append(button);
}

// Hotspots project rig pivots into the viewport and rotate with the car.
function spotPoint(part){let p=pivots[openingRig[part]];if(!p)return null;const point=new THREE.Vector3();p.getWorldPosition(point);return point}
function updateSpots(){for(const part of Object.keys(state.targetDoors)){let btn=$('#spot-'+part);if(!isLoaded||state.interior||!['overview'].includes(state.tab)){btn.classList.remove('visible');continue}let p=spotPoint(part);if(!p){btn.classList.remove('visible');continue}p.project(camera);let x=(p.x*.5+.5)*innerWidth,y=(-p.y*.5+.5)*innerHeight;const visible=p.z<1&&x>50&&x<innerWidth-315&&y>210&&y<innerHeight-155;btn.classList.toggle('visible',visible);if(visible){btn.style.left=x+'px';btn.style.top=y+'px';btn.textContent=state.targetDoors[part]?'-':'+'}}}
let last = performance.now();
let renderedKey = '';
let redraw = true;
function animate(now) {
 requestAnimationFrame(animate);
 const dt = reducedMotion.matches ? 1 : Math.min(.2, (now - last) / 1000);
 last = now;
 const angleBefore = carRoot.rotation.y;
 let movingHinge = false;
 if(state.auto&&!state.interior)state.rotation+=dt*.15;
 const yawDelta=THREE.MathUtils.euclideanModulo(state.rotation-carRoot.rotation.y+Math.PI,Math.PI*2)-Math.PI;carRoot.rotation.y+=Math.abs(yawDelta)<.0005?yawDelta:yawDelta*(1-Math.exp(-9*dt));
 podium.rotation.y=carRoot.rotation.y;
 // Articulation hinges are in model source units, corrected during GLB preparation.
 for(const [part,name]of Object.entries(openingRig)){let o=pivots[name];if(!o)continue;const delta=Math.abs(state.doors[part]-state.targetDoors[part]);movingHinge||=delta>.0005;state.doors[part]=delta>.0005?THREE.MathUtils.damp(state.doors[part],state.targetDoors[part],6,dt):state.targetDoors[part];o.rotation.y=part==='trunk'?0:angularTarget(part,state.doors[part]);if(part==='trunk')o.rotation.x=angularTarget(part,state.doors[part])}
 if (state.interior) {
   const [eye, focus] = cabinViews[state.interior];
   desiredCam.copy(carRoot.localToWorld(cabinEye.fromArray(eye)));
   desiredLook.copy(carRoot.localToWorld(cabinFocus.fromArray(focus)));
 } else if (doorFocus) {
   const distance = state.zoom * Math.max(1, .93 / camera.aspect);
   const side = doorFocus === 'rl' ? 1 : -1;
   const doorZ = doorFocus === 'rl' ? -.82 : .45;
   desiredCam.copy(carRoot.localToWorld(cabinEye.set(side * (.68 + 3.6 * distance), .38 + .82 * distance, doorZ - 2.0 * distance)));
   desiredLook.copy(carRoot.localToWorld(cabinFocus.set(side * .63, .14, doorZ)));
 } else {
   const distance = state.zoom * Math.max(.95, 1.08 / camera.aspect);
   desiredCam.set(4.30 * distance, 2.32 * distance, 8.45 * distance);
   desiredLook.set(-.65, 1.03, 0);
 }
 const damping = 1 - Math.exp(-7 * dt);
 const roomMoving = Math.abs(carRoot.rotation.y - angleBefore) > .00005 || movingHinge;
 const cameraMoving = camera.position.distanceToSquared(desiredCam) > .00001 ||
   lookTarget.distanceToSquared(desiredLook) > .00001;
 camera.fov = THREE.MathUtils.lerp(camera.fov, state.interior === 'driver' ? (camera.aspect < .8 ? 80 : 69) : state.interior ? (camera.aspect < .8 ? 73 : 62) : 34, damping);
 camera.updateProjectionMatrix();
 camera.position.lerp(desiredCam, damping);
 lookTarget.lerp(desiredLook, damping);
 camera.lookAt(lookTarget);
 const flash = now % 1040 < 520;
 for (const material of lightMeshes.drl) {
   const signal = state.signal === 'hazard' || state.signal === blinkSideMap.get(material);
   material.emissive.setHex(signal ? 0xff8a10 : 0xd6f0ff);
   material.emissiveIntensity = signal ? (flash ? 2.1 : 0) : (state.light === 'off' ? 0 : 1.8);
 }
 for (const material of lightMeshes.blink) {
   const lit = flash && (state.signal === 'hazard' || state.signal === blinkSideMap.get(material));
   material.emissive.setHex(0xff8a10);
   material.emissiveIntensity = lit ? 2.0 : 0;
 }
 const frameKey = [
   isLoaded, state.tab, state.color, state.finish, state.seat, state.wheel, state.spoiler,
   state.light, state.rear, state.ambient, state.engine, state.signal, state.signal !== 'off' && flash
 ].join('|');
 if (redraw || frameKey !== renderedKey || roomMoving || cameraMoving) {
   renderer.shadowMap.needsUpdate = redraw || roomMoving;
   renderer.render(scene,camera);
   updateSpots();
   renderedKey = frameKey;
   redraw = false;
 }
}
requestAnimationFrame(animate);
function resize() {
  redraw = true;
  camera.aspect = innerWidth / innerHeight;
  camera.filmOffset = innerWidth > 900 ? 3.2 : 0;
  camera.updateProjectionMatrix();
  const pixels = Math.sqrt(2_700_000 / (innerWidth * innerHeight));
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 850 ? 1.25 : 1.6, pixels));
  renderer.setSize(innerWidth, innerHeight);
}
addEventListener('resize', resize);
resize();
const mobileToggle=$('#mobilePanelToggle');mobileToggle.onclick=()=>{const panel=$('#config');const open=panel.classList.toggle('mobile-open');mobileToggle.setAttribute('aria-expanded',String(open));mobileToggle.textContent=open?'Закрыть настройки ✕':'Настройки ⌄'};
addEventListener('keydown',e=>{if(e.key==='Escape'){$('#contactModal').classList.add('hidden');if(state.interior)setTab('overview')}});
