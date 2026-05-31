import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, History, CreditCard, Banknote } from 'lucide-react';
import { supabase } from '../supabaseClient';
import PremiumLoader from '../components/PremiumLoader';
import './LoanDetails.css';

const LoanDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLoanDetails();
  }, [id]);

  const fetchLoanDetails = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('loans')
      .select('*, loan_payments(*)')
      .eq('id', id)
      .single();

    if (!error && data) {
      setLoan(data);
    }
    setLoading(false);
  };

  const handlePayment = async () => {
    if (!loan) return;
    
    const balance = loan.amount - loan.amount_paid;
    const paymentStr = window.prompt(`Enter payment amount (Remaining balance: ₹${balance.toFixed(2)})`);
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

    const newAmountPaid = Number(loan.amount_paid) + paymentAmount;
    const newStatus = newAmountPaid >= loan.amount ? 'settled' : 'active';

    // 1. Insert payment record
    await supabase.from('loan_payments').insert([{
      loan_id: loan.id,
      amount: paymentAmount
    }]);

    // 2. Update loan totals
    await supabase.from('loans').update({ 
      amount_paid: newAmountPaid, 
      status: newStatus 
    }).eq('id', loan.id);
    
    fetchLoanDetails();
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh' }}>
        <PremiumLoader text="Loading Details..." />
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="loan-details-layout">
        <p className="text-center text-error">Loan not found.</p>
        <button className="btn btn-secondary" onClick={() => navigate('/financial')}>Go Back</button>
      </div>
    );
  }

  const balance = Number(loan.amount) - Number(loan.amount_paid || 0);

  return (
    <div className="loan-details-layout animate-fade-in">
      <header className="finance-header glass-panel">
        <div className="header-left">
          <button className="btn-icon" onClick={() => navigate('/financial')} title="Back to Finance Portal">
            <ArrowLeft size={24} />
          </button>
          <h2>{loan.person_name}'s Loan Details</h2>
        </div>
        <div className="header-actions">
          {loan.status === 'active' ? (
            <button className="btn btn-primary" onClick={handlePayment}>
              <CreditCard size={18} /> Make Payment
            </button>
          ) : (
            <span className="status-badge status-good text-lg"><CheckCircle2 size={18} style={{marginRight:'0.5rem'}}/> Fully Settled</span>
          )}
        </div>
      </header>

      <main className="finance-main">
        <div className="details-metrics-grid">
          <div className="metric-card glass-panel">
            <div className="metric-info">
              <p className="metric-label">Total Amount</p>
              <h3 className="metric-value">₹{Number(loan.amount).toFixed(2)}</h3>
            </div>
            <Banknote size={32} className="text-muted opacity-50" />
          </div>

          <div className="metric-card glass-panel">
            <div className="metric-info">
              <p className="metric-label">Amount Paid</p>
              <h3 className="metric-value text-success">₹{Number(loan.amount_paid || 0).toFixed(2)}</h3>
            </div>
            <CheckCircle2 size={32} className="text-success opacity-50" />
          </div>

          <div className="metric-card glass-panel">
            <div className="metric-info">
              <p className="metric-label">Remaining Balance</p>
              <h3 className="metric-value text-error">₹{balance.toFixed(2)}</h3>
            </div>
            <History size={32} className="text-error opacity-50" />
          </div>
        </div>

        <div className="payment-history-container glass-panel">
          <div className="section-header">
            <h3>Payment History</h3>
            <span className="text-muted">Tracking all installments</span>
          </div>
          
          <div className="history-timeline">
            {(!loan.loan_payments || loan.loan_payments.length === 0) ? (
              <div className="empty-history text-center text-muted">
                <History size={48} className="opacity-20 mx-auto mb-4" />
                <p>No payments recorded yet.</p>
              </div>
            ) : (
              <div className="timeline-list">
                {loan.loan_payments.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).map((payment, idx) => (
                  <div key={payment.id} className="timeline-item animate-fade-in" style={{ animationDelay: `${idx * 0.1}s` }}>
                    <div className="timeline-marker"></div>
                    <div className="timeline-content">
                      <div className="timeline-date">
                        <span className="date">{new Date(payment.created_at).toLocaleDateString()}</span>
                        <span className="time">{new Date(payment.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <div className="timeline-amount text-success font-bold">
                        +₹{Number(payment.amount).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default LoanDetails;
