import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import {
  ArrowLeft, Save, Trash2, Plus, X, FileText, AlertTriangle,
  MessageSquare, Clock, CheckCircle, XCircle, PauseCircle,
  Briefcase, Calendar, Tag, Users, Mic, MicOff,
  Download, Eye, Upload, Link as LinkIcon, Loader2, Send,
  Edit2, Check, Activity, Volume2, AlertOctagon, CreditCard
} from 'lucide-react';
import Portal from '../../components/Portal';
import './WorkDetail.css';

const STATUS_CONFIG = {
  new:         { label: 'New',         color: '#8b5cf6', icon: Briefcase },
  pending:     { label: 'Pending',     color: '#f59e0b', icon: Clock },
  in_progress: { label: 'In Progress', color: '#3b82f6', icon: Clock },
  on_hold:     { label: 'On Hold',     color: '#f97316', icon: PauseCircle },
  completed:   { label: 'Completed',   color: '#22c55e', icon: CheckCircle },
  closed:      { label: 'Closed',      color: '#6b7280', icon: XCircle },
};

const PRIORITY_CONFIG = {
  low:    { label: 'Low',    color: '#6b7280' },
  medium: { label: 'Medium', color: '#f59e0b' },
  high:   { label: 'High',   color: '#ef4444' },
  urgent: { label: 'Urgent', color: '#dc2626' },
};

const ISSUE_STATUS = {
  open:        { label: 'Open',        color: '#ef4444' },
  in_progress: { label: 'In Progress', color: '#f59e0b' },
  resolved:    { label: 'Resolved',    color: '#22c55e' },
};

const Spinner = ({ size = 14 }) => <Loader2 size={size} className="spin" />;

const WorkDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [work, setWork] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [changingStatus, setChangingStatus] = useState(false);

  // Confirm delete modal
  const [confirmDelete, setConfirmDelete] = useState(null); // { type, id, label }

  // Notes
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [deletingNote, setDeletingNote] = useState(null);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  // Issues
  const [showAddIssueModal, setShowAddIssueModal] = useState(false);
  const [issueForm, setIssueForm] = useState({ title: '', description: '', priority: 'medium' });
  const [addingIssue, setAddingIssue] = useState(false);
  const [updatingIssue, setUpdatingIssue] = useState(null);

  // Documents
  const [showCustomerDocs, setShowCustomerDocs] = useState(false);
  const [customerDocs, setCustomerDocs] = useState([]);
  const [loadingCustomerDocs, setLoadingCustomerDocs] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachingDoc, setAttachingDoc] = useState(null);
  const [deletingDoc, setDeletingDoc] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);



  const fetchWork = useCallback(async () => {
    try {
      const data = await api.getWork(id);
      setWork(data);
      setEditForm({
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        start_date: data.start_date,
        due_date: data.due_date,
        tags: (data.tags || []).join(', '),
        payment_method: data.payment_method || 'Cash',
      });
    } catch (err) {
      console.error('Failed to load work:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchWork(); }, [fetchWork]);



  // ── Quick Status ───────────────────────────────────────────────
  const quickStatusChange = async (newStatus) => {
    try {
      setChangingStatus(true);
      await api.updateWork(id, { status: newStatus });
      fetchWork();
    } catch (err) { alert('Failed: ' + err.message); }
    finally { setChangingStatus(false); }
  };

  // ── Voice Recording ────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        setAudioBlob(new Blob(audioChunksRef.current, { type: 'audio/webm' }));
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
    } catch (err) { alert('Microphone access denied.'); }
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

  const submitVoiceNote = async () => {
    if (!audioBlob) return;
    try {
      setAddingNote(true);
      const reader = new FileReader();
      reader.onload = async () => {
        await api.addWorkNote(id, { type: 'voice', audio_data: reader.result, duration: recordingTime, content: `Voice note (${formatTimer(recordingTime)})` });
        setAudioBlob(null); setRecordingTime(0); fetchWork();
      };
      reader.readAsDataURL(audioBlob);
    } catch (err) { alert('Failed: ' + err.message); }
    finally { setAddingNote(false); }
  };

  // ── Text Notes ────────────────────────────────────────────────
  const addTextNote = async () => {
    if (!noteText.trim()) return;
    try {
      setAddingNote(true);
      await api.addWorkNote(id, { type: 'text', content: noteText.trim() });
      setNoteText('');
      fetchWork();
    } catch (err) { alert('Failed: ' + err.message); }
    finally { setAddingNote(false); }
  };

  const deleteNote = async (noteId) => {
    setConfirmDelete({ type: 'note', id: noteId, label: 'this note' });
  };

  // ── Issues ────────────────────────────────────────────────────
  const addIssue = async (e) => {
    e.preventDefault();
    if (!issueForm.title.trim()) return;
    try {
      setAddingIssue(true);
      await api.addWorkIssue(id, issueForm);
      setIssueForm({ title: '', description: '', priority: 'medium' });
      setShowAddIssueModal(false);
      fetchWork();
    } catch (err) { alert('Failed: ' + err.message); }
    finally { setAddingIssue(false); }
  };

  const updateIssueStatus = async (issueId, newStatus) => {
    try {
      setUpdatingIssue(issueId);
      await api.updateWorkIssue(id, issueId, { status: newStatus });
      fetchWork();
    } catch (err) { alert('Failed: ' + err.message); }
    finally { setUpdatingIssue(null); }
  };

  const deleteIssue = async (issueId) => {
    setConfirmDelete({ type: 'issue', id: issueId, label: 'this issue' });
  };

  // ── Documents ─────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setUploading(true);
      const reader = new FileReader();
      reader.onload = async () => {
        await api.addWorkDocument(id, { name: file.name, file_type: file.type, file_size: file.size, data: reader.result });
        fetchWork();
      };
      reader.readAsDataURL(file);
    } catch (err) { alert('Failed: ' + err.message); }
    finally { setUploading(false); }
  };

  const loadCustomerDocs = async () => {
    if (!work?.customer_id) return;
    try {
      setLoadingCustomerDocs(true);
      const custId = work.customer_id.id || work.customer_id._id || work.customer_id;
      const customer = await api.getCustomer(custId);
      setCustomerDocs(customer.documents || []);
      setShowCustomerDocs(true);
    } catch (err) { alert('Failed: ' + err.message); }
    finally { setLoadingCustomerDocs(false); }
  };

  const attachCustomerDoc = async (docId) => {
    try {
      setAttachingDoc(docId);
      const custId = work.customer_id.id || work.customer_id._id || work.customer_id;
      await api.addWorkDocumentFromCustomer(id, { customer_id: custId, document_id: docId });
      setShowCustomerDocs(false);
      fetchWork();
    } catch (err) { alert('Failed: ' + err.message); }
    finally { setAttachingDoc(null); }
  };

  const deleteDocument = async (docId) => {
    setConfirmDelete({ type: 'document', id: docId, label: 'this document' });
  };

  // ── Confirm Delete Action ──────────────────────────────────────
  const executeConfirmDelete = async () => {
    if (!confirmDelete) return;
    try {
      const { type, id: itemId } = confirmDelete;
      if (type === 'note') { setDeletingNote(itemId); await api.deleteWorkNote(id, itemId); }
      else if (type === 'issue') { await api.deleteWorkIssue(id, itemId); }
      else if (type === 'document') { setDeletingDoc(itemId); await api.deleteWorkDocument(id, itemId); }
      fetchWork();
    } catch (err) { alert('Failed: ' + err.message); }
    finally {
      setDeletingNote(null);
      setDeletingDoc(null);
      setConfirmDelete(null);
    }
  };

  // ── Save Edit ──────────────────────────────────────────────────
  const saveChanges = async () => {
    try {
      setSaving(true);
      const body = {
        ...editForm,
        tags: editForm.tags ? editForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      };
      await api.updateWork(id, body);
      setShowEditModal(false);
      fetchWork();
    } catch (err) { alert('Failed: ' + err.message); }
    finally { setSaving(false); }
  };

  // ── Helpers ────────────────────────────────────────────────────
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const formatDuration = (sec) => { const m = Math.floor(sec / 60), s = sec % 60; return `${m}:${String(s).padStart(2, '0')}`; };

  const isOverdue = work && work.due_date && !['completed', 'closed'].includes(work.status) && new Date(work.due_date) < new Date();

  // ── Loading ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="wd-root">
        <div className="wd-skeleton-header"><div className="wd-sk-line wd-sk-w80" /><div className="wd-sk-line wd-sk-w120" /></div>          <div className="wd-skeleton-tabs">{[1,2,3,4].map(i => <div key={i} className="wd-sk-tab" />)}</div>
        <div className="wd-skeleton-content">
          <div className="wd-sk-card"><div className="wd-sk-line wd-sk-w60" /><div className="wd-sk-line wd-sk-full" /><div className="wd-sk-line wd-sk-w80" /></div>
          <div className="wd-sk-card">{[1,2,3,4].map(i => <div key={i} className="wd-sk-row" />)}</div>
        </div>
      </div>
    );
  }

  if (!work) {
    return (
      <div className="wd-root">
        <div className="wd-empty">
          <Briefcase size={48} /><h3>Work not found</h3><p>This work may have been deleted.</p>
          <button className="wd-btn-back" onClick={() => navigate('/admin/billing/works')}><ArrowLeft size={16} /> Back to Works</button>
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[work.status] || STATUS_CONFIG.new;
  const priorityCfg = PRIORITY_CONFIG[work.priority] || PRIORITY_CONFIG.medium;
  const openIssues = (work.issues || []).filter(i => i.status !== 'resolved').length;

  return (
    <div className="wd-root">
      {/* ═══════════════════════════════════════════════════════════════
          HEADER
         ═══════════════════════════════════════════════════════════════ */}
      <div className="wd-header">
        <button className="wd-back" onClick={() => navigate('/admin/billing/works')}>
          <ArrowLeft size={18} /> Works
        </button>
        <div className="wd-header-center">
          <span className="wd-work-id">{work.work_id}</span>
          <span className="wd-status" style={{ color: statusCfg.color, background: `${statusCfg.color}18` }}>
            {React.createElement(statusCfg.icon, { size: 13 })} {statusCfg.label}
          </span>
          <span className="wd-priority" style={{ color: priorityCfg.color }}>● {priorityCfg.label}</span>
          {isOverdue && <span className="wd-overdue-badge">Overdue</span>}
        </div>
        <div className="wd-header-right">
          <button className="wd-btn-edit" onClick={() => { setEditForm({ title: work.title, description: work.description, status: work.status, priority: work.priority, start_date: work.start_date, due_date: work.due_date, tags: (work.tags || []).join(', '), payment_method: work.payment_method || 'Cash' }); setShowEditModal(true); }}>
            <Edit2 size={14} /> Edit
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="wd-tabs">
        {[
          { key: 'overview', label: 'Overview', icon: Briefcase },
          { key: 'notes', label: `Notes (${(work.notes || []).length})`, icon: MessageSquare },
          { key: 'issues', label: `Issues (${openIssues})`, icon: AlertTriangle },
          { key: 'documents', label: `Docs (${(work.documents || []).length})`, icon: FileText },
        ].map(tab => (
          <button key={tab.key} className={`wd-tab ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>
            {React.createElement(tab.icon, { size: 14 })} {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          CONTENT
         ═══════════════════════════════════════════════════════════════ */}
      <div className="wd-content">

        {/* ═══════ OVERVIEW TAB ═══════════════════════════ */}
        {activeTab === 'overview' && (
          <div className="wd-overview">
            {/* ── Hero Card ────────────────────────────────── */}
            <div className="wd-info-card wd-hero-card" style={{ '--hero-accent': statusCfg.color }}>
              <div className="wd-hero-top">
                <h2 className="wd-hero-title">{work.title}</h2>
                <div className="wd-hero-meta">
                  <span className="wd-status" style={{ color: statusCfg.color, background: `${statusCfg.color}18` }}>
                    {React.createElement(statusCfg.icon, { size: 12 })} {statusCfg.label}
                  </span>
                  <span className="wd-priority" style={{ color: priorityCfg.color }}>● {priorityCfg.label}</span>
                </div>
              </div>
              {work.description && <p className="wd-hero-desc">{work.description}</p>}
              <div className="wd-hero-bottom">
                {work.tags?.length > 0 ? (
                  <div className="wd-hero-tags">
                    {work.tags.map((tag, i) => <span key={i} className="wd-tag"><Tag size={10} /> {tag}</span>)}
                  </div>
                ) : <div />}
                <div className="wd-hero-stats">
                  <span className="wd-hero-stat"><FileText size={12} /> {(work.documents || []).length} docs</span>
                  <span className="wd-hero-stat"><MessageSquare size={12} /> {(work.notes || []).length} notes</span>
                  <span className="wd-hero-stat"><AlertTriangle size={12} /> {openIssues} issues</span>
                </div>
              </div>
            </div>

            {/* ── Grid: Customer + Status + Timeline ──────── */}
            <div className="wd-overview-grid three-col">
              {/* Customer Card */}
              <div className="wd-info-card">
                <h4 className="wd-card-section-title"><Users size={14} /> Customer</h4>
                {work.customer_id && work.customer_id.name ? (
                  <div className="wd-customer-card">
                    <div className="wd-customer-card-header">
                      <div className="wd-customer-avatar">{work.customer_id.name.charAt(0).toUpperCase()}</div>
                      <div className="wd-customer-card-info">
                        <span className="wd-customer-card-name">{work.customer_id.name}</span>
                        <span className="wd-customer-card-id">Linked Customer</span>
                      </div>
                    </div>
                    <div className="wd-customer-card-details">
                      {work.customer_id.phone && <div className="wd-customer-detail"><span className="wd-customer-detail-label">Phone</span><span className="wd-customer-detail-value">{work.customer_id.phone}</span></div>}
                      {work.customer_id.email && <div className="wd-customer-detail"><span className="wd-customer-detail-label">Email</span><span className="wd-customer-detail-value">{work.customer_id.email}</span></div>}
                      {work.customer_id.address && <div className="wd-customer-detail full"><span className="wd-customer-detail-label">Address</span><span className="wd-customer-detail-value">{work.customer_id.address}</span></div>}
                    </div>
                    <button className="wd-customer-link" style={{ alignSelf: 'flex-start', marginTop: '0.35rem' }} onClick={() => navigate(`/admin/billing/customers/${work.customer_id._id || work.customer_id.id}`)}>
                      View Profile →
                    </button>
                  </div>
                ) : (
                  <div className="wd-customer-card wd-walkin">
                    <div className="wd-customer-card-header">
                      <div className="wd-customer-avatar walkin">W</div>
                      <div className="wd-customer-card-info">
                        <span className="wd-customer-card-name">{work.customer_name || 'Walk-in'}</span>
                        <span className="wd-customer-card-id">No customer linked</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Status */}
              <div className="wd-info-card">
                <h4 className="wd-card-section-title"><Activity size={14} /> Status</h4>
                <div className="wd-status-grid">
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <button key={key} className={`wd-status-btn ${work.status === key ? 'active' : ''}`}
                      style={{ '--status-color': cfg.color }}
                      onClick={() => quickStatusChange(key)}
                      disabled={changingStatus || work.status === key}
                    >
                      {changingStatus && work.status !== key ? <Spinner size={12} /> : React.createElement(cfg.icon, { size: 13 })}
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timeline */}
              <div className="wd-info-card">
                <h4 className="wd-card-section-title"><Calendar size={14} /> Details</h4>
                <div className="wd-detail-row"><Calendar size={14} /><span className="wd-detail-label">Created</span><span className="wd-detail-value">{formatDate(work.createdAt)}</span></div>
                <div className="wd-detail-row"><Clock size={14} /><span className="wd-detail-label">Start</span><span className="wd-detail-value">{formatDate(work.start_date)}</span></div>
                <div className={`wd-detail-row ${isOverdue ? 'overdue' : ''}`}><Calendar size={14} /><span className="wd-detail-label">Due</span><span className="wd-detail-value">{formatDate(work.due_date)}</span></div>
                {work.completed_at && <div className="wd-detail-row"><CheckCircle size={14} /><span className="wd-detail-label">Done</span><span className="wd-detail-value">{formatDate(work.completed_at)}</span></div>}
                <div className="wd-detail-row"><CreditCard size={14} /><span className="wd-detail-label">Payment</span><span className="wd-detail-value">{work.payment_method || 'Cash'}</span></div>
              </div>
            </div>
          </div>
        )}



        {/* ═══════ NOTES TAB ═══════════════════════════════ */}
        {activeTab === 'notes' && (
          <div className="wd-notes">
            <div className="wd-voice-recorder">
              {isRecording ? (
                <div className="wd-recording">
                  <div className="wd-recording-indicator"><div className="wd-recording-dot" /><span>Recording {formatDuration(recordingTime)}</span></div>
                  <div className="wd-recording-actions">
                    <button onClick={stopRecording} className="wd-voice-btn stop"><MicOff size={15} /> Stop</button>
                    <button onClick={cancelRecording} className="wd-voice-btn cancel"><X size={15} /> Cancel</button>
                  </div>
                </div>
              ) : audioBlob ? (
                <div className="wd-recording-preview">
                  <Volume2 size={16} /><span>Recorded {formatDuration(recordingTime)}</span>
                  <div className="wd-recording-actions">
                    <button onClick={submitVoiceNote} className="wd-voice-btn submit" disabled={addingNote}>{addingNote ? <Spinner /> : <Send size={14} />} Send</button>
                    <button onClick={() => { setAudioBlob(null); setRecordingTime(0); }} className="wd-voice-btn cancel"><X size={14} /> Discard</button>
                  </div>
                </div>
              ) : (
                <button onClick={startRecording} className="wd-voice-btn record"><Mic size={15} /> Record Voice Note</button>
              )}
            </div>

            <div className="wd-note-input">
              <textarea placeholder="Type a note... (Enter to send)" value={noteText} onChange={e => setNoteText(e.target.value)} rows={2}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addTextNote(); } }} />
              <button onClick={addTextNote} disabled={addingNote || !noteText.trim()} className="wd-note-send">
                {addingNote ? <Spinner /> : <Send size={16} />}
              </button>
            </div>

            <div className="wd-notes-list">
              {(work.notes || []).length === 0 ? (
                <div className="wd-empty-inline"><MessageSquare size={28} /><p>No notes yet.</p></div>
              ) : work.notes.map((note) => (
                <div key={note.id || note._id} className={`wd-note-card ${note.type}`}>
                  <div className="wd-note-header">
                    <span className="wd-note-type-badge">{note.type === 'voice' ? <Mic size={11} /> : <MessageSquare size={11} />}{note.type === 'voice' ? 'Voice' : 'Text'}</span>
                    <span className="wd-note-time">{formatDate(note.createdAt)}</span>
                    <button className="wd-delete-btn" onClick={() => deleteNote(note.id || note._id)} disabled={deletingNote === (note.id || note._id)}>
                      {deletingNote === (note.id || note._id) ? <Spinner size={12} /> : <Trash2 size={12} />}
                    </button>
                  </div>
                  {note.type === 'voice' ? (
                    <div className="wd-voice-note"><audio controls src={note.audio_data || note.audio_url} className="wd-audio-player" /><span className="wd-voice-duration">{formatDuration(note.duration || 0)}</span></div>
                  ) : (
                    <p className="wd-note-content">{note.content}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════ ISSUES TAB ══════════════════════════════ */}
        {activeTab === 'issues' && (
          <div className="wd-issues">
            <div className="wd-issues-header">
              <h4 className="wd-card-section-title"><AlertTriangle size={14} /> Issues ({(work.issues || []).length})</h4>
              <button className="wd-add-btn" onClick={() => setShowAddIssueModal(true)}><Plus size={14} /> Add Issue</button>
            </div>
            <div className="wd-issues-list">
              {(work.issues || []).length === 0 ? (
                <div className="wd-empty-inline"><AlertTriangle size={28} /><p>No issues reported yet.</p></div>
              ) : work.issues.map((issue) => {
                const issueStatus = ISSUE_STATUS[issue.status] || ISSUE_STATUS.open;
                const issuePriority = PRIORITY_CONFIG[issue.priority] || PRIORITY_CONFIG.medium;
                const isUpdatingThis = updatingIssue === (issue.id || issue._id);
                return (
                  <div key={issue.id || issue._id} className={`wd-issue-card ${issue.status}`}>
                    <div className="wd-issue-top">
                      <span className="wd-issue-status-dot" style={{ background: issueStatus.color }} />
                      <span className="wd-issue-title">{issue.title}</span>
                      <span className="wd-badge-pill" style={{ color: issuePriority.color, background: `${issuePriority.color}18` }}>{issuePriority.label}</span>
                      <span className="wd-issue-date">{formatDate(issue.createdAt)}</span>
                      <button className="wd-delete-btn" onClick={() => deleteIssue(issue.id || issue._id)}><Trash2 size={12} /></button>
                    </div>
                    {issue.description && <p className="wd-issue-desc">{issue.description}</p>}
                    {issue.status !== 'resolved' && (
                      <div className="wd-issue-actions">
                        {issue.status === 'open' && <button onClick={() => updateIssueStatus(issue.id || issue._id, 'in_progress')} disabled={isUpdatingThis}>{isUpdatingThis ? <Spinner size={11} /> : <><Clock size={11} /> Start</>}</button>}
                        {(issue.status === 'in_progress' || issue.status === 'open') && <button onClick={() => updateIssueStatus(issue.id || issue._id, 'resolved')} className="resolve" disabled={isUpdatingThis}>{isUpdatingThis ? <Spinner size={11} /> : <><Check size={11} /> Resolve</>}</button>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════ DOCUMENTS TAB ═══════════════════════════ */}
        {activeTab === 'documents' && (
          <div className="wd-documents">
            <div className="wd-docs-header">
              <h4 className="wd-card-section-title"><FileText size={14} /> Documents ({(work.documents || []).length})</h4>
              <div className="wd-docs-actions">
                {work.customer_id && <button className="wd-add-btn secondary" onClick={loadCustomerDocs} disabled={loadingCustomerDocs}>{loadingCustomerDocs ? <Spinner /> : <LinkIcon size={14} />} From Customer</button>}
                <label className="wd-add-btn">{uploading ? <><Spinner /> Uploading...</> : <><Upload size={14} /> Upload</>}<input type="file" onChange={handleFileUpload} style={{ display: 'none' }} accept="image/*,.pdf,.doc,.docx" disabled={uploading} /></label>
              </div>
            </div>

            <div className="wd-docs-grid">
              {(work.documents || []).length === 0 ? (
                <div className="wd-empty-inline"><FileText size={28} /><p>No documents yet.</p></div>
              ) : work.documents.map((doc) => {
                const isImage = doc.file_type?.startsWith('image/'), isPdf = doc.file_type?.includes('pdf'), isDel = deletingDoc === (doc.id || doc._id);
                return (
                  <div key={doc.id || doc._id} className={`wd-doc-card ${isDel ? 'deleting' : ''}`}>
                    <div className="wd-doc-thumb" onClick={() => setPreviewDoc(doc)}>
                      {isImage && doc.file_url ? <img src={doc.file_url} alt={doc.name} /> : isPdf ? <div className="wd-doc-pdf-icon"><FileText size={24} /> PDF</div> : <div className="wd-doc-file-icon"><FileText size={24} /></div>}
                      <div className="wd-doc-thumb-overlay"><Eye size={16} /> Preview</div>
                    </div>
                    <div className="wd-doc-info">
                      <span className="wd-doc-name" title={doc.name}>{doc.name}</span>
                      <span className="wd-doc-meta">{doc.source === 'customer' && <span className="wd-doc-source">📎 Customer</span>}{doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : ''}</span>
                    </div>
                    <div className="wd-doc-actions">
                      <button onClick={() => setPreviewDoc(doc)} title="Preview"><Eye size={13} /></button>
                      <a href={doc.file_url || doc.data} download={doc.name} title="Download"><Download size={13} /></a>
                      <button onClick={() => deleteDocument(doc.id || doc._id)} title="Delete" className="danger" disabled={isDel}>{isDel ? <Spinner size={12} /> : <Trash2 size={13} />}</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MODALS
         ═══════════════════════════════════════════════════════════════ */}

      {/* ── Edit Work Modal ──────────────────────────────── */}
      {showEditModal && (
        <Portal>
          <div className="wd-modal-overlay" onClick={() => !saving && setShowEditModal(false)}>
            <div className="wd-modal" onClick={e => e.stopPropagation()}>
              <div className="wd-modal-header">
                <h3><Edit2 size={16} /> Edit Work</h3>
                <button onClick={() => setShowEditModal(false)} disabled={saving}><X size={18} /></button>
              </div>
              <div className="wd-modal-body">
                <div className="wd-form-group"><label>Title</label><input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} /></div>
                <div className="wd-form-group"><label>Description</label><textarea rows={3} value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} /></div>
                <div className="wd-form-row">
                  <div className="wd-form-group"><label>Status</label><select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}>{Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
                  <div className="wd-form-group"><label>Priority</label><select value={editForm.priority} onChange={e => setEditForm({...editForm, priority: e.target.value})}>{Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
                  <div className="wd-form-group"><label>Payment Method</label><select value={editForm.payment_method || 'Cash'} onChange={e => setEditForm({...editForm, payment_method: e.target.value})}><option value="Cash">Cash</option><option value="UPI">UPI</option><option value="UPI - Bank">UPI - Bank</option><option value="Cash - Bank">Cash - Bank</option><option value="Cheque">Cheque</option><option value="Other">Other</option></select></div>
                </div>
                <div className="wd-form-row">
                  <div className="wd-form-group"><label>Start Date</label><input type="date" value={editForm.start_date} onChange={e => setEditForm({...editForm, start_date: e.target.value})} /></div>
                  <div className="wd-form-group"><label>Due Date</label><input type="date" value={editForm.due_date} onChange={e => setEditForm({...editForm, due_date: e.target.value})} /></div>
                </div>

                <div className="wd-form-group"><label>Tags (comma separated)</label><input value={editForm.tags} onChange={e => setEditForm({...editForm, tags: e.target.value})} placeholder="tag1, tag2, tag3" /></div>
              </div>
              <div className="wd-modal-footer">
                <button className="wd-btn-cancel" onClick={() => setShowEditModal(false)} disabled={saving}>Cancel</button>
                <button className="wd-btn-save" onClick={saveChanges} disabled={saving}>{saving ? <Spinner /> : <Save size={14} />} Save Changes</button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ── Add Issue Modal ──────────────────────────────── */}
      {showAddIssueModal && (
        <Portal>
          <div className="wd-modal-overlay" onClick={() => !addingIssue && setShowAddIssueModal(false)}>
            <div className="wd-modal wd-modal-sm" onClick={e => e.stopPropagation()}>
              <div className="wd-modal-header">
                <h3><AlertOctagon size={16} /> Add Issue</h3>
                <button onClick={() => setShowAddIssueModal(false)} disabled={addingIssue}><X size={18} /></button>
              </div>
              <form className="wd-modal-body" onSubmit={addIssue}>
                <div className="wd-form-group"><label>Issue Title *</label><input placeholder="e.g., Server not responding" value={issueForm.title} onChange={e => setIssueForm({...issueForm, title: e.target.value})} required autoFocus /></div>
                <div className="wd-form-group"><label>Description</label><textarea rows={3} placeholder="Details about the issue..." value={issueForm.description} onChange={e => setIssueForm({...issueForm, description: e.target.value})} /></div>
                <div className="wd-form-group"><label>Priority</label>
                  <div className="wd-priority-options">
                    {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                      <button key={k} type="button" className={`wd-priority-btn ${issueForm.priority === k ? 'active' : ''}`} style={{ '--p-color': v.color }}
                        onClick={() => setIssueForm({...issueForm, priority: k})}>● {v.label}</button>
                    ))}
                  </div>
                </div>
              </form>
              <div className="wd-modal-footer">
                <button className="wd-btn-cancel" onClick={() => setShowAddIssueModal(false)} disabled={addingIssue}>Cancel</button>
                <button className="wd-btn-save" onClick={addIssue} disabled={addingIssue || !issueForm.title.trim()}>{addingIssue ? <Spinner /> : <Plus size={14} />} Add Issue</button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ── Customer Documents Modal ──────────────────────── */}
      {showCustomerDocs && (
        <Portal>
          <div className="wd-modal-overlay" onClick={() => setShowCustomerDocs(false)}>
            <div className="wd-modal" onClick={e => e.stopPropagation()}>
              <div className="wd-modal-header">
                <h3><LinkIcon size={16} /> Customer Documents — {work.customer_name}</h3>
                <button onClick={() => setShowCustomerDocs(false)}><X size={18} /></button>
              </div>
              <div className="wd-modal-body">
                {customerDocs.length === 0 ? (
                  <div className="wd-empty-inline"><FileText size={28} /><p>No documents found for this customer.</p></div>
                ) : (
                  <div className="wd-customer-docs-list">
                    {customerDocs.map(doc => {
                      const isImage = doc.file_type?.startsWith('image/');
                      const isPdf = doc.file_type?.includes('pdf');
                      const isAttaching = attachingDoc === (doc.id || doc._id);
                      return (
                        <div key={doc.id || doc._id} className="wd-cust-doc-item">
                          <div className="wd-cust-doc-thumb">
                            {isImage && doc.file_url ? <img src={doc.file_url} alt={doc.name} /> : isPdf ? <FileText size={20} className="pdf-icon" /> : <FileText size={20} />}
                          </div>
                          <div className="wd-cust-doc-info">
                            <span className="wd-cust-doc-name" title={doc.name}>{doc.name}</span>
                            <span className="wd-cust-doc-meta">{doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : ''} {doc.file_type || ''}</span>
                          </div>
                          <button className="wd-cust-doc-attach" onClick={() => attachCustomerDoc(doc.id || doc._id)} disabled={isAttaching}>
                            {isAttaching ? <Spinner size={13} /> : <><LinkIcon size={13} /> Attach</>}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="wd-modal-footer">
                <button className="wd-btn-cancel" onClick={() => setShowCustomerDocs(false)}>Close</button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ── Confirm Delete Modal ─────────────────────────── */}
      {confirmDelete && (
        <Portal>
          <div className="wd-modal-overlay" onClick={() => setConfirmDelete(null)}>
            <div className="wd-modal wd-modal-xs" onClick={e => e.stopPropagation()}>
              <div className="wd-modal-header wd-modal-header-danger">
                <h3><AlertTriangle size={16} /> Confirm Delete</h3>
                <button onClick={() => setConfirmDelete(null)}><X size={18} /></button>
              </div>
              <div className="wd-modal-body wd-modal-body-center">
                <div className="wd-confirm-icon"><Trash2 size={28} /></div>
                <p>Are you sure you want to delete {confirmDelete.label}?</p>
                <span className="wd-confirm-sub">This action cannot be undone.</span>
              </div>
              <div className="wd-modal-footer">
                <button className="wd-btn-cancel" onClick={() => setConfirmDelete(null)}>Cancel</button>
                <button className="wd-btn-danger" onClick={executeConfirmDelete}><Trash2 size={14} /> Delete</button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ── Document Preview Modal ───────────────────────── */}
      {previewDoc && (
        <Portal>
          <div className="wd-modal-overlay" onClick={() => setPreviewDoc(null)}>
            <div className="wd-modal wd-modal-lg" onClick={e => e.stopPropagation()}>
              <div className="wd-modal-header">
                <span>{previewDoc.name}</span>
                <div className="wd-modal-actions">
                  <a href={previewDoc.file_url || previewDoc.data} download={previewDoc.name}><Download size={16} /></a>
                  <button onClick={() => setPreviewDoc(null)}><X size={18} /></button>
                </div>
              </div>
              <div className="wd-preview-content">
                {previewDoc.file_type?.startsWith('image/') ? <img src={previewDoc.file_url || previewDoc.data} alt={previewDoc.name} /> :
                 previewDoc.file_type?.includes('pdf') ? <iframe src={previewDoc.file_url || previewDoc.data} title={previewDoc.name} /> :
                 <div className="wd-preview-unsupported"><FileText size={48} /><p>Preview not available</p><a href={previewDoc.file_url || previewDoc.data} download={previewDoc.name} className="wd-btn-save"><Download size={14} /> Download</a></div>}
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
};

export default WorkDetail;
