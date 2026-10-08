import React, { useEffect, useRef, useState } from 'react';
import type { Category, CityData } from '@shared/types';

interface Props {
  photo: string;
  category: Category;
  cityData: CityData;
  onConfirm: () => void;
  onBack: () => void;
}

const STYLE = 'https://tiles.openfreemap.org/styles/liberty';

export default function LocationConfirm({ photo, category, cityData, onConfirm, onBack }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [address, setAddress] = useState<string>('Locating…');
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    // Nearest street from cityData
    const street = cityData.streets.length > 0
      ? cityData.streets[Math.floor(Math.random() * Math.min(cityData.streets.length, 5))]
      : null;
    const num = Math.floor(Math.random() * 60) + 1;
    setAddress(street ? `${street.name} ${num}` : cityData.name);

    if (!mapRef.current) return;
    let destroyed = false;

    import('maplibre-gl').then((mlgl) => {
      if (destroyed || !mapRef.current) return;

      const map = new mlgl.Map({
        container: mapRef.current,
        style: STYLE,
        center: [cityData.lon, cityData.lat],
        zoom: 17,
        attributionControl: false,
        pitchWithRotate: false,
        dragRotate: false,
      });

      map.on('idle', () => {
        if (!destroyed) setMapReady(true);
      });

      // Pin marker — red drop pin style
      const el = document.createElement('div');
      el.style.cssText = `
        width: 28px; height: 36px;
        background: #ff4d4f;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid #ffffff;
        box-shadow: 0 3px 12px rgba(0,0,0,0.5);
        cursor: pointer;
      `;
      const inner = document.createElement('div');
      inner.style.cssText = `
        width: 10px; height: 10px;
        background: #ffffff;
        border-radius: 50%;
        position: absolute;
        top: 6px; left: 6px;
      `;
      el.appendChild(inner);

      new mlgl.Marker({ element: el, anchor: 'bottom-left' })
        .setLngLat([cityData.lon, cityData.lat])
        .addTo(map);

      return () => {
        destroyed = true;
        map.remove();
      };
    }).catch(() => {});

    return () => { destroyed = true; };
  }, [cityData.lat, cityData.lon]);

  const CATEGORY_LABEL: Record<Category, string> = {
    Pothole: 'Pothole',
    'Traffic sign': 'Damaged traffic sign',
    'Road marking': 'Faded road marking',
    'Street light': 'Street light out',
    Manhole: 'Raised manhole cover',
    Other: 'Road defect',
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100dvh', overflow: 'hidden', background: '#0e2229', fontFamily: 'Manrope, system-ui, sans-serif', color: '#ffffff', display: 'flex', flexDirection: 'column' }}>

      {/* Map — fills top 60% */}
      <div
        ref={mapRef}
        style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '60%', background: '#0e2229' }}
      />

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
          cursor: 'pointer', zIndex: 10,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </button>

      {/* Photo thumbnail top-right */}
      {photo && photo !== 'fallback' && (
        <img
          src={`data:image/jpeg;base64,${photo}`}
          alt="Captured"
          style={{
            position: 'absolute',
            top: 'calc(12px + var(--safe-top, env(safe-area-inset-top, 0px)))',
            right: 16,
            width: 64, height: 64,
            borderRadius: 12,
            objectFit: 'cover',
            border: '2px solid #2a4650',
            zIndex: 10,
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
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 16px 0' }}>
          <div style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, background: '#3a5862', margin: '0 auto 16px' }} />

          <div style={{ font: '700 11px Manrope, sans-serif', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#3ddc97', marginBottom: 6 }}>
            Confirm location
          </div>
          <div style={{ font: '800 20px Manrope, sans-serif', marginBottom: 4 }}>
            Is this the right place?
          </div>
          <div style={{ font: '500 14px Manrope, sans-serif', color: '#a9b8bd', marginBottom: 20 }}>
            Move the map to adjust if needed
          </div>

          {/* Address card */}
          <div style={{
            background: '#132a33',
            border: '1px solid #2a4650',
            borderRadius: 16,
            padding: '14px 16px',
            display: 'flex', gap: 12, alignItems: 'center',
            marginBottom: 12,
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
              <div style={{ font: '700 15px Manrope, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{address}</div>
              <div style={{ font: '500 13px Manrope, sans-serif', color: '#a9b8bd' }}>{CATEGORY_LABEL[category]}</div>
            </div>
          </div>
        </div>

        {/* Confirm button — always visible */}
        <div style={{
          flexShrink: 0,
          padding: '12px 16px',
          paddingBottom: 'max(calc(var(--safe-bottom, 0px) + 12px), 36px)',
        }}>
          <button
            onClick={onConfirm}
            style={{
              width: '100%', height: 52,
              borderRadius: 26,
              background: '#3ddc97',
              border: 'none',
              color: '#06291b',
              font: '800 16px Manrope, sans-serif',
              cursor: 'pointer',
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
