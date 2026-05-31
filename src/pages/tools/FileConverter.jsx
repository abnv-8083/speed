import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, RefreshCw, X, ArrowRight, FileImage, AlertCircle, Check } from 'lucide-react';

const FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'];
const PDF_INPUT = ['jpg', 'jpeg', 'png', 'webp', 'bmp'];

// Mime type map
const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', bmp: 'image/bmp', pdf: 'application/pdf' };

// Detect input format from file
function detectFormat(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'jpeg';
  return ext;
}

// Available output formats based on input
function getOutputFormats(inputFmt) {
  if (inputFmt === 'pdf') return ['jpg', 'jpeg', 'png', 'webp'];
  return [...FORMATS.filter(f => f !== inputFmt && f !== 'gif'), 'pdf'];
}

async function convertImageToImage(file, outputFmt) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      // White background for JPEG (no transparency)
      if (outputFmt === 'jpg' || outputFmt === 'jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const mime = outputFmt === 'jpg' ? 'image/jpeg' : `image/${outputFmt}`;
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Conversion failed')), mime, 0.95);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}

async function convertImageToPDF(file) {
  const { jsPDF } = await import('jspdf');
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      // A4 in points: 595 x 842
      const orientation = w > h ? 'landscape' : 'portrait';
      const pdf = new jsPDF({ orientation, unit: 'px', format: [w, h] });
      pdf.addImage(img, 'JPEG', 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(new Blob([pdf.output('arraybuffer')], { type: 'application/pdf' }));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}

async function convertPDFToImage(file, outputFmt) {
  // Load PDF.js from CDN dynamically
  if (!window.pdfjsLib) {
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const blobs = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width  = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    const mime = (outputFmt === 'jpg' || outputFmt === 'jpeg') ? 'image/jpeg' : `image/${outputFmt}`;
    const blob = await new Promise(res => canvas.toBlob(res, mime, 0.95));
    blobs.push(blob);
  }
  return blobs; // array of blobs, one per page
}

function fmtSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(2) + ' MB';
}

function DropZone({ onFiles, accept }) {
  const [over, setOver] = useState(false);
  const inputRef = useRef();
  const handle = (files) => { if (files?.length) onFiles(Array.from(files)); };
  return (
    <div
      className={`tools-dropzone ${over ? 'over' : ''}`}
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files); }}
      onClick={() => inputRef.current.click()}
    >
      <input ref={inputRef} type="file" multiple accept={accept} style={{ display: 'none' }}
        onChange={e => handle(e.target.files)} />
      <Upload size={32} strokeWidth={1.5} />
      <p>Drop files here or <strong>click to browse</strong></p>
      <span>Supports JPG, PNG, WEBP, GIF, BMP, PDF</span>
    </div>
  );
}

export default function FileConverter() {
  const [files, setFiles]           = useState([]);
  const [outputFmt, setOutputFmt]   = useState('png');
  const [converting, setConverting] = useState(false);
  const [results, setResults]       = useState([]);  // [{name, blob, pages}]
  const [error, setError]           = useState('');

  const addFiles = useCallback((incoming) => {
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size));
      const fresh = incoming.filter(f => !existing.has(f.name + f.size));
      return [...prev, ...fresh];
    });
    setResults([]);
    setError('');
  }, []);

  const removeFile = (idx) => { setFiles(prev => prev.filter((_, i) => i !== idx)); setResults([]); };

  const handleConvert = async () => {
    if (!files.length) return;
    setConverting(true);
    setError('');
    const out = [];
    try {
      for (const file of files) {
        const fmt = detectFormat(file);
        const isPDFInput = fmt === 'pdf';
        const isPDFOutput = outputFmt === 'pdf';
        const baseName = file.name.replace(/\.[^.]+$/, '');

        if (isPDFInput) {
          const blobs = await convertPDFToImage(file, outputFmt);
          blobs.forEach((blob, i) => out.push({ name: `${baseName}_page${i + 1}.${outputFmt}`, blob }));
        } else if (isPDFOutput) {
          const blob = await convertImageToPDF(file);
          out.push({ name: `${baseName}.pdf`, blob });
        } else {
          const blob = await convertImageToImage(file, outputFmt);
          out.push({ name: `${baseName}.${outputFmt}`, blob });
        }
      }
      setResults(out);
    } catch (e) {
      setError(e.message || 'Conversion failed');
    }
    setConverting(false);
  };

  const download = (result) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(result.blob);
    a.download = result.name;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const downloadAll = () => results.forEach(download);

  // Determine available output formats based on first file's type
  const firstFmt = files.length ? detectFormat(files[0]) : null;
  const outputOptions = firstFmt ? getOutputFormats(firstFmt) : [...FORMATS, 'pdf'];

  return (
    <div className="tools-card glass-panel animate-fade-in">

      <DropZone onFiles={addFiles} accept="image/*,.pdf" />

      {/* File list */}
      {files.length > 0 && (
        <div className="conv-file-list">
          {files.map((f, i) => (
            <div key={i} className="conv-file-row">
              <FileImage size={16} className="conv-file-icon" />
              <span className="conv-file-name">{f.name}</span>
              <span className="conv-file-size">{fmtSize(f.size)}</span>
              <span className="conv-file-fmt">{detectFormat(f).toUpperCase()}</span>
              <button className="btn-icon" onClick={() => removeFile(i)}><X size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {/* Output format selector */}
      {files.length > 0 && (
        <div className="conv-controls">
          <div className="conv-format-section">
            <span className="conv-label">Convert to</span>
            <div className="conv-format-pills">
              {outputOptions.map(fmt => (
                <button
                  key={fmt}
                  className={`conv-pill ${outputFmt === fmt ? 'active' : ''}`}
                  onClick={() => setOutputFmt(fmt)}
                >
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="conv-action-row">
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {files.length} file{files.length > 1 ? 's' : ''} selected → {outputFmt.toUpperCase()}
            </span>
            <button className="btn btn-convert" onClick={handleConvert} disabled={converting}>
              {converting
                ? <><RefreshCw size={16} className="spin" /> Converting…</>
                : <><ArrowRight size={16} /> Convert Now</>
              }
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="tools-error"><AlertCircle size={16} /> {error}</div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="conv-results animate-fade-in">
          <div className="conv-results-header">
            <Check size={16} color="#10b981" /> <span>{results.length} file{results.length > 1 ? 's' : ''} ready</span>
            {results.length > 1 && <button className="btn btn-sm btn-primary" onClick={downloadAll}><Download size={14}/> Download All</button>}
          </div>
          {results.map((r, i) => (
            <div key={i} className="conv-result-row">
              <FileImage size={16} />
              <span className="conv-file-name">{r.name}</span>
              <span className="conv-file-size">{fmtSize(r.blob.size)}</span>
              <button className="btn btn-sm btn-accent" onClick={() => download(r)}>
                <Download size={13} /> Download
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
