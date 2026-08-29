import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { AlertTriangle, X, Clock, ArrowRight } from 'lucide-react';
import './WorkDuePopup.css';

const POLL_INTERVAL = 60000; // check every 1 minute
const DISMISS_COOLDOWN = 60 * 60 * 1000; // 1 hour cooldown after manual close

function getDismissMap() {
  try { return JSON.parse(localStorage.getItem('sn_work_popup_dismissed') || '{}'); }
  catch { return {}; }
}

function setDismissTime(workId) {
  const map = getDismissMap();
  map[workId] = Date.now();
  localStorage.setItem('sn_work_popup_dismissed', JSON.stringify(map));
}

function isWithinCooldown(workId) {
  const map = getDismissMap();
  const dismissedAt = map[workId];
  if (!dismissedAt) return false;
  return (Date.now() - dismissedAt) < DISMISS_COOLDOWN;
}

export default function WorkDuePopup() {
  const navigate = useNavigate();
  const [dueWorks, setDueWorks] = useState([]);

  const checkDueWorks = useCallback(async () => {
    try {
      const works = await api.getWorksDueSoon(1);
      const visible = works.filter(w => !isWithinCooldown(w._id || w.id));
      setDueWorks(visible);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    checkDueWorks();
    const interval = setInterval(checkDueWorks, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [checkDueWorks]);

  const handleClose = (workId) => {
    setDismissTime(workId);
    setDueWorks(prev => prev.filter(w => (w._id || w.id) !== workId));
  };

  const goToWork = (work) => {
    const workId = work._id || work.id;
    setDismissTime(workId);
    setDueWorks(prev => prev.filter(w => (w._id || w.id) !== workId));
    navigate(`/admin/billing/works/${workId}`);
  };

  if (dueWorks.length === 0) return null;

  return (
    <div className="wdp-stack">
      {dueWorks.map((work, idx) => {
        const now = new Date();
        const due = new Date(work.end_date);
        const diffMs = due - now;
        const diffHours = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));
        const diffMins = Math.max(0, Math.ceil(diffMs / (1000 * 60)));
        const isOverdue = diffMs < 0;
        const isSoon = diffHours <= 1 && !isOverdue;

        return (
          <div key={work._id || work.id} className="wdp-overlay" style={{ '--wdp-index': idx }}>
            <div className="wdp-popup">
              <div className="wdp-header">
                <div className="wdp-icon">
                  <AlertTriangle size={20} />
                </div>
                <div className="wdp-header-text">
                  <span className="wdp-title">
                    {isOverdue ? '⚠️ Overdue' : isSoon ? '⏰ Due in ' + diffMins + ' min' : '📅 Due Soon'}
                  </span>
                  {dueWorks.length > 1 && (
                    <span className="wdp-counter">{idx + 1} of {dueWorks.length}</span>
                  )}
                </div>
                <button className="wdp-close" onClick={() => handleClose(work._id || work.id)} title="Dismiss for 1 hour">
                  <X size={16} />
                </button>
              </div>

              <div className="wdp-body" onClick={() => goToWork(work)}>
                <div className="wdp-work-info">
                  <span className="wdp-work-id">{work.work_id}</span>
                  <h4 className="wdp-work-title">{work.title}</h4>
                  <div className="wdp-work-meta">
                    <span className="wdp-meta-item">
                      <Clock size={12} />
                      {isOverdue
                        ? `Overdue by ${Math.abs(diffMins)} min`
                        : diffMins < 60
                          ? `${diffMins} min left`
                          : `${diffHours}h ${diffMins % 60}m left`
                      }
                    </span>
                    {(work.customer_name || work.contact_name) && (
                      <span className="wdp-meta-item">👤 {work.customer_name || work.contact_name}</span>
                    )}
                  </div>
                </div>
                <ArrowRight size={18} className="wdp-arrow" />
              </div>

              <div className="wdp-footer">
                <button className="wdp-btn-view" onClick={() => goToWork(work)}>
                  View Work <ArrowRight size={14} />
                </button>
                <button className="wdp-btn-dismiss" onClick={() => handleClose(work._id || work.id)}>
                  Dismiss (1h)
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
