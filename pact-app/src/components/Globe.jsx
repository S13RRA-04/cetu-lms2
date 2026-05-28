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
const JET_COUNT = 7;
const JET_PATH_SEGS = 96;
const JET_TRAIL_SEGS = 26;

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
        for (let i = 0; i < 10; i++) {
          const a = rndSurface(), b = rndSurface();
          const arcPts = makeArc(a, b, 6 + Math.random() * 10);
          const mat = new THREE.LineBasicMaterial({ color: liveColor(), transparent: true, opacity: 0.12 });
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
        const respawnJet = (jet, initial = false) => {
          jet.points = makeArc(rndSurface(), rndSurface(), 14 + Math.random() * 18, JET_PATH_SEGS);
          jet.progress = initial ? Math.random() * 1.35 - 0.25 : -Math.random() * 1.75;
          jet.speed = 0.11 + Math.random() * 0.16;
          jet.trail = 0.12 + Math.random() * 0.08;
          jet.line.material.color.copy(rgbColor(binaryColorRef.current));
          jet.head.material.color.copy(rgbColor(binaryColorRef.current));
          jet.line.material.opacity = 0;
          jet.head.material.opacity = 0;
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

          const head = new THREE.Sprite(new THREE.SpriteMaterial({
            map: jetTexture,
            color: rgbColor(binaryColorRef.current),
            transparent: true,
            opacity: 0,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          }));
          head.scale.set(9, 9, 1);

          globeGroup.add(line);
          globeGroup.add(head);

          const jet = { line, head, positions, points: [], progress: 0, speed: 0, trail: 0 };
          respawnJet(jet, true);
          jets.push(jet);
        }

        let lastJetPaint = `${binaryColorRef.current.r},${binaryColorRef.current.g},${binaryColorRef.current.b}`;
        const updateJets = (dt) => {
          const colorKey = `${binaryColorRef.current.r},${binaryColorRef.current.g},${binaryColorRef.current.b}`;
          if (colorKey !== lastJetPaint) {
            paintJetTexture();
            for (const jet of jets) {
              jet.line.material.color.copy(rgbColor(binaryColorRef.current));
              jet.head.material.color.copy(rgbColor(binaryColorRef.current));
            }
            lastJetPaint = colorKey;
          }

          for (const jet of jets) {
            jet.progress += jet.speed * dt;
            if (jet.progress > 1 + jet.trail + 0.22) {
              respawnJet(jet);
              continue;
            }

            const fadeIn = Math.max(0, Math.min(1, jet.progress / 0.16));
            const fadeOut = Math.max(0, Math.min(1, (1 + jet.trail - jet.progress) / 0.22));
            const alpha = Math.min(fadeIn, fadeOut);
            const visible = alpha > 0.01 && jet.progress > 0;
            jet.line.visible = visible;
            jet.head.visible = visible;
            if (!visible) continue;

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
            jet.line.material.opacity = 0.18 + alpha * 0.44;

            const headPoint = samplePoints(jet.points, jet.progress);
            jet.head.position.copy(headPoint);
            const pulse = 0.5 + 0.5 * Math.sin(jet.progress * Math.PI * 20);
            jet.head.material.opacity = 0.48 + alpha * (0.34 + pulse * 0.18);
            const headScale = 7 + alpha * (5 + pulse * 3);
            jet.head.scale.set(headScale, headScale, 1);
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
                  const a   = 1.0 - behind * 0.4;
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
                  const a  = Math.pow(1 - behind / S_TRAIL, 1.8) * 0.95;
                  bCtx.fillStyle = `rgba(${cr},${cg},${cb},${a.toFixed(3)})`;
                  bCtx.fillText(ch, c * CHAR_W, r * CHAR_H);
                }
                drawn = true;
                break;
              }

              if (!drawn) {
                /* ambient wave glow — dim squad color */
                const ambientA = cInfl[c] * 0.10;
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
