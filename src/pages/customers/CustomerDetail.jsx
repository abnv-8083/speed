import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit2, Trash2, Phone, Mail, MapPin,
  Calendar, Receipt, FileText, KeyRound, UploadCloud,
  Download, Eye, EyeOff, Copy, Check, Plus, ExternalLink,
  Loader2, AlertCircle, File, Image as ImageIcon, CheckCircle2
} from 'lucide-react';
import { api } from '../../api';
import { useToast } from '../../components/ToastContext';
import { useModal } from '../../components/ModalContext';
import AppModal from '../../components/AppModal';
import PremiumLoader from '../../components/PremiumLoader';
import InvoiceTemplate from '../../components/InvoiceTemplate';
import './CustomerDetail.css';

export default function CustomerDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const toast     = useToast();
  const modal     = useModal();

  const [customer, setCustomer]   = useState(null);
  const [invoices, setInvoices]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('billed'); // 'billed' | 'documents' | 'passwords'

  // Invoice Preview Modal / Full View
  const [previewInvoice, setPreviewInvoice] = useState(null);

  // ── Customer Profile Edit Modal ──
  const [showEditCustModal, setShowEditCustModal] = useState(false);
  const [custName, setCustName]       = useState('');
  const [custPhone, setCustPhone]     = useState('');
  const [custEmail, setCustEmail]     = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custDob, setCustDob]         = useState('');
  const [savingCust, setSavingCust]   = useState(false);

  // ── Documents State ──
  const [isUploading, setIsUploading]   = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging]     = useState(false);
  const fileInputRef = useRef(null);

  // Edit Doc Modal
  const [editingDoc, setEditingDoc]   = useState(null);
  const [docNameInput, setDocNameInput] = useState('');
  const [savingDoc, setSavingDoc]     = useState(false);

  // ── Passwords / Vault State ──
  const [showPwdModal, setShowPwdModal]   = useState(false);
  const [editingPwd, setEditingPwd]       = useState(null);
  const [pwdTitle, setPwdTitle]           = useState('');
  const [pwdUsername, setPwdUsername]     = useState('');
  const [pwdPassword, setPwdPassword]     = useState('');
  const [pwdUrl, setPwdUrl]               = useState('');
  const [pwdNotes, setPwdNotes]           = useState('');
  const [savingPwd, setSavingPwd]         = useState(false);
  const [revealedPwds, setRevealedPwds]   = useState(new Set());
  const [copiedKey, setCopiedKey]         = useState(null); // 'user-id' | 'pwd-id'

  useEffect(() => {
    fetchCustomerData();
  }, [id]);

  const fetchCustomerData = async () => {
    setLoading(true);
    try {
      const [custData, invData] = await Promise.all([
        api.getCustomer(id),
        api.getCustomerInvoices(id),
      ]);
      setCustomer(custData);
      setInvoices(invData || []);
    } catch (err) {
      toast.error('Failed to load customer: ' + err.message);
      navigate('/customers');
    }
    setLoading(false);
  };

  // ── Customer Profile Handlers ──
  const openEditCustomerModal = () => {
    setCustName(customer.name || '');
    setCustPhone(customer.phone || '');
    setCustEmail(customer.email || '');
    setCustAddress(customer.address || '');
    setCustDob(customer.dob || '');
    setShowEditCustModal(true);
  };

  const handleSaveCustomerProfile = async (e) => {
    e.preventDefault();
    if (!custName.trim() || !custPhone.trim()) {
      toast.error('Name and Phone number are mandatory');
      return;
    }
    setSavingCust(true);
    try {
      const updated = await api.updateCustomer(id, {
        name:    custName.trim(),
        phone:   custPhone.trim(),
        email:   custEmail.trim(),
        address: custAddress.trim(),
        dob:     custDob.trim(),
      });
      setCustomer(prev => ({ ...prev, ...updated }));
      setShowEditCustModal(false);
      toast.success('Customer details updated');
    } catch (err) {
      toast.error('Error updating customer: ' + err.message);
    }
    setSavingCust(false);
  };

  const handleDeleteCustomer = async () => {
    const confirmed = await modal.confirm(
      'Delete Customer',
      `Are you sure you want to delete ${customer.name}? All documents and credentials will be removed.`
    );
    if (!confirmed) return;

    try {
      await api.deleteCustomer(id);
      toast.success('Customer deleted');
      navigate('/customers');
    } catch (err) {
      toast.error('Failed to delete customer: ' + err.message);
    }
  };

  // ── Document Upload & Management Handlers ──
  const handleFileSelect = async (files) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    // Allowed MIME types
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.type)) {
      toast.error('Only PDF, JPG, JPEG, and PNG files are supported');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error('File size exceeds 20MB limit');
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        setUploadProgress(60);
        const dataUrl = reader.result;
        const newDoc = await api.addCustomerDocument(id, {
          name:      file.name,
          file_type: file.type,
          file_size: file.size,
          data:      dataUrl,
        });
        setUploadProgress(100);
        setCustomer(prev => ({
          ...prev,
          documents: [newDoc, ...(prev.documents || [])],
        }));
        toast.success(`Document "${file.name}" uploaded successfully`);
      } catch (err) {
        toast.error('Upload failed: ' + err.message);
      } finally {
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
        }, 500);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadDoc = async (doc) => {
    try {
      const url = doc.file_url || doc.data;
      if (!url) {
        toast.error('Document URL not found');
        return;
      }

      toast.info('Downloading document...');
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = doc.name || 'document';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      toast.error('Download failed: ' + err.message);
    }
  };

  const handleSaveDocName = async (e) => {
    e.preventDefault();
    if (!docNameInput.trim() || !editingDoc) return;
    setSavingDoc(true);
    try {
      const updated = await api.updateCustomerDocument(id, editingDoc.id || editingDoc._id, {
        name: docNameInput.trim(),
      });
      setCustomer(prev => ({
        ...prev,
        documents: prev.documents.map(d => (d.id === editingDoc.id || d._id === editingDoc._id) ? { ...d, name: docNameInput.trim() } : d),
      }));
      setEditingDoc(null);
      toast.success('Document renamed');
    } catch (err) {
      toast.error('Failed to rename document: ' + err.message);
    }
    setSavingDoc(false);
  };

  const handleDeleteDoc = async (doc) => {
    const docId = doc.id || doc._id;
    const confirmed = await modal.confirm('Delete Document', `Are you sure you want to delete "${doc.name}"?`);
    if (!confirmed) return;

    try {
      await api.deleteCustomerDocument(id, docId);
      setCustomer(prev => ({
        ...prev,
        documents: prev.documents.filter(d => (d.id !== docId && d._id !== docId)),
      }));
      toast.success('Document deleted');
    } catch (err) {
      toast.error('Failed to delete document: ' + err.message);
    }
  };

  // ── Passwords / Vault Handlers ──
  const openAddPwdModal = () => {
    setEditingPwd(null);
    setPwdTitle('');
    setPwdUsername('');
    setPwdPassword('');
    setPwdUrl('');
    setPwdNotes('');
    setShowPwdModal(true);
  };

  const openEditPwdModal = (pwd) => {
    setEditingPwd(pwd);
    setPwdTitle(pwd.title || '');
    setPwdUsername(pwd.username || '');
    setPwdPassword(pwd.password || '');
    setPwdUrl(pwd.url || '');
    setPwdNotes(pwd.notes || '');
    setShowPwdModal(true);
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!pwdTitle.trim()) {
      toast.error('Service / Account title is required');
      return;
    }
    setSavingPwd(true);
    try {
      const payload = {
        title:    pwdTitle.trim(),
        username: pwdUsername.trim(),
        password: pwdPassword,
        url:      pwdUrl.trim(),
        notes:    pwdNotes.trim(),
      };

      if (editingPwd) {
        const pwdId = editingPwd.id || editingPwd._id;
        const updated = await api.updateCustomerPassword(id, pwdId, payload);
        setCustomer(prev => ({
          ...prev,
          passwords: prev.passwords.map(p => (p.id === pwdId || p._id === pwdId) ? updated : p),
        }));
        toast.success('Credentials updated');
      } else {
        const created = await api.addCustomerPassword(id, payload);
        setCustomer(prev => ({
          ...prev,
          passwords: [created, ...(prev.passwords || [])],
        }));
        toast.success('Credentials added');
      }
      setShowPwdModal(false);
    } catch (err) {
      toast.error('Failed to save credentials: ' + err.message);
    }
    setSavingPwd(false);
  };

  const handleDeletePassword = async (pwd) => {
    const pwdId = pwd.id || pwd._id;
    const confirmed = await modal.confirm('Delete Credentials', `Are you sure you want to delete credentials for "${pwd.title}"?`);
    if (!confirmed) return;

    try {
      await api.deleteCustomerPassword(id, pwdId);
      setCustomer(prev => ({
        ...prev,
        passwords: prev.passwords.filter(p => (p.id !== pwdId && p._id !== pwdId)),
      }));
      toast.success('Credentials deleted');
    } catch (err) {
      toast.error('Failed to delete credentials: ' + err.message);
    }
  };

  const toggleRevealPwd = (pwdId) => {
    setRevealedPwds(prev => {
      const next = new Set(prev);
      if (next.has(pwdId)) next.delete(pwdId);
      else next.add(pwdId);
      return next;
    });
  };

  const copyToClipboard = (text, keyName, label) => {
    if (!text) {
      toast.info(`No ${label} to copy`);
      return;
    }
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    toast.success(`${label} copied to clipboard!`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getInitials = (name) => {
    if (!name) return 'C';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div style={{ padding: '4rem 0' }}>
        <PremiumLoader text="Loading Customer Hub..." />
      </div>
    );
  }

  if (!customer) return null;

  // Render Full Invoice Preview if requested
  if (previewInvoice) {
    return (
      <InvoiceTemplate
        invoice={previewInvoice}
        onBack={() => setPreviewInvoice(null)}
        backLabel="Back to Customer Hub"
      />
    );
  }

  // Calculate Invoices Summary
  const totalBilled = invoices.reduce((acc, inv) => acc + (Number(inv.total_amount) || 0), 0);

  return (
    <div className="cd-root animate-fade-in">
      {/* ── Top Profile Header ── */}
      <div className="cd-header">
        <div className="cd-header-left">
          <div className="cd-avatar-large">
            {getInitials(customer.name)}
          </div>
          <div className="cd-profile-info">
            <h1>{customer.name}</h1>
            <div className="cd-profile-meta">
              <span className="cd-meta-item phone">
                <Phone size={14} /> {customer.phone}
              </span>
              {customer.email ? (
                <span className="cd-meta-item">
                  <Mail size={14} /> {customer.email}
                </span>
              ) : null}
              {customer.address ? (
                <span className="cd-meta-item">
                  <MapPin size={14} /> {customer.address}
                </span>
              ) : null}
              {customer.dob ? (
                <span className="cd-meta-item">
                  <Calendar size={14} /> DOB: {customer.dob}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="cd-header-actions">
          <button className="cd-back-btn" onClick={() => navigate('/customers')}>
            <ArrowLeft size={16} /> All Customers
          </button>
          <button className="btn btn-secondary" onClick={openEditCustomerModal}>
            <Edit2 size={15} /> Edit
          </button>
          <button className="btn btn-danger" onClick={handleDeleteCustomer}>
            <Trash2 size={15} /> Delete
          </button>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="cd-tabs-bar">
        <button
          className={`cd-tab-btn ${activeTab === 'billed' ? 'cd-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('billed')}
        >
          <Receipt size={18} />
          <span>Billed</span>
          <span className="cd-tab-count">{invoices.length}</span>
        </button>

        <button
          className={`cd-tab-btn ${activeTab === 'documents' ? 'cd-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('documents')}
        >
          <FileText size={18} />
          <span>Documents</span>
          <span className="cd-tab-count">{customer.documents?.length || 0}</span>
        </button>

        <button
          className={`cd-tab-btn ${activeTab === 'passwords' ? 'cd-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('passwords')}
        >
          <KeyRound size={18} />
          <span>Password Manager</span>
          <span className="cd-tab-count">{customer.passwords?.length || 0}</span>
        </button>
      </div>

      {/* ── TAB 1: BILLED INVOICES ── */}
      {activeTab === 'billed' && (
        <div className="cd-section-card animate-fade-in">
          <div className="cd-section-header">
            <div>
              <h3><Receipt size={20} style={{ color: '#38bdf8' }} /> Generated Invoices</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                All billed sales and invoice transactions recorded for {customer.name}.
              </p>
            </div>
          </div>

          <div className="cd-invoices-summary">
            <div className="cd-inv-stat">
              <span className="cd-inv-stat-label">Total Invoices</span>
              <span className="cd-inv-stat-value">{invoices.length}</span>
            </div>
            <div className="cd-inv-stat">
              <span className="cd-inv-stat-label">Total Amount Billed</span>
              <span className="cd-inv-stat-value" style={{ color: '#34d399' }}>
                ₹{totalBilled.toFixed(2)}
              </span>
            </div>
          </div>

          {invoices.length === 0 ? (
            <div className="cd-empty-tab">
              <Receipt size={40} style={{ opacity: 0.4 }} />
              <p>No invoices generated for this customer yet.</p>
              <button className="btn btn-primary" onClick={() => navigate('/billing/quickbill')}>
                Create Quick Bill
              </button>
            </div>
          ) : (
            <div className="cd-invoices-table-wrap">
              <table className="cd-invoices-table">
                <thead>
                  <tr>
                    <th>Invoice ID</th>
                    <th>Date</th>
                    <th>Payment</th>
                    <th>Discount</th>
                    <th>Total Amount</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id || inv._id}>
                      <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                        #{inv.id?.slice?.(-6) || inv._id?.slice?.(-6) || 'INV'}
                      </td>
                      <td>
                        {inv.created_at ? new Date(inv.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        }) : '—'}
                      </td>
                      <td>
                        <span className={`status-badge ${inv.payment_method === 'UPI' ? 'status-good' : 'status-warning'}`}>
                          {inv.payment_method || 'Cash'}
                        </span>
                      </td>
                      <td>₹{Number(inv.discount || 0).toFixed(2)}</td>
                      <td style={{ fontWeight: 700, color: '#34d399' }}>
                        ₹{Number(inv.total_amount).toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                          onClick={() => setPreviewInvoice(inv)}
                        >
                          View Invoice
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: DOCUMENTS ── */}
      {activeTab === 'documents' && (
        <div className="cd-section-card animate-fade-in">
          <div className="cd-section-header">
            <div>
              <h3><FileText size={20} style={{ color: '#f87171' }} /> Customer Documents</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Upload and store customer identity cards, certificates, and records (PDF, JPG, JPEG, PNG).
              </p>
            </div>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div
            className={`cd-upload-dropzone ${isDragging ? 'dragging' : ''}`}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => {
              e.preventDefault();
              setIsDragging(false);
              handleFileSelect(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".pdf, .jpg, .jpeg, .png, image/jpeg, image/png, application/pdf"
              onChange={e => handleFileSelect(e.target.files)}
            />
            <div className="cd-dropzone-icon">
              {isUploading ? <Loader2 size={26} className="animate-spin" /> : <UploadCloud size={26} />}
            </div>
            <div>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                {isUploading ? 'Uploading Document to Cloud...' : 'Click or Drag & Drop Document to Upload'}
              </p>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Supports PDF, JPG, JPEG, and PNG (Max 20MB)
              </span>
            </div>

            {isUploading && (
              <div className="cd-uploading-bar-wrap">
                <div className="cd-uploading-bar" />
              </div>
            )}
          </div>

          {/* Document List */}
          {(customer.documents || []).length === 0 ? (
            <div className="cd-empty-tab">
              <FileText size={38} style={{ opacity: 0.4 }} />
              <p>No documents uploaded for this customer yet.</p>
            </div>
          ) : (
            <div className="cd-docs-grid">
              {customer.documents.map(doc => {
                const isPdf = doc.file_type?.includes('pdf') || doc.name?.toLowerCase().endsWith('.pdf');
                const docId = doc.id || doc._id;
                return (
                  <div key={docId} className="cd-doc-card">
                    <div className={`cd-doc-icon-wrap ${isPdf ? 'pdf' : 'img'}`}>
                      {isPdf ? <File size={22} /> : <ImageIcon size={22} />}
                    </div>

                    <div className="cd-doc-info">
                      <div className="cd-doc-name" title={doc.name}>
                        {doc.name}
                      </div>
                      <div className="cd-doc-meta">
                        {formatFileSize(doc.file_size)} • {doc.uploaded_at || doc.createdAt ? new Date(doc.uploaded_at || doc.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Uploaded'}
                      </div>
                    </div>

                    <div className="cd-doc-actions">
                      <button
                        className="cust-icon-btn"
                        title="Download Document"
                        onClick={() => handleDownloadDoc(doc)}
                      >
                        <Download size={15} />
                      </button>
                      <button
                        className="cust-icon-btn"
                        title="Rename"
                        onClick={() => {
                          setEditingDoc(doc);
                          setDocNameInput(doc.name);
                        }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="cust-icon-btn danger"
                        title="Delete Document"
                        onClick={() => handleDeleteDoc(doc)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: PASSWORD MANAGER ── */}
      {activeTab === 'passwords' && (
        <div className="cd-section-card animate-fade-in">
          <div className="cd-section-header">
            <div>
              <h3><KeyRound size={20} style={{ color: '#c084fc' }} /> Customer Credentials Vault</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Securely store and manage login IDs and passwords for {customer.name}.
              </p>
            </div>
            <button className="btn btn-primary" onClick={openAddPwdModal}>
              <Plus size={16} /> Add Credentials
            </button>
          </div>

          {(customer.passwords || []).length === 0 ? (
            <div className="cd-empty-tab">
              <KeyRound size={38} style={{ opacity: 0.4 }} />
              <p>No credentials stored for this customer yet.</p>
              <button className="btn btn-primary" onClick={openAddPwdModal}>
                <Plus size={16} /> Add First Credentials
              </button>
            </div>
          ) : (
            <div className="cd-passwords-grid">
              {customer.passwords.map(pwd => {
                const pwdId = pwd.id || pwd._id;
                const isRevealed = revealedPwds.has(pwdId);
                const userKey = `user-${pwdId}`;
                const passKey = `pass-${pwdId}`;

                return (
                  <div key={pwdId} className="cd-pwd-card">
                    <div className="cd-pwd-header">
                      <div>
                        <h4 className="cd-pwd-title">{pwd.title}</h4>
                        {pwd.url ? (
                          <a
                            href={pwd.url.startsWith('http') ? pwd.url : `https://${pwd.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cd-pwd-url"
                          >
                            {pwd.url.replace(/^https?:\/\//, '')} <ExternalLink size={11} />
                          </a>
                        ) : null}
                      </div>

                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        <button
                          className="cust-icon-btn"
                          title="Edit Credentials"
                          onClick={() => openEditPwdModal(pwd)}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="cust-icon-btn danger"
                          title="Delete Credentials"
                          onClick={() => handleDeletePassword(pwd)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Username / ID row with Copy button */}
                    <div className="cd-pwd-field-row">
                      <span className="cd-pwd-field-label">User ID</span>
                      <span className="cd-pwd-field-value" title={pwd.username}>
                        {pwd.username || '—'}
                      </span>
                      {pwd.username && (
                        <button
                          className={`cd-copy-btn ${copiedKey === userKey ? 'copied' : ''}`}
                          onClick={() => copyToClipboard(pwd.username, userKey, 'Username / ID')}
                        >
                          {copiedKey === userKey ? <Check size={12} /> : <Copy size={12} />}
                          {copiedKey === userKey ? 'Copied' : 'Copy ID'}
                        </button>
                      )}
                    </div>

                    {/* Password row with Reveal + Copy button */}
                    <div className="cd-pwd-field-row">
                      <span className="cd-pwd-field-label">Password</span>
                      <span className="cd-pwd-field-value">
                        {pwd.password
                          ? (isRevealed ? pwd.password : '••••••••••••')
                          : '—'}
                      </span>

                      {pwd.password && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <button
                            type="button"
                            className="cust-icon-btn"
                            title={isRevealed ? 'Hide Password' : 'Show Password'}
                            onClick={() => toggleRevealPwd(pwdId)}
                          >
                            {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <button
                            className={`cd-copy-btn ${copiedKey === passKey ? 'copied' : ''}`}
                            onClick={() => copyToClipboard(pwd.password, passKey, 'Password')}
                          >
                            {copiedKey === passKey ? <Check size={12} /> : <Copy size={12} />}
                            {copiedKey === passKey ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Notes if present */}
                    {pwd.notes ? (
                      <div className="cd-pwd-notes">
                        {pwd.notes}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Edit Customer Profile Modal ── */}
      {showEditCustModal && (
        <AppModal
          title="Edit Customer Details"
          onClose={() => !savingCust && setShowEditCustModal(false)}
          width="480px"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowEditCustModal(false)} disabled={savingCust}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveCustomerProfile} disabled={savingCust}>
                {savingCust ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          }
        >
          <form onSubmit={handleSaveCustomerProfile} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div className="form-group">
              <label>Customer Name <span className="cust-req">*</span></label>
              <input
                type="text"
                className="input-field"
                value={custName}
                onChange={e => setCustName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Phone Number <span className="cust-req">*</span></label>
              <input
                type="tel"
                className="input-field"
                value={custPhone}
                onChange={e => setCustPhone(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                className="input-field"
                value={custEmail}
                onChange={e => setCustEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Address</label>
              <textarea
                className="input-field"
                value={custAddress}
                onChange={e => setCustAddress(e.target.value)}
                rows={2}
              />
            </div>
            <div className="form-group">
              <label>Date of Birth (DOB)</label>
              <input
                type="date"
                className="input-field"
                value={custDob}
                onChange={e => setCustDob(e.target.value)}
              />
            </div>
          </form>
        </AppModal>
      )}

      {/* ── Rename Document Modal ── */}
      {editingDoc && (
        <AppModal
          title="Rename Document"
          onClose={() => !savingDoc && setEditingDoc(null)}
          width="420px"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setEditingDoc(null)} disabled={savingDoc}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveDocName} disabled={savingDoc}>
                {savingDoc ? 'Saving...' : 'Rename'}
              </button>
            </>
          }
        >
          <form onSubmit={handleSaveDocName}>
            <div className="form-group">
              <label>Document Name</label>
              <input
                type="text"
                className="input-field"
                value={docNameInput}
                onChange={e => setDocNameInput(e.target.value)}
                required
                autoFocus
              />
            </div>
          </form>
        </AppModal>
      )}

      {/* ── Add / Edit Credentials Modal ── */}
      {showPwdModal && (
        <AppModal
          title={editingPwd ? 'Edit Credentials' : 'Add New Credentials'}
          onClose={() => !savingPwd && setShowPwdModal(false)}
          width="460px"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowPwdModal(false)} disabled={savingPwd}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSavePassword} disabled={savingPwd}>
                {savingPwd ? 'Saving...' : editingPwd ? 'Save Changes' : 'Save Credentials'}
              </button>
            </>
          }
        >
          <form onSubmit={handleSavePassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div className="form-group">
              <label>Account / Service Name <span className="cust-req">*</span></label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Income Tax Portal, EPFO, Gmail"
                value={pwdTitle}
                onChange={e => setPwdTitle(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Login ID / Username</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. PAN number, email, username"
                value={pwdUsername}
                onChange={e => setPwdUsername(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="text"
                className="input-field"
                placeholder="Enter password"
                value={pwdPassword}
                onChange={e => setPwdPassword(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Website URL (Optional)</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. incometax.gov.in"
                value={pwdUrl}
                onChange={e => setPwdUrl(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Notes (Optional)</label>
              <textarea
                className="input-field"
                placeholder="Security questions, recovery email, etc."
                value={pwdNotes}
                onChange={e => setPwdNotes(e.target.value)}
                rows={2}
              />
            </div>
          </form>
        </AppModal>
      )}
    </div>
  );
}
