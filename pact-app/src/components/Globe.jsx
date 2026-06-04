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
const ARC_SEGMENTS      = 52;
const TRAIL_LAYER_COUNT = 10;
const TRAIL_STEP        = 0.018;

/* Satellite constellation */
const SAT_R          = GLOBE_RADIUS * GLOBE_RENDER_SCALE * 1.14; // orbit radius
const MESH_LINK_DIST = 1.55;                                      // max dist to draw link
const MAX_SAT_VERTS  = 45 * 2;                                    // C(10,2) pairs × 2 endpoints

const SATELLITES = [
  { id: 'KH-09',    inc: 97.4, raan:   0, speed: 0.00285, phase: 0.0 },
  { id: 'NRO-14',   inc: 63.4, raan:  58, speed: 0.00242, phase: 0.8 },
  { id: 'USA-336',  inc: 74.0, raan: 118, speed: 0.00308, phase: 1.6 },
  { id: 'OPS-7742', inc: 51.6, raan: 178, speed: 0.00254, phase: 2.4 },
  { id: 'KH-11',    inc: 97.4, raan:  42, speed: 0.00277, phase: 3.2 },
  { id: 'LACROSSE', inc: 57.0, raan:  95, speed: 0.00228, phase: 0.4 },
  { id: 'SV-22',    inc: 82.6, raan: 152, speed: 0.00316, phase: 1.2 },
  { id: 'WGS-11',   inc: 35.5, raan: 215, speed: 0.00261, phase: 2.0 },
  { id: 'AEHF-6',   inc: 97.4, raan: 272, speed: 0.00292, phase: 2.8 },
  { id: 'GEO-3',    inc: 45.0, raan: 318, speed: 0.00235, phase: 3.6 },
];

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

/* Compute 3-D position of a satellite given orbital elements + current angle */
function satPos(inc, raan, theta, r) {
  const i = degToRad(inc), n = degToRad(raan);
  const ox = Math.cos(theta), oz = Math.sin(theta);
  const x1 = ox, y1 = -oz * Math.sin(i), z1 = oz * Math.cos(i);
  return [
    (x1 * Math.cos(n) + z1 * Math.sin(n)) * r,
    y1 * r,
    (-x1 * Math.sin(n) + z1 * Math.cos(n)) * r,
  ];
}

/* Faint ring tracing a satellite's orbital path */
function buildOrbitRing(inc, raan, r, steps = 96) {
  const v = []; let prev = null;
  for (let i = 0; i <= steps; i++) {
    const pos = satPos(inc, raan, (i / steps) * Math.PI * 2, r);
    if (prev) v.push(...prev, ...pos);
    prev = pos;
  }
  return new Float32Array(v);
}

/* Canvas sprite: satellite ID + live coordinate line */
function makeLabelSprite(THREE, id, accent) {
  const W = 200, H = 52;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const rgb = `${Math.round(accent.r * 255)},${Math.round(accent.g * 255)},${Math.round(accent.b * 255)}`;
  ctx.font = 'bold 17px monospace';
  ctx.fillStyle = `rgb(${rgb})`;
  ctx.fillText(id, 2, 20);
  ctx.font = '11px monospace';
  ctx.fillStyle = `rgba(${rgb},0.65)`;
  ctx.fillText('— — —', 2, 38);
  const tex = new THREE.CanvasTexture(cv);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.88, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.52, 0.14, 1);
  return { sprite, tex, mat, cv, ctx, rgb };
}

/* Redraw the coordinate line of an existing label */
function updateLabelCoords(label, lat, lon) {
  const { cv, ctx, rgb } = label;
  ctx.clearRect(0, 26, cv.width, 26);
  ctx.font = '11px monospace';
  ctx.fillStyle = `rgba(${rgb},0.65)`;
  const latStr = (lat >= 0 ? '+' : '') + lat.toFixed(1) + '°';
  const lonStr = (lon >= 0 ? '+' : '') + lon.toFixed(1) + '°';
  ctx.fillText(`${latStr}  ${lonStr}`, 2, 38);
  label.tex.needsUpdate = true;
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

        /* Inner fill — barely-there tint, not a blob */
        const glowGeometry = new THREE.SphereGeometry(GLOBE_RADIUS * 1.01, 48, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: accent, transparent: true, opacity: 0.012, depthWrite: false,
        });
        globe.add(new THREE.Mesh(glowGeometry, glowMaterial));

        /* Rim atmosphere — single tight shell, barely visible */
        const atmoShells = [
          { rMult: 1.04, opacity: 0.018 },
          { rMult: 1.09, opacity: 0.01  },
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

        /* ── Satellite constellation (independent of globe rotation) ── */
        const satGroup = new THREE.Group();
        scene.add(satGroup);

        /* Orbit path rings */
        const orbitMat = new THREE.LineBasicMaterial({
          color: accent, transparent: true, opacity: 0.09, depthWrite: false,
        });
        const orbitGeos = SATELLITES.map((s) => {
          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.Float32BufferAttribute(buildOrbitRing(s.inc, s.raan, SAT_R), 3));
          satGroup.add(new THREE.LineSegments(geo, orbitMat));
          return geo;
        });

        /* Single shared geometry for all satellite dots */
        const satTex = makeCircleTexture(THREE);
        const satDotGeo = new THREE.BufferGeometry();
        satDotGeo.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(new Float32Array(SATELLITES.length * 3), 3),
        );
        const satDotMat = new THREE.PointsMaterial({
          color: accent, size: 0.07, sizeAttenuation: true,
          map: satTex, transparent: true, opacity: 0.95,
          depthWrite: false, alphaTest: 0.01,
        });
        satGroup.add(new THREE.Points(satDotGeo, satDotMat));

        /* Mesh network connecting nearby satellites */
        const meshGeo = new THREE.BufferGeometry();
        meshGeo.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(new Float32Array(MAX_SAT_VERTS * 3), 3),
        );
        const meshMat = new THREE.LineBasicMaterial({
          color: accent, transparent: true, opacity: 0.22, depthWrite: false,
        });
        satGroup.add(new THREE.LineSegments(meshGeo, meshMat));

        /* Labels: canvas sprite per satellite */
        const satLabels = SATELLITES.map((s) => {
          const label = makeLabelSprite(THREE, s.id, accent);
          satGroup.add(label.sprite);
          return label;
        });

        /* Satellite state: current orbital angle */
        const satTheta = SATELLITES.map((s) => s.phase);

        let frame = 0;

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
          frame += 1;
          if (shouldAutoRotate && !pointer.active) {
            globe.rotation.y += 0.0035;
            globe.rotation.x += Math.sin(Date.now() * 0.0007) * 0.0002;
          }
          updateCyberEffects(arcPaths, pulseGeometry, pulseMaterial, trailLayers, scanRing, scanMaterial);

          /* Update satellite positions */
          const satPos3 = SATELLITES.map((s, i) => {
            satTheta[i] = (satTheta[i] + s.speed) % (Math.PI * 2);
            return satPos(s.inc, s.raan, satTheta[i], SAT_R);
          });

          /* Update dot geometry */
          const dp = satDotGeo.attributes.position;
          satPos3.forEach((p, i) => dp.setXYZ(i, p[0], p[1], p[2]));
          dp.needsUpdate = true;

          /* Update label positions + periodic coordinate refresh */
          satPos3.forEach((p, i) => {
            const label = satLabels[i];
            label.sprite.position.set(p[0] * 1.02 + 0.14, p[1] + 0.13, p[2] * 1.02);
            const facingCam = p[2] > -0.1;
            label.mat.opacity = facingCam ? 0.88 : 0;
            if (frame % 62 === i % 62 && facingCam) {
              const lat = Math.asin(clamp(p[1] / SAT_R, -1, 1)) * 180 / Math.PI;
              const lon = Math.atan2(p[2], p[0]) * 180 / Math.PI;
              updateLabelCoords(label, lat, lon);
            }
          });

          /* Update mesh network connections */
          const mp = meshGeo.attributes.position;
          let vi = 0;
          for (let i = 0; i < satPos3.length; i++) {
            for (let j = i + 1; j < satPos3.length; j++) {
              const a = satPos3[i], b = satPos3[j];
              const dx = a[0]-b[0], dy = a[1]-b[1], dz = a[2]-b[2];
              if (dx*dx + dy*dy + dz*dz < MESH_LINK_DIST * MESH_LINK_DIST) {
                mp.setXYZ(vi++, a[0], a[1], a[2]);
                mp.setXYZ(vi++, b[0], b[1], b[2]);
              }
            }
          }
          while (vi < MAX_SAT_VERTS) { mp.setXYZ(vi++, 0, 0, 0); }
          mp.needsUpdate = true;

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
          orbitGeos.forEach((g) => g.dispose()); orbitMat.dispose();
          satDotGeo.dispose(); satTex.dispose(); satDotMat.dispose();
          meshGeo.dispose(); meshMat.dispose();
          satLabels.forEach(({ tex, mat }) => { tex.dispose(); mat.dispose(); });
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
  const depthFade = Math.pow(Math.max(0, Math.min(1, (vertex[2] / GLOBE_RADIUS + 1) / 2)), 2.2);
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
