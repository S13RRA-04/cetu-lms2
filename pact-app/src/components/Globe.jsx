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
const CHAR_W  = 4;
const CHAR_H  = 5;
const COLS    = Math.floor(BIN_W  / CHAR_W);   // 320
const ROWS    = Math.floor(BIN_H  / CHAR_H);   // 128
const S_TRAIL = 18;                             // columns of fade behind each spark

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

export default function Globe({ className = '' }) {
  const mountRef = useRef(null);

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

        /* ══ 1. CONTINENTAL DOTS ══════════════════════════════════════════════ */
        const pos = [];
        for (const pt of points) {
          const v = flatToSphere(pt.x, pt.y);
          if (v.x || v.y || v.z) pos.push(v.x, v.y, v.z);
        }
        const dotGeo = new THREE.BufferGeometry();
        dotGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        globeGroup.add(new THREE.Points(dotGeo, new THREE.PointsMaterial({
          color: 0x8392ab, size: 1.8, sizeAttenuation: true, transparent: true, opacity: 0.88,
        })));

        /* ══ 2. CIRCUIT ARCS (static, no traveling dots) ════════════════════ */
        for (let i = 0; i < 10; i++) {
          const a = rndSurface(), b = rndSurface();
          const arcPts = makeArc(a, b, 6 + Math.random() * 10);
          globeGroup.add(new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(arcPts),
            new THREE.LineBasicMaterial({ color: 0x2563eb, transparent: true, opacity: 0.12 }),
          ));
        }

        /* ══ 3. HORIZONTAL BINARY WAVE ═══════════════════════════════════════
           Wave fronts sweep left-to-right (U direction = longitude).
           Each passing wave spawns horizontal sparks in every row that fly
           outward from the wave front, temporarily replacing the dot field.
        ════════════════════════════════════════════════════════════════════════ */

        const bCanvas = document.createElement('canvas');
        bCanvas.width = BIN_W; bCanvas.height = BIN_H;
        const bCtx = bCanvas.getContext('2d');
        bCtx.font = `3px 'Courier New', monospace`;
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
                  /* head — bright white-blue, randomly changing char */
                  const a  = 1.0 - behind * 0.4;
                  const rC = Math.round(200 + a * 55);
                  const gC = Math.round(220 + a * 35);
                  bCtx.fillStyle = `rgba(${rC},${gC},255,${a.toFixed(3)})`;
                  bCtx.fillText(s.headChar, c * CHAR_W, r * CHAR_H);
                } else {
                  /* trail — each slot inherits the char the head showed there */
                  const trailIdx = Math.floor(behind) - 1;
                  const ch = s.charHistory[trailIdx] ?? s.headChar;
                  const a  = Math.pow(1 - behind / S_TRAIL, 1.8) * 0.95;
                  bCtx.fillStyle = `rgba(96,165,250,${a.toFixed(3)})`;
                  bCtx.fillText(ch, c * CHAR_W, r * CHAR_H);
                }
                drawn = true;
                break;
              }

              if (!drawn) {
                /* ambient wave glow */
                const ambientA = cInfl[c] * 0.10;
                if (ambientA > 0.008) {
                  bCtx.fillStyle = `rgba(148,163,184,${ambientA.toFixed(3)})`;
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
          canvas.style.cursor = 'grab';
        };
        const onMove = (e) => {
          if (!dragging) return;
          const s = e.touches ? e.touches[0] : e;
          velX = (s.clientX - prev.x) * 0.006;
          velY = (s.clientY - prev.y) * 0.006;
          globeGroup.rotation.y += velX;
          globeGroup.rotation.x = Math.max(-1.2, Math.min(1.2, globeGroup.rotation.x + velY));
          prev = { x: s.clientX, y: s.clientY };
        };

        canvas.addEventListener('mousedown',  onDown);
        canvas.addEventListener('mouseup',    onUp);
        canvas.addEventListener('mouseleave', onUp);
        canvas.addEventListener('mousemove',  onMove);
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

          drawBinary(dt);
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
          canvas.removeEventListener('mouseleave', onUp);
          canvas.removeEventListener('mousemove',  onMove);
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
