import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/* ── constants ── */
const GLOBE_R    = 100;
const FLAT_W     = 4098 / 2;
const FLAT_H     = 1968 / 2;
const POINTS_URL = 'https://raw.githubusercontent.com/creativetimofficial/public-assets/master/soft-ui-dashboard-pro/assets/js/points.json';

/* binary rain canvas */
const BIN_W   = 512;
const BIN_H   = 256;
const CHAR_W  = 7;
const CHAR_H  = 9;
const COLS    = Math.floor(BIN_W / CHAR_W);  // 73
const ROWS    = Math.floor(BIN_H / CHAR_H);  // 28
const TRAIL   = 9;                            // rows of fade behind drop head

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

        /* ══ 2. CIRCUIT ARCS + SPARKS ════════════════════════════════════════ */
        const circuits = [];
        for (let i = 0; i < 10; i++) {
          const a = rndSurface(), b = rndSurface();
          const arcPts = makeArc(a, b, 6 + Math.random() * 10);

          const traceGeo = new THREE.BufferGeometry().setFromPoints(arcPts);
          globeGroup.add(new THREE.Line(traceGeo,
            new THREE.LineBasicMaterial({ color: 0x2563eb, transparent: true, opacity: 0.14 })));

          [a, b].forEach((ep) => {
            const m = new THREE.Mesh(
              new THREE.SphereGeometry(1.4, 6, 6),
              new THREE.MeshBasicMaterial({ color: 0x2563eb, transparent: true, opacity: 0.35 }),
            );
            m.position.copy(ep);
            globeGroup.add(m);
          });

          const spark = new THREE.Mesh(
            new THREE.SphereGeometry(1.8, 6, 6),
            new THREE.MeshBasicMaterial({ color: 0x67b2ff, transparent: true, opacity: 0 }),
          );
          const halo = new THREE.Mesh(
            new THREE.SphereGeometry(3.5, 6, 6),
            new THREE.MeshBasicMaterial({ color: 0x2563eb, transparent: true, opacity: 0 }),
          );
          globeGroup.add(spark);
          globeGroup.add(halo);
          circuits.push({ pts: arcPts, spark, halo, t: Math.random(), speed: 0.004 + Math.random() * 0.005 });
        }

        /* ══ 3. BINARY RAIN WAVE ═════════════════════════════════════════════ */

        /* canvas texture on a sphere slightly above the globe */
        const bCanvas = document.createElement('canvas');
        bCanvas.width  = BIN_W;
        bCanvas.height = BIN_H;
        const bCtx = bCanvas.getContext('2d');
        bCtx.font         = `${CHAR_H - 1}px 'Courier New', monospace`;
        bCtx.textBaseline = 'top';
        const bTex = new THREE.CanvasTexture(bCanvas);

        const bSphere = new THREE.Mesh(
          new THREE.SphereGeometry(GLOBE_R + 0.8, 64, 32),
          new THREE.MeshBasicMaterial({
            map:         bTex,
            transparent: true,
            depthWrite:  false,
            blending:    THREE.AdditiveBlending,
          })
        );
        globeGroup.add(bSphere);

        /* per-column rain state */
        const col = Array.from({ length: COLS }, () => ({
          chars:  Array.from({ length: ROWS }, () => (Math.random() < 0.5 ? '1' : '0')),
          drops:  [],     // { y: float }
          alpha:  0,
        }));

        /* wave fronts — U position (0‥1) sweeping across canvas */
        const waves = [
          { u: 0.05,  speed: 0.00055, hw: 0.09 },
          { u: 0.42,  speed: 0.00032, hw: 0.12 },
          { u: 0.73,  speed: 0.00078, hw: 0.07 },
        ];

        const drawBinaryRain = (dt) => {
          /* ── update wave U positions ── */
          for (const w of waves) w.u = (w.u + w.speed) % 1;

          /* ── per-column logic ── */
          for (let c = 0; c < COLS; c++) {
            const u = c / COLS;
            let maxInfl = 0;
            for (const w of waves) {
              let d = Math.abs(u - w.u);
              if (d > 0.5) d = 1 - d;
              const infl = Math.max(0, 1 - d / w.hw);
              if (infl > maxInfl) maxInfl = infl;
            }

            const st = col[c];
            const targetAlpha = maxInfl > 0.15 ? Math.min(1, maxInfl * 1.4) : 0;

            /* spawn a new drop when wave arrives */
            if (maxInfl > 0.3 && st.drops.length === 0) {
              st.drops.push({ y: -(Math.random() * ROWS * 0.4) });
            }
            if (maxInfl > 0.5 && st.drops.length < 2 && Math.random() < 0.04) {
              st.drops.push({ y: -(Math.random() * ROWS * 0.3) });
            }

            /* advance drops (vary speed by column so they look independent) */
            const dropSpeed = 14 + (c % 7) * 1.5;
            st.drops = st.drops
              .map((d) => ({ y: d.y + dropSpeed * dt }))
              .filter((d) => d.y < ROWS + TRAIL + 2);

            /* fade column alpha toward target */
            st.alpha += (targetAlpha - st.alpha) * Math.min(1, dt * 4);
            if (st.alpha < 0.005) st.alpha = 0;

            /* randomly mutate active chars */
            if (st.alpha > 0.05 && Math.random() < st.alpha * 0.15) {
              const r = Math.floor(Math.random() * ROWS);
              st.chars[r] = Math.random() < 0.5 ? '1' : '0';
            }
          }

          /* ── draw canvas ── */
          bCtx.clearRect(0, 0, BIN_W, BIN_H);

          for (let c = 0; c < COLS; c++) {
            const st = col[c];
            if (st.alpha < 0.005) continue;

            for (let r = 0; r < ROWS; r++) {
              /* find how this row relates to active drops */
              let headAlpha = 0, trailAlpha = 0;

              for (const d of st.drops) {
                const headRow = d.y;
                if (headRow < 0) continue;
                const rel = headRow - r; // positive = head is below this row (trail above)

                if (rel >= 0 && rel < 1.5) {
                  /* head position — bright white */
                  headAlpha = Math.max(headAlpha, 1.0 - rel * 0.4);
                } else if (rel >= 0 && rel < TRAIL) {
                  /* trail — fading blue */
                  trailAlpha = Math.max(trailAlpha, (1 - rel / TRAIL) * 0.75);
                }
              }

              let rC = 96, gC = 165, bC = 250, a = 0; // default blue

              if (headAlpha > 0) {
                /* bright white-blue head */
                a = headAlpha * st.alpha;
                rC = Math.round(96  + headAlpha * (224 - 96));
                gC = Math.round(165 + headAlpha * (242 - 165));
                bC = Math.round(250 + headAlpha * (254 - 250));
              } else if (trailAlpha > 0) {
                a = trailAlpha * st.alpha;
              } else if (st.alpha > 0.1) {
                /* very faint ambient char */
                a = st.alpha * 0.06;
                rC = 148; gC = 163; bC = 184;
              }

              if (a < 0.008) continue;
              bCtx.fillStyle = `rgba(${rC},${gC},${bC},${a.toFixed(3)})`;
              bCtx.fillText(st.chars[r], c * CHAR_W, r * CHAR_H);
            }
          }

          bTex.needsUpdate = true;
        };

        /* ══ DRAG INTERACTION ════════════════════════════════════════════════ */
        let dragging = false, prev = { x: 0, y: 0 }, velX = 0, velY = 0;
        const onDown = (e) => {
          dragging = true; velX = 0; velY = 0;
          const s = e.touches ? e.touches[0] : e;
          prev = { x: s.clientX, y: s.clientY };
          e.currentTarget.style.cursor = 'grabbing';
        };
        const onUp = (e) => {
          dragging = false;
          if (e.currentTarget) e.currentTarget.style.cursor = 'grab';
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
        const canvas = renderer.domElement;
        canvas.addEventListener('mousedown',  onDown);
        canvas.addEventListener('mouseup',    onUp);
        canvas.addEventListener('mouseleave', onUp);
        canvas.addEventListener('mousemove',  onMove);
        canvas.addEventListener('touchstart', onDown, { passive: true });
        canvas.addEventListener('touchend',   onUp);
        canvas.addEventListener('touchmove',  onMove, { passive: true });

        /* ══ ANIMATION LOOP ══════════════════════════════════════════════════ */
        const clock = new THREE.Clock();
        let lastT = 0;

        const animate = () => {
          rafId = requestAnimationFrame(animate);
          const elapsed = clock.getElapsedTime();
          const dt      = elapsed - lastT;
          lastT         = elapsed;

          if (!dragging) {
            globeGroup.rotation.y += 0.0015;
            velX *= 0.92; velY *= 0.92;
          } else {
            /* momentum on release */
            globeGroup.rotation.y += velX * 0.1;
          }

          globeGroup.updateMatrixWorld(true);

          /* circuit sparks */
          circuits.forEach((c) => {
            c.t = (c.t + c.speed) % 1;
            const idx   = Math.floor(c.t * (c.pts.length - 1));
            const pulse = Math.sin(c.t * Math.PI);
            c.spark.position.copy(c.pts[idx]);
            c.halo.position.copy(c.pts[idx]);
            c.spark.material.opacity = pulse * 0.95;
            c.halo.material.opacity  = pulse * 0.25;
          });

          /* binary rain */
          drawBinaryRain(Math.min(dt, 0.05)); // clamp dt to avoid jumps

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
