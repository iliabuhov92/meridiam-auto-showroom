import {Reflector} from 'three/addons/objects/Reflector.js';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const stage=$('#stage'),toast=$('#toast');let toastTimer;
const compactConfig = document.createElement('style');
compactConfig.textContent = `
  #config:has(#config-body:not([hidden])) h2 { margin-bottom: 9px; padding-bottom: 9px; }
  #config-body .section-label { margin: 9px 0 5px; }
  #config-body .choice { gap: 4px; }
  @media (min-width: 901px) {
    #config-body .choice button { min-height: 28px; min-width: 60px; padding: 5px 6px; font-size: 11px; }
    #config:has(#config-body:not([hidden])) { background: #101a27da; width: 246px; padding: 13px; }
  }
`;
document.head.append(compactConfig);
function say(t){toast.textContent=t;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2400)}
const scene=new THREE.Scene();scene.background=new THREE.Color(0x090e16);scene.fog=new THREE.FogExp2(0x090e16,.028);
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.13;renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<850?1.25:1.65));renderer.setSize(innerWidth,innerHeight);stage.appendChild(renderer.domElement);
const camera=new THREE.PerspectiveCamera(34,innerWidth/innerHeight,.035,150);camera.position.set(4.30,2.85,8.45);
const lookTarget=new THREE.Vector3(-.65,1.12,0),desiredCam=new THREE.Vector3(4.45,2.65,7.55),desiredLook=new THREE.Vector3(-.65,1.12,0);
// Luminous studio environment, broad reflection panels, not harsh point sources.
const env=document.createElement('canvas');env.width=2048;env.height=1024;let c=env.getContext('2d');let gr=c.createLinearGradient(0,0,0,1024);gr.addColorStop(0,'#323b47');gr.addColorStop(.42,'#192a3d');gr.addColorStop(.62,'#132334');gr.addColorStop(1,'#101924');c.fillStyle=gr;c.fillRect(0,0,2048,1024);
function softbox(x,y,w,h,alpha){c.save();c.globalAlpha=alpha;c.shadowColor='#dbeeff';c.shadowBlur=52;let g=c.createLinearGradient(x,y,x+w,y);g.addColorStop(0,'#647c91');g.addColorStop(.12,'#d5e7f5');g.addColorStop(.5,'#ffffff');g.addColorStop(.9,'#d1e4f4');g.addColorStop(1,'#728ca3');c.fillStyle=g;c.fillRect(x,y,w,h);c.restore()}
softbox(95,170,140,590,.95);softbox(440,145,420,130,.96);softbox(1090,145,150,570,.88);softbox(1460,180,410,140,.89);softbox(360,106,1280,64,.92);softbox(1950,280,50,380,.6);
const environment=new THREE.CanvasTexture(env);environment.mapping=THREE.EquirectangularReflectionMapping;environment.colorSpace=THREE.SRGBColorSpace;
const pmrem=new THREE.PMREMGenerator(renderer),envRT=pmrem.fromEquirectangular(environment);scene.environment=envRT.texture;scene.environmentIntensity=1.05;environment.dispose();pmrem.dispose();
scene.add(new THREE.HemisphereLight(0xc9e5fd,0x151b25,.82));
RectAreaLightUniformsLib.init();function area(x,y,z,w,h,intensity,color){let l=new THREE.RectAreaLight(color,intensity,w,h);l.position.set(x,y,z);l.lookAt(0,1,0);scene.add(l)}area(-4.5,5,3.5,5,5,2.5,0xdcefff);area(4,4.8,-3.7,4,6,3.1,0xf4f8ff);area(0,7,1,10,2.6,2.25,0xd7edff);area(5.2,2.1,4.7,4.5,1.8,1.2,0xf4f6ff);
const key=new THREE.DirectionalLight(0xe6f3ff,1.3);key.position.set(-5.3,9,6);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-9;key.shadow.camera.right=9;key.shadow.camera.top=9;key.shadow.camera.bottom=-9;key.shadow.bias=-.0003;scene.add(key);
const rimLight=new THREE.DirectionalLight(0xb2dbff,1.25);rimLight.position.set(5,6,-4);scene.add(rimLight);
const mat=(hex,metalness=0,roughness=.5)=>new THREE.MeshStandardMaterial({color:hex,metalness,roughness});
const floorY = -.055;
const podiumY = .016;
const podiumRadius = 3.10;
const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), mat(0x1b2330, .46, .32));
floor.rotation.x = -Math.PI / 2;
floor.position.y = floorY;
floor.receiveShadow = true;
scene.add(floor);

const reflectionShader = {
  ...Reflector.ReflectorShader,
  fragmentShader: Reflector.ReflectorShader.fragmentShader.replace(
    'vec4 base = texture2DProj( tDiffuse, vUv );',
    `vec2 uv = vUv.xy / vUv.w;
     vec3 reflected = texture2D(tDiffuse, uv).rgb * .36;
     reflected += texture2D(tDiffuse, uv + vec2(.006, .003)).rgb * .16;
     reflected += texture2D(tDiffuse, uv - vec2(.006, .003)).rgb * .16;
     reflected += texture2D(tDiffuse, uv + vec2(.002, -.009)).rgb * .16;
     reflected += texture2D(tDiffuse, uv - vec2(.002, -.009)).rgb * .16;
     vec4 base = vec4(reflected, 1.0);`
  ).replace('vec4( blendOverlay( base.rgb, color ), 1.0 )', 'vec4(base.rgb, .25)')
};
const floorReflection = new Reflector(new THREE.PlaneGeometry(44, 44), {
  textureWidth: innerWidth < 681 ? 320 : 640, textureHeight: innerWidth < 681 ? 180 : 360,
  multisample: 0, shader: reflectionShader
});
floorReflection.rotation.x = -Math.PI / 2;
floorReflection.position.y = podiumY + .001;
floorReflection.material.transparent = true;
floorReflection.material.depthWrite = false;
floorReflection.renderOrder = 0;
scene.add(floorReflection);

const podium = new THREE.Group();
podium.position.x = -.70;
scene.add(podium);
const deck = new THREE.Mesh(new THREE.CylinderGeometry(podiumRadius, podiumRadius + .018, .068, 128),
  mat(0x111925, .58, .30));
deck.position.y = podiumY - .034;
deck.receiveShadow = true;
podium.add(deck);

const whiteLight = new THREE.MeshBasicMaterial({ color: 0xe5f4ff });
const galleryLight = new THREE.MeshBasicMaterial({ color: 0xa78e6e });
const ring = new THREE.Mesh(new THREE.TorusGeometry(podiumRadius, .012, 8, 160), whiteLight);
ring.rotation.x = -Math.PI / 2;
ring.position.y = podiumY + .009;
podium.add(ring);

// Feather the cold spill on the deck and adjoining floor without a full-screen blur.
for (const [inner, outer, y, opacity] of [
  [podiumRadius - .16, podiumRadius, podiumY + .003, .36],
  [podiumRadius, podiumRadius + .28, floorY + .003, .32]
]) {
  const glow = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 128), new THREE.ShaderMaterial({
    uniforms: { radius: { value: podiumRadius }, width: { value: outer - inner }, opacity: { value: opacity } },
    vertexShader: `varying vec2 point; void main(){
      point = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
    fragmentShader: `varying vec2 point; uniform float radius, width, opacity; void main(){
      float intensity = 1.0 - smoothstep(0.0, width, abs(length(point) - radius));
      gl_FragColor = vec4(.22,.57,1.0,opacity * intensity * intensity);
    }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = y;
  glow.renderOrder = 1;
  podium.add(glow);
}

const graphite = mat(0x161d25, .56, .46);
const wallMat = mat(0x212b36, .30, .52);
const rearWall = mat(0x263140, .26, .62);
const glazing = new THREE.MeshPhysicalMaterial({
  color: 0x7194ad, metalness: .2, roughness: .17,
  transparent: true, opacity: .19, depthWrite: false
});
function architecturalBox(size, position, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  scene.add(mesh);
  return mesh;
}
// The left wall anchors the car. The right-hand glass wall opens onto a gallery.
architecturalBox([11.2, 5.4, .25], [-9.9, 2.65, -8.9], wallMat);
architecturalBox([20, 6.5, .22], [.6, 3.2, -15.5], rearWall);
architecturalBox([.22, 6, 24], [-11.4, 2.9, -3], wallMat);
architecturalBox([.22, 6, 24], [11.4, 2.9, -3], wallMat);
architecturalBox([11, .035, .05], [-9.9, 3.22, -8.75], whiteLight);
architecturalBox([11, .043, .09], [-9.9, .085, -8.75], whiteLight);
for (let x = -4.25; x < 10.9; x += 2.15) {
  architecturalBox([.11, 5.1, .24], [x, 2.5, -8.8], graphite);
  architecturalBox([2.06, 5.0, .035], [x + 1.075, 2.5, -8.8], glazing);
  architecturalBox([.052, 3.15, .055], [x + .13, 1.58, -13.5], whiteLight);
  architecturalBox([1.75, .34, .66], [x + .98, .17, -13.65], graphite);
}
for (const z of [-9.65, -11.5, -13.6, -15.05]) {
  architecturalBox([14.9, .04, .11], [3.1, 4.27, z], galleryLight);
}
architecturalBox([11, .032, .08], [5.6, .085, -13.2], whiteLight);

const arc = new THREE.Mesh(new THREE.RingGeometry(7.59, 7.83, 150, 1, Math.PI - .045, Math.PI + .09), whiteLight);
arc.rotation.x = Math.PI / 2;
arc.position.set(.2, 3.60, 1.30);
scene.add(arc);
const arcEdge = new THREE.Mesh(new THREE.TorusGeometry(7.70, .045, 8, 150, Math.PI), whiteLight);
arcEdge.rotation.x = -Math.PI / 2;
arcEdge.position.copy(arc.position);
arcEdge.position.y -= .018;
scene.add(arcEdge);
const arcHousing = new THREE.Mesh(new THREE.RingGeometry(7.50, 7.96, 150, 1, Math.PI - .045, Math.PI + .09), graphite);
arcHousing.rotation.x = Math.PI / 2;
arcHousing.position.copy(arc.position);
arcHousing.position.y += .027;
scene.add(arcHousing);

const badgeCanvas = document.createElement('canvas');
badgeCanvas.width = 512;
badgeCanvas.height = 256;
const badge = badgeCanvas.getContext('2d');
badge.fillStyle = '#397ac2'; badge.fillRect(27, 76, 26, 87);
badge.fillStyle = '#244f9a'; badge.fillRect(58, 76, 26, 87);
badge.fillStyle = '#d65361'; badge.fillRect(89, 76, 26, 87);
badge.font = 'italic 800 126px system-ui';
badge.fillStyle = '#ebf5ff'; badge.fillText('M3', 125, 165);
badge.font = '600 28px system-ui'; badge.fillText('COMPETITION G80', 30, 215);
const badgeTexture = new THREE.CanvasTexture(badgeCanvas);
badgeTexture.colorSpace = THREE.SRGBColorSpace;
const wallBadge = new THREE.Mesh(new THREE.PlaneGeometry(2.25, 1.125),
  new THREE.MeshBasicMaterial({ map: badgeTexture, transparent: true, depthWrite: false }));
wallBadge.position.set(-9.70, 2.12, -8.75);
scene.add(wallBadge);

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
contactShadow.position.y = podiumY + .005;
podium.add(contactShadow);
// Dim the exhibition independently of vehicle lights and UI.
const studioLights = scene.children.filter(node => node.isLight)
  .map(light => ({ light, intensity: light.intensity }));
const roomSurfaces = [...new Set(scene.children.filter(node => node.isMesh && node.material.color)
  .map(mesh => mesh.material))].map(material => ({ material, color: material.color.clone() }));
let studioDim = 0;

function updateStudioLighting(dt) {
  const target = state.tab === 'light' ? 1 : 0;
  if (studioDim === target) return false;
  const next = THREE.MathUtils.damp(studioDim, target, 7, dt);
  studioDim = Math.abs(next - target) < .002 ? target : next;
  for (const { light, intensity } of studioLights) {
    light.intensity = intensity * (1 - studioDim * (light === rimLight ? .57 : .78));
  }
  for (const { material, color } of roomSurfaces) {
    material.color.copy(color).multiplyScalar(1 - studioDim * .71);
  }
  scene.environmentIntensity = 1.05 - studioDim * .43;
  scene.background.setHex(0x090e16).multiplyScalar(1 - studioDim * .83);
  scene.fog.color.copy(scene.background);
  return true;
}

const carRoot=new THREE.Group();carRoot.position.x=-.70;scene.add(carRoot);let carInner=null,carScale=1,carCenter=new THREE.Vector3(),isLoaded=false,originalWing=null,wingHigh=null;
// Low-beam footprint on the two receiving surfaces. Its overlap follows the
// circular plinth and uses the same forward axis as the headlamp spotlights.
const cabinFill = new THREE.PointLight(0xd9e8ff, 0, 1.9, 2);
cabinFill.position.set(0, .62, -.55);
carRoot.add(cabinFill);
const beamFootprint = new THREE.Group();
const beamTexture = document.createElement('canvas');
beamTexture.width = beamTexture.height = 256;
const beamContext = beamTexture.getContext('2d');
const beamFalloff = beamContext.createRadialGradient(128, 128, 0, 128, 128, 126);
beamFalloff.addColorStop(0, 'rgba(190,218,255,0.55)');
beamFalloff.addColorStop(.45, 'rgba(181,216,255,0.37)');
beamFalloff.addColorStop(1, 'rgba(168,206,255,0)');
beamContext.fillStyle = beamFalloff;
beamContext.fillRect(0, 0, 256, 256);
const beamMap = new THREE.CanvasTexture(beamTexture);
beamMap.colorSpace = THREE.SRGBColorSpace;
const beamGeometry = new THREE.PlaneGeometry(3.3, 5.1);
for (const onPodium of [true, false]) {
  for (const x of [-1.12, 1.12]) {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        footprint: { value: beamMap }, onPodium: { value: onPodium }, lampOffset: { value: x }
      },
      vertexShader: `
        uniform float lampOffset;
        varying vec2 coords;
        varying vec2 floorPoint;
        void main() {
          coords = uv;
          floorPoint = vec2(position.x + lampOffset, 5.1 - position.y);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform sampler2D footprint;
        uniform bool onPodium;
        varying vec2 coords;
        varying vec2 floorPoint;
        void main() {
          bool inside = length(floorPoint) < ${podiumRadius};
          if (inside != onPodium) discard;
          vec4 glow = texture2D(footprint, coords);
          float cutoff = smoothstep(.07, .13, coords.y) * (1.0 - smoothstep(.80, .86, coords.y + abs(coords.x - .5) * .30));
          gl_FragColor = vec4(glow.rgb, glow.a * cutoff * 1.08);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const patch = new THREE.Mesh(beamGeometry, material);
    patch.position.set(x, onPodium ? podiumY + .004 : floorY + .004, 5.1);
    patch.rotation.x = -Math.PI / 2;
    beamFootprint.add(patch);
  }
}
beamFootprint.visible = false;
podium.add(beamFootprint);

const state={tab:'overview',color:'black',finish:'gloss',wheel:'dark',spoiler:'low',seat:'leather',view:'hero',interior:null,light:'drl',signal:'off',rear:true,ambient:true,engine:false,auto:false,rotation:-.28,zoom:1,doors:{fl:0,fr:0,rl:0,rr:0,trunk:0},targetDoors:{fl:0,fr:0,rl:0,rr:0,trunk:0}};
const paints=[],glass=[],seatMaterials=[],wheelMaterials=[],lightMeshes={drl:[],low:[],rear:[],blink:[],dash:[],cabin:[]},blinkSideMap=new WeakMap(),pivots={};const lights=[];
const colors={black:0x111820,white:0xe8e8e4,blue:0x174d98};
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
function changeColor(){const hex=colors[state.color];for(const m of paints){m.color.setHex(hex);m.metalness=state.finish==='matte'?.18:.42;m.roughness=state.finish==='matte'?.64:.26;m.clearcoat=state.finish==='matte'?0:1;m.clearcoatRoughness=.063;m.bumpScale=state.finish==='matte'?.00038:.00010;m.envMapIntensity=state.finish==='matte'?.7:1.13;m.needsUpdate=true}setSelected('[data-color]','color',state.color);setSelected('[data-finish]','finish',state.finish)}
const wheelFaces = [];
let wheelDesign = 'factory';

// The alternate face seats in the original barrel diameter. Its ten swept
// spokes are split into five pairs and share the original hub and wheel axes.
function sportWheelFace(radius, depth, material) {
  const face = new THREE.Group();
  const profile = [[.94, -.42], [1, -.29], [1, -.06], [.985, 0], [.95, 0], [.927, -.11], [.927, -.36]];
  const lip = new THREE.Mesh(new THREE.LatheGeometry(
    profile.map(([r, z]) => new THREE.Vector2(r * radius, z * depth)), 80
  ), material);
  lip.rotation.x = Math.PI / 2;
  face.add(lip);
  // Five continuous Y-shaped forgings; the center cap remains the GLB part.
  const hub = new THREE.Mesh(new THREE.LatheGeometry([
    [.113, -.72], [.14, -.69], [.25, -.70], [.31, -.77],
    [.31, -.88], [.15, -.87], [.113, -.82], [.113, -.72]
  ].map(([r, z]) => new THREE.Vector2(r * radius, z * depth)), 64), material);
  hub.rotation.x = Math.PI / 2;
  face.add(hub);

  const outline = new THREE.Shape();
  const point = (r, y) => [r * radius, y * radius];
  outline.moveTo(...point(.223, -.073));
  outline.bezierCurveTo(...point(.44, -.064), ...point(.66, -.137), ...point(.916, -.279));
  outline.lineTo(...point(.935, -.202));
  outline.bezierCurveTo(...point(.73, -.103), ...point(.562, -.035), ...point(.491, -.012));
  outline.quadraticCurveTo(...point(.468, 0), ...point(.491, .012));
  outline.bezierCurveTo(...point(.562, .035), ...point(.73, .103), ...point(.935, .202));
  outline.lineTo(...point(.916, .279));
  outline.bezierCurveTo(...point(.66, .137), ...point(.44, .064), ...point(.223, .073));
  outline.closePath();
  const geometry = new THREE.ExtrudeGeometry(outline, {
    depth: depth * .18, bevelEnabled: true, bevelSize: radius * .012,
    bevelThickness: depth * .055, bevelSegments: 3, curveSegments: 14
  });
  const vertices = geometry.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const rise = THREE.MathUtils.smoothstep(vertices.getX(i) / radius, .24, .91) * depth * .53;
    vertices.setZ(i, vertices.getZ(i) + rise);
  }
  geometry.computeVertexNormals();
  for (let i = 0; i < 5; i++) {
    const spoke = new THREE.Mesh(geometry, material);
    spoke.rotation.z = i * Math.PI * 2 / 5;
    spoke.position.z = -.83 * depth;
    face.add(spoke);
  }
  return face;
}

function mountWheelDesigns(car) {
  wheelFaces.length = 0;
  for (const [faceId, metalId, side] of [[842, 854, 1], [880, 892, 1], [918, 930, -1], [962, 971, -1]]) {
    const original = car.getObjectByName('Object_' + faceId);
    const trim = car.getObjectByName('Object_' + metalId);
    if (!original?.isMesh || !trim?.isMesh) continue;
    original.geometry.computeBoundingBox();
    const { min, max } = original.geometry.boundingBox;
    const radius = Math.min(max.y - min.y, max.z - min.z) / 2;
    const depth = max.x - min.x;
    const material = original.material.clone();
    wheelMaterials.push(material);
    const variant = sportWheelFace(radius, depth, material);
    variant.position.set(side > 0 ? max.x : min.x, (min.y + max.y) / 2, (min.z + max.z) / 2);
    variant.rotateY(side * Math.PI / 2);
    variant.visible = false;
    original.add(variant);
    // Put the replacement beside the original so visibility can switch independently.
    original.parent.attach(variant);
    wheelFaces.push({ original, trim, variant });
  }
  selectWheelDesign(wheelDesign);
}

function selectWheelDesign(design) {
  wheelDesign = design;
  const factory = design === 'factory';
  for (const { original, trim, variant } of wheelFaces) {
    original.visible = factory;
    trim.visible = factory;
    variant.visible = !factory;
  }
  setSelected('[data-wheel-design]', 'wheelDesign', design);
  redraw = true;
}

function changeWheels(){
 const silver=state.wheel==='silver';
 for(const m of wheelMaterials){m.color.setHex(silver?0xb6bdc6:0x20262d);m.metalness=.78;m.roughness=silver?.29:.34;m.envMapIntensity=silver?1.2:.9;m.needsUpdate=true}
 // Both choices use the four original BMW rims. No new wheels float over the tyres.
 setSelected('[data-wheel]','wheel',state.wheel);
}
function changeSeat(){let col=state.seat==='cognac'?0x805137:state.seat==='cloth'?0x202b35:0x171b23;for(const m of seatMaterials){m.color.setHex(col);m.metalness=0;m.roughness=state.seat==='cloth'?.97:.71;m.clearcoat=state.seat==='cloth'?0:.13;m.bumpMap=state.seat==='cloth'?clothGrain:upholsteryGrain;m.bumpScale=state.seat==='cloth'?.0014:.0010;m.needsUpdate=true}setSelected('[data-seat]','seat',state.seat)}
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
  if (part === 'fr' || part[0] === 'r') {
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
function angularTarget(p,v){const signs={fl:-1,fr:1,rl:-1,rr:1};return p==='trunk'?v*.88:(signs[p]||1)*v*(p[0]==='f'?.96:.88)}
// Light effects target actual original GLB lenses; original albedo, opacity and geometry are retained.
function illuminate(materials, color, intensity) {
  for (const material of materials) {
    material.emissive.setHex(color);
    material.emissiveIntensity = intensity;
  }
}

function configureLights() {
  const low = state.light === 'low';
  beamFootprint.visible = low;
  illuminate(lightMeshes.drl, 0xd6f0ff, state.light === 'off' ? 0 : 1.8);
  illuminate(lightMeshes.low, 0xe1f2ff, low ? 17 : 0);
  illuminate(lightMeshes.rear, 0xff1628, state.rear ? 1.05 : 0);
  illuminate(lightMeshes.cabin, 0x7fb8e4, state.ambient ? .28 : 0);
  cabinFill.intensity = state.ambient ? 1.2 : 0;
  for (const lamp of lights) lamp.intensity = low ? 370 : 0;
  setSelected('[data-light]', 'light', state.light);
  setSelected('[data-signal]', 'signal', state.signal);
  $('#rearLight').classList.toggle('selected', state.rear);
  $('#interiorLight').classList.toggle('selected', state.ambient);
}
const engineRecording = './bmw-g80-fi-exhaust.b64';
let audioContext;
let recording;
let activeEngine;
let engineRequest = 0;

function decodeEngineRecording(context) {
  recording ??= fetch(engineRecording)
    .then(response => {
      if (!response.ok) throw new Error('BMW engine recording unavailable');
      return response.text();
    })
    .then(encoded => Uint8Array.from(atob(encoded), character => character.charCodeAt(0)))
    .then(bytes => context.decodeAudioData(bytes.buffer))
    .catch(error => {
      recording = undefined;
      throw error;
    });
  return recording;
}

async function engineSound(on) {
  const request = ++engineRequest;
  if (!on) {
    if (!activeEngine) return;
    const { source, volume } = activeEngine;
    activeEngine = null;
    const stop = audioContext.currentTime;
    volume.gain.cancelAndHoldAtTime(stop);
    volume.gain.setTargetAtTime(.0001, stop, .045);
    source.stop(stop + .20);
    return;
  }
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return;
  try {
    audioContext ??= new Audio();
    const [, buffer] = await Promise.all([audioContext.resume(), decodeEngineRecording(audioContext)]);
    if (request !== engineRequest || !state.engine) return;
    const source = audioContext.createBufferSource();
    const volume = audioContext.createGain();
    const now = audioContext.currentTime;
    source.buffer = buffer;
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1900;
    volume.gain.setValueAtTime(.001, now);
    volume.gain.linearRampToValueAtTime(.35, now + .075);
    volume.gain.setValueAtTime(.35, now + buffer.duration - .45);
    volume.gain.linearRampToValueAtTime(.001, now + buffer.duration);
    source.connect(filter).connect(volume).connect(audioContext.destination);
    source.start();
    const playback = { source, volume };
    activeEngine = playback;
    source.onended = () => { if (activeEngine === playback) activeEngine = null; };
  } catch (error) {
    if (request !== engineRequest) return;
    console.warn('BMW engine audio:', error.message);
    $('#engineCaption').textContent = 'Приборы активны · запись звука недоступна';
  }
}
function toggleEngine(){state.engine=!state.engine;updateCockpit(state.engine);engineSound(state.engine);$('#digitalText').textContent=state.engine?'READY / P':'OFF';$('#rpmLevel').style.width=state.engine?'28%':'12%';$('#engineCaption').textContent=state.engine?'Двигатель запущен · приборы активны':'Система выключена';$$('[data-start-engine]').forEach(b=>b.classList.toggle('selected',state.engine));for(const m of lightMeshes.dash){m.emissive.setHex(state.engine?0x75bffc:0);m.emissiveIntensity=state.engine?.7:0}say(state.engine?'Двигатель запущен':'Двигатель выключен')}
const cockpitCanvas = document.createElement('canvas');
cockpitCanvas.width = 2048;
cockpitCanvas.height = 512;
const cockpitContext = cockpitCanvas.getContext('2d');
const cockpitTexture = new THREE.CanvasTexture(cockpitCanvas);
cockpitTexture.colorSpace = THREE.SRGBColorSpace;
const cockpitMaterial = new THREE.MeshBasicMaterial({
  map: cockpitTexture, transparent: true, alphaTest: .1, side: THREE.DoubleSide, toneMapped: false,
  polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
});
let cockpitTimer;

function drawCockpit(mode) {
  const ctx = cockpitContext;
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  ctx.clearRect(0, 0, 1024, 256);
  ctx.fillStyle = '#05080e';
  ctx.fillRect(0, 0, 518, 256);
  if (mode === 'boot') {
    const x = 255, y = 126;
    const drawDisc = (radius, color) => {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
    };
    const rim = ctx.createLinearGradient(x, y - 59, x, y + 59);
    rim.addColorStop(0, '#e9f1f7');
    rim.addColorStop(.5, '#8193a1');
    rim.addColorStop(1, '#c6d4df');
    drawDisc(56, rim);
    drawDisc(53, '#070b10');
    drawDisc(34, '#d7e2eb');
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 ? '#1389c6' : '#f0f5f9';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, 32, i * Math.PI / 2, (i + 1) * Math.PI / 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#edf5ff';
    ctx.font = '700 13px system-ui';
    ctx.textAlign = 'center';
    for (const [letter, angle] of [['B', -.49], ['M', 0], ['W', .49]]) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillText(letter, 0, -40);
      ctx.restore();
    }
  }
  if (mode === 'running') {
    const wash = ctx.createLinearGradient(0, 45, 0, 220);
    wash.addColorStop(0, '#0d1726');
    wash.addColorStop(1, '#04080d');
    ctx.fillStyle = wash;
    ctx.fillRect(29, 32, 446, 195);
    for (const side of [-1, 1]) {
      const cx = 252 + side * 147;
      ctx.save();
      ctx.translate(cx, 139);
      ctx.scale(side, 1);
      ctx.strokeStyle = side > 0 ? '#bd5460' : '#619bc1';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 70, -1.38, 1.25);
      ctx.stroke();
      for (let i = 0; i <= 8; i++) {
        const angle = -1.38 + i * .329;
        const inner = i % 2 ? 60 : 54;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
        ctx.lineTo(Math.cos(angle) * 65, Math.sin(angle) * 65);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.fillStyle = '#e8f1fa';
    ctx.textAlign = 'center';
    ctx.font = '500 70px system-ui';
    ctx.fillText('0', 252, 146);
    ctx.font = '500 17px system-ui';
    ctx.fillText('км/ч', 252, 169);
    ctx.fillText('P', 330, 145);
    ctx.fillText('1.1 × 1000 об/мин', 252, 198);
    ctx.fillStyle = '#70d09b';
    ctx.fillText('READY', 252, 86);
  }
  cockpitTexture.needsUpdate = true;
  redraw = true;
}

function updateCockpit(on) {
  clearTimeout(cockpitTimer);
  drawCockpit(on ? 'boot' : 'off');
  if (on) cockpitTimer = setTimeout(() => drawCockpit('running'), 950);
}

function mountCockpitDisplay(car) {
  const screen = car.getObjectByName('Object_197');
  if (!screen?.isMesh) return;
  const geometry = screen.geometry.clone();
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const positions = geometry.getAttribute('position');
  const uv = new Float32Array(positions.count * 2);
  for (let i = 0; i < positions.count; i++) {
    uv[i * 2] = (max.x - positions.getX(i)) / (max.x - min.x);
    uv[i * 2 + 1] = (positions.getY(i) - min.y) / (max.y - min.y);
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const display = new THREE.Mesh(geometry, cockpitMaterial);
  display.name = 'MERIDIAM_INSTRUMENT_DISPLAY';
  display.position.z = -.003;
  display.renderOrder = 3;
  screen.add(display);
  drawCockpit(state.engine ? 'running' : 'off');
}

// The source combines both sides and, in some meshes, fixed body parts in one material.
const sharedDoorTrim = [
  'Object_37', 'Object_157', 'Object_64', 'Object_76', 'Object_79', 'Object_204', 'Object_207',
  'Object_223', 'Object_232', 'Object_291', 'Object_1063', 'Object_1104', 'Object_1107', 'Object_1482'
];

function doorForIsland(name, { min, max }) {
  const x = (min.x + max.x) / 2;
  const z = (min.z + max.z) / 2;
  // This cockpit mesh includes long decorative seam strips suspended beside
  // the front seats. Keep the inboard stitching and exclude the loose strips.
  if (name === 'Object_291') {
    return Math.abs(x) > .58 && max.z - min.z > .36 ? null : 'fixed';
  }
  // Rear glazing shares the mesh with the hatch-side backlight.
  if (name === 'Object_207' || name === 'Object_1107') {
    return max.z < -1.3 && min.z < -1.6 ? 'fixed' : x > 0 ? 'rl' : 'rr';
  }
  // The outer trim includes the stationary A/C-pillar covers. The mirror feet
  // are separate islands and follow their respective front doors.
  if (name === 'Object_1482' && (min.z < -1.55 || (min.z > .2 && max.z > .9))) {
    return 'fixed';
  }
  if (name === 'Object_157' && Math.abs(x) < .75) return 'fixed';
  if (Math.abs(x) < .69 || ((name === 'Object_223' || name === 'Object_64') && min.z > .55)) {
    return 'fixed';
  }
  return (z < -.28 ? 'r' : 'f') + (x > 0 ? 'l' : 'r');
}

function attachDoorTrim(car) {
  const point = new THREE.Vector3();
  carRoot.updateMatrixWorld(true);
  const toCar = carRoot.matrixWorld.clone().invert();
  for (const [part, names] of Object.entries({
    fl: ['melkatpidr_819', 'HarmanKardonLogoDriverDoor_261'],
    fr: ['pidtik2_874'],
    rl: ['HarmanKardonLogoDriverDoorRear_283']
  })) {
    for (const name of names) {
      const node = car.getObjectByName(name);
      if (node) pivots[openingRig[part]].attach(node);
    }
  }
  for (const name of sharedDoorTrim) {
    const mesh = car.getObjectByName(name);
    if (!mesh?.isMesh || !mesh.geometry.index) continue;
    const geometry = mesh.geometry;
    const vertices = geometry.getAttribute('position');
    const index = geometry.index.array;
    const transform = toCar.clone().multiply(mesh.matrixWorld);
    const links = Array.from({ length: vertices.count }, (_, i) => i);
    const root = i => {
      while (links[i] !== i) {
        links[i] = links[links[i]];
        i = links[i];
      }
      return i;
    };
    const join = (a, b) => { links[root(a)] = root(b); };
    // Treat vertices duplicated at UV and normal seams as connected.
    const equivalent = new Map();
    for (let i = 0; i < vertices.count; i++) {
      point.fromBufferAttribute(vertices, i).applyMatrix4(transform);
      const key = [point.x, point.y, point.z].map(value => Math.round(value * 1e5)).join(',');
      if (equivalent.has(key)) join(i, equivalent.get(key));
      else equivalent.set(key, i);
    }
    for (let i = 0; i < index.length; i += 3) {
      join(index[i], index[i + 1]);
      join(index[i], index[i + 2]);
    }
    const islands = new Map();
    for (const vertex of index) {
      const id = root(vertex);
      if (!islands.has(id)) islands.set(id, { indices: [], bounds: new THREE.Box3() });
      const island = islands.get(id);
      island.indices.push(vertex);
      island.bounds.expandByPoint(point.fromBufferAttribute(vertices, vertex).applyMatrix4(transform));
    }
    const groups = { fl: [], fr: [], rl: [], rr: [], fixed: [] };
    for (const { indices, bounds } of islands.values()) {
      const part = doorForIsland(name, bounds);
      if (part === null) continue;
      const output = groups[part];
      for (const vertex of indices) output.push(vertex);
    }
    for (const [part, indices] of Object.entries(groups)) {
      if (!indices.length) continue;
      const piece = new THREE.BufferGeometry();
      for (const [attribute, data] of Object.entries(geometry.attributes)) piece.setAttribute(attribute, data);
      piece.setIndex(indices);
      piece.boundingBox = new THREE.Box3();
      for (const index of indices) piece.boundingBox.expandByPoint(point.fromBufferAttribute(vertices, index));
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
// Tileable height maps use the model's UVs and leave the original color maps intact.
function surfaceGrain(repeat, sample) {
  const size = 128;
  const pixels = new Uint8Array(size * size * 4);
  let seed = 937;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const shade = Math.round(sample(x, y, seed / 4294967296 - .5));
      const offset = (y * size + x) * 4;
      pixels.set([shade, shade, shade, 255], offset);
    }
  }
  const texture = new THREE.DataTexture(pixels, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  texture.needsUpdate = true;
  return texture;
}
const upholsteryGrain = surfaceGrain(6, (x, y, noise) => {
  const u = x * Math.PI / 16;
  const v = y * Math.PI / 16;
  const crease = Math.abs(Math.sin(u + .65 * Math.sin(2 * v)) *
    Math.sin(v + .52 * Math.sin(2 * u)));
  return 99 + 65 * Math.sqrt(crease) + 14 * noise;
});
const clothGrain = surfaceGrain(6, (x, y, noise) => {
  const warp = Math.cos(x * Math.PI / 4);
  const weft = Math.cos(y * Math.PI / 4);
  return 128 + 39 * Math.max(warp, weft) + 17 * warp * weft + 13 * noise;
});
const carbonGrain = surfaceGrain(6, (x, y, noise) => {
  const u = x * Math.PI / 4;
  const v = y * Math.PI / 4;
  const over = Math.sin((x + y) * Math.PI / 16) > 0;
  return 143 + 28 * (over ? Math.cos(u) : Math.cos(v)) + 6 * noise;
});
const rubberGrain = surfaceGrain(12, (x, y, noise) =>
  128 + 7 * Math.sin(x * Math.PI / 8) * Math.cos(y * Math.PI / 8) + 46 * noise);
const paintGrain = surfaceGrain(12, (x, y, noise) =>
  128 + 21 * Math.sin(x * Math.PI / 16 + Math.sin(y * Math.PI / 8)) +
  13 * Math.cos(y * Math.PI / 8 + Math.sin(x * Math.PI / 8)) + 10 * noise);

const rotorCanvas = document.createElement('canvas');
rotorCanvas.width = rotorCanvas.height = 256;
const rotorContext = rotorCanvas.getContext('2d');
rotorContext.fillStyle = '#a6a6a6';
rotorContext.fillRect(0, 0, 256, 256);
for (let radius = 48; radius < 127; radius++) {
  const tone = 148 + ((radius * 31) % 39);
  rotorContext.strokeStyle = `rgb(${tone},${tone},${tone})`;
  rotorContext.beginPath();
  rotorContext.arc(128, 128, radius, 0, Math.PI * 2);
  rotorContext.stroke();
}
const rotorRoughness = new THREE.CanvasTexture(rotorCanvas);
rotorRoughness.channel = 1;

function applyRotorFinish(mesh, material) {
  const geometry = mesh.geometry.clone();
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const positions = geometry.attributes.position;
  const uv = new Float32Array(positions.count * 2);
  for (let i = 0; i < positions.count; i++) {
    uv[i * 2] = (positions.getY(i) - min.y) / (max.y - min.y);
    uv[i * 2 + 1] = (positions.getZ(i) - min.z) / (max.z - min.z);
  }
  geometry.setAttribute('uv1', new THREE.BufferAttribute(uv, 2));
  mesh.geometry = geometry;
  material.roughnessMap = rotorRoughness;
}

function normalize(glb){if(carInner){carInner.removeFromParent();carInner=null}paints.length=0;glass.length=0;seatMaterials.length=0;wheelMaterials.length=0;originalWing=null;wingHigh=null;Object.values(lightMeshes).forEach(a=>a.length=0);Object.keys(pivots).forEach(k=>delete pivots[k]);
 const car=glb.scene;car.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(car),size=b.getSize(new THREE.Vector3());carCenter=b.getCenter(new THREE.Vector3());carScale=5.45/Math.max(size.x,size.z);if(!Number.isFinite(carScale)||carScale<.0001)throw Error('Некорректный масштаб BMW');
 car.position.sub(carCenter);carInner=new THREE.Group();carInner.scale.setScalar(carScale);carInner.add(car);carRoot.add(carInner);carRoot.position.y=podiumY+.005+size.y*carScale/2;
 const uniq={paint:new Set(),seats:new Set(),wheels:new Set(),glass:new Set()};let nodes=0;
 const parentPath=(obj)=>{let result=[],p=obj;for(let i=0;p&&i<9;i++,p=p.parent)result.push(p.name||'');return result.join(' ').toLowerCase()};
 car.traverse(o=>{nodes++;if(o.name.startsWith('MERIDIAM_RIG_')&&!o.name.endsWith('COUNTER_OFFSET'))pivots[o.name]=o;
 if(o.name==='wing_a_002_1039')originalWing=o;
 if(!o.isMesh)return;
 o.castShadow=!/windows|windshield/i.test(o.name);o.receiveShadow=true;
 setMaterialOnce(o,m=>{let name=(m.name||'').toLowerCase(),oname=parentPath(o),kind=partFromName(oname+' '+name);
 if(name.includes('sapphire black')||(/paint_(hood|doors|trunk|fender|top|front|rear|bumper|fb|rb|gascap)/.test(oname)&&name.includes('paint'))){let clone=m.clone();clone.name='MERIDIAM_PAINT_'+o.name;clone.map=null;clone.bumpMap=paintGrain;clone.color.setHex(colors[state.color]);clone.metalness=.55;clone.roughness=.22;clone.clearcoat=1;clone.clearcoatRoughness=.12;clone.envMapIntensity=1.35;paints.push(clone);return clone}
 if(name.includes('meridiam | windshield')||name.includes('meridiam | side windows')||name.includes('meridiam | rear window')||name.includes('meridiam | interior glazing')){let clone=m.clone();clone.depthWrite=false;clone.transparent=true;clone.side=THREE.FrontSide;clone.opacity=name.includes('inner')?.04:.26;clone.color.setHex(0x19222b);clone.metalness=.2;clone.roughness=.16;clone.envMapIntensity=.34;glass.push(clone);o.castShadow=false;return clone}
 if(/meridiam.*(seat bolsters|seat inserts)|seat_leather|alkantaraseat|seat_koga|seat_alc|int_paint3/i.test(name+' '+oname)){let clone=m.clone();clone.name='MERIDIAM_SEAT_'+o.name;clone.color.setHex(0x242931);clone.metalness=0;clone.roughness=.75;clone.bumpMap=upholsteryGrain;clone.bumpScale=.0008;seatMaterials.push(clone);return clone}
 if(/g80_rim_|rim(_|[0-9])|rim_metal|rim_ring/.test(oname)&&!/brake|disc|tyre|tire|rim_badge|rim_m_badge|rim_logo|nipel|screws/i.test(oname)){let clone=m.clone();clone.name='MERIDIAM_RIM_'+o.name;clone.map=null;clone.metalness=.78;clone.roughness=.34;wheelMaterials.push(clone);return clone}
 if (name.includes('carbon seat backs') || /carbonroof|int_carbon/.test(oname)) {
   const carbon = m.clone();
   carbon.bumpMap = carbonGrain;
   carbon.bumpScale = .00055;
   carbon.roughness = .34;
   carbon.envMapIntensity = .78;
   return carbon;
 }
 if (/tyre|tire/.test(oname) && !/brake|rim_logo/.test(oname)) {
   const rubber = m.clone();
   rubber.metalness = 0;
   rubber.roughness = .86;
   rubber.clearcoat = 0;
   rubber.specularIntensity = .32;
   rubber.envMapIntensity = .52;
   rubber.bumpMap = rubberGrain;
   rubber.bumpScale = .0011;
   return rubber;
 }
 if (/brakedisc/.test(oname)) {
   const rotor = m.clone();
   rotor.color.setHex(0x84868a);
   rotor.metalness = .66;
   rotor.roughness = .72;
   applyRotorFinish(o, rotor);
   rotor.envMapIntensity = .66;
   return rotor;
 }
 // The GLB shares several atlas materials between parts with different finishes.
 if (/steeringstitch|ext_badge|int_buttons|int_leather|int_plastic/.test(oname) &&
     oname.includes('steer_hr')) {
   const finish = m.clone();
   if (/ext_badge/.test(oname)) {
     finish.roughness = .28;
     finish.metalness = .12;
     finish.clearcoat = .75;
     finish.clearcoatRoughness = .16;
     finish.envMapIntensity = .62;
     if (finish.map) finish.map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
   } else if (/int_leather/.test(oname)) {
     finish.color.multiplyScalar(.25);
     finish.roughness = .66;
     finish.bumpMap = upholsteryGrain;
     finish.bumpScale = .001;
     finish.clearcoat = .08;
     finish.envMapIntensity = .48;
   } else {
     finish.roughness = /gloss/.test(oname) ? .41 : .76;
     if (/steeringstitch/.test(oname)) finish.specularIntensity = .28;
     finish.envMapIntensity = .46;
     finish.clearcoat = 0;
   }
   return finish;
 }
 if (/glas_int_display_glass/.test(oname)) {
   const cover = m.clone();
   cover.roughness = .34;
   cover.metalness = 0;
   cover.envMapIntensity = .22;
   return cover;
 }
 if (/leathermaindash|leathermaininterior|interiorzone1|leatherthirddriverdoor/.test(oname)) {
   const leather = m.clone();
   leather.color.setHex(0x40434a);
   leather.metalness = 0;
   leather.roughness = .77;
   leather.clearcoat = 0;
   leather.envMapIntensity = .36;
   leather.bumpMap = upholsteryGrain;
   leather.bumpScale = .001;
   return leather;
 }
 if (/alcantaramainroof|plasticroofinterior|plastikking_seat/.test(oname)) {
   const liner = m.clone();
   liner.color.setHex(0x515155);
   liner.metalness = 0;
   liner.roughness = .91;
   liner.clearcoat = 0;
   liner.bumpMap = clothGrain;
   liner.bumpScale = .0013;
   return liner;
 }
 if (/plasticdoorsillpassdoorrear|blackplastic_doorsr|plasticdoorsillsall/.test(oname)) {
   const seal = m.clone();
   seal.color.setHex(0x24262a);
   seal.metalness = 0;
   seal.roughness = .88;
   seal.clearcoat = 0;
   seal.specularIntensity = .24;
   seal.envMapIntensity = .28;
   seal.bumpMap = rubberGrain;
   seal.bumpScale = .0006;
   return seal;
 }
 if (/chrome.*door|harmankardon.*door/.test(oname)) {
   const hardware = m.clone();
   const grille = /harmankardon/.test(oname);
   hardware.metalness = grille ? .35 : .68;
   hardware.roughness = grille ? .72 : .43;
   hardware.envMapIntensity = .49;
   hardware.clearcoat = 0;
   return hardware;
 }
 if (/plasticreartrunkint|carpetinterior|plasticsill|plasticdoorsill|plasticpassdoor|karti_hoja|blackplastic_doors|metaldetaildoorsill|pianoblack.*door|plastikking_seat/.test(oname)) {
   const trim = m.clone();
   const carpet = /trunk|carpet/.test(oname);
   trim.color.setHex(carpet ? 0x45454a : 0x575a60);
   trim.clearcoat = 0;
   trim.specularIntensity = .24;
   trim.metalness = 0;
   trim.roughness = carpet ? .96 : .82;
   trim.envMapIntensity = .28;
   trim.bumpMap = carpet ? clothGrain : upholsteryGrain;
   trim.bumpScale = carpet ? .002 : .0007;
   return trim;
 }
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
 mountCockpitDisplay(car);
 mountWheelDesigns(car);
 // Mount the factory lip and its wider derivative to the animated trunk hinge.
 if (originalWing && pivots.MERIDIAM_RIG_TRUNK_LID) {
   const hinge = pivots.MERIDIAM_RIG_TRUNK_LID;
   hinge.attach(originalWing);
   wingHigh = originalWing.clone(true);
   wingHigh.name = 'MERIDIAM_ALTERNATE_SPOILER';
   wingHigh.traverse(mesh => {
     if (!mesh.isMesh) return;
     mesh.geometry = mesh.geometry.clone();
     mesh.geometry.computeBoundingBox();
     const { min, max } = mesh.geometry.boundingBox;
     const vertices = mesh.geometry.attributes.position;
     const width = max.x - min.x;
     const height = max.y - min.y;
     if (width < .1 || height < .001) return;
     for (let i = 0; i < vertices.count; i++) {
       const x = (vertices.getX(i) - min.x) / width;
       const y = vertices.getY(i);
       const crown = Math.sin(Math.PI * x) ** 2;
       vertices.setY(i, y + crown * THREE.MathUtils.smoothstep(y, min.y + height * .35, max.y) * height * .36);
     }
     mesh.geometry.computeVertexNormals();
     mesh.geometry.computeBoundingBox();
     mesh.geometry.computeBoundingSphere();
   });
   hinge.add(wingHigh);
 }
 // Actual light beam originates near the original headlights, moves with model.
 lights.forEach(l=>l.parent?.remove(l));lights.length=0;
 for(const x of [-.78,.78]){const lamp=new THREE.SpotLight(0xe7f2ff,0,13,Math.PI/12,.48,2);lamp.position.set(x,-.055,2.45);lamp.target.position.set(x*1.45,-.81,6.25);carRoot.add(lamp,lamp.target);lights.push(lamp)}
 // Surface names and selectables present in the real asset.
 changeColor();changeWheels();changeSeat();changeSpoiler();configureLights();
 isLoaded=true;redraw=true;$('#loader').classList.add('hidden');say('BMW загружена · '+nodes+' узлов');setTab('config');setView('hero');carRoot.rotation.y=state.rotation;snapCabinCamera=true;resize();
 if (new URLSearchParams(location.search).has('qa')) {
   window.__MERIDIAM_QA = () => ({
     paint: paints.map(m => [m.color.getHex(), m.roughness, m.clearcoat]),
     rims: wheelMaterials.map(m => m.color.getHex()),
     wheelDesigns: wheelFaces.map(({ original, variant }) => [original.visible, variant.visible]),
     seats: seatMaterials.map(m => [m.color.getHex(), m.roughness]),
     lamps: Object.fromEntries(Object.entries(lightMeshes).map(([kind, list]) =>
       [kind, list.map(m => [m.emissiveIntensity, blinkSideMap.get(m) ?? null])])),
     beams: lights.map(lamp => lamp.intensity),
     spoilers: [originalWing?.visible, wingHigh?.visible],
     hinges: Object.fromEntries(Object.entries(pivots).map(([name, node]) =>
       [name, { angles: node.rotation.toArray().slice(0, 3), pivot: node.getWorldPosition(new THREE.Vector3()).toArray(), meshes: new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3()).toArray() }])),
     camera: camera.position.toArray(),
     gaze: lookTarget.toArray(),
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
     if (!audioContext) throw new Error('Start the engine before checking the recording');
     const samples = (await decodeEngineRecording(audioContext)).getChannelData(0);
     return Math.sqrt(samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length);
   };
 }
 console.info('MERIDIAM model', {nodes,materials:{paint:paints.length,glass:glass.length,seats:seatMaterials.length,wheels:wheelMaterials.length},pivots:Object.keys(pivots)});
}
const fileInput = $('#fileInput');
const filePicker = fileInput.closest('label');
const legacyModelHash = '7229ea2876f2497f779574e3e094c4ad97b94eaad941cbca6975411560e68ea9';
const modelHash = 'cce610a1f3dd9e5b3059100bff186d6fb6b6d21976d42e4b4727f639dcf83de0';
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

async function downloadPackedModel(prefix) {
  const manifest = await fetch(prefix + '.json');
  if (!manifest.ok) throw new Error('Нет списка частей модели.');
  const { lengths, lanes, byteLength } = await manifest.json();
  if (!Array.isArray(lengths) || lengths.length < 1 || lengths.length > 32 ||
      lengths.some(length => !Number.isInteger(length) || length < 1 || length > 4 * 1024 * 1024)) {
    throw new Error('Некорректный список частей модели.');
  }
  const total = lengths.reduce((sum, length) => sum + length, 0);
  const parts = [];
  let downloaded = 0;
  function report(bytes) {
    $('#progress').style.width = (bytes / total * 100) + '%';
    $('#status').textContent = 'Загрузка BMW: ' + (bytes / 1e6).toFixed(1) + ' из ' + (total / 1e6).toFixed(1) + ' МБ';
  }
  for (const [index, length] of lengths.entries()) {
    const url = prefix + '-' + index + '.bin';
    for (let attempt = 0; attempt < 3; attempt++) {
      const controller = new AbortController();
      let idle;
      function resetIdleTimer() {
        clearTimeout(idle);
        idle = setTimeout(() => controller.abort(), 65_000);
      }
      try {
        resetIdleTimer();
        const response = await fetch(url, {
          cache: attempt ? 'reload' : 'default',
          signal: controller.signal
        });
        if (!response.ok || !response.body) throw new Error('Часть модели недоступна.');
        const reader = response.body.getReader();
        const bytes = new Uint8Array(length);
        let offset = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          resetIdleTimer();
          if (offset + value.length > length) throw new Error('Неверный размер части модели.');
          bytes.set(value, offset);
          offset += value.length;
          report(downloaded + offset);
        }
        if (offset !== length) throw new Error('Часть модели скачалась не полностью.');
        parts.push(bytes);
        downloaded += length;
        break;
      } catch (error) {
        controller.abort();
        if (attempt === 2) throw error;
        report(downloaded);
      } finally {
        clearTimeout(idle);
      }
    }
  }
  $('#status').textContent = 'Распаковываем BMW…';
  const decoded = new Blob(parts).stream().pipeThrough(new DecompressionStream('gzip'));
  const restored = await new Response(decoded).arrayBuffer();
  if (restored.byteLength !== byteLength || !Array.isArray(lanes) || lanes.length > 16) {
    throw new Error('Неверный формат компактной модели.');
  }
  const bytes = new Uint8Array(restored);
  let end = 0;
  for (const { start, count, stride } of lanes) {
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(count) ||
        count < 1 || (stride !== 2 && stride !== 4) || start < end ||
        start + count * stride > bytes.length) {
      throw new Error('Неверная разметка геометрии BMW.');
    }
    end = start + count * stride;
    const stream = bytes.slice(start, end);
    for (let lane = 0; lane < stride; lane++) {
      for (let i = 0; i < count; i++) bytes[start + i * stride + lane] = stream[lane * count + i];
    }
  }
  return restored;
}

async function verifyHostedModel(bytes, acceptLegacy = false) {
  if (!globalThis.crypto?.subtle) return bytes;
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  const actual = Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
  if (actual !== modelHash && (!acceptLegacy || actual !== legacyModelHash)) throw new Error('Загруженный файл BMW не прошёл проверку.');
  return bytes;
}

const retryDownload = document.createElement('button');
retryDownload.type = 'button';
retryDownload.className = 'action hidden';
retryDownload.textContent = 'Повторить загрузку BMW';
retryDownload.onclick = () => autoload();
$('#status').after(retryDownload);

async function autoload() {
  if (!location.protocol.startsWith('http')) {
    $('#status').textContent = 'Выбери bmw_m3_g80_meridiam.glb из архива шоурума';
    return;
  }
  retryDownload.classList.add('hidden');
  filePicker.classList.add('hidden');
  fileInput.disabled = true;
  $('#status').textContent = 'Подключаемся к загрузке BMW…';
  $('#progress').style.width = '0%';
  const version = modelHash.slice(0, 12);
  try {
    let bytes;
    if (typeof DecompressionStream !== 'undefined') {
      try {
        bytes = await verifyHostedModel(await downloadPackedModel('./bmw-compact-' + version));
      } catch (error) {
        console.warn('BMW packed download:', error.message);
        $('#status').textContent = 'Пробуем резервную загрузку BMW…';
        $('#progress').style.width = '0%';
      }
    }
    if (!bytes) {
      const response = await fetch('./bmw_m3_g80_meridiam.glb?v=' + version, { cache: 'reload' });
      if (!response.ok) throw new Error('Сайт не смог скачать модель BMW.');
      bytes = await verifyHostedModel(await response.arrayBuffer(), true);
    }
    await loadInteractiveModel(bytes);
  } catch (error) {
    console.warn('BMW download:', error.message);
    fileInput.disabled = false;
    filePicker.classList.remove('hidden');
    retryDownload.classList.remove('hidden');
    $('#status').textContent = 'Связь прервалась. Повтори загрузку или выбери GLB из архива шоурума.';
  }
}

fileInput.addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  fileInput.disabled = true;
  retryDownload.disabled = true;
  $('#status').textContent = 'Чтение ' + (file.size / 1e6).toFixed(1) + ' МБ…';
  try {
    await loadInteractiveModel(await file.arrayBuffer());
  } catch (error) {
    $('#status').textContent = error.message;
    fileInput.value = '';
  } finally {
    fileInput.disabled = false;
    retryDownload.disabled = false;
  }
});
autoload();
function setTab(tab){state.tab=tab;const titles={overview:'Управление',salon:'Салон',config:'Конфигурация',light:'Освещение',specs:'О проекте'};$('#panelTitle').textContent=titles[tab];for(const s of ['overview','salon','config','light','specs'])$('#'+s+'-body').hidden=tab!==s;setSelected('[data-tab]','tab',tab);$('#views').classList.toggle('hidden',tab==='salon');if(tab!=='salon'&&state.interior){state.interior=null;setView('hero');$('#hint').textContent='Вращайте BMW мышью или касанием'}if(tab==='salon'){state.interior='driver';setCabin('driver')};$('.configuration').scrollTop=0}
function setView(key){doorFocus=null;state.interior=null;state.view=key;const headOn=Math.atan2(4.30,8.45);const angles={hero:headOn+.66,front:headOn,side:headOn-Math.PI/2,rear:headOn-Math.PI};state.rotation=angles[key]??angles.hero;state.zoom=key==='hero'?.90:1;state.auto=false;$('#rotation').classList.remove('selected');setSelected('[data-view]','view',key)}
// Cabin anchors are in the normalized model's coordinates; +X is the driver side.
const cabinViews = {
  driver: [[.46,.51,-.35], [.10,.03,1.05]],
  passenger: [[-.46,.43,.07], [-.28,.15,1.55]],
  rear: [[.05,.48,-1.33], [.02,.20,.72]]
};
const cabinEye = new THREE.Vector3();
const cabinFocus = new THREE.Vector3();
const cabinDirection = new THREE.Spherical();
const cabinLook = { yaw: 0, pitch: 0 };
let snapCabinCamera = false;

function setCabin(which) {
  snapCabinCamera = true;
  if (!reducedMotion.matches) {
    stage.animate([{ opacity: .15 }, { opacity: 1 }], { duration: 210, easing: 'ease-out' });
  }
  carRoot.rotation.y = 0;
  redraw = true;
  state.interior = which;
  cabinLook.yaw = 0;
  cabinLook.pitch = 0;
  state.rotation = 0;
  turnVelocity = 0;
  state.auto = false;
  $('#rotation').classList.remove('selected');
  setSelected('[data-cabin]', 'cabin', which);
  closeDoors();
  $('#hint').textContent = 'Перетаскивайте, чтобы осмотреть салон';
}
$$('[data-tab]').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));$$('[data-view]').forEach(b=>b.onclick=()=>{setTab('overview');setView(b.dataset.view)});$$('[data-cabin]').forEach(b=>b.onclick=()=>setCabin(b.dataset.cabin));$$('[data-color]').forEach(b=>b.onclick=()=>{state.color=b.dataset.color;changeColor()});$$('[data-finish]').forEach(b=>b.onclick=()=>{state.finish=b.dataset.finish;changeColor()});$$('[data-wheel]').forEach(b=>b.onclick=()=>{state.wheel=b.dataset.wheel;changeWheels()});$$('[data-seat]').forEach(b=>b.onclick=()=>{state.seat=b.dataset.seat;changeSeat()});$$('[data-spoiler]').forEach(b=>b.onclick=()=>{state.spoiler=b.dataset.spoiler;changeSpoiler()});$$('[data-part]').forEach(b=>b.onclick=()=>toggleDoor(b.dataset.part));$$('[data-start-engine]').forEach(b=>b.onclick=toggleEngine);$$('[data-light]').forEach(b=>b.onclick=()=>{state.light=b.dataset.light;configureLights()});$$('[data-signal]').forEach(b=>b.onclick=()=>{state.signal=b.dataset.signal;configureLights()});$('#rearLight').onclick=()=>{state.rear=!state.rear;configureLights()};$('#interiorLight').onclick=()=>{state.ambient=!state.ambient;configureLights()};$('#closeAll').onclick=closeDoors;$('#rotation').onclick=()=>{state.auto=!state.auto;$('#rotation').classList.toggle('selected',state.auto)};$('#resetView').onclick=()=>{setTab('overview');setView('hero')};
$$('[data-wheel-design]').forEach(button => button.onclick = () => selectWheelDesign(button.dataset.wheelDesign));
for(const k of Object.keys(state.targetDoors))$('#spot-'+k).onclick=()=>toggleDoor(k);
$('#contact').onclick=()=>$('#contactModal').classList.remove('hidden');$('#closeContact').onclick=()=>$('#contactModal').classList.add('hidden');$('#copyRequest').onclick=async()=>{const msg='Здравствуйте! Хочу обсудить разработку интерактивного 3D-шоурума/конфигуратора для нашей компании.';try{await navigator.clipboard.writeText(msg);say('Текст заявки скопирован')}catch{prompt('Скопируйте текст заявки:',msg)}};
// Interaction rotates the car and podium, not the room or camera; never crosses the floor.
const surface = renderer.domElement;
let activePointer = null;
let lastX = 0;
let lastY = 0;
let lastMove = 0;
let turnVelocity = 0;

surface.addEventListener('pointerdown', event => {
  if (!isLoaded || activePointer !== null || event.button !== 0) return;
  activePointer = event.pointerId;
  lastX = event.clientX;
  lastY = event.clientY;
  lastMove = event.timeStamp;
  turnVelocity = 0;
  state.auto = false;
  $('#rotation').classList.remove('selected');
  surface.setPointerCapture(event.pointerId);
});
surface.addEventListener('pointermove', event => {
  if (activePointer !== event.pointerId) return;
  const dx = event.clientX - lastX;
  const dy = event.clientY - lastY;
  if (state.interior) {
    cabinLook.yaw = THREE.MathUtils.clamp(cabinLook.yaw - dx * .005, -1.62, 1.62);
    cabinLook.pitch = THREE.MathUtils.clamp(cabinLook.pitch + dy * .0045, -.38, .53);
  } else {
    // The access camera follows the door, which would cancel a rotation.
    if (dx !== 0) doorFocus = null;
    state.rotation += dx * .0067;
    const seconds = Math.max(.012, (event.timeStamp - lastMove) / 1000);
    turnVelocity = THREE.MathUtils.clamp(dx * .0067 / seconds, -3.2, 3.2);
  }
  lastX = event.clientX;
  lastY = event.clientY;
  lastMove = event.timeStamp;
});
function finishDrag(event) {
  if (activePointer !== event.pointerId) return;
  activePointer = null;
  if (event.type === 'pointerup' && !state.interior && !reducedMotion.matches &&
      event.timeStamp - lastMove < 90) {
    state.rotation += turnVelocity * .14;
  }
  turnVelocity = 0;
}
surface.addEventListener('pointerup', finishDrag);
surface.addEventListener('pointercancel', finishDrag);
surface.addEventListener('lostpointercapture', finishDrag);
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
 const studioMoving = updateStudioLighting(dt);
 const angleBefore = carRoot.rotation.y;
 let movingHinge = false;
 if (state.auto && !state.interior) {
   doorFocus = null;
   state.rotation += dt * .15;
 }
 const yawDelta=THREE.MathUtils.euclideanModulo(state.rotation-carRoot.rotation.y+Math.PI,Math.PI*2)-Math.PI;carRoot.rotation.y+=Math.abs(yawDelta)<.0005?yawDelta:yawDelta*(1-Math.exp(-9*dt));
 podium.rotation.y=carRoot.rotation.y;
 // Articulation hinges are in model source units, corrected during GLB preparation.
 for (const [part, name] of Object.entries(openingRig)) {
   const hinge = pivots[name];
   if (!hinge) continue;
   const progress = state.doors[part];
   const target = state.targetDoors[part];
   movingHinge ||= progress !== target;
   state.doors[part] = progress + Math.sign(target - progress) * Math.min(Math.abs(target - progress), dt / .78);
   const ease = THREE.MathUtils.smoothstep(state.doors[part], 0, 1);
   hinge.rotation[part === 'trunk' ? 'x' : 'y'] = angularTarget(part, ease);
 }
 if (state.interior) {
   const [eye, focus] = cabinViews[state.interior];
   desiredCam.copy(carRoot.localToWorld(cabinEye.fromArray(eye)));
   cabinEye.fromArray(eye);
   cabinFocus.fromArray(focus).sub(cabinEye);
   cabinDirection.setFromVector3(cabinFocus);
   cabinDirection.theta += cabinLook.yaw;
   cabinDirection.phi += cabinLook.pitch;
   cabinDirection.makeSafe();
   cabinFocus.setFromSpherical(cabinDirection).add(cabinEye);
   desiredLook.copy(carRoot.localToWorld(cabinFocus));
 } else if (doorFocus) {
   const distance = state.zoom * Math.max(1, .93 / camera.aspect);
   const side = doorFocus[1] === 'l' ? 1 : -1;
   const doorZ = doorFocus[0] === 'r' ? -.82 : .45;
   desiredCam.copy(carRoot.localToWorld(cabinEye.set(side * (.68 + 3.6 * distance), .38 + .82 * distance, doorZ - 2.0 * distance)));
   desiredLook.copy(carRoot.localToWorld(cabinFocus.set(side * .63, .14, doorZ)));
 } else {
   const distance = state.zoom * Math.max(.95, 1.08 / camera.aspect);
   const hero = state.view === 'hero';
   const cameraHeight = hero ? 1.73 : 2.32;
   desiredCam.set(4.30 * distance, cameraHeight * distance, 8.45 * distance);
   desiredLook.set(-.65, hero ? (camera.aspect < 1 ? .9 : .57) : 1.03, 0);
 }
 const damping = reducedMotion.matches || snapCabinCamera ? 1 : 1 - Math.exp(-8 * dt);
 snapCabinCamera = false;
 const roomMoving = Math.abs(carRoot.rotation.y - angleBefore) > .00005 || movingHinge;
 const cameraMoving = camera.position.distanceToSquared(desiredCam) > .00001 ||
   lookTarget.distanceToSquared(desiredLook) > .00001;
 camera.fov = THREE.MathUtils.lerp(camera.fov, state.interior === 'driver' ? (camera.aspect < .8 ? 72 : 63) : state.interior ? (camera.aspect < .8 ? 67 : 57) : 34, damping);
 camera.filmOffset = THREE.MathUtils.lerp(camera.filmOffset, state.interior ? 0 : (innerWidth > 900 ? 3.2 : 0), damping);
 camera.updateProjectionMatrix();
 camera.position.lerp(desiredCam, damping);
 lookTarget.lerp(desiredLook, damping);
 camera.lookAt(lookTarget);
 const flash = now % 1040 < 520;
 for (const material of lightMeshes.drl) {
   const signal = state.signal === 'hazard' || state.signal === blinkSideMap.get(material);
   material.emissive.setHex(signal ? 0xff8418 : 0xd6f0ff);
   material.emissiveIntensity = signal ? (flash ? 14.8 : 0) : (state.light === 'off' ? 0 : 1.8);
 }
 for (const material of lightMeshes.blink) {
   const lit = flash && (state.signal === 'hazard' || state.signal === blinkSideMap.get(material));
   material.emissive.setHex(0xff8418);
   material.emissiveIntensity = lit ? 17 : 0;
 }
 const frameKey = [
   isLoaded, state.tab, state.color, state.finish, state.seat, state.wheel, state.spoiler,
   state.light, state.rear, state.ambient, state.engine, state.signal, state.signal !== 'off' && flash
 ].join('|');
 if (redraw || frameKey !== renderedKey || roomMoving || cameraMoving || studioMoving) {
   renderer.shadowMap.needsUpdate = redraw || roomMoving;
   floorReflection.visible = !state.interior;
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
const mobileToggle = $('#mobilePanelToggle');
const mobilePanel = $('#config');
function toggleMobilePanel() {
  const open = mobilePanel.classList.toggle('mobile-open');
  mobileToggle.setAttribute('aria-expanded', String(open));
  mobileToggle.textContent = open ? 'Закрыть настройки ✕' : 'Настройки ⌄';
}
mobileToggle.onclick = toggleMobilePanel;
mobileToggle.style.touchAction = 'manipulation';
// A tap immediately after a canvas swipe can lose its synthesized click.
let panelTap = null;
mobileToggle.addEventListener('touchstart', event => {
  panelTap = event.touches.length === 1 ? event.changedTouches[0] : null;
}, { passive: true });
mobileToggle.addEventListener('touchcancel', () => { panelTap = null; });
mobileToggle.addEventListener('touchend', event => {
  const start = panelTap;
  panelTap = null;
  if (!start) return;
  const end = [...event.changedTouches].find(touch => touch.identifier === start.identifier);
  if (!end || Math.hypot(end.clientX - start.clientX, end.clientY - start.clientY) > 10 ||
      !mobileToggle.contains(document.elementFromPoint(end.clientX, end.clientY))) return;
  event.preventDefault();
  toggleMobilePanel();
}, { passive: false });
addEventListener('keydown',e=>{if(e.key==='Escape'){$('#contactModal').classList.add('hidden');if(state.interior)setTab('overview')}});
