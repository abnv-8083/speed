import React from 'react';
import { CheckCircle } from 'lucide-react';

const TEMPLATES = [
  {
    id: 'modern',
    name: 'Modern',
    desc: 'Clean two-column layout with a colorful sidebar.',
    accent: '#4F46E5',
    tag: 'Popular',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    desc: 'Elegant single-column design, perfect for creatives.',
    accent: '#0f172a',
    tag: 'Clean',
  },
  {
    id: 'executive',
    name: 'Executive',
    desc: 'Bold header with a professional classic look.',
    accent: '#b45309',
    tag: 'Corporate',
  },
  {
    id: 'creative',
    name: 'Creative',
    desc: 'Vibrant gradient sidebar — stand out from the crowd.',
    accent: '#ec4899',
    tag: 'Bold',
  },
  {
    id: 'tech',
    name: 'Tech',
    desc: 'Dark, terminal-inspired layout for developers.',
    accent: '#10b981',
    tag: 'Dev',
  },
  {
    id: 'elegant',
    name: 'Elegant',
    desc: 'Serif typography with decorative accents and classic lines.',
    accent: '#7c3aed',
    tag: 'Premium',
  },
  {
    id: 'ats',
    name: 'ATS-Friendly',
    desc: 'Plain single-column layout, optimized for Applicant Tracking Systems.',
    accent: '#16a34a',
    tag: 'ATS-Safe',
  },
];

function TemplateMiniPreview({ id, accent }) {
  /* ── Modern ── */
  if (id === 'modern') {
    return (
      <div className="tpl-mini" style={{ display: 'flex', height: '100%' }}>
        <div style={{ width: '38%', background: accent, padding: '8px', borderRadius: '6px 0 0 6px' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', margin: '0 auto 6px' }} />
          {[60, 50, 70, 45].map((w, i) => (
            <div key={i} style={{ height: 4, width: `${w}%`, background: 'rgba(255,255,255,0.4)', borderRadius: 2, marginBottom: 4 }} />
          ))}
        </div>
        <div style={{ flex: 1, padding: '8px', background: 'white', borderRadius: '0 6px 6px 0' }}>
          {[80, 60, 90, 50, 70, 55].map((w, i) => (
            <div key={i} style={{ height: 4, width: `${w}%`, background: i % 3 === 0 ? accent : '#e2e8f0', borderRadius: 2, marginBottom: 5, opacity: i % 3 === 0 ? 1 : 0.6 }} />
          ))}
        </div>
      </div>
    );
  }

  /* ── Minimal ── */
  if (id === 'minimal') {
    return (
      <div className="tpl-mini" style={{ padding: 10, background: 'white', borderRadius: 6 }}>
        <div style={{ height: 7, width: '55%', background: accent, borderRadius: 3, marginBottom: 5 }} />
        <div style={{ height: 3, width: '38%', background: '#94a3b8', borderRadius: 2, marginBottom: 8 }} />
        <div style={{ height: 1, background: '#e2e8f0', marginBottom: 7 }} />
        {[90, 70, 80, 65, 75, 60].map((w, i) => (
          <div key={i} style={{ height: 3, width: `${w}%`, background: '#e2e8f0', borderRadius: 2, marginBottom: 4 }} />
        ))}
      </div>
    );
  }

  /* ── Executive ── */
  if (id === 'executive') {
    return (
      <div className="tpl-mini" style={{ background: 'white', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ background: accent, padding: '10px 8px' }}>
          <div style={{ height: 7, width: '55%', background: 'rgba(255,255,255,0.9)', borderRadius: 3, marginBottom: 4 }} />
          <div style={{ height: 3, width: '35%', background: 'rgba(255,255,255,0.5)', borderRadius: 2 }} />
        </div>
        <div style={{ padding: 8 }}>
          {[80, 60, 70, 50, 65].map((w, i) => (
            <div key={i} style={{ height: 3, width: `${w}%`, background: '#e2e8f0', borderRadius: 2, marginBottom: 5 }} />
          ))}
        </div>
      </div>
    );
  }

  /* ── Creative ── */
  if (id === 'creative') {
    return (
      <div className="tpl-mini" style={{ display: 'flex', height: '100%' }}>
        <div style={{ width: '8px', background: `linear-gradient(180deg, #ec4899, #a855f7, #6366f1)`, borderRadius: '6px 0 0 6px', flexShrink: 0 }} />
        <div style={{ flex: 1, padding: '8px 10px', background: 'white', borderRadius: '0 6px 6px 0' }}>
          <div style={{ height: 7, width: '65%', background: '#1e293b', borderRadius: 3, marginBottom: 3 }} />
          <div style={{ height: 3, width: '40%', background: accent, borderRadius: 2, marginBottom: 8 }} />
          {[85, 65, 75, 55, 70, 50].map((w, i) => (
            <div key={i} style={{ height: 3, width: `${w}%`, background: i % 4 === 0 ? accent : '#e2e8f0', borderRadius: 2, marginBottom: 4, opacity: i % 4 === 0 ? 0.8 : 0.5 }} />
          ))}
          <div style={{ display: 'flex', gap: 3, marginTop: 6, flexWrap: 'wrap' }}>
            {[30, 40, 28, 35].map((w, i) => (
              <div key={i} style={{ height: 10, width: w, background: `linear-gradient(90deg, #ec4899, #a855f7)`, borderRadius: 10, opacity: 0.6 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── Tech ── */
  if (id === 'tech') {
    return (
      <div className="tpl-mini" style={{ background: '#0f172a', borderRadius: 6, padding: '8px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
          {['#ef4444', '#f59e0b', '#22c55e'].map((c, i) => (
            <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: c }} />
          ))}
        </div>
        <div style={{ height: 5, width: '55%', background: accent, borderRadius: 2, marginBottom: 4 }} />
        <div style={{ height: 3, width: '35%', background: 'rgba(16,185,129,0.5)', borderRadius: 2, marginBottom: 7 }} />
        {[80, 60, 70, 50, 65, 45].map((w, i) => (
          <div key={i} style={{ height: 3, width: `${w}%`, background: i % 3 === 0 ? 'rgba(16,185,129,0.7)' : 'rgba(255,255,255,0.15)', borderRadius: 2, marginBottom: 4 }} />
        ))}
        <div style={{ display: 'flex', gap: 3, marginTop: 4, flexWrap: 'wrap' }}>
          {[28, 36, 24, 30].map((w, i) => (
            <div key={i} style={{ height: 9, width: w, background: 'rgba(16,185,129,0.25)', borderRadius: 2, border: '1px solid rgba(16,185,129,0.4)' }} />
          ))}
        </div>
      </div>
    );
  }

  /* ── ATS ── */
  if (id === 'ats') {
    return (
      <div className="tpl-mini" style={{ padding: '8px 10px', background: 'white', borderRadius: 6, fontFamily: 'Arial, sans-serif' }}>
        {/* Name */}
        <div style={{ height: 7, width: '60%', background: '#111', borderRadius: 2, margin: '0 auto 3px' }} />
        <div style={{ height: 3, width: '40%', background: '#444', borderRadius: 1, margin: '0 auto 3px' }} />
        <div style={{ height: 2, width: '75%', background: '#888', borderRadius: 1, margin: '0 auto 6px' }} />
        {/* Divider */}
        <div style={{ height: 1, background: '#111', marginBottom: 5 }} />
        {/* Section */}
        <div style={{ height: 4, width: '30%', background: '#111', borderRadius: 1, marginBottom: 3 }} />
        <div style={{ height: 1, background: '#111', marginBottom: 4 }} />
        {[85, 70, 60].map((w, i) => (
          <div key={i} style={{ height: 3, width: `${w}%`, background: '#555', borderRadius: 1, marginBottom: 3, opacity: 0.6 }} />
        ))}
        {/* Section 2 */}
        <div style={{ height: 4, width: '35%', background: '#111', borderRadius: 1, marginBottom: 3, marginTop: 5 }} />
        <div style={{ height: 1, background: '#111', marginBottom: 4 }} />
        {[90, 65].map((w, i) => (
          <div key={i} style={{ height: 3, width: `${w}%`, background: '#555', borderRadius: 1, marginBottom: 3, opacity: 0.5 }} />
        ))}
      </div>
    );
  }

  /* ── Elegant ── */
  return (
    <div className="tpl-mini" style={{ background: '#faf9f7', borderRadius: 6, padding: '10px', overflow: 'hidden' }}>
      <div style={{ textAlign: 'center', marginBottom: 6 }}>
        <div style={{ height: 8, width: '50%', background: '#1e293b', borderRadius: 2, margin: '0 auto 4px' }} />
        <div style={{ height: 2, width: '70%', background: accent, margin: '0 auto 3px' }} />
        <div style={{ height: 2, width: '50%', background: accent, margin: '0 auto 5px', opacity: 0.4 }} />
        <div style={{ height: 3, width: '38%', background: '#94a3b8', borderRadius: 2, margin: '0 auto' }} />
      </div>
      <div style={{ height: 1, background: accent, marginBottom: 6, opacity: 0.4 }} />
      {[80, 60, 75, 55, 65].map((w, i) => (
        <div key={i} style={{ height: 3, width: `${w}%`, background: i % 3 === 0 ? '#1e293b' : '#d1d5db', borderRadius: 2, marginBottom: 4 }} />
      ))}
    </div>
  );
}

export default function TemplateSelector({ selected, onSelect }) {
  return (
    <div className="tpl-selector animate-fade-in">
      <div className="tpl-header">
        <h2>Choose a Template</h2>
        <p>Pick a design that represents your style, then customize it with your details.</p>
      </div>
      <div className="tpl-grid">
        {TEMPLATES.map((tpl) => (
          <div
            key={tpl.id}
            className={`tpl-card glass-panel ${selected === tpl.id ? 'tpl-selected' : ''}`}
            onClick={() => onSelect(tpl.id)}
            style={{ '--tpl-accent': tpl.accent }}
          >
            <div className="tpl-preview-box">
              <TemplateMiniPreview id={tpl.id} accent={tpl.accent} />
            </div>
            <div className="tpl-info">
              <div className="tpl-info-top">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3>{tpl.name}</h3>
                  <span className="tpl-tag" style={{ background: tpl.accent }}>{tpl.tag}</span>
                </div>
                {selected === tpl.id && <CheckCircle size={18} color={tpl.accent} />}
              </div>
              <p>{tpl.desc}</p>
              <div className="tpl-accent-dot" style={{ background: tpl.accent }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
