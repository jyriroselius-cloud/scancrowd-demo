import React, { useState } from 'react';
import type { Category, CityData } from '@shared/types';

interface Props {
  photo: string;
  category: Category;
  cityData: CityData;
  userLat: number;
  userLon: number;
  onSend: (note: string, category: Category) => void;
  onBack: () => void;
}

const CATEGORIES: Category[] = ['Pothole', 'Traffic sign', 'Road marking', 'Street light', 'Manhole', 'Other'];

export default function ReportDetails({ photo, category: initialCategory, cityData, onSend, onBack }: Props) {
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<Category>(initialCategory);
  const [sending, setSending] = useState(false);

  const nearestStreet = cityData.streets[Math.floor(Math.random() * cityData.streets.length)];
  const address = nearestStreet ? `${nearestStreet.name} ${Math.floor(Math.random() * 50) + 1}, ${cityData.name}` : cityData.name;

  const handleSend = () => {
    setSending(true);
    setTimeout(() => {
      onSend(note, category);
    }, 800);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100dvh', overflow: 'hidden', background: '#0c1d24', fontFamily: 'Manrope, system-ui, sans-serif', color: '#ffffff', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 16px 16px', flexShrink: 0 }}>
        <button
          onClick={onBack}
          style={{ width: 44, height: 44, borderRadius: 22, background: '#132a33', border: '1px solid #2a4650', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <h1 style={{ margin: 0, font: '800 20px Manrope, sans-serif' }}>Review report</h1>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Photo */}
        {photo && photo !== 'fallback' ? (
          <img
            src={`data:image/jpeg;base64,${photo}`}
            alt="Report"
            style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 16, border: '1px solid #2a4650' }}
          />
        ) : (
          <div style={{ width: '100%', height: 180, borderRadius: 16, background: '#132a33', border: '1px solid #2a4650', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3ddc97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" />
            </svg>
            <span style={{ font: '600 13px Manrope, sans-serif', color: '#a9b8bd' }}>Photo captured</span>
          </div>
        )}

        {/* Category */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ font: '700 12px Manrope, sans-serif', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#3ddc97' }}>Category</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                style={{
                  height: 34,
                  padding: '0 14px',
                  borderRadius: 17,
                  background: category === cat ? '#3ddc97' : '#132a33',
                  color: category === cat ? '#06291b' : '#ffffff',
                  border: category === cat ? 'none' : '1px solid #2a4650',
                  font: category === cat ? '700 13px Manrope, sans-serif' : '600 13px Manrope, sans-serif',
                  cursor: 'pointer',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Address */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ font: '700 12px Manrope, sans-serif', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#3ddc97' }}>Location</label>
          <div style={{ background: '#132a33', borderRadius: 12, padding: '12px 14px', border: '1px solid #2a4650', display: 'flex', gap: 10, alignItems: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a9b8bd" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" />
            </svg>
            <span style={{ font: '500 14px Manrope, sans-serif' }}>{address}</span>
          </div>
        </div>

        {/* Note */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ font: '700 12px Manrope, sans-serif', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#3ddc97' }}>Note</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add a note (optional)"
            rows={3}
            style={{
              background: '#132a33',
              border: '1px solid #2a4650',
              borderRadius: 12,
              padding: '12px 14px',
              color: '#ffffff',
              font: '500 14px Manrope, sans-serif',
              resize: 'none',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Send button */}
      <div style={{ padding: '12px 16px 24px', flexShrink: 0 }}>
        <button
          onClick={handleSend}
          disabled={sending}
          style={{
            width: '100%',
            height: 56,
            borderRadius: 28,
            background: sending ? '#2a4650' : '#3ddc97',
            color: '#06291b',
            border: 'none',
            font: '800 17px Manrope, sans-serif',
            cursor: sending ? 'default' : 'pointer',
          }}
        >
          {sending ? 'Sending…' : 'Send report'}
        </button>
      </div>
    </div>
  );
}
