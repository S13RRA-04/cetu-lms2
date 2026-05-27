import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const R          = 1.6;
const DOT_COUNT  = 5000;
const ARC_COUNT  = 28;
const DOT_COLOR  = new THREE.Color(0x2563eb);
const ARC_COLOR  = new THREE.Color(0x67b2ff);

/* random point on sphere surface */
function randomOnSphere(r = R) {
  const u = Math.random(), v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi   = Math.acos(2 * v - 1);
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi),
  );
}

/* great-circle arc between two sphere points */
function buildArc(a, b, lift = 0.22, segments = 60) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t   = i / segments;
    const pos = new THREE.Vector3().lerpVectors(a, b, t).normalize();
    const h   = R + lift * Math.sin(Math.PI * t);
    pts.push(pos.multiplyScalar(h));
  }
  return pts;
}

export default function Globe({ className = '' }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const W = el.clientWidth, H = el.clientHeight;

    /* ── scene ── */
    const scene = new THREE.Scene();

    /* ── camera ── */
    const cam = new THREE.PerspectiveCamera(38, W / H, 0.1, 100);
    cam.position.set(0, 0, 5.2);

    /* ── renderer (transparent) ── */
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    /* ── globe shell ── */
    const shellGeo = new THREE.SphereGeometry(R, 48, 48);
    const shellMat = new THREE.MeshPhongMaterial({
      color:       0x0d2558,
      emissive:    0x0d2558,
      transparent: true,
      opacity:     0.18,
      wireframe:   false,
    });
    scene.add(new THREE.Mesh(shellGeo, shellMat));

    /* ── latitude / longitude grid lines ── */
    const gridMat = new THREE.LineBasicMaterial({
      color: 0x2563eb, transparent: true, opacity: 0.08,
    });
    for (let lat = -80; lat <= 80; lat += 20) {
      const pts = [];
      const phi = THREE.MathUtils.degToRad(90 - lat);
      for (let lon = 0; lon <= 360; lon += 3) {
        const theta = THREE.MathUtils.degToRad(lon);
        pts.push(new THREE.Vector3(
          R * Math.sin(phi) * Math.cos(theta),
          R * Math.cos(phi),
          R * Math.sin(phi) * Math.sin(theta),
        ));
      }
      scene.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts), gridMat,
      ));
    }
    for (let lon = 0; lon < 360; lon += 20) {
      const pts = [];
      const theta = THREE.MathUtils.degToRad(lon);
      for (let lat = -90; lat <= 90; lat += 2) {
        const phi = THREE.MathUtils.degToRad(90 - lat);
        pts.push(new THREE.Vector3(
          R * Math.sin(phi) * Math.cos(theta),
          R * Math.cos(phi),
          R * Math.sin(phi) * Math.sin(theta),
        ));
      }
      scene.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts), gridMat,
      ));
    }

    /* ── surface dots ── */
    const dotPositions = [];
    for (let i = 0; i < DOT_COUNT; i++) {
      const phi   = Math.acos(-1 + (2 * i) / DOT_COUNT);
      const theta = Math.sqrt(DOT_COUNT * Math.PI) * phi;
      dotPositions.push(
        R * Math.cos(theta) * Math.sin(phi),
        R * Math.sin(theta) * Math.sin(phi),
        R * Math.cos(phi),
      );
    }
    const dotGeo = new THREE.BufferGeometry();
    dotGeo.setAttribute('position', new THREE.Float32BufferAttribute(dotPositions, 3));
    scene.add(new THREE.Points(dotGeo, new THREE.PointsMaterial({
      color:       DOT_COLOR,
      size:        0.022,
      transparent: true,
      opacity:     0.75,
      sizeAttenuation: true,
    })));

    /* ── arcs ── */
    const arcObjects = [];
    for (let i = 0; i < ARC_COUNT; i++) {
      const a = randomOnSphere(R);
      const b = randomOnSphere(R);
      const pts = buildArc(a, b, 0.18 + Math.random() * 0.24);
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color:       ARC_COLOR,
        transparent: true,
        opacity:     0.0,
        linewidth:   1,
      });
      const line = new THREE.Line(geo, mat);
      line.userData = {
        phase:    Math.random() * Math.PI * 2,
        speed:    0.4 + Math.random() * 0.6,
      };
      scene.add(line);
      arcObjects.push(line);
    }

    /* ── hot dots at arc endpoints ── */
    const hotDots = [];
    arcObjects.forEach((_, i) => {
      const g = new THREE.SphereGeometry(0.035, 8, 8);
      const m = new THREE.MeshBasicMaterial({
        color: 0x67b2ff, transparent: true, opacity: 0,
      });
      hotDots.push({ mesh: new THREE.Mesh(g, m), arcIdx: i });
      scene.add(hotDots[hotDots.length - 1].mesh);
    });

    /* ── ambient + point light ── */
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const pt = new THREE.PointLight(0x4080ff, 1.2, 20);
    pt.position.set(4, 3, 5);
    scene.add(pt);

    /* ── mouse drag ── */
    const globe = new THREE.Group();
    scene.add(globe);
    scene.children
      .filter((c) => c !== globe)
      .forEach((c) => globe.add(c));

    let dragging = false, prev = { x: 0, y: 0 }, velX = 0, velY = 0;
    const onDown = (e) => {
      dragging = true; velX = 0; velY = 0;
      const s = e.touches ? e.touches[0] : e;
      prev = { x: s.clientX, y: s.clientY };
    };
    const onUp   = () => { dragging = false; };
    const onMove = (e) => {
      if (!dragging) return;
      const s  = e.touches ? e.touches[0] : e;
      const dx = s.clientX - prev.x;
      const dy = s.clientY - prev.y;
      velX = dx * 0.006; velY = dy * 0.006;
      globe.rotation.y += velX;
      globe.rotation.x += velY;
      prev = { x: s.clientX, y: s.clientY };
    };
    el.addEventListener('mousedown',  onDown);
    el.addEventListener('mouseup',    onUp);
    el.addEventListener('mouseleave', onUp);
    el.addEventListener('mousemove',  onMove);
    el.addEventListener('touchstart', onDown, { passive: true });
    el.addEventListener('touchend',   onUp);
    el.addEventListener('touchmove',  onMove, { passive: true });

    /* ── animation loop ── */
    let raf;
    const animate = (t) => {
      raf = requestAnimationFrame(animate);
      const secs = t * 0.001;

      if (!dragging) {
        globe.rotation.y += 0.0012;
        velX *= 0.92; velY *= 0.92;
      }

      arcObjects.forEach((arc, i) => {
        const { phase, speed } = arc.userData;
        const pulse = (Math.sin(secs * speed + phase) + 1) / 2;
        arc.material.opacity = pulse * 0.55;
        if (hotDots[i]) hotDots[i].mesh.material.opacity = pulse * 0.9;
      });

      renderer.render(scene, cam);
    };
    animate(0);

    /* ── resize ── */
    const ro = new ResizeObserver(() => {
      const nw = el.clientWidth, nh = el.clientHeight;
      cam.aspect = nw / nh;
      cam.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });
    ro.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      ['mousedown','mouseup','mouseleave','mousemove',
       'touchstart','touchend','touchmove'].forEach((ev) => {
        el.removeEventListener(ev, ev.startsWith('touch') ? onMove : onDown);
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
  }, []);

  return (
    <div
      ref={mountRef}
      className={className}
      style={{ cursor: 'grab', userSelect: 'none' }}
    />
  );
}
