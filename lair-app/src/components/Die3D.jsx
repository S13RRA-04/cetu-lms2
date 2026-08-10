import { useEffect, useRef } from 'react';

/*
  Die3D — replaces the old flat CSS clip-path "3D" dice, which faked depth by
  rotating a zero-thickness polygon and visibly collapsed to a sliver when
  edge-on to the camera. This renders the user's real print-quality STL
  models as an actual rotating solid, so it never disappears mid-spin.

  It does NOT attempt to land on the rolled face — the die tumbles to a
  natural-looking (uncalibrated) resting angle, and the real result is still
  read from the existing numeral/pip overlay rendered on top by the caller.
  Calibrating a specific numbered face to "up" for all 20 (or 6) faces of an
  unlabeled mesh isn't attempted here.

  `three` (and its STLLoader addon) is dynamically imported rather than
  statically, so it lands in its own chunk instead of the main app bundle —
  Case File is one admin tool among many in this LMS, and every other page
  shouldn't pay ~500KB for a library only this screen uses. Parsed geometry
  is cached at module level (per variant) since the STL files are several MB
  — remounting this component (tour vs. live board, navigating away and
  back) reuses the cached promise instead of re-fetching.
*/

const MODEL_URLS = { d20: '/models/d20.stl', d6: '/models/d6.stl' };
const SIZES = { d20: 78, d6: 58 };
const REST_EULER = { d20: [0.35, 0.6, 0.1], d6: [0.3, 0.5, 0] };

let threeModulesPromise = null;
function loadThree() {
  if (!threeModulesPromise) {
    threeModulesPromise = Promise.all([
      import('three'),
      import('three/addons/loaders/STLLoader.js'),
    ]).then(([THREE, { STLLoader }]) => ({ THREE, STLLoader }));
  }
  return threeModulesPromise;
}

const geometryCache = {};
function loadGeometry(variant) {
  if (!geometryCache[variant]) {
    geometryCache[variant] = loadThree().then(
      ({ STLLoader }) =>
        new Promise((resolve, reject) => {
          new STLLoader().load(
            MODEL_URLS[variant],
            (geometry) => {
              geometry.computeBoundingSphere();
              geometry.center();
              // Normalize to a consistent on-screen size regardless of the model's native print-file scale.
              const radius = geometry.boundingSphere?.radius || 1;
              geometry.scale(1 / radius, 1 / radius, 1 / radius);
              geometry.computeVertexNormals();
              resolve(geometry);
            },
            undefined,
            reject
          );
        })
    );
  }
  return geometryCache[variant];
}

export default function Die3D({ variant, rolling, color }) {
  const canvasRef = useRef(null);
  const meshRef = useRef(null);
  const rollingRef = useRef(rolling);
  rollingRef.current = rolling;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let disposed = false;
    let renderer = null;
    let frameId = null;

    loadThree().then(({ THREE }) => {
      if (disposed) return;
      const size = SIZES[variant] ?? 64;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(dpr);
      renderer.setSize(size, size, false);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 10);
      camera.position.set(0, 0.3, 3.1);
      camera.lookAt(0, 0, 0);

      scene.add(new THREE.AmbientLight(0xffffff, 0.65));
      const key = new THREE.DirectionalLight(0xffffff, 1.1);
      key.position.set(2, 3, 4);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xffffff, 0.5);
      rim.position.set(-3, -1, -2);
      scene.add(rim);

      let mesh = null;
      const velocity = { x: 0.09, y: 0.13, z: 0.05 };
      const restEuler = new THREE.Euler(...(REST_EULER[variant] ?? [0, 0, 0]));

      loadGeometry(variant).then((geometry) => {
        if (disposed) return;
        const material = new THREE.MeshStandardMaterial({
          color: color || '#c8a24e',
          roughness: 0.35,
          metalness: 0.15,
        });
        mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.copy(restEuler);
        meshRef.current = mesh;
        scene.add(mesh);
        renderer.render(scene, camera);
      });

      function tick() {
        frameId = requestAnimationFrame(tick);
        if (!mesh) return;
        if (rollingRef.current) {
          mesh.rotation.x += velocity.x;
          mesh.rotation.y += velocity.y;
          mesh.rotation.z += velocity.z;
        } else {
          // Ease toward the fixed resting pose rather than snapping to a stop.
          mesh.rotation.x += (restEuler.x - mesh.rotation.x) * 0.12;
          mesh.rotation.y += (restEuler.y - mesh.rotation.y) * 0.12;
          mesh.rotation.z += (restEuler.z - mesh.rotation.z) * 0.12;
        }
        renderer.render(scene, camera);
      }
      tick();
    });

    return () => {
      disposed = true;
      if (frameId) cancelAnimationFrame(frameId);
      renderer?.dispose();
      meshRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant]);

  useEffect(() => {
    if (meshRef.current) meshRef.current.material.color.set(color || '#c8a24e');
  }, [color]);

  return (
    <canvas
      ref={canvasRef}
      className={`cf-die3d cf-die3d-${variant}`}
      style={{ width: SIZES[variant], height: SIZES[variant] }}
    />
  );
}
