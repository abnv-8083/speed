import React, { useState, useCallback } from 'react';
import {
  Search, Plus, Copy, Eye, EyeOff, Trash2, Edit2,
  RefreshCw, Shield, Globe, Briefcase, CreditCard,
  Wifi, Lock, Star, ChevronDown, ChevronUp, X, Check, Sliders,
  AlertTriangle, ExternalLink,
} from 'lucide-react';
import { saveVault, generatePassword, passwordStrength } from './crypto';
import { useToast } from '../../components/ToastContext';

const CATEGORIES = [
  { id: 'all',       label: 'All',        icon: Shield    },
  { id: 'social',    label: 'Social',     icon: Globe     },
  { id: 'work',      label: 'Work',       icon: Briefcase },
  { id: 'finance',   label: 'Finance',    icon: CreditCard},
  { id: 'network',   label: 'Network',    icon: Wifi      },
  { id: 'other',     label: 'Other',      icon: Lock      },
  { id: 'favourite', label: 'Favourites', icon: Star      },
];

const CAT_COLORS = {
  social:    '#4F46E5',
  work:      '#0ea5e9',
  finance:   '#10b981',
  network:   '#f59e0b',
  other:     '#64748b',
  favourite: '#ec4899',
};

const BLANK = { id: null, title: '', username: '', password: '', url: '', notes: '', category: 'other', favourite: false };

function catIcon(cat, size = 14) {
  const C = CATEGORIES.find(c => c.id === cat);
  return C ? <C.icon size={size} /> : <Lock size={size} />;
}

// ── Strength bar ──────────────────────────────────────────────
function StrengthBar({ pwd }) {
  const s = passwordStrength(pwd);
  if (!pwd) return null;
  return (
    <div className="pm-strength-row">
      <div className="pm-strength-bar">
        {[1,2,3,4].map(n => (
          <div key={n} className="pm-strength-seg"
            style={{ background: n <= s.score ? s.color : 'var(--border)' }} />
        ))}
      </div>
      <span className="pm-strength-label" style={{ color: s.color }}>{s.label}</span>
    </div>
  );
}

// ── Generator panel ───────────────────────────────────────────
function GeneratorPanel({ onUse }) {
  const [opts, setOpts] = useState({ length: 16, upper: true, lower: true, digits: true, symbols: true });
  const [pwd, setPwd]   = useState(() => generatePassword({ length: 16, upper: true, lower: true, digits: true, symbols: true }));
  const [copied, setCopied] = useState(false);

  const refresh = () => setPwd(generatePassword(opts));
  const copy = () => { navigator.clipboard.writeText(pwd); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const toggle = key => { const n = { ...opts, [key]: !opts[key] }; setOpts(n); setPwd(generatePassword(n)); };

  return (
    <div className="pm-gen-panel glass-panel animate-fade-in">
      <h3 className="pm-gen-title"><Sliders size={15}/> Password Generator</h3>
      <div className="pm-gen-output">
        <span className="pm-gen-pwd">{pwd}</span>
        <div className="pm-gen-actions">
          <button className="btn-icon" onClick={refresh} title="Regenerate"><RefreshCw size={14}/></button>
          <button className="btn-icon" onClick={copy} title="Copy">
            {copied ? <Check size={14} color="#10b981"/> : <Copy size={14}/>}
          </button>
        </div>
      </div>
      <StrengthBar pwd={pwd} />
      <div className="pm-gen-controls">
        <div className="pm-gen-length">
          <label>Length: <strong>{opts.length}</strong></label>
          <input type="range" min={8} max={64} value={opts.length}
            onChange={e => { const n = { ...opts, length: +e.target.value }; setOpts(n); setPwd(generatePassword(n)); }} />
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

// ── Entry Modal ───────────────────────────────────────────────
function EntryModal({ entry, onSave, onClose }) {
  const [form, setForm]       = useState({ ...BLANK, ...entry });
  const [showPwd, setShowPwd] = useState(false);
  const [showGen, setShowGen] = useState(false);
  const [copied, setCopied]   = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const copyPwd = () => { navigator.clipboard.writeText(form.password); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const handleSave = () => { if (!form.title.trim()) return; onSave({ ...form, id: form.id || crypto.randomUUID() }); };

  return (
    <div className="pm-modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pm-modal glass-panel animate-fade-in">
        <div className="pm-modal-header">
          <h2>{entry?.id ? 'Edit Entry' : 'New Entry'}</h2>
          <button className="pm-modal-close" onClick={onClose}><X size={16}/></button>
        </div>

        <div className="pm-modal-body">
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="input-field" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Gmail, Netflix…" autoFocus />
          </div>

          <div className="form-group">
            <label className="form-label">Category</label>
            <div className="pm-cat-picker">
              {CATEGORIES.filter(c => c.id !== 'all' && c.id !== 'favourite').map(cat => (
                <button key={cat.id}
                  className={`pm-cat-btn ${form.category === cat.id ? 'active' : ''}`}
                  style={form.category === cat.id ? { borderColor: CAT_COLORS[cat.id], color: CAT_COLORS[cat.id], background: `${CAT_COLORS[cat.id]}15` } : {}}
                  onClick={() => set('category', cat.id)}
                >
                  <cat.icon size={12}/> {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Username / Email</label>
            <input className="input-field" value={form.username} onChange={e => set('username', e.target.value)} placeholder="user@example.com" />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="pm-input-wrap">
              <Lock size={14} className="pm-input-icon" />
              <input type={showPwd ? 'text' : 'password'} className="input-field pm-input"
                value={form.password} onChange={e => set('password', e.target.value)} placeholder="Enter password" />
              <button type="button" className="pm-eye-btn" onClick={() => setShowPwd(v => !v)}>
                {showPwd ? <EyeOff size={14}/> : <Eye size={14}/>}
              </button>
              <button type="button" className="pm-eye-btn" onClick={copyPwd}>
                {copied ? <Check size={14} color="#10b981"/> : <Copy size={14}/>}
              </button>
            </div>
            <StrengthBar pwd={form.password} />
            <button className="pm-gen-toggle-btn" onClick={() => setShowGen(v => !v)}>
              <Sliders size={12}/> {showGen ? 'Hide' : 'Use'} generator {showGen ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
            </button>
            {showGen && <GeneratorPanel onUse={pwd => { set('password', pwd); setShowGen(false); }} />}
          </div>

          <div className="form-group">
            <label className="form-label">Website URL</label>
            <input className="input-field" value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://example.com" />
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="input-field" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes…" />
          </div>

          <label className="pm-fav-toggle">
            <input type="checkbox" checked={form.favourite} onChange={e => set('favourite', e.target.checked)} />
            <Star size={14} fill={form.favourite ? '#ec4899' : 'none'} color={form.favourite ? '#ec4899' : 'var(--text-muted)'} />
            Mark as favourite
          </label>
        </div>

        <div className="pm-modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!form.title.trim()}>
            <Check size={14}/> Save Entry
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Entry Row (horizontal list item) ─────────────────────────
function EntryRow({ entry, onEdit, onDelete }) {
  const [showPwd, setShowPwd] = useState(false);
  const [copied, setCopied]   = useState('');

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 1500);
  };

  const color    = CAT_COLORS[entry.category] || '#64748b';
  const str      = passwordStrength(entry.password);
  const catLabel = CATEGORIES.find(c => c.id === entry.category)?.label || 'Other';
  const domain   = entry.url ? entry.url.replace(/^https?:\/\//, '').replace(/\/$/, '').split('/')[0] : '';

  return (
    <div className="pm-entry-row">
      {/* Category icon */}
      <div className="pm-row-icon" style={{ background: `${color}18`, color }}>
        {catIcon(entry.category, 18)}
      </div>

      {/* Title + meta */}
      <div className="pm-row-info">
        <div className="pm-row-title-wrap">
          <span className="pm-row-title">{entry.title}</span>
          {entry.favourite && <Star size={11} fill="#ec4899" color="#ec4899" />}
          {str.label && (
            <span className="pm-row-strength" style={{ background: `${str.color}15`, color: str.color }}>
              {str.label}
            </span>
          )}
        </div>
        <span className="pm-row-username">{entry.username || domain || catLabel}</span>
      </div>

      {/* Password reveal + copy */}
      <div className="pm-row-pwd-wrap">
        <span className="pm-row-pwd">{showPwd ? entry.password : '••••••••••'}</span>
        <button className="pm-row-icon-btn" onClick={() => setShowPwd(v => !v)} title="Show/Hide">
          {showPwd ? <EyeOff size={13}/> : <Eye size={13}/>}
        </button>
        <button className="pm-row-icon-btn" onClick={() => copy(entry.password, 'pwd')} title="Copy password">
          {copied === 'pwd' ? <Check size={13} color="#10b981"/> : <Copy size={13}/>}
        </button>
      </div>

      {/* Username copy */}
      {entry.username && (
        <button className="pm-row-icon-btn pm-row-user-copy" onClick={() => copy(entry.username, 'user')} title="Copy username">
          {copied === 'user' ? <Check size={13} color="#10b981"/> : <Copy size={13}/>}
        </button>
      )}

      {/* URL link */}
      {entry.url && (
        <a className="pm-row-icon-btn pm-row-link" href={entry.url} target="_blank" rel="noreferrer" title={entry.url}>
          <ExternalLink size={13}/>
        </a>
      )}

      {/* Edit + Delete */}
      <div className="pm-row-actions">
        <button className="pm-row-action-btn" onClick={() => onEdit(entry)} title="Edit">
          <Edit2 size={13}/>
        </button>
        <button className="pm-row-action-btn pm-row-action-del" onClick={() => onDelete(entry.id)} title="Delete">
          <Trash2 size={13}/>
        </button>
      </div>
    </div>
  );
}

// ── Vault ─────────────────────────────────────────────────────
export default function Vault({ masterPwd, initialEntries, onLock }) {
  const toast = useToast();
  const [entries, setEntries]   = useState(initialEntries);
  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState('all');
  const [modal, setModal]       = useState(null);
  const [showGen, setShowGen]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const persist = useCallback(async (next) => {
    setSaving(true);
    try { await saveVault(masterPwd, next); }
    finally { setSaving(false); }
  }, [masterPwd]);

  const filtered = entries.filter(e => {
    if (category === 'favourite' && !e.favourite) return false;
    if (category !== 'all' && category !== 'favourite' && e.category !== category) return false;
    const q = search.toLowerCase();
    return !q || e.title.toLowerCase().includes(q) || e.username?.toLowerCase().includes(q) || e.url?.toLowerCase().includes(q);
  });

  const handleSave = async (entry) => {
    const isNew = !entries.find(e => e.id === entry.id);
    const next = isNew ? [...entries, entry] : entries.map(e => e.id === entry.id ? entry : e);
    setEntries(next);
    try {
      await persist(next);
      setModal(null);
      toast.success(isNew ? 'Password saved' : 'Password updated');
    } catch (e) { toast.error('Save failed: ' + e.message); }
  };

  const handleDelete = async (id) => {
    const next = entries.filter(e => e.id !== id);
    setEntries(next);
    try {
      await persist(next);
      setDeleteId(null);
      toast.success('Entry deleted');
    } catch (e) { toast.error('Delete failed: ' + e.message); }
  };

  const totalFav   = entries.filter(e => e.favourite).length;
  const weakCount  = entries.filter(e => passwordStrength(e.password).score === 1).length;

  return (
    <div className="pm-vault-root">

      {/* ── Sidebar ── */}
      <aside className="pm-sidebar glass-panel">

        {/* Stats */}
        <div className="pm-sidebar-stats">
          <div className="pm-stat-block">
            <span className="pm-stat-val">{entries.length}</span>
            <span className="pm-stat-lbl">Total</span>
          </div>
          <div className="pm-stat-block">
            <span className="pm-stat-val">{totalFav}</span>
            <span className="pm-stat-lbl">Starred</span>
          </div>
          <div className="pm-stat-block pm-stat-weak">
            <span className="pm-stat-val">{weakCount}</span>
            <span className="pm-stat-lbl">Weak</span>
          </div>
        </div>

        <div className="pm-sidebar-divider" />

        {/* Category nav */}
        {CATEGORIES.map(cat => {
          const count = cat.id === 'all' ? entries.length
            : cat.id === 'favourite' ? totalFav
            : entries.filter(e => e.category === cat.id).length;
          return (
            <button key={cat.id} className={`pm-cat-nav ${category === cat.id ? 'active' : ''}`}
              onClick={() => setCategory(cat.id)}>
              <cat.icon size={15}/>
              <span>{cat.label}</span>
              {count > 0 && <span className="pm-cat-count">{count}</span>}
            </button>
          );
        })}

        <div className="pm-sidebar-divider" />

        {/* Encryption badge */}
        <div className="pm-enc-badge">
          <Shield size={11}/> AES-256-GCM encrypted
          {saving && <span className="pm-saving"> · Saving…</span>}
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="pm-main-content">

        {/* Toolbar */}
        <div className="pm-toolbar glass-panel">
          <div className="pm-search-wrap">
            <Search size={15} className="pm-search-icon" />
            <input className="pm-search" placeholder="Search entries…" value={search}
              onChange={e => setSearch(e.target.value)} />
            {search && <button className="btn-icon pm-search-clear" onClick={() => setSearch('')}><X size={13}/></button>}
          </div>
          <div className="pm-toolbar-actions">
            <button className={`pm-gen-btn ${showGen ? 'pm-gen-btn--active' : ''}`} onClick={() => setShowGen(v => !v)}>
              <Sliders size={14}/> Generator
            </button>
            <button className="btn btn-primary" onClick={() => setModal({ ...BLANK })}>
              <Plus size={14}/> Add Entry
            </button>
          </div>
        </div>

        {/* Generator */}
        {showGen && <GeneratorPanel />}

        {/* Weak password warning */}
        {weakCount > 0 && (
          <div className="pm-weak-warning">
            <AlertTriangle size={14}/>
            {weakCount} entry{weakCount !== 1 ? 's have' : ' has'} a weak password — consider updating.
          </div>
        )}

        {/* Column header */}
        {filtered.length > 0 && (
          <div className="pm-list-header">
            <span style={{ flex: '0 0 36px' }} />
            <span className="pm-lh-col" style={{ flex: 2 }}>Name</span>
            <span className="pm-lh-col" style={{ flex: 1.5, textAlign: 'right', paddingRight: '2.5rem' }}>Password</span>
            <span style={{ width: '110px' }} />
          </div>
        )}

        {/* Entry list */}
        {filtered.length === 0 ? (
          <div className="pm-vault-empty glass-panel">
            <Shield size={40} strokeWidth={1.3}/>
            <h3>{search ? 'No results.' : category !== 'all' ? 'No entries here.' : 'Vault is empty.'}</h3>
            <p>{!search && category === 'all' && 'Add your first password to get started.'}</p>
            {!search && category === 'all' && (
              <button className="btn btn-primary" onClick={() => setModal({ ...BLANK })}>
                <Plus size={14}/> Add First Entry
              </button>
            )}
          </div>
        ) : (
          <div className="pm-entry-list glass-panel">
            {filtered.map(entry => (
              <EntryRow key={entry.id} entry={entry} onEdit={e => setModal(e)} onDelete={id => setDeleteId(id)} />
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit modal */}
      {modal && <EntryModal entry={modal} onSave={handleSave} onClose={() => setModal(null)} />}

      {/* Delete confirm */}
      {deleteId && (
        <div className="pm-modal-backdrop" onClick={() => setDeleteId(null)}>
          <div className="pm-confirm-dialog glass-panel animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="pm-confirm-icon"><Trash2 size={26}/></div>
            <h3>Delete this entry?</h3>
            <p>This cannot be undone.</p>
            <div className="pm-confirm-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="pm-btn-delete" onClick={() => handleDelete(deleteId)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
