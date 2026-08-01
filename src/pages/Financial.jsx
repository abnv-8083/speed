import React, { useState, useEffect } from 'react';
import {
  ArrowUpRight, ArrowDownRight, Plus, Search,
  Trash2, Edit2, X, Check, AlertTriangle,
  ChevronRight, Wallet, TrendingUp, TrendingDown, Calendar,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import PremiumLoader from '../components/PremiumLoader';
import { useToast } from '../components/ToastContext';
import { useModal } from '../components/ModalContext';
import AppModal from '../components/AppModal';
import './Financial.css';

const BLANK = { loan_type: 'lent', person_name: '', amount: '', due_date: '' };

const LoanFields = ({ values, onChange }) => (
  <>
    <div className="fin-field">
      <label>Type</label>
      <select className="input-field" value={values.loan_type} onChange={e => onChange('loan_type', e.target.value)}>
        <option value="lent">I Lent Money (To Customer / Staff)</option>
        <option value="borrowed">I Borrowed Money (From Bank / Person)</option>
      </select>
    </div>
    <div className="fin-field">
      <label>Person / Entity Name</label>
      <input type="text" className="input-field" value={values.person_name}
        onChange={e => onChange('person_name', e.target.value)} required placeholder="e.g. John Doe" />
    </div>
    <div className="fin-field">
      <label>Amount (₹)</label>
      <input type="number" className="input-field" value={values.amount}
        onChange={e => onChange('amount', e.target.value)} required min="1" step="0.01" placeholder="0.00" />
    </div>
    <div className="fin-field">
      <label>Due Date (optional)</label>
      <input type="date" className="input-field" value={values.due_date}
        onChange={e => onChange('due_date', e.target.value)} />
    </div>
  </>
);

const Financial = () => {
  const navigate = useNavigate();
  const toast    = useToast();
  const modal    = useModal();

  const [loans, setLoans]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [searchTerm, setSearchTerm]   = useState('');
  const [filterType, setFilterType]   = useState('all');   // all | lent | borrowed
  const [filterStatus, setFilterStatus] = useState('all'); // all | active | settled
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting]   = useState(false);

  const [form, setForm]               = useState({ ...BLANK });
  const [editLoan, setEditLoan]       = useState(null);
  const [editForm, setEditForm]       = useState({ ...BLANK });
  const [editSaving, setEditSaving]   = useState(false);
  const [deleteId, setDeleteId]       = useState(null);
  const [deleting, setDeleting]       = useState(false);

  useEffect(() => { fetchLoans(); }, []);

  const fetchLoans = async () => {
    setLoading(true);
    try { setLoans(await api.getLoans()); }
    catch (err) { toast.error('Failed to load loans: ' + err.message); }
    setLoading(false);
  };

  const handleAddLoan = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!form.person_name || !form.amount) return;
    setSubmitting(true);
    try {
      await api.createLoan({ loan_type: form.loan_type, person_name: form.person_name, amount: parseFloat(form.amount), status: 'active', due_date: form.due_date || null });
      setForm({ ...BLANK }); setShowAddForm(false); fetchLoans();
      toast.success('Loan record added');
    } catch (err) { toast.error('Error adding loan: ' + err.message); }
    setSubmitting(false);
  };

  const openEdit = (e, loan) => {
    e.stopPropagation();
    setEditLoan(loan);
    setEditForm({ loan_type: loan.loan_type, person_name: loan.person_name, amount: String(loan.amount), due_date: loan.due_date ? loan.due_date.slice(0, 10) : '' });
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editForm.person_name || !editForm.amount) return;
    setEditSaving(true);
    const newAmount  = parseFloat(editForm.amount);
    const amountPaid = Number(editLoan.amount_paid || 0);
    try {
      await api.updateLoan(editLoan.id, { loan_type: editForm.loan_type, person_name: editForm.person_name, amount: newAmount, status: amountPaid >= newAmount ? 'settled' : 'active', due_date: editForm.due_date || null });
      setEditLoan(null); fetchLoans(); toast.success('Loan updated');
    } catch (err) { toast.error('Error updating loan: ' + err.message); }
    setEditSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await api.deleteLoan(deleteId); setDeleteId(null); fetchLoans(); toast.success('Loan deleted'); }
    catch (err) { toast.error('Error deleting: ' + err.message); }
    setDeleting(false);
  };

  const handleQuickPay = async (e, loan) => {
    e.stopPropagation();
    const balance = loan.amount - (loan.amount_paid || 0);
    const paymentStr = await modal.prompt('Make Payment', `Remaining balance: ₹${balance.toFixed(2)}. Enter amount:`, '', 'number');
    if (!paymentStr) return;
    const paymentAmount = parseFloat(paymentStr);
    if (isNaN(paymentAmount) || paymentAmount <= 0) { toast.warning('Invalid amount'); return; }
    if (paymentAmount > balance) { toast.warning('Exceeds balance'); return; }
    const newAmountPaid = Number(loan.amount_paid || 0) + paymentAmount;
    try {
      await api.createLoanPayment({ loan_id: loan.id, amount: paymentAmount });
      await api.updateLoan(loan.id, { amount_paid: newAmountPaid, status: newAmountPaid >= loan.amount ? 'settled' : 'active' });
      fetchLoans();
    } catch (err) { toast.error('Payment failed: ' + err.message); }
  };

  // ── Metrics ──────────────────────────────────────────────────
  const activeLoans    = loans.filter(l => (l.status || 'active') === 'active');
  const totalLent      = activeLoans.filter(l => l.loan_type === 'lent').reduce((s, l) => s + (Number(l.amount) - Number(l.amount_paid || 0)), 0);
  const totalBorrowed  = activeLoans.filter(l => l.loan_type === 'borrowed').reduce((s, l) => s + (Number(l.amount) - Number(l.amount_paid || 0)), 0);
  const netPosition    = totalLent - totalBorrowed;
  const settledCount   = loans.filter(l => l.status === 'settled').length;

  // ── Filter ───────────────────────────────────────────────────
  const filteredLoans = loans.filter(l => {
    const matchSearch = l.person_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType   = filterType   === 'all' || l.loan_type === filterType;
    const matchStatus = filterStatus === 'all' || (l.status || 'active') === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  const progressPct = (loan) => {
    const pct = (Number(loan.amount_paid || 0) / Number(loan.amount)) * 100;
    return Math.min(100, pct);
  };

  const isOverdue = (loan) => {
    if (!loan.due_date || loan.status === 'settled') return false;
    return new Date(loan.due_date) < new Date();
  };

  return (
    <div className="fin-root animate-fade-in">

      {/* ── Metrics ── */}
      <div className="fin-metrics">
        <div className="fin-metric glass-panel fin-metric--lent">
          <div className="fin-metric-icon"><TrendingUp size={20} /></div>
          <div className="fin-metric-info">
            <span className="fin-metric-label">Money Lent Out</span>
            <span className="fin-metric-value">₹{totalLent.toFixed(2)}</span>
          </div>
        </div>
        <div className="fin-metric glass-panel fin-metric--borrowed">
          <div className="fin-metric-icon"><TrendingDown size={20} /></div>
          <div className="fin-metric-info">
            <span className="fin-metric-label">Money Borrowed</span>
            <span className="fin-metric-value">₹{totalBorrowed.toFixed(2)}</span>
          </div>
        </div>
        <div className={`fin-metric glass-panel ${netPosition >= 0 ? 'fin-metric--positive' : 'fin-metric--negative'}`}>
          <div className="fin-metric-icon"><Wallet size={20} /></div>
          <div className="fin-metric-info">
            <span className="fin-metric-label">Net Position</span>
            <span className="fin-metric-value">{netPosition >= 0 ? '+' : ''}₹{netPosition.toFixed(2)}</span>
          </div>
        </div>
        <div className="fin-metric glass-panel fin-metric--settled">
          <div className="fin-metric-icon"><Check size={20} /></div>
          <div className="fin-metric-info">
            <span className="fin-metric-label">Settled Loans</span>
            <span className="fin-metric-value">{settledCount}</span>
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="fin-toolbar glass-panel">
        <div className="fin-search-box">
          <Search size={15} />
          <input type="text" placeholder="Search by name…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="fin-filters">
          <select value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            <option value="lent">Lent Out</option>
            <option value="borrowed">Borrowed</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="settled">Settled</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddForm(v => !v)}>
          <Plus size={16} /> New Loan
        </button>
      </div>

      {/* ── Add Loan Modal ── */}
      {showAddForm && (
        <AppModal
          title="Record New Loan"
          onClose={() => setShowAddForm(false)}
          width="520px"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddLoan} disabled={submitting}>
                <Check size={15} /> {submitting ? 'Saving…' : 'Save Record'}
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <LoanFields values={form} onChange={(k, v) => setForm(f => ({ ...f, [k]: v }))} />
          </div>
        </AppModal>
      )}

      {/* ── Loan list ── */}
      <div className="fin-list-wrap glass-panel">
        {/* Column header */}
        {!loading && filteredLoans.length > 0 && (
          <div className="fin-list-header">
            <span className="fin-col-person">Name</span>
            <span className="fin-col-type">Type</span>
            <span className="fin-col-amount">Total</span>
            <span className="fin-col-balance">Balance</span>
            <span className="fin-col-progress">Progress</span>
            <span className="fin-col-status">Status</span>
            <span className="fin-col-actions"></span>
          </div>
        )}

        {loading ? (
          <div className="fin-loader"><PremiumLoader text="Loading Financials…" /></div>
        ) : filteredLoans.length === 0 ? (
          <div className="fin-empty">
            <Wallet size={40} />
            <p>No loan records found.</p>
          </div>
        ) : (
          <div className="fin-list">
            {filteredLoans.map(loan => {
              const balance  = Number(loan.amount) - Number(loan.amount_paid || 0);
              const pct      = progressPct(loan);
              const overdue  = isOverdue(loan);
              const settled  = loan.status === 'settled';
              return (
                <div
                  key={loan.id}
                  className={`fin-row ${settled ? 'fin-row--settled' : ''} ${overdue ? 'fin-row--overdue' : ''}`}
                  onClick={() => navigate(`/financial/loan/${loan.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && navigate(`/financial/loan/${loan.id}`)}
                >
                  {/* Name + date */}
                  <div className="fin-col-person">
                    <div className="fin-avatar">{loan.person_name.charAt(0).toUpperCase()}</div>
                    <div className="fin-person-info">
                      <span className="fin-person-name">{loan.person_name}</span>
                      <span className="fin-person-date">
                        {loan.due_date
                          ? <><Calendar size={11} /> Due: {new Date(loan.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</>
                          : new Date(loan.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
                        }
                      </span>
                      {overdue && <span className="fin-overdue-chip"><AlertTriangle size={10} /> Overdue</span>}
                    </div>
                  </div>

                  {/* Type badge */}
                  <div className="fin-col-type">
                    {loan.loan_type === 'lent'
                      ? <span className="fin-badge fin-badge--lent"><ArrowUpRight size={12} /> Lent</span>
                      : <span className="fin-badge fin-badge--borrowed"><ArrowDownRight size={12} /> Borrowed</span>
                    }
                  </div>

                  {/* Total */}
                  <div className="fin-col-amount">
                    <span className="fin-amount">₹{Number(loan.amount).toFixed(2)}</span>
                  </div>

                  {/* Balance */}
                  <div className="fin-col-balance">
                    <span className={`fin-balance ${settled ? '' : 'fin-balance--active'}`}>
                      ₹{balance.toFixed(2)}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="fin-col-progress">
                    <div className="fin-progress-bar">
                      <div className="fin-progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="fin-progress-pct">{Math.round(pct)}%</span>
                  </div>

                  {/* Status */}
                  <div className="fin-col-status">
                    {settled
                      ? <span className="fin-status fin-status--settled">Settled</span>
                      : <span className="fin-status fin-status--active">Active</span>
                    }
                  </div>

                  {/* Actions */}
                  <div className="fin-col-actions" onClick={e => e.stopPropagation()}>
                    {!settled && (
                      <button className="fin-action-btn fin-action-pay" title="Quick Pay" onClick={e => handleQuickPay(e, loan)}>Pay</button>
                    )}
                    <button className="fin-action-icon" title="Edit" onClick={e => openEdit(e, loan)}><Edit2 size={13} /></button>
                    <button className="fin-action-icon fin-action-del" title="Delete" onClick={e => { e.stopPropagation(); setDeleteId(loan.id); }}><Trash2 size={13} /></button>
                    <ChevronRight size={15} className="fin-row-chevron" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Edit Modal ── */}
      {editLoan && (
        <AppModal
          title="Edit Loan"
          onClose={() => setEditLoan(null)}
          width="520px"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setEditLoan(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEditSave} disabled={editSaving}>
                <Check size={15} /> {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </>
          }
        >
          <form onSubmit={handleEditSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <LoanFields values={editForm} onChange={(k, v) => setEditForm(f => ({ ...f, [k]: v }))} />
          </form>
        </AppModal>
      )}

      {/* ── Delete Confirm ── */}
      {deleteId && (
        <AppModal
          title="Delete Loan?"
          onClose={() => setDeleteId(null)}
          width="360px"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="fin-btn-delete" onClick={handleDelete} disabled={deleting}>
                <Trash2 size={14} /> {deleting ? 'Deleting…' : 'Delete Loan'}
              </button>
            </>
          }
        >
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.6 }}>
            All payment records for this loan will also be removed. This cannot be undone.
          </p>
        </AppModal>
      )}
    </div>
  );
};

export default Financial;
