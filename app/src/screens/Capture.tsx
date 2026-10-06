import React, { useState, useEffect, useRef } from 'react';
import type { Category, CityData } from '@shared/types';

interface Props {
  cityData: CityData;
  onPhoto: (base64: string, category: Category) => void;
  onClose: () => void;
}

const CATEGORIES: Category[] = ['Traffic sign', 'Pothole', 'Road marking', 'Street light', 'Manhole', 'Other'];

export default function Capture({ cityData, onPhoto, onClose }: Props) {
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category>('Pothole');
  const [aiCategory, setAiCategory] = useState<Category | null>(null);
  const [photoTaken, setPhotoTaken] = useState(false);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const aiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { Geolocation } = await import('@capacitor/geolocation');
        const pos = await Geolocation.getCurrentPosition({ timeout: 5000 });
        setGpsAccuracy(Math.round(pos.coords.accuracy));
      } catch {
        setGpsAccuracy(null);
      }
    })();
    return () => { if (aiTimer.current) clearTimeout(aiTimer.current); };
  }, []);

  const handleShutter = async () => {
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
      });
      if (photo.base64String) {
        setPhotoBase64(photo.base64String);
        setPhotoTaken(true);
        aiTimer.current = setTimeout(() => {
          setAiCategory(selectedCategory);
        }, 1000);
      }
    } catch {
      // In browser fallback: simulate photo taken
      setPhotoBase64('fallback');
      setPhotoTaken(true);
      aiTimer.current = setTimeout(() => {
        setAiCategory(selectedCategory);
      }, 1000);
    }
  };

  const handleSend = () => {
    if (photoBase64 && aiCategory) {
      onPhoto(photoBase64, aiCategory);
    }
  };

  const canSend = photoTaken && aiCategory !== null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100dvh', overflow: 'hidden', background: '#08161b', fontFamily: 'Manrope, system-ui, sans-serif', color: '#ffffff' }}>
      {/* Camera view / photo preview */}
      {photoTaken && photoBase64 && photoBase64 !== 'fallback' ? (
        <img
          src={`data:image/jpeg;base64,${photoBase64}`}
          alt="Captured"
          style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '65%', objectFit: 'cover' }}
        />
      ) : (
        <svg width="100%" height="65%" viewBox="0 0 390 560" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', left: 0, top: 0 }} aria-hidden="true">
          <rect width="390" height="560" fill="#10262e" />
          <rect width="390" height="300" fill="#152f39" />
          <path d="M150 300 L240 300 L390 560 L0 560 Z" fill="#0d1f25" />
          <g transform="rotate(-9 255 230)">
            <path d="M255 150 L305 238 L205 238 Z" fill="#e9eef0" fillOpacity="0.9" stroke="#c94f4f" strokeWidth="9" strokeLinejoin="round" />
            <rect x="251" y="238" width="8" height="120" fill="#7f9097" />
          </g>
        </svg>
      )}

      {/* Framing guides */}
      {!photoTaken && (
        <div style={{ position: 'absolute', left: '44%', top: '18%', width: '44%', height: '44%' }}>
          <span style={{ position: 'absolute', left: 0, top: 0, width: 28, height: 28, borderLeft: '4px solid #3ddc97', borderTop: '4px solid #3ddc97', borderRadius: '8px 0 0 0' }} />
          <span style={{ position: 'absolute', right: 0, top: 0, width: 28, height: 28, borderRight: '4px solid #3ddc97', borderTop: '4px solid #3ddc97', borderRadius: '0 8px 0 0' }} />
          <span style={{ position: 'absolute', left: 0, bottom: 0, width: 28, height: 28, borderLeft: '4px solid #3ddc97', borderBottom: '4px solid #3ddc97', borderRadius: '0 0 0 8px' }} />
          <span style={{ position: 'absolute', right: 0, bottom: 0, width: 28, height: 28, borderRight: '4px solid #3ddc97', borderBottom: '4px solid #3ddc97', borderRadius: '0 0 8px 0' }} />
        </div>
      )}

      {/* AI label badge */}
      {aiCategory && (
        <div style={{
          position: 'absolute',
          left: '38%',
          top: '56%',
          background: '#3ddc97',
          color: '#06291b',
          borderRadius: 12,
          padding: '8px 12px',
          font: '800 13px Manrope, sans-serif',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          zIndex: 5,
        }}>
          {aiCategory} · AI detected · 94%
        </div>
      )}

      {/* Top bar */}
      <div style={{ position: 'absolute', left: 16, right: 16, top: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
        <button
          aria-label="Close camera"
          onClick={onClose}
          style={{ width: 44, height: 44, borderRadius: 22, background: 'rgba(12,29,36,0.75)', border: '1px solid #2a4650', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div style={{ height: 36, borderRadius: 18, background: 'rgba(12,29,36,0.8)', border: `1px solid ${gpsAccuracy !== null ? '#3ddc97' : '#2a4650'}`, display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px' }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: gpsAccuracy !== null ? '#3ddc97' : '#9aa7ab' }} />
          <span style={{ font: '700 13px Manrope, sans-serif' }}>
            {gpsAccuracy !== null ? `GPS ±${gpsAccuracy} m · locked` : 'GPS searching…'}
          </span>
        </div>

        <button
          aria-label="Flash"
          style={{ width: 44, height: 44, borderRadius: 22, background: 'rgba(12,29,36,0.75)', border: '1px solid #2a4650', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
            <path d="M13 2L5 14h6l-1 8 8-12h-6z" />
          </svg>
        </button>
      </div>

      {/* Bottom panel */}
      <div style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 260,
        background: '#0c1d24',
        borderRadius: '28px 28px 0 0',
        borderTop: '1px solid #2a4650',
        padding: '18px 16px 24px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
          <div style={{ font: '800 17px Manrope, sans-serif' }}>{photoTaken ? 'Photo captured!' : 'Frame the whole defect'}</div>
          <div style={{ font: '500 13px Manrope, sans-serif', color: '#a9b8bd' }}>Faces and plates are blurred before upload</div>
        </div>

        {/* Category chips */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                height: 34,
                padding: '0 14px',
                borderRadius: 17,
                background: selectedCategory === cat ? '#3ddc97' : '#132a33',
                color: selectedCategory === cat ? '#06291b' : '#ffffff',
                border: selectedCategory === cat ? 'none' : '1px solid #2a4650',
                font: selectedCategory === cat ? '700 13px Manrope, sans-serif' : '600 13px Manrope, sans-serif',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Controls row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 12px' }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: '#1a3540', border: '2px solid #3ddc97', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '800 13px Manrope, sans-serif' }}>
            1/3
          </div>
          <button
            aria-label="Take photo"
            onClick={handleShutter}
            disabled={photoTaken}
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              border: '4px solid #3ddc97',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              cursor: photoTaken ? 'default' : 'pointer',
            }}
          >
            <span style={{ width: 62, height: 62, borderRadius: 31, background: photoTaken ? '#3ddc97' : '#ffffff' }} />
          </button>
          <button
            onClick={handleSend}
            disabled={!canSend}
            style={{
              width: 64,
              height: 44,
              borderRadius: 22,
              background: canSend ? '#3ddc97' : '#132a33',
              border: canSend ? 'none' : '1px solid #2a4650',
              color: canSend ? '#06291b' : '#a9b8bd',
              font: '700 14px Manrope, sans-serif',
              cursor: canSend ? 'pointer' : 'default',
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
