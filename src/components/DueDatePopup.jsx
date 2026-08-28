import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { AlertTriangle, X, Clock, ArrowRight } from 'lucide-react';
import './DueDatePopup.css';

const DISMISS_KEY = 'sn_due_popup_dismissed';
const RECHECK_INTERVAL = 60000; // check every 1 minute

function getDismissedMap() {
  try {
    return JSON.parse(localStorage.getItem(DISMISS_KEY) || '{}');
  } catch { return {}; }
}

function setDismissed(workId) {
  const map = getDismissedMap();
  map[workId] = Date.now();
  localStorage.setItem(DISMISS_KEY, JSON.stringify(map));
}

function isDismissedPermanently(workId) {
  const map = getDismissedMap();
  return !!map[workId]; // permanently dismissed until manually un-dismissed or work changes
}

export default function DueDatePopup() {
  const navigate = useNavigate();
  const [dueWorks, setDueWorks] = useState([]);

  // Poll for due works
  useEffect(() => {
    const checkDueWorks = async () => {
      try {
        const works = await api.getWorksDueSoon(24);
        const pending = works.filter(w => !isDismissedPermanently(w._id || w.id));
        setDueWorks(pending);
      } catch (err) {
        // silent
      }
    };

    checkDueWorks();
    const interval = setInterval(checkDueWorks, RECHECK_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const closePopup = (workId) => {
    setDismissed(workId);
    setDueWorks(prev => prev.filter(w => (w._id || w.id) !== workId));
  };

  const goToWork = (work) => {
    closePopup(work._id || work.id);
    navigate(`/admin/billing/works/${work._id || work.id}`);
  };

  if (dueWorks.length === 0) return null;

  return (
    <div className="ddp-stack">
      {dueWorks.map((work, idx) => {
        const today = new Date();
        const due = new Date(work.due_date);
        const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
        const isOverdue = diffDays < 0;
        const isToday = diffDays === 0;

        return (
          <div key={work._id || work.id} className="ddp-overlay show" style={{ '--ddp-index': idx }}>
            <div className="ddp-popup">
              <div className="ddp-header">
                <div className="ddp-icon">
                  <AlertTriangle size={20} />
                </div>
                <div className="ddp-header-text">
                  <span className="ddp-title">
                    {isOverdue ? '⚠️ Overdue Work' : isToday ? '⏰ Due Today' : '📅 Due Tomorrow'}
                  </span>
                  {dueWorks.length > 1 && (
                    <span className="ddp-counter">
                      {idx + 1} of {dueWorks.length}
                    </span>
                  )}
                </div>
                <button className="ddp-close" onClick={() => closePopup(work._id || work.id)} title="Dismiss">
                  <X size={16} />
                </button>
              </div>

              <div className="ddp-body" onClick={() => goToWork(work)}>
                <div className="ddp-work-info">
                  <span className="ddp-work-id">{work.work_id}</span>
                  <h4 className="ddp-work-title">{work.title}</h4>
                  <div className="ddp-work-meta">
                    <span className="ddp-meta-item">
                      <Clock size={12} />
                      {isOverdue ? `${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''} overdue` : diffDays === 0 ? 'Due today' : `${diffDays} day${diffDays > 1 ? 's' : ''} left`}
                    </span>
                    {work.customer_name && <span className="ddp-meta-item">👤 {work.customer_name}</span>}
                    <span className="ddp-meta-item" style={{ color: work.priority === 'urgent' ? '#dc2626' : work.priority === 'high' ? '#ef4444' : '#f59e0b' }}>
                      ● {work.priority}
                    </span>
                  </div>
                </div>
                <ArrowRight size={18} className="ddp-arrow" />
              </div>

              <div className="ddp-footer">
                <button className="ddp-btn-view" onClick={() => goToWork(work)}>
                  View Work <ArrowRight size={14} />
                </button>
                <button className="ddp-btn-dismiss" onClick={() => closePopup(work._id || work.id)}>
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
