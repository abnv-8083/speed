import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import {
  Globe, Save, Loader2, Upload, Plus, Trash2, X, Image,
  Phone, Mail, MapPin, MessageCircle, Eye, ExternalLink
} from 'lucide-react';
import './WebsiteSettings.css';

const Spinner = ({ size = 14 }) => <Loader2 size={size} className="spin" />;

export default function WebsiteSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('hero');
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getWebsiteSettings();
        setSettings(data);
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const updateField = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (field, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateField(field, reader.result);
    reader.readAsDataURL(file);
  };

  const addGalleryImage = () => {
    const images = [...(settings.gallery_images || []), { url: '', alt: '', caption: '' }];
    updateField('gallery_images', images);
  };

  const updateGalleryImage = (idx, field, value) => {
    const images = [...(settings.gallery_images || [])];
    images[idx] = { ...images[idx], [field]: value };
    updateField('gallery_images', images);
  };

  const handleGalleryUpload = (idx, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateGalleryImage(idx, 'url', reader.result);
    reader.readAsDataURL(file);
  };

  const removeGalleryImage = (idx) => {
    const images = (settings.gallery_images || []).filter((_, i) => i !== idx);
    updateField('gallery_images', images);
  };

  const save = async () => {
    try {
      setSaving(true);
      await api.updateWebsiteSettings(settings);
      alert('Website settings saved successfully!');
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="ws-loading">
        <Spinner size={24} /> Loading website settings...
      </div>
    );
  }

  if (!settings) return <div className="ws-loading">Failed to load settings</div>;

  const tabs = [
    { key: 'hero', label: 'Hero', icon: '🎯' },
    { key: 'about', label: 'About', icon: '📝' },
    { key: 'services', label: 'Services', icon: '⚡' },
    { key: 'gallery', label: 'Gallery', icon: '🖼️' },
    { key: 'contact', label: 'Contact', icon: '📞' },
    { key: 'whatsapp', label: 'WhatsApp', icon: '💬' },
    { key: 'seo', label: 'SEO', icon: '🔍' },
    { key: 'brand', label: 'Brand', icon: '🎨' },
  ];

  return (
    <div className="ws-root">
      <div className="ws-header">
        <div className="ws-header-left">
          <Globe size={20} />
          <h1>Website Settings</h1>
        </div>
        <div className="ws-header-right">
          <a href="/" target="_blank" className="ws-btn-preview" rel="noopener noreferrer">
            <ExternalLink size={14} /> View Website
          </a>
          <button className="ws-btn-save" onClick={save} disabled={saving}>
            {saving ? <Spinner /> : <Save size={14} />} Save Changes
          </button>
        </div>
      </div>

      <div className="ws-tabs">
        {tabs.map(tab => (
          <button key={tab.key} className={`ws-tab ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      <div className="ws-content">
        {/* ═══════ HERO TAB ═══════════════════════════════ */}
        {activeTab === 'hero' && (
          <div className="ws-section">
            <h3>Hero Section</h3>
            <div className="ws-field"><label>Business Name</label><input value={settings.hero_title || ''} onChange={e => updateField('hero_title', e.target.value)} /></div>
            <div className="ws-field"><label>Tagline</label><input value={settings.hero_tagline || ''} onChange={e => updateField('hero_tagline', e.target.value)} /></div>
            <div className="ws-field"><label>Subtitle</label><textarea rows={3} value={settings.hero_subtitle || ''} onChange={e => updateField('hero_subtitle', e.target.value)} /></div>
            <div className="ws-field"><label>CTA Button Text</label><input value={settings.hero_cta_text || ''} onChange={e => updateField('hero_cta_text', e.target.value)} /></div>
            <div className="ws-field"><label>Hero Background Image</label>
              <div className="ws-image-upload">
                {settings.hero_image && <img src={settings.hero_image} alt="Hero" className="ws-image-preview" />}
                <label className="ws-upload-btn"><Upload size={14} /> Upload Image<input type="file" accept="image/*" onChange={e => handleImageUpload('hero_image', e)} hidden /></label>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ ABOUT TAB ══════════════════════════════ */}
        {activeTab === 'about' && (
          <div className="ws-section">
            <h3>About Section</h3>
            <div className="ws-field"><label>Title</label><input value={settings.about_title || ''} onChange={e => updateField('about_title', e.target.value)} /></div>
            <div className="ws-field"><label>Description</label><textarea rows={4} value={settings.about_text || ''} onChange={e => updateField('about_text', e.target.value)} /></div>
            <div className="ws-field"><label>Mission</label><textarea rows={2} value={settings.about_mission || ''} onChange={e => updateField('about_mission', e.target.value)} /></div>
            <div className="ws-field"><label>Vision</label><textarea rows={2} value={settings.about_vision || ''} onChange={e => updateField('about_vision', e.target.value)} /></div>
            <div className="ws-field"><label>About Image</label>
              <div className="ws-image-upload">
                {settings.about_image && <img src={settings.about_image} alt="About" className="ws-image-preview" />}
                <label className="ws-upload-btn"><Upload size={14} /> Upload<input type="file" accept="image/*" onChange={e => handleImageUpload('about_image', e)} hidden /></label>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ SERVICES TAB ═══════════════════════════ */}
        {activeTab === 'services' && (
          <div className="ws-section">
            <h3>Services Section</h3>
            <p className="ws-hint">Products with "Show on Website" enabled in Inventory will appear here automatically.</p>
            <div className="ws-field"><label>Section Title</label><input value={settings.services_title || ''} onChange={e => updateField('services_title', e.target.value)} /></div>
            <div className="ws-field"><label>Section Subtitle</label><input value={settings.services_subtitle || ''} onChange={e => updateField('services_subtitle', e.target.value)} /></div>
            <div className="ws-field"><label className="ws-checkbox-label"><input type="checkbox" checked={settings.show_services !== false} onChange={e => updateField('show_services', e.target.checked)} /> Show Services Section</label></div>
          </div>
        )}

        {/* ═══════ GALLERY TAB ════════════════════════════ */}
        {activeTab === 'gallery' && (
          <div className="ws-section">
            <h3>Gallery Section</h3>
            <div className="ws-field"><label>Section Title</label><input value={settings.gallery_title || ''} onChange={e => updateField('gallery_title', e.target.value)} /></div>
            <div className="ws-field"><label>Section Subtitle</label><input value={settings.gallery_subtitle || ''} onChange={e => updateField('gallery_subtitle', e.target.value)} /></div>
            <div className="ws-gallery-grid">
              {(settings.gallery_images || []).map((img, idx) => (
                <div key={idx} className="ws-gallery-item">
                  <div className="ws-gallery-thumb">
                    {img.url ? <img src={img.url} alt={img.alt} /> : <Image size={24} />}
                    <button className="ws-gallery-remove" onClick={() => removeGalleryImage(idx)}><X size={14} /></button>
                  </div>
                  <input placeholder="Caption" value={img.caption || ''} onChange={e => updateGalleryImage(idx, 'caption', e.target.value)} />
                  <label className="ws-upload-btn small"><Upload size={12} /> Image<input type="file" accept="image/*" onChange={e => handleGalleryUpload(idx, e)} hidden /></label>
                </div>
              ))}
              <button className="ws-gallery-add" onClick={addGalleryImage}><Plus size={20} /> Add Image</button>
            </div>
          </div>
        )}

        {/* ═══════ CONTACT TAB ════════════════════════════ */}
        {activeTab === 'contact' && (
          <div className="ws-section">
            <h3>Contact Section</h3>
            <div className="ws-field"><label>Section Title</label><input value={settings.contact_title || ''} onChange={e => updateField('contact_title', e.target.value)} /></div>
            <div className="ws-field"><label>Phone</label><input value={settings.phone || ''} onChange={e => updateField('phone', e.target.value)} placeholder="+91 98765 43210" /></div>
            <div className="ws-field"><label>Email</label><input value={settings.email || ''} onChange={e => updateField('email', e.target.value)} placeholder="info@speednet.com" /></div>
            <div className="ws-field"><label>Address</label><textarea rows={2} value={settings.address || ''} onChange={e => updateField('address', e.target.value)} /></div>
            <div className="ws-field"><label>Working Hours</label><input value={settings.working_hours || ''} onChange={e => updateField('working_hours', e.target.value)} /></div>
            <div className="ws-field"><label>Google Maps Embed URL</label><input value={settings.map_embed_url || ''} onChange={e => updateField('map_embed_url', e.target.value)} placeholder="https://www.google.com/maps/embed?pb=..." /></div>
            <div className="ws-field"><label>Social Media — Facebook URL</label><input value={settings.facebook || ''} onChange={e => updateField('facebook', e.target.value)} /></div>
            <div className="ws-field"><label>Social Media — Instagram URL</label><input value={settings.instagram || ''} onChange={e => updateField('instagram', e.target.value)} /></div>
            <div className="ws-field"><label>Social Media — YouTube URL</label><input value={settings.youtube || ''} onChange={e => updateField('youtube', e.target.value)} /></div>
          </div>
        )}

        {/* ═══════ WHATSAPP TAB ═══════════════════════════ */}
        {activeTab === 'whatsapp' && (
          <div className="ws-section">
            <h3><MessageCircle size={18} /> WhatsApp Integration</h3>
            <p className="ws-hint">Adds a floating WhatsApp button on the public website.</p>
            <div className="ws-field"><label>WhatsApp Number</label><input value={settings.whatsapp_number || ''} onChange={e => updateField('whatsapp_number', e.target.value)} placeholder="919876543210 (with country code, no + or spaces)" /></div>
            <div className="ws-field"><label>Default Message</label><textarea rows={2} value={settings.whatsapp_message || ''} onChange={e => updateField('whatsapp_message', e.target.value)} placeholder="Hi, I would like to know more about your services." /></div>
          </div>
        )}

        {/* ═══════ SEO TAB ════════════════════════════════ */}
        {activeTab === 'seo' && (
          <div className="ws-section">
            <h3>SEO Settings</h3>
            <div className="ws-field"><label>Meta Title</label><input value={settings.meta_title || ''} onChange={e => updateField('meta_title', e.target.value)} /></div>
            <div className="ws-field"><label>Meta Description</label><textarea rows={3} value={settings.meta_description || ''} onChange={e => updateField('meta_description', e.target.value)} /></div>
            <div className="ws-field"><label>Meta Keywords</label><input value={settings.meta_keywords || ''} onChange={e => updateField('meta_keywords', e.target.value)} placeholder="keyword1, keyword2, keyword3" /></div>
            <div className="ws-field"><label>OG Image (Social Share)</label>
              <div className="ws-image-upload">
                {settings.og_image && <img src={settings.og_image} alt="OG" className="ws-image-preview" />}
                <label className="ws-upload-btn"><Upload size={14} /> Upload<input type="file" accept="image/*" onChange={e => handleImageUpload('og_image', e)} hidden /></label>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ BRAND TAB ══════════════════════════════ */}
        {activeTab === 'brand' && (
          <div className="ws-section">
            <h3>Brand Identity</h3>
            <div className="ws-field"><label>Logo URL or Image</label>
              <div className="ws-image-upload">
                {settings.logo_url && <img src={settings.logo_url} alt="Logo" className="ws-image-preview" style={{ maxHeight: '60px' }} />}
                <label className="ws-upload-btn"><Upload size={14} /> Upload Logo<input type="file" accept="image/*" onChange={e => handleImageUpload('logo_url', e)} hidden /></label>
              </div>
            </div>
            <div className="ws-field"><label>Copyright Name</label><input value={settings.copyright_name || ''} onChange={e => updateField('copyright_name', e.target.value)} /></div>
            <div className="ws-field"><label>Footer Text</label><input value={settings.footer_text || ''} onChange={e => updateField('footer_text', e.target.value)} /></div>
          </div>
        )}
      </div>
    </div>
  );
}
