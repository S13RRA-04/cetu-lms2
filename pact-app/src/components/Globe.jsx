import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/* ── exact constants from the Creative Tim globe.js ── */
const GLOBE_RADIUS = 100;
const FLAT_W       = 4098 / 2;   // 2049
const FLAT_H       = 1968 / 2;   // 984
const POINTS_URL   = 'https://raw.githubusercontent.com/creativetimofficial/public-assets/master/soft-ui-dashboard-pro/assets/js/points.json';

/* exact conversion from globe.js */
function flatToSphere(x, y) {
  let lat = ((x - FLAT_W) / FLAT_W) * -180;
  let lon = ((y - FLAT_H) / FLAT_H) * -90;
  lat = (lat * Math.PI) / 180;
  lon = (lon * Math.PI) / 180;
  const r = Math.cos(lon) * GLOBE_RADIUS;
  return {
    x: Math.cos(lat) * r,
    y: Math.sin(lon) * GLOBE_RADIUS,
    z: Math.sin(lat) * r,
  };
}

export default function Globe({ className = '' }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    let raf;
    let renderer;

    fetch(POINTS_URL)
      .then((r) => r.json())
      .then(({ points }) => {
        if (!mountRef.current) return; // unmounted while fetching
        const W = el.clientWidth;
        const H = el.clientHeight;

        /* ── scene ── */
        const scene = new THREE.Scene();

        /* ── camera — same FOV and z as original ── */
        const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 2000);
        camera.position.z = -265;
        camera.lookAt(0, 0, 0);

        /* ── renderer (alpha so page bg shows through) ── */
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(W, H);
        renderer.setClearColor(0x000000, 0);
        el.appendChild(renderer.domElement);

        /* ── build continent dots from geographic data ──
           Original used THREE.Geometry (removed in r125).
           We use BufferGeometry + Points for the same visual. */
        const positions = [];
        for (const pt of points) {
          const { x, y, z } = flatToSphere(pt.x, pt.y);
          if (x && y && z) {
            positions.push(x, y, z);
          }
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(positions, 3),
        );

        const mat = new THREE.PointsMaterial({
          color:           0x8392ab,   /* matches the #989db5 from original */
          size:            1.0,
          sizeAttenuation: true,
          transparent:     true,
          opacity:         0.9,
        });

        const globeMesh = new THREE.Points(geo, mat);
        scene.add(globeMesh);

        /* ── drag rotation (replaces OrbitControls) ── */
        let dragging = false;
        let prev = { x: 0, y: 0 };
        let velX = 0, velY = 0;

        const onDown = (e) => {
          dragging = true; velX = 0; velY = 0;
          const s = e.touches ? e.touches[0] : e;
          prev = { x: s.clientX, y: s.clientY };
        };
        const onUp = () => { dragging = false; };
        const onMove = (e) => {
          if (!dragging) return;
          const s  = e.touches ? e.touches[0] : e;
          velX = (s.clientX - prev.x) * 0.006;
          velY = (s.clientY - prev.y) * 0.006;
          globeMesh.rotation.y += velX;
          globeMesh.rotation.x += velY;
          prev = { x: s.clientX, y: s.clientY };
        };

        el.addEventListener('mousedown',  onDown);
        el.addEventListener('mouseup',    onUp);
        el.addEventListener('mouseleave', onUp);
        el.addEventListener('mousemove',  onMove);
        el.addEventListener('touchstart', onDown, { passive: true });
        el.addEventListener('touchend',   onUp);
        el.addEventListener('touchmove',  onMove, { passive: true });

        /* ── animate ── */
        const animate = () => {
          raf = requestAnimationFrame(animate);
          if (!dragging) {
            globeMesh.rotation.y += 0.0015;
            velX *= 0.9;
            velY *= 0.9;
          }
          renderer.render(scene, camera);
        };
        animate();

        /* ── resize ── */
        const ro = new ResizeObserver(() => {
          const nw = el.clientWidth, nh = el.clientHeight;
          camera.aspect = nw / nh;
          camera.updateProjectionMatrix();
          renderer.setSize(nw, nh);
        });
        ro.observe(el);

        /* store cleanup refs on el so return() can reach them */
        el._globeCleanup = () => {
          cancelAnimationFrame(raf);
          ro.disconnect();
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
      .catch(() => { /* silently ignore if offline */ });

    return () => {
      cancelAnimationFrame(raf);
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
