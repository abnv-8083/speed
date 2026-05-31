import React, { useState } from 'react';
import { ArrowLeft, FileImage, Minimize2, Crop, Wrench, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FileConverter from './FileConverter';
import FileSizeTools from './FileSizeTools';
import ImageEditor from './ImageEditor';
import './ToolsPortal.css';

const TABS = [
  {
    id: 'convert',
    label: 'File Converter',
    sub: 'JPG · PNG · PDF · WEBP',
    icon: FileImage,
    heroClass: 'convert',
    heroIcon: '⇄',
    heroTitle: 'File Converter',
    heroDesc: 'Convert images between JPG, PNG, WEBP, GIF and PDF formats. Drop multiple files and convert them all at once.',
  },
  {
    id: 'size',
    label: 'Size Tools',
    sub: 'Reduce · Target KB · Scale',
    icon: Minimize2,
    heroClass: 'size',
    heroIcon: '⤡',
    heroTitle: 'File Size Tools',
    heroDesc: 'Compress or enlarge images using quality sliders, scale factors, or a target file size. See before/after comparison.',
  },
  {
    id: 'image',
    label: 'Image Editor',
    sub: 'Crop · Resize · Resolution',
    icon: Crop,
    heroClass: 'editor',
    heroIcon: '✂',
    heroTitle: 'Image Editor',
    heroDesc: 'Crop images with an interactive canvas, change resolution, or apply quick presets like HD, 4K, Instagram square.',
  },
];

export default function ToolsPortal() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('convert');
  const current = TABS.find(t => t.id === activeTab);

  return (
    <div className="tools-layout">
      {/* ── Sticky Header ── */}
      <header className="tools-header glass-panel">
        <button className="btn-icon" onClick={() => navigate('/home')}>
          <ArrowLeft size={20} />
        </button>
        <div className="tools-header-brand">
          <div className="tools-header-icon">
            <Wrench size={20} />
          </div>
          <div>
            <span className="tools-header-title">Tools Portal</span>
            <span className="tools-header-sub">3 powerful browser-native utilities</span>
          </div>
        </div>
        <div className="tools-header-privacy">
          <Lock size={11} /> All processing is local — nothing leaves your device
        </div>
      </header>

      {/* ── Body: Sidebar + Content ── */}
      <div className="tools-body">
        {/* Sidebar */}
        <aside className="tools-sidebar glass-panel">
          <span className="tools-sidebar-label">Tools</span>
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`tools-nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <div className="tools-nav-icon">
                <tab.icon size={16} />
              </div>
              <div className="tools-nav-info">
                <span className="tools-nav-title">{tab.label}</span>
                <span className="tools-nav-sub">{tab.sub}</span>
              </div>
            </button>
          ))}
        </aside>

        {/* Content */}
        <div className="tools-content">
          {/* Hero bar */}
          <div className="tools-section-hero glass-panel">
            <div className={`tools-section-hero-icon ${current.heroClass}`}>
              <current.icon size={24} />
            </div>
            <div className="tools-section-hero-text">
              <h2>{current.heroTitle}</h2>
              <p>{current.heroDesc}</p>
            </div>
          </div>

          {/* Tool component */}
          {activeTab === 'convert' && <FileConverter />}
          {activeTab === 'size'    && <FileSizeTools />}
          {activeTab === 'image'   && <ImageEditor />}
        </div>
      </div>
    </div>
  );
}
