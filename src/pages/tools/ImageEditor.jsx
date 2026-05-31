import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Download, X, Crop, RotateCcw, RefreshCw, AlertCircle, Move } from 'lucide-react';

function fmtSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(2) + ' MB';
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
      <span>JPG, PNG, WEBP</span>
    </div>
  );
}

// ── Crop Region Handle ────────────────────────────────────────
const HANDLE_SIZE = 10;

function CropCanvas({ imgEl, crop, setCrop, displayW, displayH }) {
  const canvasRef = useRef();
  const dragging  = useRef(null); // { type: 'move'|'tl'|'tr'|'bl'|'br', startX, startY, startCrop }

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgEl) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, displayW, displayH);
    ctx.drawImage(imgEl, 0, 0, displayW, displayH);

    // Dim outside crop
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, displayW, crop.y);
    ctx.fillRect(0, crop.y + crop.h, displayW, displayH - crop.y - crop.h);
    ctx.fillRect(0, crop.y, crop.x, crop.h);
    ctx.fillRect(crop.x + crop.w, crop.y, displayW - crop.x - crop.w, crop.h);

    // Crop border
    ctx.strokeStyle = '#4F46E5';
    ctx.lineWidth   = 2;
    ctx.strokeRect(crop.x, crop.y, crop.w, crop.h);

    // Rule of thirds
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(crop.x + (crop.w/3)*i, crop.y); ctx.lineTo(crop.x + (crop.w/3)*i, crop.y + crop.h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(crop.x, crop.y + (crop.h/3)*i); ctx.lineTo(crop.x + crop.w, crop.y + (crop.h/3)*i); ctx.stroke();
    }

    // Corner handles
    const hs = HANDLE_SIZE;
    [[crop.x, crop.y], [crop.x+crop.w-hs, crop.y], [crop.x, crop.y+crop.h-hs], [crop.x+crop.w-hs, crop.y+crop.h-hs]].forEach(([hx, hy]) => {
      ctx.fillStyle = '#4F46E5'; ctx.fillRect(hx, hy, hs, hs);
    });
  }, [imgEl, crop, displayW, displayH]);

  useEffect(() => { draw(); }, [draw]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const hitTest = ({ x, y }) => {
    const hs = HANDLE_SIZE + 4;
    const { x: cx, y: cy, w: cw, h: ch } = crop;
    if (x >= cx && x <= cx+hs && y >= cy && y <= cy+hs) return 'tl';
    if (x >= cx+cw-hs && x <= cx+cw && y >= cy && y <= cy+hs) return 'tr';
    if (x >= cx && x <= cx+hs && y >= cy+ch-hs && y <= cy+ch) return 'bl';
    if (x >= cx+cw-hs && x <= cx+cw && y >= cy+ch-hs && y <= cy+ch) return 'br';
    if (x >= cx && x <= cx+cw && y >= cy && y <= cy+ch) return 'move';
    return null;
  };

  const onDown = (e) => {
    const pos  = getPos(e);
    const type = hitTest(pos);
    if (!type) return;
    e.preventDefault();
    dragging.current = { type, startX: pos.x, startY: pos.y, startCrop: { ...crop } };
  };

  const onMove = (e) => {
    if (!dragging.current) return;
    e.preventDefault();
    const pos = getPos(e);
    const dx  = pos.x - dragging.current.startX;
    const dy  = pos.y - dragging.current.startY;
    const sc  = dragging.current.startCrop;
    const MIN = 20;

    setCrop(prev => {
      let { x, y, w, h } = sc;
      const t = dragging.current.type;
      if (t === 'move') {
        x = Math.max(0, Math.min(displayW - w, x + dx));
        y = Math.max(0, Math.min(displayH - h, y + dy));
      } else if (t === 'tl') {
        const nx = Math.min(x + w - MIN, x + dx);
        const ny = Math.min(y + h - MIN, y + dy);
        w = w - (nx - x); h = h - (ny - y); x = nx; y = ny;
      } else if (t === 'tr') {
        w = Math.max(MIN, w + dx); h = Math.max(MIN, h); y = Math.min(y + h - MIN, y + dy);
        h = h - (y - sc.y);
      } else if (t === 'bl') {
        const nx = Math.min(x + w - MIN, x + dx);
        w = w - (nx - x); x = nx; h = Math.max(MIN, h + dy);
      } else if (t === 'br') {
        w = Math.max(MIN, w + dx); h = Math.max(MIN, h + dy);
      }
      // Clamp
      x = Math.max(0, x); y = Math.max(0, y);
      w = Math.min(displayW - x, w); h = Math.min(displayH - y, h);
      return { x, y, w, h };
    });
  };

  const onUp = () => { dragging.current = null; };

  return (
    <canvas
      ref={canvasRef}
      width={displayW} height={displayH}
      style={{ cursor: 'crosshair', maxWidth: '100%', borderRadius: 8 }}
      onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
      onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
    />
  );
}

export default function ImageEditor() {
  const [file, setFile]     = useState(null);
  const [imgEl, setImgEl]   = useState(null);
  const [mode, setMode]     = useState('crop'); // 'crop' | 'resize'
  const [crop, setCrop]     = useState({ x: 20, y: 20, w: 200, h: 150 });
  const [resW, setResW]     = useState('');
  const [resH, setResH]     = useState('');
  const [keepAR, setKeepAR] = useState(true);
  const [result, setResult] = useState(null);
  const [resultURL, setResultURL] = useState('');
  const [error, setError]   = useState('');
  const [processing, setProcessing] = useState(false);

  const DISPLAY_MAX = 600;
  const displayW = imgEl ? Math.min(DISPLAY_MAX, imgEl.naturalWidth) : 0;
  const displayH = imgEl ? Math.round(displayW * (imgEl.naturalHeight / imgEl.naturalWidth)) : 0;

  const handleFile = (f) => {
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      setImgEl(img);
      setFile(f);
      setResult(null);
      setError('');
      const dW = Math.min(DISPLAY_MAX, img.naturalWidth);
      const dH = Math.round(dW * (img.naturalHeight / img.naturalWidth));
      // Default crop = 80% centered
      const cw = Math.round(dW * 0.8), ch = Math.round(dH * 0.8);
      setCrop({ x: Math.round((dW - cw)/2), y: Math.round((dH - ch)/2), w: cw, h: ch });
      setResW(String(img.naturalWidth));
      setResH(String(img.naturalHeight));
      if (resultURL) URL.revokeObjectURL(resultURL);
      setResultURL('');
    };
    img.src = url;
  };

  const clear = () => {
    setFile(null); setImgEl(null); setResult(null);
    if (resultURL) URL.revokeObjectURL(resultURL);
    setResultURL(''); setError('');
  };

  const handleWidthChange = (v) => {
    setResW(v);
    if (keepAR && imgEl && v) {
      setResH(String(Math.round((parseInt(v) * imgEl.naturalHeight) / imgEl.naturalWidth)));
    }
  };

  const handleHeightChange = (v) => {
    setResH(v);
    if (keepAR && imgEl && v) {
      setResW(String(Math.round((parseInt(v) * imgEl.naturalWidth) / imgEl.naturalHeight)));
    }
  };

  const applyCrop = () => {
    if (!imgEl) return;
    setProcessing(true);
    const scaleX = imgEl.naturalWidth  / displayW;
    const scaleY = imgEl.naturalHeight / displayH;
    const canvas = document.createElement('canvas');
    canvas.width  = Math.round(crop.w * scaleX);
    canvas.height = Math.round(crop.h * scaleY);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgEl,
      Math.round(crop.x * scaleX), Math.round(crop.y * scaleY),
      canvas.width, canvas.height,
      0, 0, canvas.width, canvas.height
    );
    const mime = file?.type || 'image/jpeg';
    canvas.toBlob(blob => {
      setResult(blob);
      if (resultURL) URL.revokeObjectURL(resultURL);
      setResultURL(URL.createObjectURL(blob));
      setProcessing(false);
    }, mime, 0.95);
  };

  const applyResize = () => {
    if (!imgEl || !resW || !resH) return;
    setProcessing(true);
    const canvas = document.createElement('canvas');
    canvas.width  = parseInt(resW);
    canvas.height = parseInt(resH);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
    const mime = file?.type || 'image/jpeg';
    canvas.toBlob(blob => {
      setResult(blob);
      if (resultURL) URL.revokeObjectURL(resultURL);
      setResultURL(URL.createObjectURL(blob));
      setProcessing(false);
    }, mime, 0.95);
  };

  const download = () => {
    if (!result || !file) return;
    const base = file.name.replace(/\.[^.]+$/, '');
    const ext  = file.name.split('.').pop();
    const suffix = mode === 'crop' ? '_cropped' : `_${resW}x${resH}`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(result);
    a.download = `${base}${suffix}.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const resetCrop = () => {
    if (!imgEl) return;
    const cw = Math.round(displayW * 0.8), ch = Math.round(displayH * 0.8);
    setCrop({ x: Math.round((displayW - cw)/2), y: Math.round((displayH - ch)/2), w: cw, h: ch });
  };

  const scaleX = imgEl ? imgEl.naturalWidth / displayW : 1;
  const scaleY = imgEl ? imgEl.naturalHeight / displayH : 1;

  return (
    <div className="tools-card glass-panel animate-fade-in">

      {!file ? (
        <DropZone onFile={handleFile} />
      ) : (
        <>
          {/* Mode tabs */}
          <div className="size-mode-tabs">
            <button className={`size-mode-tab ${mode === 'crop' ? 'active' : ''}`} onClick={() => setMode('crop')}>
              <Crop size={14}/> Crop
            </button>
            <button className={`size-mode-tab ${mode === 'resize' ? 'active' : ''}`} onClick={() => setMode('resize')}>
              <Move size={14}/> Resize / Resolution
            </button>
          </div>

          {mode === 'crop' && (
            <div className="image-editor-crop-area">
              <div className="image-crop-info">
                <span className="image-crop-hint">Drag corner handles to adjust the crop region</span>
                <span className="image-crop-dims">
                  {Math.round(crop.w * scaleX)} × {Math.round(crop.h * scaleY)} px
                </span>
                <button className="btn btn-sm" onClick={resetCrop}><RotateCcw size={13}/> Reset</button>
              </div>
              <div className="image-crop-canvas-wrap">
                <CropCanvas imgEl={imgEl} crop={crop} setCrop={setCrop} displayW={displayW} displayH={displayH} />
              </div>
              <button className="btn btn-accent" onClick={applyCrop} disabled={processing}>
                {processing ? <RefreshCw size={15} className="spin"/> : <Crop size={15}/>} Apply Crop
              </button>
            </div>
          )}

          {mode === 'resize' && (
            <div className="image-resize-area">
              <div className="image-resize-info">
                <span>Original size:</span>
                <strong>{imgEl?.naturalWidth} × {imgEl?.naturalHeight} px</strong>
              </div>
              <div className="image-resize-controls">
                <div className="form-group">
                  <label className="form-label">Width (px)</label>
                  <input className="input-field" type="number" min="1" value={resW} onChange={e => handleWidthChange(e.target.value)} />
                </div>
                <div className="image-resize-lock">
                  <button
                    className={`btn btn-sm ${keepAR ? 'btn-primary' : ''}`}
                    onClick={() => setKeepAR(v => !v)}
                    title="Lock aspect ratio"
                  >
                    {keepAR ? '🔒' : '🔓'}
                  </button>
                </div>
                <div className="form-group">
                  <label className="form-label">Height (px)</label>
                  <input className="input-field" type="number" min="1" value={resH} onChange={e => handleHeightChange(e.target.value)} />
                </div>
              </div>
              {/* Quick presets */}
              <div>
                <p className="image-resize-presets-label">Quick Presets</p>
                <div className="image-resize-presets">
                  {[
                    ['HD', 1280, 720], ['Full HD', 1920, 1080], ['4K', 3840, 2160],
                    ['Instagram', 1080, 1080], ['Thumbnail', 320, 180],
                  ].map(([label, w, h]) => (
                    <button key={label} className="conv-pill" onClick={() => { setResW(w); setResH(h); setKeepAR(false); }}>
                      {label} <span style={{opacity:0.6,fontSize:'0.65rem'}}>({w}×{h})</span>
                    </button>
                  ))}
                </div>
              </div>
              <button className="btn btn-accent" onClick={applyResize} disabled={processing || !resW || !resH}>
                {processing ? <RefreshCw size={15} className="spin"/> : <Move size={15}/>} Apply Resize
              </button>
            </div>
          )}

          {error && <div className="tools-error"><AlertCircle size={15}/> {error}</div>}

          {result && resultURL && (
            <div className="size-result animate-fade-in">
              <img src={resultURL} alt="result" style={{ maxWidth: '100%', borderRadius: 8 }} />
              <div className="size-result-stats">
                <div className="size-stat"><span>Before</span><strong>{fmtSize(file?.size)}</strong></div>
                <div className="size-stat-arrow">→</div>
                <div className="size-stat"><span>After</span><strong>{fmtSize(result.size)}</strong></div>
              </div>
              <button className="btn btn-accent" onClick={download}><Download size={15}/> Download</button>
            </div>
          )}

          <button className="btn btn-sm" style={{ marginTop: '1rem' }} onClick={clear}><X size={13}/> Remove Image</button>
        </>
      )}
    </div>
  );
}
