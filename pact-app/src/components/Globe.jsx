import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/* ── constants ── */
const GLOBE_R    = 100;
const FLAT_W     = 4098 / 2;
const FLAT_H     = 1968 / 2;
const POINTS_URL = 'https://raw.githubusercontent.com/creativetimofficial/public-assets/master/soft-ui-dashboard-pro/assets/js/points.json';

/* binary canvas — larger canvas = smaller apparent chars on globe */
const BIN_W   = 1280;
const BIN_H   = 640;
const CHAR_W  = 7;
const CHAR_H  = 9;
const COLS    = Math.floor(BIN_W  / CHAR_W);   // 182
const ROWS    = Math.floor(BIN_H  / CHAR_H);   // 71
const S_TRAIL = 18;                             // columns of fade behind each spark
const HOVER_THRESHOLD = 3.4;
const JET_COUNT = 12;
const JET_PATH_SEGS = 96;
const JET_TRAIL_SEGS = 42;
const CIRCUIT_BENDS = 9;
const CIRCUIT_STUB_SEGS = 4;
const CIRCUIT_TRACE_PIECES = 96;
const TRACE_DASH_SEGMENTS = 4;
const TRACE_RADIUS = 1.15;
const STUB_RADIUS = 0.72;
const NETWORK_PULSE_COUNT = 18;

const NETWORK_NODES = [
  { name: 'washington', lat: 38.9, lon: -77.0, size: 1.45 },
  { name: 'san-diego', lat: 32.7, lon: -117.2, size: 1.05 },
  { name: 'london', lat: 51.5, lon: -0.1, size: 1.35 },
  { name: 'brussels', lat: 50.8, lon: 4.4, size: 0.95 },
  { name: 'kyiv', lat: 50.4, lon: 30.5, size: 1.0 },
  { name: 'dubai', lat: 25.2, lon: 55.3, size: 1.05 },
  { name: 'singapore', lat: 1.35, lon: 103.8, size: 1.25 },
  { name: 'tokyo', lat: 35.7, lon: 139.7, size: 1.2 },
  { name: 'sydney', lat: -33.9, lon: 151.2, size: 0.95 },
  { name: 'sao-paulo', lat: -23.5, lon: -46.6, size: 1.0 },
  { name: 'johannesburg', lat: -26.2, lon: 28.0, size: 0.9 },
  { name: 'nairobi', lat: -1.3, lon: 36.8, size: 0.85 },
];

const NETWORK_LINKS = [
  [0, 2], [0, 9], [0, 1], [2, 3], [2, 4], [2, 5],
  [5, 6], [6, 7], [6, 8], [5, 10], [10, 11], [11, 5],
  [7, 0], [3, 6], [9, 10],
];

/* geographic projection */
function flatToSphere(px, py) {
  let lat = ((px - FLAT_W) / FLAT_W) * -180;
  let lon = ((py - FLAT_H) / FLAT_H) * -90;
  lat = (lat * Math.PI) / 180;
  lon = (lon * Math.PI) / 180;
  const r = Math.cos(lon) * GLOBE_R;
  return new THREE.Vector3(Math.cos(lat) * r, Math.sin(lon) * GLOBE_R, Math.sin(lat) * r);
}
function rndSurface(radius = GLOBE_R) {
  const u = Math.random(), v = Math.random();
  const th = 2 * Math.PI * u;
  const ph = Math.acos(2 * v - 1);
  return new THREE.Vector3(
    radius * Math.sin(ph) * Math.cos(th),
    radius * Math.sin(ph) * Math.sin(th),
    radius * Math.cos(ph),
  );
}
function makeArc(a, b, lift = 10, segs = 60) {
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    pts.push(a.clone().lerp(b, t).normalize().multiplyScalar(GLOBE_R + lift * Math.sin(Math.PI * t)));
  }
  return pts;
}

function circuitPoint(lon, lat, radius = GLOBE_R + 5.5) {
  return new THREE.Vector3(
    Math.cos(lat) * Math.cos(lon) * radius,
    Math.sin(lat) * radius,
    Math.cos(lat) * Math.sin(lon) * radius,
  );
}

function geoPoint(latDeg, lonDeg, radius = GLOBE_R + 4.5) {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  return circuitPoint(lon, lat, radius);
}

function makeGreatCircleArc(a, b, lift = 10, segs = 72) {
  const pts = [];
  const na = a.clone().normalize();
  const nb = b.clone().normalize();
  const omega = Math.acos(Math.max(-1, Math.min(1, na.dot(nb))));
  const sinOmega = Math.sin(omega);

  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    let p;
    if (sinOmega < 0.001) {
      p = na.clone().lerp(nb, t).normalize();
    } else {
      const s0 = Math.sin((1 - t) * omega) / sinOmega;
      const s1 = Math.sin(t * omega) / sinOmega;
      p = na.clone().multiplyScalar(s0).add(nb.clone().multiplyScalar(s1)).normalize();
    }
    pts.push(p.multiplyScalar(GLOBE_R + 3 + lift * Math.sin(Math.PI * t)));
  }

  return pts;
}

function makeCircuitPath(segs = JET_PATH_SEGS) {
  const coords = [];
  const current = {
    lon: Math.random() * Math.PI * 2 - Math.PI,
    lat: (Math.random() * 0.78 - 0.39),
  };
  const primaryAxis = Math.random() < 0.5 ? 'lon' : 'lat';
  const primarySign = Math.random() < 0.5 ? -1 : 1;
  const secondarySign = Math.random() < 0.5 ? -1 : 1;
  const primaryStep = 0.15 + Math.random() * 0.08;
  const secondaryStep = 0.07 + Math.random() * 0.045;
  const jogEvery = 3 + Math.floor(Math.random() * 2);

  const pushCoord = () => coords.push({ lon: current.lon, lat: current.lat });

  pushCoord();

  for (let i = 1; i <= CIRCUIT_BENDS; i++) {
    const isJog = i % jogEvery === 0;
    const axis = isJog ? (primaryAxis === 'lon' ? 'lat' : 'lon') : primaryAxis;
    const sign = isJog ? secondarySign : primarySign;
    const step = (isJog ? secondaryStep : primaryStep) * (0.78 + Math.random() * 0.36);
    current[axis] += sign * step;

    if (current.lat > 0.78) current.lat = 0.78;
    if (current.lat < -0.78) current.lat = -0.78;
    if (current.lon > Math.PI) current.lon -= Math.PI * 2;
    if (current.lon < -Math.PI) current.lon += Math.PI * 2;

    if (i > 2 && !isJog && Math.random() < 0.12) {
      const jogAxis = axis === 'lon' ? 'lat' : 'lon';
      current[jogAxis] += secondarySign * secondaryStep * 0.35;
      if (current.lat > 0.78) current.lat = 0.78;
      if (current.lat < -0.78) current.lat = -0.78;
    }

    pushCoord();
  }

  const pts = [];
  const perLeg = Math.max(4, Math.floor(segs / (coords.length - 1)));
  for (let i = 0; i < coords.length - 1; i++) {
    const from = coords[i];
    const to = coords[i + 1];
    const axis = Math.abs(to.lon - from.lon) > Math.abs(to.lat - from.lat) ? 'lon' : 'lat';
    for (let s = 0; s < perLeg; s++) {
      const t = s / perLeg;
      const lon = axis === 'lon' ? from.lon + (to.lon - from.lon) * t : from.lon;
      const lat = axis === 'lat' ? from.lat + (to.lat - from.lat) * t : from.lat;
      pts.push(circuitPoint(lon, lat));
    }
  }
  pts.push(circuitPoint(coords[coords.length - 1].lon, coords[coords.length - 1].lat));

  const bends = coords.slice(1, -1).map((coord, idx) => {
    const point = circuitPoint(coord.lon, coord.lat);
    const next = coords[idx + 2];
    const prev = coords[idx];
    const nextAxis = Math.abs(next.lon - coord.lon) > Math.abs(next.lat - coord.lat) ? 'lon' : 'lat';
    const prevAxis = Math.abs(coord.lon - prev.lon) > Math.abs(coord.lat - prev.lat) ? 'lon' : 'lat';
    const stubAxis = nextAxis === prevAxis ? (nextAxis === 'lon' ? 'lat' : 'lon') : (idx % 2 ? 'lon' : 'lat');
    const stubSign = idx % 2 ? -1 : 1;
    const stubDelta = 0.055 + Math.random() * 0.035;

    const stub = [];
    for (let s = 0; s <= CIRCUIT_STUB_SEGS; s++) {
      const t = s / CIRCUIT_STUB_SEGS;
      const lon = stubAxis === 'lon' ? coord.lon + stubSign * stubDelta * t : coord.lon;
      const lat = stubAxis === 'lat' ? Math.max(-0.8, Math.min(0.8, coord.lat + stubSign * stubDelta * t)) : coord.lat;
      stub.push(circuitPoint(lon, lat, GLOBE_R + 6.3));
    }

    return { point, stub };
  });

  const segments = [];
  for (let i = 0; i < pts.length - 1; i++) {
    segments.push({ start: pts[i], end: pts[i + 1] });
  }

  return { points: pts, segments, bends, pads: [pts[0], pts[pts.length - 1]] };
}

function samplePoints(points, t) {
  const clamped = Math.max(0, Math.min(1, t));
  const scaled = clamped * (points.length - 1);
  const idx = Math.floor(scaled);
  const next = Math.min(points.length - 1, idx + 1);
  return points[idx].clone().lerp(points[next], scaled - idx);
}

function rgbColor({ r, g, b }) {
  return new THREE.Color(r / 255, g / 255, b / 255);
}

function traceRgb({ r, g, b }) {
  return {
    r: Math.round(r * 0.42),
    g: Math.round(g * 0.42),
    b: Math.round(b * 0.42),
  };
}

function setLinePoint(line, idx, point) {
  const attr = line.geometry.attributes.position;
  attr.setXYZ(idx, point.x, point.y, point.z);
  attr.needsUpdate = true;
}

function placeCylinderBetween(mesh, start, end, radius) {
  const mid = start.clone().lerp(end, 0.5);
  const dir = end.clone().sub(start);
  const len = dir.length();
  if (len <= 0.001) {
    mesh.visible = false;
    return;
  }

  mesh.position.copy(mid);
  mesh.scale.set(radius, len, radius);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
}

function intervalOverlap(a0, a1, b0, b1) {
  return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
}

function wrappedOverlap(segStart, segEnd, activeStart, activeEnd) {
  if (activeStart >= 0 && activeEnd <= 1) return intervalOverlap(segStart, segEnd, activeStart, activeEnd);
  if (activeStart < 0) {
    return intervalOverlap(segStart, segEnd, activeStart + 1, 1) + intervalOverlap(segStart, segEnd, 0, activeEnd);
  }
  return intervalOverlap(segStart, segEnd, activeStart, 1) + intervalOverlap(segStart, segEnd, 0, activeEnd - 1);
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) };
}

function rgbToHsl({ r, g, b }) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  switch (max) {
    case rn: h = (gn - bn) / d + (gn < bn ? 6 : 0); break;
    case gn: h = (bn - rn) / d + 2; break;
    default: h = (rn - gn) / d + 4;
  }
  return { h: h * 60, s, l };
}

function hslToRgb({ h, s, l }) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rp = 0, gp = 0, bp = 0;

  if (h < 60) [rp, gp, bp] = [c, x, 0];
  else if (h < 120) [rp, gp, bp] = [x, c, 0];
  else if (h < 180) [rp, gp, bp] = [0, c, x];
  else if (h < 240) [rp, gp, bp] = [0, x, c];
  else if (h < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];

  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  };
}

function binaryAccentRgb(rgb) {
  const hsl = rgbToHsl(rgb);
  const accent = hslToRgb({
    h: (hsl.h + 165) % 360,
    s: Math.min(1, Math.max(0.72, hsl.s * 0.9)),
    l: hsl.l > 0.72 ? 0.42 : 0.62,
  });

  return {
    r: Math.round(accent.r * 0.78 + 255 * 0.22),
    g: Math.round(accent.g * 0.78 + 255 * 0.22),
    b: Math.round(accent.b * 0.78 + 255 * 0.22),
  };
}

export default function Globe({ className = '', primaryColor = '#00b0ff', binaryAccentColor = null }) {
  const mountRef   = useRef(null);
  const colorRef    = useRef(hexToRgb(primaryColor));
  const binaryColorRef = useRef(binaryAccentColor ? hexToRgb(binaryAccentColor) : binaryAccentRgb(colorRef.current));
  const arcMatsRef  = useRef([]);
  const dotMatRef   = useRef(null);
  const glowRedraw  = useRef(null);   // fn({ r,g,b }) → repaints glow canvas

  /* update color ref + Three.js materials whenever the squad changes */
  useEffect(() => {
    colorRef.current = hexToRgb(primaryColor);
    const tc = new THREE.Color(primaryColor);
    for (const mat of arcMatsRef.current) mat.color.copy(tc);
    if (dotMatRef.current) dotMatRef.current.color.copy(tc);
    if (glowRedraw.current) glowRedraw.current(colorRef.current);
    binaryColorRef.current = binaryAccentColor ? hexToRgb(binaryAccentColor) : binaryAccentRgb(colorRef.current);
  }, [primaryColor, binaryAccentColor]);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    let rafId;

    fetch(POINTS_URL)
      .then((r) => r.json())
      .then(({ points }) => {
        if (!mountRef.current) return;

        const W = el.clientWidth, H = el.clientHeight;
        const scene  = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 2000);
        camera.position.z = 265;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(W, H);
        renderer.setClearColor(0x000000, 0);
        el.appendChild(renderer.domElement);

        const globeGroup = new THREE.Group();
        scene.add(globeGroup);

        /* Use colorRef so the correct squad color applies even if enrollment
           loaded before this fetch callback fires (avoids stale-closure race). */
        const liveColor = () => {
          const { r, g, b } = colorRef.current;
          return new THREE.Color(r / 255, g / 255, b / 255);
        };

        /* ══ 0. SOFT HALO (billboard sprite with radial gradient canvas) ══════
           Fades to transparent on both the inner and outer edges — no hard lines. */
        {
          const GS = 256;
          const gc = document.createElement('canvas');
          gc.width = gc.height = GS;
          const gCtx = gc.getContext('2d');
          const glowTex = new THREE.CanvasTexture(gc);

          const paintGlow = ({ r, g, b }) => {
            gCtx.clearRect(0, 0, GS, GS);
            const grad = gCtx.createRadialGradient(GS/2, GS/2, GS * 0.36, GS/2, GS/2, GS/2);
            grad.addColorStop(0,    `rgba(${r},${g},${b},0)`);
            grad.addColorStop(0.45, `rgba(${r},${g},${b},0.10)`);
            grad.addColorStop(0.70, `rgba(${r},${g},${b},0.04)`);
            grad.addColorStop(1,    `rgba(${r},${g},${b},0)`);
            gCtx.fillStyle = grad;
            gCtx.fillRect(0, 0, GS, GS);
            glowTex.needsUpdate = true;
          };

          paintGlow(colorRef.current);
          glowRedraw.current = paintGlow;

          const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
            map: glowTex,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false,
          }));
          glowSprite.scale.set(GLOBE_R * 2.8, GLOBE_R * 2.8, 1);
          scene.add(glowSprite);
        }

        /* ══ 1. CONTINENTAL DOTS ══════════════════════════════════════════════ */
        const pos = [];
        for (const pt of points) {
          const v = flatToSphere(pt.x, pt.y);
          if (v.x || v.y || v.z) pos.push(v.x, v.y, v.z);
        }
        const dotGeo = new THREE.BufferGeometry();
        dotGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        dotMatRef.current = new THREE.PointsMaterial({
          color: liveColor(), size: 1.8, sizeAttenuation: true, transparent: true, opacity: 0.45,
        });
        const dotPoints = new THREE.Points(dotGeo, dotMatRef.current);
        globeGroup.add(dotPoints);

        const hoverGroup = new THREE.Group();
        hoverGroup.visible = false;
        const hoverCoreMat = new THREE.MeshBasicMaterial({
          color: liveColor(),
          transparent: true,
          opacity: 0.95,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const hoverCore = new THREE.Mesh(new THREE.SphereGeometry(1.45, 16, 16), hoverCoreMat);
        hoverGroup.add(hoverCore);

        const hoverCanvas = document.createElement('canvas');
        hoverCanvas.width = hoverCanvas.height = 96;
        const hoverCtx = hoverCanvas.getContext('2d');
        const hoverTexture = new THREE.CanvasTexture(hoverCanvas);
        const paintHoverGlow = () => {
          const { r, g, b } = colorRef.current;
          hoverCtx.clearRect(0, 0, 96, 96);
          const grad = hoverCtx.createRadialGradient(48, 48, 3, 48, 48, 48);
          grad.addColorStop(0, `rgba(255,255,255,0.92)`);
          grad.addColorStop(0.28, `rgba(${r},${g},${b},0.62)`);
          grad.addColorStop(0.72, `rgba(${r},${g},${b},0.18)`);
          grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
          hoverCtx.fillStyle = grad;
          hoverCtx.fillRect(0, 0, 96, 96);
          hoverTexture.needsUpdate = true;
        };
        paintHoverGlow();

        const hoverGlow = new THREE.Sprite(new THREE.SpriteMaterial({
          map: hoverTexture,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }));
        hoverGlow.scale.set(11, 11, 1);
        hoverGroup.add(hoverGlow);
        globeGroup.add(hoverGroup);

        const raycaster = new THREE.Raycaster();
        raycaster.params.Points.threshold = HOVER_THRESHOLD;
        const pointer = new THREE.Vector2();
        let hoveredPointIndex = -1;
        let lastHoverPaint = primaryColor;

        const setHoverFromEvent = (e) => {
          const rect = canvas.getBoundingClientRect();
          pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(pointer, camera);
          const hit = raycaster.intersectObject(dotPoints, false)[0];

          if (!hit) {
            hoveredPointIndex = -1;
            hoverGroup.visible = false;
            canvas.style.cursor = dragging ? 'grabbing' : 'grab';
            return;
          }

          const idx = hit.index ?? -1;
          if (idx !== hoveredPointIndex) {
            hoveredPointIndex = idx;
            const attr = dotGeo.getAttribute('position');
            hoverGroup.position.set(attr.getX(idx), attr.getY(idx), attr.getZ(idx));
          }
          hoverGroup.visible = true;
          canvas.style.cursor = dragging ? 'grabbing' : 'pointer';
        };

        /* ══ 2. CIRCUIT ARCS (static, no traveling dots) ════════════════════ */
        arcMatsRef.current = [];
        for (let i = 0; i < 5; i++) {
          const a = rndSurface(), b = rndSurface();
          const arcPts = makeArc(a, b, 6 + Math.random() * 10);
          const mat = new THREE.LineBasicMaterial({ color: liveColor(), transparent: true, opacity: 0.035 });
          arcMatsRef.current.push(mat);
          globeGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(arcPts), mat));
        }

        const jetCanvas = document.createElement('canvas');
        jetCanvas.width = jetCanvas.height = 96;
        const jetCtx = jetCanvas.getContext('2d');
        const jetTexture = new THREE.CanvasTexture(jetCanvas);
        const paintJetTexture = () => {
          const { r, g, b } = binaryColorRef.current;
          jetCtx.clearRect(0, 0, 96, 96);
          const grad = jetCtx.createRadialGradient(48, 48, 2, 48, 48, 48);
          grad.addColorStop(0, 'rgba(255,255,255,0.95)');
          grad.addColorStop(0.24, `rgba(${r},${g},${b},0.86)`);
          grad.addColorStop(0.64, `rgba(${r},${g},${b},0.22)`);
          grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
          jetCtx.fillStyle = grad;
          jetCtx.fillRect(0, 0, 96, 96);
          jetTexture.needsUpdate = true;
        };
        paintJetTexture();

        const jets = [];
        const traceGeo = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true);
        const respawnJet = (jet, initial = false) => {
          const circuit = makeCircuitPath(JET_PATH_SEGS);
          jet.points = circuit.points;
          jet.segments = circuit.segments;
          jet.bends = circuit.bends;
          jet.pads = circuit.pads;
          jet.showPads = Math.random() < 0.72;
          jet.progress = initial ? Math.random() : 0;
          jet.speed = 0.032 + Math.random() * 0.036;
          jet.trail = 0.26 + Math.random() * 0.08;
          jet.line.material.color.copy(rgbColor(binaryColorRef.current));
          jet.head.material.color.copy(rgbColor(binaryColorRef.current));
          jet.line.material.opacity = 0;
          jet.head.material.opacity = 0;
          for (let i = 0; i < jet.tracePieces.length; i++) {
            const piece = jet.tracePieces[i];
            const segment = jet.segments[i];
            if (!segment) {
              piece.visible = false;
              continue;
            }
            placeCylinderBetween(piece, segment.start, segment.end, TRACE_RADIUS);
            piece.material.color.copy(rgbColor(traceRgb(binaryColorRef.current)));
            piece.material.opacity = 0;
            piece.visible = false;
          }
          for (const dash of jet.dashLines) {
            dash.visible = false;
            dash.material.color.copy(rgbColor(binaryColorRef.current));
            dash.material.opacity = 0;
          }
          for (const node of jet.nodes) {
            node.visible = false;
            node.material.color.copy(rgbColor(binaryColorRef.current));
          }
          for (const stub of jet.stubs) {
            stub.visible = false;
            stub.material.color.copy(rgbColor(binaryColorRef.current));
            stub.material.opacity = 0;
          }
          for (let i = 0; i < jet.stubPieces.length; i++) {
            const piece = jet.stubPieces[i];
            const bend = jet.bends[i];
            if (!bend) {
              piece.visible = false;
              continue;
            }
            placeCylinderBetween(piece, bend.stub[0], bend.stub[bend.stub.length - 1], STUB_RADIUS);
            piece.material.color.copy(rgbColor(traceRgb(binaryColorRef.current)));
            piece.material.opacity = 0;
            piece.visible = false;
          }
          for (const pad of jet.padSprites) {
            pad.visible = false;
            pad.material.color.copy(rgbColor(binaryColorRef.current));
            pad.material.opacity = 0;
          }
        };

        for (let i = 0; i < JET_COUNT; i++) {
          const positions = new Float32Array((JET_TRAIL_SEGS + 1) * 3);
          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

          const line = new THREE.Line(
            geo,
            new THREE.LineBasicMaterial({
              color: rgbColor(binaryColorRef.current),
              transparent: true,
              opacity: 0,
              depthWrite: false,
              blending: THREE.AdditiveBlending,
            }),
          );

          const tracePieces = Array.from({ length: CIRCUIT_TRACE_PIECES }, () => {
            const piece = new THREE.Mesh(
              traceGeo,
              new THREE.MeshBasicMaterial({
                color: rgbColor(traceRgb(binaryColorRef.current)),
                transparent: true,
                opacity: 0,
                depthWrite: false,
              }),
            );
            piece.visible = false;
            globeGroup.add(piece);
            return piece;
          });

          const dashLines = Array.from({ length: TRACE_DASH_SEGMENTS }, () => {
            const dashGeo = new THREE.BufferGeometry();
            dashGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
            const dash = new THREE.Line(
              dashGeo,
              new THREE.LineBasicMaterial({
                color: rgbColor(traceRgb(binaryColorRef.current)),
                transparent: true,
                opacity: 0,
                depthWrite: false,
              }),
            );
            dash.visible = false;
            globeGroup.add(dash);
            return dash;
          });

          const head = new THREE.Sprite(new THREE.SpriteMaterial({
            map: jetTexture,
            color: rgbColor(binaryColorRef.current),
            transparent: true,
            opacity: 0,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          }));
          head.scale.set(9, 9, 1);

          const nodes = Array.from({ length: CIRCUIT_BENDS - 1 }, () => {
            const node = new THREE.Sprite(new THREE.SpriteMaterial({
              map: jetTexture,
              color: rgbColor(binaryColorRef.current),
              transparent: true,
              opacity: 0,
              depthWrite: false,
              blending: THREE.AdditiveBlending,
            }));
            node.scale.set(5, 5, 1);
            node.visible = false;
            globeGroup.add(node);
            return node;
          });

          const stubs = Array.from({ length: CIRCUIT_BENDS - 1 }, () => {
            const positions = new Float32Array((CIRCUIT_STUB_SEGS + 1) * 3);
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            const stub = new THREE.Line(
              geo,
              new THREE.LineBasicMaterial({
                color: rgbColor(binaryColorRef.current),
                transparent: true,
                opacity: 0,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
              }),
            );
            stub.visible = false;
            globeGroup.add(stub);
            return stub;
          });

          const stubPieces = Array.from({ length: CIRCUIT_BENDS - 1 }, () => {
            const piece = new THREE.Mesh(
              traceGeo,
              new THREE.MeshBasicMaterial({
                color: rgbColor(binaryColorRef.current),
                transparent: true,
                opacity: 0,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
              }),
            );
            piece.visible = false;
            globeGroup.add(piece);
            return piece;
          });

          const padSprites = Array.from({ length: 2 }, () => {
            const pad = new THREE.Sprite(new THREE.SpriteMaterial({
              map: jetTexture,
              color: rgbColor(binaryColorRef.current),
              transparent: true,
              opacity: 0,
              depthWrite: false,
              blending: THREE.AdditiveBlending,
            }));
            pad.scale.set(4.5, 4.5, 1);
            pad.visible = false;
            globeGroup.add(pad);
            return pad;
          });

          globeGroup.add(line);
          globeGroup.add(head);

          const jet = {
            line,
            tracePieces,
            dashLines,
            head,
            nodes,
            stubs,
            stubPieces,
            padSprites,
            positions,
            points: [],
            segments: [],
            bends: [],
            pads: [],
            showPads: false,
            progress: 0,
            speed: 0,
            trail: 0,
          };
          respawnJet(jet, true);
          jets.push(jet);
        }

        const networkGroup = new THREE.Group();
        globeGroup.add(networkGroup);

        const networkNodes = NETWORK_NODES.map((node) => {
          const position = geoPoint(node.lat, node.lon);
          const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
            map: jetTexture,
            color: rgbColor(binaryColorRef.current),
            transparent: true,
            opacity: 0.74,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          }));
          sprite.position.copy(position);
          sprite.scale.set(10 * node.size, 10 * node.size, 1);
          networkGroup.add(sprite);

          const core = new THREE.Mesh(
            new THREE.SphereGeometry(0.95 * node.size, 12, 12),
            new THREE.MeshBasicMaterial({
              color: rgbColor(traceRgb(binaryColorRef.current)),
              transparent: true,
              opacity: 0.82,
              depthWrite: false,
            }),
          );
          core.position.copy(position);
          networkGroup.add(core);

          return { ...node, position, sprite, core };
        });

        const networkLinks = NETWORK_LINKS.map(([from, to], index) => {
          const start = networkNodes[from].position;
          const end = networkNodes[to].position;
          const points = makeGreatCircleArc(start, end, 7 + (index % 4) * 1.8, 80);
          const line = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(points),
            new THREE.LineBasicMaterial({
              color: rgbColor(traceRgb(binaryColorRef.current)),
              transparent: true,
              opacity: 0.22,
              depthWrite: false,
            }),
          );
          networkGroup.add(line);
          return { from, to, points, line };
        });

        const networkPulses = Array.from({ length: NETWORK_PULSE_COUNT }, (_, index) => {
          const link = networkLinks[index % networkLinks.length];
          const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
            map: jetTexture,
            color: rgbColor(binaryColorRef.current),
            transparent: true,
            opacity: 0,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          }));
          sprite.scale.set(7.5, 7.5, 1);
          networkGroup.add(sprite);
          return {
            sprite,
            linkIndex: index % networkLinks.length,
            progress: Math.random(),
            speed: 0.045 + Math.random() * 0.055,
          };
        });

        const updateNetwork = (elapsed, dt) => {
          const accentColor = rgbColor(binaryColorRef.current);
          const traceColor = rgbColor(traceRgb(binaryColorRef.current));

          for (const node of networkNodes) {
            const dim = depthFade(node.position);
            const pulse = 0.5 + 0.5 * Math.sin(elapsed * 2.1 + node.lon * 0.07);
            node.sprite.material.color.copy(accentColor);
            node.sprite.material.opacity = (0.32 + pulse * 0.42) * dim;
            node.core.material.color.copy(traceColor);
            node.core.material.opacity = (0.42 + pulse * 0.24) * dim;
          }

          for (const link of networkLinks) {
            const mid = link.points[Math.floor(link.points.length / 2)];
            const dim = depthFade(mid);
            link.line.material.color.copy(traceColor);
            link.line.material.opacity = 0.11 + dim * 0.18;
          }

          for (const pulse of networkPulses) {
            pulse.progress += pulse.speed * dt;
            if (pulse.progress > 1) {
              pulse.progress = 0;
              pulse.linkIndex = Math.floor(Math.random() * networkLinks.length);
              pulse.speed = 0.045 + Math.random() * 0.055;
            }

            const link = networkLinks[pulse.linkIndex];
            const p = samplePoints(link.points, pulse.progress);
            const dim = depthFade(p);
            const flash = 0.72 + 0.28 * Math.sin(elapsed * 8 + pulse.linkIndex);
            pulse.sprite.position.copy(p);
            pulse.sprite.material.color.copy(accentColor);
            pulse.sprite.material.opacity = flash * dim;
            const scale = 6.5 + flash * 4;
            pulse.sprite.scale.set(scale, scale, 1);
          }
        };

        let lastJetPaint = `${binaryColorRef.current.r},${binaryColorRef.current.g},${binaryColorRef.current.b}`;
        const depthScratch = new THREE.Vector3();
        const depthFade = (point) => {
          depthScratch.copy(point).applyEuler(globeGroup.rotation);
          const facing = depthScratch.z / GLOBE_R;
          return Math.max(0.18, Math.min(1, 0.55 + facing * 0.45));
        };

        const updateJets = (dt) => {
          const colorKey = `${binaryColorRef.current.r},${binaryColorRef.current.g},${binaryColorRef.current.b}`;
          if (colorKey !== lastJetPaint) {
            paintJetTexture();
            for (const jet of jets) {
              jet.line.material.color.copy(rgbColor(binaryColorRef.current));
              for (const piece of jet.tracePieces) piece.material.color.copy(rgbColor(traceRgb(binaryColorRef.current)));
              for (const dash of jet.dashLines) dash.material.color.copy(rgbColor(binaryColorRef.current));
              jet.head.material.color.copy(rgbColor(binaryColorRef.current));
              for (const node of jet.nodes) node.material.color.copy(rgbColor(binaryColorRef.current));
              for (const stub of jet.stubs) stub.material.color.copy(rgbColor(binaryColorRef.current));
              for (const piece of jet.stubPieces) piece.material.color.copy(rgbColor(traceRgb(binaryColorRef.current)));
              for (const pad of jet.padSprites) pad.material.color.copy(rgbColor(binaryColorRef.current));
            }
            lastJetPaint = colorKey;
          }

          for (const jet of jets) {
            if (networkLinks.length) {
              jet.line.visible = false;
              jet.head.visible = false;
              for (const piece of jet.tracePieces) piece.visible = false;
              for (const dash of jet.dashLines) dash.visible = false;
              for (const node of jet.nodes) node.visible = false;
              for (const stub of jet.stubs) stub.visible = false;
              for (const piece of jet.stubPieces) piece.visible = false;
              for (const pad of jet.padSprites) pad.visible = false;
              continue;
            }

            jet.progress = (jet.progress + jet.speed * dt) % 1;
            const alpha = 1;
            const visible = true;
            jet.line.visible = false;
            jet.head.visible = visible;
            for (const piece of jet.tracePieces) piece.visible = false;
            for (const dash of jet.dashLines) dash.visible = false;
            for (const node of jet.nodes) node.visible = false;
            for (const stub of jet.stubs) stub.visible = false;
            for (const piece of jet.stubPieces) piece.visible = false;
            for (const pad of jet.padSprites) pad.visible = false;
            if (!visible) continue;

            const activeStart = jet.progress - jet.trail;
            const activeEnd = jet.progress;
            for (let i = 0; i < jet.tracePieces.length; i++) {
              const piece = jet.tracePieces[i];
              const segment = jet.segments[i];
              if (!segment) continue;
              const segStart = i / Math.max(1, jet.segments.length);
              const segEnd = (i + 1) / Math.max(1, jet.segments.length);
              const dim = depthFade(segment.end);
              piece.visible = true;
              const overlap = wrappedOverlap(segStart, segEnd, activeStart, activeEnd) / (segEnd - segStart);
              piece.material.opacity = Math.min(0.95, (0.16 + overlap * 0.74) * dim);
            }

            if (jet.showPads) {
              for (let p = 0; p < jet.padSprites.length; p++) {
                const pad = jet.padSprites[p];
                const padAlpha = p === 0
                  ? 0.42 + 0.46 * Math.max(0, 1 - Math.abs(jet.progress - 0.04) / 0.18)
                  : 0.42 + 0.46 * Math.max(0, 1 - Math.abs(jet.progress - 0.96) / 0.18);
                const dim = depthFade(jet.pads[p]);
                pad.visible = true;
                pad.position.copy(jet.pads[p]);
                pad.material.opacity = (0.22 + padAlpha * 0.46) * dim;
                const padPulse = 0.5 + 0.5 * Math.sin((jet.progress * 12 + p) * Math.PI);
                const padScale = 4.2 + padAlpha * (2.6 + padPulse * 1.4);
                pad.scale.set(padScale, padScale, 1);
              }
            }

            for (let s = 0; s <= JET_TRAIL_SEGS; s++) {
              const trailT = s / JET_TRAIL_SEGS;
              const t = jet.progress - jet.trail * (1 - trailT);
              const p = samplePoints(jet.points, t);
              const o = s * 3;
              jet.positions[o] = p.x;
              jet.positions[o + 1] = p.y;
              jet.positions[o + 2] = p.z;
            }
            jet.line.geometry.attributes.position.needsUpdate = true;

            const headPoint = samplePoints(jet.points, jet.progress);
            const headDim = depthFade(headPoint);
            jet.line.material.opacity = (0.12 + alpha * 0.18) * headDim;

            for (let d = 0; d < jet.dashLines.length; d++) {
              const dash = jet.dashLines[d];
              const dashHead = jet.progress - d * jet.trail * 0.19;
              const dashTail = dashHead - jet.trail * 0.075;
              if (dashTail < 0 || dashHead > 1 + jet.trail) continue;

              const p0 = samplePoints(jet.points, dashTail);
              const p1 = samplePoints(jet.points, dashHead);
              setLinePoint(dash, 0, p0);
              setLinePoint(dash, 1, p1);
              dash.visible = true;
              dash.material.opacity = (0.26 + alpha * 0.46) * depthFade(p1);
            }

            jet.head.position.copy(headPoint);
            const pulse = 0.5 + 0.5 * Math.sin(jet.progress * Math.PI * 20);
            jet.head.material.opacity = (0.48 + alpha * (0.34 + pulse * 0.18)) * headDim;
            const headScale = 7 + alpha * (5 + pulse * 3);
            jet.head.scale.set(headScale, headScale, 1);

            for (let n = 0; n < jet.bends.length; n++) {
              const node = jet.nodes[n];
              const stub = jet.stubs[n];
              const stubPiece = jet.stubPieces[n];
              if (!node) continue;
              const bendProgress = (n + 1) / (jet.bends.length + 1);
              let wake = Math.abs(jet.progress - bendProgress);
              wake = Math.min(wake, 1 - wake);
              const nodeAlpha = 0.18 + Math.max(0, 1 - wake / 0.2) * 0.72;
              const dim = depthFade(jet.bends[n].point);
              node.visible = true;
              node.position.copy(jet.bends[n].point);
              node.material.opacity = (0.22 + nodeAlpha * 0.62) * dim;
              const nodePulse = 0.5 + 0.5 * Math.sin((wake * 18 + n) * Math.PI);
              const nodeScale = 4 + nodeAlpha * (5 + nodePulse * 3);
              node.scale.set(nodeScale, nodeScale, 1);

              if (stub) {
                stub.visible = false;
                const attr = stub.geometry.attributes.position;
                for (let s = 0; s < jet.bends[n].stub.length; s++) {
                  const p = jet.bends[n].stub[s];
                  attr.setXYZ(s, p.x, p.y, p.z);
                }
                attr.needsUpdate = true;
                stub.material.opacity = nodeAlpha * 0.72 * dim;
              }

              if (stubPiece) {
                stubPiece.visible = true;
                stubPiece.material.opacity = Math.min(0.9, nodeAlpha * 0.82 * dim);
              }
            }
          }
        };

        /* ══ 3. HORIZONTAL BINARY WAVE ═══════════════════════════════════════
           Wave fronts sweep left-to-right (U direction = longitude).
           Each passing wave spawns horizontal sparks in every row that fly
           outward from the wave front, temporarily replacing the dot field.
        ════════════════════════════════════════════════════════════════════════ */

        const bCanvas = document.createElement('canvas');
        bCanvas.width = BIN_W; bCanvas.height = BIN_H;
        const bCtx = bCanvas.getContext('2d');
        bCtx.font = `8px 'Courier New', monospace`;
        bCtx.textBaseline = 'top';
        const bTex = new THREE.CanvasTexture(bCanvas);

        globeGroup.add(new THREE.Mesh(
          new THREE.SphereGeometry(GLOBE_R + 0.8, 64, 32),
          new THREE.MeshBasicMaterial({
            map: bTex, transparent: true, depthWrite: false,
            blending: THREE.AdditiveBlending,
          }),
        ));

        /* wave fronts: U position 0..1 sweeping left-to-right */
        const waves = [
          { u: 0.05,  speed: 0.00018, hw: 0.08 },
          { u: 0.40,  speed: 0.00011, hw: 0.11 },
          { u: 0.72,  speed: 0.00026, hw: 0.06 },
        ];

        /* per-row spark state (horizontal sparks, not vertical drops) */
        const rowState = Array.from({ length: ROWS }, () => ({
          chars:  Array.from({ length: COLS }, () => (Math.random() < 0.5 ? '1' : '0')),
          sparks: [],   // { x: col (float), dir: +1/-1, speed: cols/sec }
        }));

        /* pre-computed per-column influence (reused each frame) */
        const cInfl = new Float32Array(COLS);

        const drawBinary = (dt) => {
          /* advance waves */
          for (const w of waves) w.u = (w.u + w.speed) % 1;

          /* compute per-column influence */
          for (let c = 0; c < COLS; c++) {
            const u = c / COLS;
            let mx = 0;
            for (const w of waves) {
              let d = Math.abs(u - w.u);
              if (d > 0.5) d = 1 - d;
              const iv = Math.max(0, 1 - d / w.hw);
              if (iv > mx) mx = iv;
            }
            cInfl[c] = mx;
          }

          /* spawn horizontal sparks where wave is strong */
          for (let c = 0; c < COLS; c += 3) {
            if (cInfl[c] < 0.35) continue;
            const spawnP = cInfl[c] * dt * 5;
            for (let r = 0; r < ROWS; r++) {
              if (Math.random() > spawnP) continue;
              const st = rowState[r];
              if (st.sparks.length >= 4) continue;
              /* sparks fly both directions from the wave front */
              const dir = Math.random() < 0.55 ? 1 : -1;
              st.sparks.push({
                x:           c,
                dir,
                speed:       7 + Math.random() * 9,
                headChar:    Math.random() < 0.5 ? '1' : '0',
                charHistory: [],
              });
            }
          }

          /* ── draw ── */
          bCtx.clearRect(0, 0, BIN_W, BIN_H);
          const { r: pr, g: pg, b: pb } = colorRef.current;
          const { r: cr, g: cg, b: cb } = binaryColorRef.current;

          for (let r = 0; r < ROWS; r++) {
            const st = rowState[r];

            /* advance sparks — track column crossings for char inheritance */
            for (const s of st.sparks) {
              const prevCol = Math.floor(s.x);
              s.x += s.dir * s.speed * dt;
              const newCol  = Math.floor(s.x);
              const crossed = s.dir > 0 ? newCol - prevCol : prevCol - newCol;
              for (let i = 0; i < crossed; i++) {
                s.charHistory.unshift(s.headChar);
                if (s.charHistory.length > S_TRAIL) s.charHistory.length = S_TRAIL;
                s.headChar = Math.random() < 0.5 ? '1' : '0';
              }
            }
            st.sparks = st.sparks.filter((s) => s.x >= -S_TRAIL && s.x < COLS + S_TRAIL);

            /* randomly mutate a char */
            if (Math.random() < 0.025) {
              st.chars[Math.floor(Math.random() * COLS)] = Math.random() < 0.5 ? '1' : '0';
            }

            const hasActivity = st.sparks.length > 0;
            let maxWave = 0;
            for (let c = 0; c < COLS; c++) if (cInfl[c] > maxWave) maxWave = cInfl[c];
            if (!hasActivity && maxWave < 0.08) continue;

            for (let c = 0; c < COLS; c++) {
              let drawn = false;

              for (const s of st.sparks) {
                const behind = s.dir > 0 ? s.x - c : c - s.x;
                if (behind < 0 || behind >= S_TRAIL) continue;

                if (behind < 1.5) {
                  /* head — brightened toward white with a tint of the squad color */
                  const a   = (1.0 - behind * 0.4) * 0.58;
                  const mix = 0.55 + a * 0.3;
                  const hR  = Math.min(255, Math.round(cr + (255 - cr) * mix));
                  const hG  = Math.min(255, Math.round(cg + (255 - cg) * mix));
                  const hB  = Math.min(255, Math.round(cb + (255 - cb) * mix));
                  bCtx.fillStyle = `rgba(${hR},${hG},${hB},${a.toFixed(3)})`;
                  bCtx.fillText(s.headChar, c * CHAR_W, r * CHAR_H);
                } else {
                  /* trail — squad primary color with fade */
                  const trailIdx = Math.floor(behind) - 1;
                  const ch = s.charHistory[trailIdx] ?? s.headChar;
                  const a  = Math.pow(1 - behind / S_TRAIL, 1.8) * 0.36;
                  bCtx.fillStyle = `rgba(${cr},${cg},${cb},${a.toFixed(3)})`;
                  bCtx.fillText(ch, c * CHAR_W, r * CHAR_H);
                }
                drawn = true;
                break;
              }

              if (!drawn) {
                /* ambient wave glow — dim squad color */
                const ambientA = cInfl[c] * 0.045;
                if (ambientA > 0.008) {
                  const primaryWash = 0.25;
                  const aR = Math.round(cr * (1 - primaryWash) + pr * primaryWash);
                  const aG = Math.round(cg * (1 - primaryWash) + pg * primaryWash);
                  const aB = Math.round(cb * (1 - primaryWash) + pb * primaryWash);
                  bCtx.fillStyle = `rgba(${aR},${aG},${aB},${ambientA.toFixed(3)})`;
                  bCtx.fillText(st.chars[c], c * CHAR_W, r * CHAR_H);
                }
              }
            }
          }

          bTex.needsUpdate = true;
        };

        /* ══ DRAG INTERACTION ════════════════════════════════════════════════ */
        let dragging = false, prev = { x: 0, y: 0 }, velX = 0, velY = 0;
        const canvas = renderer.domElement;

        const onDown = (e) => {
          dragging = true; velX = 0; velY = 0;
          const s = e.touches ? e.touches[0] : e;
          prev = { x: s.clientX, y: s.clientY };
          canvas.style.cursor = 'grabbing';
        };
        const onUp = () => {
          dragging = false;
          canvas.style.cursor = hoverGroup.visible ? 'pointer' : 'grab';
        };
        const onMove = (e) => {
          const s = e.touches ? e.touches[0] : e;
          if (!s) return;

          if (!dragging) return;
          velX = (s.clientX - prev.x) * 0.006;
          velY = (s.clientY - prev.y) * 0.006;
          globeGroup.rotation.y += velX;
          globeGroup.rotation.x = Math.max(-1.2, Math.min(1.2, globeGroup.rotation.x + velY));
          prev = { x: s.clientX, y: s.clientY };
        };
        const onPointerMove = (e) => {
          if (e.touches || dragging) return;
          setHoverFromEvent(e);
        };
        const onPointerLeave = () => {
          hoveredPointIndex = -1;
          hoverGroup.visible = false;
          onUp();
        };

        canvas.addEventListener('mousedown',  onDown);
        canvas.addEventListener('mouseup',    onUp);
        canvas.addEventListener('mouseleave', onPointerLeave);
        canvas.addEventListener('mousemove',  onMove);
        canvas.addEventListener('mousemove',  onPointerMove);
        canvas.addEventListener('touchstart', onDown, { passive: true });
        canvas.addEventListener('touchend',   onUp);
        canvas.addEventListener('touchmove',  onMove, { passive: true });

        /* ══ ANIMATION LOOP ══════════════════════════════════════════════════ */
        const clock = new THREE.Clock();
        let lastT  = 0;

        const animate = () => {
          rafId = requestAnimationFrame(animate);
          const elapsed = clock.getElapsedTime();
          const dt = Math.min(elapsed - lastT, 0.05);
          lastT = elapsed;

          /* auto-rotate + momentum decay */
          if (!dragging) {
            globeGroup.rotation.y += 0.0015 + velX;
            velX *= 0.94;
            velY *= 0.94;
            globeGroup.rotation.x = Math.max(-1.2, Math.min(1.2, globeGroup.rotation.x + velY));
          }

          updateNetwork(elapsed, dt);
          updateJets(dt);
          drawBinary(dt);

          if (hoverGroup.visible) {
            const colorKey = `#${colorRef.current.r.toString(16).padStart(2, '0')}${colorRef.current.g.toString(16).padStart(2, '0')}${colorRef.current.b.toString(16).padStart(2, '0')}`;
            if (colorKey !== lastHoverPaint) {
              paintHoverGlow();
              hoverCoreMat.color.copy(liveColor());
              lastHoverPaint = colorKey;
            }
            const pulse = 0.5 + 0.5 * Math.sin(elapsed * 7.5);
            hoverCore.scale.setScalar(1 + pulse * 0.65);
            hoverCoreMat.opacity = 0.72 + pulse * 0.28;
            hoverGlow.material.opacity = 0.48 + pulse * 0.36;
            const haloScale = 10 + pulse * 8;
            hoverGlow.scale.set(haloScale, haloScale, 1);
          }

          renderer.render(scene, camera);
        };
        animate();

        /* resize */
        const ro = new ResizeObserver(() => {
          const nw = el.clientWidth, nh = el.clientHeight;
          camera.aspect = nw / nh;
          camera.updateProjectionMatrix();
          renderer.setSize(nw, nh);
        });
        ro.observe(el);

        el._cleanup = () => {
          cancelAnimationFrame(rafId);
          ro.disconnect();
          canvas.removeEventListener('mousedown',  onDown);
          canvas.removeEventListener('mouseup',    onUp);
          canvas.removeEventListener('mouseleave', onPointerLeave);
          canvas.removeEventListener('mousemove',  onMove);
          canvas.removeEventListener('mousemove',  onPointerMove);
          canvas.removeEventListener('touchstart', onDown);
          canvas.removeEventListener('touchend',   onUp);
          canvas.removeEventListener('touchmove',  onMove);
          renderer.dispose();
          if (el.contains(canvas)) el.removeChild(canvas);
        };
      })
      .catch(() => {});

    return () => {
      cancelAnimationFrame(rafId);
      if (el._cleanup) { el._cleanup(); delete el._cleanup; }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={className}
      style={{ cursor: 'grab', userSelect: 'none', touchAction: 'none' }}
    />
  );
}
