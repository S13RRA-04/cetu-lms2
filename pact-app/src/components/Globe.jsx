import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const DOT_COUNT  = 4000;
const RADIUS     = 1.18;
const COLOR_DOT  = 0x2563eb;
const COLOR_BG   = 0xffffff;

function buildGlobe() {
  const geometry = new THREE.BufferGeometry();
  const positions = [];

  for (let i = 0; i < DOT_COUNT; i++) {
    const phi   = Math.acos(-1 + (2 * i) / DOT_COUNT);
    const theta = Math.sqrt(DOT_COUNT * Math.PI) * phi;
    positions.push(
      RADIUS * Math.cos(theta) * Math.sin(phi),
      RADIUS * Math.sin(theta) * Math.sin(phi),
      RADIUS * Math.cos(phi),
    );
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color:      COLOR_DOT,
    size:       0.028,
    sizeAttenuation: true,
    transparent: true,
    opacity:    0.85,
  });
  return new THREE.Points(geometry, material);
}

export default function Globe({ className = '' }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const w = el.clientWidth;
    const h = el.clientHeight;

    // Scene
    const scene    = new THREE.Scene();
    scene.background = new THREE.Color(COLOR_BG);

    // Camera
    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
    camera.position.z = 3.4;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(w, h);
    el.appendChild(renderer.domElement);

    // Globe dots
    const globe = buildGlobe();
    scene.add(globe);

    // Subtle wireframe overlay
    const wireGeo = new THREE.SphereGeometry(RADIUS - 0.005, 28, 28);
    const wireMat = new THREE.MeshBasicMaterial({
      color:       0x2563eb,
      wireframe:   true,
      transparent: true,
      opacity:     0.06,
    });
    scene.add(new THREE.Mesh(wireGeo, wireMat));

    // Mouse drag for interactivity
    let isDragging  = false;
    let prevMouse   = { x: 0, y: 0 };
    let velX = 0, velY = 0;

    const onDown = (e) => {
      isDragging = true;
      const src = e.touches ? e.touches[0] : e;
      prevMouse = { x: src.clientX, y: src.clientY };
      velX = 0; velY = 0;
    };
    const onUp = () => { isDragging = false; };
    const onMove = (e) => {
      if (!isDragging) return;
      const src = e.touches ? e.touches[0] : e;
      const dx = src.clientX - prevMouse.x;
      const dy = src.clientY - prevMouse.y;
      velX = dx * 0.005;
      velY = dy * 0.005;
      globe.rotation.y += velX;
      globe.rotation.x += velY;
      prevMouse = { x: src.clientX, y: src.clientY };
    };

    el.addEventListener('mousedown',  onDown);
    el.addEventListener('mouseup',    onUp);
    el.addEventListener('mouseleave', onUp);
    el.addEventListener('mousemove',  onMove);
    el.addEventListener('touchstart', onDown, { passive: true });
    el.addEventListener('touchend',   onUp);
    el.addEventListener('touchmove',  onMove, { passive: true });

    // Animation loop
    let raf;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      if (!isDragging) {
        globe.rotation.y += 0.0018;
        velX *= 0.95;
        velY *= 0.95;
      } else {
        velX *= 0.9;
        velY *= 0.9;
      }
      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const onResize = () => {
      const nw = el.clientWidth;
      const nh = el.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(el);

    return () => {
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
  }, []);

  return (
    <div
      ref={mountRef}
      className={className}
      style={{ cursor: 'grab', userSelect: 'none' }}
    />
  );
}
