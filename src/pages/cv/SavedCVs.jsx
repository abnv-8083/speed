import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  FileText, Download, Trash2, Edit3,
  Clock, Search, X, AlertTriangle, Loader, RefreshCw, Plus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CVPreview from './CVPreview';
import { fetchSaves, deleteSave } from './cvStorage';
import './SavedCVs.css';

const TEMPLATE_COLORS = {
  modern:   '#4F46E5',
  classic:  '#0ea5e9',
  minimal:  '#64748b',
  creative: '#f59e0b',
  tech:     '#10b981',
  elegant:  '#8b5cf6',
};

export default function SavedCVs() {
  const navigate   = useNavigate();
  const previewRef = useRef(null);

  const [saves, setSaves]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [deleteId, setDeleteId]   = useState(null);
  const [deleting, setDeleting]   = useState(false);
  const [previewSv, setPreviewSv] = useState(null);
  const [exporting, setExporting] = useState(false);

  // ── Load saves from Supabase ──────────────────────────────
  const loadSaves = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSaves();
      setSaves(data);
    } catch (e) {
      console.error('Failed to load saves:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSaves(); }, [loadSaves]);

  const filtered = saves.filter(sv =>
    sv.name.toLowerCase().includes(search.toLowerCase()) ||
    sv.template.toLowerCase().includes(search.toLowerCase())
  );

  // ── Delete ──────────────────────────────────────────────
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteSave(deleteId);
      setDeleteId(null);
      if (previewSv?.id === deleteId) setPreviewSv(null);
      await loadSaves();
    } catch (e) {
      console.error('Delete failed:', e);
    } finally {
      setDeleting(false);
    }
  };

  // ── Open in editor via sessionStorage ─────────────────────
  const handleEdit = (sv) => {
    sessionStorage.setItem('cv_load_id', sv.id);
    navigate('/admin/cv');
  };

  // ── Download PDF from hidden preview ──────────────────────
  const handleDownload = async (sv) => {
    setPreviewSv(sv);
    setExporting(true);
    await new Promise(r => setTimeout(r, 400));
    const element = previewRef.current;
    if (!element) { setExporting(false); return; }
    const html2pdf = (await import('html2pdf.js')).default;
    await html2pdf()
      .set({
        margin: 0,
        filename: `${sv.data.personal.name.replace(/\s+/g, '_')}_CV.pdf`,
        image:    { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF:    { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(element)
      .save();
    setExporting(false);
  };

  return (
    <div className="saved-cvs-layout animate-fade-in">

      {/* ── Module header (billing-style: title + search/actions) ── */}
      <header className="saved-cvs-headbar glass-panel">
        <div className="saved-cvs-headbar-text">
          <h2 className="saved-cvs-headbar-title">Saved CVs</h2>
          <p className="saved-cvs-headbar-sub">Preview, download, or reopen any draft you&apos;ve saved to the cloud.</p>
        </div>
        <div className="saved-cvs-toolbar">
          <div className="saved-cvs-search">
            <Search size={15} />
            <input placeholder="Search by name or template…" value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch('')}><X size={13}/></button>}
          </div>
          <button className="btn-icon" onClick={loadSaves} title="Refresh" disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/admin/cv')}>
            <Plus size={16} /> New CV
          </button>
        </div>
      </header>

      <main className="saved-cvs-main">
        {/* Loading state */}
        {loading ? (
          <div className="saved-cvs-empty">
            <Loader size={40} strokeWidth={1.5} className="spin" style={{ color: 'var(--primary)' }} />
            <p>Loading your saved CVs…</p>
          </div>
        ) : saves.length === 0 ? (
          <div className="saved-cvs-empty">
            <FileText size={56} strokeWidth={1} />
            <h3>No saved CVs yet</h3>
            <p>Save a CV draft from the editor and it will appear here.</p>
            <button className="btn btn-primary" onClick={() => navigate('/admin/cv')}>Create your first CV</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="saved-cvs-empty">
            <Search size={40} strokeWidth={1} />
            <h3>No results for "{search}"</h3>
            <button className="btn" onClick={() => setSearch('')}>Clear search</button>
          </div>
        ) : (
          <div className="saved-cvs-grid">
            {filtered.map(sv => {
              const color = TEMPLATE_COLORS[sv.template] || '#4F46E5';
              const date  = new Date(sv.savedAt);
              return (
                <div key={sv.id} className="saved-cv-card glass-panel">
                  <div className="saved-cv-card-bar" style={{ background: color }} />
                  <div className="saved-cv-card-head">
                    <div className="saved-cv-card-icon" style={{ background: `${color}18`, color }}>
                      <FileText size={22} />
                    </div>
                    <div className="saved-cv-card-meta">
                      <h3 className="saved-cv-card-name">{sv.name}</h3>
                      <div className="saved-cv-card-sub">
                        <span className="saved-cv-tpl-badge" style={{ background: `${color}15`, color }}>
                          {sv.template}
                        </span>
                        <Clock size={11} />
                        {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  <div className="saved-cv-card-info">
                    <div className="saved-cv-info-row">
                      <span className="saved-cv-info-label">Name</span>
                      <span className="saved-cv-info-val">{sv.data.personal.name}</span>
                    </div>
                    <div className="saved-cv-info-row">
                      <span className="saved-cv-info-label">Title</span>
                      <span className="saved-cv-info-val">{sv.data.personal.title}</span>
                    </div>
                    <div className="saved-cv-info-row">
                      <span className="saved-cv-info-label">Experience</span>
                      <span className="saved-cv-info-val">{sv.data.experience.length} entries</span>
                    </div>
                    <div className="saved-cv-info-row">
                      <span className="saved-cv-info-label">Skills</span>
                      <span className="saved-cv-info-val">
                        {sv.data.skills.slice(0, 3).join(', ')}{sv.data.skills.length > 3 ? ` +${sv.data.skills.length - 3}` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="saved-cv-card-actions">
                    <button className="btn btn-sm" onClick={() => setPreviewSv(sv)}>Preview</button>
                    <button className="btn btn-sm btn-primary" onClick={() => handleEdit(sv)}>
                      <Edit3 size={13} /> Edit
                    </button>
                    <button
                      className="btn btn-sm btn-accent"
                      onClick={() => handleDownload(sv)}
                      disabled={exporting}
                    >
                      <Download size={13} /> {exporting && previewSv?.id === sv.id ? '…' : 'PDF'}
                    </button>
                    <button className="btn-icon btn-danger" onClick={() => setDeleteId(sv.id)} title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Preview slide-in panel ── */}
      {previewSv && (
        <div className="saved-cv-preview-backdrop" onClick={() => !exporting && setPreviewSv(null)}>
          <div className="saved-cv-preview-panel" onClick={e => e.stopPropagation()}>
            <div className="saved-cv-preview-toolbar">
              <span className="saved-cv-preview-title">{previewSv.name}</span>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button className="btn btn-sm btn-accent" onClick={() => handleDownload(previewSv)} disabled={exporting}>
                  <Download size={13}/> {exporting ? 'Exporting…' : 'Download PDF'}
                </button>
                <button className="btn btn-sm btn-primary" onClick={() => handleEdit(previewSv)}>
                  <Edit3 size={13}/> Edit
                </button>
                <button className="btn-icon" onClick={() => setPreviewSv(null)}><X size={18}/></button>
              </div>
            </div>
            <div className="saved-cv-preview-scroll">
              <CVPreview ref={previewRef} cvData={previewSv.data} template={previewSv.template} />
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ── */}
      {deleteId && (
        <div className="saved-cv-modal-backdrop" onClick={() => !deleting && setDeleteId(null)}>
          <div className="saved-cv-confirm glass-panel animate-fade-in" onClick={e => e.stopPropagation()}>
            <AlertTriangle size={36} color="#ef4444" strokeWidth={1.5} />
            <h3>Delete this CV?</h3>
            <p>"{saves.find(s => s.id === deleteId)?.name}" will be permanently removed from the cloud.</p>
            <div className="saved-cv-confirm-actions">
              <button className="btn" onClick={() => setDeleteId(null)} disabled={deleting}>Cancel</button>
              <button className="btn btn-danger-solid" onClick={handleDelete} disabled={deleting}>
                {deleting ? <><Loader size={13} className="spin"/> Deleting…</> : <><Trash2 size={14}/> Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
