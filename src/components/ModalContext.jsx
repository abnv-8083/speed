import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { AlertCircle, HelpCircle, X, Check } from 'lucide-react';
import './Modal.css';

const ModalContext = createContext(null);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

export const ModalProvider = ({ children }) => {
  const [modalState, setModalState] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (modalState?.type === 'prompt' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [modalState]);

  const confirm = (title, message) => {
    return new Promise((resolve) => {
      setModalState({
        type: 'confirm',
        title,
        message,
        resolve,
      });
    });
  };

  const prompt = (title, message, defaultValue = '', inputType = 'text') => {
    return new Promise((resolve) => {
      setModalState({
        type: 'prompt',
        title,
        message,
        value: defaultValue,
        inputType,
        resolve,
      });
    });
  };

  const handleClose = (result) => {
    if (modalState?.resolve) {
      modalState.resolve(result);
    }
    setModalState(null);
  };

  return (
    <ModalContext.Provider value={{ confirm, prompt }}>
      {children}
      {modalState && (
        <div className="custom-modal-overlay animate-fade-in" onClick={() => handleClose(modalState.type === 'prompt' ? null : false)}>
          <div className="custom-modal-content glass-panel" onClick={e => e.stopPropagation()}>
            <div className="custom-modal-header">
              <div className="custom-modal-title">
                {modalState.type === 'confirm' ? (
                  <HelpCircle size={20} className="text-warning" />
                ) : (
                  <AlertCircle size={20} className="text-primary" />
                )}
                <h3>{modalState.title}</h3>
              </div>
              <button className="btn-icon" onClick={() => handleClose(modalState.type === 'prompt' ? null : false)}>
                <X size={18} />
              </button>
            </div>
            
            <div className="custom-modal-body">
              {modalState.message && <p>{modalState.message}</p>}
              
              {modalState.type === 'prompt' && (
                <input
                  ref={inputRef}
                  type={modalState.inputType}
                  className="input-field"
                  style={{ width: '100%', marginTop: '1rem' }}
                  value={modalState.value}
                  onChange={e => setModalState({ ...modalState, value: e.target.value })}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleClose(modalState.value);
                    if (e.key === 'Escape') handleClose(null);
                  }}
                />
              )}
            </div>
            
            <div className="custom-modal-footer">
              <button className="btn btn-secondary" onClick={() => handleClose(modalState.type === 'prompt' ? null : false)}>
                Cancel
              </button>
              <button 
                className={`btn ${modalState.type === 'confirm' ? 'btn-danger' : 'btn-primary'}`} 
                onClick={() => handleClose(modalState.type === 'prompt' ? modalState.value : true)}
              >
                {modalState.type === 'confirm' ? 'Confirm' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};
