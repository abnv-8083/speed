import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, CreditCard, Banknote,
  TrendingUp, TrendingDown, Clock, AlertTriangle, Calendar,
} from 'lucide-react';
import { api } from '../api';
import PremiumLoader from '../components/PremiumLoader';
import { useToast } from '../components/ToastContext';
import { useModal } from '../components/ModalContext';
import './LoanDetails.css';

const LoanDetails = () => {
  const { id }   = useParams();
  const navigate = useNavigate();
  const toast    = useToast();
  const modal    = useModal();

  const [loan, setLoan]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchLoanDetails(); }, [id]);

  const fetchLoanDetails = async () => {
    setLoading(true);
    try { setLoan(await api.getLoan(id)); }
    catch (err) { toast.error('Failed to load loan: ' + err.message); }
    setLoading(false);
  };

  const handlePayment = async () => {
    if (!loan) return;
    const balance    = loan.amount - Number(loan.amount_paid || 0);
    const paymentStr = await modal.prompt('Make Payment', `Remaining: ₹${balance.toFixed(2)}. Enter amount:`, '', 'number');
    if (!paymentStr) return;
    const paymentAmount = parseFloat(paymentStr);
    if (isNaN(paymentAmount) || paymentAmount <= 0) { toast.warning('Invalid amount'); return; }
    if (paymentAmount > balance) { toast.warning('Exceeds remaining balance'); return; }
    const newAmountPaid = Number(loan.amount_paid || 0) + paymentAmount;
    try {
      await api.createLoanPayment({ loan_id: loan.id, amount: paymentAmount });
      await api.updateLoan(loan.id, { amount_paid: newAmountPaid, status: newAmountPaid >= loan.amount ? 'settled' : 'active' });
      fetchLoanDetails();
      toast.success('Payment recorded');
    } catch (err) { toast.error('Payment failed: ' + err.message); }
  };

  if (loading) return <div className="ld-loader"><PremiumLoader text="Loading Details…" /></div>;

  if (!loan) return (
    <div className="ld-root">
      <p className="ld-not-found">Loan not found.</p>
      <button className="btn btn-secondary" onClick={() => navigate('/financial')}>Go Back</button>
    </div>
  );

  const balance  = Number(loan.amount) - Number(loan.amount_paid || 0);
  const pct      = Math.min(100, (Number(loan.amount_paid || 0) / Number(loan.amount)) * 100);
  const settled  = loan.status === 'settled';
  const overdue  = !settled && loan.due_date && new Date(loan.due_date) < new Date();
  const payments = [...(loan.loan_payments || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div className="ld-root animate-fade-in">

      {/* ── Back + actions ── */}
      <div className="ld-topbar glass-panel">
        <button className="ld-back-btn" onClick={() => navigate('/financial')}>
          <ArrowLeft size={16} /> Financial Portal
        </button>
        <div className="ld-topbar-right">
          {overdue && (
            <span className="ld-overdue-pill"><AlertTriangle size={13} /> Overdue</span>
          )}
          {!settled ? (
            <button className="btn btn-primary" onClick={handlePayment}>
              <CreditCard size={16} /> Make Payment
            </button>
          ) : (
            <span className="ld-settled-pill"><CheckCircle2 size={14} /> Fully Settled</span>
          )}
        </div>
      </div>

      {/* ── Person header ── */}
      <div className="ld-person-card glass-panel">
        <div className="ld-person-avatar">{loan.person_name.charAt(0).toUpperCase()}</div>
        <div className="ld-person-info">
          <h2>{loan.person_name}</h2>
          <div className="ld-person-meta">
            {loan.loan_type === 'lent'
              ? <span className="fin-badge fin-badge--lent"><TrendingUp size={12} /> You lent this money</span>
              : <span className="fin-badge fin-badge--borrowed"><TrendingDown size={12} /> You borrowed this money</span>
            }
            <span className="ld-meta-date">
              <Calendar size={12} />
              {loan.due_date
                ? `Due: ${new Date(loan.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`
                : `Created: ${new Date(loan.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`
              }
            </span>
          </div>
        </div>
        <div className={`ld-status-chip ${settled ? 'ld-status-settled' : 'ld-status-active'}`}>
          {settled ? 'Settled' : 'Active'}
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="ld-stats">
        <div className="ld-stat glass-panel">
          <div className="ld-stat-icon ld-stat-total"><Banknote size={20} /></div>
          <div>
            <span className="ld-stat-label">Total Amount</span>
            <span className="ld-stat-value">₹{Number(loan.amount).toFixed(2)}</span>
          </div>
        </div>
        <div className="ld-stat glass-panel">
          <div className="ld-stat-icon ld-stat-paid"><CheckCircle2 size={20} /></div>
          <div>
            <span className="ld-stat-label">Amount Paid</span>
            <span className="ld-stat-value ld-val-paid">₹{Number(loan.amount_paid || 0).toFixed(2)}</span>
          </div>
        </div>
        <div className="ld-stat glass-panel">
          <div className="ld-stat-icon ld-stat-balance"><Clock size={20} /></div>
          <div>
            <span className="ld-stat-label">Remaining Balance</span>
            <span className={`ld-stat-value ${settled ? '' : 'ld-val-balance'}`}>₹{balance.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* ── Progress ── */}
      <div className="ld-progress-card glass-panel">
        <div className="ld-progress-header">
          <span className="ld-progress-label">Repayment Progress</span>
          <span className="ld-progress-pct">{Math.round(pct)}%</span>
        </div>
        <div className="ld-progress-bar">
          <div className="ld-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="ld-progress-sub">
          ₹{Number(loan.amount_paid || 0).toFixed(2)} paid of ₹{Number(loan.amount).toFixed(2)}
        </div>
      </div>

      {/* ── Payment history ── */}
      <div className="ld-history glass-panel">
        <div className="ld-history-header">
          <h3>Payment History</h3>
          <span className="ld-history-count">{payments.length} payment{payments.length !== 1 ? 's' : ''}</span>
        </div>

        {payments.length === 0 ? (
          <div className="ld-history-empty">
            <Clock size={36} />
            <p>No payments recorded yet.</p>
          </div>
        ) : (
          <div className="ld-timeline">
            {payments.map((p, idx) => (
              <div key={p.id || idx} className="ld-timeline-item animate-fade-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className="ld-tl-dot" />
                <div className="ld-tl-content">
                  <div className="ld-tl-left">
                    <span className="ld-tl-date">{new Date(p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    <span className="ld-tl-time">{new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <span className="ld-tl-amount">+₹{Number(p.amount).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default LoanDetails;
