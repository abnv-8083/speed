import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import Portal from './Portal';
import './AppModal.css';

/**
 * Shared modal shell used by all modals in the app.
 *
 * Props:
 *  title       — string: modal heading
 *  onClose     — function: called when backdrop or X is clicked
 *  children    — modal body content
 *  footer      — optional: JSX for the footer action buttons
 *  width       — optional: max-width CSS string (default '480px')
 *  noPadding   — optional: remove body padding (for tables/lists)
 */
export default function AppModal({ title, onClose, children, footer, width = '480px', noPadding = false }) {

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <Portal>
      <div className="app-modal-overlay animate-fade-in" onClick={onClose}>
        <div
          className="app-modal glass-panel"
          style={{ maxWidth: width }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="app-modal-header">
            <h3 className="app-modal-title">{title}</h3>
            <button className="app-modal-close" onClick={onClose} aria-label="Close modal">
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className={`app-modal-body ${noPadding ? 'app-modal-body--no-pad' : ''}`}>
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="app-modal-footer">
              {footer}
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}
