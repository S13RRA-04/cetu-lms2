import { useEffect, useRef } from 'react';

const GLOBE_RADIUS = 1.56;
const GLOBE_RENDER_SCALE = 0.88;
const FLAT_MAP_WIDTH = 4098 / 2;
const FLAT_MAP_HEIGHT = 1968 / 2;
const NETWORK_ARCS = [
  { from: [37.8, -122.4], to: [51.5, -0.1],   lift: 0.25, speed: 0.0042 },
  { from: [40.7, -74.0],  to: [35.7, 139.7],  lift: 0.34, speed: 0.0035 },
  { from: [33.7, -84.4],  to: [1.35, 103.8],  lift: 0.28, speed: 0.0048 },
  { from: [25.2, 55.3],   to: [-33.9, 151.2], lift: 0.22, speed: 0.004  },
  { from: [-23.5, -46.6], to: [48.9, 2.35],   lift: 0.2,  speed: 0.0052 },
  { from: [52.5, 13.4],   to: [-26.2, 28.0],  lift: 0.18, speed: 0.0038 },
  { from: [19.4, -99.1],  to: [-34.6, -58.4], lift: 0.16, speed: 0.0045 },
  { from: [45.5, -73.6],  to: [59.9, 10.8],   lift: 0.21, speed: 0.0039 },
  { from: [41.9, 12.5],   to: [31.2, 121.5],  lift: 0.3,  speed: 0.0044 },
  { from: [-1.3, 36.8],   to: [50.1, 14.4],   lift: 0.19, speed: 0.005  },
];
const ARC_SEGMENTS   = 52;
const TRAIL_LAYER_COUNT = 10;
const TRAIL_STEP        = 0.018;

/* Soft radial-gradient canvas texture → round points instead of squares */
function makeCircleTexture(THREE) {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0,   'rgba(255,255,255,1.0)');
  g.addColorStop(0.45,'rgba(255,255,255,0.85)');
  g.addColorStop(1,   'rgba(255,255,255,0.0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  return new THREE.CanvasTexture(canvas);
}

export default function Globe({
  accentColor = null,
  autoRotate  = true,
  className   = '',
  interactive = false,
}) {
  const canvasRef = useRef(null);
  const hostRef   = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host   = hostRef.current;
    if (!canvas || !host) return undefined;

    if (!('WebGLRenderingContext' in window)) {
      host.dataset.globeFallback = 'true';
      return undefined;
    }

    let disposed = false;
    let cleanup  = () => undefined;

    /* Defer heavy Three.js load until the browser is idle (improves LCP) */
    const scheduleLoad = (fn) => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(fn, { timeout: 2000 });
      } else {
        setTimeout(fn, 150);
      }
    };

    scheduleLoad(() => {
      Promise.all([
        import('./globeThree.js'),
        import('../assets/creativeTimGlobePoints.json'),
      ]).then(([THREE, pointsModule]) => {
        if (disposed) return;

        const [red, green, blue] = accentColor
          ? readColorValue(accentColor)
          : readAccentColor(host);
        const accent = new THREE.Color(red / 255, green / 255, blue / 255);
        const scene  = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
        camera.position.set(0, 0, 4.7);

        let renderer;
        try {
          renderer = new THREE.WebGLRenderer({
            alpha: true, antialias: true, canvas,
            preserveDrawingBuffer: true,
          });
        } catch {
          host.dataset.globeFallback = 'true';
          return;
        }
        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

        const globe = new THREE.Group();
        globe.rotation.set(-0.18, -0.58, 0.08);
        globe.scale.setScalar(GLOBE_RENDER_SCALE);
        scene.add(globe);

        /* Inner glow (subtle fill) */
        const glowGeometry = new THREE.SphereGeometry(GLOBE_RADIUS * 1.01, 48, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: accent, transparent: true, opacity: 0.045, depthWrite: false,
        });
        globe.add(new THREE.Mesh(glowGeometry, glowMaterial));

        /* Atmospheric halo — three nested BackSide shells with additive blending */
        const atmoShells = [
          { rMult: 1.055, opacity: 0.07  },
          { rMult: 1.095, opacity: 0.045 },
          { rMult: 1.16,  opacity: 0.025 },
        ].map(({ rMult, opacity }) => {
          const geo = new THREE.SphereGeometry(GLOBE_RADIUS * rMult, 48, 32);
          const mat = new THREE.MeshBasicMaterial({
            color: accent, transparent: true, opacity,
            depthWrite: false, blending: THREE.AdditiveBlending,
            side: THREE.BackSide,
          });
          globe.add(new THREE.Mesh(geo, mat));
          return { geo, mat };
        });

        /* Dot cloud — circular sprite texture eliminates square artifacts */
        const circleTex  = makeCircleTexture(THREE);
        const pointCloud = buildPointCloudFromSample(pointsModule.default.points, accent);
        const dotGeometry = new THREE.BufferGeometry();
        dotGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pointCloud.positions, 3));
        dotGeometry.setAttribute('color',    new THREE.Float32BufferAttribute(pointCloud.colors,    3));
        const dotMaterial = new THREE.PointsMaterial({
          size: 0.032, sizeAttenuation: true, vertexColors: true,
          map: circleTex, transparent: true, opacity: 0.96,
          depthWrite: false, alphaTest: 0.01,
        });
        globe.add(new THREE.Points(dotGeometry, dotMaterial));

        /* Latitude / longitude guide lines */
        const lineGeometry = new THREE.BufferGeometry();
        lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(buildGuideLines(), 3));
        const lineMaterial = new THREE.LineBasicMaterial({
          color: accent, transparent: true, opacity: 0.16, depthWrite: false,
        });
        globe.add(new THREE.LineSegments(lineGeometry, lineMaterial));

        /* Static arc paths */
        const arcPaths   = NETWORK_ARCS.map((arc) => ({
          ...arc,
          points:   makeArcPoints(arc.from, arc.to, arc.lift),
          progress: Math.random(),
        }));
        const arcGeometry = new THREE.BufferGeometry();
        arcGeometry.setAttribute('position', new THREE.Float32BufferAttribute(buildArcSegments(arcPaths), 3));
        const arcMaterial = new THREE.LineBasicMaterial({
          color: accent, transparent: true, opacity: 0.28, depthWrite: false,
        });
        globe.add(new THREE.LineSegments(arcGeometry, arcMaterial));

        /* Animated pulse dots — round sprites, breathing size */
        const pulseGeometry = new THREE.BufferGeometry();
        pulseGeometry.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(new Float32Array(arcPaths.length * 3), 3),
        );
        const pulseTex  = makeCircleTexture(THREE);
        const pulseMaterial = new THREE.PointsMaterial({
          color: accent, size: 0.075, sizeAttenuation: true,
          map: pulseTex, transparent: true, opacity: 0.92,
          depthWrite: false, alphaTest: 0.01,
        });
        const pulses = new THREE.Points(pulseGeometry, pulseMaterial);
        globe.add(pulses);

        /* Trail layers — fading line segments behind each pulse */
        const trailLayers = Array.from({ length: TRAIL_LAYER_COUNT }, (_, index) => {
          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(new Float32Array(arcPaths.length * 2 * 3), 3),
          );
          const material = new THREE.LineBasicMaterial({
            color: accent, transparent: true,
            opacity: 0.42 * Math.pow(1 - index / TRAIL_LAYER_COUNT, 1.7),
            depthWrite: false,
          });
          globe.add(new THREE.LineSegments(geometry, material));
          return { geometry, material };
        });

        /* Latitude scan ring */
        const scanGeometry = new THREE.BufferGeometry();
        scanGeometry.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(buildLatitudeRing(0, GLOBE_RADIUS * 1.012), 3),
        );
        const scanMaterial = new THREE.LineBasicMaterial({
          color: accent, transparent: true, opacity: 0.28, depthWrite: false,
        });
        const scanRing = new THREE.LineSegments(scanGeometry, scanMaterial);
        globe.add(scanRing);

        /* Equatorial accent ring (static, subtle) */
        const eqGeometry = new THREE.BufferGeometry();
        eqGeometry.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(buildLatitudeRing(0, GLOBE_RADIUS * 1.008), 3),
        );
        const eqMaterial = new THREE.LineBasicMaterial({
          color: accent, transparent: true, opacity: 0.1, depthWrite: false,
        });
        globe.add(new THREE.LineSegments(eqGeometry, eqMaterial));

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const shouldAutoRotate     = autoRotate && !prefersReducedMotion;
        const pointer = { active: false, x: 0, y: 0 };
        let animationFrame = 0;

        const resize = () => {
          const rect   = host.getBoundingClientRect();
          const width  = Math.max(1, Math.floor(rect.width));
          const height = Math.max(1, Math.floor(rect.height));
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        };
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);
        resize();

        const render = () => {
          if (shouldAutoRotate && !pointer.active) {
            globe.rotation.y += 0.0035;
            globe.rotation.x += Math.sin(Date.now() * 0.0007) * 0.0002;
          }
          updateCyberEffects(arcPaths, pulseGeometry, pulseMaterial, trailLayers, scanRing, scanMaterial);
          renderer.render(scene, camera);
          animationFrame = window.requestAnimationFrame(render);
        };

        const onPointerDown  = (e) => { pointer.active = true;  pointer.x = e.clientX; pointer.y = e.clientY; host.setPointerCapture(e.pointerId); host.dataset.dragging = 'true'; };
        const onPointerMove  = (e) => { if (!pointer.active) return; const dx = e.clientX - pointer.x; const dy = e.clientY - pointer.y; pointer.x = e.clientX; pointer.y = e.clientY; globe.rotation.y += dx * 0.007; globe.rotation.x = clamp(globe.rotation.x + dy * 0.005, -1.1, 1.1); };
        const onPointerUp    = (e) => { pointer.active = false; host.releasePointerCapture(e.pointerId); delete host.dataset.dragging; };

        if (interactive) {
          host.addEventListener('pointerdown',  onPointerDown);
          host.addEventListener('pointermove',  onPointerMove);
          host.addEventListener('pointerup',    onPointerUp);
          host.addEventListener('pointercancel',onPointerUp);
        }
        render();

        cleanup = () => {
          window.cancelAnimationFrame(animationFrame);
          resizeObserver.disconnect();
          if (interactive) {
            host.removeEventListener('pointerdown',  onPointerDown);
            host.removeEventListener('pointermove',  onPointerMove);
            host.removeEventListener('pointerup',    onPointerUp);
            host.removeEventListener('pointercancel',onPointerUp);
          }
          glowGeometry.dispose(); glowMaterial.dispose();
          for (const { geo, mat } of atmoShells) { geo.dispose(); mat.dispose(); }
          circleTex.dispose();
          dotGeometry.dispose(); dotMaterial.dispose();
          lineGeometry.dispose(); lineMaterial.dispose();
          arcGeometry.dispose(); arcMaterial.dispose();
          pulseGeometry.dispose(); pulseTex.dispose(); pulseMaterial.dispose();
          for (const l of trailLayers) { l.geometry.dispose(); l.material.dispose(); }
          scanGeometry.dispose(); scanMaterial.dispose();
          eqGeometry.dispose(); eqMaterial.dispose();
          renderer.dispose();
        };
      });
    });

    return () => { disposed = true; cleanup(); };
  }, [accentColor, autoRotate, interactive]);

  return (
    <div
      className={`interactive-globe ${className}`.trim()}
      ref={hostRef}
      aria-hidden="true"
      data-interactive={interactive ? 'true' : 'false'}
    >
      <canvas className="interactive-globe-canvas" ref={canvasRef} />
    </div>
  );
}

function readAccentColor(element) {
  const styles = window.getComputedStyle(element);
  const value  = styles.getPropertyValue('--accent-rgb').trim();
  if (!value) return readColorValue(styles.getPropertyValue('--primary').trim());
  const [red = 42, green = 157, blue = 143] = value.split(',').map((p) => Number.parseInt(p.trim(), 10));
  return [red, green, blue];
}

function readColorValue(value) {
  if (/^#[0-9a-f]{6}$/i.test(value)) {
    return [
      Number.parseInt(value.slice(1, 3), 16),
      Number.parseInt(value.slice(3, 5), 16),
      Number.parseInt(value.slice(5, 7), 16),
    ];
  }
  const rgb = value.match(/rgba?\(([^)]+)\)/i);
  if (rgb) {
    const [red = 42, green = 157, blue = 143] = rgb[1].split(',').map((p) => Number.parseInt(p.trim(), 10));
    return [red, green, blue];
  }
  return [42, 157, 143];
}

function buildPointCloudFromSample(points, accent) {
  const positions = [];
  const colors    = [];
  for (const point of points) {
    addGlobePoint(positions, colors, point.x, point.y, accent, 1);
    addGlobePoint(positions, colors, point.x + 1.55, point.y - 1.2,  accent, 0.82);
    addGlobePoint(positions, colors, point.x - 1.35, point.y + 1.45, accent, 0.7);
  }
  return { positions, colors };
}

function addGlobePoint(positions, colors, x, y, accent, intensity) {
  const vertex   = flatMapPointToSphere(x, y, GLOBE_RADIUS);
  const depthFade = 0.18 + 0.82 * Math.max(0, Math.min(1, (vertex[2] / GLOBE_RADIUS + 1) / 2));
  positions.push(...vertex);
  colors.push(
    accent.r * depthFade * intensity,
    accent.g * depthFade * intensity,
    accent.b * depthFade * intensity,
  );
}

function buildGuideLines() {
  const vertices   = [];
  const longitudes = [-120, -60, 0, 60, 120];
  const latitudes  = [-45, -20, 0, 20, 45];
  for (const longitude of longitudes) {
    for (let latitude = -72; latitude < 72; latitude += 5) {
      vertices.push(...spherePoint(latitude,     longitude, GLOBE_RADIUS * 1.006));
      vertices.push(...spherePoint(latitude + 3.5, longitude, GLOBE_RADIUS * 1.006));
    }
  }
  for (const latitude of latitudes) {
    for (let longitude = -180; longitude < 180; longitude += 5) {
      vertices.push(...spherePoint(latitude, longitude,     GLOBE_RADIUS * 1.006));
      vertices.push(...spherePoint(latitude, longitude + 3.5, GLOBE_RADIUS * 1.006));
    }
  }
  return vertices;
}

function buildArcSegments(arcs) {
  const vertices = [];
  for (const arc of arcs) {
    for (let i = 0; i < arc.points.length - 1; i += 1) {
      vertices.push(...arc.points[i], ...arc.points[i + 1]);
    }
  }
  return vertices;
}

function makeArcPoints(from, to, lift) {
  const start  = spherePoint(from[0], from[1], GLOBE_RADIUS);
  const end    = spherePoint(to[0],   to[1],   GLOBE_RADIUS);
  const points = [];
  for (let i = 0; i <= ARC_SEGMENTS; i += 1) {
    const t     = i / ARC_SEGMENTS;
    const mixed = normalize3([
      start[0] * (1 - t) + end[0] * t,
      start[1] * (1 - t) + end[1] * t,
      start[2] * (1 - t) + end[2] * t,
    ]);
    const radius = GLOBE_RADIUS + lift * Math.sin(Math.PI * t);
    points.push([mixed[0] * radius, mixed[1] * radius, mixed[2] * radius]);
  }
  return points;
}

function buildLatitudeRing(latitude, radius) {
  const vertices = [];
  for (let lon = -180; lon < 180; lon += 4) {
    vertices.push(...spherePoint(latitude, lon,       radius));
    vertices.push(...spherePoint(latitude, lon + 2.8, radius));
  }
  return vertices;
}

function updateCyberEffects(arcs, pulseGeometry, pulseMaterial, trailLayers, scanRing, scanMaterial) {
  const time      = Date.now() * 0.001;
  const positions = pulseGeometry.attributes.position;

  for (let i = 0; i < arcs.length; i += 1) {
    const arc = arcs[i];
    arc.progress = (arc.progress + arc.speed) % 1;
    const point  = sampleArcPoint(arc.points, arc.progress);
    positions.setXYZ(i, point[0], point[1], point[2]);
  }
  positions.needsUpdate = true;

  /* Breathing pulse size */
  pulseMaterial.size = 0.058 + 0.026 * Math.abs(Math.sin(time * 2.6));

  for (let layerIndex = 0; layerIndex < trailLayers.length; layerIndex += 1) {
    const layer          = trailLayers[layerIndex];
    const trailPositions = layer.geometry.attributes.position;
    const headOffset     = TRAIL_STEP * layerIndex;
    const tailOffset     = TRAIL_STEP * (layerIndex + 1);
    for (let arcIndex = 0; arcIndex < arcs.length; arcIndex += 1) {
      const arc    = arcs[arcIndex];
      const head   = sampleArcPoint(arc.points, wrap01(arc.progress - headOffset));
      const tail   = sampleArcPoint(arc.points, wrap01(arc.progress - tailOffset));
      const offset = arcIndex * 2;
      trailPositions.setXYZ(offset,     tail[0], tail[1], tail[2]);
      trailPositions.setXYZ(offset + 1, head[0], head[1], head[2]);
    }
    trailPositions.needsUpdate = true;
  }

  const latitude    = Math.sin(time * 0.8) * 58;
  const ringVertices = buildLatitudeRing(latitude, GLOBE_RADIUS * 1.014);
  const ringPositions = scanRing.geometry.attributes.position;
  for (let i = 0; i < ringVertices.length; i += 3) {
    ringPositions.setXYZ(i / 3, ringVertices[i], ringVertices[i + 1], ringVertices[i + 2]);
  }
  ringPositions.needsUpdate = true;
  scanMaterial.opacity = 0.12 + 0.22 * (0.5 + 0.5 * Math.sin(time * 2.2));
}

function wrap01(value) {
  return ((value % 1) + 1) % 1;
}

function sampleArcPoint(points, progress) {
  const scaled = progress * (points.length - 1);
  const index  = Math.floor(scaled);
  const next   = Math.min(points.length - 1, index + 1);
  const t      = scaled - index;
  return [
    points[index][0] * (1 - t) + points[next][0] * t,
    points[index][1] * (1 - t) + points[next][1] * t,
    points[index][2] * (1 - t) + points[next][2] * t,
  ];
}

function flatMapPointToSphere(x, y, radius) {
  const latitude  = degToRad(((x - FLAT_MAP_WIDTH)  / FLAT_MAP_WIDTH)  * -180);
  const longitude = degToRad(((y - FLAT_MAP_HEIGHT) / FLAT_MAP_HEIGHT) * -90);
  const radial    = Math.cos(longitude) * radius;
  return [Math.cos(latitude) * radial, Math.sin(longitude) * radius, Math.sin(latitude) * radial];
}

function spherePoint(latitude, longitude, radius) {
  const lat = degToRad(latitude);
  const lon = degToRad(longitude);
  return [
    Math.cos(lat) * Math.cos(lon) * radius,
    Math.sin(lat) * radius,
    Math.cos(lat) * Math.sin(lon) * radius,
  ];
}

function normalize3(point) {
  const length = Math.hypot(point[0], point[1], point[2]) || 1;
  return [point[0] / length, point[1] / length, point[2] / length];
}

function degToRad(value) { return (value * Math.PI) / 180; }
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
