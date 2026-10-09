import React, { useState } from 'react';
import type { AppSettings, CityData } from '@shared/types';

interface Props {
  settings: AppSettings;
  onUpdate: (s: AppSettings) => void;
  cityData: CityData;
  onCityUpdate: (name: string, lat: number, lon: number) => void;
}

const CATEGORIES = ['Pothole', 'Traffic sign', 'Road marking', 'Street light', 'Manhole', 'Other'];

const sectionStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 20,
  padding: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
};

const h2Style: React.CSSProperties = { margin: 0, font: '800 16px Manrope, sans-serif' };
const labelStyle: React.CSSProperties = { font: '600 13px Manrope, sans-serif', color: 'var(--text2)' };
const inputStyle: React.CSSProperties = {
  height: 38, borderRadius: 8, background: '#0f232b', border: '1px solid var(--line)',
  color: 'var(--text)', font: '500 14px Manrope, sans-serif', padding: '0 10px', width: '100%', boxSizing: 'border-box',
};

export function ConsoleSettings({ settings, onUpdate, cityData, onCityUpdate }: Props) {
  const [cityName, setCityName] = useState(cityData.name);
  const [cityLat, setCityLat] = useState(String(cityData.lat));
  const [cityLon, setCityLon] = useState(String(cityData.lon));

  function updatePriority(cat: string, val: number) {
    onUpdate({ ...settings, categoryPriorities: { ...settings.categoryPriorities, [cat]: val } });
  }

  function updateFixTarget(cat: string, val: number) {
    onUpdate({ ...settings, fixTimeTargets: { ...settings.fixTimeTargets, [cat]: val } });
  }

  function updateTemplate(key: 'accept' | 'decline', val: string) {
    onUpdate({ ...settings, notificationTemplates: { ...settings.notificationTemplates, [key]: val } });
  }

  function updateRole(idx: number, field: 'name' | 'email' | 'role', val: string) {
    const roles = settings.roles.map((r, i) => i === idx ? { ...r, [field]: val } : r);
    onUpdate({ ...settings, roles });
  }

  function addRole() {
    onUpdate({ ...settings, roles: [...settings.roles, { name: '', email: '', role: 'Staff' }] });
  }

  function applyCity() {
    const lat = parseFloat(cityLat);
    const lon = parseFloat(cityLon);
    if (!isNaN(lat) && !isNaN(lon) && cityName.trim()) {
      onCityUpdate(cityName.trim(), lat, lon);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ margin: 0, font: '800 30px Manrope, sans-serif' }}>Settings</h1>

      {/* Category priorities */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>Category priorities</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
          {CATEGORIES.map((cat) => (
            <label key={cat} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={labelStyle}>{cat}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number" min={1} max={100}
                  value={settings.categoryPriorities[cat] ?? 50}
                  onChange={(e) => updatePriority(cat, parseInt(e.target.value, 10) || 1)}
                  style={{ ...inputStyle, width: 70 }}
                />
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#1f3a44' }}>
                  <div style={{ height: 6, borderRadius: 3, width: `${settings.categoryPriorities[cat] ?? 50}%`, background: 'var(--mint)' }} />
                </div>
                <span style={{ font: '700 13px Manrope, sans-serif', minWidth: 32, textAlign: 'right' }}>{settings.categoryPriorities[cat] ?? 50}</span>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* Fix-time targets */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>Fix-time targets (days)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          {CATEGORIES.map((cat) => (
            <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ ...labelStyle, minWidth: 120 }}>{cat}</span>
              <input
                type="number" min={1} max={90}
                value={settings.fixTimeTargets[cat] ?? 14}
                onChange={(e) => updateFixTarget(cat, parseInt(e.target.value, 10) || 1)}
                style={{ ...inputStyle, width: 70 }}
              />
              <span style={{ font: '600 13px Manrope, sans-serif', color: 'var(--text2)' }}>days</span>
            </label>
          ))}
        </div>
      </section>

      {/* Notification templates */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>Notification message templates</h2>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={labelStyle}>When accepted and scheduled</span>
          <textarea
            rows={3}
            value={settings.notificationTemplates.accept}
            onChange={(e) => updateTemplate('accept', e.target.value)}
            style={{ borderRadius: 10, background: '#0f232b', border: '1px solid var(--line)', color: 'var(--text)', padding: '10px 12px', font: '500 14px Manrope, sans-serif', resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={labelStyle}>When declined</span>
          <textarea
            rows={3}
            value={settings.notificationTemplates.decline}
            onChange={(e) => updateTemplate('decline', e.target.value)}
            style={{ borderRadius: 10, background: '#0f232b', border: '1px solid var(--line)', color: 'var(--text)', padding: '10px 12px', font: '500 14px Manrope, sans-serif', resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
          />
        </label>
      </section>

      {/* City name and map centre */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>City name and map centre</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={labelStyle}>City name</span>
            <input style={inputStyle} value={cityName} onChange={(e) => setCityName(e.target.value)} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={labelStyle}>Latitude</span>
            <input style={inputStyle} type="number" step="0.0001" value={cityLat} onChange={(e) => setCityLat(e.target.value)} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={labelStyle}>Longitude</span>
            <input style={inputStyle} type="number" step="0.0001" value={cityLon} onChange={(e) => setCityLon(e.target.value)} />
          </label>
        </div>
        <button
          onClick={applyCity}
          style={{ alignSelf: 'flex-start', height: 40, padding: '0 20px', borderRadius: 10, background: 'var(--mint)', border: 0, color: 'var(--mint-text)', font: '700 13px Manrope, sans-serif', cursor: 'pointer' }}
        >
          Apply city
        </button>
      </section>

      {/* User roles */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>User roles</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 480, borderCollapse: 'collapse', font: '500 14px Manrope, sans-serif' }}>
            <thead>
              <tr style={{ textAlign: 'left' }}>
                {['Name', 'Email', 'Role'].map((h) => (
                  <th key={h} style={{ padding: '6px 10px', font: '700 11px Manrope, sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text2)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {settings.roles.map((r, idx) => (
                <tr key={idx} style={{ borderTop: '1px solid #1f3a44' }}>
                  <td style={{ padding: '8px 6px' }}>
                    <input
                      style={{ ...inputStyle, height: 34 }}
                      value={r.name}
                      onChange={(e) => updateRole(idx, 'name', e.target.value)}
                      placeholder="Name"
                    />
                  </td>
                  <td style={{ padding: '8px 6px' }}>
                    <input
                      style={{ ...inputStyle, height: 34 }}
                      value={r.email}
                      onChange={(e) => updateRole(idx, 'email', e.target.value)}
                      placeholder="email@city.fi"
                    />
                  </td>
                  <td style={{ padding: '8px 6px' }}>
                    <select
                      style={{ ...inputStyle, height: 34 }}
                      value={r.role}
                      onChange={(e) => updateRole(idx, 'role', e.target.value)}
                    >
                      <option>Admin</option>
                      <option>Staff</option>
                      <option>Viewer</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          onClick={addRole}
          style={{ alignSelf: 'flex-start', height: 38, padding: '0 16px', borderRadius: 10, background: 'transparent', border: '1px solid var(--line)', color: 'var(--text)', font: '600 13px Manrope, sans-serif', cursor: 'pointer' }}
        >
          + Add row
        </button>
      </section>
    </div>
  );
}
