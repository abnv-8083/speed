import React, { forwardRef } from 'react';
import './CVPreview.css';

// ─── MODERN ────────────────────────────────────────────────────
function ModernTemplate({ data }) {
  const { personal, experience, education, skills, certifications, training, technicalSkills, languages } = data;
  return (
    <div className="cv-modern">
      <aside className="cv-modern-sidebar">
        <div className="cv-modern-avatar">{personal.name?.charAt(0) || 'A'}</div>
        <h1 className="cv-modern-name">{personal.name}</h1>
        <p className="cv-modern-title">{personal.title}</p>
        <div className="cv-modern-divider" />
        <div className="cv-modern-contact">
          <p>✉ {personal.email}</p>
          <p>📞 {personal.phone}</p>
          <p>📍 {personal.location}</p>
          {personal.website && <p>🌐 {personal.website}</p>}
        </div>
        <div className="cv-modern-divider" />
        <h4>Skills</h4>
        <div className="cv-modern-skills">
          {skills.map(s => <span key={s} className="cv-modern-skill">{s}</span>)}
        </div>
        {technicalSkills?.length > 0 && (<>
          <div className="cv-modern-divider" />
          <h4>Tech Skills</h4>
          <div className="cv-modern-skills">
            {technicalSkills.map(s => <span key={s} className="cv-modern-skill">{s}</span>)}
          </div>
        </>)}
        {languages?.length > 0 && (<>
          <div className="cv-modern-divider" />
          <h4>Languages</h4>
          {languages.map(l => <p key={l} className="cv-modern-cert">• {l}</p>)}
        </>)}
        {certifications?.length > 0 && (<>
          <div className="cv-modern-divider" />
          <h4>Certifications</h4>
          {certifications.map(c => <p key={c} className="cv-modern-cert">• {c}</p>)}
        </>)}
      </aside>
      <main className="cv-modern-body">
        <section className="cv-modern-section"><h2>Profile</h2><p>{personal.summary}</p></section>
        <section className="cv-modern-section">
          <h2>Experience</h2>
          {experience.map(exp => (
            <div key={exp.id} className="cv-modern-entry">
              <div className="cv-modern-entry-header"><strong>{exp.role}</strong><span className="cv-modern-period">{exp.period}</span></div>
              <span className="cv-modern-company">{exp.company}</span>
              <p>{exp.description}</p>
            </div>
          ))}
        </section>
        {training?.length > 0 && (
          <section className="cv-modern-section">
            <h2>Training &amp; Internship</h2>
            {training.map(t => (
              <div key={t.id} className="cv-modern-entry">
                <div className="cv-modern-entry-header"><strong>{t.role}</strong><span className="cv-modern-period">{t.period}</span></div>
                <span className="cv-modern-company">{t.organization}</span>
                <p>{t.description}</p>
              </div>
            ))}
          </section>
        )}
        <section className="cv-modern-section">
          <h2>Education</h2>
          {education.map(edu => (
            <div key={edu.id} className="cv-modern-entry">
              <div className="cv-modern-entry-header"><strong>{edu.degree}</strong><span className="cv-modern-period">{edu.period}</span></div>
              <span className="cv-modern-company">{edu.institution}</span>
              {edu.gpa && <p>GPA: {edu.gpa}</p>}
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

// ─── MINIMAL ───────────────────────────────────────────────────
function MinimalTemplate({ data }) {
  const { personal, experience, education, skills, certifications, training, technicalSkills, languages } = data;
  return (
    <div className="cv-minimal">
      <header className="cv-minimal-header">
        <h1>{personal.name}</h1>
        <p className="cv-minimal-title">{personal.title}</p>
        <div className="cv-minimal-contact">
          <span>{personal.email}</span><span>•</span><span>{personal.phone}</span><span>•</span><span>{personal.location}</span>
          {personal.website && <><span>•</span><span>{personal.website}</span></>}
        </div>
      </header>
      <hr className="cv-minimal-divider" />
      <section className="cv-minimal-section"><p className="cv-minimal-summary">{personal.summary}</p></section>
      <hr className="cv-minimal-divider" />
      <section className="cv-minimal-section">
        <h2>Experience</h2>
        {experience.map(exp => (
          <div key={exp.id} className="cv-minimal-entry">
            <div className="cv-minimal-meta"><strong>{exp.role}</strong> — <span>{exp.company}</span><span className="cv-minimal-period">{exp.period}</span></div>
            <p>{exp.description}</p>
          </div>
        ))}
      </section>
      {training?.length > 0 && (<><hr className="cv-minimal-divider" />
        <section className="cv-minimal-section">
          <h2>Training &amp; Internship</h2>
          {training.map(t => (
            <div key={t.id} className="cv-minimal-entry">
              <div className="cv-minimal-meta"><strong>{t.role}</strong> — <span>{t.organization}</span><span className="cv-minimal-period">{t.period}</span></div>
              <p>{t.description}</p>
            </div>
          ))}
        </section>
      </>)}
      <hr className="cv-minimal-divider" />
      <section className="cv-minimal-section">
        <h2>Education</h2>
        {education.map(edu => (
          <div key={edu.id} className="cv-minimal-entry">
            <div className="cv-minimal-meta"><strong>{edu.degree}</strong> — <span>{edu.institution}</span><span className="cv-minimal-period">{edu.period}</span></div>
            {edu.gpa && <p>GPA: {edu.gpa}</p>}
          </div>
        ))}
      </section>
      <hr className="cv-minimal-divider" />
      <section className="cv-minimal-section">
        <h2>Skills</h2>
        <div className="cv-minimal-skills">{skills.map(s => <span key={s} className="cv-minimal-skill">{s}</span>)}</div>
      </section>
      {technicalSkills?.length > 0 && (<><hr className="cv-minimal-divider" />
        <section className="cv-minimal-section">
          <h2>Technical Skills</h2>
          <div className="cv-minimal-skills">{technicalSkills.map(s => <span key={s} className="cv-minimal-skill">{s}</span>)}</div>
        </section>
      </>)}
      {certifications?.length > 0 && (<><hr className="cv-minimal-divider" />
        <section className="cv-minimal-section"><h2>Certifications</h2><ul>{certifications.map(c => <li key={c}>{c}</li>)}</ul></section>
      </>)}
      {languages?.length > 0 && (<><hr className="cv-minimal-divider" />
        <section className="cv-minimal-section">
          <h2>Languages</h2>
          <div className="cv-minimal-skills">{languages.map(l => <span key={l} className="cv-minimal-skill">{l}</span>)}</div>
        </section>
      </>)}
    </div>
  );
}

// ─── EXECUTIVE ─────────────────────────────────────────────────
function ExecutiveTemplate({ data }) {
  const { personal, experience, education, skills, certifications, training, technicalSkills, languages } = data;
  return (
    <div className="cv-executive">
      <header className="cv-executive-header">
        <div><h1>{personal.name}</h1><p className="cv-executive-title">{personal.title}</p></div>
        <div className="cv-executive-contact">
          <p>{personal.email}</p><p>{personal.phone}</p><p>{personal.location}</p>
          {personal.website && <p>{personal.website}</p>}
        </div>
      </header>
      <div className="cv-executive-body">
        <section className="cv-executive-section"><h2>Executive Summary</h2><p>{personal.summary}</p></section>
        <section className="cv-executive-section">
          <h2>Professional Experience</h2>
          {experience.map(exp => (
            <div key={exp.id} className="cv-executive-entry">
              <div className="cv-executive-entry-top">
                <div><strong>{exp.role}</strong><span className="cv-executive-company"> · {exp.company}</span></div>
                <span className="cv-executive-period">{exp.period}</span>
              </div>
              <p>{exp.description}</p>
            </div>
          ))}
        </section>
        {training?.length > 0 && (
          <section className="cv-executive-section">
            <h2>Training &amp; Internship</h2>
            {training.map(t => (
              <div key={t.id} className="cv-executive-entry">
                <div className="cv-executive-entry-top">
                  <div><strong>{t.role}</strong><span className="cv-executive-company"> · {t.organization}</span></div>
                  <span className="cv-executive-period">{t.period}</span>
                </div>
                <p>{t.description}</p>
              </div>
            ))}
          </section>
        )}
        <div className="cv-executive-cols">
          <section className="cv-executive-section">
            <h2>Education</h2>
            {education.map(edu => (
              <div key={edu.id} className="cv-executive-entry">
                <strong>{edu.degree}</strong>
                <p>{edu.institution}{edu.period && ` · ${edu.period}`}</p>
                {edu.gpa && <p>GPA: {edu.gpa}</p>}
              </div>
            ))}
          </section>
          <section className="cv-executive-section">
            <h2>Core Skills</h2>
            <div className="cv-executive-skills">{skills.map(s => <span key={s} className="cv-executive-skill">{s}</span>)}</div>
            {technicalSkills?.length > 0 && (<><h2 style={{ marginTop: '1rem' }}>Technical Skills</h2><div className="cv-executive-skills">{technicalSkills.map(s => <span key={s} className="cv-executive-skill">{s}</span>)}</div></>)}
            {languages?.length > 0 && (<><h2 style={{ marginTop: '1rem' }}>Languages</h2><div className="cv-executive-skills">{languages.map(l => <span key={l} className="cv-executive-skill">{l}</span>)}</div></>)}
            {certifications?.length > 0 && (<><h2 style={{ marginTop: '1rem' }}>Certifications</h2><ul>{certifications.map(c => <li key={c}>{c}</li>)}</ul></>)}
          </section>
        </div>
      </div>
    </div>
  );
}

// ─── CREATIVE ──────────────────────────────────────────────────
function CreativeTemplate({ data }) {
  const { personal, experience, education, skills, certifications, training, technicalSkills, languages } = data;
  return (
    <div className="cv-creative">
      <div className="cv-creative-stripe" />
      <div className="cv-creative-inner">
        <header className="cv-creative-header">
          <div className="cv-creative-name-block">
            <h1>{personal.name}</h1>
            <p className="cv-creative-title">{personal.title}</p>
          </div>
          <div className="cv-creative-contact">
            <span>✉ {personal.email}</span>
            <span>📞 {personal.phone}</span>
            <span>📍 {personal.location}</span>
            {personal.website && <span>🌐 {personal.website}</span>}
          </div>
        </header>

        <div className="cv-creative-body">
          <main className="cv-creative-main">
            <section className="cv-creative-section">
              <h2><span className="cv-creative-heading-bar" />About Me</h2>
              <p>{personal.summary}</p>
            </section>
            <section className="cv-creative-section">
              <h2><span className="cv-creative-heading-bar" />Experience</h2>
              {experience.map(exp => (
                <div key={exp.id} className="cv-creative-entry">
                  <div className="cv-creative-dot" />
                  <div className="cv-creative-entry-content">
                    <div className="cv-creative-entry-head">
                      <strong>{exp.role}</strong>
                      <span className="cv-creative-period">{exp.period}</span>
                    </div>
                    <span className="cv-creative-company">{exp.company}</span>
                    <p>{exp.description}</p>
                  </div>
                </div>
              ))}
            </section>
            {training?.length > 0 && (
              <section className="cv-creative-section">
                <h2><span className="cv-creative-heading-bar" />Training &amp; Internship</h2>
                {training.map(t => (
                  <div key={t.id} className="cv-creative-entry">
                    <div className="cv-creative-dot" />
                    <div className="cv-creative-entry-content">
                      <div className="cv-creative-entry-head">
                        <strong>{t.role}</strong>
                        <span className="cv-creative-period">{t.period}</span>
                      </div>
                      <span className="cv-creative-company">{t.organization}</span>
                      <p>{t.description}</p>
                    </div>
                  </div>
                ))}
              </section>
            )}
            <section className="cv-creative-section">
              <h2><span className="cv-creative-heading-bar" />Education</h2>
              {education.map(edu => (
                <div key={edu.id} className="cv-creative-entry">
                  <div className="cv-creative-dot" />
                  <div className="cv-creative-entry-content">
                    <div className="cv-creative-entry-head">
                      <strong>{edu.degree}</strong>
                      <span className="cv-creative-period">{edu.period}</span>
                    </div>
                    <span className="cv-creative-company">{edu.institution}</span>
                    {edu.gpa && <p>GPA: {edu.gpa}</p>}
                  </div>
                </div>
              ))}
            </section>
          </main>
          <aside className="cv-creative-sidebar">
            <section className="cv-creative-side-section">
              <h3>Skills</h3>
              <div className="cv-creative-skills">
                {skills.map(s => <span key={s} className="cv-creative-skill">{s}</span>)}
              </div>
            </section>
            {technicalSkills?.length > 0 && (
              <section className="cv-creative-side-section">
                <h3>Tech Skills</h3>
                <div className="cv-creative-skills">
                  {technicalSkills.map(s => <span key={s} className="cv-creative-skill">{s}</span>)}
                </div>
              </section>
            )}
            {languages?.length > 0 && (
              <section className="cv-creative-side-section">
                <h3>Languages</h3>
                {languages.map(l => <p key={l} className="cv-creative-cert">◉ {l}</p>)}
              </section>
            )}
            {certifications?.length > 0 && (
              <section className="cv-creative-side-section">
                <h3>Certifications</h3>
                {certifications.map(c => <p key={c} className="cv-creative-cert">✓ {c}</p>)}
              </section>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

// ─── TECH ──────────────────────────────────────────────────────
function TechTemplate({ data }) {
  const { personal, experience, education, skills, certifications, training, technicalSkills, languages } = data;
  return (
    <div className="cv-tech">
      <header className="cv-tech-header">
        <div className="cv-tech-window-dots">
          <span style={{ background: '#ef4444' }} />
          <span style={{ background: '#f59e0b' }} />
          <span style={{ background: '#22c55e' }} />
        </div>
        <div className="cv-tech-title-block">
          <h1>{personal.name}</h1>
          <p className="cv-tech-role"><span className="cv-tech-prompt">$</span> {personal.title}</p>
        </div>
        <div className="cv-tech-contact">
          <p><span className="cv-tech-key">email</span><span className="cv-tech-colon">:</span> {personal.email}</p>
          <p><span className="cv-tech-key">phone</span><span className="cv-tech-colon">:</span> {personal.phone}</p>
          <p><span className="cv-tech-key">location</span><span className="cv-tech-colon">:</span> {personal.location}</p>
          {personal.website && <p><span className="cv-tech-key">web</span><span className="cv-tech-colon">:</span> {personal.website}</p>}
        </div>
      </header>
      <div className="cv-tech-body">
        <section className="cv-tech-section">
          <h2><span className="cv-tech-hash">##</span> Summary</h2>
          <p>{personal.summary}</p>
        </section>
        <section className="cv-tech-section">
          <h2><span className="cv-tech-hash">##</span> Experience</h2>
          {experience.map(exp => (
            <div key={exp.id} className="cv-tech-entry">
              <div className="cv-tech-entry-head">
                <span className="cv-tech-arrow">▶</span>
                <strong>{exp.role}</strong>
                <span className="cv-tech-at">@</span>
                <span className="cv-tech-company">{exp.company}</span>
                <span className="cv-tech-period">{exp.period}</span>
              </div>
              <p className="cv-tech-desc">{exp.description}</p>
            </div>
          ))}
        </section>
        <div className="cv-tech-cols">
          <section className="cv-tech-section">
            <h2><span className="cv-tech-hash">##</span> Education</h2>
            {education.map(edu => (
              <div key={edu.id} className="cv-tech-entry">
                <div className="cv-tech-entry-head">
                  <span className="cv-tech-arrow">▶</span>
                  <strong>{edu.degree}</strong>
                </div>
                <p className="cv-tech-desc">{edu.institution}{edu.period && ` · ${edu.period}`}</p>
                {edu.gpa && <p className="cv-tech-desc">GPA: {edu.gpa}</p>}
              </div>
            ))}
          </section>
          <section className="cv-tech-section">
            <h2><span className="cv-tech-hash">##</span> Stack</h2>
            <div className="cv-tech-skills">
              {skills.map(s => <span key={s} className="cv-tech-skill">{s}</span>)}
            </div>
            {technicalSkills?.length > 0 && (<>
              <h2 style={{ marginTop: '0.75rem' }}><span className="cv-tech-hash">##</span> Tech</h2>
              <div className="cv-tech-skills">
                {technicalSkills.map(s => <span key={s} className="cv-tech-skill">{s}</span>)}
              </div>
            </>)}
            {languages?.length > 0 && (<>
              <h2 style={{ marginTop: '0.75rem' }}><span className="cv-tech-hash">##</span> Languages</h2>
              {languages.map(l => <p key={l} className="cv-tech-cert">• {l}</p>)}
            </>)}
            {certifications?.length > 0 && (<>
              <h2 style={{ marginTop: '0.75rem' }}><span className="cv-tech-hash">##</span> Certs</h2>
              {certifications.map(c => <p key={c} className="cv-tech-cert">• {c}</p>)}
            </>)}
          </section>
        </div>
        {training?.length > 0 && (
          <section className="cv-tech-section" style={{ marginTop: '0.5rem' }}>
            <h2><span className="cv-tech-hash">##</span> Training</h2>
            {training.map(t => (
              <div key={t.id} className="cv-tech-entry">
                <div className="cv-tech-entry-head">
                  <span className="cv-tech-arrow">▶</span>
                  <strong>{t.role}</strong>
                  <span className="cv-tech-at">@</span>
                  <span className="cv-tech-company">{t.organization}</span>
                  <span className="cv-tech-period">{t.period}</span>
                </div>
                <p className="cv-tech-desc">{t.description}</p>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

// ─── ELEGANT ───────────────────────────────────────────────────
function ElegantTemplate({ data }) {
  const { personal, experience, education, skills, certifications, training, technicalSkills, languages } = data;
  return (
    <div className="cv-elegant">
      <header className="cv-elegant-header">
        <div className="cv-elegant-ornament">❧</div>
        <h1>{personal.name}</h1>
        <p className="cv-elegant-title">{personal.title}</p>
        <div className="cv-elegant-rule"><span /><span className="cv-elegant-diamond">◆</span><span /></div>
        <div className="cv-elegant-contact">
          <span>{personal.email}</span>
          <span className="cv-elegant-sep">|</span>
          <span>{personal.phone}</span>
          <span className="cv-elegant-sep">|</span>
          <span>{personal.location}</span>
          {personal.website && <><span className="cv-elegant-sep">|</span><span>{personal.website}</span></>}
        </div>
      </header>

      <div className="cv-elegant-body">
        <section className="cv-elegant-section">
          <h2><span className="cv-elegant-section-line" />Profile<span className="cv-elegant-section-line" /></h2>
          <p className="cv-elegant-summary">{personal.summary}</p>
        </section>

        <section className="cv-elegant-section">
          <h2><span className="cv-elegant-section-line" />Experience<span className="cv-elegant-section-line" /></h2>
          {experience.map(exp => (
            <div key={exp.id} className="cv-elegant-entry">
              <div className="cv-elegant-entry-head">
                <strong>{exp.role}</strong>
                <span className="cv-elegant-period">{exp.period}</span>
              </div>
              <p className="cv-elegant-company">{exp.company}</p>
              <p>{exp.description}</p>
            </div>
          ))}
        </section>

        {training?.length > 0 && (
          <section className="cv-elegant-section">
            <h2><span className="cv-elegant-section-line" />Training &amp; Internship<span className="cv-elegant-section-line" /></h2>
            {training.map(t => (
              <div key={t.id} className="cv-elegant-entry">
                <div className="cv-elegant-entry-head">
                  <strong>{t.role}</strong>
                  <span className="cv-elegant-period">{t.period}</span>
                </div>
                <p className="cv-elegant-company">{t.organization}</p>
                <p>{t.description}</p>
              </div>
            ))}
          </section>
        )}

        <div className="cv-elegant-cols">
          <section className="cv-elegant-section">
            <h2><span className="cv-elegant-section-line" />Education<span className="cv-elegant-section-line" /></h2>
            {education.map(edu => (
              <div key={edu.id} className="cv-elegant-entry">
                <div className="cv-elegant-entry-head">
                  <strong>{edu.degree}</strong>
                  <span className="cv-elegant-period">{edu.period}</span>
                </div>
                <p className="cv-elegant-company">{edu.institution}</p>
                {edu.gpa && <p>GPA: {edu.gpa}</p>}
              </div>
            ))}
          </section>
          <section className="cv-elegant-section">
            <h2><span className="cv-elegant-section-line" />Skills<span className="cv-elegant-section-line" /></h2>
            <div className="cv-elegant-skills">
              {skills.map(s => <span key={s} className="cv-elegant-skill">{s}</span>)}
            </div>
            {technicalSkills?.length > 0 && (<>
              <h2 style={{ marginTop: '1rem' }}><span className="cv-elegant-section-line" />Technical Skills<span className="cv-elegant-section-line" /></h2>
              <div className="cv-elegant-skills">{technicalSkills.map(s => <span key={s} className="cv-elegant-skill">{s}</span>)}</div>
            </>)}
            {languages?.length > 0 && (<>
              <h2 style={{ marginTop: '1rem' }}><span className="cv-elegant-section-line" />Languages<span className="cv-elegant-section-line" /></h2>
              <div className="cv-elegant-skills">{languages.map(l => <span key={l} className="cv-elegant-skill">{l}</span>)}</div>
            </>)}
            {certifications?.length > 0 && (<>
              <h2 style={{ marginTop: '1rem' }}><span className="cv-elegant-section-line" />Certifications<span className="cv-elegant-section-line" /></h2>
              <ul className="cv-elegant-certs">{certifications.map(c => <li key={c}>{c}</li>)}</ul>
            </>)}
          </section>
        </div>
      </div>
    </div>
  );
}

// ─── ATS helpers ───────────────────────────────────────────────
function ATSBullets({ text }) {
  if (!text) return null;
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const hasBullets = lines.some(l => /^[•\-*]/.test(l));
  if (hasBullets) {
    return (
      <ul className="cv-ats-bullets">
        {lines.map((l, i) => <li key={i}>{l.replace(/^[•\-*]\s*/, '')}</li>)}
      </ul>
    );
  }
  return <p className="cv-ats-entry-desc">{text}</p>;
}

// ─── ATS ───────────────────────────────────────────────────────
function ATSTemplate({ data }) {
  const { personal, experience, education, skills, certifications, training, technicalSkills, languages } = data;
  const hasPhoto = !!personal.photo;

  return (
    <div className="cv-ats">

      {/* ── Header ── */}
      <header className={`cv-ats-header ${hasPhoto ? 'cv-ats-header-withphoto' : ''}`}>
        {hasPhoto && (
          <img src={personal.photo} alt={personal.name} className="cv-ats-photo" />
        )}
        <div className="cv-ats-header-info">
          <h1>{personal.name}</h1>
          <p className="cv-ats-title">{personal.title}</p>
          <div className="cv-ats-contact">
            {personal.phone && <span>{personal.phone}</span>}
            {personal.phone && personal.email && <span className="cv-ats-contact-sep">|</span>}
            {personal.email && <span>{personal.email}</span>}
            {personal.location && <><span className="cv-ats-contact-sep">|</span><span>{personal.location}</span></>}
            {personal.website && <><span className="cv-ats-contact-sep">|</span><span>{personal.website}</span></>}
          </div>
        </div>
      </header>

      {/* ── Professional Summary ── */}
      {personal.summary && (
        <section className="cv-ats-section">
          <div className="cv-ats-section-title">Professional Summary</div>
          <p className="cv-ats-summary">{personal.summary}</p>
        </section>
      )}

      {/* ── Core Skills (two-column bullet grid) ── */}
      {skills?.length > 0 && (
        <section className="cv-ats-section">
          <div className="cv-ats-section-title">Core Skills</div>
          <div className="cv-ats-skills-cols">
            {skills.map(s => (
              <div key={s} className="cv-ats-skill-item">• {s}</div>
            ))}
          </div>
        </section>
      )}

      {/* ── Professional Experience ── */}
      {experience?.length > 0 && (
        <section className="cv-ats-section">
          <div className="cv-ats-section-title">Professional Experience</div>
          {experience.map(exp => (
            <div key={exp.id} className="cv-ats-entry">
              <div className="cv-ats-entry-role-line">
                <strong>{exp.role}</strong>
              </div>
              {(exp.company || exp.period) && (
                <div className="cv-ats-entry-company-line">
                  {exp.company && <span className="cv-ats-entry-company">{exp.company}</span>}
                  {exp.period && <span className="cv-ats-entry-period">{exp.period}</span>}
                </div>
              )}
              <ATSBullets text={exp.description} />
            </div>
          ))}
        </section>
      )}

      {/* ── Training & Internship ── */}
      {training?.length > 0 && (
        <section className="cv-ats-section">
          <div className="cv-ats-section-title">Training &amp; Internship</div>
          {training.map(t => (
            <div key={t.id} className="cv-ats-entry">
              <div className="cv-ats-entry-role-line">
                <strong>{t.role}</strong>
              </div>
              {(t.organization || t.period) && (
                <div className="cv-ats-entry-company-line">
                  {t.organization && <span className="cv-ats-entry-company">{t.organization}</span>}
                  {t.period && <span className="cv-ats-entry-period">{t.period}</span>}
                </div>
              )}
              <ATSBullets text={t.description} />
            </div>
          ))}
        </section>
      )}

      {/* ── Aviation & Professional Certifications ── */}
      {certifications?.length > 0 && (
        <section className="cv-ats-section">
          <div className="cv-ats-section-title">Aviation &amp; Professional Certifications</div>
          <ul className="cv-ats-certs">
            {certifications.map(c => <li key={c}>{c}</li>)}
          </ul>
        </section>
      )}

      {/* ── Education ── */}
      {education?.length > 0 && (
        <section className="cv-ats-section">
          <div className="cv-ats-section-title">Education</div>
          <ul className="cv-ats-certs">
            {education.map(edu => (
              <li key={edu.id}>
                <strong>{edu.degree}</strong>
                {edu.specialization && ` | Specialization: ${edu.specialization}`}
                {edu.institution && ` | ${edu.institution}`}
                {edu.board && ` | ${edu.board}`}
                {edu.gpa && ` | ${edu.gpa}`}
                {edu.period && ` | ${edu.period}`}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Technical & Computer Skills ── */}
      {technicalSkills?.length > 0 && (
        <section className="cv-ats-section">
          <div className="cv-ats-section-title">Technical &amp; Computer Skills</div>
          <ul className="cv-ats-certs">
            {technicalSkills.map(s => <li key={s}>{s}</li>)}
          </ul>
        </section>
      )}

      {/* ── Languages ── */}
      {languages?.length > 0 && (
        <section className="cv-ats-section">
          <div className="cv-ats-section-title">Language</div>
          <ul className="cv-ats-certs">
            <li>{languages.join(' | ')}</li>
          </ul>
        </section>
      )}

    </div>
  );
}


// ─── WRAPPER ───────────────────────────────────────────────────
const CVPreview = forwardRef(function CVPreview({ cvData, template }, ref) {
  return (
    <div className="cv-preview-shell">
      <div className="cv-page" ref={ref}>
        {template === 'modern'    && <ModernTemplate    data={cvData} />}
        {template === 'minimal'   && <MinimalTemplate   data={cvData} />}
        {template === 'executive' && <ExecutiveTemplate data={cvData} />}
        {template === 'creative'  && <CreativeTemplate  data={cvData} />}
        {template === 'tech'      && <TechTemplate      data={cvData} />}
        {template === 'elegant'   && <ElegantTemplate   data={cvData} />}
        {template === 'ats'       && <ATSTemplate       data={cvData} />}
      </div>
    </div>
  );
});

export default CVPreview;
