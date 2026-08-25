import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, UserPlus, Search, Phone, Mail, MapPin,
  Calendar, Edit2, Trash2, ChevronRight, FileText, KeyRound,
  Shield, AlertCircle
} from 'lucide-react';
import { api } from '../../api';
import { useToast } from '../../components/ToastContext';
import { useModal } from '../../components/ModalContext';
import AppModal from '../../components/AppModal';
import PremiumLoader from '../../components/PremiumLoader';
import Pagination from '../../components/Pagination';
import './CustomerList.css';

export default function CustomerList() {
  const navigate = useNavigate();
  const toast    = useToast();
  const modal    = useModal();

  const [customers, setCustomers]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  // Create / Edit modal state
  const [showModal, setShowModal]       = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formName, setFormName]         = useState('');
  const [formPhone, setFormPhone]       = useState('');
  const [formEmail, setFormEmail]       = useState('');
  const [formAddress, setFormAddress]   = useState('');
  const [formDob, setFormDob]           = useState('');
  const [saving, setSaving]             = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const data = await api.getCustomers();
      setCustomers(data || []);
    } catch (err) {
      toast.error('Failed to load customers: ' + err.message);
    }
    setLoading(false);
  };

  const openCreateModal = () => {
    setEditingCustomer(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setFormDob('');
    setShowModal(true);
  };

  const openEditModal = (e, customer) => {
    e.stopPropagation();
    setEditingCustomer(customer);
    setFormName(customer.name || '');
    setFormPhone(customer.phone || '');
    setFormEmail(customer.email || '');
    setFormAddress(customer.address || '');
    setFormDob(customer.dob || '');
    setShowModal(true);
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) {
      toast.error('Name and Phone number are mandatory');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name:    formName.trim(),
        phone:   formPhone.trim(),
        email:   formEmail.trim(),
        address: formAddress.trim(),
        dob:     formDob.trim(),
      };

      if (editingCustomer) {
        const updated = await api.updateCustomer(editingCustomer.id, payload);
        setCustomers(prev => prev.map(c => c.id === editingCustomer.id ? updated : c));
        toast.success('Customer updated successfully');
      } else {
        const created = await api.createCustomer(payload);
        setCustomers(prev => [created, ...prev]);
        toast.success('Customer created successfully');
      }
      setShowModal(false);
    } catch (err) {
      toast.error('Error saving customer: ' + err.message);
    }
    setSaving(false);
  };

  const handleDeleteCustomer = async (e, customer) => {
    e.stopPropagation();
    const confirmed = await modal.confirm(
      'Delete Customer',
      `Are you sure you want to delete "${customer.name}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await api.deleteCustomer(customer.id);
      setCustomers(prev => prev.filter(c => c.id !== customer.id));
      toast.success('Customer deleted successfully');
    } catch (err) {
      toast.error('Failed to delete customer: ' + err.message);
    }
  };

  // Filtered and paginated customers
  const filteredCustomers = customers.filter(c => {
    const q = search.toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.address || '').toLowerCase().includes(q)
    );
  });

  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getInitials = (name) => {
    if (!name) return 'C';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="cust-container animate-fade-in">
      {/* ── Top Header ── */}
      <div className="cust-header">
        <div className="cust-header-titles">
          <h2>
            <Users size={24} style={{ color: 'var(--primary)' }} />
            Customer Management
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {customers.length} total customer{customers.length === 1 ? '' : 's'} registered
          </span>
        </div>

        <div className="cust-header-actions">
          <div className="cust-search-box">
            <Search size={16} className="cust-search-icon" />
            <input
              type="text"
              placeholder="Search by name, phone, email..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="cust-search-input"
            />
          </div>
          <button className="btn btn-primary" onClick={openCreateModal}>
            <UserPlus size={17} /> Add Customer
          </button>
        </div>
      </div>

      {/* ── Customer List Grid ── */}
      {loading ? (
        <div style={{ padding: '4rem 0' }}>
          <PremiumLoader text="Loading Customers..." />
        </div>
      ) : (
        <>
          <div className="cust-grid">
            {filteredCustomers.length === 0 ? (
              <div className="cust-empty">
                <div className="cust-empty-icon">
                  <Users size={32} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
                    {search ? 'No matching customers found' : 'No customers added yet'}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {search ? 'Try adjusting your search criteria' : 'Click "+ Add Customer" to register your first customer'}
                  </p>
                </div>
                {!search && (
                  <button className="btn btn-primary" onClick={openCreateModal}>
                    <UserPlus size={16} /> Add First Customer
                  </button>
                )}
              </div>
            ) : (
              paginatedCustomers.map(customer => (
                <div
                  key={customer.id}
                  className="cust-card"
                  onClick={() => navigate(`/billing/customers/${customer.id}`)}
                >
                  <div className="cust-card-top">
                    <div className="cust-avatar">
                      {getInitials(customer.name)}
                    </div>
                    <div className="cust-info-main">
                      <h3 className="cust-name" title={customer.name}>
                        {customer.name}
                      </h3>
                      <div className="cust-phone">
                        <Phone size={13} /> {customer.phone}
                      </div>
                    </div>
                    <div className="cust-card-actions" onClick={e => e.stopPropagation()}>
                      <button
                        className="cust-icon-btn"
                        title="Edit Customer"
                        onClick={e => openEditModal(e, customer)}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="cust-icon-btn danger"
                        title="Delete Customer"
                        onClick={e => handleDeleteCustomer(e, customer)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="cust-details-list">
                    {customer.email ? (
                      <div className="cust-detail-row" title={customer.email}>
                        <Mail size={13} /> {customer.email}
                      </div>
                    ) : null}
                    {customer.address ? (
                      <div className="cust-detail-row" title={customer.address}>
                        <MapPin size={13} /> {customer.address}
                      </div>
                    ) : null}
                    {customer.dob ? (
                      <div className="cust-detail-row">
                        <Calendar size={13} /> DOB: {customer.dob}
                      </div>
                    ) : null}
                  </div>

                  <div className="cust-card-badges">
                    <span className="cust-badge cust-badge--docs" title="Uploaded documents">
                      <FileText size={12} /> {customer.documents?.length || 0} Docs
                    </span>
                    <span className="cust-badge cust-badge--pwds" title="Saved credentials">
                      <KeyRound size={12} /> {customer.passwords?.length || 0} Passwords
                    </span>
                    <ChevronRight size={16} className="cust-arrow-indicator" />
                  </div>
                </div>
              ))
            )}
          </div>

          <Pagination
            currentPage={currentPage}
            totalItems={filteredCustomers.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {/* ── Add / Edit Customer Modal ── */}
      {showModal && (
        <AppModal
          title={editingCustomer ? 'Edit Customer' : 'Add New Customer'}
          onClose={() => !saving && setShowModal(false)}
          width="480px"
          footer={
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowModal(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveCustomer}
                disabled={saving}
              >
                {saving ? 'Saving...' : editingCustomer ? 'Save Changes' : 'Create Customer'}
              </button>
            </>
          }
        >
          <form onSubmit={handleSaveCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div className="form-group">
              <label>Customer Name <span className="cust-req">*</span></label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. John Doe"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                required
                autoFocus
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label>Phone Number <span className="cust-req">*</span></label>
              <input
                type="tel"
                className="input-field"
                placeholder="e.g. +91 9876543210"
                value={formPhone}
                onChange={e => setFormPhone(e.target.value)}
                required
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label>Email Address <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(Optional)</span></label>
              <input
                type="email"
                className="input-field"
                placeholder="e.g. john@example.com"
                value={formEmail}
                onChange={e => setFormEmail(e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label>Address <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(Optional)</span></label>
              <textarea
                className="input-field"
                placeholder="e.g. 123 Main Street, City"
                value={formAddress}
                onChange={e => setFormAddress(e.target.value)}
                rows={2}
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label>Date of Birth (DOB) <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(Optional)</span></label>
              <input
                type="date"
                className="input-field"
                value={formDob}
                onChange={e => setFormDob(e.target.value)}
                disabled={saving}
              />
            </div>
          </form>
        </AppModal>
      )}
    </div>
  );
}
