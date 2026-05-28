import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const GLOBE_RADIUS = 100;
const POINT_COUNT = 5200;
const STAR_COUNT = 420;
const ARC_COUNT = 22;
const GLITCH_BAND_COUNT = 18;
const LINE_SEGMENTS = 96;

function hexToColor(hex, fallback = '#00b0ff') {
  return new THREE.Color(/^#[0-9a-f]{6}$/i.test(hex ?? '') ? hex : fallback);
}

function mulberry32(seed) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pointOnSphere(latDeg, lonDeg, radius = GLOBE_RADIUS) {
  const lat = THREE.MathUtils.degToRad(latDeg);
  const lon = THREE.MathUtils.degToRad(lonDeg);
  const cosLat = Math.cos(lat);
  return new THREE.Vector3(
    radius * cosLat * Math.cos(lon),
    radius * Math.sin(lat),
    radius * cosLat * Math.sin(lon),
  );
}

function globePoint(u, v, radius = GLOBE_RADIUS) {
  const lon = u * 360 - 180;
  const lat = Math.asin(2 * v - 1) * THREE.MathUtils.RAD2DEG;
  return pointOnSphere(lat, lon, radius);
}

const LAND_BLOBS = [
  [-100, 48, 45, 22], [-75, 35, 35, 18], [-60, -15, 30, 28],
  [-48, -22, 18, 22], [10, 52, 36, 18], [18, 5, 28, 35],
  [45, 28, 32, 22], [78, 23, 42, 22], [105, 48, 38, 18],
  [112, 8, 30, 24], [135, -25, 26, 18], [145, 40, 18, 16],
];

function landWeight(lon, lat) {
  let weight = 0;
  for (const [cx, cy, rx, ry] of LAND_BLOBS) {
    const dx = Math.min(Math.abs(lon - cx), 360 - Math.abs(lon - cx)) / rx;
    const dy = (lat - cy) / ry;
    weight += Math.exp(-(dx * dx + dy * dy) * 1.65);
  }
  return weight;
}

function makeLandPoints(primary, accent) {
  const rng = mulberry32(4404);
  const positions = [];
  const colors = [];

  for (let i = 0; i < POINT_COUNT; i += 1) {
    const u = rng();
    const v = rng();
    const lon = u * 360 - 180;
    const lat = Math.asin(2 * v - 1) * THREE.MathUtils.RAD2DEG;
    const weight = landWeight(lon, lat);
    if (weight < 0.18 && rng() > weight * 1.8) continue;

    const p = pointOnSphere(lat, lon, GLOBE_RADIUS + rng() * 1.8);
    positions.push(p.x, p.y, p.z);

    const color = primary.clone().lerp(accent, 0.18 + Math.min(weight, 1) * 0.34);
    const intensity = 0.48 + rng() * 0.52;
    colors.push(color.r * intensity, color.g * intensity, color.b * intensity);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}

function makeStars(primary) {
  const rng = mulberry32(9917);
  const positions = [];
  const colors = [];

  for (let i = 0; i < STAR_COUNT; i += 1) {
    const p = globePoint(rng(), rng(), 155 + rng() * 120);
    positions.push(p.x, p.y, p.z);
    const intensity = 0.08 + rng() * 0.18;
    colors.push(primary.r * intensity, primary.g * intensity, primary.b * intensity);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}

function makeCirclePoints(radius, axis, value = 0, segments = LINE_SEGMENTS) {
  const points = [];
  for (let i = 0; i <= segments; i += 1) {
    const a = (i / segments) * Math.PI * 2;
    if (axis === 'y') points.push(new THREE.Vector3(Math.cos(a) * radius, value, Math.sin(a) * radius));
    if (axis === 'x') points.push(new THREE.Vector3(value, Math.cos(a) * radius, Math.sin(a) * radius));
    if (axis === 'z') points.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, value));
  }
  return points;
}

function makeGreatCircleArc(start, end, lift, segments = 72) {
  const points = [];
  const a = start.clone().normalize();
  const b = end.clone().normalize();
  const omega = Math.acos(THREE.MathUtils.clamp(a.dot(b), -1, 1));
  const sinOmega = Math.sin(omega);

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const p = sinOmega < 0.001
      ? a.clone().lerp(b, t).normalize()
      : a.clone().multiplyScalar(Math.sin((1 - t) * omega) / sinOmega)
        .add(b.clone().multiplyScalar(Math.sin(t * omega) / sinOmega))
        .normalize();
    points.push(p.multiplyScalar(GLOBE_RADIUS + lift * Math.sin(Math.PI * t)));
  }

  return points;
}

function makeGlowTexture(primary) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const c = primary.clone().multiplyScalar(255);
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 8, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, `rgba(255,255,255,0.78)`);
  gradient.addColorStop(0.18, `rgba(${c.r | 0},${c.g | 0},${c.b | 0},0.5)`);
  gradient.addColorStop(0.62, `rgba(${c.r | 0},${c.g | 0},${c.b | 0},0.16)`);
  gradient.addColorStop(1, `rgba(${c.r | 0},${c.g | 0},${c.b | 0},0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

export default function Globe({
  className = '',
  primaryColor = '#00b0ff',
  binaryAccentColor = '#27f5ff',
}) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const primary = hexToColor('#00b0ff').lerp(hexToColor(primaryColor), 0.18);
    const accent = hexToColor('#27f5ff').lerp(hexToColor(binaryAccentColor, '#27f5ff'), 0.12);
    const width = Math.max(1, mount.clientWidth);
    const height = Math.max(1, mount.clientHeight);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1600);
    camera.position.set(0, 0, 300);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const globe = new THREE.Group();
    globe.rotation.set(-0.12, -0.42, 0);
    scene.add(globe);

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS * 1.04, 96, 48),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          color: { value: primary },
          time: { value: 0 },
        },
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vWorld;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vec4 world = modelMatrix * vec4(position, 1.0);
            vWorld = world.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 color;
          uniform float time;
          varying vec3 vNormal;
          varying vec3 vWorld;
          void main() {
            float rim = pow(1.0 - abs(vNormal.z), 2.2);
            float scan = 0.55 + 0.45 * sin((vWorld.y * 0.55) + time * 5.2);
            float band = smoothstep(0.92, 1.0, scan);
            float alpha = rim * 0.28 + band * 0.035;
            gl_FragColor = vec4(color, alpha);
          }
        `,
      }),
    );
    globe.add(atmosphere);

    const wireMaterial = new THREE.MeshBasicMaterial({
      color: primary,
      transparent: true,
      opacity: 0.09,
      wireframe: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    globe.add(new THREE.Mesh(new THREE.SphereGeometry(GLOBE_RADIUS, 48, 24), wireMaterial));

    const pointsMaterial = new THREE.PointsMaterial({
      size: 1.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const landPoints = new THREE.Points(makeLandPoints(primary, accent), pointsMaterial);
    globe.add(landPoints);

    const ringMaterial = new THREE.LineBasicMaterial({
      color: primary,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    for (const lat of [-60, -35, -15, 0, 15, 35, 60]) {
      const y = Math.sin(THREE.MathUtils.degToRad(lat)) * GLOBE_RADIUS;
      const radius = Math.cos(THREE.MathUtils.degToRad(lat)) * GLOBE_RADIUS;
      globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(makeCirclePoints(radius, 'y', y)), ringMaterial.clone()));
    }
    for (let i = 0; i < 6; i += 1) {
      const meridian = new THREE.Line(new THREE.BufferGeometry().setFromPoints(makeCirclePoints(GLOBE_RADIUS, 'x')), ringMaterial.clone());
      meridian.rotation.y = (i / 6) * Math.PI;
      globe.add(meridian);
    }

    const rng = mulberry32(7202);
    const arcMaterials = [];
    for (let i = 0; i < ARC_COUNT; i += 1) {
      const start = globePoint(rng(), rng(), GLOBE_RADIUS + 2);
      const end = globePoint(rng(), rng(), GLOBE_RADIUS + 2);
      const material = new THREE.LineBasicMaterial({
        color: i % 3 === 0 ? accent : primary,
        transparent: true,
        opacity: 0.18 + rng() * 0.22,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      arcMaterials.push(material);
      globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(makeGreatCircleArc(start, end, 16 + rng() * 18)), material));
    }

    const glowTexture = makeGlowTexture(primary);
    const nodeMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      color: accent,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    for (let i = 0; i < 28; i += 1) {
      const node = new THREE.Sprite(nodeMaterial.clone());
      node.position.copy(globePoint(rng(), rng(), GLOBE_RADIUS + 5));
      const scale = 5 + rng() * 9;
      node.scale.set(scale, scale, 1);
      globe.add(node);
    }

    const starMaterial = new THREE.PointsMaterial({
      size: 1.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const stars = new THREE.Points(makeStars(primary), starMaterial);
    scene.add(stars);

    const glitchGroup = new THREE.Group();
    const glitchMaterial = new THREE.LineBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const glitchBands = [];
    for (let i = 0; i < GLITCH_BAND_COUNT; i += 1) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
      const line = new THREE.Line(geometry, glitchMaterial.clone());
      glitchGroup.add(line);
      glitchBands.push(line);
    }
    scene.add(glitchGroup);

    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(primary),
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    halo.scale.set(GLOBE_RADIUS * 3.1, GLOBE_RADIUS * 3.1, 1);
    scene.add(halo);

    const clock = new THREE.Clock();
    let frameId = 0;
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const speed = prefersReducedMotion ? 0.2 : 1;

      globe.rotation.y += 0.0028 * speed;
      globe.rotation.x = -0.12 + Math.sin(elapsed * 0.2) * 0.025;
      stars.rotation.y -= 0.00035 * speed;
      atmosphere.material.uniforms.time.value = elapsed;
      halo.material.opacity = 0.46 + Math.sin(elapsed * 1.5) * 0.08;

      for (let i = 0; i < arcMaterials.length; i += 1) {
        arcMaterials[i].opacity = 0.14 + Math.max(0, Math.sin(elapsed * 1.8 + i * 0.7)) * 0.28;
      }

      const glitchBurst = Math.sin(elapsed * 5.7) > 0.7 || Math.sin(elapsed * 13.1) > 0.92;
      glitchGroup.visible = glitchBurst;
      if (glitchBurst) {
        for (let i = 0; i < glitchBands.length; i += 1) {
          const y = -86 + ((i * 19 + elapsed * 42) % 172);
          const half = Math.sqrt(Math.max(0, GLOBE_RADIUS * GLOBE_RADIUS - y * y));
          const offset = Math.sin(elapsed * 18 + i) * 14 + (rng() - 0.5) * 18;
          const z = 12 + i * 0.12;
          const attr = glitchBands[i].geometry.attributes.position;
          attr.setXYZ(0, -half * (0.45 + rng() * 0.5) + offset, y, z);
          attr.setXYZ(1, half * (0.45 + rng() * 0.5) + offset, y + (rng() - 0.5) * 2.5, z);
          attr.needsUpdate = true;
          glitchBands[i].material.opacity = 0.18 + rng() * 0.46;
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    const resizeObserver = new ResizeObserver(() => {
      const nextWidth = Math.max(1, mount.clientWidth);
      const nextHeight = Math.max(1, mount.clientHeight);
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight);
    });
    resizeObserver.observe(mount);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        const material = object.material;
        if (Array.isArray(material)) {
          material.forEach((item) => item.dispose());
        } else if (material) {
          if (material.map) material.map.dispose();
          material.dispose();
        }
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
