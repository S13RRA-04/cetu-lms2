import { useEffect, useRef } from 'react';

const GLOBE_RADIUS = 1.56;
const FLAT_MAP_WIDTH = 4098 / 2;
const FLAT_MAP_HEIGHT = 1968 / 2;

export default function Globe({
  autoRotate = true,
  className = '',
  interactive = false,
}) {
  const canvasRef = useRef(null);
  const hostRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return undefined;

    if (!('WebGLRenderingContext' in window)) {
      host.dataset.globeFallback = 'true';
      return undefined;
    }

    let disposed = false;
    let cleanup = () => undefined;

    Promise.all([
      import('./globeThree.js'),
      import('../assets/creativeTimGlobePoints.json'),
    ]).then(([THREE, pointsModule]) => {
      if (disposed) return;

      const [red, green, blue] = readAccentColor(host);
      const accent = new THREE.Color(red / 255, green / 255, blue / 255);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
      camera.position.set(0, 0, 4.7);

      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          canvas,
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
      scene.add(globe);

      const glowGeometry = new THREE.SphereGeometry(GLOBE_RADIUS * 1.01, 48, 32);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: accent,
        transparent: true,
        opacity: 0.025,
        depthWrite: false,
      });
      globe.add(new THREE.Mesh(glowGeometry, glowMaterial));

      const pointCloud = buildPointCloudFromSample(pointsModule.default.points, accent);
      const dotGeometry = new THREE.BufferGeometry();
      dotGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pointCloud.positions, 3));
      dotGeometry.setAttribute('color', new THREE.Float32BufferAttribute(pointCloud.colors, 3));
      const dotMaterial = new THREE.PointsMaterial({
        size: 0.022,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.96,
        depthWrite: false,
      });
      globe.add(new THREE.Points(dotGeometry, dotMaterial));

      const lineGeometry = new THREE.BufferGeometry();
      lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(buildGuideLines(), 3));
      const lineMaterial = new THREE.LineBasicMaterial({
        color: accent,
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
      });
      globe.add(new THREE.LineSegments(lineGeometry, lineMaterial));

      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const shouldAutoRotate = autoRotate && !prefersReducedMotion;
      const pointer = { active: false, x: 0, y: 0 };
      let animationFrame = 0;

      const resize = () => {
        const rect = host.getBoundingClientRect();
        const width = Math.max(1, Math.floor(rect.width));
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

        renderer.render(scene, camera);
        animationFrame = window.requestAnimationFrame(render);
      };

      const onPointerDown = (event) => {
        pointer.active = true;
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        host.setPointerCapture(event.pointerId);
        host.dataset.dragging = 'true';
      };

      const onPointerMove = (event) => {
        if (!pointer.active) return;

        const deltaX = event.clientX - pointer.x;
        const deltaY = event.clientY - pointer.y;
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        globe.rotation.y += deltaX * 0.007;
        globe.rotation.x = clamp(globe.rotation.x + deltaY * 0.005, -1.1, 1.1);
      };

      const onPointerUp = (event) => {
        pointer.active = false;
        host.releasePointerCapture(event.pointerId);
        delete host.dataset.dragging;
      };

      if (interactive) {
        host.addEventListener('pointerdown', onPointerDown);
        host.addEventListener('pointermove', onPointerMove);
        host.addEventListener('pointerup', onPointerUp);
        host.addEventListener('pointercancel', onPointerUp);
      }
      render();

      cleanup = () => {
        window.cancelAnimationFrame(animationFrame);
        resizeObserver.disconnect();
        if (interactive) {
          host.removeEventListener('pointerdown', onPointerDown);
          host.removeEventListener('pointermove', onPointerMove);
          host.removeEventListener('pointerup', onPointerUp);
          host.removeEventListener('pointercancel', onPointerUp);
        }
        glowGeometry.dispose();
        glowMaterial.dispose();
        dotGeometry.dispose();
        dotMaterial.dispose();
        lineGeometry.dispose();
        lineMaterial.dispose();
        renderer.dispose();
      };
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, [autoRotate, interactive]);

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
  const value = styles.getPropertyValue('--accent-rgb').trim();
  if (!value) return readColorValue(styles.getPropertyValue('--primary').trim());

  const [red = 42, green = 157, blue = 143] = value
    .split(',')
    .map((part) => Number.parseInt(part.trim(), 10));
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
    const [red = 42, green = 157, blue = 143] = rgb[1]
      .split(',')
      .map((part) => Number.parseInt(part.trim(), 10));
    return [red, green, blue];
  }

  return [42, 157, 143];
}

function buildPointCloudFromSample(points, accent) {
  const positions = [];
  const colors = [];

  for (const point of points) {
    const vertex = flatMapPointToSphere(point.x, point.y, GLOBE_RADIUS);
    const depthFade = 0.16 + 0.84 * Math.max(0, Math.min(1, (vertex[2] / GLOBE_RADIUS + 1) / 2));
    positions.push(...vertex);
    colors.push(
      accent.r * depthFade,
      accent.g * depthFade,
      accent.b * depthFade,
    );
  }

  return { positions, colors };
}

function buildGuideLines() {
  const vertices = [];
  const longitudes = [-120, -60, 0, 60, 120];
  const latitudes = [-45, -20, 0, 20, 45];

  for (const longitude of longitudes) {
    for (let latitude = -72; latitude < 72; latitude += 5) {
      vertices.push(...spherePoint(latitude, longitude, GLOBE_RADIUS * 1.006));
      vertices.push(...spherePoint(latitude + 3.5, longitude, GLOBE_RADIUS * 1.006));
    }
  }

  for (const latitude of latitudes) {
    for (let longitude = -180; longitude < 180; longitude += 5) {
      vertices.push(...spherePoint(latitude, longitude, GLOBE_RADIUS * 1.006));
      vertices.push(...spherePoint(latitude, longitude + 3.5, GLOBE_RADIUS * 1.006));
    }
  }

  return vertices;
}

function flatMapPointToSphere(x, y, radius) {
  const latitude = degToRad(((x - FLAT_MAP_WIDTH) / FLAT_MAP_WIDTH) * -180);
  const longitude = degToRad(((y - FLAT_MAP_HEIGHT) / FLAT_MAP_HEIGHT) * -90);
  const radial = Math.cos(longitude) * radius;
  return [
    Math.cos(latitude) * radial,
    Math.sin(longitude) * radius,
    Math.sin(latitude) * radial,
  ];
}

function spherePoint(latitude, longitude, radius) {
  const lat = degToRad(latitude);
  const lon = degToRad(longitude);
  const x = Math.cos(lat) * Math.cos(lon) * radius;
  const y = Math.sin(lat) * radius;
  const z = Math.cos(lat) * Math.sin(lon) * radius;
  return [x, y, z];
}

function degToRad(value) {
  return (value * Math.PI) / 180;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
