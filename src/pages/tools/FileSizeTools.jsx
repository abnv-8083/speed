import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, X, Minimize2, Maximize2, AlertCircle, RefreshCw } from 'lucide-react';

function fmtSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(2) + ' MB';
}

function pct(a, b) {
  if (!b) return 0;
  return Math.round(((b - a) / b) * 100);
}

// Resize image on canvas to given quality/scale
function processImage(file, { quality, scale, targetKB }) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (scale !== 1) { w = Math.round(w * scale); h = Math.round(h * scale); }

      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');

      // White bg for JPEG
      const isJpeg = file.type === 'image/jpeg' || file.name.toLowerCase().endsWith('.jpg');
      if (isJpeg) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);

      // Binary search quality if targetKB specified
      if (targetKB) {
        let lo = 0.01, hi = 1.0, best = null;
        const search = (q) => new Promise(r => canvas.toBlob(r, file.type || 'image/jpeg', q));
        const run = async () => {
          for (let i = 0; i < 12; i++) {
            const mid = (lo + hi) / 2;
            const blob = await search(mid);
            if (!blob) break;
            best = blob;
            if (blob.size / 1024 < targetKB) hi = mid; else lo = mid;
          }
          resolve(best);
        };
        run();
      } else {
        const mime = isJpeg ? 'image/jpeg' : (file.type || 'image/jpeg');
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('Failed')), mime, quality);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Load failed')); };
    img.src = url;
  });
}

function DropZone({ onFile }) {
  const [over, setOver] = useState(false);
  const ref = useRef();
  const handle = (files) => { if (files?.[0]) onFile(files[0]); };
  return (
    <div
      className={`tools-dropzone ${over ? 'over' : ''}`}
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files); }}
      onClick={() => ref.current.click()}
    >
      <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handle(e.target.files)} />
      <Upload size={32} strokeWidth={1.5} />
      <p>Drop an image or <strong>click to browse</strong></p>
      <span>JPG, PNG, WEBP — up to 50 MB</span>
    </div>
  );
}

export default function FileSizeTools() {
  const [file, setFile]           = useState(null);
  const [preview, setPreview]     = useState('');
  const [mode, setMode]           = useState('quality'); // 'quality' | 'target' | 'scale'
  const [quality, setQuality]     = useState(0.8);
  const [scale, setScale]         = useState(1.0);
  const [targetKB, setTargetKB]   = useState('');
  const [result, setResult]       = useState(null);
  const [resultURL, setResultURL] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError]         = useState('');

  const handleFile = (f) => {
    setFile(f);
    setResult(null);
    setError('');
    if (resultURL) URL.revokeObjectURL(resultURL);
    setResultURL('');
    setPreview(URL.createObjectURL(f));
  };

  const clear = () => {
    setFile(null); setResult(null); setError('');
    if (preview) URL.revokeObjectURL(preview);
    if (resultURL) URL.revokeObjectURL(resultURL);
    setPreview(''); setResultURL('');
  };

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true); setError('');
    try {
      const opts = {
        quality: mode === 'quality' ? quality : 0.92,
        scale:   mode === 'scale'   ? scale   : 1.0,
        targetKB: mode === 'target' ? parseFloat(targetKB) : null,
      };
      const blob = await processImage(file, opts);
      setResult(blob);
      if (resultURL) URL.revokeObjectURL(resultURL);
      setResultURL(URL.createObjectURL(blob));
    } catch (e) {
      setError(e.message);
    }
    setProcessing(false);
  };

  const download = () => {
    if (!result) return;
    const ext  = file.name.split('.').pop();
    const base = file.name.replace(/\.[^.]+$/, '');
    const suffix = mode === 'quality' ? `_q${Math.round(quality * 100)}` : mode === 'scale' ? `_x${scale}` : `_${Math.round(result.size/1024)}kb`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(result);
    a.download = `${base}${suffix}.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const saved = result ? pct(result.size, file?.size) : 0;

  return (
    <div className="tools-card glass-panel animate-fade-in">
      <div className="tools-card-header">
        <Minimize2 size={20} />
        <div>
          <h2>File Size Tools</h2>
          <p>Reduce or increase image file size using quality and scale controls</p>
        </div>
      </div>

      {!file ? (
        <DropZone onFile={handleFile} />
      ) : (
        <>
          <div className="size-file-info">
            <img src={preview} alt="preview" className="size-thumb" />
            <div className="size-file-meta">
              <span className="size-file-name">{file.name}</span>
              <span className="size-file-orig">Original: <strong>{fmtSize(file.size)}</strong></span>
              {result && (
                <span className={`size-file-new ${saved > 0 ? 'saved' : 'grown'}`}>
                  {saved > 0 ? '↓' : '↑'} {Math.abs(saved)}% → {fmtSize(result.size)}
                </span>
              )}
            </div>
            <button className="btn-icon" onClick={clear}><X size={16}/></button>
          </div>

          {/* Mode tabs */}
          <div className="size-mode-tabs">
            {[['quality','🎚 Quality'], ['scale','↔ Scale'], ['target','🎯 Target KB']].map(([id, label]) => (
              <button key={id} className={`size-mode-tab ${mode === id ? 'active' : ''}`} onClick={() => setMode(id)}>
                {label}
              </button>
            ))}
          </div>

          <div className="size-controls-box">
            {mode === 'quality' && (
              <div className="size-control-row">
                <label>Quality: <strong>{Math.round(quality * 100)}%</strong></label>
                <input type="range" min="1" max="100" value={Math.round(quality * 100)}
                  onChange={e => setQuality(e.target.value / 100)} />
                <div className="size-quality-hints">
                  <span>Lower = smaller file</span><span>Higher = better quality</span>
                </div>
              </div>
            )}
            {mode === 'scale' && (
              <div className="size-control-row">
                <label>Scale: <strong>{scale}×</strong> {scale < 1 ? '(shrink)' : scale > 1 ? '(enlarge)' : '(original)'}</label>
                <input type="range" min="10" max="300" value={Math.round(scale * 100)}
                  onChange={e => setScale(e.target.value / 100)} />
                <div className="size-quality-hints"><span>0.1×</span><span>3.0×</span></div>
              </div>
            )}
            {mode === 'target' && (
              <div className="size-control-row">
                <label>Target File Size</label>
                <div className="size-target-row">
                  <input type="number" className="input-field" min="1" value={targetKB}
                    onChange={e => setTargetKB(e.target.value)} placeholder="e.g. 200" />
                  <span className="size-unit">KB</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                  Quality will be auto-adjusted to reach your target.
                </p>
              </div>
            )}

            <button className="btn btn-accent" onClick={handleProcess} disabled={processing || (mode === 'target' && !targetKB)}>
              {processing ? <><RefreshCw size={15} className="spin"/> Processing…</> : 'Apply'}
            </button>
          </div>

          {error && <div className="tools-error"><AlertCircle size={15}/> {error}</div>}

          {result && resultURL && (
            <div className="size-result animate-fade-in">
              <div className="size-result-img">
                <img src={resultURL} alt="result" />
              </div>
              <div className="size-result-stats">
                <div className="size-stat"><span>Before</span><strong>{fmtSize(file.size)}</strong></div>
                <div className={`size-stat-arrow ${saved <= 0 ? 'grown' : ''}`}>
                  {saved > 0 ? `↓ ${saved}% saved` : `↑ ${Math.abs(saved)}% larger`}
                </div>
                <div className="size-stat"><span>After</span><strong>{fmtSize(result.size)}</strong></div>
              </div>
              <button className="btn btn-accent" onClick={download}><Download size={15}/> Download</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
