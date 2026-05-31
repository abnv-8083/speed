import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, ArrowUpRight, ArrowDownRight, Plus, Search,
  Trash2, Edit2, X, Check, AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import PremiumLoader from '../components/PremiumLoader';
import { useToast } from '../components/ToastContext';
import './Financial.css';

const BLANK = { loan_type: 'lent', person_name: '', amount: '', due_date: '' };

// ── Shared form fields renderer ───────────────────────────────
const LoanFields = ({ values, onChange }) => (
  <>
    <div className="form-group">
      <label>Type</label>
      <select className="input-field" value={values.loan_type} onChange={e => onChange('loan_type', e.target.value)}>
        <option value="lent">I Lent Money (To Customer/Staff)</option>
        <option value="borrowed">I Borrowed Money (From Bank/Person)</option>
      </select>
    </div>
    <div className="form-group">
      <label>Person / Entity Name</label>
      <input type="text" className="input-field" value={values.person_name}
        onChange={e => onChange('person_name', e.target.value)} required placeholder="e.g. John Doe" />
    </div>
    <div className="form-group">
      <label>Amount (₹)</label>
      <input type="number" className="input-field" value={values.amount}
        onChange={e => onChange('amount', e.target.value)} required min="1" step="0.01" placeholder="1000" />
    </div>
    <div className="form-group">
      <label>Due Date (Optional)</label>
      <input type="date" className="input-field" value={values.due_date}
        onChange={e => onChange('due_date', e.target.value)} />
    </div>
  </>
);

const Financial = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [loans, setLoans]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Add form
  const [form, setForm] = useState({ ...BLANK });

  // Edit modal
  const [editLoan, setEditLoan]   = useState(null);  // loan object being edited
  const [editForm, setEditForm]   = useState({ ...BLANK });
  const [editSaving, setEditSaving] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId]   = useState(null);
  const [deleting, setDeleting]   = useState(false);

  useEffect(() => { fetchLoans(); }, []);

  const fetchLoans = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('loans').select('*').order('created_at', { ascending: false });
    if (!error && data) setLoans(data);
    setLoading(false);
  };

  // ── Add ──────────────────────────────────────────────────────
  const handleAddLoan = async (e) => {
    e.preventDefault();
    if (!form.person_name || !form.amount) return;
    setSubmitting(true);
    const { error } = await supabase.from('loans').insert([{
      loan_type:   form.loan_type,
      person_name: form.person_name,
      amount:      parseFloat(form.amount),
      status:      'active',
      due_date:    form.due_date || null,
    }]);
    if (!error) {
      setForm({ ...BLANK });
      setShowAddForm(false);
      fetchLoans();
      toast.success("Loan record added successfully");
    } else toast.error('Error adding loan: ' + error.message);
    setSubmitting(false);
  };

  // ── Edit ─────────────────────────────────────────────────────
  const openEdit = (e, loan) => {
    e.stopPropagation();
    setEditLoan(loan);
    setEditForm({
      loan_type:   loan.loan_type,
      person_name: loan.person_name,
      amount:      String(loan.amount),
      due_date:    loan.due_date ? loan.due_date.slice(0, 10) : '',
    });
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editForm.person_name || !editForm.amount) return;
    setEditSaving(true);
    const newAmount = parseFloat(editForm.amount);
    const amountPaid = Number(editLoan.amount_paid || 0);
    const newStatus = amountPaid >= newAmount ? 'settled' : 'active';
    
    const { error } = await supabase.from('loans').update({
      loan_type:   editForm.loan_type,
      person_name: editForm.person_name,
      amount:      newAmount,
      status:      newStatus,
      due_date:    editForm.due_date || null,
    }).eq('id', editLoan.id);
    if (!error) { 
      setEditLoan(null); 
      fetchLoans(); 
      toast.success("Loan updated successfully");
    }
    else toast.error('Error updating loan: ' + error.message);
    setEditSaving(false);
  };

  // ── Delete ───────────────────────────────────────────────────
  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await supabase.from('loans').delete().eq('id', deleteId);
    if (!error) { 
      setDeleteId(null); 
      fetchLoans(); 
      toast.success("Loan deleted successfully");
    }
    else toast.error('Error deleting loan: ' + error.message);
    setDeleting(false);
  };

  // ── Quick Pay ────────────────────────────────────────────────
  const handleQuickPay = async (loan) => {
    const balance = loan.amount - (loan.amount_paid || 0);
    const paymentStr = window.prompt(`Enter payment amount for ${loan.person_name}\n(Remaining balance: ₹${balance.toFixed(2)})`);
    if (!paymentStr) return;
    
    const paymentAmount = parseFloat(paymentStr);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      alert('Invalid payment amount');
      return;
    }

    if (paymentAmount > balance) {
      alert('Payment cannot exceed remaining balance');
      return;
    }

    const newAmountPaid = Number(loan.amount_paid || 0) + paymentAmount;
    const newStatus = newAmountPaid >= loan.amount ? 'settled' : 'active';

    // Optimistically could show loader, but fetchLoans covers it
    await supabase.from('loan_payments').insert([{
      loan_id: loan.id,
      amount: paymentAmount
    }]);

    await supabase.from('loans').update({ 
      amount_paid: newAmountPaid, 
      status: newStatus 
    }).eq('id', loan.id);
    
    fetchLoans();
  };

  const filteredLoans = loans.filter(l =>
    l.person_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalLent     = loans.filter(l => l.loan_type === 'lent'     && (l.status || 'active') === 'active').reduce((s, l) => s + (Number(l.amount) - Number(l.amount_paid || 0)), 0);
  const totalBorrowed = loans.filter(l => l.loan_type === 'borrowed'  && (l.status || 'active') === 'active').reduce((s, l) => s + (Number(l.amount) - Number(l.amount_paid || 0)), 0);



  return (
    <div className="finance-layout">
      <header className="finance-header glass-panel">
        <div className="header-left">
          <button className="btn-icon" onClick={() => navigate('/home')} title="Back to Home">
            <ArrowLeft size={24} />
          </button>
          <h2>Finance &amp; Loan Tracker</h2>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus size={18} /> New Loan
        </button>
      </header>

      <main className="finance-main">
        {/* ── Metrics ── */}
        <div className="metrics-grid">
          <div className="metric-card glass-panel animate-fade-in">
            <div className="metric-icon success"><ArrowUpRight size={24} /></div>
            <div className="metric-info">
              <p className="metric-label">Total Money Lent (You Gave)</p>
              <h3 className="metric-value text-success">₹{totalLent.toFixed(2)}</h3>
            </div>
          </div>
          <div className="metric-card glass-panel animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="metric-icon danger"><ArrowDownRight size={24} /></div>
            <div className="metric-info">
              <p className="metric-label">Total Borrowed (You Owe)</p>
              <h3 className="metric-value text-error">₹{totalBorrowed.toFixed(2)}</h3>
            </div>
          </div>
        </div>

        {/* ── Add form ── */}
        {showAddForm && (
          <div className="add-loan-card glass-panel animate-fade-in">
            <h3>Record New Loan</h3>
            <form className="loan-form" onSubmit={handleAddLoan}>
              <LoanFields
                values={form}
                onChange={(k, v) => setForm(f => ({ ...f, [k]: v }))}
              />
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Loan list ── */}
        <div className="loans-container glass-panel animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="loans-header">
            <h3>Active &amp; Past Loans</h3>
            <div className="search-box">
              <Search size={18} className="search-icon" />
              <input type="text" placeholder="Search by name..." className="input-field"
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '3rem 0', gridColumn: '1 / -1' }}>
              <PremiumLoader text="Loading Financials..." />
            </div>
          ) : (
            <div className="loans-grid">
              {filteredLoans.length === 0 ? (
                <div className="text-center text-muted" style={{ padding: '2rem', gridColumn: '1 / -1' }}>
                  No loan records found.
                </div>
              ) : (
                filteredLoans.map(loan => (
                  <div
                    key={loan.id}
                    className={`loan-card glass-panel ${loan.status === 'settled' ? 'settled-card' : ''}`}
                    onClick={() => navigate(`/financial/loan/${loan.id}`)}
                  >
                    <div className="loan-card-header">
                      <div className="loan-person">
                        <h4>{loan.person_name}</h4>
                        <span className="text-muted text-sm">{new Date(loan.created_at).toLocaleDateString()}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        {loan.loan_type === 'lent'
                          ? <span className="badge badge-success">Lent Out</span>
                          : <span className="badge badge-danger">Borrowed</span>
                        }
                        {/* Edit & Delete buttons */}
                        <button
                          className="loan-action-btn edit-btn"
                          title="Edit loan"
                          onClick={e => openEdit(e, loan)}
                        ><Edit2 size={14} /></button>
                        <button
                          className="loan-action-btn del-btn"
                          title="Delete loan"
                          onClick={e => { e.stopPropagation(); setDeleteId(loan.id); }}
                        ><Trash2 size={14} /></button>
                      </div>
                    </div>

                    <div className="loan-card-body">
                      <div className="loan-detail">
                        <span className="detail-label">Total Amount</span>
                        <span className="detail-value">₹{Number(loan.amount).toFixed(2)}</span>
                      </div>
                      <div className="loan-detail">
                        <span className="detail-label">Paid Amount</span>
                        <span className="detail-value text-success">₹{Number(loan.amount_paid || 0).toFixed(2)}</span>
                      </div>
                      <div className="loan-detail">
                        <span className="detail-label">Balance</span>
                        <span className="detail-value text-error font-bold">
                          ₹{(Number(loan.amount) - Number(loan.amount_paid || 0)).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="loan-card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="loan-status">
                        {(loan.status || 'active') === 'active'
                          ? <span className="status-badge status-warning">Active</span>
                          : <span className="status-badge status-good">Settled</span>
                        }
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        {(loan.status || 'active') === 'active' && (
                          <button 
                            className="btn btn-primary" 
                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
                            onClick={(e) => { e.stopPropagation(); handleQuickPay(loan); }}
                          >
                            Pay Now
                          </button>
                        )}
                        <span className="text-primary text-sm font-medium">View Details →</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── Edit Modal ── */}
      {editLoan && (
        <div className="fin-modal-backdrop" onClick={() => setEditLoan(null)}>
          <div className="fin-modal glass-panel animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="fin-modal-header">
              <h3>Edit Loan</h3>
              <button className="btn-icon" onClick={() => setEditLoan(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleEditSave}>
              <div className="fin-modal-body">
                <LoanFields
                  values={editForm}
                  onChange={(k, v) => setEditForm(f => ({ ...f, [k]: v }))}
                />
              </div>
              <div className="fin-modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditLoan(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={editSaving}>
                  <Check size={15} /> {editSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteId && (
        <div className="fin-modal-backdrop" onClick={() => setDeleteId(null)}>
          <div className="fin-confirm glass-panel animate-fade-in" onClick={e => e.stopPropagation()}>
            <AlertTriangle size={36} color="#ef4444" strokeWidth={1.5} />
            <h3>Delete this loan?</h3>
            <p>All payment records for this loan will also be removed. This cannot be undone.</p>
            <div className="fin-confirm-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                <Trash2 size={15} /> {deleting ? 'Deleting…' : 'Delete Loan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Financial;
