import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Download, Eye, ChevronDown, Check,
  Save, FolderOpen, Trash2, X, Clock, FileText, Loader,
  PanelRight, Minimize2, Maximize2, Paintbrush,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CVEditor from './CVEditor';
import CVPreview from './CVPreview';
import TemplateSelector from './TemplateSelector';
import { TEMPLATES } from './cvTemplates';
import { fetchSaves, upsertSave, deleteSave } from './cvStorage';
import { useToast } from '../../components/ToastContext';
import './CVGenerator.css';

const defaultData = {
  personal: {
    name: 'Alex Johnson',
    title: 'Senior Software Engineer',
    email: 'alex@example.com',
    phone: '+1 (555) 123-4567',
    location: 'San Francisco, CA',
    website: 'alexjohnson.dev',
    summary: 'Passionate software engineer with 6+ years of experience building scalable web applications. Specializing in React, Node.js, and cloud architecture.',
    photo: '',
  },
  experience: [
    { id: 1, company: 'Tech Corp', role: 'Senior Software Engineer', period: '2021 – Present', description: 'Led development of microservices architecture serving 2M+ users. Reduced API latency by 40% through caching strategies.' },
    { id: 2, company: 'StartupXYZ', role: 'Frontend Developer', period: '2019 – 2021', description: 'Built React-based dashboard used by 500+ enterprise clients. Implemented real-time data visualization with D3.js.' },
  ],
  education: [{ id: 1, institution: 'MIT', degree: 'B.S. Computer Science', period: '2015 – 2019', gpa: '3.9 / 4.0', board: '', specialization: '' }],
  skills: ['React', 'Node.js', 'TypeScript', 'Python', 'AWS', 'Docker', 'PostgreSQL', 'GraphQL'],
  certifications: ['AWS Solutions Architect', 'Google Cloud Professional'],
  training: [],
  technicalSkills: [],
  languages: [],
};

// ── Save Name Modal ────────────────────────────────────────────
function SaveModal({ onSave, onClose, existingName, saving }) {
  const [name, setName] = useState(existingName || '');
  return (
    <div className="cv-modal-backdrop" onClick={onClose}>
      <div className="cv-save-modal glass-panel animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="cv-save-modal-header">
          <Save size={18} />
          <h3>Save CV Draft</h3>
          <button className="btn-icon" onClick={onClose}><X size={16}/></button>
        </div>
        <p className="cv-save-modal-hint">Give this CV a name so you can find it later.</p>
        <input
          className="input-field"
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && name.trim() && onSave(name.trim())}
          placeholder="e.g. Software Engineer CV 2025"
          disabled={saving}
        />
        <div className="cv-save-modal-actions">
          <button className="btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-accent" disabled={!name.trim() || saving} onClick={() => onSave(name.trim())}>
            {saving ? <><Loader size={14} className="spin"/> Saving…</> : <><Check size={15}/> Save</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Latest 5 panel ─────────────────────────────────────────────
function Latest5Panel({ saves, loading, onLoad, onDelete, onViewAll }) {
  if (loading) return (
    <div className="cv-saves-panel glass-panel animate-fade-in">
      <div className="cv-saves-header" style={{ justifyContent: 'center', padding: '1rem' }}>
        <Loader size={18} className="spin" style={{ color: 'var(--primary)' }} />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading saved CVs…</span>
      </div>
    </div>
  );
  if (saves.length === 0) return null;
  const latest = saves.slice(0, 5);
  return (
    <div className="cv-saves-panel glass-panel animate-fade-in">
      <div className="cv-saves-header">
        <FolderOpen size={18} />
        <h3>Recent CVs</h3>
        <span className="cv-saves-count">{saves.length}</span>
        <button className="btn btn-sm btn-primary cv-view-all-btn" onClick={onViewAll}>
          View All →
        </button>
      </div>
      <div className="cv-saves-list">
        {latest.map(sv => (
          <div key={sv.id} className="cv-save-item">
            <div className="cv-save-item-icon"><FileText size={18} /></div>
            <div className="cv-save-item-info">
              <span className="cv-save-item-name">{sv.name}</span>
              <span className="cv-save-item-meta">
                <span className="cv-save-tpl-badge">{sv.template}</span>
                <Clock size={11}/> {new Date(sv.savedAt).toLocaleDateString()}
              </span>
            </div>
            <div className="cv-save-item-actions">
              <button className="btn btn-sm btn-primary" onClick={() => onLoad(sv)}>Load</button>
              <button className="btn-icon btn-danger" onClick={() => onDelete(sv.id)} title="Delete">
                <Trash2 size={14}/>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function CVGenerator() {
  const navigate = useNavigate();
  const [step, setStep]                   = useState('template');
  const [selectedTemplate, setSelectedTemplate] = useState('modern');
  const [cvData, setCvData]               = useState(defaultData);
  const [saves, setSaves]                 = useState([]);
  const [savesLoading, setSavesLoading]   = useState(true);  const [showSaveModal, setShowSaveModal] = useState(false);
  const [modalSaving, setModalSaving]   = useState(false);
  const [currentSaveId, setCurrentSaveId] = useState(null);
  const [showLivePreview, setShowLivePreview] = useState(true);
  const [previewWide, setPreviewWide]   = useState(false);
  const [tplMenuOpen, setTplMenuOpen]   = useState(false);
  const tplMenuRef = useRef(null);
  const toast = useToast();
  const previewRef = useRef(null);

  const activeTemplate = TEMPLATES.find(t => t.id === selectedTemplate) || TEMPLATES[0];

  // ── Close template menu on outside click / Escape ───────────
  useEffect(() => {
    if (!tplMenuOpen) return;
    const onPointerDown = (e) => {
      if (tplMenuRef.current && !tplMenuRef.current.contains(e.target)) setTplMenuOpen(false);
    };
    const onKeyDown = (e) => { if (e.key === 'Escape') setTplMenuOpen(false); };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [tplMenuOpen]);

  // ── Load saves from Supabase on mount ──────────────────────
  const refreshSaves = useCallback(async () => {
    setSavesLoading(true);
    try {
      const data = await fetchSaves();
      setSaves(data);
    } catch (e) {
      console.error('Failed to fetch saves:', e);
    } finally {
      setSavesLoading(false);
    }
  }, []);

  useEffect(() => { refreshSaves(); }, [refreshSaves]);

  // ── If redirected from SavedCVs page, load that CV ─────────
  useEffect(() => {
    const loadId = sessionStorage.getItem('cv_load_id');
    if (!loadId) return;
    sessionStorage.removeItem('cv_load_id');
    // Wait until saves are loaded, then find and apply
    const tryLoad = (list) => {
      const sv = list.find(s => s.id === loadId);
      if (sv) {
        setSelectedTemplate(sv.template);
        setCvData(sv.data);
        setCurrentSaveId(sv.id);
        setStep('edit');
      }
    };
    // If already loaded, apply immediately; otherwise wait for saves
    setSaves(prev => { tryLoad(prev); return prev; });
    // Also set up a one-time listener
    sessionStorage.setItem('cv_pending_load', loadId);
  }, []);

  // Apply pending load once saves arrive
  useEffect(() => {
    const pendingId = sessionStorage.getItem('cv_pending_load');
    if (!pendingId || savesLoading) return;
    sessionStorage.removeItem('cv_pending_load');
    const sv = saves.find(s => s.id === pendingId);
    if (sv) {
      setSelectedTemplate(sv.template);
      setCvData(sv.data);
      setCurrentSaveId(sv.id);
      setStep('edit');
    }
  }, [saves, savesLoading]);

  // ── Save to Supabase ────────────────────────────────────────
  const handleSave = async (name) => {
    setModalSaving(true);
    const id = currentSaveId || crypto.randomUUID();
    try {
      await upsertSave({ id, name, template: selectedTemplate, data: cvData });
      setCurrentSaveId(id);
      await refreshSaves();
      setShowSaveModal(false);
      toast.success(`Saved as "${name}"`);
    } catch (e) {
      toast.error(`Save failed: ${e.message}`);
    } finally {
      setModalSaving(false);
    }
  };

  // ── Load a save into editor ─────────────────────────────────
  const handleLoad = (sv) => {
    setSelectedTemplate(sv.template);
    setCvData(sv.data);
    setCurrentSaveId(sv.id);
    setStep('edit');
  };

  // ── Delete a save ───────────────────────────────────────────
  const handleDeleteSave = async (id) => {
    try {
      await deleteSave(id);
      if (currentSaveId === id) setCurrentSaveId(null);
      await refreshSaves();
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  // ── PDF export ──────────────────────────────────────────────
  const handleDownloadPDF = async () => {
    const element = previewRef.current;
    if (!element) return;
    // Temporarily render at 100% scale so the PDF capture is full size
    const wasWide = previewWide;
    if (!wasWide) setPreviewWide(true);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const html2pdf = (await import('html2pdf.js')).default;
    await html2pdf()
      .set({
        margin: 0,
        filename: `${cvData.personal.name.replace(/\s+/g, '_')}_CV.pdf`,
        image:    { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF:    { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(element)
      .save();
    if (!wasWide) setPreviewWide(false);
  };

  return (
    <div className="cvgen-layout">

      {/* ── Module header (billing-style: title + actions) ── */}
      <header className="cvgen-headbar glass-panel">
        <div className="cvgen-headbar-text">
          {step === 'template' && (
            <>
              <h2 className="cvgen-headbar-title">Choose a Template</h2>
              <p className="cvgen-headbar-sub">Pick a layout you like, then fill it in — you can switch templates any time while editing.</p>
            </>
          )}
          {step === 'edit' && (
            <>
              <h2 className="cvgen-headbar-title">Edit Your CV</h2>
              <p className="cvgen-headbar-sub">
                Editing with the <b>{activeTemplate.name}</b> template — changes reflect in the live preview instantly.
              </p>
            </>
          )}
          {step === 'preview' && (
            <>
              <h2 className="cvgen-headbar-title">{'Preview & Download'}</h2>
              <p className="cvgen-headbar-sub">Your CV is ready — export it as a PDF or save a draft to finish later.</p>
            </>
          )}
        </div>

        <div className="cvgen-headbar-controls">
          {/* Step flow */}
          <div className="cvgen-steps" role="tablist" aria-label="CV builder steps">
            <button
              type="button"
              role="tab"
              aria-selected={step === 'template'}
              className={`cvgen-step ${step === 'template' ? 'cvgen-step--active' : ''} ${step !== 'template' ? 'cvgen-step--done' : ''}`}
              onClick={() => setStep('template')}
            >
              {step !== 'template' && <Check size={12} />} Template
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={step === 'edit'}
              className={`cvgen-step ${step === 'edit' ? 'cvgen-step--active' : ''} ${step === 'preview' ? 'cvgen-step--done' : ''}`}
              disabled={step === 'template'}
              onClick={() => setStep('edit')}
            >
              {step === 'preview' && <Check size={12} />} Edit
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={step === 'preview'}
              className={`cvgen-step ${step === 'preview' ? 'cvgen-step--active' : ''}`}
              disabled={step === 'template'}
              onClick={() => setStep('preview')}
            >
              Preview
            </button>
          </div>

          {/* Per-step actions */}
          {step === 'template' ? (
            <div className="cvgen-headbar-actions">
              <button className="btn btn-outline" onClick={() => navigate('/admin/cv/saved')}>
                <FolderOpen size={15} /> Saved CVs
              </button>
            </div>
          ) : step === 'edit' ? (
            <div className="cvgen-headbar-actions">
              <button className="btn-save-draft" onClick={() => setShowSaveModal(true)}>
                <Save size={15} /> {currentSaveId ? 'Update Draft' : 'Save Draft'}
              </button>
              <button
                className={`cvgen-step-btn ${showLivePreview ? 'cvgen-step-btn--on' : ''}`}
                onClick={() => setShowLivePreview(v => !v)}
                title={showLivePreview ? 'Hide live preview' : 'Show live preview'}
              >
                <PanelRight size={15} /> {showLivePreview ? 'Hide Preview' : 'Show Preview'}
              </button>
              <button className="btn btn-primary" onClick={() => setStep('preview')}>
                <Eye size={15} /> Preview
              </button>
            </div>
          ) : (
            <div className="cvgen-headbar-actions">
              <div className="cvgen-scale-toggle">
                <button
                  className={`cvgen-toggle-btn ${!previewWide ? 'active' : ''}`}
                  onClick={() => setPreviewWide(false)}
                  title="Fit page to screen"
                >
                  <Minimize2 size={13} /> Fit
                </button>
                <button
                  className={`cvgen-toggle-btn ${previewWide ? 'active' : ''}`}
                  onClick={() => setPreviewWide(true)}
                  title="Full page width"
                >
                  <Maximize2 size={13} /> 100%
                </button>
              </div>
              <button className="btn-save-draft" onClick={() => setShowSaveModal(true)}>
                <Save size={15} /> {currentSaveId ? 'Update Draft' : 'Save Draft'}
              </button>
              <button className="btn btn-accent" onClick={handleDownloadPDF}>
                <Download size={15} /> Download PDF
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Content ── */}
      <main className="cvgen-main">
        {step === 'template' && (
          <div className="cvgen-step-body">
            <Latest5Panel saves={saves} loading={savesLoading} onLoad={handleLoad} onDelete={handleDeleteSave} onViewAll={() => navigate('/admin/cv/saved')} />
            <TemplateSelector selected={selectedTemplate} onSelect={(tpl) => { setSelectedTemplate(tpl); setStep('edit'); }} />
          </div>
        )}
        {step === 'edit' && (
          <div className={`cvgen-edit-wrap ${showLivePreview ? 'with-preview' : ''}`}>
            <CVEditor cvData={cvData} setCvData={setCvData} template={selectedTemplate} onPreview={() => setStep('preview')} />
            {showLivePreview && (
              <aside className="cvgen-live-preview">
                <div className="cvgen-live-preview-head">
                  <span className="cvgen-live-preview-title"><PanelRight size={13} /> Live Preview</span>
                  <div className="cvgen-tpl-switcher" ref={tplMenuRef}>
                    <button
                      type="button"
                      className={`cvgen-tpl-switcher-btn ${tplMenuOpen ? 'open' : ''}`}
                      onClick={() => setTplMenuOpen(o => !o)}
                      title="Change CV template"
                      aria-haspopup="listbox"
                      aria-expanded={tplMenuOpen}
                    >
                      <Paintbrush size={12} />
                      <span className="cvgen-tpl-switcher-name">{activeTemplate.name}</span>
                      <ChevronDown size={12} className="cvgen-tpl-switcher-caret" />
                    </button>
                    {tplMenuOpen && (
                      <div className="cvgen-tpl-menu" role="listbox">
                        {TEMPLATES.map(tpl => (
                          <button
                            key={tpl.id}
                            type="button"
                            role="option"
                            aria-selected={tpl.id === selectedTemplate}
                            className={`cvgen-tpl-option ${tpl.id === selectedTemplate ? 'selected' : ''}`}
                            onClick={() => { setSelectedTemplate(tpl.id); setTplMenuOpen(false); }}
                          >
                            <span className="cvgen-tpl-option-dot" style={{ background: tpl.accent }} />
                            <span className="cvgen-tpl-option-name">{tpl.name}</span>
                            {tpl.id === selectedTemplate && <Check size={13} className="cvgen-tpl-option-check" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="cvgen-live-preview-body">
                  <CVPreview cvData={cvData} template={selectedTemplate} />
                </div>
              </aside>
            )}
          </div>
        )}
        {step === 'preview' && (
          <div className="cvgen-step-body">
            <div className={`cvgen-preview-wrapper ${previewWide ? 'cvgen-preview-wide' : 'cvgen-preview-fit'}`}>
              <CVPreview ref={previewRef} cvData={cvData} template={selectedTemplate} />
            </div>
          </div>
        )}
      </main>

      {/* ── Save modal ── */}
      {showSaveModal && (
        <SaveModal
          existingName={saves.find(s => s.id === currentSaveId)?.name || ''}
          onSave={handleSave}
          onClose={() => !modalSaving && setShowSaveModal(false)}
          saving={modalSaving}
        />
      )}
    </div>
  );
}
