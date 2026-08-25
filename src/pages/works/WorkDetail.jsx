import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import {
  ArrowLeft, Save, Trash2, Plus, X, FileText, AlertTriangle,
  MessageSquare, Clock, CheckCircle, XCircle, PauseCircle,
  Briefcase, Calendar, Tag, Users, Mic, MicOff, Play, Pause,
  Download, Eye, Upload, Link as LinkIcon, Loader2, Send,
  Edit2, Check, ChevronDown, Volume2
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

  // Notes
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [playingNote, setPlayingNote] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  // Issues
  const [showAddIssue, setShowAddIssue] = useState(false);
  const [issueForm, setIssueForm] = useState({ title: '', description: '', priority: 'medium' });

  // Documents
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [showCustomerDocs, setShowCustomerDocs] = useState(false);
  const [customerDocs, setCustomerDocs] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Preview
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
      alert('Microphone access denied. Please allow microphone access to record voice notes.');
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
        const base64 = reader.result;
        await api.addWorkNote(id, {
          type: 'voice',
          audio_data: base64,
          duration: recordingTime,
          content: `Voice note (${Math.floor(recordingTime / 60)}:${String(recordingTime % 60).padStart(2, '0')})`,
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
      await api.deleteWorkNote(id, noteId);
      fetchWork();
    } catch (err) {
      alert('Failed to delete note: ' + err.message);
    }
  };

  // ── Issues ────────────────────────────────────────────────────

  const addIssue = async (e) => {
    e.preventDefault();
    if (!issueForm.title.trim()) return;
    try {
      await api.addWorkIssue(id, issueForm);
      setIssueForm({ title: '', description: '', priority: 'medium' });
      setShowAddIssue(false);
      fetchWork();
    } catch (err) {
      alert('Failed to add issue: ' + err.message);
    }
  };

  const updateIssueStatus = async (issueId, newStatus) => {
    try {
      await api.updateWorkIssue(id, issueId, { status: newStatus });
      fetchWork();
    } catch (err) {
      alert('Failed to update issue: ' + err.message);
    }
  };

  const deleteIssue = async (issueId) => {
    if (!confirm('Delete this issue?')) return;
    try {
      await api.deleteWorkIssue(id, issueId);
      fetchWork();
    } catch (err) {
      alert('Failed to delete issue: ' + err.message);
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
        setShowAddDoc(false);
        fetchWork();
      };
      reader.readAsDataURL(file);
    } catch (err) {
      alert('Failed to upload document: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const loadCustomerDocs = async () => {
    if (!work?.customer_id) return;
    try {
      const custId = work.customer_id.id || work.customer_id._id || work.customer_id;
      const customer = await api.getCustomer(custId);
      setCustomerDocs(customer.documents || []);
      setShowCustomerDocs(true);
    } catch (err) {
      alert('Failed to load customer documents: ' + err.message);
    }
  };

  const attachCustomerDoc = async (docId) => {
    try {
      const custId = work.customer_id.id || work.customer_id._id || work.customer_id;
      await api.addWorkDocumentFromCustomer(id, {
        customer_id: custId,
        document_id: docId,
      });
      setShowCustomerDocs(false);
      fetchWork();
    } catch (err) {
      alert('Failed to attach document: ' + err.message);
    }
  };

  const deleteDocument = async (docId) => {
    if (!confirm('Delete this document?')) return;
    try {
      await api.deleteWorkDocument(id, docId);
      fetchWork();
    } catch (err) {
      alert('Failed to delete document: ' + err.message);
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

  if (loading) {
    return (
      <div className="wd-root">
        <div className="wd-loading"><Loader2 size={24} className="spin" /> Loading work...</div>
      </div>
    );
  }

  if (!work) {
    return (
      <div className="wd-root">
        <div className="wd-empty">
          <Briefcase size={48} />
          <h3>Work not found</h3>
          <button onClick={() => navigate('/billing/works')}>Back to Works</button>
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[work.status] || STATUS_CONFIG.new;
  const priorityCfg = PRIORITY_CONFIG[work.priority] || PRIORITY_CONFIG.medium;
  const openIssues = (work.issues || []).filter(i => i.status !== 'resolved').length;

  return (
    <div className="wd-root">
      {/* Header */}
      <div className="wd-header">
        <button className="wd-back" onClick={() => navigate('/billing/works')}>
          <ArrowLeft size={18} /> Works
        </button>
        <div className="wd-header-center">
          <span className="wd-work-id">{work.work_id}</span>
          <span className="wd-status" style={{ color: statusCfg.color }}>
            {React.createElement(statusCfg.icon, { size: 14 })} {statusCfg.label}
          </span>
          <span className="wd-priority" style={{ color: priorityCfg.color }}>
            ● {priorityCfg.label}
          </span>
        </div>
        <div className="wd-header-right">
          {editMode ? (
            <>
              <button className="wd-btn-cancel" onClick={() => setEditMode(false)}>Cancel</button>
              <button className="wd-btn-save" onClick={saveChanges} disabled={saving}>
                {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />} Save
              </button>
            </>
          ) : (
            <button className="wd-btn-edit" onClick={() => setEditMode(true)}>
              <Edit2 size={14} /> Edit
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="wd-tabs">
        {[
          { key: 'overview', label: 'Overview', icon: Briefcase },
          { key: 'notes', label: `Notes (${(work.notes || []).length})`, icon: MessageSquare },
          { key: 'issues', label: `Issues (${openIssues})`, icon: AlertTriangle },
          { key: 'documents', label: `Documents (${(work.documents || []).length})`, icon: FileText },
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

      {/* Content */}
      <div className="wd-content">
        {/* ── OVERVIEW TAB ──────────────────────────────────── */}
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
                    <input type="number" value={editForm.estimated_hours} onChange={e => setEditForm({...editForm, estimated_hours: e.target.value})} />
                  </div>
                  <div className="wd-form-group">
                    <label>Actual Hours</label>
                    <input type="number" value={editForm.actual_hours} onChange={e => setEditForm({...editForm, actual_hours: e.target.value})} />
                  </div>
                </div>
                <div className="wd-form-group">
                  <label>Tags (comma separated)</label>
                  <input value={editForm.tags} onChange={e => setEditForm({...editForm, tags: e.target.value})} placeholder="tag1, tag2, tag3" />
                </div>
              </div>
            ) : (
              <div className="wd-info-grid">
                <div className="wd-info-card">
                  <h3>{work.title}</h3>
                  {work.description && <p className="wd-desc">{work.description}</p>}
                </div>
                <div className="wd-info-card">
                  <div className="wd-info-row">
                    <Users size={14} />
                    <span className="wd-info-label">Customer</span>
                    <span className="wd-info-value">{work.customer_name || 'Walk-in'}</span>
                  </div>
                  <div className="wd-info-row">
                    <Calendar size={14} />
                    <span className="wd-info-label">Created</span>
                    <span className="wd-info-value">{formatDate(work.createdAt)}</span>
                  </div>
                  <div className="wd-info-row">
                    <Clock size={14} />
                    <span className="wd-info-label">Start Date</span>
                    <span className="wd-info-value">{formatDate(work.start_date)}</span>
                  </div>
                  <div className="wd-info-row">
                    <Calendar size={14} />
                    <span className="wd-info-label">Due Date</span>
                    <span className="wd-info-value">{formatDate(work.due_date)}</span>
                  </div>
                  {work.completed_at && (
                    <div className="wd-info-row">
                      <CheckCircle size={14} />
                      <span className="wd-info-label">Completed</span>
                      <span className="wd-info-value">{formatDate(work.completed_at)}</span>
                    </div>
                  )}
                  <div className="wd-info-row">
                    <Clock size={14} />
                    <span className="wd-info-label">Est. Hours</span>
                    <span className="wd-info-value">{work.estimated_hours || '—'}</span>
                  </div>
                  <div className="wd-info-row">
                    <Clock size={14} />
                    <span className="wd-info-label">Actual Hours</span>
                    <span className="wd-info-value">{work.actual_hours || '—'}</span>
                  </div>
                </div>
                {work.tags?.length > 0 && (
                  <div className="wd-info-card">
                    <div className="wd-tags">
                      {work.tags.map((tag, i) => (
                        <span key={i} className="wd-tag"><Tag size={11} /> {tag}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── NOTES TAB ─────────────────────────────────────── */}
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
                    <button onClick={stopRecording} className="wd-voice-btn stop">
                      <MicOff size={16} /> Stop
                    </button>
                    <button onClick={cancelRecording} className="wd-voice-btn cancel">
                      <X size={16} /> Cancel
                    </button>
                  </div>
                </div>
              ) : audioBlob ? (
                <div className="wd-recording-preview">
                  <Volume2 size={16} />
                  <span>Recorded {formatDuration(recordingTime)}</span>
                  <div className="wd-recording-actions">
                    <button onClick={submitVoiceNote} className="wd-voice-btn submit" disabled={addingNote}>
                      {addingNote ? <Loader2 size={14} className="spin" /> : <Send size={14} />} Send
                    </button>
                    <button onClick={() => { setAudioBlob(null); setRecordingTime(0); }} className="wd-voice-btn cancel">
                      <X size={14} /> Discard
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={startRecording} className="wd-voice-btn record">
                  <Mic size={16} /> Record Voice Note
                </button>
              )}
            </div>

            {/* Text Note Input */}
            <div className="wd-note-input">
              <textarea
                placeholder="Type a note..."
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                rows={2}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addTextNote(); } }}
              />
              <button onClick={addTextNote} disabled={addingNote || !noteText.trim()} className="wd-note-send">
                {addingNote ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
              </button>
            </div>

            {/* Notes List */}
            <div className="wd-notes-list">
              {(work.notes || []).length === 0 ? (
                <div className="wd-notes-empty">
                  <MessageSquare size={32} />
                  <p>No notes yet. Add a text or voice note above.</p>
                </div>
              ) : (
                work.notes.map((note) => (
                  <div key={note.id || note._id} className={`wd-note ${note.type}`}>
                    <div className="wd-note-header">
                      <span className="wd-note-type">
                        {note.type === 'voice' ? <Mic size={12} /> : <MessageSquare size={12} />}
                        {note.type === 'voice' ? 'Voice Note' : 'Text Note'}
                      </span>
                      <span className="wd-note-time">{formatDate(note.createdAt)}</span>
                      <button className="wd-note-delete" onClick={() => deleteNote(note.id || note._id)}>
                        <Trash2 size={12} />
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

        {/* ── ISSUES TAB ────────────────────────────────────── */}
        {activeTab === 'issues' && (
          <div className="wd-issues">
            <div className="wd-issues-header">
              <h3>Issues ({(work.issues || []).length})</h3>
              <button className="wd-add-btn" onClick={() => setShowAddIssue(true)}>
                <Plus size={14} /> Add Issue
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
                  <button type="button" onClick={() => setShowAddIssue(false)} className="wd-btn-cancel">Cancel</button>
                  <button type="submit" className="wd-btn-submit">Add</button>
                </div>
              </form>
            )}

            <div className="wd-issues-list">
              {(work.issues || []).length === 0 ? (
                <div className="wd-issues-empty">
                  <AlertTriangle size={32} />
                  <p>No issues reported yet.</p>
                </div>
              ) : (
                work.issues.map((issue) => {
                  const issueStatus = ISSUE_STATUS[issue.status] || ISSUE_STATUS.open;
                  const issuePriority = PRIORITY_CONFIG[issue.priority] || PRIORITY_CONFIG.medium;
                  return (
                    <div key={issue.id || issue._id} className={`wd-issue ${issue.status}`}>
                      <div className="wd-issue-header">
                        <span className="wd-issue-status" style={{ color: issueStatus.color }}>
                          ● {issueStatus.label}
                        </span>
                        <span className="wd-issue-priority" style={{ color: issuePriority.color }}>
                          {issuePriority.label}
                        </span>
                        <span className="wd-issue-date">{formatDate(issue.createdAt)}</span>
                        <button className="wd-issue-delete" onClick={() => deleteIssue(issue.id || issue._id)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <h4 className="wd-issue-title">{issue.title}</h4>
                      {issue.description && <p className="wd-issue-desc">{issue.description}</p>}
                      <div className="wd-issue-actions">
                        {issue.status !== 'resolved' && (
                          <>
                            {issue.status === 'open' && (
                              <button onClick={() => updateIssueStatus(issue.id || issue._id, 'in_progress')}>
                                <Clock size={12} /> Start
                              </button>
                            )}
                            {issue.status === 'in_progress' && (
                              <button onClick={() => updateIssueStatus(issue.id || issue._id, 'resolved')}>
                                <Check size={12} /> Resolve
                              </button>
                            )}
                            {issue.status === 'open' && (
                              <button onClick={() => updateIssueStatus(issue.id || issue._id, 'resolved')}>
                                <Check size={12} /> Resolve
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ── DOCUMENTS TAB ─────────────────────────────────── */}
        {activeTab === 'documents' && (
          <div className="wd-documents">
            <div className="wd-docs-header">
              <h3>Documents ({(work.documents || []).length})</h3>
              <div className="wd-docs-actions">
                {work.customer_id && (
                  <button className="wd-add-btn secondary" onClick={loadCustomerDocs}>
                    <LinkIcon size={14} /> From Customer
                  </button>
                )}
                <label className="wd-add-btn">
                  <Upload size={14} /> Upload
                  <input type="file" onChange={handleFileUpload} style={{ display: 'none' }} accept="image/*,.pdf,.doc,.docx" />
                </label>
              </div>
            </div>

            {/* Customer Documents Modal */}
            {showCustomerDocs && (
              <div className="wd-customer-docs">
                <div className="wd-customer-docs-header">
                  <h4>Customer Documents — {work.customer_name}</h4>
                  <button onClick={() => setShowCustomerDocs(false)}><X size={14} /></button>
                </div>
                <div className="wd-customer-docs-list">
                  {customerDocs.length === 0 ? (
                    <p>No documents found for this customer.</p>
                  ) : (
                    customerDocs.map(doc => (
                      <div key={doc.id || doc._id} className="wd-customer-doc-item">
                        <FileText size={16} />
                        <span>{doc.name}</span>
                        <button onClick={() => attachCustomerDoc(doc.id || doc._id)}>
                          <LinkIcon size={12} /> Attach
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Documents Grid */}
            <div className="wd-docs-grid">
              {(work.documents || []).length === 0 ? (
                <div className="wd-docs-empty">
                  <FileText size={32} />
                  <p>No documents yet. Upload or attach from customer.</p>
                </div>
              ) : (
                work.documents.map((doc) => {
                  const isImage = doc.file_type?.startsWith('image/');
                  const isPdf = doc.file_type?.includes('pdf');
                  return (
                    <div key={doc.id || doc._id} className="wd-doc-card">
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
                          {doc.source === 'customer' && <span className="wd-doc-source">📎 From Customer</span>}
                          {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : ''}
                        </span>
                      </div>
                      <div className="wd-doc-actions">
                        <button onClick={() => setPreviewDoc(doc)} title="Preview"><Eye size={13} /></button>
                        <a href={doc.file_url || doc.data} download={doc.name} title="Download"><Download size={13} /></a>
                        <button onClick={() => deleteDocument(doc.id || doc._id)} title="Delete" className="danger"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <Portal>
          <div className="wd-preview-overlay" onClick={() => setPreviewDoc(null)}>
            <div className="wd-preview-modal" onClick={e => e.stopPropagation()}>
              <div className="wd-preview-header">
                <span>{previewDoc.name}</span>
                <div className="wd-preview-actions">
                  <a href={previewDoc.file_url || previewDoc.data} download={previewDoc.name}>
                    <Download size={16} />
                  </a>
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
