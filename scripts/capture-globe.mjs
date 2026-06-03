/**
 * Playwright script: captures the PACT spinning globe.
 * Renders an isolated Three.js scene matching Globe.jsx exactly,
 * waits for the animation to settle, then saves a screenshot.
 *
 * Usage: node scripts/capture-globe.mjs
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, 'globe-capture.png');

const GLOBE_HTML = String.raw`<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<style>
  html,body{margin:0;padding:0;background:#0a0e1a;width:700px;height:700px;overflow:hidden}
  canvas{width:700px;height:700px;display:block}
</style>
</head><body>
<canvas id="c"></canvas>
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js"}}</script>
<script type="module">
import * as THREE from 'three';

const GLOBE_RADIUS = 1.56;
const ACCENT = new THREE.Color(0x00b0ff);
const ARC_PAIRS = [
  [[37.8,-122.4],[51.5,-0.1],0.25,0.0042],
  [[40.7,-74.0],[35.7,139.7],0.34,0.0035],
  [[33.7,-84.4],[1.35,103.8],0.28,0.0048],
  [[25.2,55.3],[-33.9,151.2],0.22,0.004],
  [[-23.5,-46.6],[48.9,2.35],0.2,0.0052],
  [[52.5,13.4],[-26.2,28.0],0.18,0.0038],
  [[19.4,-99.1],[-34.6,-58.4],0.16,0.0045],
  [[45.5,-73.6],[59.9,10.8],0.21,0.0039],
  [[41.9,12.5],[31.2,121.5],0.3,0.0044],
  [[-1.3,36.8],[50.1,14.4],0.19,0.005],
];
const SEG = 52;
const TRAIL = 10;
const TRAIL_STEP = 0.018;

function deg(v){ return v * Math.PI / 180; }
function sphere(lat, lon, r){ const a=deg(lat),b=deg(lon); return [Math.cos(a)*Math.cos(b)*r, Math.sin(a)*r, Math.cos(a)*Math.sin(b)*r]; }
function norm3(p){ const l=Math.hypot(...p)||1; return p.map(v=>v/l); }
function wrap01(v){ return ((v%1)+1)%1; }

function makeArc(from, to, lift){
  const s=sphere(...from, GLOBE_RADIUS), e=sphere(...to, GLOBE_RADIUS), pts=[];
  for(let i=0;i<=SEG;i++){
    const t=i/SEG;
    const m=norm3([s[0]*(1-t)+e[0]*t, s[1]*(1-t)+e[1]*t, s[2]*(1-t)+e[2]*t]);
    const r=GLOBE_RADIUS+lift*Math.sin(Math.PI*t);
    pts.push(m.map(v=>v*r));
  }
  return pts;
}

function sampleArc(pts, p){
  const s=p*(pts.length-1), i=Math.floor(s), j=Math.min(pts.length-1,i+1), t=s-i;
  return pts[i].map((v,k)=>v*(1-t)+pts[j][k]*t);
}

function latRing(lat, r){
  const verts=[];
  for(let lon=-180;lon<180;lon+=4){ verts.push(...sphere(lat,lon,r),...sphere(lat,lon+2.8,r)); }
  return verts;
}

// ── setup ──────────────────────────────────────────────────────────────────────
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, alpha:true, antialias:true });
renderer.setClearColor(0x000000,0);
renderer.setSize(700,700,false);

const camera = new THREE.PerspectiveCamera(38,1,0.1,100);
camera.position.set(0,0,4.7);

const scene = new THREE.Scene();
const globe = new THREE.Group();
globe.rotation.set(-0.18,-0.58,0.08);
globe.scale.setScalar(0.88);
scene.add(globe);

// glow
globe.add(new THREE.Mesh(
  new THREE.SphereGeometry(GLOBE_RADIUS*1.01,48,32),
  new THREE.MeshBasicMaterial({color:ACCENT,transparent:true,opacity:0.04,depthWrite:false})
));

// atmosphere halo (NEW)
globe.add(new THREE.Mesh(
  new THREE.SphereGeometry(GLOBE_RADIUS*1.12,48,32),
  new THREE.MeshBasicMaterial({color:ACCENT,transparent:true,opacity:0.055,depthWrite:false,
    blending:THREE.AdditiveBlending,side:THREE.BackSide})
));

// dot cloud — synthetic landmass points
const positions=[], colors=[];
const N=3200;
for(let i=0;i<N;i++){
  const lat=(Math.random()-0.5)*160, lon=(Math.random()-0.5)*360;
  const p=sphere(lat,lon,GLOBE_RADIUS);
  const depth=0.22+0.78*Math.max(0,Math.min(1,(p[2]/GLOBE_RADIUS+1)/2));
  positions.push(...p);
  colors.push(ACCENT.r*depth, ACCENT.g*depth, ACCENT.b*depth);
}
const dotGeo=new THREE.BufferGeometry();
dotGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
dotGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
globe.add(new THREE.Points(dotGeo, new THREE.PointsMaterial({size:0.026,sizeAttenuation:true,vertexColors:true,transparent:true,opacity:0.92,depthWrite:false})));

// guide lines
const lineVerts=[];
for(const lon of[-120,-60,0,60,120]){
  for(let lat=-72;lat<72;lat+=5){ lineVerts.push(...sphere(lat,lon,GLOBE_RADIUS*1.006),...sphere(lat+3.5,lon,GLOBE_RADIUS*1.006)); }
}
for(const lat of[-45,-20,0,20,45]){
  for(let lon=-180;lon<180;lon+=5){ lineVerts.push(...sphere(lat,lon,GLOBE_RADIUS*1.006),...sphere(lat,lon+3.5,GLOBE_RADIUS*1.006)); }
}
const lineGeo=new THREE.BufferGeometry();
lineGeo.setAttribute('position',new THREE.Float32BufferAttribute(lineVerts,3));
globe.add(new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({color:ACCENT,transparent:true,opacity:0.14,depthWrite:false})));

// arcs
const arcPaths = ARC_PAIRS.map(([f,t,lift,speed])=>({points:makeArc(f,t,lift), lift, speed, progress:Math.random()}));
const arcVerts=[];
for(const a of arcPaths){ for(let i=0;i<a.points.length-1;i++){ arcVerts.push(...a.points[i],...a.points[i+1]); } }
const arcGeo=new THREE.BufferGeometry();
arcGeo.setAttribute('position',new THREE.Float32BufferAttribute(arcVerts,3));
globe.add(new THREE.LineSegments(arcGeo, new THREE.LineBasicMaterial({color:ACCENT,transparent:true,opacity:0.26,depthWrite:false})));

// pulse dots
const pulseGeo=new THREE.BufferGeometry();
pulseGeo.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(arcPaths.length*3),3));
const pulseMat=new THREE.PointsMaterial({color:ACCENT,size:0.065,sizeAttenuation:true,transparent:true,opacity:0.9,depthWrite:false});
const pulses=new THREE.Points(pulseGeo,pulseMat);
globe.add(pulses);

// trails
const trailLayers=Array.from({length:TRAIL},(_,i)=>{
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(arcPaths.length*6),3));
  const m=new THREE.LineBasicMaterial({color:ACCENT,transparent:true,opacity:0.38*Math.pow(1-i/TRAIL,1.7),depthWrite:false});
  const l=new THREE.LineSegments(g,m); globe.add(l);
  return {geometry:g,material:m};
});

// scan ring
const scanGeo=new THREE.BufferGeometry();
scanGeo.setAttribute('position',new THREE.Float32BufferAttribute(latRing(0,GLOBE_RADIUS*1.012),3));
const scanMat=new THREE.LineBasicMaterial({color:ACCENT,transparent:true,opacity:0.22,depthWrite:false});
const scanRing=new THREE.LineSegments(scanGeo,scanMat);
globe.add(scanRing);

// ── animate ────────────────────────────────────────────────────────────────────
function tick(){
  globe.rotation.y+=0.0035;
  const t=Date.now()*0.001;

  // update pulses
  const pp=pulseGeo.attributes.position;
  for(let i=0;i<arcPaths.length;i++){
    const a=arcPaths[i]; a.progress=wrap01(a.progress+a.speed);
    const pt=sampleArc(a.points,a.progress); pp.setXYZ(i,...pt);
  }
  pp.needsUpdate=true;
  pulseMat.size=0.055+0.022*Math.abs(Math.sin(t*2.8));

  // trails
  for(let li=0;li<trailLayers.length;li++){
    const {geometry:tg}=trailLayers[li];
    const tp=tg.attributes.position;
    for(let ai=0;ai<arcPaths.length;ai++){
      const a=arcPaths[ai];
      const h=sampleArc(a.points,wrap01(a.progress-TRAIL_STEP*li));
      const tl=sampleArc(a.points,wrap01(a.progress-TRAIL_STEP*(li+1)));
      tp.setXYZ(ai*2,...tl); tp.setXYZ(ai*2+1,...h);
    }
    tp.needsUpdate=true;
  }

  // scan
  const lat=Math.sin(t*0.8)*58;
  const rv=latRing(lat,GLOBE_RADIUS*1.014);
  const rp=scanRing.geometry.attributes.position;
  for(let i=0;i<rv.length;i+=3) rp.setXYZ(i/3,rv[i],rv[i+1],rv[i+2]);
  rp.needsUpdate=true;
  scanMat.opacity=0.12+0.22*(0.5+0.5*Math.sin(t*2.2));

  renderer.render(scene,camera);
  requestAnimationFrame(tick);
}
tick();
window.__globeReady=true;
</script></body></html>`;

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page    = await browser.newPage({ viewport: { width: 700, height: 700 } });

  await page.setContent(GLOBE_HTML, { waitUntil: 'domcontentloaded' });

  // Wait for Three.js CDN load + globe to start animating
  await page.waitForFunction(() => window.__globeReady === true, { timeout: 30_000 });
  await page.waitForTimeout(2800); // let it spin a few rotations

  await page.screenshot({ path: OUT, type: 'png' });
  await browser.close();

  console.log(`Globe captured → ${OUT}`);
})();
