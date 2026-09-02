import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { useWs } from '../../contexts/WebSocketContext';
import { useToast } from '../../components/ToastContext';
import { useModal } from '../../components/ModalContext';
import AppModal from '../../components/AppModal';
import Pagination from '../../components/Pagination';
import PremiumLoader from '../../components/PremiumLoader';
import {
  Plus, Search, Briefcase, Clock, CheckCircle, XCircle,
  Calendar, Users, X, ChevronRight, LayoutGrid, LayoutList,
  AlertTriangle, Trash2
} from 'lucide-react';
import './WorkList.css';

const STATUS_CONFIG = {
  new:         { label: 'New',         color: '#8b5cf6' },
  in_progress: { label: 'In Progress', color: '#3b82f6' },
  completed:   { label: 'Completed',   color: '#22c55e' },
  closed:      { label: 'Closed',      color: '#6b7280' },
};

const WorkList = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const modal = useModal();

  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [stats, setStats] = useState(null);
  const ITEMS_PER_PAGE = 12;

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', contact_name: '', contact_phone: '', contact_email: '',
    end_date: '', end_time: '', notes: '',
  });

  // Customer picker
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const fetchWorks = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (filterStatus) params.status = filterStatus;
      const data = await api.getWorks(params);
      setWorks(data);
    } catch (err) {
      toast.error('Failed to load works: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterStatus]);

  const fetchStats = async () => {
    try { const data = await api.getWorkStats(); setStats(data); } catch {}
  };

  const fetchCustomers = async () => {
    try { const data = await api.getCustomers(); setCustomers(data || []); } catch {}
  };

  // Real-time work updates via WebSocket
  const { on } = useWs();
  useEffect(() => {
    const unsub = on('works', (event, data) => {
      switch (event) {
        case 'created':
          setWorks(prev => [data, ...prev]);
          fetchStats();
          break;
        case 'updated':
          setWorks(prev => prev.map(w => (w._id || w.id) === (data._id || data.id) ? data : w));
          fetchStats();
          break;
        case 'deleted':
          setWorks(prev => prev.filter(w => (w._id || w.id) !== data.id));
          fetchStats();
          break;
        case 'issue_added':
        case 'issue_updated':
        case 'issue_deleted':
          // Refresh list for issue count changes
          fetchWorks();
          fetchStats();
          break;
        default:
          fetchWorks();
          fetchStats();
      }
    });
    return unsub;
  }, [on, fetchWorks, fetchStats]);

  useEffect(() => { fetchWorks(); fetchStats(); }, [fetchWorks]);
  useEffect(() => { if (showCreate) fetchCustomers(); }, [showCreate]);

  const resetForm = () => {
    setForm({ title: '', description: '', contact_name: '', contact_phone: '', contact_email: '', end_date: '', end_time: '', notes: '' });
    setSelectedCustomer(null);
    setCustomerSearch('');
  };

  const handleSelectCustomer = (c) => {
    setSelectedCustomer(c);
    setForm(prev => ({ ...prev, contact_name: c.name || '', contact_phone: c.phone || '', contact_email: c.email || '' }));
    setShowCustomerDropdown(false);
    setCustomerSearch('');
  };

  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.end_date || !form.end_time) { toast.error('End date and time are required'); return; }
    setCreating(true);
    try {
      const endDateTime = new Date(`${form.end_date}T${form.end_time}`);
      const body = {
        title: form.title.trim(), description: form.description.trim(),
        customer_id: selectedCustomer?._id || selectedCustomer?.id || null,
        customer_name: selectedCustomer?.name || form.contact_name.trim(),
        contact_name: form.contact_name.trim(), contact_phone: form.contact_phone.trim(),
        contact_email: form.contact_email.trim(), end_date: endDateTime.toISOString(),
        notes: form.notes.trim() ? [form.notes.trim()] : [],
      };
      const work = await api.createWork(body);
      toast.success('Work created successfully');
      setShowCreate(false); resetForm();
      navigate(`/admin/billing/works/${work._id || work.id}`);
    } catch (err) { toast.error('Failed: ' + err.message); }
    setCreating(false);
  };

  const handleDelete = async (work, e) => {
    e.stopPropagation();
    const confirmed = await modal.confirm('Delete Work', `Delete "${work.title}"? This cannot be undone.`);
    if (!confirmed) return;
    try {
      await api.deleteWork(work._id || work.id);
      toast.success('Work deleted');
      fetchWorks(); fetchStats();
    } catch (err) { toast.error('Failed: ' + err.message); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const formatTime = (d) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';

  const isOverdue = (work) => {
    if (!work.end_date || ['completed', 'closed'].includes(work.status)) return false;
    return new Date(work.end_date) < new Date();
  };

  const getTimeLeft = (work) => {
    if (!work.end_date) return null;
    const diff = new Date(work.end_date) - new Date();
    if (diff < 0) return 'Overdue';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d left`;
    if (hours > 0) return `${hours}h left`;
    return `${Math.floor(diff / (1000 * 60))}m left`;
  };

  const filteredCustomers = customers.filter(c =>
    (c.name || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.phone || '').includes(customerSearch)
  );

  const shortId = (id) => `…${String(id).slice(-6)}`;

  return (
    <div className="wk-layout animate-fade-in">
      <div className="glass-panel wk-container">

        {/* Header */}
        <div className="wk-header">
          <div>
            <h2>Work Management</h2>
            <p className="text-muted">{works.length} total work{works.length === 1 ? '' : 's'}</p>
          </div>
          <div className="wk-header-actions">
            <div className="wk-search-box">
              <Search size={16} className="wk-search-icon" />
              <input
                type="text"
                placeholder="Search works..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="wk-search-input"
              />
            </div>
            <select className="wk-filter-select" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}>
              <option value="">All Statuses</option>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
            <div className="wk-view-toggle">
              <button className={`wk-view-btn ${viewMode === 'list' ? 'wk-view-btn--active' : ''}`} onClick={() => setViewMode('list')} title="List view">
                <LayoutList size={16} />
              </button>
              <button className={`wk-view-btn ${viewMode === 'card' ? 'wk-view-btn--active' : ''}`} onClick={() => setViewMode('card')} title="Card view">
                <LayoutGrid size={16} />
              </button>
            </div>
            <button className="btn btn-primary" onClick={() => { resetForm(); setShowCreate(true); }}>
              <Plus size={18} /> New Work
            </button>
          </div>
        </div>

        {/* Column labels — list view only */}
        {!loading && works.length > 0 && viewMode === 'list' && (
          <div className="wk-list-header">
            <span className="wk-col-identity">Work</span>
            <span className="wk-col-customer">Customer</span>
            <span className="wk-col-status">Status</span>
            <span className="wk-col-due">Due Date</span>
            <span className="wk-col-time">Time Left</span>
            <span className="wk-col-actions">Actions</span>
          </div>
        )}

        {/* List / Card */}
        {loading ? (
          <div style={{ padding: '3rem 0' }}><PremiumLoader text="Loading Works..." /></div>
        ) : (
          <>
            {viewMode === 'list' && (
              <div className="wk-list">
                {works.length === 0 ? (
                  <div className="wk-empty">
                    <Briefcase size={40} className="text-muted" />
                    <p className="text-muted">No works found.</p>
                    <button className="btn btn-primary" onClick={() => { resetForm(); setShowCreate(true); }}><Plus size={16} /> Create First Work</button>
                  </div>
                ) : (
                  works.map(work => {
                    const statusCfg = STATUS_CONFIG[work.status] || STATUS_CONFIG.new;
                    const overdue = isOverdue(work);
                    return (
                      <div key={work._id || work.id}
                        className={`wk-row ${overdue ? 'wk-row-overdue' : ''}`}
                        onClick={() => navigate(`/admin/billing/works/${work._id || work.id}`)}
                      >
                        <div className="wk-col-identity">
                          <span className="wk-id-badge">{work.work_id}</span>
                          <span className="wk-name" title={work.title}>{work.title}</span>
                        </div>
                        <div className="wk-col-customer">
                          <Users size={13} /> {work.customer_name || work.contact_name || '—'}
                        </div>
                        <div className="wk-col-status">
                          <span className="status-badge" style={{ background: `${statusCfg.color}18`, color: statusCfg.color, border: `1px solid ${statusCfg.color}40` }}>
                            {statusCfg.label}
                          </span>
                        </div>
                        <div className="wk-col-due">
                          <Calendar size={13} /> {formatDate(work.end_date)}
                        </div>
                        <div className="wk-col-time">
                          {getTimeLeft(work) || '—'}
                        </div>
                        <div className="wk-col-actions" onClick={e => e.stopPropagation()}>
                          <button className="prod-action-btn action-danger" title="Delete" onClick={e => handleDelete(work, e)}>
                            <Trash2 size={14} />
                          </button>
                          <button className="prod-action-btn action-primary" title="View"
                            onClick={e => { e.stopPropagation(); navigate(`/admin/billing/works/${work._id || work.id}`); }}>
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {viewMode === 'card' && (
              <div className="wk-card-grid">
                {works.length === 0 ? (
                  <div className="wk-empty" style={{ gridColumn: '1/-1' }}>
                    <Briefcase size={40} className="text-muted" />
                    <p className="text-muted">No works found.</p>
                  </div>
                ) : (
                  works.map(work => {
                    const statusCfg = STATUS_CONFIG[work.status] || STATUS_CONFIG.new;
                    const overdue = isOverdue(work);
                    const timeLeft = getTimeLeft(work);
                    return (
                      <div key={work._id || work.id}
                        className={`wk-card ${overdue ? 'wk-card--overdue' : ''}`}
                        onClick={() => navigate(`/admin/billing/works/${work._id || work.id}`)}
                      >
                        <div className={`wk-card-bar ${overdue ? 'wk-card-bar--overdue' : `wk-card-bar--${work.status}`}`} />
                        <div className="wk-card-body">
                          <div className="wk-card-head">
                            <div className="wk-card-icon"><Briefcase size={22} /></div>
                            <span className="status-badge" style={{ background: `${statusCfg.color}18`, color: statusCfg.color, border: `1px solid ${statusCfg.color}40` }}>
                              {statusCfg.label}
                            </span>
                          </div>
                          <h4 className="wk-card-name" title={work.title}>{work.title}</h4>
                          <span className="wk-card-id">{work.work_id}</span>
                          <div className="wk-card-meta">
                            <span className="wk-card-meta-item"><Users size={12} /> {work.customer_name || work.contact_name || 'Walk-in'}</span>
                            <span className="wk-card-meta-item"><Calendar size={12} /> {formatDate(work.end_date)}</span>
                          </div>
                          {timeLeft && (
                            <div className={`wk-card-timeleft ${overdue ? 'overdue' : ''}`}>
                              <Clock size={12} /> {timeLeft}
                            </div>
                          )}
                        </div>
                        <div className="wk-card-actions" onClick={e => e.stopPropagation()}>
                          <button className="prod-action-btn action-danger" title="Delete" onClick={e => handleDelete(work, e)}>
                            <Trash2 size={13} />
                          </button>
                          <button className="prod-action-btn action-primary" title="View" style={{ marginLeft: 'auto' }}
                            onClick={e => { e.stopPropagation(); navigate(`/admin/billing/works/${work._id || work.id}`); }}>
                            <ChevronRight size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            <Pagination
              currentPage={currentPage}
              totalItems={works.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>

      {/* Create Work Modal */}
      {showCreate && (
        <AppModal title="Create New Work" onClose={() => !creating && setShowCreate(false)} width="520px"
          footer={<>
            <button className="btn btn-secondary" onClick={() => setShowCreate(false)} disabled={creating}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={creating || !form.title.trim()}>
              {creating ? 'Creating...' : 'Create Work'}
            </button>
          </>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div className="form-group">
              <label>Title *</label>
              <input type="text" className="input-field" placeholder="e.g., Website Redesign, Network Setup..." value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} autoFocus />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea className="input-field" placeholder="Brief description of the work..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>

            {/* Customer Picker */}
            <div className="form-group">
              <label>Customer</label>
              <div className="wk-customer-picker">
                {selectedCustomer ? (
                  <div className="wk-customer-selected">
                    <div className="wk-customer-avatar">{selectedCustomer.name?.charAt(0)?.toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)' }}>{selectedCustomer.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{selectedCustomer._id ? (selectedCustomer.phone || 'Linked customer') : 'Manual entry'}</div>
                    </div>
                    <button type="button" className="wk-customer-clear" onClick={() => { setSelectedCustomer(null); setForm(prev => ({ ...prev, contact_name: '', contact_phone: '', contact_email: '' })); }}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <input type="text" className="input-field" placeholder="Type customer name..." value={customerSearch} onChange={e => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }} onFocus={() => setShowCustomerDropdown(true)} onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)} />
                    {showCustomerDropdown && customerSearch && (
                      <div className="wk-customer-dropdown">
                        {filteredCustomers.slice(0, 5).map(c => (
                          <div key={c._id || c.id} className="wk-customer-option" onClick={() => handleSelectCustomer(c)}>
                            <div className="wk-customer-avatar small">{c.name?.charAt(0)?.toUpperCase()}</div>
                            <div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)' }}>{c.name}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{c.phone} {c.address ? `• ${c.address}` : ''}</div>
                            </div>
                          </div>
                        ))}
                        <div className="wk-customer-option" style={{ borderTop: '1px solid var(--border)', marginTop: '0.25rem', paddingTop: '0.5rem' }} onClick={() => {
                          setSelectedCustomer({ name: customerSearch.trim() });
                          setForm(prev => ({ ...prev, contact_name: customerSearch.trim(), contact_phone: '', contact_email: '' }));
                          setShowCustomerDropdown(false);
                          setCustomerSearch('');
                        }}>
                          <div className="wk-customer-avatar small" style={{ background: 'var(--primary)', color: '#fff' }}><Plus size={12} /></div>
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--primary)' }}>Use \"{customerSearch.trim()}\" as customer</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Enter contact details manually</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Contact Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group"><label>Contact Name</label><input className="input-field" placeholder="Name" value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} /></div>
              <div className="form-group"><label>Contact Phone</label><input className="input-field" placeholder="Phone" value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} /></div>
            </div>
            <div className="form-group"><label>Contact Email</label><input className="input-field" type="email" placeholder="Email (optional)" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} /></div>

            {/* End Date & Time */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group"><label>End Date *</label><input type="date" className="input-field" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
              <div className="form-group"><label>End Time *</label><input type="time" className="input-field" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} /></div>
            </div>

            <div className="form-group"><label>Notes</label><textarea className="input-field" placeholder="Any additional notes (optional)..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </div>
        </AppModal>
      )}
    </div>
  );
};

export default WorkList;
