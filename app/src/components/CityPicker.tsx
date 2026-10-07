import React from 'react';
import { CITIES } from '@shared/cities/index';
import type { CityData } from '@shared/types';

interface Props {
  onPick: (city: CityData) => void;
}

export default function CityPicker({ onPick }: Props) {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#0c1d24',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'Manrope, system-ui, sans-serif', color: '#fff',
      zIndex: 999,
    }}>
      <div style={{ padding: '32px 20px 16px' }}>
        <div style={{ font: '700 11px Manrope', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#3ddc97', marginBottom: 6 }}>
          Location access denied
        </div>
        <h1 style={{ margin: 0, font: '800 26px Manrope' }}>Choose a demo city</h1>
        <p style={{ margin: '8px 0 0', font: '500 14px Manrope', color: '#a9b8bd', lineHeight: 1.5 }}>
          Grant location permission to demo at your current location, or pick a city below.
        </p>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 32px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {CITIES.map((city) => (
          <button
            key={city.name}
            onClick={() => onPick(city)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#132a33', border: '1px solid #2a4650', borderRadius: 16,
              padding: '14px 16px', color: '#fff', cursor: 'pointer', textAlign: 'left',
            }}
          >
            <span style={{ font: '700 16px Manrope' }}>{city.name}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a9b8bd" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
