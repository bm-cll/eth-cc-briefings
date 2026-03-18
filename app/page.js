'use client';

import { useState, useEffect, useCallback } from 'react';
import { MEETINGS, STATUS_LABELS } from './data';

const STORAGE_KEY = 'eth-cc-briefings-v1';
const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbyClgI5MOfjq0Lq6uxkK0BlBDhjF33fqLZw2BXKITYmP_F1styjvoTb3v2lUUH6ZfK0/exec';

function loadSubmissions() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveSubmissions(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

async function sendToSheets(meeting, formData) {
  try {
    await fetch(SHEETS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company: meeting.company,
        priority: meeting.priority,
        status: meeting.status === 'green' ? 'CBO Confirmed' : meeting.status === 'yellow' ? 'Awaiting' : 'Not Meeting',
        owner: meeting.owner,
        exec: meeting.exec,
        authorName: formData.authorName,
        cllAttendees: formData.cllAttendees,
        externalGuests: formData.externalGuests,
        accountContext: formData.accountContext,
        whatDoTheyCare: formData.whatDoTheyCare,
        meetingObjectives: formData.meetingObjectives,
        useCaseForCRE: formData.useCaseForCRE,
        otherProducts: formData.otherProducts,
        emailOutreach: formData.emailOutreach,
        additionalNotes: formData.additionalNotes,
      }),
    });
  } catch (err) {
    console.error('Failed to send to Google Sheets:', err);
  }
}

const TONES = [
  { id: 'professional', label: 'Professional', emoji: '\uD83D\uDCBC', desc: 'Clean and direct' },
  { id: 'warm', label: 'Warm & Personal', emoji: '\uD83E\uDD1D', desc: 'Relationship-first' },
  { id: 'executive', label: 'Executive', emoji: '\uD83D\uDC54', desc: 'C-suite to C-suite' },
  { id: 'casual', label: 'Casual Crypto', emoji: '\u26A1', desc: 'Industry insider' },
];

const P_COLORS = { P0: '#0f766e', P1: '#1d4ed8', P2: '#7c3aed' };

function buildPrompt(meeting, tone, customContext) {
  return `You are a GTM professional at Chainlink writing a scheduling email for ETH CC (Ethereum Community Conference). Write a concise, compelling outreach email to schedule an in-person meeting.

Details:
- Recipient: ${meeting.contact}${meeting.contactTitle ? `, ${meeting.contactTitle}` : ''} at ${meeting.company}
- Chainlink exec attending: ${meeting.exec} (Chief Business Officer)
- Sender/Rep: ${meeting.owner}
- Meeting context: ${meeting.brief}
- Priority: ${meeting.priority}
${customContext ? `- Additional context from rep: ${customContext}` : ''}

Scheduling details:
- Johann Eid is available on March 31 and April 1
- Meetings will be held at a private conference room at a hotel near the ETH CC venue
- Offer both dates and ask which works best for them
- Keep timing flexible

Tone: ${tone === 'professional' ? 'Professional and direct. Efficient, respectful of their time.' : tone === 'warm' ? 'Warm and relationship-focused. Reference the existing relationship. Friendly but purposeful.' : tone === 'executive' ? 'Executive-level. Brief, high-signal, implies mutual strategic value. No fluff.' : 'Casual crypto industry insider. Natural, not corporate. Like texting a peer you respect.'}

Rules:
- Keep it under 120 words
- Include a clear ask to meet at ETH CC on March 31 or April 1
- Mention Johann Eid (CBO) will be joining
- Mention the meeting will be at a private conference room near the venue (don't name a specific hotel)
- Don't be generic — reference the specific context
- Include a subject line on the first line formatted as "Subject: ..."
- End with a simple sign-off using just the rep's first name

Return ONLY the email, nothing else.`;
}

export default function Home() {
  const [tab, setTab] = useState('briefings');
  const [mounted, setMounted] = useState(false);

  const [submissions, setSubmissions] = useState({});
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [filterOwner, setFilterOwner] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [view, setView] = useState('list');

  const [outreachSelected, setOutreachSelected] = useState(null);
  const [tone, setTone] = useState('professional');
  const [customContext, setCustomContext] = useState('');
  const [email, setEmail] = useState('');
  const [genLoading, setGenLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [outreachFilterOwner, setOutreachFilterOwner] = useState('all');
  const [genError, setGenError] = useState('');

  const owners = [...new Set(MEETINGS.map(m => m.owner))].sort();

  useEffect(() => {
    setSubmissions(loadSubmissions());
    setMounted(true);
  }, []);

  const filtered = MEETINGS.filter(m => {
    if (filterOwner !== 'all' && m.owner !== filterOwner) return false;
    if (filterPriority !== 'all' && m.priority !== filterPriority) return false;
    return true;
  });

  const openForm = useCallback((meeting) => {
    const existing = submissions[meeting.id] || {};
    setFormData({
      authorName: existing.authorName || meeting.owner,
      cllAttendees: existing.cllAttendees || (meeting.exec.includes('Johann') ? 'Johann Eid (CBO)' + (meeting.exec.includes('Marko') ? ', Marko' : '') : meeting.exec),
      externalGuests: existing.externalGuests || meeting.contact,
      accountContext: existing.accountContext || '',
      whatDoTheyCare: existing.whatDoTheyCare || '',
      meetingObjectives: existing.meetingObjectives || '',
      useCaseForCRE: existing.useCaseForCRE ?? null,
      otherProducts: existing.otherProducts || '',
      emailOutreach: existing.emailOutreach || '',
      additionalNotes: existing.additionalNotes || '',
    });
    setSelectedMeeting(meeting);
    setView('form');
    setSavedMsg('');
    window.scrollTo(0, 0);
  }, [submissions]);

  const saveBriefing = async () => {
    if (!selectedMeeting) return;
    setSaving(true);
    const updated = {
      ...submissions,
      [selectedMeeting.id]: { ...formData, lastUpdated: new Date().toISOString() }
    };
    saveSubmissions(updated);
    setSubmissions(updated);
    await sendToSheets(selectedMeeting, formData);
    setSaving(false);
    setSavedMsg('Saved successfully \u2014 sent to tracker');
    setTimeout(() => setSavedMsg(''), 2500);
  };

  const isComplete = (id) => {
    const s = submissions[id];
    return s && s.accountContext && s.meetingObjectives && s.whatDoTheyCare;
  };

  const completionCount = MEETINGS.filter(m => isComplete(m.id)).length;

  const outreachFiltered = MEETINGS.filter(m => outreachFilterOwner === 'all' || m.owner === outreachFilterOwner);

  const generate = useCallback(async () => {
    if (!outreachSelected) return;
    setGenLoading(true);
    setEmail('');
    setGenError('');
    setCopied(false);
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: buildPrompt(outreachSelected, tone, customContext) }],
        }),
      });
      const data = await res.json();
      const text = data.content?.map(b => b.type === 'text' ? b.text : '').join('') || '';
      setEmail(text);
    } catch (err) {
      setGenError('Failed to generate \u2014 try again');
      console.error(err);
    }
    setGenLoading(false);
  }, [outreachSelected, tone, customContext]);

  const copyEmail = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!mounted) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ fontSize: 16, opacity: 0.5 }}>Loading...</p>
      </div>
    );
  }

  return (
    <>
      <header className="header">
        <div className="header-left">
          <div className="header-icon">E</div>
          <div>
            <h1>ETH CC \u2014 Meeting Hub</h1>
            <p className="header-subtitle">Johann Eid Executive Meeting Prep</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {tab === 'briefings' && (
            <div className="completion-badge">
              <span className="completion-label">Briefs: </span>
              <span className="completion-done" style={{ color: completionCount === MEETINGS.length ? '#22c55e' : '#f59e0b' }}>
                {completionCount}
              </span>
              <span className="completion-total">/{MEETINGS.length}</span>
            </div>
          )}
        </div>
      </header>

      <div className="tab-bar">
        <button className={`tab-btn${tab === 'briefings' ? ' active' : ''}`} onClick={() => setTab('briefings')}>
          {'\uD83D\uDCCB'} Briefings
        </button>
        <button className={`tab-btn${tab === 'outreach' ? ' active' : ''}`} onClick={() => setTab('outreach')}>
          {'\u2709\uFE0F'} Outreach Generator
        </button>
      </div>

      {tab === 'briefings' && (
        <>
          {view === 'list' ? (
            <div className="container">
              <div className="filters">
                <select className="filter-select" value={filterOwner} onChange={e => setFilterOwner(e.target.value)}>
                  <option value="all">All Owners</option>
                  {owners.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <select className="filter-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                  <option value="all">All Priorities</option>
                  <option value="P0">P0</option>
                  <option value="P1">P1</option>
                  <option value="P2">P2</option>
                </select>
                <span className="filter-count">{filtered.length} meeting{filtered.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="legend">
                <div className="legend-item"><div className="legend-dot" style={{ background: '#16a34a' }} />Confirmed</div>
                <div className="legend-item"><div className="legend-dot" style={{ background: '#d97706' }} />Awaiting</div>
                <div className="legend-item"><div className="legend-dot" style={{ background: '#dc2626' }} />Not Meeting</div>
              </div>
              <div className="meeting-list">
                {filtered.map(m => {
                  const done = isComplete(m.id);
                  return (
                    <div key={m.id} className={`meeting-card${done ? ' done' : ''}`} onClick={() => openForm(m)}>
                      <div style={{ minWidth: 0 }}>
                        <div className="meeting-header">
                          <span className="meeting-company">{m.company}</span>
                          <span className={`priority-badge ${m.priority.toLowerCase()}`}>{m.priority}</span>
                          <div className={`status-dot ${m.status}`} title={STATUS_LABELS[m.status]} />
                          {done && <span className="done-label">{'\u2713'} Brief submitted</span>}
                        </div>
                        <div className="meeting-meta">
                          <span>{m.contact}</span>
                          <span className="muted">Owner: {m.owner}</span>
                          <span className="muted">Exec: {m.exec}</span>
                        </div>
                      </div>
                      <div className="meeting-arrow">{'\u2192'}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="container" style={{ maxWidth: 720 }}>
              <button className="back-btn" onClick={() => setView('list')}>{'\u2190'} Back to meetings</button>
              <div className="form-header">
                <div className="form-header-badges">
                  <h2>{selectedMeeting.company}</h2>
                  <span className={`priority-badge ${selectedMeeting.priority.toLowerCase()}`}>{selectedMeeting.priority}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 5,
                    background: selectedMeeting.status === 'green' ? 'rgba(22,163,74,0.1)' : 'rgba(217,119,6,0.1)',
                    color: selectedMeeting.status === 'green' ? '#16a34a' : '#d97706',
                  }}>
                    {STATUS_LABELS[selectedMeeting.status]}
                  </span>
                </div>
                <div className="form-header-info">
                  <strong>External Guest:</strong> {selectedMeeting.contact}<br />
                  <strong>Owner:</strong> {selectedMeeting.owner} &nbsp;|&nbsp; <strong>Exec:</strong> {selectedMeeting.exec}<br />
                  <strong>Tracker Note:</strong> {selectedMeeting.brief}
                </div>
              </div>
              <div className="form-fields">
                <Field label="Your Name (Author)" value={formData.authorName} onChange={v => setFormData(p => ({ ...p, authorName: v }))} placeholder="e.g. Raoul Schipper" />
                <Field label="CLL Meeting Attendees" value={formData.cllAttendees} onChange={v => setFormData(p => ({ ...p, cllAttendees: v }))} placeholder="e.g. Johann Eid (CBO), Marko" helpText="Who from Chainlink will attend?" />
                <Field label="External Guests (Name, Title, LinkedIn, Email)" value={formData.externalGuests} onChange={v => setFormData(p => ({ ...p, externalGuests: v }))} placeholder="e.g. Stani Kulechov, CEO of Aave" textarea rows={2} />
                <Field label="Account Context" required value={formData.accountContext} onChange={v => setFormData(p => ({ ...p, accountContext: v }))} placeholder="Background on the relationship, current deal status, recent touchpoints..." textarea rows={4} helpText="Be specific \u2014 Johann will read this before the meeting." />
                <Field label="What does the external guest care about?" required value={formData.whatDoTheyCare} onChange={v => setFormData(p => ({ ...p, whatDoTheyCare: v }))} placeholder="Their priorities, pain points, what matters to them right now..." textarea rows={3} />
                <Field label="Meeting Objectives \u2014 Chainlink" required value={formData.meetingObjectives} onChange={v => setFormData(p => ({ ...p, meetingObjectives: v }))} placeholder={"1. \n2. \n3. "} textarea rows={4} helpText="What do we want to achieve? Be concrete." />
                <div className="toggle-row">
                  <div className="toggle-group">
                    <label>Use Case for CRE?</label>
                    <div className="toggle-options">
                      <button type="button" className={`toggle-btn${formData.useCaseForCRE === true ? ' active-yes' : ''}`} onClick={() => setFormData(p => ({ ...p, useCaseForCRE: true }))}>Yes</button>
                      <button type="button" className={`toggle-btn${formData.useCaseForCRE === false ? ' active-no' : ''}`} onClick={() => setFormData(p => ({ ...p, useCaseForCRE: false }))}>No</button>
                    </div>
                  </div>
                  <div className="toggle-group">
                    <label>Other Products?</label>
                    <div style={{ width: '100%' }}><input type="text" className="field-input" value={formData.otherProducts || ''} onChange={e => setFormData(p => ({ ...p, otherProducts: e.target.value }))} placeholder="e.g. CCIP, SVR, Data Feeds, VRF..." /></div>
                  </div>
                </div>
                <Field label="Email Outreach Template (if relevant)" value={formData.emailOutreach} onChange={v => setFormData(p => ({ ...p, emailOutreach: v }))} placeholder="Draft outreach email if not confirmed yet..." textarea rows={3} />
                <Field label="Additional Notes" value={formData.additionalNotes} onChange={v => setFormData(p => ({ ...p, additionalNotes: v }))} placeholder="Sensitivities, timing, dinner invite status..." textarea rows={2} />
              </div>
              <div className="save-area">
                <button className="save-btn" onClick={saveBriefing} disabled={saving}>{saving ? 'Saving...' : 'Save Briefing'}</button>
                {savedMsg && <span className={`save-msg ${savedMsg.includes('Error') ? 'error' : 'success'}`}>{savedMsg}</span>}
              </div>
              {submissions[selectedMeeting.id]?.lastUpdated && <p className="last-updated">Last updated: {new Date(submissions[selectedMeeting.id].lastUpdated).toLocaleString()}</p>}
            </div>
          )}
        </>
      )}

      {tab === 'outreach' && (
        <div className="outreach-layout">
          <div className="outreach-sidebar">
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
              <select className="filter-select" style={{ width: '100%' }} value={outreachFilterOwner} onChange={e => setOutreachFilterOwner(e.target.value)}>
                <option value="all">All Reps ({MEETINGS.length})</option>
                {owners.map(o => <option key={o} value={o}>{o} ({MEETINGS.filter(m => m.owner === o).length})</option>)}
              </select>
            </div>
            <div className="outreach-sidebar-list">
              {outreachFiltered.map(m => (
                <div key={m.id} className={`outreach-sidebar-item${outreachSelected?.id === m.id ? ' active' : ''}`}
                  onClick={() => { setOutreachSelected(m); setEmail(''); setGenError(''); setCopied(false); }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                    <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: outreachSelected?.id === m.id ? 'rgba(255,255,255,0.6)' : P_COLORS[m.priority] }}>{m.priority}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.company}</span>
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.55, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {m.contact} {'\u2192'} {m.owner}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="outreach-main">
            {!outreachSelected ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 36 }}>{'\u2190'}</span>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>Select a meeting to generate an outreach email</p>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span className={`priority-badge ${outreachSelected.priority.toLowerCase()}`}>{outreachSelected.priority}</span>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{outreachSelected.company}</h2>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '4px 0 0' }}>
                    <strong style={{ color: 'var(--text-label)' }}>{outreachSelected.contact}</strong>
                    {outreachSelected.contactTitle ? `, ${outreachSelected.contactTitle}` : ''} &nbsp;·&nbsp; Rep: {outreachSelected.owner} &nbsp;·&nbsp; Exec: {outreachSelected.exec}
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, margin: '4px 0 0', fontStyle: 'italic' }}>{outreachSelected.brief}</p>
                  <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, fontSize: 12, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)', color: 'var(--text-secondary)' }}>
                    {'\uD83D\uDCC5'} <strong style={{ color: 'var(--text-label)' }}>Availability:</strong> March 31 & April 1 &nbsp;·&nbsp; Private conference room near ETH CC venue
                  </div>
                </div>

                <div style={{ marginBottom: 18 }}>
                  <label className="outreach-label">Tone</label>
                  <div className="tone-grid">
                    {TONES.map(t => (
                      <button key={t.id} onClick={() => setTone(t.id)} className={`tone-btn${tone === t.id ? ' active' : ''}`}>
                        <div style={{ fontSize: 18, marginBottom: 2 }}>{t.emoji}</div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{t.label}</div>
                        <div style={{ fontSize: 10, opacity: 0.6, marginTop: 1 }}>{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 18 }}>
                  <label className="outreach-label">Extra context <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                  <textarea className="field-textarea" value={customContext} onChange={e => setCustomContext(e.target.value)}
                    placeholder="e.g. We met briefly at DevConnect last year, they're keen to move fast on this..." rows={2} />
                </div>

                <button onClick={generate} disabled={genLoading} className="generate-btn">
                  {genLoading ? <><span className="spin">{'\u26A1'}</span> Generating...</> : <>{'\u26A1'} Generate Outreach Email</>}
                </button>

                {genError && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 8 }}>{genError}</p>}

                {email && (
                  <div style={{ marginTop: 22 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <label className="outreach-label" style={{ marginBottom: 0 }}>Generated Email</label>
                      <button onClick={copyEmail} className={`copy-btn${copied ? ' copied' : ''}`}>{copied ? '\u2713 Copied!' : 'Copy'}</button>
                    </div>
                    <div className="email-output">{email}</div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                      <button onClick={generate} className="action-btn secondary">{'\uD83D\uDD04'} Regenerate</button>
                      <button onClick={() => {
                        const subjectMatch = email.match(/Subject:\s*(.+)/i);
                        const subject = subjectMatch ? subjectMatch[1].trim() : 'ETH CC Meeting';
                        const body = email.replace(/Subject:\s*.+\n?\n?/i, '').trim();
                        window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
                      }} className="action-btn primary">{'\u2709\uFE0F'} Open in Mail</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, value, onChange, placeholder, textarea, rows, helpText, required }) {
  return (
    <div className="field-group">
      <label>{label}{required && <span className="required">*</span>}</label>
      {helpText && <p className="help-text">{helpText}</p>}
      {textarea ? (
        <textarea className="field-textarea" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} />
      ) : (
        <input type="text" className="field-input" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </div>
  );
}
