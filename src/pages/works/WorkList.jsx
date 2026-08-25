import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import {
  Plus, Search, LayoutGrid, List, Filter, Briefcase,
  Clock, AlertTriangle, CheckCircle, XCircle, PauseCircle,
  FileText, ChevronDown, X, Loader2, Calendar, Tag,
  Users, ArrowUpDown
} from 'lucide-react';
import './WorkList.css';

const STATUS_CONFIG = {
  new:         { label: 'New',         color: '#8b5cf6', icon: Briefcase, bg: 'rgba(139,92,246,0.15)' },
  pending:     { label: 'Pending',     color: '#f59e0b', icon: Clock,     bg: 'rgba(245,158,11,0.15)' },
  in_progress: { label: 'In Progress', color: '#3b82f6', icon: Clock,     bg: 'rgba(59,130,246,0.15)' },
  on_hold:     { label: 'On Hold',     color: '#f97316', icon: PauseCircle, bg: 'rgba(249,115,22,0.15)' },
  completed:   { label: 'Completed',   color: '#22c55e', icon: CheckCircle, bg: 'rgba(34,197,94,0.15)' },
  closed:      { label: 'Closed',      color: '#6b7280', icon: XCircle,   bg: 'rgba(107,114,128,0.15)' },
};

const PRIORITY_CONFIG = {
  low:    { label: 'Low',    color: '#6b7280' },
  medium: { label: 'Medium', color: '#f59e0b' },
  high:   { label: 'High',   color: '#ef4444' },
  urgent: { label: 'Urgent', color: '#dc2626' },
};

const WorkList = () => {
  const navigate = useNavigate();
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'table'
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Create work modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '', description: '', customer_name: '', priority: 'medium',
    start_date: '', due_date: '', tags: '',
  });
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [creating, setCreating] = useState(false);

  // Stats
  const [stats, setStats] = useState(null);

  const fetchWorks = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;
      if (filterPriority) params.priority = filterPriority;
      if (sortBy) params.sort = sortBy;

      const data = await api.getWorks(params);
      setWorks(data);
    } catch (err) {
      console.error('Failed to load works:', err);
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, filterPriority, sortBy]);

  const fetchStats = async () => {
    try {
      const data = await api.getWorkStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const fetchCustomers = async () => {
    try {
      const data = await api.getCustomers();
      setCustomers(data);
    } catch (err) {
      console.error('Failed to load customers:', err);
    }
  };

  useEffect(() => {
    fetchWorks();
    fetchStats();
  }, [fetchWorks]);

  useEffect(() => {
    if (showCreate) fetchCustomers();
  }, [showCreate]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.title.trim()) return;

    try {
      setCreating(true);
      const body = {
        ...createForm,
        tags: createForm.tags ? createForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      };
      if (selectedCustomer) {
        body.customer_id = selectedCustomer.id || selectedCustomer._id;
      }
      const work = await api.createWork(body);
      setShowCreate(false);
      setCreateForm({ title: '', description: '', customer_name: '', priority: 'medium', start_date: '', due_date: '', tags: '' });
      setSelectedCustomer(null);
      navigate(`/billing/works/${work.id || work._id}`);
    } catch (err) {
      alert('Failed to create work: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this work?')) return;
    try {
      await api.deleteWork(id);
      fetchWorks();
      fetchStats();
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.phone && c.phone.includes(customerSearch))
  );

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const isOverdue = (work) => {
    if (!work.due_date || work.status === 'completed' || work.status === 'closed') return false;
    return new Date(work.due_date) < new Date();
  };

  return (
    <div className="wl-root">
      {/* Header */}
      <div className="wl-header">
        <div className="wl-header-left">
          <Briefcase size={22} />
          <h1>Work Management</h1>
          <span className="wl-count">{works.length} works</span>
        </div>
        <div className="wl-header-right">
          <div className="wl-view-toggle">
            <button className={viewMode === 'card' ? 'active' : ''} onClick={() => setViewMode('card')} title="Card view">
              <LayoutGrid size={16} />
            </button>
            <button className={viewMode === 'table' ? 'active' : ''} onClick={() => setViewMode('table')} title="Table view">
              <List size={16} />
            </button>
          </div>
          <button className="wl-create-btn" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New Work
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="wl-stats">
          <div className="wl-stat">
            <span className="wl-stat-num">{stats.total || 0}</span>
            <span className="wl-stat-label">Total</span>
          </div>
          {(Object.entries(stats.by_status || {}).map(([key, val]) => (
            <div className="wl-stat" key={key}>
              <span className="wl-stat-num" style={{ color: STATUS_CONFIG[key]?.color }}>{val}</span>
              <span className="wl-stat-label">{STATUS_CONFIG[key]?.label || key}</span>
            </div>
          )))}
          {stats.open_issues > 0 && (
            <div className="wl-stat wl-stat-warn">
              <AlertTriangle size={14} />
              <span className="wl-stat-num">{stats.open_issues}</span>
              <span className="wl-stat-label">Open Issues</span>
            </div>
          )}
        </div>
      )}

      {/* Search & Filters */}
      <div className="wl-toolbar">
        <div className="wl-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search works by ID, title, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && <button className="wl-search-clear" onClick={() => setSearch('')}><X size={14} /></button>}
        </div>
        <button className={`wl-filter-btn ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(!showFilters)}>
          <Filter size={16} /> Filters
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="wl-filters">
          <div className="wl-filter-group">
            <label>Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
          </div>
          <div className="wl-filter-group">
            <label>Priority</label>
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
              <option value="">All Priorities</option>
              {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
          </div>
          <div className="wl-filter-group">
            <label>Sort By</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="">Newest First</option>
              <option value="due_date">Due Date</option>
              <option value="priority">Priority</option>
              <option value="status">Status</option>
            </select>
          </div>
          {(filterStatus || filterPriority || sortBy) && (
            <button className="wl-filter-clear" onClick={() => { setFilterStatus(''); setFilterPriority(''); setSortBy(''); }}>
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Works List */}
      {loading ? (
        <div className="wl-loading">
          <Loader2 size={24} className="spin" />
          <span>Loading works...</span>
        </div>
      ) : works.length === 0 ? (
        <div className="wl-empty">
          <Briefcase size={48} />
          <h3>No works found</h3>
          <p>Create your first work to get started</p>
          <button className="wl-create-btn" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New Work
          </button>
        </div>
      ) : viewMode === 'card' ? (
        <div className="wl-cards">
          {works.map((work) => {
            const statusCfg = STATUS_CONFIG[work.status] || STATUS_CONFIG.new;
            const priorityCfg = PRIORITY_CONFIG[work.priority] || PRIORITY_CONFIG.medium;
            const overdue = isOverdue(work);
            return (
              <div
                key={work.id || work._id}
                className={`wl-card ${overdue ? 'overdue' : ''}`}
                onClick={() => navigate(`/billing/works/${work.id || work._id}`)}
              >
                <div className="wl-card-header">
                  <span className="wl-card-id">{work.work_id}</span>
                  <span className="wl-card-status" style={{ color: statusCfg.color, background: statusCfg.bg }}>
                    {statusCfg.label}
                  </span>
                </div>
                <h3 className="wl-card-title">{work.title}</h3>
                {work.description && (
                  <p className="wl-card-desc">{work.description.slice(0, 100)}{work.description.length > 100 ? '...' : ''}</p>
                )}
                <div className="wl-card-meta">
                  <span className="wl-card-customer">
                    <Users size={13} /> {work.customer_name || 'Walk-in'}
                  </span>
                  <span className="wl-card-priority" style={{ color: priorityCfg.color }}>
                    ● {priorityCfg.label}
                  </span>
                </div>
                <div className="wl-card-footer">
                  <div className="wl-card-dates">
                    {work.due_date && (
                      <span className={`wl-card-due ${overdue ? 'overdue' : ''}`}>
                        <Calendar size={12} /> Due: {formatDate(work.due_date)}
                      </span>
                    )}
                  </div>
                  <div className="wl-card-badges">
                    {work.issues?.length > 0 && (
                      <span className="wl-badge wl-badge-warn">
                        <AlertTriangle size={11} /> {work.issues.length}
                      </span>
                    )}
                    {work.documents?.length > 0 && (
                      <span className="wl-badge">
                        <FileText size={11} /> {work.documents.length}
                      </span>
                    )}
                    {work.notes?.length > 0 && (
                      <span className="wl-badge">
                        📝 {work.notes.length}
                      </span>
                    )}
                  </div>
                </div>
                {work.tags?.length > 0 && (
                  <div className="wl-card-tags">
                    {work.tags.slice(0, 3).map((tag, i) => (
                      <span key={i} className="wl-tag"><Tag size={10} /> {tag}</span>
                    ))}
                    {work.tags.length > 3 && <span className="wl-tag more">+{work.tags.length - 3}</span>}
                  </div>
                )}
                <button className="wl-card-delete" onClick={(e) => handleDelete(work.id || work._id, e)} title="Delete work">
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="wl-table-wrap">
          <table className="wl-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Due Date</th>
                <th>Issues</th>
                <th>Docs</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {works.map((work) => {
                const statusCfg = STATUS_CONFIG[work.status] || STATUS_CONFIG.new;
                const priorityCfg = PRIORITY_CONFIG[work.priority] || PRIORITY_CONFIG.medium;
                const overdue = isOverdue(work);
                return (
                  <tr
                    key={work.id || work._id}
                    className={overdue ? 'overdue' : ''}
                    onClick={() => navigate(`/billing/works/${work.id || work._id}`)}
                  >
                    <td><span className="wl-table-id">{work.work_id}</span></td>
                    <td><strong>{work.title}</strong></td>
                    <td>{work.customer_name || 'Walk-in'}</td>
                    <td>
                      <span className="wl-table-status" style={{ color: statusCfg.color, background: statusCfg.bg }}>
                        {statusCfg.label}
                      </span>
                    </td>
                    <td><span style={{ color: priorityCfg.color }}>● {priorityCfg.label}</span></td>
                    <td className={overdue ? 'overdue' : ''}>{formatDate(work.due_date)}</td>
                    <td>{work.issues?.length || 0}</td>
                    <td>{work.documents?.length || 0}</td>
                    <td>{work.notes?.length || 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Work Modal */}
      {showCreate && (
        <div className="wl-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="wl-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wl-modal-header">
              <h2><Briefcase size={18} /> Create New Work</h2>
              <button onClick={() => setShowCreate(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="wl-modal-body">
              <div className="wl-form-group">
                <label>Title *</label>
                <input
                  type="text"
                  placeholder="e.g., Website Redesign, Network Setup..."
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              <div className="wl-form-group">
                <label>Description</label>
                <textarea
                  placeholder="Brief description of the work..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Customer Picker */}
              <div className="wl-form-group">
                <label>Customer</label>
                <div className="wl-customer-picker">
                  {selectedCustomer ? (
                    <div className="wl-customer-selected">
                      <div className="wl-customer-avatar">
                        {selectedCustomer.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="wl-customer-info">
                        <span className="wl-customer-name">{selectedCustomer.name}</span>
                        <span className="wl-customer-phone">{selectedCustomer.phone || ''}</span>
                      </div>
                      <button type="button" className="wl-customer-clear" onClick={() => {
                        setSelectedCustomer(null);
                        setCreateForm({ ...createForm, customer_name: '' });
                      }}>
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        placeholder="Search customer or enter name..."
                        value={customerSearch || createForm.customer_name}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value);
                          setCreateForm({ ...createForm, customer_name: e.target.value });
                          setShowCustomerDropdown(true);
                        }}
                        onFocus={() => setShowCustomerDropdown(true)}
                      />
                      {showCustomerDropdown && customerSearch && (
                        <div className="wl-customer-dropdown">
                          {filteredCustomers.length === 0 ? (
                            <div className="wl-customer-dropdown-empty">
                              No customers found. Press Enter to use "{customerSearch}" as name.
                            </div>
                          ) : (
                            filteredCustomers.slice(0, 8).map((c) => (
                              <div
                                key={c.id || c._id}
                                className="wl-customer-option"
                                onClick={() => {
                                  setSelectedCustomer(c);
                                  setCustomerSearch('');
                                  setShowCustomerDropdown(false);
                                }}
                              >
                                <div className="wl-customer-avatar small">
                                  {c.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="wl-customer-option-name">{c.name}</div>
                                  <div className="wl-customer-option-sub">{c.phone} {c.address ? `• ${c.address}` : ''}</div>
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

              <div className="wl-form-row">
                <div className="wl-form-group">
                  <label>Priority</label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                  >
                    {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                  </select>
                </div>
                <div className="wl-form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={createForm.start_date}
                    onChange={(e) => setCreateForm({ ...createForm, start_date: e.target.value })}
                  />
                </div>
                <div className="wl-form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    value={createForm.due_date}
                    onChange={(e) => setCreateForm({ ...createForm, due_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="wl-form-group">
                <label>Tags (comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g., urgent, website, redesign"
                  value={createForm.tags}
                  onChange={(e) => setCreateForm({ ...createForm, tags: e.target.value })}
                />
              </div>

              <div className="wl-modal-footer">
                <button type="button" className="wl-btn-cancel" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="wl-btn-submit" disabled={creating || !createForm.title.trim()}>
                  {creating ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
                  Create Work
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkList;
