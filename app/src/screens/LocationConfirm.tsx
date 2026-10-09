import React, { useEffect, useRef, useState } from 'react';
import type { Category, CityData } from '@shared/types';

interface Props {
  photo: string;
  category: Category;
  cityData: CityData;
  onConfirm: (lat: number, lon: number) => void;
  onBack: () => void;
}

const STYLE = 'https://tiles.openfreemap.org/styles/liberty';

function nearestStreetName(streets: CityData['streets'], lat: number, lon: number): string | null {
  if (streets.length === 0) return null;
  // Closest by simple Euclidean dist on lat/lon (good enough for ±1 km demo range)
  let best = streets[0];
  let bestDist = Infinity;
  for (const s of streets) {
    const d = (s.lat - lat) ** 2 + (s.lon - lon) ** 2;
    if (d < bestDist) { bestDist = d; best = s; }
  }
  return best.name;
}

const CATEGORY_LABEL: Record<Category, string> = {
  Pothole: 'Pothole',
  'Traffic sign': 'Damaged traffic sign',
  'Road marking': 'Faded road marking',
  'Street light': 'Street light out',
  Manhole: 'Raised manhole cover',
  Other: 'Road defect',
};

export default function LocationConfirm({ photo, category, cityData, onConfirm, onBack }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<import('maplibre-gl').Map | null>(null);
  const [centerLat, setCenterLat] = useState(cityData.lat);
  const [centerLon, setCenterLon] = useState(cityData.lon);
  const [isDragging, setIsDragging] = useState(false);
  const [safeBottom, setSafeBottom] = useState(48);

  useEffect(() => {
    const read = () => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom').trim();
      const val = parseInt(raw, 10);
      if (!isNaN(val) && val > 0) setSafeBottom(val);
    };
    read();
    const t = setTimeout(read, 800);
    return () => clearTimeout(t);
  }, []);

  const address = nearestStreetName(cityData.streets, centerLat, centerLon)
    ?? cityData.name;
  const streetNum = Math.floor(((Math.abs(centerLat) * 100) % 1) * 80) + 1;

  useEffect(() => {
    if (!mapContainerRef.current) return;
    let destroyed = false;

    import('maplibre-gl').then((mlgl) => {
      if (destroyed || !mapContainerRef.current) return;

      const map = new mlgl.Map({
        container: mapContainerRef.current,
        style: STYLE,
        center: [cityData.lon, cityData.lat],
        zoom: 17,
        attributionControl: false,
        pitchWithRotate: false,
        dragRotate: false,
      });
      mapInstanceRef.current = map;

      map.on('dragstart', () => { if (!destroyed) setIsDragging(true); });
      map.on('moveend', () => {
        if (destroyed) return;
        setIsDragging(false);
        const c = map.getCenter();
        setCenterLat(c.lat);
        setCenterLon(c.lng);
      });
    }).catch(() => {});

    return () => {
      destroyed = true;
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100dvh', overflow: 'hidden', background: '#0e2229', fontFamily: 'Manrope, system-ui, sans-serif', color: '#ffffff', display: 'flex', flexDirection: 'column' }}>

      {/* Map container */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '60%' }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%', background: '#0e2229' }} />

        {/* Fixed center pin — map moves under it */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -100%)',
          pointerEvents: 'none',
          zIndex: 10,
          transition: isDragging ? 'none' : 'transform 0.15s ease',
          filter: isDragging ? 'drop-shadow(0 8px 12px rgba(0,0,0,0.6))' : 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))',
          // Lift pin slightly while dragging
          marginTop: isDragging ? -8 : 0,
        }}>
          <svg width="36" height="46" viewBox="0 0 36 46" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M18 2C10.268 2 4 8.268 4 16c0 9.333 14 28 14 28s14-18.667 14-28c0-7.732-6.268-14-14-14z" fill="#ff4d4f" stroke="#ffffff" strokeWidth="2.5"/>
            <circle cx="18" cy="16" r="5" fill="#ffffff"/>
          </svg>
        </div>

        {/* Pin shadow dot on ground */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
          zIndex: 9,
          width: isDragging ? 16 : 10,
          height: isDragging ? 6 : 4,
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.35)',
          transition: 'width 0.15s, height 0.15s',
          marginLeft: isDragging ? -8 : -5,
          marginTop: isDragging ? -3 : -2,
        }} />

        {/* Drag hint */}
        <div style={{
          position: 'absolute',
          bottom: 14,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(12,29,36,0.85)',
          border: '1px solid #2a4650',
          borderRadius: 20,
          padding: '6px 14px',
          font: '600 12px Manrope, sans-serif',
          color: '#a9b8bd',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 10,
        }}>
          Drag map to adjust location
        </div>
      </div>

      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          position: 'absolute',
          top: 'calc(12px + var(--safe-top, env(safe-area-inset-top, 0px)))',
          left: 16,
          width: 44, height: 44, borderRadius: 22,
          background: 'rgba(12,29,36,0.85)', border: '1px solid #2a4650',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', zIndex: 20,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </button>

      {/* Photo thumbnail */}
      {photo && photo !== 'fallback' && (
        <img
          src={`data:image/jpeg;base64,${photo}`}
          alt="Captured"
          style={{
            position: 'absolute',
            top: 'calc(12px + var(--safe-top, env(safe-area-inset-top, 0px)))',
            right: 16,
            width: 60, height: 60, borderRadius: 12,
            objectFit: 'cover', border: '2px solid #2a4650', zIndex: 20,
          }}
        />
      )}

      {/* Bottom sheet */}
      <div style={{
        position: 'absolute',
        left: 0, right: 0,
        top: '58%', bottom: 0,
        background: '#0c1d24',
        borderRadius: '28px 28px 0 0',
        borderTop: '1px solid #2a4650',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 -12px 32px rgba(0,0,0,0.4)',
      }}>
        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 0' }}>
          <div style={{ width: 40, height: 5, borderRadius: 3, background: '#3a5862', margin: '0 auto 14px' }} />

          <div style={{ font: '700 11px Manrope, sans-serif', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#3ddc97', marginBottom: 4 }}>
            Confirm location
          </div>
          <div style={{ font: '800 20px Manrope, sans-serif', marginBottom: 4 }}>
            Is this the right place?
          </div>
          <div style={{ font: '500 13px Manrope, sans-serif', color: '#a9b8bd', marginBottom: 16 }}>
            Drag the map to move the pin
          </div>

          {/* Address card */}
          <div style={{
            background: '#132a33', border: '1px solid #2a4650', borderRadius: 16,
            padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, background: '#ff4d4f',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ font: '700 15px Manrope, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {address} {streetNum}
              </div>
              <div style={{ font: '500 13px Manrope, sans-serif', color: '#a9b8bd' }}>
                {CATEGORY_LABEL[category]}
              </div>
            </div>
          </div>
        </div>

        {/* Confirm button — always visible */}
        <div style={{
          flexShrink: 0,
          paddingTop: 12,
          paddingLeft: 16,
          paddingRight: 16,
          paddingBottom: safeBottom + 20,
        }}>
          <button
            onClick={() => onConfirm(centerLat, centerLon)}
            style={{
              width: '100%', height: 52, borderRadius: 26,
              background: '#3ddc97', border: 'none', color: '#06291b',
              font: '800 16px Manrope, sans-serif', cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(61,220,151,0.35)',
            }}
          >
            Yes, report here
          </button>
        </div>
      </div>
    </div>
  );
}
