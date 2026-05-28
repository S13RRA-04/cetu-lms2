import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const GLOBE_RADIUS  = 105;
const LINE_SEGMENTS = 96;

function mulberry32(seed) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexToColor(hex, fallback = '#00b0ff') {
  return new THREE.Color(/^#[0-9a-f]{6}$/i.test(hex ?? '') ? hex : fallback);
}

function pointOnSphere(latDeg, lonDeg, radius = GLOBE_RADIUS) {
  const lat = THREE.MathUtils.degToRad(latDeg);
  const lon = THREE.MathUtils.degToRad(lonDeg);
  return new THREE.Vector3(
    radius * Math.cos(lat) * Math.cos(lon),
    radius * Math.sin(lat),
    radius * Math.cos(lat) * Math.sin(lon),
  );
}

// Eastern-hemisphere-detailed land blobs [centerLon, centerLat, radiusLon, radiusLat]
const LAND_BLOBS = [
  [-105, 50, 38, 16], [-80, 38, 30, 15], [-65, -8, 22, 22],
  [-5, 53, 11, 8],  [5, 47, 16, 11],  [12, 52, 13, 11],
  [22, 45, 14, 13], [28, 57, 16, 14], [37, 55, 13, 11],
  [15, 42, 16,  9], [26, 38, 12,  7],
  [35, 55, 20, 15], [40, 48, 18, 15], [50, 58, 25, 16],
  [16, 10, 22, 30], [33,  2, 18, 24], [18, -28, 16, 18],
  [37, 15, 18, 20], [ 8, 30, 16, 26],
  [35, 32, 16, 13], [42, 37, 13, 11], [44, 32, 12,  9],
  [50, 26, 13, 13], [44, 16, 10,  9], [58, 22, 10,  9],
  [62, 42, 18, 14], [70, 38, 16, 13], [50, 55, 20, 13],
  [72, 22, 14,  9], [80, 15, 12, 11], [80, 28, 16, 11], [67, 30, 14, 13],
  [105, 20, 22, 18], [108, 8, 16, 14], [120, 28, 16, 18],
  [115, 42, 20, 15], [127, 35, 10, 13], [133, 35, 9, 13],
  [132, -25, 18, 13],
];

function landWeight(lon, lat) {
  let w = 0;
  for (const [cx, cy, rx, ry] of LAND_BLOBS) {
    const dx = Math.min(Math.abs(lon - cx), 360 - Math.abs(lon - cx)) / rx;
    const dy = (lat - cy) / ry;
    w += Math.exp(-(dx * dx + dy * dy) * 1.65);
  }
  return w;
}

// Structured hex-grid dots — rows offset every other line for hexagonal appearance
function makeHexGrid(primary, accent) {
  const ROWS = 88;
  const pos = [], col = [];

  for (let row = 0; row < ROWS; row++) {
    const lat   = -86 + (row / (ROWS - 1)) * 172;
    const cosLat = Math.max(Math.cos(THREE.MathUtils.degToRad(lat)), 0.06);
    const cols  = Math.round(ROWS * 2.0 * cosLat);
    const shift = (row % 2 === 1) ? 0.5 : 0;

    for (let c = 0; c < cols; c++) {
      const lon = -180 + (c + shift) * (360 / cols);
      const w   = landWeight(lon, lat);
      if (w < 0.28) continue;

      // Coastal band bright, deep interior dimmer
      const coastFactor = w < 1.4 ? Math.min(w / 0.7, 1.0) : Math.max(0.25, 1.0 - (w - 1.4) / 1.8);
      const p = pointOnSphere(lat, lon, GLOBE_RADIUS + 0.5);
      pos.push(p.x, p.y, p.z);

      const c_col = primary.clone().lerp(accent, coastFactor * 0.55);
      const k = 0.38 + coastFactor * 0.62;
      col.push(c_col.r * k, c_col.g * k, c_col.b * k);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color',    new THREE.Float32BufferAttribute(col, 3));
  return geo;
}

function makeCirclePoints(radius, axis, value = 0, segs = LINE_SEGMENTS) {
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    if (axis === 'y') pts.push(new THREE.Vector3(Math.cos(a) * radius, value, Math.sin(a) * radius));
    if (axis === 'x') pts.push(new THREE.Vector3(value, Math.cos(a) * radius, Math.sin(a) * radius));
  }
  return pts;
}

function makeArcPoints(start, end, lift, segs = 64) {
  const pts = [];
  const a = start.clone().normalize();
  const b = end.clone().normalize();
  const omega = Math.acos(THREE.MathUtils.clamp(a.dot(b), -1, 1));
  const sinO  = Math.sin(omega);
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const p = sinO < 0.001
      ? a.clone().lerp(b, t).normalize()
      : a.clone().multiplyScalar(Math.sin((1 - t) * omega) / sinO)
          .add(b.clone().multiplyScalar(Math.sin(t * omega) / sinO)).normalize();
    pts.push(p.clone().multiplyScalar(GLOBE_RADIUS + lift * Math.sin(Math.PI * t)));
  }
  return pts;
}

function makeGlowTex(color, size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const c   = color.clone().multiplyScalar(255);
  const g   = ctx.createRadialGradient(size/2, size/2, size*0.02, size/2, size/2, size/2);
  g.addColorStop(0,    'rgba(255,255,255,0.95)');
  g.addColorStop(0.1,  `rgba(${c.r|0},${c.g|0},${c.b|0},0.7)`);
  g.addColorStop(0.45, `rgba(${c.r|0},${c.g|0},${c.b|0},0.2)`);
  g.addColorStop(1,    `rgba(${c.r|0},${c.g|0},${c.b|0},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

// [lat, lon, isHot]
const CITIES = [
  [ 51.5,  -0.1, false], [ 48.9,   2.3, false], [ 52.5,  13.4, false],
  [ 55.8,  37.6, true ], [ 30.0,  31.2, false], [ 25.2,  55.3, true ],
  [ 35.7,  51.4, true ], [ 41.0,  29.0, false], [ 28.6,  77.2, false],
  [  1.3, 103.8, false], [ 39.9, 116.4, true ], [ 31.2, 121.5, false],
  [ 35.7, 139.7, false], [ 37.6, 127.0, false], [ -1.3,  36.8, false],
  [ 40.7, -74.0, false], [ 50.4,  30.5, true ], [ 24.7,  46.7, true ],
  [ 33.9,  35.5, false], [ 19.1,  72.9, false], [-26.2,  28.0, false],
  [ 59.9,  10.7, false], [ 53.3,  -6.3, false],
];

// [cityA, cityB, isWarm]
const ARCS = [
  [ 0,  3, false], [ 0,  4, false], [ 0, 15, false], [ 0,  1, false],
  [ 0,  2, false], [ 1,  7, false], [ 2,  7, false], [ 2, 16, true ],
  [ 3, 16, true ], [ 3, 10, true ], [ 4,  5, false], [ 4, 14, false],
  [ 5,  6, true ], [ 5,  8, false], [ 5, 17, true ], [ 6,  7, true ],
  [ 6, 17, true ], [ 7, 16, true ], [ 7, 18, false], [ 8,  9, false],
  [ 9, 10, false], [ 9, 11, false], [10, 12, false], [11, 12, false],
  [12, 13, false], [17, 18, true ], [14, 20, false], [ 5,  9, false],
  [ 0, 22, false], [21, 22, false], [ 3,  7, false], [19,  8, false],
];

export default function Globe({
  className = '',
  primaryColor = '#00b0ff',
  binaryAccentColor = '#27f5ff',
}) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    // Squad color has strong influence on the globe palette
    const primary = hexToColor('#00b0ff').lerp(hexToColor(primaryColor), 0.58);
    const accent  = hexToColor('#27f5ff').lerp(hexToColor(binaryAccentColor, '#27f5ff'), 0.42);
    const warmClr = new THREE.Color('#ff9500');
    const hotClr  = new THREE.Color('#ff3300');
    const white   = new THREE.Color(1, 1, 1);

    const width  = Math.max(1, mount.clientWidth);
    const height = Math.max(1, mount.clientHeight);
    const scene  = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1600);
    camera.position.set(0, 32, 295);
    camera.lookAt(0, -42, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // ── Globe group ───────────────────────────────────────────────────────────
    const globe = new THREE.Group();
    globe.rotation.y = -1.22;
    globe.rotation.x = -0.06;
    globe.position.y = -62;
    scene.add(globe);

    // Very subtle dark base — just enough to define the globe shape over the page
    globe.add(new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS * 0.993, 72, 36),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#010810'), transparent: true, opacity: 0.55 }),
    ));

    // ── Atmosphere — 4 additive layers for a brilliant rim ───────────────────

    // 1. Wide outer halo
    const atmosphereMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { color: { value: primary.clone() }, time: { value: 0 } },
      vertexShader: `
        varying vec3 vNormal; varying vec3 vWorld;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vWorld  = (modelMatrix * vec4(position,1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }`,
      fragmentShader: `
        uniform vec3 color; uniform float time;
        varying vec3 vNormal; varying vec3 vWorld;
        void main() {
          float rim  = pow(1.0 - abs(vNormal.z), 1.7) * 0.48;
          float scan = smoothstep(0.9,1.0, 0.5+0.5*sin(vWorld.y*0.55+time*3.2)) * 0.025;
          gl_FragColor = vec4(color, rim + scan);
        }`,
    });
    globe.add(new THREE.Mesh(new THREE.SphereGeometry(GLOBE_RADIUS * 1.12, 96, 48), atmosphereMat));

    // 2. Mid glow
    globe.add(new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS * 1.06, 96, 48),
      new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { color: { value: accent.clone() } },
        vertexShader: `varying vec3 vNormal; void main() { vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform vec3 color; varying vec3 vNormal; void main() { gl_FragColor = vec4(color, pow(1.0-abs(vNormal.z),3.0)*0.62); }`,
      }),
    ));

    // 3. Bright rim — squad-colored
    globe.add(new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS * 1.018, 96, 48),
      new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { color: { value: white.clone().lerp(accent, 0.35) } },
        vertexShader: `varying vec3 vNormal; void main() { vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform vec3 color; varying vec3 vNormal; void main() { float r = pow(1.0-abs(vNormal.z),7.0); gl_FragColor = vec4(color, min(1.0, r*1.5)); }`,
      }),
    ));

    // 4. Hot inner edge
    globe.add(new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS * 1.004, 96, 48),
      new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { color: { value: white.clone() } },
        vertexShader: `varying vec3 vNormal; void main() { vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform vec3 color; varying vec3 vNormal; void main() { float r = pow(1.0-abs(vNormal.z),14.0); gl_FragColor = vec4(color, min(1.0, r*2.0)); }`,
      }),
    ));

    // ── Scan line sweeping the globe ──────────────────────────────────────────
    const scanMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { color: { value: accent.clone() }, time: { value: 0 } },
      vertexShader: `
        varying vec3 vWorld;
        void main() {
          vWorld = (modelMatrix * vec4(position,1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }`,
      fragmentShader: `
        uniform vec3 color; uniform float time;
        varying vec3 vWorld;
        void main() {
          float scan = mod(vWorld.y / (${GLOBE_RADIUS.toFixed(1)} * 2.0) + time * 0.18, 1.0);
          float band = smoothstep(0.0, 0.018, scan) * smoothstep(0.048, 0.026, scan);
          gl_FragColor = vec4(color, band * 0.28);
        }`,
    });
    globe.add(new THREE.Mesh(new THREE.SphereGeometry(GLOBE_RADIUS + 1, 64, 32), scanMat));

    // ── Wireframe shell ───────────────────────────────────────────────────────
    globe.add(new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS, 48, 24),
      new THREE.MeshBasicMaterial({ color: primary, transparent: true, opacity: 0.04, wireframe: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    ));

    // ── Hex grid continent dots ───────────────────────────────────────────────
    globe.add(new THREE.Points(
      makeHexGrid(primary, accent),
      new THREE.PointsMaterial({ size: 1.8, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending }),
    ));

    // ── Lat/lon grid ──────────────────────────────────────────────────────────
    const gridMat = () => new THREE.LineBasicMaterial({ color: primary, transparent: true, opacity: 0.08, depthWrite: false, blending: THREE.AdditiveBlending });
    for (const lat of [-60, -30, 0, 30, 60]) {
      const y = Math.sin(THREE.MathUtils.degToRad(lat)) * GLOBE_RADIUS;
      const r = Math.cos(THREE.MathUtils.degToRad(lat)) * GLOBE_RADIUS;
      globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(makeCirclePoints(r, 'y', y)), gridMat()));
    }
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Line(new THREE.BufferGeometry().setFromPoints(makeCirclePoints(GLOBE_RADIUS, 'x')), gridMat());
      m.rotation.y = (i / 8) * Math.PI;
      globe.add(m);
    }

    // ── Network arcs + data-pulse sprites ─────────────────────────────────────
    const rng = mulberry32(7202);
    const arcMats   = [];
    const arcPaths  = [];
    const arcPhases = [];

    const texCyan = makeGlowTex(accent);
    const texWarm = makeGlowTex(warmClr);

    for (const [ai, bi, isWarm] of ARCS) {
      const [latA, lonA] = CITIES[ai];
      const [latB, lonB] = CITIES[bi];
      const path = makeArcPoints(
        pointOnSphere(latA, lonA, GLOBE_RADIUS + 2),
        pointOnSphere(latB, lonB, GLOBE_RADIUS + 2),
        4 + rng() * 9,
      );
      arcPaths.push(path);
      arcPhases.push(rng());

      const mat = new THREE.LineBasicMaterial({
        color:      isWarm ? (rng() > 0.5 ? warmClr : hotClr) : primary.clone().lerp(accent, 0.3),
        transparent: true, opacity: 0.2 + rng() * 0.2,
        depthWrite: false, blending: THREE.AdditiveBlending,
      });
      arcMats.push({ mat, isWarm, phase: rng() * Math.PI * 2 });
      globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(path), mat));
    }

    // One data-pulse sprite per arc that travels along the line
    const pulseSprites = arcPaths.map((_, i) => {
      const isWarm = ARCS[i][2];
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: isWarm ? texWarm : texCyan,
        color: isWarm ? warmClr : accent,
        transparent: true, opacity: 0,
        depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      sprite.scale.setScalar(isWarm ? 5 : 3.5);
      globe.add(sprite);
      return sprite;
    });

    // ── City nodes ────────────────────────────────────────────────────────────
    const pulseRings = [];

    for (let ci = 0; ci < CITIES.length; ci++) {
      const [lat, lon, isHot] = CITIES[ci];
      const pos    = pointOnSphere(lat, lon, GLOBE_RADIUS + 2);
      const normal = pos.clone().normalize();
      const color  = isHot ? warmClr : accent;

      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: isHot ? texWarm : texCyan, color,
        transparent: true, opacity: isHot ? 0.95 : 0.82,
        depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      sprite.position.copy(pos);
      sprite.scale.setScalar(isHot ? 10 : 6);
      globe.add(sprite);

      // Target ring
      const tRing = new THREE.Mesh(
        new THREE.RingGeometry(1.1, 1.8, 24),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: isHot ? 0.65 : 0.42, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      tRing.position.copy(pos);
      tRing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      globe.add(tRing);

      // Pulse ring
      const pRing = new THREE.Mesh(
        new THREE.RingGeometry(0.4, 1.4, 28),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      pRing.position.copy(pos);
      pRing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      globe.add(pRing);
      pulseRings.push({ mesh: pRing, phase: (ci / CITIES.length) * Math.PI * 2, speed: isHot ? 1.2 : 0.75, maxOp: isHot ? 0.58 : 0.32 });
    }

    // ── Scene halo ────────────────────────────────────────────────────────────
    const haloTex = makeGlowTex(primary);
    const halo    = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.position.y = -62;
    halo.scale.setScalar(GLOBE_RADIUS * 3.8);
    scene.add(halo);

    // ── Background: geometric HUD elements ───────────────────────────────────
    const rngBg = mulberry32(3311);

    // Corner bracket shapes (L-brackets) scattered in background
    const bracketMat = new THREE.LineBasicMaterial({ color: primary, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending });
    for (let i = 0; i < 10; i++) {
      const x = (rngBg() - 0.5) * 520;
      const y = (rngBg() - 0.5) * 360;
      const z = -100 - rngBg() * 120;
      const s = 12 + rngBg() * 20;
      const corners = [
        // Top-left L
        [x-s, y+s*0.4, z,  x-s, y+s, z,  x-s*0.4, y+s, z],
        // Bottom-right L
        [x+s*0.4, y-s, z,  x+s, y-s, z,  x+s, y-s*0.4, z],
      ];
      corners.forEach((pts) => {
        const geo = new THREE.BufferGeometry().setFromPoints(pts.reduce((acc, _, j) => {
          if (j % 3 === 0) acc.push(new THREE.Vector3(pts[j], pts[j+1], pts[j+2]));
          return acc;
        }, []));
        scene.add(new THREE.Line(geo, bracketMat.clone()));
      });
    }

    // Vertical light streaks
    for (let i = 0; i < 24; i++) {
      const x = (rngBg() - 0.5) * 580;
      const z = -100 - rngBg() * 140;
      const y = (rngBg() - 0.5) * 340;
      const h = 50 + rngBg() * 150;
      const op = rngBg() > 0.7 ? 0.035 + rngBg() * 0.04 : 0.01 + rngBg() * 0.02;
      scene.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, y-h/2, z), new THREE.Vector3(x, y+h/2, z)]),
        new THREE.LineBasicMaterial({ color: primary, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending }),
      ));
    }

    // Bokeh glows
    const bokehTex = makeGlowTex(primary, 128);
    for (let i = 0; i < 10; i++) {
      const bk = new THREE.Sprite(new THREE.SpriteMaterial({
        map: bokehTex,
        color: rngBg() > 0.6 ? new THREE.Color('#ff8c00') : primary,
        transparent: true, opacity: 0.025 + rngBg() * 0.035,
        depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      bk.position.set((rngBg()-0.5)*400, (rngBg()-0.5)*340, -80 - rngBg()*80);
      bk.scale.setScalar(60 + rngBg() * 90);
      scene.add(bk);
    }

    // ── Animate ───────────────────────────────────────────────────────────────
    const t0 = performance.now();
    let frameId = 0;
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const elapsed = (performance.now() - t0) / 1000;
      const speed   = prefersReducedMotion ? 0.15 : 1;

      globe.rotation.y += 0.002 * speed;
      globe.rotation.x  = -0.06 + Math.sin(elapsed * 0.16) * 0.012;

      atmosphereMat.uniforms.time.value = elapsed;
      scanMat.uniforms.time.value       = elapsed;
      halo.material.opacity = 0.42 + Math.sin(elapsed * 1.0) * 0.08;

      // Arc pulse opacity
      for (const { mat, isWarm, phase } of arcMats) {
        const p = Math.max(0, Math.sin(elapsed * (isWarm ? 2.8 : 1.8) + phase));
        mat.opacity = (isWarm ? 0.18 : 0.1) + p * (isWarm ? 0.32 : 0.22);
      }

      // Data pulses travel along arcs
      arcPaths.forEach((path, i) => {
        const t   = ((elapsed * 0.22 + arcPhases[i]) % 1);
        const idx = Math.min(Math.floor(t * path.length), path.length - 1);
        pulseSprites[i].position.copy(path[idx]);
        pulseSprites[i].material.opacity = Math.sin(t * Math.PI) * 0.85;
      });

      // City pulse rings
      for (const { mesh, phase, speed: s, maxOp } of pulseRings) {
        const t = ((elapsed * s + phase) % (Math.PI * 2)) / (Math.PI * 2);
        mesh.scale.setScalar(1 + t * 6);
        mesh.material.opacity = maxOp * (1 - t) * (1 - t);
      }

      renderer.render(scene, camera);
    };
    animate();

    const obs = new ResizeObserver(() => {
      const w = Math.max(1, mount.clientWidth);
      const h = Math.max(1, mount.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    obs.observe(mount);

    return () => {
      cancelAnimationFrame(frameId);
      obs.disconnect();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        const mat = obj.material;
        if (Array.isArray(mat)) mat.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
        else if (mat) { if (mat.map) mat.map.dispose(); mat.dispose(); }
      });
      renderer.dispose();
    };
  }, [primaryColor, binaryAccentColor]);

  return (
    <div
      ref={mountRef}
      className={className}
      style={{ cursor: 'default', userSelect: 'none', touchAction: 'none' }}
    />
  );
}
