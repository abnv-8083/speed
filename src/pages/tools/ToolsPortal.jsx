import React from 'react';
import { useLocation } from 'react-router-dom';
import { FileImage, Minimize2, Crop, Lock } from 'lucide-react';
import FileConverter from './FileConverter';
import FileSizeTools from './FileSizeTools';
import ImageEditor from './ImageEditor';
import './ToolsPortal.css';

const TABS = [
  {
    id:        'convert',
    path:      '/tools/convert',
    icon:      FileImage,
    heroClass: 'convert',
    heroTitle: 'File Converter',
    heroDesc:  'Convert images between JPG, PNG, WEBP, GIF and PDF formats. Drop multiple files and convert them all at once.',
  },
  {
    id:        'size',
    path:      '/tools/size',
    icon:      Minimize2,
    heroClass: 'size',
    heroTitle: 'File Size Tools',
    heroDesc:  'Compress or enlarge images using quality sliders, scale factors, or a target file size. See before/after comparison.',
  },
  {
    id:        'image',
    path:      '/tools/image',
    icon:      Crop,
    heroClass: 'editor',
    heroTitle: 'Image Editor',
    heroDesc:  'Crop images with an interactive canvas, change resolution, or apply quick presets like HD, 4K, Instagram square.',
  },
];

export default function ToolsPortal() {
  const location = useLocation();

  const getActiveId = () => {
    if (location.pathname.includes('/size'))    return 'size';
    if (location.pathname.includes('/image'))   return 'image';
    return 'convert';
  };

  const activeId = getActiveId();
  const current  = TABS.find(t => t.id === activeId);

  return (
    <div className="tools-root animate-fade-in">

      {/* ── Privacy badge + hero bar ── */}
      <div className="tools-hero glass-panel">
        <div className={`tools-hero-icon ${current.heroClass}`}>
          <current.icon size={22} />
        </div>
        <div className="tools-hero-text">
          <h2>{current.heroTitle}</h2>
          <p>{current.heroDesc}</p>
        </div>
        <div className="tools-privacy-badge">
          <Lock size={11} /> Local only — nothing leaves your device
        </div>
      </div>

      {/* ── Tool ── */}
      <div className="tools-tool-area">
        {activeId === 'convert' && <FileConverter />}
        {activeId === 'size'    && <FileSizeTools />}
        {activeId === 'image'   && <ImageEditor />}
      </div>

    </div>
  );
}
