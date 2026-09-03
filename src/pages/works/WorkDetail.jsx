import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { useToast } from '../../components/ToastContext';
import { useModal } from '../../components/ModalContext';
import AppModal from '../../components/AppModal';
import Portal from '../../components/Portal';
import {
  ArrowLeft, Save, Trash2, Plus, X, FileText, AlertTriangle,
  MessageSquare, Clock, CheckCircle, XCircle,
  Briefcase, Calendar, Users, Mic, MicOff,
  Download, Eye, Upload, Link as LinkIcon, Loader2, Send,
  Edit2, Check, Volume2, AlertOctagon, Phone, Mail,
  ZoomIn, ZoomOut, RotateCw, Maximize2
} from 'lucide-react';
import './WorkDetail.css';

const STATUS_CONFIG = {
  new:         { label: 'New',         color: '#8b5cf6', icon: Briefcase },
  in_progress: { label: 'In Progress', color: '#3b82f6', icon: Clock },
  completed:   { label: 'Completed',   color: '#22c55e', icon: CheckCircle },
  closed:      { label: 'Closed',      color: '#6b7280', icon: XCircle },
};

const Spinner = ({ size = 14 }) => <Loader2 size={size} className="spin" />;

const WorkDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const modal = useModal();

  const [work, setWork] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');

  // Edit state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  // Issue state
  const [showAddIssue, setShowAddIssue] = useState(false);
  const [issueForm, setIssueForm] = useState({ title: '', description: '', note_type: 'text' });
  const [addingIssue, setAddingIssue] = useState(false);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  // Document state
  const [uploading, setUploading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(null); // { name, type, size }
  const [showCustomerDocs, setShowCustomerDocs] = useState(false);
  const [customerDocs, setCustomerDocs] = useState([]);
  const [loadingCustomerDocs, setLoadingCustomerDocs] = useState(false);
  const [attachingDoc, setAttachingDoc] = useState(null);
  const [deletingDocId, setDeletingDocId] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const fetchWork = useCallback(async ({ silent = false } = {}) => {
    try {
      const data = await api.getWork(id);
      setWork(data);
    } catch (err) {
      toast.error('Failed to load work');
      navigate('/admin/billing/works');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id, navigate, toast]);

  useEffect(() => { fetchWork(); }, [fetchWork]);

  // ── Status Change ─────────────────────────────────────────────
  const changeStatus = async (newStatus) => {
    try {
      await api.updateWork(id, { status: newStatus });
      setWork(prev => ({ ...prev, status: newStatus }));
      toast.success(`Status updated to ${STATUS_CONFIG[newStatus]?.label}`);
    } catch (err) {
      toast.error('Failed: ' + err.message);
    }
  };

  // ── Edit Work ─────────────────────────────────────────────────
  const openEdit = () => {
    setEditForm({
      title: work.title, description: work.description,
      contact_name: work.contact_name || '', contact_phone: work.contact_phone || '',
      contact_email: work.contact_email || '',
      end_date: work.end_date ? new Date(work.end_date).toISOString().slice(0, 10) : '',
      end_time: work.end_date ? new Date(work.end_date).toISOString().slice(11, 16) : '',
    });
    setShowEditModal(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const endDateTime = editForm.end_date && editForm.end_time
        ? new Date(`${editForm.end_date}T${editForm.end_time}`).toISOString()
        : work.end_date;
      await api.updateWork(id, {
        title: editForm.title, description: editForm.description,
        contact_name: editForm.contact_name, contact_phone: editForm.contact_phone,
        contact_email: editForm.contact_email, end_date: endDateTime,
      });
      setShowEditModal(false);
      fetchWork({ silent: true });
      toast.success('Work updated');
    } catch (err) { toast.error('Failed: ' + err.message); }
    setSaving(false);
  };

  // ── Delete Work ───────────────────────────────────────────────
  const deleteWork = async () => {
    const confirmed = await modal.confirm('Delete Work', 'This cannot be undone.');
    if (!confirmed) return;
    try {
      await api.deleteWork(id);
      toast.success('Work deleted');
      navigate('/admin/billing/works');
    } catch (err) { toast.error('Failed: ' + err.message); }
  };

  // ── Issues ────────────────────────────────────────────────────
  const addIssue = async () => {
    if (!issueForm.title.trim()) { toast.error('Title is required'); return; }
    setAddingIssue(true);
    try {
      const body = { title: issueForm.title.trim(), description: issueForm.description.trim(), note_type: issueForm.note_type };
      if (issueForm.note_type === 'voice' && audioBlob) {
        const reader = new FileReader();
        reader.onload = async () => {
          body.audio_data = reader.result;
          await api.addWorkIssue(id, body);
          setIssueForm({ title: '', description: '', note_type: 'text' });
          setAudioBlob(null);
          setShowAddIssue(false);
          fetchWork({ silent: true });
          toast.success('Issue added');
        };
        reader.readAsDataURL(audioBlob);
      } else {
        await api.addWorkIssue(id, body);
        setIssueForm({ title: '', description: '', note_type: 'text' });
        setShowAddIssue(false);
        fetchWork({ silent: true });
        toast.success('Issue added');
      }
    } catch (err) { toast.error('Failed: ' + err.message); }
    setAddingIssue(false);
  };

  const updateIssueStatus = async (issueId, newStatus) => {
    try {
      await api.updateWorkIssue(id, issueId, { status: newStatus });
      fetchWork({ silent: true });
    } catch (err) { toast.error('Failed: ' + err.message); }
  };

  const deleteIssue = async (issueId) => {
    const confirmed = await modal.confirm('Delete Issue', 'Remove this issue?');
    if (!confirmed) return;
    try {
      await api.deleteWorkIssue(id, issueId);
      fetchWork({ silent: true });
      toast.success('Issue deleted');
    } catch (err) { toast.error('Failed: ' + err.message); }
  };

  // ── Voice Recording ───────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        setAudioBlob(new Blob(audioChunksRef.current, { type: 'audio/webm' }));
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
    } catch (err) { toast.error('Microphone access denied'); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    clearInterval(timerRef.current);
    setIsRecording(false);
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    clearInterval(timerRef.current);
    setIsRecording(false);
    setAudioBlob(null);
    setRecordingTime(0);
  };

  const formatDuration = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

  // ── Documents ─────────────────────────────────────────────────
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadingFile({ name: file.name, type: file.type, size: file.size });
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await api.addWorkDocument(id, { name: file.name, file_type: file.type, file_size: file.size, data: reader.result });
        toast.success('Document uploaded');
        await fetchWork({ silent: true });
      } catch (err) { toast.error('Upload failed: ' + err.message); }
      setUploading(false);
      setUploadingFile(null);
    };
    reader.readAsDataURL(file);
  };

  const loadCustomerDocs = async () => {
    if (!work?.customer_id) return;
    try {
      setLoadingCustomerDocs(true);
      const custId = work.customer_id._id || work.customer_id.id || work.customer_id;
      const customer = await api.getCustomer(custId);
      setCustomerDocs(customer.documents || []);
      setShowCustomerDocs(true);
    } catch (err) { toast.error('Failed: ' + err.message); }
    setLoadingCustomerDocs(false);
  };

  const attachCustomerDoc = async (docId) => {
    try {
      setAttachingDoc(docId);
      const custId = work.customer_id._id || work.customer_id.id || work.customer_id;
      await api.addWorkDocumentFromCustomer(id, { customer_id: custId, document_id: docId });
      setShowCustomerDocs(false);
      fetchWork({ silent: true });
      toast.success('Document attached');
    } catch (err) { toast.error('Failed: ' + err.message); }
    setAttachingDoc(null);
  };

  const deleteDocument = async (docId) => {
    const confirmed = await modal.confirm('Delete Document', 'Remove this document?');
    if (!confirmed) return;
    setDeletingDocId(docId);
    try {
      await api.deleteWorkDocument(id, docId);
      toast.success('Document deleted');
      await fetchWork({ silent: true });
    } catch (err) { toast.error('Failed: ' + err.message); }
    setDeletingDocId(null);
  };

  // ── Helpers ───────────────────────────────────────────────────
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const formatTime = (d) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';

  const isOverdue = work && work.end_date && !['completed', 'closed'].includes(work.status) && new Date(work.end_date) < new Date();
  const openIssues = (work?.issues || []).filter(i => i.status !== 'resolved').length;

  // ── Image Zoom helpers ────────────────────────────────────
  const zoomIn = () => setZoom(z => Math.min(z + 0.25, 5));
  const zoomOut = () => setZoom(z => Math.max(z - 0.25, 0.25));
  const zoomReset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const handlePreviewWheel = (e) => {
    if (!previewDoc?.file_type?.startsWith('image/')) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setZoom(z => Math.min(Math.max(z + delta, 0.25), 5));
  };

  const handlePanStart = (e) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsPanning(true);
    panStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };

  const handlePanMove = (e) => {
    if (!isPanning) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    setPan({ x: panStartRef.current.panX + dx, y: panStartRef.current.panY + dy });
  };

  const handlePanEnd = () => setIsPanning(false);

  if (loading) return (
    <div className="wd-root">
      <div className="wd-loading"><Spinner size={24} /><span>Loading work...</span></div>
    </div>
  );

  if (!work) return null;

  const statusCfg = STATUS_CONFIG[work.status] || STATUS_CONFIG.new;

  return (
    <div className="wd-root">
      {/* ── Top Bar (matches ProductDetail) ──────────────────── */}
      <div className="wd-topbar">
        <button className="wd-back-btn" onClick={() => navigate('/admin/billing/works')}>
          <ArrowLeft size={16} /> All Works
        </button>
        <div className="wd-topbar-center">
          <span className="wd-work-id">{work.work_id}</span>
          <h1 className="wd-header-title">{work.title}</h1>
          <span className="status-badge" style={{ background: `${statusCfg.color}18`, color: statusCfg.color, border: `1px solid ${statusCfg.color}40` }}>
            {statusCfg.label}
          </span>
          {isOverdue && <span className="status-badge status-error">Overdue</span>}
          {work.end_date && (
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Calendar size={12} /> {formatDate(work.end_date)} {formatTime(work.end_date)}
            </span>
          )}
        </div>
        <div className="wd-topbar-actions">
          <button className="pd-btn pd-btn-stock" onClick={openEdit}><Edit2 size={14} /> Edit</button>
          <button className="btn btn-danger" onClick={deleteWork}><Trash2 size={14} /></button>
        </div>
      </div>

      {/* ── Status Bar ──────────────────────────────────────── */}
      <div className="wd-status-bar">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            className={`wd-status-btn ${work.status === key ? 'active' : ''}`}
            style={{ '--status-color': cfg.color }}
            onClick={() => changeStatus(key)}
            disabled={work.status === key}
          >
            {React.createElement(cfg.icon, { size: 13 })} {cfg.label}
          </button>
        ))}
      </div>

      {/* ── Tabs ────────────────────────────────────────────── */}
      <div className="wd-tabs">
        {[
          { key: 'details', label: 'Details', icon: Briefcase },
          { key: 'issues', label: `Issues (${openIssues})`, icon: AlertTriangle },
          { key: 'documents', label: `Docs (${(work.documents || []).length})`, icon: FileText },
        ].map(tab => (
          <button key={tab.key} className={`wd-tab ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>
            {React.createElement(tab.icon, { size: 14 })} {tab.label}
          </button>
        ))}
      </div>

      {/* ── Content ─────────────────────────────────────────── */}
      <div className="wd-content">

        {/* DETAILS TAB */}
        {activeTab === 'details' && (
          <div className="wd-details-grid">
            {/* Row 1: Description + Contact */}
            <div className="wd-card">
              <h4 className="wd-card-title"><MessageSquare size={14} /> Description</h4>
              {work.description ? (
                <p className="wd-card-text">{work.description}</p>
              ) : (
                <p className="wd-card-text" style={{ fontStyle: 'italic', opacity: 0.5 }}>No description provided.</p>
              )}
            </div>

            <div className="wd-card">
              <h4 className="wd-card-title"><Users size={14} /> Contact Information</h4>
              <div className="wd-detail-grid">
                {work.customer_name && (
                  <div className="wd-detail-item">
                    <span className="wd-detail-label">Customer</span>
                    <span className="wd-detail-value">{work.customer_name}</span>
                  </div>
                )}
                {work.contact_name && (
                  <div className="wd-detail-item">
                    <span className="wd-detail-label">Contact Name</span>
                    <span className="wd-detail-value">{work.contact_name}</span>
                  </div>
                )}
                {work.contact_phone && (
                  <div className="wd-detail-item">
                    <span className="wd-detail-label">Phone</span>
                    <span className="wd-detail-value"><Phone size={12} /> {work.contact_phone}</span>
                  </div>
                )}
                {work.contact_email && (
                  <div className="wd-detail-item">
                    <span className="wd-detail-label">Email</span>
                    <span className="wd-detail-value"><Mail size={12} /> {work.contact_email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Row 2: Schedule + Notes */}
            <div className="wd-card">
              <h4 className="wd-card-title"><Calendar size={14} /> Schedule</h4>
              <div className="wd-detail-grid">
                <div className="wd-detail-item">
                  <span className="wd-detail-label">Created</span>
                  <span className="wd-detail-value">{formatDate(work.createdAt)}</span>
                </div>
                {work.end_date && (
                  <div className={`wd-detail-item ${isOverdue ? 'overdue' : ''}`}>
                    <span className="wd-detail-label">End Date</span>
                    <span className="wd-detail-value">{formatDate(work.end_date)} {formatTime(work.end_date)}</span>
                  </div>
                )}
                {work.completed_at && (
                  <div className="wd-detail-item">
                    <span className="wd-detail-label">Completed</span>
                    <span className="wd-detail-value">{formatDate(work.completed_at)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="wd-card">
              <h4 className="wd-card-title"><AlertTriangle size={14} /> Issues ({openIssues})</h4>
              {(work.issues || []).length > 0 ? (
                <div className="wd-issues-list">
                  {work.issues.slice(0, 5).map((issue) => {
                    const dotColor = issue.status === 'open' ? '#ef4444' : issue.status === 'in_progress' ? '#f59e0b' : '#22c55e';
                    return (
                      <div key={issue._id} className="wd-note-item" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <span className="wd-issue-dot" style={{ background: dotColor, flexShrink: 0 }} />
                        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{issue.title}</span>
                        <span className={`wd-issue-badge ${issue.status}`} style={{ flexShrink: 0 }}>{issue.status}</span>
                      </div>
                    );
                  })}
                  {work.issues.length > 5 && <p className="wd-card-text" style={{ fontSize: '0.75rem', textAlign: 'center', margin: '0.3rem 0 0' }}>+{work.issues.length - 5} more</p>}
                </div>
              ) : (
                <p className="wd-card-text" style={{ fontStyle: 'italic', opacity: 0.5 }}>No issues yet.</p>
              )}
            </div>
          </div>
        )}

        {/* ISSUES TAB */}
        {activeTab === 'issues' && (
          <div className="wd-issues">
            <div className="wd-section-header">
              <h4 className="wd-card-title"><AlertTriangle size={14} /> Issues ({(work.issues || []).length})</h4>
              <button className="wd-add-btn" onClick={() => { setIssueForm({ title: '', description: '', note_type: 'text' }); setAudioBlob(null); setShowAddIssue(true); }}>
                <Plus size={14} /> Add Issue
              </button>
            </div>

            {(work.issues || []).length === 0 ? (
              <div className="wd-empty-inline"><AlertTriangle size={28} /><p>No issues yet.</p></div>
            ) : (
              <div className="wd-issues-list">
                {work.issues.map((issue) => {
                  const isOpen = issue.status === 'open';
                  const isProg = issue.status === 'in_progress';
                  return (
                    <div key={issue._id} className={`wd-issue-card ${issue.status}`}>
                      <div className="wd-issue-top">
                        <span className="wd-issue-dot" style={{ background: isOpen ? '#ef4444' : isProg ? '#f59e0b' : '#22c55e' }} />
                        <span className="wd-issue-title">{issue.title}</span>
                        <span className={`wd-issue-badge ${issue.status}`}>{issue.status}</span>
                        <span className="wd-issue-date">{formatDate(issue.created_at)}</span>
                        <button className="wd-delete-btn" onClick={() => deleteIssue(issue._id)}><Trash2 size={12} /></button>
                      </div>
                      {issue.note_type === 'voice' && issue.audio_data ? (
                        <div className="wd-issue-voice">
                          <Mic size={12} /> Voice note
                          <audio controls src={issue.audio_data} style={{ height: 32, marginLeft: '0.5rem' }} />
                        </div>
                      ) : issue.description ? (
                        <p className="wd-issue-desc">{issue.description}</p>
                      ) : null}
                      {issue.status !== 'resolved' && (
                        <div className="wd-issue-actions">
                          {isOpen && <button onClick={() => updateIssueStatus(issue._id, 'in_progress')}><Clock size={11} /> Start</button>}
                          {(isProg || isOpen) && <button className="resolve" onClick={() => updateIssueStatus(issue._id, 'resolved')}><Check size={11} /> Resolve</button>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* DOCUMENTS TAB */}
        {activeTab === 'documents' && (
          <div className="wd-documents">
            <div className="wd-section-header">
              <h4 className="wd-card-title"><FileText size={14} /> Documents ({(work.documents || []).length})</h4>
              <div className="wd-docs-actions">
                {work.customer_id && (
                  <button className="wd-add-btn secondary" onClick={loadCustomerDocs} disabled={loadingCustomerDocs}>
                    {loadingCustomerDocs ? <Spinner /> : <LinkIcon size={14} />} From Customer
                  </button>
                )}
                <label className="wd-add-btn">
                  {uploading ? <><Spinner /> Uploading...</> : <><Upload size={14} /> Upload</>}
                  <input type="file" onChange={handleUpload} style={{ display: 'none' }} accept="image/*,.pdf,.doc,.docx" disabled={uploading} />
                </label>
              </div>
            </div>

            {(work.documents || []).length === 0 && !uploading ? (
              <div className="wd-empty-inline"><FileText size={28} /><p>No documents yet.</p></div>
            ) : (
              <div className="wd-docs-grid">
                {/* Skeleton upload card */}
                {uploading && uploadingFile && (
                  <div className="wd-doc-card wd-doc-skeleton">
                    <div className="wd-doc-thumb">
                      <div className="wd-skeleton-shimmer wd-skeleton-thumb" />
                      <div className="wd-skeleton-uploading">
                        <Spinner size={16} />
                        <span>Uploading…</span>
                      </div>
                    </div>
                    <div className="wd-doc-info">
                      <span className="wd-doc-name" title={uploadingFile.name}>{uploadingFile.name}</span>
                      <span className="wd-doc-meta">{uploadingFile.size ? `${(uploadingFile.size / 1024).toFixed(1)} KB` : ''}</span>
                    </div>
                    <div className="wd-doc-actions" style={{ opacity: 0.4 }}>
                      <span style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.35rem', color: 'var(--text-muted)', fontSize: '0.7rem' }}><Spinner size={11} /> Saving…</span>
                    </div>
                  </div>
                )}
                {work.documents.map((doc) => {
                  const isImage = doc.file_type?.startsWith('image/');
                  const isPdf = doc.file_type?.includes('pdf');
                  const isDeleting = deletingDocId === doc._id;
                  return (
                    <div key={doc._id} className={`wd-doc-card ${isDeleting ? 'wd-doc-deleting' : ''}`}>
                      <div className="wd-doc-thumb" onClick={() => !isDeleting && setPreviewDoc(doc)}>
                        {isImage && doc.data ? <img src={doc.data} alt={doc.name} /> :
                         isPdf ? <div className="wd-doc-icon"><FileText size={24} /> PDF</div> :
                         <div className="wd-doc-icon"><FileText size={24} /></div>}
                        <div className="wd-doc-overlay"><Eye size={16} /> Preview</div>
                      </div>
                      <div className="wd-doc-info">
                        <span className="wd-doc-name" title={doc.name}>{doc.name}</span>
                        <span className="wd-doc-meta">
                          {doc.source === 'customer' && <span className="wd-doc-source">📎 Customer</span>}
                          {doc.file_size ? `${(doc.file_size/1024).toFixed(1)} KB` : ''}
                        </span>
                      </div>
                      <div className="wd-doc-actions">
                        <button onClick={() => setPreviewDoc(doc)} title="Preview"><Eye size={13} /></button>
                        <a href={doc.data || doc.file_url} download={doc.name} title="Download"><Download size={13} /></a>
                        <button onClick={() => deleteDocument(doc._id)} title="Delete" className="danger"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════ MODALS ═══════════════════════════════════════ */}

      {/* Edit Modal */}
      {showEditModal && (
        <AppModal title="Edit Work" onClose={() => !saving && setShowEditModal(false)} width="520px"
          footer={<>
            <button className="btn btn-secondary" onClick={() => setShowEditModal(false)} disabled={saving}>Cancel</button>
            <button className="btn btn-primary" onClick={saveEdit} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
          </>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div className="form-group"><label>Title</label><input className="input-field" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} /></div>
            <div className="form-group"><label>Description</label><textarea className="input-field" rows={3} value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} /></div>
            <div className="form-group"><label>Contact Name</label><input className="input-field" value={editForm.contact_name} onChange={e => setEditForm({...editForm, contact_name: e.target.value})} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group"><label>Phone</label><input className="input-field" value={editForm.contact_phone} onChange={e => setEditForm({...editForm, contact_phone: e.target.value})} /></div>
              <div className="form-group"><label>Email</label><input className="input-field" value={editForm.contact_email} onChange={e => setEditForm({...editForm, contact_email: e.target.value})} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group"><label>End Date</label><input type="date" className="input-field" value={editForm.end_date} onChange={e => setEditForm({...editForm, end_date: e.target.value})} /></div>
              <div className="form-group"><label>End Time</label><input type="time" className="input-field" value={editForm.end_time} onChange={e => setEditForm({...editForm, end_time: e.target.value})} /></div>
            </div>
          </div>
        </AppModal>
      )}

      {/* Add Issue Modal */}
      {showAddIssue && (
        <AppModal title="Add Issue" onClose={() => !addingIssue && setShowAddIssue(false)} width="480px"
          footer={<>
            <button className="btn btn-secondary" onClick={() => setShowAddIssue(false)} disabled={addingIssue}>Cancel</button>
            <button className="btn btn-primary" onClick={addIssue} disabled={addingIssue || !issueForm.title.trim()}>
              {addingIssue ? 'Adding...' : 'Add Issue'}
            </button>
          </>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div className="form-group"><label>Issue Title *</label><input className="input-field" placeholder="What's the issue?" value={issueForm.title} onChange={e => setIssueForm({...issueForm, title: e.target.value})} autoFocus /></div>

            {/* Note Type Toggle */}
            <div className="form-group">
              <label>Note Type</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className={`wd-type-btn ${issueForm.note_type === 'text' ? 'active' : ''}`}
                  onClick={() => setIssueForm({...issueForm, note_type: 'text'})}>
                  <MessageSquare size={14} /> Text
                </button>
                <button type="button" className={`wd-type-btn ${issueForm.note_type === 'voice' ? 'active' : ''}`}
                  onClick={() => setIssueForm({...issueForm, note_type: 'voice'})}>
                  <Mic size={14} /> Voice
                </button>
              </div>
            </div>

            {issueForm.note_type === 'text' ? (
              <div className="form-group"><label>Description</label><textarea className="input-field" rows={3} placeholder="Describe the issue..." value={issueForm.description} onChange={e => setIssueForm({...issueForm, description: e.target.value})} /></div>
            ) : (
              <div className="wd-voice-section">
                {isRecording ? (
                  <div className="wd-recording-active">
                    <div className="wd-recording-dot" />
                    <span>Recording {formatDuration(recordingTime)}</span>
                    <button onClick={stopRecording} className="wd-voice-btn stop"><MicOff size={14} /> Stop</button>
                    <button onClick={cancelRecording} className="wd-voice-btn cancel"><X size={14} /></button>
                  </div>
                ) : audioBlob ? (
                  <div className="wd-recording-preview">
                    <Volume2 size={16} /><span>Recorded {formatDuration(recordingTime)}</span>
                    <button onClick={() => { setAudioBlob(null); setRecordingTime(0); }} className="wd-voice-btn cancel"><X size={14} /> Discard</button>
                  </div>
                ) : (
                  <button onClick={startRecording} className="wd-voice-btn record"><Mic size={15} /> Record Voice Note</button>
                )}
              </div>
            )}
          </div>
        </AppModal>
      )}

      {/* Customer Docs Modal */}
      {showCustomerDocs && (
        <AppModal title="Import from Customer" onClose={() => setShowCustomerDocs(false)} width="500px"
          footer={<button className="btn btn-secondary" onClick={() => setShowCustomerDocs(false)}>Close</button>}
        >
          {customerDocs.length === 0 ? (
            <div className="wd-empty-inline"><FileText size={28} /><p>No documents found for this customer.</p></div>
          ) : (
            <div className="wd-cust-docs-list">
              {customerDocs.map(doc => {
                const isAttaching = attachingDoc === (doc._id || doc.id);
                return (
                  <div key={doc._id || doc.id} className="wd-cust-doc-item">
                    <div className="wd-cust-doc-icon"><FileText size={20} /></div>
                    <div className="wd-cust-doc-info">
                      <span className="wd-cust-doc-name">{doc.name}</span>
                      <span className="wd-cust-doc-meta">{doc.file_size ? `${(doc.file_size/1024).toFixed(1)} KB` : ''}</span>
                    </div>
                    <button className="wd-cust-doc-attach" onClick={() => attachCustomerDoc(doc._id || doc.id)} disabled={isAttaching}>
                      {isAttaching ? <Spinner size={13} /> : <><LinkIcon size={13} /> Attach</>}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </AppModal>
      )}

      {/* Document Preview */}
      {previewDoc && (
        <Portal>
          <div
            className="wd-preview-overlay"
            onClick={() => { setPreviewDoc(null); zoomReset(); }}
            onMouseMove={handlePanMove}
            onMouseUp={handlePanEnd}
            onMouseLeave={handlePanEnd}
          >
            <div className="wd-preview-modal" onClick={e => e.stopPropagation()}>
              <div className="wd-preview-header">
                <span>{previewDoc.name}</span>
                <div className="wd-preview-actions">
                  {/* Zoom controls (images only) */}
                  {previewDoc.file_type?.startsWith('image/') && (
                    <>
                      <button onClick={zoomOut} title="Zoom out"><ZoomOut size={16} /></button>
                      <span className="wd-preview-zoom-label" title="Click to reset">{Math.round(zoom * 100)}%</span>
                      <button onClick={zoomIn} title="Zoom in"><ZoomIn size={16} /></button>
                      <button onClick={zoomReset} title="Reset zoom"><Maximize2 size={16} /></button>
                      <span style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 2px' }} />
                    </>
                  )}
                  <a href={previewDoc.data || previewDoc.file_url} download={previewDoc.name}><Download size={16} /></a>
                  <button onClick={() => { setPreviewDoc(null); zoomReset(); }}><X size={18} /></button>
                </div>
              </div>
              <div
                className="wd-preview-body"
                onWheel={handlePreviewWheel}
              >
                {previewDoc.file_type?.startsWith('image/') ? (
                  <img
                    src={previewDoc.data || previewDoc.file_url}
                    alt={previewDoc.name}
                    className="wd-preview-image"
                    style={{
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                      cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'zoom-in',
                      transition: isPanning ? 'none' : 'transform 0.2s ease',
                    }}
                    onMouseDown={handlePanStart}
                    onClick={() => { if (zoom <= 1) zoomIn(); }}
                    draggable={false}
                  />
                ) : previewDoc.file_type?.includes('pdf') ? (
                  <iframe src={previewDoc.data || previewDoc.file_url} title={previewDoc.name} />
                ) : (
                  <div className="wd-preview-unsupported"><FileText size={48} /><p>Preview not available</p></div>
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
};

export default WorkDetail;
