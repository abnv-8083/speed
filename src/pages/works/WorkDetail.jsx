import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import {
  ArrowLeft, Save, Trash2, Plus, X, FileText, AlertTriangle,
  MessageSquare, Clock, CheckCircle, XCircle, PauseCircle,
  Briefcase, Calendar, Tag, Users, Mic, MicOff, Play, Pause,
  Download, Eye, Upload, Link as LinkIcon, Loader2, Send,
  Edit2, Check, Timer, TrendingUp, Activity, Volume2
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

// ── Inline Loading Spinner ─────────────────────────────────
const Spinner = ({ size = 14 }) => <Loader2 size={size} className="spin" />;

const WorkDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [work, setWork] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});

  // Quick status change
  const [changingStatus, setChangingStatus] = useState(false);

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
  const [showAddIssue, setShowAddIssue] = useState(false);
  const [issueForm, setIssueForm] = useState({ title: '', description: '', priority: 'medium' });
  const [addingIssue, setAddingIssue] = useState(false);
  const [updatingIssue, setUpdatingIssue] = useState(null);
  const [deletingIssue, setDeletingIssue] = useState(null);

  // Documents
  const [showCustomerDocs, setShowCustomerDocs] = useState(false);
  const [customerDocs, setCustomerDocs] = useState([]);
  const [loadingCustomerDocs, setLoadingCustomerDocs] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachingDoc, setAttachingDoc] = useState(null);
  const [deletingDoc, setDeletingDoc] = useState(null);

  // Preview
  const [previewDoc, setPreviewDoc] = useState(null);

  // Time tracking
  const [activeTimeLog, setActiveTimeLog] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timeLogDesc, setTimeLogDesc] = useState('');
  const [startingTimer, setStartingTimer] = useState(false);
  const [stoppingTimer, setStoppingTimer] = useState(false);
  const [deletingTimeLog, setDeletingTimeLog] = useState(null);
  const timerIntervalRef = useRef(null);

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
        estimated_hours: data.estimated_hours || 0,
        actual_hours: data.actual_hours || 0,
      });
    } catch (err) {
      console.error('Failed to load work:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchWork();
  }, [fetchWork]);

  // ── Check for active time log on load ──────────────────────────
  useEffect(() => {
    if (work && work.time_logs) {
      const running = work.time_logs.find(t => !t.end_time);
      if (running) {
        setActiveTimeLog(running);
        const elapsed = Math.floor((Date.now() - new Date(running.start_time).getTime()) / 1000);
        setElapsedTime(elapsed);
        timerIntervalRef.current = setInterval(() => {
          setElapsedTime(prev => prev + 1);
        }, 1000);
      } else {
        setActiveTimeLog(null);
        setElapsedTime(0);
      }
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [work?.time_logs?.length]);

  // ── Time Tracking ──────────────────────────────────────────────

  const startTimeLog = async () => {
    try {
      setStartingTimer(true);
      const log = await api.startTimeLog(id, { description: timeLogDesc.trim(), billable: true });
      setActiveTimeLog(log);
      setTimeLogDesc('');
      setElapsedTime(0);
      timerIntervalRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
      fetchWork();
    } catch (err) {
      alert('Failed to start timer: ' + err.message);
    } finally {
      setStartingTimer(false);
    }
  };

  const stopTimeLog = async () => {
    if (!activeTimeLog) return;
    try {
      setStoppingTimer(true);
      clearInterval(timerIntervalRef.current);
      await api.stopTimeLog(id, activeTimeLog.id || activeTimeLog._id, {});
      setActiveTimeLog(null);
      setElapsedTime(0);
      fetchWork();
    } catch (err) {
      alert('Failed to stop timer: ' + err.message);
    } finally {
      setStoppingTimer(false);
    }
  };

  const deleteTimeLog = async (logId) => {
    if (!confirm('Delete this time log?')) return;
    try {
      setDeletingTimeLog(logId);
      await api.deleteTimeLog(id, logId);
      fetchWork();
    } catch (err) {
      alert('Failed to delete time log: ' + err.message);
    } finally {
      setDeletingTimeLog(null);
    }
  };

  const formatTimer = (totalSec) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatLogDuration = (sec) => {
    if (!sec) return '0:00';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  // ── Quick Status Change ────────────────────────────────────────

  const quickStatusChange = async (newStatus) => {
    try {
      setChangingStatus(true);
      await api.updateWork(id, { status: newStatus });
      fetchWork();
    } catch (err) {
      alert('Failed to change status: ' + err.message);
    } finally {
      setChangingStatus(false);
    }
  };

  // ── Voice Recording ────────────────────────────────────────────

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Microphone access denied.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    clearInterval(timerRef.current);
    setIsRecording(false);
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
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
        await api.addWorkNote(id, {
          type: 'voice',
          audio_data: reader.result,
          duration: recordingTime,
          content: `Voice note (${formatTimer(recordingTime)})`,
        });
        setAudioBlob(null);
        setRecordingTime(0);
        fetchWork();
      };
      reader.readAsDataURL(audioBlob);
    } catch (err) {
      alert('Failed to save voice note: ' + err.message);
    } finally {
      setAddingNote(false);
    }
  };

  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  // ── Text Notes ────────────────────────────────────────────────

  const addTextNote = async () => {
    if (!noteText.trim()) return;
    try {
      setAddingNote(true);
      await api.addWorkNote(id, { type: 'text', content: noteText.trim() });
      setNoteText('');
      fetchWork();
    } catch (err) {
      alert('Failed to add note: ' + err.message);
    } finally {
      setAddingNote(false);
    }
  };

  const deleteNote = async (noteId) => {
    if (!confirm('Delete this note?')) return;
    try {
      setDeletingNote(noteId);
      await api.deleteWorkNote(id, noteId);
      fetchWork();
    } catch (err) {
      alert('Failed to delete note: ' + err.message);
    } finally {
      setDeletingNote(null);
    }
  };

  // ── Issues ────────────────────────────────────────────────────

  const addIssue = async (e) => {
    e.preventDefault();
    if (!issueForm.title.trim()) return;
    try {
      setAddingIssue(true);
      await api.addWorkIssue(id, issueForm);
      setIssueForm({ title: '', description: '', priority: 'medium' });
      setShowAddIssue(false);
      fetchWork();
    } catch (err) {
      alert('Failed to add issue: ' + err.message);
    } finally {
      setAddingIssue(false);
    }
  };

  const updateIssueStatus = async (issueId, newStatus) => {
    try {
      setUpdatingIssue(issueId);
      await api.updateWorkIssue(id, issueId, { status: newStatus });
      fetchWork();
    } catch (err) {
      alert('Failed to update issue: ' + err.message);
    } finally {
      setUpdatingIssue(null);
    }
  };

  const deleteIssue = async (issueId) => {
    if (!confirm('Delete this issue?')) return;
    try {
      setDeletingIssue(issueId);
      await api.deleteWorkIssue(id, issueId);
      fetchWork();
    } catch (err) {
      alert('Failed to delete issue: ' + err.message);
    } finally {
      setDeletingIssue(null);
    }
  };

  // ── Documents ─────────────────────────────────────────────────

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setUploading(true);
      const reader = new FileReader();
      reader.onload = async () => {
        await api.addWorkDocument(id, {
          name: file.name,
          file_type: file.type,
          file_size: file.size,
          data: reader.result,
        });
        fetchWork();
      };
      reader.readAsDataURL(file);
    } catch (err) {
      alert('Failed to upload: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const loadCustomerDocs = async () => {
    if (!work?.customer_id) return;
    try {
      setLoadingCustomerDocs(true);
      const custId = work.customer_id.id || work.customer_id._id || work.customer_id;
      const customer = await api.getCustomer(custId);
      setCustomerDocs(customer.documents || []);
      setShowCustomerDocs(true);
    } catch (err) {
      alert('Failed to load customer documents: ' + err.message);
    } finally {
      setLoadingCustomerDocs(false);
    }
  };

  const attachCustomerDoc = async (docId) => {
    try {
      setAttachingDoc(docId);
      const custId = work.customer_id.id || work.customer_id._id || work.customer_id;
      await api.addWorkDocumentFromCustomer(id, { customer_id: custId, document_id: docId });
      setShowCustomerDocs(false);
      fetchWork();
    } catch (err) {
      alert('Failed to attach: ' + err.message);
    } finally {
      setAttachingDoc(null);
    }
  };

  const deleteDocument = async (docId) => {
    if (!confirm('Delete this document?')) return;
    try {
      setDeletingDoc(docId);
      await api.deleteWorkDocument(id, docId);
      fetchWork();
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    } finally {
      setDeletingDoc(null);
    }
  };

  // ── Save Changes ──────────────────────────────────────────────

  const saveChanges = async () => {
    try {
      setSaving(true);
      const body = {
        ...editForm,
        tags: editForm.tags ? editForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        estimated_hours: Number(editForm.estimated_hours) || 0,
        actual_hours: Number(editForm.actual_hours) || 0,
      };
      await api.updateWork(id, body);
      setEditMode(false);
      fetchWork();
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const isOverdue = work && work.due_date && work.status !== 'completed' && work.status !== 'closed' && new Date(work.due_date) < new Date();

  // ── Loading State ──────────────────────────────────────────────

  if (loading) {
    return (
      <div className="wd-root">
        <div className="wd-skeleton-header">
          <div className="wd-sk-line wd-sk-w80" />
          <div className="wd-sk-line wd-sk-w120" />
        </div>
        <div className="wd-skeleton-tabs">
          {[1,2,3,4,5].map(i => <div key={i} className="wd-sk-tab" />)}
        </div>
        <div className="wd-skeleton-content">
          <div className="wd-sk-card">
            <div className="wd-sk-line wd-sk-w60" />
            <div className="wd-sk-line wd-sk-full" />
            <div className="wd-sk-line wd-sk-w80" />
          </div>
          <div className="wd-sk-card">
            {[1,2,3,4].map(i => <div key={i} className="wd-sk-row" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!work) {
    return (
      <div className="wd-root">
        <div className="wd-empty">
          <Briefcase size={48} />
          <h3>Work not found</h3>
          <p>This work may have been deleted.</p>
          <button className="wd-btn-back" onClick={() => navigate('/billing/works')}>
            <ArrowLeft size={16} /> Back to Works
          </button>
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[work.status] || STATUS_CONFIG.new;
  const priorityCfg = PRIORITY_CONFIG[work.priority] || PRIORITY_CONFIG.medium;
  const openIssues = (work.issues || []).filter(i => i.status !== 'resolved').length;
  const totalLogs = (work.time_logs || []).filter(t => t.end_time).length;
  const progress = work.estimated_hours > 0
    ? Math.min(100, Math.round((work.actual_hours / work.estimated_hours) * 100))
    : 0;

  return (
    <div className="wd-root">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="wd-header">
        <button className="wd-back" onClick={() => navigate('/billing/works')}>
          <ArrowLeft size={18} /> Works
        </button>
        <div className="wd-header-center">
          <span className="wd-work-id">{work.work_id}</span>
          <span className="wd-status" style={{ color: statusCfg.color, background: `${statusCfg.color}18` }}>
            {React.createElement(statusCfg.icon, { size: 13 })} {statusCfg.label}
          </span>
          <span className="wd-priority" style={{ color: priorityCfg.color }}>
            ● {priorityCfg.label}
          </span>
          {isOverdue && <span className="wd-overdue-badge">Overdue</span>}
        </div>
        <div className="wd-header-right">
          {editMode ? (
            <>
              <button className="wd-btn-cancel" onClick={() => setEditMode(false)} disabled={saving}>Cancel</button>
              <button className="wd-btn-save" onClick={saveChanges} disabled={saving}>
                {saving ? <Spinner /> : <Save size={14} />} Save
              </button>
            </>
          ) : (
            <button className="wd-btn-edit" onClick={() => setEditMode(true)}>
              <Edit2 size={14} /> Edit
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────── */}
      <div className="wd-tabs">
        {[
          { key: 'overview', label: 'Overview', icon: Briefcase },
          { key: 'timelog', label: 'Time', icon: Timer },
          { key: 'notes', label: `Notes (${(work.notes || []).length})`, icon: MessageSquare },
          { key: 'issues', label: `Issues (${openIssues})`, icon: AlertTriangle },
          { key: 'documents', label: `Docs (${(work.documents || []).length})`, icon: FileText },
        ].map(tab => (
          <button
            key={tab.key}
            className={`wd-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {React.createElement(tab.icon, { size: 14 })} {tab.label}
          </button>
        ))}
      </div>

      {/* ── Content ───────────────────────────────────────── */}
      <div className="wd-content">

        {/* ═══════ OVERVIEW TAB ═══════════════════════════ */}
        {activeTab === 'overview' && (
          <div className="wd-overview">
            {editMode ? (
              <div className="wd-edit-form">
                <div className="wd-form-group">
                  <label>Title</label>
                  <input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} />
                </div>
                <div className="wd-form-group">
                  <label>Description</label>
                  <textarea rows={3} value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} />
                </div>
                <div className="wd-form-row">
                  <div className="wd-form-group">
                    <label>Status</label>
                    <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}>
                      {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  <div className="wd-form-group">
                    <label>Priority</label>
                    <select value={editForm.priority} onChange={e => setEditForm({...editForm, priority: e.target.value})}>
                      {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="wd-form-row">
                  <div className="wd-form-group">
                    <label>Start Date</label>
                    <input type="date" value={editForm.start_date} onChange={e => setEditForm({...editForm, start_date: e.target.value})} />
                  </div>
                  <div className="wd-form-group">
                    <label>Due Date</label>
                    <input type="date" value={editForm.due_date} onChange={e => setEditForm({...editForm, due_date: e.target.value})} />
                  </div>
                </div>
                <div className="wd-form-row">
                  <div className="wd-form-group">
                    <label>Estimated Hours</label>
                    <input type="number" step="0.5" value={editForm.estimated_hours} onChange={e => setEditForm({...editForm, estimated_hours: e.target.value})} />
                  </div>
                  <div className="wd-form-group">
                    <label>Actual Hours</label>
                    <input type="number" step="0.5" value={editForm.actual_hours} onChange={e => setEditForm({...editForm, actual_hours: e.target.value})} />
                  </div>
                </div>
                <div className="wd-form-group">
                  <label>Tags (comma separated)</label>
                  <input value={editForm.tags} onChange={e => setEditForm({...editForm, tags: e.target.value})} placeholder="tag1, tag2, tag3" />
                </div>
              </div>
            ) : (
              <div className="wd-overview-grid">
                {/* Title Card */}
                <div className="wd-info-card wd-title-card">
                  <div className="wd-title-row">
                    <h2>{work.title}</h2>
                  </div>
                  {work.description && <p className="wd-desc">{work.description}</p>}
                  {work.tags?.length > 0 && (
                    <div className="wd-tags">
                      {work.tags.map((tag, i) => (
                        <span key={i} className="wd-tag"><Tag size={10} /> {tag}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Status */}
                <div className="wd-info-card">
                  <h4 className="wd-card-section-title"><Activity size={14} /> Quick Status</h4>
                  <div className="wd-status-grid">
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                      <button
                        key={key}
                        className={`wd-status-btn ${work.status === key ? 'active' : ''}`}
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

                {/* Details Grid */}
                <div className="wd-overview-details">
                  <div className="wd-info-card">
                    <div className="wd-detail-row">
                      <Users size={14} />
                      <span className="wd-detail-label">Customer</span>
                      <span className="wd-detail-value">{work.customer_name || 'Walk-in'}</span>
                    </div>
                    <div className="wd-detail-row">
                      <Calendar size={14} />
                      <span className="wd-detail-label">Created</span>
                      <span className="wd-detail-value">{formatDate(work.createdAt)}</span>
                    </div>
                    <div className="wd-detail-row">
                      <Clock size={14} />
                      <span className="wd-detail-label">Start</span>
                      <span className="wd-detail-value">{formatDate(work.start_date)}</span>
                    </div>
                    <div className={`wd-detail-row ${isOverdue ? 'overdue' : ''}`}>
                      <Calendar size={14} />
                      <span className="wd-detail-label">Due</span>
                      <span className="wd-detail-value">{formatDate(work.due_date)}</span>
                    </div>
                    {work.completed_at && (
                      <div className="wd-detail-row">
                        <CheckCircle size={14} />
                        <span className="wd-detail-label">Completed</span>
                        <span className="wd-detail-value">{formatDate(work.completed_at)}</span>
                      </div>
                    )}
                  </div>

                  {/* Progress Card */}
                  <div className="wd-info-card">
                    <h4 className="wd-card-section-title"><TrendingUp size={14} /> Progress</h4>
                    <div className="wd-progress-row">
                      <span>Estimated: <strong>{work.estimated_hours || 0}h</strong></span>
                      <span>Actual: <strong>{work.actual_hours || 0}h</strong></span>
                    </div>
                    {work.estimated_hours > 0 && (
                      <div className="wd-progress-bar-wrap">
                        <div className="wd-progress-bar" style={{ width: `${progress}%`, background: progress > 100 ? '#ef4444' : '#8b5cf6' }} />
                      </div>
                    )}
                    <div className="wd-progress-stats">
                      <span>{totalLogs} time logs</span>
                      <span>{(work.issues || []).length} issues</span>
                      <span>{(work.documents || []).length} docs</span>
                      <span>{(work.notes || []).length} notes</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════ TIME TRACKING TAB ═══════════════════════ */}
        {activeTab === 'timelog' && (
          <div className="wd-timelog">
            <div className="wd-timer-widget">
              {activeTimeLog ? (
                <div className="wd-timer-active">
                  <div className="wd-timer-display">
                    <div className="wd-timer-digits">{formatTimer(elapsedTime)}</div>
                    <div className="wd-timer-label">Time Elapsed</div>
                  </div>
                  {activeTimeLog.description && (
                    <div className="wd-timer-desc">📝 {activeTimeLog.description}</div>
                  )}
                  <div className="wd-timer-started">
                    Started at {new Date(activeTimeLog.start_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </div>
                  <button className="wd-timer-btn stop" onClick={stopTimeLog} disabled={stoppingTimer}>
                    {stoppingTimer ? <Spinner size={18} /> : <Pause size={18} />} {stoppingTimer ? 'Stopping...' : 'Stop Timer'}
                  </button>
                </div>
              ) : (
                <div className="wd-timer-idle">
                  <input
                    type="text"
                    placeholder="What are you working on? (optional)"
                    value={timeLogDesc}
                    onChange={e => setTimeLogDesc(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') startTimeLog(); }}
                    disabled={startingTimer}
                  />
                  <button className="wd-timer-btn start" onClick={startTimeLog} disabled={startingTimer}>
                    {startingTimer ? <Spinner size={18} /> : <Play size={18} />} {startingTimer ? 'Starting...' : 'Start'}
                  </button>
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="wd-time-summary">
              <div className="wd-time-stat">
                <span className="wd-time-stat-label">Estimated</span>
                <span className="wd-time-stat-value">{work.estimated_hours || 0}h</span>
              </div>
              <div className="wd-time-stat">
                <span className="wd-time-stat-label">Actual</span>
                <span className="wd-time-stat-value">{work.actual_hours || 0}h</span>
              </div>
              <div className="wd-time-stat">
                <span className="wd-time-stat-label">Sessions</span>
                <span className="wd-time-stat-value">{totalLogs}</span>
              </div>
              <div className="wd-time-stat">
                <span className="wd-time-stat-label">Billable</span>
                <span className="wd-time-stat-value">{(work.time_logs || []).filter(t => t.billable && t.end_time).length}</span>
              </div>
            </div>

            {/* Time Logs List */}
            <h4 className="wd-card-section-title">Session History</h4>
            <div className="wd-time-logs-list">
              {(work.time_logs || []).length === 0 ? (
                <div className="wd-empty-inline">
                  <Clock size={28} />
                  <p>No time logged yet. Start the timer above.</p>
                </div>
              ) : (
                work.time_logs.map((log) => (
                  <div key={log.id || log._id} className={`wd-time-log ${log.end_time ? '' : 'running'}`}>
                    <div className="wd-time-log-main">
                      <div className="wd-time-log-duration">
                        {log.end_time ? (
                          <span className="wd-time-log-done">{formatLogDuration(log.duration)}</span>
                        ) : (
                          <span className="wd-time-log-running">● Running</span>
                        )}
                      </div>
                      <div className="wd-time-log-info">
                        {log.description && <span className="wd-time-log-desc">{log.description}</span>}
                        <span className="wd-time-log-times">
                          {new Date(log.start_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                          {log.end_time && <> → {new Date(log.end_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</>}
                        </span>
                        <span className="wd-time-log-date">
                          {new Date(log.start_time).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </span>
                      </div>
                      {log.billable && <span className="wd-badge-pill blue">Billable</span>}
                    </div>
                    {log.end_time && (
                      <button className="wd-delete-btn" onClick={() => deleteTimeLog(log.id || log._id)} disabled={deletingTimeLog === (log.id || log._id)}>
                        {deletingTimeLog === (log.id || log._id) ? <Spinner size={12} /> : <Trash2 size={12} />}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ═══════ NOTES TAB ═══════════════════════════════ */}
        {activeTab === 'notes' && (
          <div className="wd-notes">
            {/* Voice Recorder */}
            <div className="wd-voice-recorder">
              {isRecording ? (
                <div className="wd-recording">
                  <div className="wd-recording-indicator">
                    <div className="wd-recording-dot" />
                    <span>Recording {formatDuration(recordingTime)}</span>
                  </div>
                  <div className="wd-recording-actions">
                    <button onClick={stopRecording} className="wd-voice-btn stop"><MicOff size={15} /> Stop</button>
                    <button onClick={cancelRecording} className="wd-voice-btn cancel"><X size={15} /> Cancel</button>
                  </div>
                </div>
              ) : audioBlob ? (
                <div className="wd-recording-preview">
                  <Volume2 size={16} />
                  <span>Recorded {formatDuration(recordingTime)}</span>
                  <div className="wd-recording-actions">
                    <button onClick={submitVoiceNote} className="wd-voice-btn submit" disabled={addingNote}>
                      {addingNote ? <Spinner /> : <Send size={14} />} Send
                    </button>
                    <button onClick={() => { setAudioBlob(null); setRecordingTime(0); }} className="wd-voice-btn cancel">
                      <X size={14} /> Discard
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={startRecording} className="wd-voice-btn record"><Mic size={15} /> Record Voice Note</button>
              )}
            </div>

            {/* Text Note Input */}
            <div className="wd-note-input">
              <textarea
                placeholder="Type a note... (Enter to send)"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                rows={2}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addTextNote(); } }}
              />
              <button onClick={addTextNote} disabled={addingNote || !noteText.trim()} className="wd-note-send">
                {addingNote ? <Spinner /> : <Send size={16} />}
              </button>
            </div>

            {/* Notes List */}
            <div className="wd-notes-list">
              {(work.notes || []).length === 0 ? (
                <div className="wd-empty-inline">
                  <MessageSquare size={28} />
                  <p>No notes yet. Add a text or voice note above.</p>
                </div>
              ) : (
                work.notes.map((note) => (
                  <div key={note.id || note._id} className={`wd-note-card ${note.type}`}>
                    <div className="wd-note-header">
                      <span className="wd-note-type-badge">
                        {note.type === 'voice' ? <Mic size={11} /> : <MessageSquare size={11} />}
                        {note.type === 'voice' ? 'Voice' : 'Text'}
                      </span>
                      <span className="wd-note-time">{formatDate(note.createdAt)}</span>
                      <button className="wd-delete-btn" onClick={() => deleteNote(note.id || note._id)} disabled={deletingNote === (note.id || note._id)}>
                        {deletingNote === (note.id || note._id) ? <Spinner size={12} /> : <Trash2 size={12} />}
                      </button>
                    </div>
                    {note.type === 'voice' ? (
                      <div className="wd-voice-note">
                        <audio controls src={note.audio_data || note.audio_url} className="wd-audio-player" />
                        <span className="wd-voice-duration">{formatDuration(note.duration || 0)}</span>
                      </div>
                    ) : (
                      <p className="wd-note-content">{note.content}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ═══════ ISSUES TAB ══════════════════════════════ */}
        {activeTab === 'issues' && (
          <div className="wd-issues">
            <div className="wd-issues-header">
              <h4 className="wd-card-section-title"><AlertTriangle size={14} /> Issues ({(work.issues || []).length})</h4>
              <button className="wd-add-btn" onClick={() => setShowAddIssue(!showAddIssue)}>
                {showAddIssue ? <X size={14} /> : <Plus size={14} />} {showAddIssue ? 'Cancel' : 'Add Issue'}
              </button>
            </div>

            {showAddIssue && (
              <form className="wd-issue-form" onSubmit={addIssue}>
                <input
                  type="text"
                  placeholder="Issue title *"
                  value={issueForm.title}
                  onChange={e => setIssueForm({...issueForm, title: e.target.value})}
                  required
                  autoFocus
                />
                <textarea
                  placeholder="Description (optional)"
                  value={issueForm.description}
                  onChange={e => setIssueForm({...issueForm, description: e.target.value})}
                  rows={2}
                />
                <div className="wd-issue-form-actions">
                  <select value={issueForm.priority} onChange={e => setIssueForm({...issueForm, priority: e.target.value})}>
                    {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <button type="submit" className="wd-btn-submit" disabled={addingIssue || !issueForm.title.trim()}>
                    {addingIssue ? <Spinner /> : <Plus size={14} />} {addingIssue ? 'Adding...' : 'Add'}
                  </button>
                </div>
              </form>
            )}

            <div className="wd-issues-list">
              {(work.issues || []).length === 0 ? (
                <div className="wd-empty-inline">
                  <AlertTriangle size={28} />
                  <p>No issues reported yet.</p>
                </div>
              ) : (
                work.issues.map((issue) => {
                  const issueStatus = ISSUE_STATUS[issue.status] || ISSUE_STATUS.open;
                  const issuePriority = PRIORITY_CONFIG[issue.priority] || PRIORITY_CONFIG.medium;
                  const isUpdatingThis = updatingIssue === (issue.id || issue._id);
                  const isDeletingThis = deletingIssue === (issue.id || issue._id);
                  return (
                    <div key={issue.id || issue._id} className={`wd-issue-card ${issue.status}`}>
                      <div className="wd-issue-top">
                        <span className="wd-issue-status-dot" style={{ background: issueStatus.color }} />
                        <span className="wd-issue-title">{issue.title}</span>
                        <span className="wd-badge-pill" style={{ color: issuePriority.color, background: `${issuePriority.color}18` }}>{issuePriority.label}</span>
                        <span className="wd-issue-date">{formatDate(issue.createdAt)}</span>
                        <button className="wd-delete-btn" onClick={() => deleteIssue(issue.id || issue._id)} disabled={isDeletingThis}>
                          {isDeletingThis ? <Spinner size={12} /> : <Trash2 size={12} />}
                        </button>
                      </div>
                      {issue.description && <p className="wd-issue-desc">{issue.description}</p>}
                      {issue.status !== 'resolved' && (
                        <div className="wd-issue-actions">
                          {issue.status === 'open' && (
                            <button onClick={() => updateIssueStatus(issue.id || issue._id, 'in_progress')} disabled={isUpdatingThis}>
                              {isUpdatingThis ? <Spinner size={11} /> : <><Clock size={11} /> Start</>}
                            </button>
                          )}
                          {(issue.status === 'in_progress' || issue.status === 'open') && (
                            <button onClick={() => updateIssueStatus(issue.id || issue._id, 'resolved')} className="resolve" disabled={isUpdatingThis}>
                              {isUpdatingThis ? <Spinner size={11} /> : <><Check size={11} /> Resolve</>}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ═══════ DOCUMENTS TAB ═══════════════════════════ */}
        {activeTab === 'documents' && (
          <div className="wd-documents">
            <div className="wd-docs-header">
              <h4 className="wd-card-section-title"><FileText size={14} /> Documents ({(work.documents || []).length})</h4>
              <div className="wd-docs-actions">
                {work.customer_id && (
                  <button className="wd-add-btn secondary" onClick={loadCustomerDocs} disabled={loadingCustomerDocs}>
                    {loadingCustomerDocs ? <Spinner /> : <LinkIcon size={14} />} From Customer
                  </button>
                )}
                <label className="wd-add-btn">
                  {uploading ? <><Spinner /> Uploading...</> : <><Upload size={14} /> Upload</>}
                  <input type="file" onChange={handleFileUpload} style={{ display: 'none' }} accept="image/*,.pdf,.doc,.docx" disabled={uploading} />
                </label>
              </div>
            </div>

            {showCustomerDocs && (
              <div className="wd-customer-docs">
                <div className="wd-customer-docs-header">
                  <h4>Customer Documents — {work.customer_name}</h4>
                  <button onClick={() => setShowCustomerDocs(false)}><X size={14} /></button>
                </div>
                <div className="wd-customer-docs-list">
                  {customerDocs.length === 0 ? (
                    <p className="wd-empty-inline">No documents found for this customer.</p>
                  ) : (
                    customerDocs.map(doc => (
                      <div key={doc.id || doc._id} className="wd-customer-doc-item">
                        <FileText size={16} />
                        <span>{doc.name}</span>
                        <button onClick={() => attachCustomerDoc(doc.id || doc._id)} disabled={attachingDoc === (doc.id || doc._id)}>
                          {attachingDoc === (doc.id || doc._id) ? <Spinner size={12} /> : <><LinkIcon size={12} /> Attach</>}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="wd-docs-grid">
              {(work.documents || []).length === 0 ? (
                <div className="wd-empty-inline">
                  <FileText size={28} />
                  <p>No documents yet. Upload or attach from customer.</p>
                </div>
              ) : (
                work.documents.map((doc) => {
                  const isImage = doc.file_type?.startsWith('image/');
                  const isPdf = doc.file_type?.includes('pdf');
                  const isDeleting = deletingDoc === (doc.id || doc._id);
                  return (
                    <div key={doc.id || doc._id} className={`wd-doc-card ${isDeleting ? 'deleting' : ''}`}>
                      <div className="wd-doc-thumb" onClick={() => setPreviewDoc(doc)}>
                        {isImage && doc.file_url ? (
                          <img src={doc.file_url} alt={doc.name} />
                        ) : isPdf ? (
                          <div className="wd-doc-pdf-icon"><FileText size={24} /> PDF</div>
                        ) : (
                          <div className="wd-doc-file-icon"><FileText size={24} /></div>
                        )}
                        <div className="wd-doc-thumb-overlay">
                          <Eye size={16} /> Preview
                        </div>
                      </div>
                      <div className="wd-doc-info">
                        <span className="wd-doc-name" title={doc.name}>{doc.name}</span>
                        <span className="wd-doc-meta">
                          {doc.source === 'customer' && <span className="wd-doc-source">📎 Customer</span>}
                          {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : ''}
                        </span>
                      </div>
                      <div className="wd-doc-actions">
                        <button onClick={() => setPreviewDoc(doc)} title="Preview"><Eye size={13} /></button>
                        <a href={doc.file_url || doc.data} download={doc.name} title="Download"><Download size={13} /></a>
                        <button onClick={() => deleteDocument(doc.id || doc._id)} title="Delete" className="danger" disabled={isDeleting}>
                          {isDeleting ? <Spinner size={12} /> : <Trash2 size={13} />}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Document Preview Modal ───────────────────────── */}
      {previewDoc && (
        <Portal>
          <div className="wd-preview-overlay" onClick={() => setPreviewDoc(null)}>
            <div className="wd-preview-modal" onClick={e => e.stopPropagation()}>
              <div className="wd-preview-header">
                <span>{previewDoc.name}</span>
                <div className="wd-preview-actions">
                  <a href={previewDoc.file_url || previewDoc.data} download={previewDoc.name}><Download size={16} /></a>
                  <button onClick={() => setPreviewDoc(null)}><X size={18} /></button>
                </div>
              </div>
              <div className="wd-preview-content">
                {previewDoc.file_type?.startsWith('image/') ? (
                  <img src={previewDoc.file_url || previewDoc.data} alt={previewDoc.name} />
                ) : previewDoc.file_type?.includes('pdf') ? (
                  <iframe src={previewDoc.file_url || previewDoc.data} title={previewDoc.name} />
                ) : (
                  <div className="wd-preview-unsupported">
                    <FileText size={48} />
                    <p>Preview not available for this file type</p>
                    <a href={previewDoc.file_url || previewDoc.data} download={previewDoc.name} className="wd-btn-submit">
                      <Download size={14} /> Download File
                    </a>
                  </div>
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
