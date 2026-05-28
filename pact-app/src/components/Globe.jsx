import { useEffect, useRef, useMemo } from 'react';
import ReactGlobe from 'react-globe.gl';

// City hotspots [lat, lng, isHot]
const CITIES = [
  [ 51.5,  -0.1, false], // London
  [ 48.9,   2.3, false], // Paris
  [ 52.5,  13.4, false], // Berlin
  [ 55.8,  37.6, true ], // Moscow
  [ 30.0,  31.2, false], // Cairo
  [ 25.2,  55.3, true ], // Dubai
  [ 35.7,  51.4, true ], // Tehran
  [ 41.0,  29.0, false], // Istanbul
  [ 28.6,  77.2, false], // Delhi
  [  1.3, 103.8, false], // Singapore
  [ 39.9, 116.4, true ], // Beijing
  [ 31.2, 121.5, false], // Shanghai
  [ 35.7, 139.7, false], // Tokyo
  [ 37.6, 127.0, false], // Seoul
  [ -1.3,  36.8, false], // Nairobi
  [ 40.7, -74.0, false], // New York
  [ 50.4,  30.5, true ], // Kyiv
  [ 24.7,  46.7, true ], // Riyadh
  [ 33.9,  35.5, false], // Beirut
  [ 19.1,  72.9, false], // Mumbai
  [-26.2,  28.0, false], // Johannesburg
  [ 59.9,  10.7, false], // Oslo
  [ 53.3,  -6.3, false], // Dublin
];

// Arc connections [cityA, cityB, isWarm]
const ARC_DEFS = [
  [ 0,  3, false], [ 0,  4, false], [ 0, 15, false], [ 0,  1, false],
  [ 0,  2, false], [ 1,  7, false], [ 2,  7, false], [ 2, 16, true ],
  [ 3, 16, true ], [ 3, 10, true ], [ 4,  5, false], [ 4, 14, false],
  [ 5,  6, true ], [ 5,  8, false], [ 5, 17, true ], [ 6,  7, true ],
  [ 6, 17, true ], [ 7, 16, true ], [ 7, 18, false], [ 8,  9, false],
  [ 9, 10, false], [ 9, 11, false], [10, 12, false], [11, 12, false],
  [12, 13, false], [17, 18, true ], [14, 20, false], [ 5,  9, false],
  [ 0, 22, false], [21, 22, false], [ 3,  7, false], [19,  8, false],
];

const WARM = '#ff9500';
const HOT  = '#ff3300';

export default function Globe({
  className = '',
  primaryColor = '#00b0ff',
  binaryAccentColor = '#27f5ff',
}) {
  const globeRef = useRef();

  // Build arc data from city pairs
  const arcsData = useMemo(() =>
    ARC_DEFS.map(([ai, bi, isWarm]) => ({
      startLat: CITIES[ai][0], startLng: CITIES[ai][1],
      endLat:   CITIES[bi][0], endLng:   CITIES[bi][1],
      isWarm,
    })),
  []);

  // Points for all cities
  const pointsData = useMemo(() =>
    CITIES.map(([lat, lng, isHot]) => ({ lat, lng, isHot })),
  []);

  // Rings only on the hotspot cities
  const ringsData = useMemo(() =>
    CITIES.filter(([,, isHot]) => isHot).map(([lat, lng]) => ({ lat, lng })),
  []);

  // Camera setup and auto-rotate on mount
  useEffect(() => {
    if (!globeRef.current) return;

    const controls = globeRef.current.controls();
    controls.autoRotate      = true;
    controls.autoRotateSpeed = 0.35;
    controls.enableZoom      = false;
    controls.enablePan       = false;

    // Face Europe / Middle East, slightly elevated perspective
    globeRef.current.pointOfView({ lat: 28, lng: 28, altitude: 1.85 }, 0);
  }, []);

  return (
    <div
      className={className}
      style={{ cursor: 'default', userSelect: 'none', touchAction: 'none' }}
    >
      <ReactGlobe
        ref={globeRef}
        width={undefined}
        height={undefined}

        // ── Globe surface ──────────────────────────────────────────────────
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        showGraticules={false}
        backgroundColor="rgba(0,0,0,0)"

        // ── Atmosphere ─────────────────────────────────────────────────────
        showAtmosphere={true}
        atmosphereColor={primaryColor}
        atmosphereAltitude={0.22}

        // ── Network arcs ───────────────────────────────────────────────────
        arcsData={arcsData}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor={d => d.isWarm
          ? [WARM, HOT]           // gradient warm → hot for threat routes
          : [primaryColor, binaryAccentColor]
        }
        arcAltitudeAutoScale={0.28}
        arcStroke={0.35}
        arcDashLength={0.5}
        arcDashGap={0.3}
        arcDashAnimateTime={d => d.isWarm ? 1400 : 2200}

        // ── City points ────────────────────────────────────────────────────
        pointsData={pointsData}
        pointLat="lat"
        pointLng="lng"
        pointColor={d => d.isHot ? WARM : primaryColor}
        pointAltitude={0.008}
        pointRadius={d => d.isHot ? 0.45 : 0.28}
        pointsMerge={false}

        // ── Pulsing rings on hotspots ──────────────────────────────────────
        ringsData={ringsData}
        ringLat="lat"
        ringLng="lng"
        ringColor={() => [WARM, `${WARM}00`]}
        ringMaxRadius={3.5}
        ringPropagationSpeed={1.4}
        ringRepeatPeriod={900}

        // ── Interaction ────────────────────────────────────────────────────
        enablePointerInteraction={false}
        animateIn={true}
      />
    </div>
  );
}
