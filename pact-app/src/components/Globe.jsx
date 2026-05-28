import { useEffect, useMemo, useRef } from 'react';
import createGlobe from 'cobe';
import { geoContains } from 'd3-geo';
import { feature } from 'topojson-client';
import landAtlas from 'world-atlas/land-110m.json';

const INITIAL_PHI = -1.15;
const ROTATION_SPEED = 0.003;
const INITIAL_CENTER_LON = -84;

function seededRandom(seed) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildLandDots() {
  const land = feature(landAtlas, landAtlas.objects.land);
  const random = seededRandom(9137);
  const dots = [];
  const step = 1.15;

  for (let lat = -58; lat <= 82; lat += step) {
    const rowOffset = random() * step;
    for (let lon = -180 + rowOffset; lon <= 180; lon += step) {
      const jitteredLon = lon + (random() - 0.5) * 0.28;
      const jitteredLat = lat + (random() - 0.5) * 0.28;
      if (!geoContains(land, [jitteredLon, jitteredLat])) continue;
      dots.push({
        lon: jitteredLon,
        lat: jitteredLat,
        alpha: 0.62 + random() * 0.28,
      });
    }
  }

  return dots;
}

const LAND_DOTS = buildLandDots();

export default function Globe({
  className = '',
  theta = 0.25,
  dark = 0,
  scale = 1.1,
  diffuse = 1.2,
  mapSamples = 40000,
  mapBrightness = 6,
  baseColor = [1, 1, 1],
  markerColor = [1, 0, 0],
  glowColor = [1, 1, 1],
  opacity = 0.6,
}) {
  const canvasRef = useRef(null);
  const dotsRef = useRef(null);
  const phiRef = useRef(INITIAL_PHI);
  const reducedMotion = useMemo(
    () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let width = canvas.offsetWidth;
    const onResize = () => {
      width = canvas.offsetWidth;
    };

    window.addEventListener('resize', onResize);
    onResize();

    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: phiRef.current,
      theta,
      dark,
      scale,
      diffuse,
      mapSamples,
      mapBrightness,
      baseColor,
      markerColor,
      glowColor,
      opacity,
      offset: [0, 0],
      markers: [],
      onRender: (state) => {
        state.width = width * 2;
        state.height = width * 2;
        state.phi = phiRef.current;
      },
    });

    return () => {
      window.removeEventListener('resize', onResize);
      globe.destroy();
    };
  }, [baseColor, dark, diffuse, glowColor, mapBrightness, mapSamples, markerColor, opacity, scale, theta]);

  useEffect(() => {
    const canvas = dotsRef.current;
    if (!canvas) return undefined;

    const context = canvas.getContext('2d');
    let frameId = 0;
    let currentSize = 0;

    const resizeCanvas = () => {
      const nextSize = Math.max(1, canvas.offsetWidth);
      if (nextSize === currentSize) return;
      currentSize = nextSize;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(nextSize * ratio);
      canvas.height = Math.round(nextSize * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = () => {
      resizeCanvas();
      const size = currentSize;
      const radius = size * 0.44;
      const cx = size * 0.5;
      const cy = size * 0.5;
      const centerLat = 24;
      const centerLatRad = (centerLat * Math.PI) / 180;
      const centerLon = INITIAL_CENTER_LON - (phiRef.current - INITIAL_PHI) * 180 / Math.PI;

      context.clearRect(0, 0, size, size);
      context.save();
      context.beginPath();
      context.arc(cx, cy, radius * 0.985, 0, Math.PI * 2);
      context.clip();

      for (const dot of LAND_DOTS) {
        let lonDiffDeg = dot.lon - centerLon;
        lonDiffDeg = ((lonDiffDeg + 540) % 360) - 180;
        const lonDiff = (lonDiffDeg * Math.PI) / 180;
        const lat = (dot.lat * Math.PI) / 180;
        const cosLat = Math.cos(lat);
        const visible = Math.sin(centerLatRad) * Math.sin(lat)
          + Math.cos(centerLatRad) * cosLat * Math.cos(lonDiff);

        if (visible <= -0.02) continue;

        const x = cx + radius * cosLat * Math.sin(lonDiff);
        const y = cy - radius * (
          Math.cos(centerLatRad) * Math.sin(lat)
          - Math.sin(centerLatRad) * cosLat * Math.cos(lonDiff)
        );
        const edgeFade = Math.max(0, Math.min(1, (visible + 0.08) / 0.45));
        const dotRadius = Math.max(0.85, size * 0.00185);

        context.globalAlpha = dot.alpha * edgeFade;
        context.beginPath();
        context.arc(x, y, dotRadius, 0, Math.PI * 2);
        context.fillStyle = '#111111';
        context.fill();
      }

      context.restore();
      context.globalAlpha = 1;

      if (!reducedMotion) phiRef.current += ROTATION_SPEED;
      frameId = requestAnimationFrame(draw);
    };

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas);
    draw();

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
    };
  }, [reducedMotion]);

  return (
    <div className={className} style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          aspectRatio: '1',
        }}
      />
      <canvas
        ref={dotsRef}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'block',
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
