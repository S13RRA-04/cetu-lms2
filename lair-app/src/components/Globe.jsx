import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const GLOBE_RADIUS  = 105;
const POINT_COUNT   = 9000;
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

// Detailed land blobs biased toward eastern hemisphere coasts
// [centerLon, centerLat, radiusLon, radiusLat]
const LAND_BLOBS = [
  [-105, 50, 38, 16], [-80, 38, 30, 15], [-65, -8, 22, 22],

  [-5,  53, 11,  8], [  5, 47, 16, 11], [ 12, 52, 13, 11],
  [ 22, 45, 14, 13], [ 28, 57, 16, 14], [ 37, 55, 13, 11],
  [ 15, 42, 16,  9], [ 26, 38, 12,  7],

  [ 16, 10, 22, 30], [ 33,  2, 18, 24], [ 18,-28, 16, 18],
  [ 37, 15, 18, 20], [  8, 30, 16, 26],

  [ 35, 32, 16, 13], [ 42, 37, 13, 11], [ 44, 32, 12,  9],
  [ 50, 26, 13, 13], [ 44, 16, 10,  9], [ 58, 22, 10,  9],

  [ 62, 42, 18, 14], [ 70, 38, 16, 13], [ 50, 55, 20, 13],

  [ 72, 22, 14,  9], [ 80, 15, 12, 11], [ 80, 28, 16, 11],
  [ 67, 30, 14, 13],

  [105, 20, 22, 18], [108,  8, 16, 14], [120, 28, 16, 18],
  [115, 42, 20, 15], [127, 35, 10, 13], [133, 35,  9, 13],

  [132,-25, 18, 13],
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

// Coastline-biased: bright at land/sea transition, dim and sparse inland
function makeLandPoints(primary, accent) {
  const rng = mulberry32(4404);
  const pos = [], col = [];

  for (let i = 0; i < POINT_COUNT; i++) {
    const u = rng(), v = rng();
    const lon = u * 360 - 180;
    const lat = Math.asin(2 * v - 1) * THREE.MathUtils.RAD2DEG;
    const w   = landWeight(lon, lat);

    if (w < 0.22) continue;

    // Density peaks at the coastline transition zone (w ≈ 0.7–1.4), falls off inland
    const density = w < 0.8
      ? w / 0.8
      : w < 1.5
        ? 1.0
        : Math.exp(-(w - 1.5) / 0.7);

    if (rng() > density * 1.9) continue;

    const p = pointOnSphere(lat, lon, GLOBE_RADIUS + rng() * 1.2);
    pos.push(p.x, p.y, p.z);

    const isCoast = w < 1.5;
    const c = primary.clone().lerp(accent, isCoast ? 0.28 + rng() * 0.44 : 0.08);
    const k = isCoast ? 0.55 + rng() * 0.45 : 0.1 + rng() * 0.15;
    col.push(c.r * k, c.g * k, c.b * k);
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

function makeArc(start, end, lift, segs = 64) {
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
    pts.push(p.multiplyScalar(GLOBE_RADIUS + lift * Math.sin(Math.PI * t)));
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
  g.addColorStop(0.12, `rgba(${c.r|0},${c.g|0},${c.b|0},0.65)`);
  g.addColorStop(0.5,  `rgba(${c.r|0},${c.g|0},${c.b|0},0.18)`);
  g.addColorStop(1,    `rgba(${c.r|0},${c.g|0},${c.b|0},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

// [lat, lon, isHot]
const CITIES = [
  [ 51.5,  -0.1, false], // London
  [ 48.9,   2.3, false], // Paris
  [ 52.5,  13.4, false], // Berlin
  [ 55.8,  37.6, true ], // Moscow
  [ 30.0,  31.2, false], // Cairo
  [ 25.2,  55.3, true ], // Dubai
  [ 35.7,  51.4, true ], // Tehran
  [ 41.0,  29.0, false], // Istanbul
  [ 28.6,  77.2, false], // Delhi
  [  1.3, 103.8, false], // Singapore
  [ 39.9, 116.4, true ], // Beijing
  [ 31.2, 121.5, false], // Shanghai
  [ 35.7, 139.7, false], // Tokyo
  [ 37.6, 127.0, false], // Seoul
  [ -1.3,  36.8, false], // Nairobi
  [ 40.7, -74.0, false], // New York
  [ 50.4,  30.5, true ], // Kyiv
  [ 24.7,  46.7, true ], // Riyadh
  [ 33.9,  35.5, false], // Beirut
  [ 19.1,  72.9, false], // Mumbai
  [-26.2,  28.0, false], // Johannesburg
  [ 59.9,  10.7, false], // Oslo
  [ 53.3,  -6.3, false], // Dublin
  [ 43.7,  51.2, false], // Astana
  [ 23.8,  90.4, false], // Dhaka
  [ 13.5,   2.1, false], // Niamey
];

// [cityA, cityB, isWarm]
const ARCS = [
  [ 0,  3, false], [ 0,  4, false], [ 0, 15, false], [ 0,  1, false],
  [ 0,  2, false], [ 0, 22, false], [ 1,  7, false], [ 2,  7, false],
  [ 2, 16, true ], [ 3, 16, true ], [ 3, 10, true ], [ 3, 23, false],
  [ 4,  5, false], [ 4, 14, false], [ 4, 18, false],
  [ 5,  6, true ], [ 5,  8, false], [ 5, 17, true ], [ 5, 19, false],
  [ 6,  7, true ], [ 6, 17, true ], [ 6,  3, true ],
  [ 7, 16, true ], [ 7, 18, false], [ 7,  4, false],
  [ 8,  9, false], [ 8, 19, false], [ 8, 24, false],
  [ 9, 10, false], [ 9, 11, false], [ 9, 19, false],
  [10, 11, false], [10, 13, false], [10, 23, false],
  [11, 12, false], [12, 13, false], [17, 18, true ],
  [14, 20, false], [14, 25, false], [19, 24, false],
  [ 5,  9, false], [ 3,  7, false], [ 0,  7, false],
  [21, 22, false], [15, 16, false],
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

    const primary = hexToColor('#00b0ff').lerp(hexToColor(primaryColor), 0.22);
    const accent  = hexToColor('#27f5ff').lerp(hexToColor(binaryAccentColor, '#27f5ff'), 0.15);
    const warmClr = new THREE.Color('#ff9500');
    const hotClr  = new THREE.Color('#ff3800');

    const width  = Math.max(1, mount.clientWidth);
    const height = Math.max(1, mount.clientHeight);
    const scene  = new THREE.Scene();

    // Camera: close, angled down — shows the curved horizon at the top of the frame
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1600);
    camera.position.set(0, 32, 295);
    camera.lookAt(0, -42, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // ── Globe group — pushed down so only the upper curved horizon is visible ──
    const globe = new THREE.Group();
    globe.rotation.y = -1.22; // face Europe/Middle East
    globe.rotation.x = -0.06;
    globe.position.y = -62;
    scene.add(globe);

    // Dark sphere base — the "night side" of Earth
    globe.add(new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS * 0.994, 72, 36),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#010c16'), transparent: true, opacity: 0.92 }),
    ));

    // ── Atmosphere — three-layer glowing rim ──────────────────────────────────
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
          float nz   = abs(vNormal.z);
          float wide = pow(1.0 - nz, 1.8) * 0.42;  // wide blue halo
          float scan = smoothstep(0.88,1.0, 0.5+0.5*sin(vWorld.y*0.5+time*3.5)) * 0.03;
          gl_FragColor = vec4(color, wide + scan);
        }`,
    });
    globe.add(new THREE.Mesh(new THREE.SphereGeometry(GLOBE_RADIUS * 1.10, 96, 48), atmosphereMat));

    // Mid glow layer
    globe.add(new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS * 1.05, 96, 48),
      new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { color: { value: accent.clone() } },
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
          }`,
        fragmentShader: `
          uniform vec3 color; varying vec3 vNormal;
          void main() {
            float rim = pow(1.0 - abs(vNormal.z), 3.2);
            gl_FragColor = vec4(color, rim * 0.60);
          }`,
      }),
    ));

    // Bright inner edge — the crisp electric-blue rim line
    globe.add(new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS * 1.015, 96, 48),
      new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { color: { value: new THREE.Color(1, 1, 1).lerp(accent, 0.4) } },
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
          }`,
        fragmentShader: `
          uniform vec3 color; varying vec3 vNormal;
          void main() {
            float rim = pow(1.0 - abs(vNormal.z), 7.5);
            gl_FragColor = vec4(color, min(1.0, rim * 1.4));
          }`,
      }),
    ));

    // Wireframe shell
    globe.add(new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS, 48, 24),
      new THREE.MeshBasicMaterial({
        color: primary, transparent: true, opacity: 0.05,
        wireframe: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }),
    ));

    // ── Coastline-biased land points ──────────────────────────────────────────
    globe.add(new THREE.Points(
      makeLandPoints(primary, accent),
      new THREE.PointsMaterial({
        size: 1.2, vertexColors: true, transparent: true,
        opacity: 0.92, depthWrite: false, blending: THREE.AdditiveBlending,
      }),
    ));

    // ── Lat/lon grid (subtle) ─────────────────────────────────────────────────
    const gridMat = () => new THREE.LineBasicMaterial({
      color: primary, transparent: true, opacity: 0.09,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
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

    // ── Network arcs ──────────────────────────────────────────────────────────
    const rng = mulberry32(7202);
    const arcMats = [];

    for (const [ai, bi, isWarm] of ARCS) {
      const [latA, lonA] = CITIES[ai];
      const [latB, lonB] = CITIES[bi];
      const mat = new THREE.LineBasicMaterial({
        color:       isWarm ? (rng() > 0.5 ? warmClr : hotClr) : primary.clone().lerp(accent, 0.3),
        transparent: true,
        opacity:     0.22 + rng() * 0.22,
        depthWrite:  false,
        blending:    THREE.AdditiveBlending,
      });
      arcMats.push({ mat, isWarm, phase: rng() * Math.PI * 2 });
      globe.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(
          makeArc(
            pointOnSphere(latA, lonA, GLOBE_RADIUS + 1.5),
            pointOnSphere(latB, lonB, GLOBE_RADIUS + 1.5),
            5 + rng() * 10,
          ),
        ),
        mat,
      ));
    }

    // ── City nodes: target-ring markers + pulse rings ─────────────────────────
    const texCyan = makeGlowTex(accent);
    const texWarm = makeGlowTex(warmClr);
    const pulseRings = [];

    for (let ci = 0; ci < CITIES.length; ci++) {
      const [lat, lon, isHot] = CITIES[ci];
      const pos    = pointOnSphere(lat, lon, GLOBE_RADIUS + 2);
      const normal = pos.clone().normalize();
      const color  = isHot ? warmClr : accent;

      // Glow sprite
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: isHot ? texWarm : texCyan, color,
        transparent: true, opacity: isHot ? 1.0 : 0.85,
        depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      sprite.position.copy(pos);
      sprite.scale.setScalar(isHot ? 10 : 6);
      globe.add(sprite);

      // Target ring (static small circle at each city)
      const targetRingGeo = new THREE.RingGeometry(1.2, 1.9, 24);
      const targetRingMat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: isHot ? 0.7 : 0.45,
        side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      const targetRing = new THREE.Mesh(targetRingGeo, targetRingMat);
      targetRing.position.copy(pos);
      targetRing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      globe.add(targetRing);

      // Pulse ring (animated expanding)
      const pulseRingGeo = new THREE.RingGeometry(0.5, 2.0, 28);
      const pulseRingMat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0,
        side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      const pulseRing = new THREE.Mesh(pulseRingGeo, pulseRingMat);
      pulseRing.position.copy(pos);
      pulseRing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      globe.add(pulseRing);
      pulseRings.push({
        mesh:  pulseRing,
        phase: (ci / CITIES.length) * Math.PI * 2,
        speed: isHot ? 1.2 : 0.7,
        maxOp: isHot ? 0.6 : 0.35,
      });
    }

    // ── Scene halo ────────────────────────────────────────────────────────────
    const haloTex = makeGlowTex(primary);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: haloTex, transparent: true, opacity: 0.52,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    halo.position.y = -62;
    halo.scale.setScalar(GLOBE_RADIUS * 4.0);
    scene.add(halo);

    // ── Background: vertical light streaks ────────────────────────────────────
    const rngBg = mulberry32(3311);
    for (let i = 0; i < 32; i++) {
      const x = (rngBg() - 0.5) * 620;
      const z = -100 - rngBg() * 150;
      const y = (rngBg() - 0.5) * 380;
      const h = 60 + rngBg() * 180;
      scene.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(x, y - h / 2, z),
          new THREE.Vector3(x, y + h / 2, z),
        ]),
        new THREE.LineBasicMaterial({
          color: primary, transparent: true,
          opacity: 0.018 + rngBg() * 0.034,
          depthWrite: false, blending: THREE.AdditiveBlending,
        }),
      ));
    }

    // Background: floating particles
    const bgPos = [], bgCol = [];
    for (let i = 0; i < 320; i++) {
      bgPos.push((rngBg() - 0.5) * 560, (rngBg() - 0.5) * 480, -70 - rngBg() * 180);
      const k = 0.035 + rngBg() * 0.1;
      bgCol.push(primary.r * k, primary.g * k, primary.b * k);
    }
    const bgGeo = new THREE.BufferGeometry();
    bgGeo.setAttribute('position', new THREE.Float32BufferAttribute(bgPos, 3));
    bgGeo.setAttribute('color',    new THREE.Float32BufferAttribute(bgCol, 3));
    scene.add(new THREE.Points(bgGeo, new THREE.PointsMaterial({
      size: 1.9, vertexColors: true, transparent: true,
      opacity: 0.72, depthWrite: false, blending: THREE.AdditiveBlending,
    })));

    // Background: bokeh blobs
    const bokehTex = makeGlowTex(primary, 128);
    for (let i = 0; i < 14; i++) {
      const bk = new THREE.Sprite(new THREE.SpriteMaterial({
        map:         bokehTex,
        color:       rngBg() > 0.65 ? new THREE.Color('#ff8c00') : primary,
        transparent: true,
        opacity:     0.022 + rngBg() * 0.038,
        depthWrite:  false,
        blending:    THREE.AdditiveBlending,
      }));
      bk.position.set((rngBg() - 0.5) * 440, (rngBg() - 0.5) * 380, -80 - rngBg() * 90);
      bk.scale.setScalar(60 + rngBg() * 95);
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
      halo.material.opacity = 0.44 + Math.sin(elapsed * 1.0) * 0.08;

      for (const { mat, isWarm, phase } of arcMats) {
        const pulse = Math.max(0, Math.sin(elapsed * (isWarm ? 2.8 : 1.8) + phase));
        mat.opacity = (isWarm ? 0.18 : 0.12) + pulse * (isWarm ? 0.34 : 0.24);
      }

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
