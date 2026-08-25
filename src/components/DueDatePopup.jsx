import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { AlertTriangle, X, Clock, ArrowRight } from 'lucide-react';
import './DueDatePopup.css';

const DISMISS_KEY = 'sn_due_popup_dismissed';
const POPUP_DURATION = 10000;   // 10 seconds auto-dismiss
const RECHECK_INTERVAL = 60000; // check every 1 minute
const RESHOW_INTERVAL = 3600000; // re-show after 1 hour

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

function isDismissedRecently(workId) {
  const map = getDismissedMap();
  const ts = map[workId];
  if (!ts) return false;
  return (Date.now() - ts) < RESHOW_INTERVAL;
}

export default function DueDatePopup() {
  const navigate = useNavigate();
  const [dueWorks, setDueWorks] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  const timerRef = useRef(null);
  const progressRef = useRef(null);

  // Poll for due works
  useEffect(() => {
    const checkDueWorks = async () => {
      try {
        const works = await api.getWorksDueSoon(24);
        // Filter out recently dismissed
        const pending = works.filter(w => !isDismissedRecently(w._id || w.id));
        setDueWorks(pending);
      } catch (err) {
        // silent
      }
    };

    checkDueWorks();
    const interval = setInterval(checkDueWorks, RECHECK_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Show popup when due works are found
  useEffect(() => {
    if (dueWorks.length > 0 && !visible) {
      setCurrentIdx(0);
      setVisible(true);
      setProgress(100);

      // Auto-dismiss timer
      const startTime = Date.now();
      progressRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / POPUP_DURATION) * 100);
        setProgress(remaining);
        if (remaining <= 0) {
          clearInterval(progressRef.current);
        }
      }, 50);

      timerRef.current = setTimeout(() => {
        setVisible(false);
        clearInterval(progressRef.current);
        // Dismiss current work and show next if any
        if (dueWorks[currentIdx]) {
          setDismissed(dueWorks[currentIdx]._id || dueWorks[currentIdx].id);
        }
      }, POPUP_DURATION);
    }

    return () => {
      clearTimeout(timerRef.current);
      clearInterval(progressRef.current);
    };
  }, [dueWorks.length]);

  const close = () => {
    setVisible(false);
    clearTimeout(timerRef.current);
    clearInterval(progressRef.current);
    if (dueWorks[currentIdx]) {
      setDismissed(dueWorks[currentIdx]._id || dueWorks[currentIdx].id);
    }
  };

  const goToWork = (work) => {
    close();
    navigate(`/billing/works/${work._id || work.id}`);
  };

  const skipToNext = () => {
    clearTimeout(timerRef.current);
    clearInterval(progressRef.current);
    if (dueWorks[currentIdx]) {
      setDismissed(dueWorks[currentIdx]._id || dueWorks[currentIdx].id);
    }

    const nextIdx = currentIdx + 1;
    if (nextIdx < dueWorks.length) {
      setCurrentIdx(nextIdx);
      setProgress(100);
      const startTime = Date.now();
      progressRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / POPUP_DURATION) * 100);
        setProgress(remaining);
      }, 50);
      timerRef.current = setTimeout(() => {
        setVisible(false);
        clearInterval(progressRef.current);
        setDismissed(dueWorks[nextIdx]._id || dueWorks[nextIdx].id);
      }, POPUP_DURATION);
    } else {
      setVisible(false);
    }
  };

  if (!visible || dueWorks.length === 0) return null;

  const work = dueWorks[currentIdx];
  if (!work) return null;

  const today = new Date();
  const due = new Date(work.due_date);
  const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  const isOverdue = diffDays < 0;
  const isToday = diffDays === 0;

  return (
    <div className={`ddp-overlay ${visible ? 'show' : ''}`}>
      {/* Progress bar */}
      <div className="ddp-progress-track">
        <div className="ddp-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="ddp-popup">
        <div className="ddp-header">
          <div className="ddp-icon">
            <AlertTriangle size={20} />
          </div>
          <div className="ddp-header-text">
            <span className="ddp-title">
              {isOverdue ? '⚠️ Overdue Work' : isToday ? '⏰ Due Today' : '📅 Due Tomorrow'}
            </span>
            <span className="ddp-counter">
              {currentIdx + 1} of {dueWorks.length}
            </span>
          </div>
          <button className="ddp-close" onClick={close} title="Dismiss"><X size={16} /></button>
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
          {dueWorks.length > 1 && (
            <button className="ddp-btn-skip" onClick={skipToNext}>
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
