import React, { useState } from 'react';

interface Props {
  onContinue: () => void;
}

export default function Welcome({ onContinue }: Props) {
  const [loading, setLoading] = useState(false);
  const [exactAlarmHint, setExactAlarmHint] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      await Geolocation.requestPermissions();
    } catch { /* browser fallback */ }
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.requestPermissions();
      const status = await LocalNotifications.checkPermissions();
      if (status.display !== 'granted') setExactAlarmHint(true);
    } catch { /* browser fallback */ }
    onContinue();
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100dvh',
        background: '#0c1d24',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
        fontFamily: 'Manrope, system-ui, sans-serif',
        color: '#ffffff',
      }}
    >
      {/* Street grid background */}
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 390 844"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: 'absolute', inset: 0, opacity: 0.4 }}
        aria-hidden="true"
      >
        <rect width="390" height="844" fill="#0c1d24" />
        <g stroke="#1b3943" strokeWidth="14" fill="none" strokeLinecap="round">
          <path d="M-10 230 L400 190" />
          <path d="M-10 500 L400 460" />
          <path d="M120 -10 L150 860" />
          <path d="M270 -10 L300 860" />
        </g>
        <g stroke="#162f38" strokeWidth="6" fill="none" strokeLinecap="round">
          <path d="M-10 120 L400 95" />
          <path d="M-10 380 L400 350" />
          <path d="M-10 620 L400 600" />
          <path d="M50 -10 L70 860" />
          <path d="M200 -10 L225 860" />
          <path d="M345 -10 L360 860" />
        </g>
      </svg>

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40, padding: '0 32px', width: '100%', maxWidth: 390, boxSizing: 'border-box' }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: 24,
            background: '#132a33',
            border: '2px solid #2a4650',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 16px 40px rgba(0,0,0,0.4)',
          }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#3ddc97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
          </div>
          <div style={{ font: '800 32px Manrope, sans-serif', letterSpacing: '-0.5px' }}>ScanCrowd</div>
          <div style={{ font: '500 16px Manrope, sans-serif', color: '#a9b8bd', textAlign: 'center' }}>
            Report road issues. Earn points.
          </div>
        </div>

        {/* Permission bullets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
          {[
            { icon: '📍', text: 'Location to map issues near you' },
            { icon: '📷', text: 'Camera to photograph defects' },
            { icon: '🔔', text: 'Notifications when issues are fixed' },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div
                style={{
                  display: 'flex',
                  gap: 16,
                  alignItems: 'center',
                  background: '#132a33',
                  borderRadius: exactAlarmHint && icon === '🔔' ? '16px 16px 0 0' : 16,
                  padding: '14px 16px',
                  border: '1px solid #2a4650',
                  borderBottom: exactAlarmHint && icon === '🔔' ? 'none' : '1px solid #2a4650',
                }}
              >
                <span style={{ fontSize: 22 }}>{icon}</span>
                <span style={{ font: '600 14px Manrope, sans-serif' }}>{text}</span>
              </div>
              {exactAlarmHint && icon === '🔔' && (
                <div style={{
                  background: '#132a33',
                  borderRadius: '0 0 16px 16px',
                  padding: '8px 16px 12px 52px',
                  border: '1px solid #2a4650',
                  borderTop: '1px solid #1a3540',
                  font: '500 12px Manrope, sans-serif',
                  color: '#a9b8bd',
                }}>
                  Enable exact alarms in Settings for precise timing
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={handleStart}
          disabled={loading}
          style={{
            width: '100%',
            height: 56,
            borderRadius: 28,
            background: loading ? '#2a4650' : '#3ddc97',
            color: '#06291b',
            border: 'none',
            font: '800 17px Manrope, sans-serif',
            cursor: loading ? 'default' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {loading ? 'Setting up…' : 'Get started'}
        </button>
      </div>
    </div>
  );
}
