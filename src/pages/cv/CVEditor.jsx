import React, { useState, useRef } from 'react';
import { Plus, Trash2, Eye, Upload, X } from 'lucide-react';

export default function CVEditor({ cvData, setCvData, template, onPreview }) {
  const [activeSection, setActiveSection] = useState('personal');

  const update = (section, value) => setCvData(prev => ({ ...prev, [section]: value }));
  const updatePersonal = (field, value) => update('personal', { ...cvData.personal, [field]: value });

  // Experience
  const addExp = () => update('experience', [...cvData.experience, { id: Date.now(), company: '', role: '', period: '', description: '' }]);
  const removeExp = (id) => update('experience', cvData.experience.filter(e => e.id !== id));
  const updateExp = (id, field, value) => update('experience', cvData.experience.map(e => e.id === id ? { ...e, [field]: value } : e));

  // Education
  const addEdu = () => update('education', [...cvData.education, { id: Date.now(), institution: '', degree: '', period: '', gpa: '', board: '', specialization: '' }]);
  const removeEdu = (id) => update('education', cvData.education.filter(e => e.id !== id));
  const updateEdu = (id, field, value) => update('education', cvData.education.map(e => e.id === id ? { ...e, [field]: value } : e));

  // Training & Internship
  const addTraining = () => update('training', [...(cvData.training || []), { id: Date.now(), organization: '', role: '', period: '', description: '' }]);
  const removeTraining = (id) => update('training', (cvData.training || []).filter(t => t.id !== id));
  const updateTraining = (id, field, value) => update('training', (cvData.training || []).map(t => t.id === id ? { ...t, [field]: value } : t));

  // Skills (core)
  const [skillInput, setSkillInput] = useState('');
  const addSkill = () => {
    if (skillInput.trim() && !cvData.skills.includes(skillInput.trim())) {
      update('skills', [...cvData.skills, skillInput.trim()]);
      setSkillInput('');
    }
  };
  const removeSkill = (s) => update('skills', cvData.skills.filter(sk => sk !== s));

  // Technical & Computer Skills
  const [techInput, setTechInput] = useState('');
  const addTech = () => {
    const list = cvData.technicalSkills || [];
    if (techInput.trim() && !list.includes(techInput.trim())) {
      update('technicalSkills', [...list, techInput.trim()]);
      setTechInput('');
    }
  };
  const removeTech = (s) => update('technicalSkills', (cvData.technicalSkills || []).filter(x => x !== s));

  // Certifications
  const [certInput, setCertInput] = useState('');
  const addCert = () => {
    if (certInput.trim()) {
      update('certifications', [...(cvData.certifications || []), certInput.trim()]);
      setCertInput('');
    }
  };
  const removeCert = (c) => update('certifications', cvData.certifications.filter(x => x !== c));

  // Languages
  const [langInput, setLangInput] = useState('');
  const addLang = () => {
    const list = cvData.languages || [];
    if (langInput.trim() && !list.includes(langInput.trim())) {
      update('languages', [...list, langInput.trim()]);
      setLangInput('');
    }
  };
  const removeLang = (l) => update('languages', (cvData.languages || []).filter(x => x !== l));

  // Photo upload
  const photoInputRef = useRef(null);
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => updatePersonal('photo', ev.target.result);
    reader.readAsDataURL(file);
  };

  const isATS = template === 'ats';

  const SECTIONS = [
    'personal',
    'experience',
    'training',
    'education',
    'skills',
    'technicalSkills',
    'certifications',
    'languages',
  ];

  const sectionLabel = (s) => ({
    personal: 'Personal',
    experience: 'Experience',
    training: 'Training',
    education: 'Education',
    skills: 'Core Skills',
    technicalSkills: 'Tech Skills',
    certifications: 'Certifications',
    languages: 'Languages',
  }[s] || s.charAt(0).toUpperCase() + s.slice(1));

  return (
    <div className="cveditor-layout animate-fade-in">
      {/* Sidebar nav */}
      <aside className="cveditor-nav glass-panel">
        {SECTIONS.map(s => (
          <button
            key={s}
            className={`cveditor-nav-item ${activeSection === s ? 'active' : ''}`}
            onClick={() => setActiveSection(s)}
          >
            {sectionLabel(s)}
          </button>
        ))}
        <button className="btn btn-primary cveditor-preview-btn" onClick={onPreview}>
          <Eye size={16} /> Preview CV
        </button>
      </aside>

      {/* Form panel */}
      <section className="cveditor-form glass-panel">

        {/* ── PERSONAL ── */}
        {activeSection === 'personal' && (
          <div>
            <h3 className="cveditor-section-title">Personal Information</h3>

            {/* Photo upload (ATS only) */}
            {isATS && (
              <div className="form-group">
                <label className="form-label">Profile Photo <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>(optional)</span></label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  {cvData.personal.photo
                    ? <img src={cvData.personal.photo} alt="profile" style={{ width: 72, height: 72, borderRadius: 6, objectFit: 'cover', border: '2px solid var(--border)' }} />
                    : <div style={{ width: 72, height: 72, borderRadius: 6, background: 'var(--surface-elevated)', border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.72rem' }}>No photo</div>
                  }
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" style={{ fontSize: '0.78rem' }} onClick={() => photoInputRef.current?.click()}>
                      <Upload size={14} /> Upload
                    </button>
                    {cvData.personal.photo && (
                      <button className="btn-icon btn-danger" onClick={() => updatePersonal('photo', '')} title="Remove photo"><X size={14} /></button>
                    )}
                  </div>
                  <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
                </div>
              </div>
            )}

            {[
              ['name', 'Full Name', 'text'],
              ['title', 'Professional Title', 'text'],
              ['email', 'Email Address', 'email'],
              ['phone', 'Phone Number', 'tel'],
              ['location', 'Location', 'text'],
              ['website', 'Website / LinkedIn', 'text'],
            ].map(([field, label, type]) => (
              <div className="form-group" key={field}>
                <label className="form-label">{label}</label>
                <input
                  type={type}
                  className="input-field"
                  value={cvData.personal[field] || ''}
                  onChange={e => updatePersonal(field, e.target.value)}
                  placeholder={label}
                />
              </div>
            ))}
            <div className="form-group">
              <label className="form-label">Professional Summary</label>
              <textarea
                className="input-field"
                rows={4}
                value={cvData.personal.summary || ''}
                onChange={e => updatePersonal('summary', e.target.value)}
                placeholder="Write a short professional summary..."
              />
            </div>
          </div>
        )}

        {/* ── EXPERIENCE ── */}
        {activeSection === 'experience' && (
          <div>
            <div className="cveditor-section-header">
              <h3 className="cveditor-section-title">Work Experience</h3>
              <button className="btn btn-primary" onClick={addExp}><Plus size={16} /> Add</button>
            </div>
            {cvData.experience.map((exp, idx) => (
              <div className="cveditor-card glass-panel" key={exp.id}>
                <div className="cveditor-card-header">
                  <span>Experience #{idx + 1}</span>
                  <button className="btn-icon btn-danger" onClick={() => removeExp(exp.id)}><Trash2 size={16} /></button>
                </div>
                {[['company', 'Company / Organization'], ['role', 'Job Title / Role'], ['period', 'Period (e.g. Jan 2025 – Present)']].map(([f, l]) => (
                  <div className="form-group" key={f}>
                    <label className="form-label">{l}</label>
                    <input className="input-field" value={exp[f]} onChange={e => updateExp(exp.id, f, e.target.value)} placeholder={l} />
                  </div>
                ))}
                <div className="form-group">
                  <label className="form-label">Description / Responsibilities {isATS && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>(use bullet points: start each with •)</span>}</label>
                  <textarea className="input-field" rows={4} value={exp.description} onChange={e => updateExp(exp.id, 'description', e.target.value)} placeholder={isATS ? "• Responsibility one\n• Responsibility two\n• Responsibility three" : "Describe your responsibilities..."} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── TRAINING & INTERNSHIP (ATS only) ── */}
        {activeSection === 'training' && (
          <div>
            <div className="cveditor-section-header">
              <h3 className="cveditor-section-title">Training &amp; Internship</h3>
              <button className="btn btn-primary" onClick={addTraining}><Plus size={16} /> Add</button>
            </div>
            {(cvData.training || []).length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.5rem' }}>No training entries yet. Click Add to start.</p>
            )}
            {(cvData.training || []).map((t, idx) => (
              <div className="cveditor-card glass-panel" key={t.id}>
                <div className="cveditor-card-header">
                  <span>Training #{idx + 1}</span>
                  <button className="btn-icon btn-danger" onClick={() => removeTraining(t.id)}><Trash2 size={16} /></button>
                </div>
                {[['organization', 'Organization / Airport / Institute'], ['role', 'Training Title / Programme'], ['period', 'Period (e.g. Feb 2025)']].map(([f, l]) => (
                  <div className="form-group" key={f}>
                    <label className="form-label">{l}</label>
                    <input className="input-field" value={t[f] || ''} onChange={e => updateTraining(t.id, f, e.target.value)} placeholder={l} />
                  </div>
                ))}
                <div className="form-group">
                  <label className="form-label">Description <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>(use • for bullet points)</span></label>
                  <textarea className="input-field" rows={3} value={t.description || ''} onChange={e => updateTraining(t.id, 'description', e.target.value)} placeholder={"• Gained practical exposure to...\n• Observed real-time ground handling..."} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── EDUCATION ── */}
        {activeSection === 'education' && (
          <div>
            <div className="cveditor-section-header">
              <h3 className="cveditor-section-title">Education</h3>
              <button className="btn btn-primary" onClick={addEdu}><Plus size={16} /> Add</button>
            </div>
            {cvData.education.map((edu, idx) => (
              <div className="cveditor-card glass-panel" key={edu.id}>
                <div className="cveditor-card-header">
                  <span>Education #{idx + 1}</span>
                  <button className="btn-icon btn-danger" onClick={() => removeEdu(edu.id)}><Trash2 size={16} /></button>
                </div>
                {[
                  ['institution', 'Institution / University'],
                  ['degree', 'Degree / Qualification'],
                  ['period', 'Period (e.g. 2019 – 2021)'],
                  ['gpa', 'GPA / Grade (optional)'],
                  ...(isATS ? [['board', 'Board / University (optional)'], ['specialization', 'Specialization (optional)']] : []),
                ].map(([f, l]) => (
                  <div className="form-group" key={f}>
                    <label className="form-label">{l}</label>
                    <input className="input-field" value={edu[f] || ''} onChange={e => updateEdu(edu.id, f, e.target.value)} placeholder={l} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* ── CORE SKILLS ── */}
        {activeSection === 'skills' && (
          <div>
            <h3 className="cveditor-section-title">Core Skills</h3>
            <div className="cveditor-tag-input form-group">
              <input
                className="input-field"
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSkill()}
                placeholder="Type a skill and press Enter"
              />
              <button className="btn btn-primary" onClick={addSkill}><Plus size={16} /></button>
            </div>
            <div className="cveditor-tags">
              {cvData.skills.map(s => (
                <span className="cveditor-tag" key={s}>
                  {s} <button onClick={() => removeSkill(s)}>×</button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── TECHNICAL & COMPUTER SKILLS (ATS only) ── */}
        {activeSection === 'technicalSkills' && (
          <div>
            <h3 className="cveditor-section-title">Technical &amp; Computer Skills</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1rem' }}>
              Add software tools, systems, and technical competencies (e.g. MS Excel, GDS Systems, SABRE).
            </p>
            <div className="cveditor-tag-input form-group">
              <input
                className="input-field"
                value={techInput}
                onChange={e => setTechInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTech()}
                placeholder="Type a tool/software and press Enter"
              />
              <button className="btn btn-primary" onClick={addTech}><Plus size={16} /></button>
            </div>
            <div className="cveditor-tags">
              {(cvData.technicalSkills || []).map(s => (
                <span className="cveditor-tag" key={s}>
                  {s} <button onClick={() => removeTech(s)}>×</button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── CERTIFICATIONS ── */}
        {activeSection === 'certifications' && (
          <div>
            <h3 className="cveditor-section-title">Certifications &amp; Professional Qualifications</h3>
            <div className="cveditor-tag-input form-group">
              <input
                className="input-field"
                value={certInput}
                onChange={e => setCertInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCert()}
                placeholder="Type a certification and press Enter"
              />
              <button className="btn btn-primary" onClick={addCert}><Plus size={16} /></button>
            </div>
            <div className="cveditor-tags">
              {(cvData.certifications || []).map(c => (
                <span className="cveditor-tag" key={c}>
                  {c} <button onClick={() => removeCert(c)}>×</button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── LANGUAGES (ATS only) ── */}
        {activeSection === 'languages' && (
          <div>
            <h3 className="cveditor-section-title">Languages</h3>
            <div className="cveditor-tag-input form-group">
              <input
                className="input-field"
                value={langInput}
                onChange={e => setLangInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addLang()}
                placeholder="e.g. English, Malayalam, Tamil"
              />
              <button className="btn btn-primary" onClick={addLang}><Plus size={16} /></button>
            </div>
            <div className="cveditor-tags">
              {(cvData.languages || []).map(l => (
                <span className="cveditor-tag" key={l}>
                  {l} <button onClick={() => removeLang(l)}>×</button>
                </span>
              ))}
            </div>
          </div>
        )}

      </section>
    </div>
  );
}
