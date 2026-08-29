import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { useToast } from '../../components/ToastContext';
import { useModal } from '../../components/ModalContext';
import AppModal from '../../components/AppModal';
import Portal from '../../components/Portal';
import {
  Plus, Search, Briefcase, Clock, CheckCircle, XCircle,
  Calendar, Users, X, Loader2, AlertTriangle
} from 'lucide-react';
import './WorkList.css';

const STATUS_CONFIG = {
  new:         { label: 'New',         color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  in_progress: { label: 'In Progress', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  completed:   { label: 'Completed',   color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  closed:      { label: 'Closed',      color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
};

const WorkList = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const modal = useModal();

  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [stats, setStats] = useState(null);

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
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;
      const data = await api.getWorks(params);
      setWorks(data);
    } catch (err) {
      toast.error('Failed to load works: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus]);

  const fetchStats = async () => {
    try {
      const data = await api.getWorkStats();
      setStats(data);
    } catch (err) { /* silent */ }
  };

  const fetchCustomers = async () => {
    try {
      const data = await api.getCustomers();
      setCustomers(data || []);
    } catch (err) { /* silent */ }
  };

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
        title: form.title.trim(),
        description: form.description.trim(),
        customer_id: selectedCustomer?._id || selectedCustomer?.id || null,
        customer_name: selectedCustomer?.name || form.contact_name.trim(),
        contact_name: form.contact_name.trim(),
        contact_phone: form.contact_phone.trim(),
        contact_email: form.contact_email.trim(),
        end_date: endDateTime.toISOString(),
        notes: form.notes.trim() ? [form.notes.trim()] : [],
      };
      const work = await api.createWork(body);
      toast.success('Work created successfully');
      setShowCreate(false);
      resetForm();
      navigate(`/admin/billing/works/${work._id || work.id}`);
    } catch (err) {
      toast.error('Failed to create work: ' + err.message);
    }
    setCreating(false);
  };

  const handleDelete = async (work, e) => {
    e.stopPropagation();
    const confirmed = await modal.confirm('Delete Work', `Delete "${work.title}"? This cannot be undone.`);
    if (!confirmed) return;
    try {
      await api.deleteWork(work._id || work.id);
      toast.success('Work deleted');
      fetchWorks();
      fetchStats();
    } catch (err) {
      toast.error('Failed to delete: ' + err.message);
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

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
    const mins = Math.floor(diff / (1000 * 60));
    return `${mins}m left`;
  };

  const filteredCustomers = customers.filter(c =>
    (c.name || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.phone || '').includes(customerSearch)
  );

  return (
    <div className="wk-root">
      {/* Header */}
      <div className="wk-header">
        <div className="wk-header-left">
          <Briefcase size={20} />
          <h1>Work Management</h1>
          <span className="wk-count">{works.length}</span>
        </div>
        <button className="wk-create-btn" onClick={() => { resetForm(); setShowCreate(true); }}>
          <Plus size={16} /> New Work
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="wk-stats">
          <div className="wk-stat" style={{ '--stat-accent': 'var(--primary, #8b5cf6)' }}>
            <span className="wk-stat-num" style={{ color: 'var(--primary, #8b5cf6)' }}>{stats.total || 0}</span>
            <span className="wk-stat-label">Total</span>
          </div>
          {Object.entries(stats.by_status || {}).map(([key, val]) => (
            <div className="wk-stat" key={key} style={{ '--stat-accent': STATUS_CONFIG[key]?.color }}>
              <span className="wk-stat-num" style={{ color: STATUS_CONFIG[key]?.color }}>{val}</span>
              <span className="wk-stat-label">{STATUS_CONFIG[key]?.label || key}</span>
            </div>
          ))}
        </div>
      )}

      {/* Search & Filter */}
      <div className="wk-toolbar">
        <div className="wk-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search works..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && <button className="wk-search-clear" onClick={() => setSearch('')}><X size={14} /></button>}
        </div>
        <select className="wk-filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
      </div>

      {/* Works Grid */}
      {loading ? (
        <div className="wk-loading"><Loader2 size={24} className="spin" /><span>Loading...</span></div>
      ) : works.length === 0 ? (
        <div className="wk-empty">
          <Briefcase size={48} />
          <h3>No works found</h3>
          <p>Create your first work to get started</p>
          <button className="wk-create-btn" onClick={() => { resetForm(); setShowCreate(true); }}>
            <Plus size={16} /> New Work
          </button>
        </div>
      ) : (
        <div className="wk-cards">
          {works.map((work) => {
            const statusCfg = STATUS_CONFIG[work.status] || STATUS_CONFIG.new;
            const overdue = isOverdue(work);
            const timeLeft = getTimeLeft(work);
            return (
              <div
                key={work._id || work.id}
                className={`wk-card ${overdue ? 'overdue' : ''}`}
                style={{ '--card-accent': statusCfg.color }}
                onClick={() => navigate(`/admin/billing/works/${work._id || work.id}`)}
              >
                <div className="wk-card-top">
                  <span className="wk-card-id">{work.work_id}</span>
                  <span className="wk-card-status" style={{ color: statusCfg.color, background: statusCfg.bg }}>
                    {statusCfg.label}
                  </span>
                </div>
                <h3 className="wk-card-title">{work.title}</h3>
                {work.description && (
                  <p className="wk-card-desc">{work.description.slice(0, 80)}{work.description.length > 80 ? '...' : ''}</p>
                )}
                <div className="wk-card-meta">
                  <span className="wk-card-customer">
                    <Users size={13} /> {work.customer_name || work.contact_name || 'Walk-in'}
                  </span>
                </div>
                <div className="wk-card-footer">
                  <span className={`wk-card-due ${overdue ? 'overdue' : ''}`}>
                    <Calendar size={12} /> {formatDate(work.end_date)} {formatTime(work.end_date)}
                  </span>
                  {timeLeft && (
                    <span className={`wk-card-timeleft ${overdue ? 'overdue' : ''}`}>
                      {overdue ? <AlertTriangle size={11} /> : <Clock size={11} />} {timeLeft}
                    </span>
                  )}
                </div>
                <div className="wk-card-badges">
                  {(work.issues || []).length > 0 && (
                    <span className="wk-badge wk-badge-warn"><AlertTriangle size={11} /> {work.issues.length}</span>
                  )}
                  {(work.documents || []).length > 0 && (
                    <span className="wk-badge"><Briefcase size={11} /> {work.documents.length}</span>
                  )}
                </div>
                <button className="wk-card-delete" onClick={(e) => handleDelete(work, e)} title="Delete">
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Work Modal */}
      {showCreate && (
        <Portal>
          <div className="wk-modal-overlay" onClick={() => !creating && setShowCreate(false)}>
            <div className="wk-modal" onClick={e => e.stopPropagation()}>
              <div className="wk-modal-header">
                <h2><Briefcase size={18} /> New Work</h2>
                <button onClick={() => setShowCreate(false)} disabled={creating}><X size={18} /></button>
              </div>
              <div className="wk-modal-body">
                {/* Title */}
                <div className="wk-form-group">
                  <label>Title *</label>
                  <input
                    type="text"
                    placeholder="e.g., Website Redesign, Network Setup..."
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    autoFocus
                  />
                </div>

                {/* Description */}
                <div className="wk-form-group">
                  <label>Description</label>
                  <textarea
                    placeholder="Brief description of the work..."
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    rows={3}
                  />
                </div>

                {/* Customer Picker */}
                <div className="wk-form-group">
                  <label>Customer</label>
                  <div className="wk-customer-picker">
                    {selectedCustomer ? (
                      <div className="wk-customer-selected">
                        <div className="wk-customer-avatar">{selectedCustomer.name?.charAt(0)?.toUpperCase()}</div>
                        <div className="wk-customer-info">
                          <span className="wk-customer-name">{selectedCustomer.name}</span>
                          <span className="wk-customer-phone">{selectedCustomer.phone || ''}</span>
                        </div>
                        <button type="button" className="wk-customer-clear" onClick={() => {
                          setSelectedCustomer(null);
                          setForm(prev => ({ ...prev, contact_name: '', contact_phone: '', contact_email: '' }));
                        }}><X size={14} /></button>
                      </div>
                    ) : (
                      <>
                        <input
                          type="text"
                          placeholder="Search customer or enter details below..."
                          value={customerSearch}
                          onChange={e => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
                          onFocus={() => setShowCustomerDropdown(true)}
                        />
                        {showCustomerDropdown && customerSearch && (
                          <div className="wk-customer-dropdown">
                            {filteredCustomers.length === 0 ? (
                              <div className="wk-customer-dropdown-empty">No customers found</div>
                            ) : (
                              filteredCustomers.slice(0, 6).map(c => (
                                <div key={c._id || c.id} className="wk-customer-option" onClick={() => handleSelectCustomer(c)}>
                                  <div className="wk-customer-avatar small">{c.name?.charAt(0)?.toUpperCase()}</div>
                                  <div>
                                    <div className="wk-customer-option-name">{c.name}</div>
                                    <div className="wk-customer-option-sub">{c.phone} {c.address ? `• ${c.address}` : ''}</div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Contact Details */}
                <div className="wk-form-row">
                  <div className="wk-form-group">
                    <label>Contact Name</label>
                    <input type="text" placeholder="Name" value={form.contact_name}
                      onChange={e => setForm({ ...form, contact_name: e.target.value })} />
                  </div>
                  <div className="wk-form-group">
                    <label>Contact Phone</label>
                    <input type="tel" placeholder="Phone" value={form.contact_phone}
                      onChange={e => setForm({ ...form, contact_phone: e.target.value })} />
                  </div>
                </div>
                <div className="wk-form-group">
                  <label>Contact Email</label>
                  <input type="email" placeholder="Email (optional)" value={form.contact_email}
                    onChange={e => setForm({ ...form, contact_email: e.target.value })} />
                </div>

                {/* End Date & Time */}
                <div className="wk-form-row">
                  <div className="wk-form-group">
                    <label>End Date *</label>
                    <input type="date" value={form.end_date}
                      onChange={e => setForm({ ...form, end_date: e.target.value })} />
                  </div>
                  <div className="wk-form-group">
                    <label>End Time *</label>
                    <input type="time" value={form.end_time}
                      onChange={e => setForm({ ...form, end_time: e.target.value })} />
                  </div>
                </div>

                {/* Notes */}
                <div className="wk-form-group">
                  <label>Notes</label>
                  <textarea
                    placeholder="Any additional notes (optional)..."
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>
              <div className="wk-modal-footer">
                <button className="wk-btn-cancel" onClick={() => setShowCreate(false)} disabled={creating}>Cancel</button>
                <button className="wk-btn-submit" onClick={handleCreate} disabled={creating || !form.title.trim()}>
                  {creating ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
                  Create Work
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
};

export default WorkList;
