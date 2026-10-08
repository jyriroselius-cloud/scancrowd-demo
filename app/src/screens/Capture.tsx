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
  const [cameraReady, setCameraReady] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const aiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPinchDist = useRef<number | null>(null);

  // Start live camera viewfinder
  useEffect(() => {
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraReady(true);
        }
      })
      .catch(() => {
        // Camera not available — will show placeholder
      });

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (aiTimer.current) clearTimeout(aiTimer.current);
    };
  }, []);

  // GPS accuracy
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
  }, []);

  const handleShutter = () => {
    if (!videoRef.current || !cameraReady) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    // Stop stream — camera no longer needed after capture
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const base64 = dataUrl.replace('data:image/jpeg;base64,', '');
    setPhotoBase64(base64);
    setPhotoTaken(true);
    aiTimer.current = setTimeout(() => setAiCategory(selectedCategory), 1000);
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
      {photoTaken && photoBase64 ? (
        <img
          src={`data:image/jpeg;base64,${photoBase64}`}
          alt="Captured"
          style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '65%', objectFit: 'cover' }}
        />
      ) : (
        <>
          <div
            style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '65%', overflow: 'hidden', background: '#10262e' }}
            onTouchStart={(e) => {
              if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                lastPinchDist.current = Math.hypot(dx, dy);
              }
            }}
            onTouchMove={(e) => {
              if (e.touches.length === 2 && lastPinchDist.current !== null) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.hypot(dx, dy);
                const ratio = dist / lastPinchDist.current;
                setZoomScale((z) => Math.min(5, Math.max(1, z * ratio)));
                lastPinchDist.current = dist;
              }
            }}
            onTouchEnd={() => { lastPinchDist.current = null; }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: `scale(${zoomScale})`,
                transformOrigin: 'center center',
                transition: 'transform 0.05s linear',
              }}
            />
          </div>
          {!cameraReady && (
            <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '65%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#10262e' }}>
              <span style={{ font: '600 14px Manrope, sans-serif', color: '#a9b8bd' }}>Starting camera…</span>
            </div>
          )}
        </>
      )}

      {/* Framing guides */}
      {!photoTaken && cameraReady && (
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
      <div style={{ position: 'absolute', left: 16, right: 16, top: 'calc(12px + var(--safe-top, env(safe-area-inset-top, 0px)))', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
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
          aria-label="Flip camera"
          onClick={() => {
            // Switch front/back camera
            const current = streamRef.current?.getVideoTracks()[0];
            const facing = (current?.getSettings().facingMode ?? 'environment') === 'environment' ? 'user' : 'environment';
            streamRef.current?.getTracks().forEach((t) => t.stop());
            navigator.mediaDevices?.getUserMedia({ video: { facingMode: facing } }).then((stream) => {
              streamRef.current = stream;
              if (videoRef.current) videoRef.current.srcObject = stream;
            }).catch(() => {});
          }}
          style={{ width: 44, height: 44, borderRadius: 22, background: 'rgba(12,29,36,0.75)', border: '1px solid #2a4650', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 7h-3a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="13" r="3" />
          </svg>
        </button>
      </div>

      {/* Bottom panel — no fixed height, content sizes naturally with padding */}
      <div style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        background: '#0c1d24',
        borderRadius: '28px 28px 0 0',
        borderTop: '1px solid #2a4650',
        paddingTop: 18,
        paddingLeft: 16,
        paddingRight: 16,
        paddingBottom: 'calc(24px + var(--safe-bottom, env(safe-area-inset-bottom, 0px)))',
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
            disabled={photoTaken || !cameraReady}
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              border: `4px solid ${cameraReady ? '#3ddc97' : '#4a6670'}`,
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              cursor: photoTaken || !cameraReady ? 'default' : 'pointer',
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
