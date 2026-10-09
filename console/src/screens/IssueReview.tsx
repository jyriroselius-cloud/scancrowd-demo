import React, { useState, useRef, useEffect } from 'react';
import type { Issue, CityData } from '@shared/types';
import { StatusPill } from '../components/StatusPill';
import IMAGE_COUNTS from 'virtual:image-counts';

interface Props {
  issue: Issue;
  cityData: CityData;
  allIssues: Issue[];
  onBack: () => void;
  onUpdate: (updated: Issue) => void;
  onMerge: (sourceId: string, targetId: string) => void;
}

interface Detection {
  label: string;
  confidence: number;
  box: [number, number, number, number]; // [x, y, w, h] in pixels at 1280px width
}

interface ImageMeta {
  category: string;
  width: number;
  height: number;
  detections: Detection[];
}

// Map Issue category to image folder
const FOLDER_MAP: Record<string, string> = {
  Pothole:        'pothole',
  'Traffic sign': 'sign',
  'Road marking': 'marking',
  'Street light': 'pothole',
  Manhole:        'manhole',
  Other:          'crack',
};

// ScanwAi detection labels expected for each Issue category.
// An image is only valid for a category if its sidecar has ≥1 matching label.
const CATEGORY_LABELS: Record<string, string[]> = {
  Pothole:        ['pothole', 'crocodile_crack'],
  Other:          ['line_crack', 'crack'],
  'Street light': ['pothole', 'crocodile_crack'],
  Manhole:        ['manhole_cover', 'manhole'],
  'Traffic sign': ['traffic_sign', 'sign'],
  'Road marking': ['road_marking', 'marking'],
};

function detectionsMatchCategory(category: string, detections: Detection[]): boolean {
  const expected = CATEGORY_LABELS[category];
  if (!expected) return true;
  return detections.some((d) =>
    expected.some((lbl) => d.label === lbl || d.label.includes(lbl) || lbl.includes(d.label))
  );
}

// IMAGE_COUNTS is injected at build time from virtual:image-counts
// (reads console/public/images/ — never goes out of sync)

// Mulberry32 mini-hash for picking an image index by issue id
function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function getImagePath(issue: Issue): string | null {
  const folder = FOLDER_MAP[issue.category] ?? null;
  if (!folder) return null;
  const count = IMAGE_COUNTS[folder] ?? 0;
  if (count === 0) return null;
  return getImagePathFor(folder, issue.id, count);
}

function getImagePathFor(folder: string, id: string, count: number): string {
  const idx = (hashId(id) % count) + 1;
  const n = String(idx).padStart(2, '0');
  return `/images/${folder}/${folder}-${n}`;
}

function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

const WEEKS = Array.from({ length: 8 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + (i + 1) * 7);
  const wk = isoWeek(d);
  return `Week ${wk} · ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
});

export function IssueReview({ issue, cityData, allIssues, onBack, onUpdate, onMerge }: Props) {
  const [crew, setCrew] = useState('Street maintenance · crew North');
  const [plannedWeek, setPlannedWeek] = useState(WEEKS[1]);
  const [message, setMessage] = useState(`Thanks for reporting! The repair is planned for ${WEEKS[1].split(' · ')[0]}.`);
  const [notify, setNotify] = useState(true);
  const [toast, setToast] = useState('');
  const [showMerge, setShowMerge] = useState(false);

  // Candidates: same category, different id, not declined/fixed
  const mergeCandidates = allIssues
    .filter((i) => i.id !== issue.id && i.category === issue.category && i.status !== 'Declined' && i.status !== 'Fixed')
    .slice(0, 5);
  const [meta, setMeta] = useState<ImageMeta | null>(null);
  const [metaValid, setMetaValid] = useState<boolean | null>(null); // null = loading
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const basePath = getImagePath(issue);
  const metaUrl = basePath ? `${basePath}.json` : null;
  // Show image only after sidecar confirms category match (null = still loading, show img optimistically)
  const imgSrc = basePath && metaValid !== false ? `${basePath}.jpg` : null;

  // Load sidecar JSON and validate category match
  useEffect(() => {
    if (!metaUrl) { setMeta(null); setMetaValid(null); return; }
    setMeta(null);
    setMetaValid(null);
    fetch(metaUrl)
      .then((r) => r.ok ? r.json() : null)
      .then((d: ImageMeta | null) => {
        setMeta(d);
        if (d) {
          setMetaValid(detectionsMatchCategory(issue.category, d.detections));
        } else {
          setMetaValid(null); // no sidecar: allow image (legacy)
        }
      })
      .catch(() => { setMetaValid(null); });
  }, [metaUrl, issue.category]);

  // Track rendered image size for box scaling
  useEffect(() => {
    if (!imgRef.current) return;
    const el = imgRef.current;
    function update() {
      setImgSize({ w: el.clientWidth, h: el.clientHeight });
    }
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [imgSrc]);

  const confidence = 85 + Math.floor(Math.abs(issue.id.charCodeAt(3) - 48) * 2);

  function handleAccept() {
    const week = plannedWeek.split(' · ')[0];
    const updated: Issue = { ...issue, status: 'Planned', plannedWeek: week.replace('Week ', 'Wk ') };
    onUpdate(updated);
    setToast(`${issue.reports} reporters notified`);
    setTimeout(() => setToast(''), 3000);
  }

  function handleDecline() {
    onUpdate({ ...issue, status: 'Declined' });
    onBack();
  }

  // Render detection boxes scaled from source image dimensions to displayed size
  function renderBoxes() {
    if (!meta || !imgSize || meta.detections.length === 0) return null;
    const scaleX = imgSize.w / meta.width;
    const scaleY = imgSize.h / meta.height;
    return (
      <svg
        data-testid="detection-boxes"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        viewBox={`0 0 ${imgSize.w} ${imgSize.h}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        {meta.detections.map((d, i) => {
          const [bx, by, bw, bh] = d.box;
          const x = bx * scaleX, y = by * scaleY, w = bw * scaleX, h = bh * scaleY;
          const label = d.label.replace(/_/g, ' ');
          return (
            <g key={i}>
              <rect
                x={x} y={y} width={w} height={h}
                fill="none" stroke="var(--mint)" strokeWidth="2"
              />
              <rect x={x} y={Math.max(0, y - 20)} width={Math.min(label.length * 7.5 + 8, imgSize.w - x)} height={20}
                fill="var(--mint)" />
              <text
                x={x + 4} y={Math.max(0, y - 6)}
                fontFamily="Manrope, sans-serif" fontSize="11" fontWeight="700"
                fill="var(--mint-text)"
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* breadcrumb */}
      <div style={{ font: '600 13px Manrope, sans-serif', color: 'var(--text2)' }}>
        <button onClick={onBack} style={{ background: 'none', border: 0, color: 'var(--mint)', font: 'inherit', cursor: 'pointer', padding: 0 }}>Work queue</button>
        {' / '}{issue.id}
      </div>

      {/* title row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, font: '800 30px Manrope, sans-serif' }}>{issue.title}</h1>
            <StatusPill status={issue.status} size="md" />
          </div>
          <div style={{ font: '500 14px Manrope, sans-serif', color: 'var(--text2)', marginTop: 4 }}>
            {issue.address} · first reported {issue.firstReported} · {issue.reports} report{issue.reports !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={handleDecline} style={{ height: 44, padding: '0 18px', borderRadius: 12, background: 'transparent', border: '1px solid var(--line)', color: 'var(--text)', font: '700 14px Manrope, sans-serif' }}>Decline</button>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMerge((v) => !v)}
              style={{ height: 44, padding: '0 18px', borderRadius: 12, background: 'transparent', border: '1px solid var(--line)', color: 'var(--text)', font: '700 14px Manrope, sans-serif', cursor: 'pointer' }}
            >
              Merge into…
            </button>
            {showMerge && (
              <div style={{ position: 'absolute', top: '110%', right: 0, zIndex: 100, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 12, minWidth: 260, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                <div style={{ font: '700 12px Manrope, sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text2)', marginBottom: 8 }}>
                  Merge into…
                </div>
                {mergeCandidates.length === 0 ? (
                  <div style={{ font: '500 13px Manrope, sans-serif', color: 'var(--text3)' }}>No similar issues found.</div>
                ) : (
                  mergeCandidates.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { onMerge(issue.id, c.id); setShowMerge(false); }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 8, background: 'transparent', border: 0, color: 'var(--text)', cursor: 'pointer', font: '500 13px Manrope, sans-serif' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--raised)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span style={{ fontWeight: 700 }}>{c.id}</span> — {c.title}
                      <span style={{ color: 'var(--text2)', marginLeft: 6 }}>{c.address}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        {/* left column */}
        <div style={{ flex: '3 1 520px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* photo */}
          <section style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 20, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ borderRadius: 14, overflow: 'hidden', background: '#152f39', position: 'relative' }}>
              {imgSrc ? (
                <>
                  <img
                    ref={imgRef}
                    src={imgSrc}
                    alt={`${issue.category} defect`}
                    data-testid="issue-photo"
                    style={{ display: 'block', width: '100%', height: 'auto', minHeight: 200 }}
                    onLoad={() => {
                      const el = imgRef.current;
                      if (el) setImgSize({ w: el.clientWidth, h: el.clientHeight });
                    }}
                  />
                  {renderBoxes()}
                </>
              ) : (
                <div
                  data-testid="issue-photo-placeholder"
                  style={{ height: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text3)' }}
                >
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="4" y="10" width="40" height="28" rx="4" stroke="currentColor" strokeWidth="2" fill="none"/>
                    <circle cx="24" cy="24" r="7" stroke="currentColor" strokeWidth="2" fill="none"/>
                    <path d="M18 10 L20 6 H28 L30 10" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round"/>
                    <line x1="36" y1="16" x2="39" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <div style={{ font: '600 13px Manrope, sans-serif' }}>No photo for {issue.category}</div>
                </div>
              )}
            </div>
            {/* Credit line — only when photo is shown */}
            {imgSrc && (
              <div style={{ font: '500 11px Manrope, sans-serif', color: 'var(--text3)', textAlign: 'right' }}>
                Detections by ScanwAi
              </div>
            )}
            {/* Thumbnail strip — show up to 4 other images from the same category */}
            {(() => {
              const folder = FOLDER_MAP[issue.category];
              const count = folder ? (IMAGE_COUNTS[folder] ?? 0) : 0;
              if (count < 2 || !folder) return null;
              const mainIdx = (hashId(issue.id) % count) + 1;
              const thumbs: number[] = [];
              for (let k = 1; k <= count && thumbs.length < 4; k++) {
                const idx = (mainIdx % count) + k > count ? k : (mainIdx + k - 1) % count + 1;
                if (idx !== mainIdx) thumbs.push(idx);
              }
              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
                  {thumbs.map((idx) => {
                    const n = String(idx).padStart(2, '0');
                    const src = `/images/${folder}/${folder}-${n}.jpg`;
                    return (
                      <img
                        key={idx}
                        src={src}
                        alt=""
                        style={{ height: 64, width: '100%', objectFit: 'cover', borderRadius: 10, background: 'var(--raised)' }}
                      />
                    );
                  })}
                </div>
              );
            })()}
          </section>

          {/* AI analysis */}
          <section style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 20, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, font: '800 16px Manrope, sans-serif' }}>AI analysis</h2>
              <span style={{ font: '700 11px Manrope, sans-serif', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mint)' }}>ScanwAi</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
              {[
                { label: 'Category', value: `${issue.category}` },
                { label: 'Confidence', value: `${confidence} %` },
                { label: 'Severity', value: `${issue.severity} / 5`, red: issue.severity >= 4 },
                { label: 'Privacy', value: 'Blurred' },
              ].map((item) => (
                <div key={item.label} style={{ background: '#0f232b', borderRadius: 12, padding: 12 }}>
                  <div style={{ font: '600 12px Manrope, sans-serif', color: 'var(--text2)' }}>{item.label}</div>
                  <div style={{ font: '800 16px Manrope, sans-serif', color: item.red ? '#ff8a8a' : 'var(--text)' }}>{item.value}</div>
                </div>
              ))}
            </div>
            <div style={{ font: '500 13px Manrope, sans-serif', color: 'var(--text3)' }}>
              {issue.reports} report{issue.reports !== 1 ? 's' : ''} within 15 m merged automatically.
            </div>
          </section>
        </div>

        {/* right column */}
        <div style={{ flex: '2 1 340px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Repair priority */}
          <section style={{ background: 'rgba(61,220,151,0.08)', border: '1px solid rgba(61,220,151,0.45)', borderRadius: 20, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ font: '700 11px Manrope, sans-serif', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mint)' }}>Repair priority</span>
              <span style={{ font: '800 22px Manrope, sans-serif' }}>{issue.priority}<span style={{ fontSize: 13, color: 'var(--text2)' }}> / 100</span></span>
            </div>
            <div style={{ font: '800 20px Manrope, sans-serif' }}>{issue.priority >= 75 ? 'Repair now' : issue.priority >= 50 ? 'Schedule soon' : 'Low priority'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, font: '500 13px Manrope, sans-serif', color: 'var(--text3)' }}>
              {issue.priority >= 70 && <div>High-traffic segment · pedestrian path nearby</div>}
              <div>Deferring 3 months: damage area roughly doubles</div>
              <div>Repair cost if deferred: +€ [estimate]</div>
              <div>CO₂ effect, repair now vs. deferral: [t CO₂e]</div>
            </div>
          </section>

          {/* Accept form */}
          <section style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 20, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h2 style={{ margin: 0, font: '800 16px Manrope, sans-serif' }}>Accept and schedule</h2>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, font: '600 13px Manrope, sans-serif', color: 'var(--text2)' }}>Assign to
              <select value={crew} onChange={(e) => setCrew(e.target.value)} style={{ height: 44, borderRadius: 12, background: '#0f232b', border: '1px solid var(--line)', color: 'var(--text)', padding: '0 12px', font: '600 14px Manrope, sans-serif' }}>
                <option>Street maintenance · crew North</option>
                <option>Street maintenance · crew South</option>
                <option>Contractor · [name]</option>
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, font: '600 13px Manrope, sans-serif', color: 'var(--text2)' }}>Planned fix
              <select value={plannedWeek} onChange={(e) => setPlannedWeek(e.target.value)} style={{ height: 44, borderRadius: 12, background: '#0f232b', border: '1px solid var(--line)', color: 'var(--text)', padding: '0 12px', font: '600 14px Manrope, sans-serif' }}>
                {WEEKS.map((w) => <option key={w}>{w}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, font: '600 13px Manrope, sans-serif', color: 'var(--text2)' }}>Message to reporters
              <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} style={{ borderRadius: 12, background: '#0f232b', border: '1px solid var(--line)', color: 'var(--text)', padding: '10px 12px', font: '500 14px Manrope, sans-serif', resize: 'vertical' }} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, font: '600 14px Manrope, sans-serif' }}>
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} style={{ width: 20, height: 20, accentColor: 'var(--mint)' }} />
              Notify {issue.reports} reporter{issue.reports !== 1 ? 's' : ''} and award +10 points
            </label>
            <button onClick={handleAccept} style={{ height: 52, borderRadius: 14, background: 'var(--mint)', border: 0, color: 'var(--mint-text)', font: '800 15px Manrope, sans-serif', cursor: 'pointer' }}>
              Accept and schedule
            </button>
          </section>

          {/* activity */}
          <section style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 20, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h2 style={{ margin: 0, font: '800 16px Manrope, sans-serif' }}>Activity</h2>
            <div style={{ font: '500 13px Manrope, sans-serif', color: 'var(--text3)' }}>First reported {issue.firstReported}</div>
            {issue.reports > 1 && <div style={{ font: '500 13px Manrope, sans-serif', color: 'var(--text3)' }}>{issue.reports - 1} additional confirmations</div>}
          </section>
        </div>
      </div>

      {/* toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 32, right: 32, background: 'var(--mint)', color: 'var(--mint-text)', borderRadius: 14, padding: '12px 20px', font: '700 15px Manrope, sans-serif', boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}>
          {toast}
        </div>
      )}
    </div>
  );
}
