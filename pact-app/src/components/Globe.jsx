import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/* ── constants matching Creative Tim globe.js exactly ── */
const GLOBE_R    = 100;
const FLAT_W     = 4098 / 2;   // 2049
const FLAT_H     = 1968 / 2;   // 984
const ORBIT_R    = 118;
const POINTS_URL = 'https://raw.githubusercontent.com/creativetimofficial/public-assets/master/soft-ui-dashboard-pro/assets/js/points.json';

/* exact projection from globe.js */
function flatToSphere(px, py) {
  let lat = ((px - FLAT_W) / FLAT_W) * -180;
  let lon = ((py - FLAT_H) / FLAT_H) * -90;
  lat = (lat * Math.PI) / 180;
  lon = (lon * Math.PI) / 180;
  const r = Math.cos(lon) * GLOBE_R;
  return new THREE.Vector3(
    Math.cos(lat) * r,
    Math.sin(lon) * GLOBE_R,
    Math.sin(lat) * r,
  );
}

/* random point on globe surface */
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

/* great-circle arc (local space, for things inside globeGroup) */
function makeArc(a, b, lift = 10, segs = 60) {
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const p = a.clone().lerp(b, t).normalize();
    pts.push(p.multiplyScalar(GLOBE_R + lift * Math.sin(Math.PI * t)));
  }
  return pts;
}

/* satellite orbital position in world space */
function satPos(t, incl, lan, r = ORBIT_R) {
  const ci = Math.cos(incl), si = Math.sin(incl);
  const cl = Math.cos(lan),  sl = Math.sin(lan);
  // circle in XY plane
  const px = r * Math.cos(t), py = r * Math.sin(t);
  // tilt around Z
  const qx = px, qy = py * ci, qz = py * si;
  // rotate around Y (LAN)
  return new THREE.Vector3(
    qx * cl + qz * sl,
    qy,
    -qx * sl + qz * cl,
  );
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

        /* camera at +z looking toward origin (standard THREE.js — no lookAt needed) */
        const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 2000);
        camera.position.z = 265;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(W, H);
        renderer.setClearColor(0x000000, 0);
        el.appendChild(renderer.domElement);

        /* globeGroup rotates with drag/autorotate — satellites stay in world space */
        const globeGroup = new THREE.Group();
        scene.add(globeGroup);

        /* ═══ 1. CONTINENTAL DOTS (from real geographic data) ═══ */
        const pos = [];
        for (const pt of points) {
          const v = flatToSphere(pt.x, pt.y);
          if (v.x || v.y || v.z) pos.push(v.x, v.y, v.z);
        }
        const dotGeo = new THREE.BufferGeometry();
        dotGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        globeGroup.add(new THREE.Points(dotGeo, new THREE.PointsMaterial({
          color:           0x8392ab,
          size:            1.8,
          sizeAttenuation: true,
          transparent:     true,
          opacity:         0.88,
        })));

        /* ═══ 2. CIRCUIT ARCS + SPARKS (inside globeGroup, rotate with globe) ═══ */
        const CIRCUIT_COUNT = 10;
        const circuits = [];

        for (let i = 0; i < CIRCUIT_COUNT; i++) {
          const a = rndSurface();
          const b = rndSurface();
          const arcPts = makeArc(a, b, 6 + Math.random() * 10);

          /* static faint trace line */
          const traceGeo = new THREE.BufferGeometry().setFromPoints(arcPts);
          const traceMat = new THREE.LineBasicMaterial({
            color: 0x2563eb, transparent: true, opacity: 0.14,
          });
          globeGroup.add(new THREE.Line(traceGeo, traceMat));

          /* node dots at endpoints */
          [a, b].forEach((endPt) => {
            const ng = new THREE.SphereGeometry(1.4, 6, 6);
            const nm = new THREE.MeshBasicMaterial({
              color: 0x2563eb, transparent: true, opacity: 0.35,
            });
            const n = new THREE.Mesh(ng, nm);
            n.position.copy(endPt);
            globeGroup.add(n);
          });

          /* traveling spark (inside globeGroup so it rotates with globe) */
          const sparkGeo = new THREE.SphereGeometry(1.8, 6, 6);
          const sparkMat = new THREE.MeshBasicMaterial({
            color: 0x67b2ff, transparent: true, opacity: 0,
          });
          const spark = new THREE.Mesh(sparkGeo, sparkMat);
          globeGroup.add(spark);

          /* glow halo around spark */
          const haloGeo = new THREE.SphereGeometry(3.5, 6, 6);
          const haloMat = new THREE.MeshBasicMaterial({
            color: 0x2563eb, transparent: true, opacity: 0,
          });
          const halo = new THREE.Mesh(haloGeo, haloMat);
          globeGroup.add(halo);

          circuits.push({
            pts:   arcPts,
            spark, halo,
            t:     Math.random(),
            speed: 0.004 + Math.random() * 0.005,
            phase: Math.random() * Math.PI * 2,
          });
        }

        /* ═══ 3. SATELLITE ORBITS + DOTS (world space — don't rotate with globe) ═══ */
        const SAT_DEFS = [
          { incl: 0.48,  lan: 0,    speed: 0.011, t: 0 },
          { incl: -0.38, lan: 2.1,  speed: 0.007, t: 2.0 },
          { incl: 1.15,  lan: 3.7,  speed: 0.016, t: 4.5 },
        ];

        const sats = SAT_DEFS.map((def) => {
          /* orbit ring */
          const rPts = [];
          for (let i = 0; i <= 128; i++) {
            rPts.push(satPos((i / 128) * Math.PI * 2, def.incl, def.lan));
          }
          const rGeo = new THREE.BufferGeometry().setFromPoints(rPts);
          const rMat = new THREE.LineBasicMaterial({
            color: 0x2563eb, transparent: true, opacity: 0.2,
          });
          scene.add(new THREE.Line(rGeo, rMat));

          /* satellite body */
          const sGeo = new THREE.SphereGeometry(2.2, 8, 8);
          const sMat = new THREE.MeshBasicMaterial({ color: 0x67b2ff });
          const body = new THREE.Mesh(sGeo, sMat);
          scene.add(body);

          /* trail (5 fading dots) */
          const TRAIL = 5;
          const trail = Array.from({ length: TRAIL }, (_, j) => {
            const tg = new THREE.SphereGeometry(1.6 - j * 0.22, 6, 6);
            const tm = new THREE.MeshBasicMaterial({
              color: 0x67b2ff, transparent: true, opacity: (TRAIL - j) / TRAIL * 0.45,
            });
            const m = new THREE.Mesh(tg, tm);
            scene.add(m);
            return m;
          });

          return { ...def, body, trail };
        });

        /* ═══ DRAG ═══ */
        let dragging = false, prev = { x: 0, y: 0 }, velX = 0, velY = 0;
        const onDown = (e) => {
          dragging = true; velX = 0; velY = 0;
          const s = e.touches ? e.touches[0] : e;
          prev = { x: s.clientX, y: s.clientY };
        };
        const onUp   = () => { dragging = false; };
        const onMove = (e) => {
          if (!dragging) return;
          const s = e.touches ? e.touches[0] : e;
          velX = (s.clientX - prev.x) * 0.006;
          velY = (s.clientY - prev.y) * 0.006;
          globeGroup.rotation.y += velX;
          globeGroup.rotation.x += velY;
          prev = { x: s.clientX, y: s.clientY };
        };
        el.addEventListener('mousedown',  onDown);
        el.addEventListener('mouseup',    onUp);
        el.addEventListener('mouseleave', onUp);
        el.addEventListener('mousemove',  onMove);
        el.addEventListener('touchstart', onDown, { passive: true });
        el.addEventListener('touchend',   onUp);
        el.addEventListener('touchmove',  onMove, { passive: true });

        /* ═══ ANIMATION LOOP ═══ */
        const clock = new THREE.Clock();
        const animate = () => {
          rafId = requestAnimationFrame(animate);
          const elapsed = clock.getElapsedTime();

          /* auto-rotate */
          if (!dragging) {
            globeGroup.rotation.y += 0.0015;
            velX *= 0.92; velY *= 0.92;
          }

          /* update matrix so we can convert local → world for sparks */
          globeGroup.updateMatrixWorld(true);

          /* circuit sparks */
          circuits.forEach((c) => {
            c.t = (c.t + c.speed) % 1;
            const idx = Math.floor(c.t * (c.pts.length - 1));
            c.spark.position.copy(c.pts[idx]);
            c.halo.position.copy(c.pts[idx]);
            const pulse = Math.sin(c.t * Math.PI);
            c.spark.material.opacity = pulse * 0.95;
            c.halo.material.opacity  = pulse * 0.25;
          });

          /* satellites */
          sats.forEach((s) => {
            s.t += s.speed;
            s.body.position.copy(satPos(s.t, s.incl, s.lan));
            s.trail.forEach((m, j) => {
              m.position.copy(satPos(s.t - (j + 1) * 0.1, s.incl, s.lan));
            });
          });

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

        el._globeCleanup = () => {
          cancelAnimationFrame(rafId);
          ro.disconnect();
          ['mousedown','mouseup','mouseleave','mousemove',
           'touchstart','touchend','touchmove'].forEach((ev) => {
            el.removeEventListener(ev, onDown);
          });
          el.removeEventListener('mousedown',  onDown);
          el.removeEventListener('mouseup',    onUp);
          el.removeEventListener('mouseleave', onUp);
          el.removeEventListener('mousemove',  onMove);
          el.removeEventListener('touchstart', onDown);
          el.removeEventListener('touchend',   onUp);
          el.removeEventListener('touchmove',  onMove);
          renderer.dispose();
          if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
        };
      })
      .catch(() => {});

    return () => {
      cancelAnimationFrame(rafId);
      if (el._globeCleanup) { el._globeCleanup(); delete el._globeCleanup; }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={className}
      style={{ cursor: 'grab', userSelect: 'none' }}
    />
  );
}
