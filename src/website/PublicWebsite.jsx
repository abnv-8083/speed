import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import {
  Phone, Mail, MapPin, Clock, ChevronDown, Menu, X,
  Printer, Wifi, Monitor, Cpu, Settings, FileText,
  ArrowRight, ExternalLink, MessageCircle, Star,
  Loader2, ArrowUp, Eye
} from 'lucide-react';
import './PublicWebsite.css';

const SECTION_IDS = ['hero', 'services', 'about', 'gallery', 'contact'];

function PublicWebsite() {
  const [settings, setSettings] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [s, svc] = await Promise.all([
          api.getWebsiteSettings(),
          api.getWebsiteServices(),
        ]);
        setSettings(s);
        setServices(svc);
        // Set SEO meta
        document.title = s.meta_title || 'Speed@Net';
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.setAttribute('content', s.meta_description || '');
        else {
          const m = document.createElement('meta');
          m.name = 'description';
          m.content = s.meta_description || '';
          document.head.appendChild(m);
        }
        const metaKw = document.querySelector('meta[name="keywords"]');
        if (metaKw) metaKw.setAttribute('content', s.meta_keywords || '');
        else {
          const m = document.createElement('meta');
          m.name = 'keywords';
          m.content = s.meta_keywords || '';
          document.head.appendChild(m);
        }
      } catch (err) {
        console.error('Failed to load website:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Scroll tracking
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 50);
      setShowScrollTop(window.scrollY > 400);

      // Active section tracking
      for (let i = SECTION_IDS.length - 1; i >= 0; i--) {
        const el = document.getElementById(SECTION_IDS[i]);
        if (el && el.getBoundingClientRect().top <= 150) {
          setActiveSection(SECTION_IDS[i]);
          break;
        }
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  if (loading) {
    return (
      <div className="pw-loading">
        <Loader2 size={32} className="spin" />
        <span>Loading Speed@Net...</span>
      </div>
    );
  }

  const s = settings || {};
  const whatsappUrl = s.whatsapp_number
    ? `https://wa.me/${s.whatsapp_number.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(s.whatsapp_message || '')}`
    : '';

  const serviceIcons = [Printer, Wifi, Monitor, Cpu, Settings, FileText, Star, ArrowRight];

  return (
    <div className="pw-root">
      {/* ═══════ NAVBAR ═══════════════════════════════════════ */}
      <nav className={`pw-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="pw-nav-inner">
          <div className="pw-nav-brand" onClick={() => scrollTo('hero')}>
            {s.logo_url ? <img src={s.logo_url} alt="Logo" className="pw-logo" /> : <span className="pw-logo-text">{s.copyright_name || 'Speed@Net'}</span>}
          </div>
          <div className={`pw-nav-links ${menuOpen ? 'open' : ''}`}>
            {[
              { id: 'hero', label: 'Home' },
              { id: 'services', label: 'Services' },
              { id: 'about', label: 'About' },
              { id: 'gallery', label: 'Gallery' },
              { id: 'contact', label: 'Contact' },
            ].map(item => (
              <button key={item.id} className={`pw-nav-link ${activeSection === item.id ? 'active' : ''}`} onClick={() => scrollTo(item.id)}>
                {item.label}
              </button>
            ))}
            <a href="/admin" className="pw-nav-admin">Admin Login</a>
          </div>
          <button className="pw-nav-toggle" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* ═══════ HERO ═════════════════════════════════════════ */}
      <section id="hero" className="pw-hero">
        <div className="pw-hero-bg">
          {s.hero_image && <img src={s.hero_image} alt="" className="pw-hero-bg-img" />}
          <div className="pw-hero-overlay" />
        </div>
        <div className="pw-hero-content">
          <span className="pw-hero-badge">⭐ {s.hero_tagline || 'The Best Online Solution'}</span>
          <h1 className="pw-hero-title">{s.hero_title || 'Speed@Net'}</h1>
          <p className="pw-hero-subtitle">{s.hero_subtitle || 'Your one-stop destination for all digital solutions.'}</p>
          <div className="pw-hero-actions">
            <button className="pw-btn-primary" onClick={() => scrollTo(s.hero_cta_link?.replace('#', '') || 'services')}>
              {s.hero_cta_text || 'Our Services'} <ArrowRight size={18} />
            </button>
            <button className="pw-btn-outline" onClick={() => scrollTo('contact')}>
              Contact Us
            </button>
          </div>
          <div className="pw-hero-stats">
            <div className="pw-hero-stat">
              <span className="pw-hero-stat-num">500+</span>
              <span className="pw-hero-stat-label">Happy Customers</span>
            </div>
            <div className="pw-hero-stat">
              <span className="pw-hero-stat-num">50+</span>
              <span className="pw-hero-stat-label">Services</span>
            </div>
            <div className="pw-hero-stat">
              <span className="pw-hero-stat-num">5+</span>
              <span className="pw-hero-stat-label">Years Experience</span>
            </div>
          </div>
        </div>
        <div className="pw-hero-scroll" onClick={() => scrollTo('services')}>
          <ChevronDown size={24} />
        </div>
      </section>

      {/* ═══════ SERVICES ═════════════════════════════════════ */}
      {s.show_services !== false && services.length > 0 && (
        <section id="services" className="pw-section pw-services">
          <div className="pw-container">
            <div className="pw-section-header">
              <span className="pw-section-tag">What We Offer</span>
              <h2>{s.services_title || 'Our Services'}</h2>
              <p>{s.services_subtitle || 'Comprehensive digital solutions'}</p>
            </div>
            <div className="pw-services-grid">
              {services.map((svc, i) => {
                const IconComp = serviceIcons[i % serviceIcons.length];
                return (
                  <div key={svc._id || svc.id || i} className="pw-service-card">
                    <div className="pw-service-icon"><IconComp size={24} /></div>
                    <h3>{svc.name}</h3>
                    {svc.description && <p>{svc.description}</p>}
                    {svc.selling_price > 0 && <span className="pw-service-price">₹{svc.selling_price}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ═══════ ABOUT ════════════════════════════════════════ */}
      <section id="about" className="pw-section pw-about">
        <div className="pw-container">
          <div className="pw-about-grid">
            <div className="pw-about-image">
              {s.about_image ? <img src={s.about_image} alt="About" /> : (
                <div className="pw-about-placeholder">
                  <Monitor size={48} />
                  <span>Speed@Net</span>
                </div>
              )}
            </div>
            <div className="pw-about-content">
              <span className="pw-section-tag">About Us</span>
              <h2>{s.about_title || 'About Speed@Net'}</h2>
              <p className="pw-about-text">{s.about_text || ''}</p>
              <div className="pw-about-values">
                {s.about_mission && (
                  <div className="pw-about-value">
                    <span className="pw-about-value-label">🎯 Mission</span>
                    <p>{s.about_mission}</p>
                  </div>
                )}
                {s.about_vision && (
                  <div className="pw-about-value">
                    <span className="pw-about-value-label">👁️ Vision</span>
                    <p>{s.about_vision}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ GALLERY ══════════════════════════════════════ */}
      {s.gallery_images?.length > 0 && (
        <section id="gallery" className="pw-section pw-gallery">
          <div className="pw-container">
            <div className="pw-section-header">
              <span className="pw-section-tag">Portfolio</span>
              <h2>{s.gallery_title || 'Our Work'}</h2>
              <p>{s.gallery_subtitle || ''}</p>
            </div>
            <div className="pw-gallery-grid">
              {s.gallery_images.map((img, i) => (
                <div key={i} className="pw-gallery-item" onClick={() => setLightbox(img)}>
                  <img src={img.url} alt={img.alt || `Gallery ${i + 1}`} />
                  <div className="pw-gallery-overlay">
                    <Eye size={20} />
                  </div>
                  {img.caption && <span className="pw-gallery-caption">{img.caption}</span>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════ CONTACT ══════════════════════════════════════ */}
      <section id="contact" className="pw-section pw-contact">
        <div className="pw-container">
          <div className="pw-section-header">
            <span className="pw-section-tag">Get In Touch</span>
            <h2>{s.contact_title || 'Contact Us'}</h2>
            <p>{s.contact_subtitle || ''}</p>
          </div>
          <div className="pw-contact-grid">
            <div className="pw-contact-info">
              {s.phone && (
                <a href={`tel:${s.phone}`} className="pw-contact-item">
                  <Phone size={20} />
                  <div><span className="pw-contact-label">Phone</span><span>{s.phone}</span></div>
                </a>
              )}
              {s.email && (
                <a href={`mailto:${s.email}`} className="pw-contact-item">
                  <Mail size={20} />
                  <div><span className="pw-contact-label">Email</span><span>{s.email}</span></div>
                </a>
              )}
              {s.address && (
                <div className="pw-contact-item">
                  <MapPin size={20} />
                  <div><span className="pw-contact-label">Address</span><span>{s.address}</span></div>
                </div>
              )}
              {s.working_hours && (
                <div className="pw-contact-item">
                  <Clock size={20} />
                  <div><span className="pw-contact-label">Working Hours</span><span>{s.working_hours}</span></div>
                </div>
              )}
            </div>
            <div className="pw-contact-map">
              {s.map_embed_url ? (
                <iframe src={s.map_embed_url} title="Location" allowFullScreen loading="lazy" />
              ) : (
                <div className="pw-contact-map-placeholder">
                  <MapPin size={40} />
                  <span>Map Location</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════════════════════════════════════ */}
      <footer className="pw-footer">
        <div className="pw-container">
          <div className="pw-footer-grid">
            <div className="pw-footer-brand">
              <h3>{s.copyright_name || 'Speed@Net'}</h3>
              <p>{s.hero_tagline || 'The Best Online Solution'}</p>
            </div>
            <div className="pw-footer-links">
              <h4>Quick Links</h4>
              {['hero', 'services', 'about', 'gallery', 'contact'].map(id => (
                <button key={id} onClick={() => scrollTo(id)}>{id.charAt(0).toUpperCase() + id.slice(1)}</button>
              ))}
            </div>
            <div className="pw-footer-contact">
              <h4>Contact</h4>
              {s.phone && <a href={`tel:${s.phone}`}>📞 {s.phone}</a>}
              {s.email && <a href={`mailto:${s.email}`}>✉️ {s.email}</a>}
              {s.address && <span>📍 {s.address}</span>}
            </div>
            <div className="pw-footer-social">
              <h4>Follow Us</h4>
              <div className="pw-social-links">
                {s.facebook && <a href={s.facebook} target="_blank" rel="noopener noreferrer">Facebook</a>}
                {s.instagram && <a href={s.instagram} target="_blank" rel="noopener noreferrer">Instagram</a>}
                {s.youtube && <a href={s.youtube} target="_blank" rel="noopener noreferrer">YouTube</a>}
              </div>
            </div>
          </div>
          <div className="pw-footer-bottom">
            <p>{s.footer_text || `© ${new Date().getFullYear()} Speed@Net. All rights reserved.`}</p>
          </div>
        </div>
      </footer>

      {/* ═══════ WHATSAPP BUTTON ══════════════════════════════ */}
      {whatsappUrl && (
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="pw-whatsapp" title="Chat on WhatsApp">
          <MessageCircle size={28} />
        </a>
      )}

      {/* ═══════ SCROLL TO TOP ════════════════════════════════ */}
      {showScrollTop && (
        <button className="pw-scroll-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <ArrowUp size={20} />
        </button>
      )}

      {/* ═══════ LIGHTBOX ═════════════════════════════════════ */}
      {lightbox && (
        <div className="pw-lightbox" onClick={() => setLightbox(null)}>
          <div className="pw-lightbox-content" onClick={e => e.stopPropagation()}>
            <button className="pw-lightbox-close" onClick={() => setLightbox(null)}><X size={24} /></button>
            <img src={lightbox.url} alt={lightbox.alt || ''} />
            {lightbox.caption && <p className="pw-lightbox-caption">{lightbox.caption}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default PublicWebsite;
