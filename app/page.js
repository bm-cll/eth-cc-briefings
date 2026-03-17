'use client';

import { useState, useEffect, useCallback } from 'react';
import { MEETINGS, STATUS_LABELS } from './data';

const STORAGE_KEY = 'eth-cc-briefings-v1';

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

export default function Home() {
  const [submissions, setSubmissions] = useState({});
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [filterOwner, setFilterOwner] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [view, setView] = useState('list');
  const [mounted, setMounted] = useState(false);

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

  const saveBriefing = () => {
    if (!selectedMeeting) return;
    setSaving(true);
    const updated = {
      ...submissions,
      [selectedMeeting.id]: { ...formData, lastUpdated: new Date().toISOString() }
    };
    saveSubmissions(updated);
    setSubmissions(updated);
    setSaving(false);
    setSavedMsg('Saved successfully');
    setTimeout(() => setSavedMsg(''), 2500);
  };

  const isComplete = (id) => {
    const s = submissions[id];
    return s && s.accountContext && s.meetingObjectives && s.whatDoTheyCare;
  };

  const completionCount = MEETINGS.filter(m => isComplete(m.id)).length;

  if (!mounted) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ fontSize: 16, opacity: 0.5 }}>Loading...</p>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="header-icon">E</div>
          <div>
            <h1>ETH CC — CBO Briefing Submissions</h1>
            <p className="header-subtitle">Johann Eid Executive Meeting Prep</p>
          </div>
        </div>
        <div className="completion-badge">
          <span className="completion-label">Completed: </span>
          <span className="completion-done" style={{ color: completionCount === MEETINGS.length ? '#22c55e' : '#f59e0b' }}>
            {completionCount}
          </span>
          <span className="completion-total">/{MEETINGS.length}</span>
        </div>
      </header>

      {view === 'list' ? (
        <div className="container">
          {/* Filters */}
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

          {/* Legend */}
          <div className="legend">
            <div className="legend-item"><div className="legend-dot" style={{ background: '#16a34a' }} />Confirmed</div>
            <div className="legend-item"><div className="legend-dot" style={{ background: '#d97706' }} />Awaiting</div>
            <div className="legend-item"><div className="legend-dot" style={{ background: '#dc2626' }} />Not Meeting</div>
          </div>

          {/* Meeting List */}
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
                      {done && <span className="done-label">✓ Brief submitted</span>}
                    </div>
                    <div className="meeting-meta">
                      <span>{m.contact}</span>
                      <span className="muted">Owner: {m.owner}</span>
                      <span className="muted">Exec: {m.exec}</span>
                    </div>
                  </div>
                  <div className="meeting-arrow">→</div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Form View */
        <div className="container" style={{ maxWidth: 720 }}>
          <button className="back-btn" onClick={() => setView('list')}>← Back to meetings</button>

          {/* Meeting Info Card */}
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

          {/* Form Fields */}
          <div className="form-fields">
            <Field label="Your Name (Author)" value={formData.authorName}
              onChange={v => setFormData(p => ({ ...p, authorName: v }))}
              placeholder="e.g. Raoul Schipper" />

            <Field label="CLL Meeting Attendees" value={formData.cllAttendees}
              onChange={v => setFormData(p => ({ ...p, cllAttendees: v }))}
              placeholder="e.g. Johann Eid (CBO), Marko"
              helpText="Who from Chainlink will attend?" />

            <Field label="External Guests (Name, Title, LinkedIn, Email)" value={formData.externalGuests}
              onChange={v => setFormData(p => ({ ...p, externalGuests: v }))}
              placeholder="e.g. Stani Kulechov, CEO of Aave, linkedin.com/in/..., stani@aave.com"
              textarea rows={2} />

            <Field label="Account Context" required value={formData.accountContext}
              onChange={v => setFormData(p => ({ ...p, accountContext: v }))}
              placeholder="Background on the relationship, current deal status, recent touchpoints, any context Johann needs going in..."
              textarea rows={4}
              helpText="Be specific — Johann will read this before the meeting." />

            <Field label="What does the external guest care about?" required value={formData.whatDoTheyCare}
              onChange={v => setFormData(p => ({ ...p, whatDoTheyCare: v }))}
              placeholder="Their priorities, pain points, what matters to them right now..."
              textarea rows={3} />

            <Field label="Meeting Objectives — Chainlink" required value={formData.meetingObjectives}
              onChange={v => setFormData(p => ({ ...p, meetingObjectives: v }))}
              placeholder={"1. \n2. \n3. "}
              textarea rows={4}
              helpText="What do we want to achieve? Be concrete." />

            {/* Two new toggle fields */}
            <div className="toggle-row">
              <div className="toggle-group">
                <label>Use Case for CRE?</label>
                <div className="toggle-options">
                  <button type="button"
                    className={`toggle-btn${formData.useCaseForCRE === true ? ' active-yes' : ''}`}
                    onClick={() => setFormData(p => ({ ...p, useCaseForCRE: true }))}>
                    Yes
                  </button>
                  <button type="button"
                    className={`toggle-btn${formData.useCaseForCRE === false ? ' active-no' : ''}`}
                    onClick={() => setFormData(p => ({ ...p, useCaseForCRE: false }))}>
                    No
                  </button>
                </div>
              </div>

              <div className="toggle-group">
                <label>Other Products?</label>
                <div style={{ width: '100%' }}>
                  <input type="text" className="field-input"
                    value={formData.otherProducts || ''}
                    onChange={e => setFormData(p => ({ ...p, otherProducts: e.target.value }))}
                    placeholder="e.g. CCIP, SVR, Data Feeds, VRF..." />
                </div>
              </div>
            </div>

            <Field label="Email Outreach Template (if relevant)" value={formData.emailOutreach}
              onChange={v => setFormData(p => ({ ...p, emailOutreach: v }))}
              placeholder="Draft outreach email if this meeting hasn't been confirmed yet..."
              textarea rows={3} />

            <Field label="Additional Notes" value={formData.additionalNotes}
              onChange={v => setFormData(p => ({ ...p, additionalNotes: v }))}
              placeholder="Sensitivities, timing, things to avoid, dinner invite status..."
              textarea rows={2} />
          </div>

          {/* Save */}
          <div className="save-area">
            <button className="save-btn" onClick={saveBriefing} disabled={saving}>
              {saving ? 'Saving...' : 'Save Briefing'}
            </button>
            {savedMsg && (
              <span className={`save-msg ${savedMsg.includes('Error') ? 'error' : 'success'}`}>{savedMsg}</span>
            )}
          </div>
          {submissions[selectedMeeting.id]?.lastUpdated && (
            <p className="last-updated">Last updated: {new Date(submissions[selectedMeeting.id].lastUpdated).toLocaleString()}</p>
          )}
        </div>
      )}
    </>
  );
}

function Field({ label, value, onChange, placeholder, textarea, rows, helpText, required }) {
  return (
    <div className="field-group">
      <label>
        {label}
        {required && <span className="required">*</span>}
      </label>
      {helpText && <p className="help-text">{helpText}</p>}
      {textarea ? (
        <textarea className="field-textarea" value={value || ''} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} rows={rows} />
      ) : (
        <input type="text" className="field-input" value={value || ''} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} />
      )}
    </div>
  );
}
