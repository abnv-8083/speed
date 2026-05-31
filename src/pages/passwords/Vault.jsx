import React, { useState, useCallback } from 'react';
import {
  Search, Plus, Copy, Eye, EyeOff, Trash2, Edit2,
  RefreshCw, Shield, Globe, Briefcase, CreditCard,
  Wifi, Lock, Star, ChevronDown, ChevronUp, X, Check, Sliders
} from 'lucide-react';
import { saveVault, generatePassword, passwordStrength } from './crypto';

const CATEGORIES = [
  { id: 'all',       label: 'All',       icon: Shield },
  { id: 'social',    label: 'Social',    icon: Globe },
  { id: 'work',      label: 'Work',      icon: Briefcase },
  { id: 'finance',   label: 'Finance',   icon: CreditCard },
  { id: 'network',   label: 'Network',   icon: Wifi },
  { id: 'other',     label: 'Other',     icon: Lock },
  { id: 'favourite', label: 'Favourites',icon: Star },
];

const CATEGORY_COLORS = {
  social: '#4F46E5', work: '#0ea5e9', finance: '#10b981',
  network: '#f59e0b', other: '#64748b', favourite: '#ec4899',
};

const BLANK = { id: null, title: '', username: '', password: '', url: '', notes: '', category: 'other', favourite: false };

function categoryIcon(cat, size = 15) {
  const C = CATEGORIES.find(c => c.id === cat);
  if (!C) return <Lock size={size} />;
  return <C.icon size={size} />;
}

// ── Strength bar ────────────────────────────────────────────────
function StrengthBar({ pwd }) {
  const s = passwordStrength(pwd);
  if (!pwd) return null;
  return (
    <div className="pm-strength-row">
      <div className="pm-strength-bar">
        {[1,2,3,4].map(n => (
          <div key={n} className="pm-strength-seg" style={{ background: n <= s.score ? s.color : 'var(--border)' }} />
        ))}
      </div>
      <span className="pm-strength-label" style={{ color: s.color }}>{s.label}</span>
    </div>
  );
}

// ── Password Generator panel ────────────────────────────────────
function GeneratorPanel({ onUse }) {
  const [opts, setOpts] = useState({ length: 16, upper: true, lower: true, digits: true, symbols: true });
  const [pwd, setPwd]   = useState(() => generatePassword({ length: 16, upper: true, lower: true, digits: true, symbols: true }));
  const [copied, setCopied] = useState(false);

  const refresh = () => setPwd(generatePassword(opts));

  const copy = () => {
    navigator.clipboard.writeText(pwd);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const toggle = key => {
    const next = { ...opts, [key]: !opts[key] };
    setOpts(next);
    setPwd(generatePassword(next));
  };

  return (
    <div className="pm-gen-panel glass-panel animate-fade-in">
      <h3 className="pm-gen-title"><Sliders size={16}/> Password Generator</h3>
      <div className="pm-gen-output">
        <span className="pm-gen-pwd">{pwd}</span>
        <div className="pm-gen-actions">
          <button className="btn-icon" onClick={refresh} title="Regenerate"><RefreshCw size={15}/></button>
          <button className="btn-icon" onClick={copy} title="Copy">
            {copied ? <Check size={15} color="#10b981"/> : <Copy size={15}/>}
          </button>
        </div>
      </div>
      <StrengthBar pwd={pwd} />
      <div className="pm-gen-controls">
        <div className="pm-gen-length">
          <label>Length: <strong>{opts.length}</strong></label>
          <input type="range" min={8} max={64} value={opts.length}
            onChange={e => { const next = { ...opts, length: +e.target.value }; setOpts(next); setPwd(generatePassword(next)); }}
          />
        </div>
        <div className="pm-gen-toggles">
          {[['upper','A-Z'],['lower','a-z'],['digits','0-9'],['symbols','!@#']].map(([k,l]) => (
            <button key={k} className={`pm-gen-toggle ${opts[k] ? 'on' : ''}`} onClick={() => toggle(k)}>{l}</button>
          ))}
        </div>
      </div>
      {onUse && (
        <button className="btn btn-pm pm-gen-use" onClick={() => onUse(pwd)}>
          Use this password
        </button>
      )}
    </div>
  );
}

// ── Add / Edit Modal ────────────────────────────────────────────
function EntryModal({ entry, onSave, onClose }) {
  const [form, setForm]       = useState({ ...BLANK, ...entry });
  const [showPwd, setShowPwd] = useState(false);
  const [showGen, setShowGen] = useState(false);
  const [copied, setCopied]   = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.title.trim()) return;
    onSave({ ...form, id: form.id || crypto.randomUUID() });
  };

  const copyPwd = () => {
    navigator.clipboard.writeText(form.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="pm-modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pm-modal glass-panel animate-fade-in">
        <div className="pm-modal-header">
          <h2>{entry?.id ? 'Edit Entry' : 'New Entry'}</h2>
          <button className="btn-icon" onClick={onClose}><X size={18}/></button>
        </div>

        <div className="pm-modal-body">
          {/* Title */}
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="input-field" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Gmail, Netflix…" />
          </div>

          {/* Category */}
          <div className="form-group">
            <label className="form-label">Category</label>
            <div className="pm-cat-picker">
              {CATEGORIES.filter(c => c.id !== 'all' && c.id !== 'favourite').map(cat => (
                <button key={cat.id}
                  className={`pm-cat-btn ${form.category === cat.id ? 'active' : ''}`}
                  style={form.category === cat.id ? { borderColor: CATEGORY_COLORS[cat.id], color: CATEGORY_COLORS[cat.id], background: `${CATEGORY_COLORS[cat.id]}15` } : {}}
                  onClick={() => set('category', cat.id)}
                >
                  <cat.icon size={13}/> {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Username */}
          <div className="form-group">
            <label className="form-label">Username / Email</label>
            <input className="input-field" value={form.username} onChange={e => set('username', e.target.value)} placeholder="user@example.com" />
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="pm-input-wrap">
              <input
                type={showPwd ? 'text' : 'password'}
                className="input-field pm-input"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder="Enter password"
              />
              <button type="button" className="pm-eye-btn" onClick={() => setShowPwd(v => !v)}>
                {showPwd ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
              <button type="button" className="pm-eye-btn" onClick={copyPwd} title="Copy">
                {copied ? <Check size={15} color="#10b981"/> : <Copy size={15}/>}
              </button>
            </div>
            <StrengthBar pwd={form.password} />
            <button className="pm-gen-toggle-btn" onClick={() => setShowGen(v => !v)}>
              <Sliders size={13}/> {showGen ? 'Hide' : 'Use'} generator
              {showGen ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
            </button>
            {showGen && <GeneratorPanel onUse={pwd => { set('password', pwd); setShowGen(false); }} />}
          </div>

          {/* URL */}
          <div className="form-group">
            <label className="form-label">Website URL</label>
            <input className="input-field" value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://example.com" />
          </div>

          {/* Notes */}
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="input-field" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes…" />
          </div>

          {/* Favourite */}
          <label className="pm-fav-toggle">
            <input type="checkbox" checked={form.favourite} onChange={e => set('favourite', e.target.checked)} />
            <Star size={15} fill={form.favourite ? '#ec4899' : 'none'} color={form.favourite ? '#ec4899' : 'var(--text-muted)'} />
            Mark as favourite
          </label>
        </div>

        <div className="pm-modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-pm" onClick={handleSave} disabled={!form.title.trim()}>
            <Check size={15}/> Save Entry
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Square Entry Card ───────────────────────────────────────────
function EntryCard({ entry, onEdit, onDelete }) {
  const [showPwd, setShowPwd] = useState(false);
  const [copied, setCopied]   = useState('');

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 1500);
  };

  const color = CATEGORY_COLORS[entry.category] || '#64748b';
  const str   = passwordStrength(entry.password);
  const catLabel = CATEGORIES.find(c => c.id === entry.category)?.label || 'Other';

  return (
    <div className="pm-entry-card">
      {/* Hover actions — top right */}
      <div className="pm-entry-actions">
        <button className="btn-icon" onClick={() => onEdit(entry)} title="Edit"><Edit2 size={14}/></button>
        <button className="btn-icon btn-danger" onClick={() => onDelete(entry.id)} title="Delete"><Trash2 size={14}/></button>
      </div>

      {/* Icon */}
      <div className="pm-entry-left" style={{ background: 'none' }}>
        <div className="pm-entry-cat-icon" style={{ background: color, color: '#fff' }}>
          {categoryIcon(entry.category, 24)}
        </div>
      </div>

      {/* Body */}
      <div className="pm-entry-body">
        {/* Title */}
        <div className="pm-entry-top">
          <div className="pm-entry-title-row">
            <span className="pm-entry-title">{entry.title}</span>
            {entry.favourite && <Star size={12} fill="#ec4899" color="#ec4899" />}
          </div>
          {/* Category label */}
          <span className="pm-entry-cat-label">{catLabel}</span>
          {/* Strength badge */}
          {str.label && (
            <span className="pm-entry-strength" style={{ background: `${str.color}15`, color: str.color }}>
              {str.label}
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="pm-entry-card-divider" />

        {/* Username */}
        {entry.username && (
          <div className="pm-entry-row">
            <span className="pm-entry-value" style={{ color: 'var(--text)' }}>{entry.username}</span>
            <button className="btn-icon pm-copy-btn" onClick={() => copy(entry.username, 'user')} title="Copy username">
              {copied === 'user' ? <Check size={12} color="#10b981"/> : <Copy size={12}/>}
            </button>
          </div>
        )}

        {/* Password */}
        <div className="pm-entry-row">
          <span className="pm-entry-pwd">
            {showPwd ? entry.password : '••••••••'}
          </span>
          <button className="btn-icon pm-copy-btn" onClick={() => setShowPwd(v => !v)}>
            {showPwd ? <EyeOff size={12}/> : <Eye size={12}/>}
          </button>
          <button className="btn-icon pm-copy-btn" onClick={() => copy(entry.password, 'pwd')} title="Copy password">
            {copied === 'pwd' ? <Check size={12} color="#10b981"/> : <Copy size={12}/>}
          </button>
        </div>

        {/* URL */}
        {entry.url && (
          <a className="pm-entry-link" href={entry.url} target="_blank" rel="noreferrer">
            🔗 {entry.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
          </a>
        )}

        {/* Notes */}
        {entry.notes && (
          <div className="pm-entry-notes">{entry.notes}</div>
        )}
      </div>
    </div>
  );
}


// ── Vault Dashboard ─────────────────────────────────────────────
export default function Vault({ masterPwd, initialEntries, onLock }) {
  const [entries, setEntries]   = useState(initialEntries);
  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState('all');
  const [modal, setModal]       = useState(null);   // null | BLANK | entry
  const [showGen, setShowGen]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const persist = useCallback(async (next) => {
    setSaving(true);
    await saveVault(masterPwd, next);
    setSaving(false);
  }, [masterPwd]);

  const filtered = entries.filter(e => {
    if (category === 'favourite' && !e.favourite) return false;
    if (category !== 'all' && category !== 'favourite' && e.category !== category) return false;
    const q = search.toLowerCase();
    return !q || e.title.toLowerCase().includes(q) || e.username?.toLowerCase().includes(q) || e.url?.toLowerCase().includes(q);
  });

  const handleSave = async (entry) => {
    const next = entries.find(e => e.id === entry.id)
      ? entries.map(e => e.id === entry.id ? entry : e)
      : [...entries, entry];
    setEntries(next);
    await persist(next);
    setModal(null);
  };

  const handleDelete = async (id) => {
    const next = entries.filter(e => e.id !== id);
    setEntries(next);
    await persist(next);
    setDeleteId(null);
  };

  return (
    <div className="pm-vault">
      {/* Top bar */}
      <div className="pm-vault-topbar">
        <div className="pm-vault-search-wrap">
          <Search size={16} className="pm-vault-search-icon" />
          <input
            className="pm-vault-search"
            placeholder="Search entries…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="btn-icon pm-clear-search" onClick={() => setSearch('')}><X size={14}/></button>}
        </div>
        <div className="pm-vault-topbar-actions">
          <button className="btn btn-outline" onClick={() => setShowGen(v => !v)}>
            <Sliders size={15}/> Generator
          </button>
          <button className="btn btn-pm" onClick={() => setModal({ ...BLANK })}>
            <Plus size={15}/> Add Entry
          </button>
        </div>
      </div>

      {/* Generator panel */}
      {showGen && (
        <div style={{ marginBottom: '1rem' }}>
          <GeneratorPanel />
        </div>
      )}

      <div className="pm-vault-layout">
        {/* Sidebar categories */}
        <aside className="pm-vault-sidebar glass-panel">
          <div className="pm-vault-stats">
            <div className="pm-stat"><span className="pm-stat-val">{entries.length}</span><span className="pm-stat-lbl">Total</span></div>
            <div className="pm-stat"><span className="pm-stat-val">{entries.filter(e => e.favourite).length}</span><span className="pm-stat-lbl">Starred</span></div>
          </div>
          <div className="pm-vault-divider"/>
          {CATEGORIES.map(cat => {
            const count = cat.id === 'all'
              ? entries.length
              : cat.id === 'favourite'
              ? entries.filter(e => e.favourite).length
              : entries.filter(e => e.category === cat.id).length;
            return (
              <button
                key={cat.id}
                className={`pm-cat-nav ${category === cat.id ? 'active' : ''}`}
                onClick={() => setCategory(cat.id)}
              >
                <cat.icon size={15} />
                <span>{cat.label}</span>
                {count > 0 && <span className="pm-cat-count">{count}</span>}
              </button>
            );
          })}
          <div className="pm-vault-divider"/>
          <button className="pm-lock-btn" onClick={onLock}>
            <Lock size={15}/> Lock Vault
          </button>
          <div className="pm-vault-encryption-badge">
            <Shield size={11}/> AES-256-GCM
            {saving && <span className="pm-saving"> · Saving…</span>}
          </div>
        </aside>

        {/* Entry list */}
        <main className="pm-vault-main">
          {filtered.length === 0 ? (
            <div className="pm-vault-empty">
              <Shield size={48} strokeWidth={1} />
              <h3>{search ? 'No results found.' : category === 'all' ? 'Your vault is empty.' : 'No entries in this category.'}</h3>
              <p>{!search && category === 'all' && 'Add your first password to get started.'}</p>
              {!search && category === 'all' && (
                <button className="btn btn-pm" onClick={() => setModal({ ...BLANK })}>
                  <Plus size={15}/> Add First Entry
                </button>
              )}
            </div>
          ) : (
            <div className="pm-entry-list-wrap">
              <div className="pm-entry-list">
                {filtered.map(entry => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    onEdit={e => setModal(e)}
                    onDelete={id => setDeleteId(id)}
                  />
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add / Edit modal */}
      {modal && (
        <EntryModal
          entry={modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="pm-modal-backdrop" onClick={() => setDeleteId(null)}>
          <div className="pm-confirm-dialog glass-panel animate-fade-in" onClick={e => e.stopPropagation()}>
            <Trash2 size={32} color="#ef4444" strokeWidth={1.5}/>
            <h3>Delete this entry?</h3>
            <p>This action cannot be undone.</p>
            <div className="pm-confirm-actions">
              <button className="btn" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger-solid" onClick={() => handleDelete(deleteId)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
