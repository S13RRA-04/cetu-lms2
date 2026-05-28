import { useEffect, useRef } from 'react';
import createGlobe from 'cobe';

const AMERICAS_BLOBS = [
  [-122, 54, 22, 12],
  [-106, 47, 26, 16],
  [-92, 38, 25, 15],
  [-78, 45, 14, 16],
  [-100, 23, 17, 10],
  [-84, 15, 20, 8],
  [-70, -8, 14, 22],
  [-62, -22, 16, 24],
  [-52, -12, 9, 16],
  [-72, -38, 9, 18],
];

function seededRandom(seed) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function landWeight(lon, lat) {
  let weight = 0;
  for (const [cx, cy, rx, ry] of AMERICAS_BLOBS) {
    const dx = (lon - cx) / rx;
    const dy = (lat - cy) / ry;
    weight += Math.exp(-(dx * dx + dy * dy) * 1.75);
  }
  return weight;
}

function buildDotMap() {
  const random = seededRandom(1307);
  const dots = [];

  for (let lat = -55; lat <= 72; lat += 1.35) {
    const rowOffset = random() * 0.95;
    for (let lon = -138 + rowOffset; lon <= -35; lon += 1.35) {
      const weight = landWeight(lon, lat);
      if (weight < 0.2 || random() > Math.min(0.98, weight * 1.15)) continue;
      dots.push({
        lon: lon + (random() - 0.5) * 0.25,
        lat: lat + (random() - 0.5) * 0.25,
        alpha: 0.42 + Math.min(0.5, weight * 0.35),
      });
    }
  }

  return dots;
}

const DOTS = buildDotMap();

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
}) {
  const canvasRef = useRef(null);
  const dotsRef = useRef(null);

  useEffect(() => {
    let width = 0;

    const onResize = () => {
      if (canvasRef.current) width = canvasRef.current.offsetWidth;
    };
    window.addEventListener('resize', onResize);
    onResize();

    let phi = -1.15;

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta,
      dark,
      scale,
      diffuse,
      mapSamples,
      mapBrightness,
      baseColor,
      markerColor,
      glowColor,
      opacity: 1,
      offset: [0, 0],
      markers: [],
      onRender: (state) => {
        state.phi = phi;
        phi += 0.003;
      },
    });

    return () => {
      window.removeEventListener('resize', onResize);
      globe.destroy();
    };
  }, []);

  useEffect(() => {
    const canvas = dotsRef.current;
    if (!canvas) return undefined;

    const context = canvas.getContext('2d');
    const draw = () => {
      const size = Math.max(1, canvas.offsetWidth);
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(size * ratio);
      canvas.height = Math.round(size * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, size, size);

      const radius = size * 0.44;
      const cx = size * 0.5;
      const cy = size * 0.5;
      const centerLon = -84;
      const centerLat = 24;
      const centerLatRad = (centerLat * Math.PI) / 180;

      context.save();
      context.beginPath();
      context.arc(cx, cy, radius * 0.985, 0, Math.PI * 2);
      context.clip();

      for (const dot of DOTS) {
        const lonDiff = ((dot.lon - centerLon) * Math.PI) / 180;
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
        const dotRadius = Math.max(0.75, size * 0.0021);

        context.globalAlpha = dot.alpha * edgeFade;
        context.beginPath();
        context.arc(x, y, dotRadius, 0, Math.PI * 2);
        context.fillStyle = '#111111';
        context.fill();
      }

      context.restore();
      context.globalAlpha = 1;
    };

    draw();
    const resizeObserver = new ResizeObserver(draw);
    resizeObserver.observe(canvas);

    return () => resizeObserver.disconnect();
  }, []);

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
