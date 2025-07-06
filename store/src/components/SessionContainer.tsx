import React, { useState } from 'react';

interface Questionnaire {
  customer_entry: string;
  customer_segment: string;
  nationality: string;
}

const CustomerEntry = ["Royal rest", "HomeBox", "Lift"];
const CustomerSegmentation = ["Single - Male", "Single - Female", "Couple", "Couple with Children", "Large Family"];
const Nationality = ["National", "Arab Expats", "ISC", "SEAC", "Africans", "Western"];

interface SessionContainerProps {
  token: string;
  onLogout: () => void;
}

const SessionContainer: React.FC<SessionContainerProps> = ({ token, onLogout }) => {
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [questionnaire, setQuestionnaire] = useState<Questionnaire>({
    customer_entry: '',
    customer_segment: '',
    nationality: ''
  });
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const API_BASE = 'http://localhost:8080/api';

  const startSession = async () => {
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ checkin_time: new Date().toISOString() })
      });
      const data = await res.json();
      if (data.sessionId) {
        setSessionId(data.sessionId);
        setShowQuestionnaire(true);
      } else {
        setMsg('Could not start session.');
      }
    } catch (err) {
      setMsg('Network error');
    }
    setLoading(false);
  };

  const submitQuestionnaire = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId) return;
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/questionnaire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify(questionnaire)
      });
      if (res.ok) {
        setShowQuestionnaire(false);
        setMsg('Session started!');
      } else {
        const err = await res.json();
        setMsg(err.error || 'Invalid input.');
      }
    } catch (err) {
      setMsg('Network error');
    }
    setLoading(false);
  };

  return (
    <div className="container custom-container mt-5" id="session-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h2>Session</h2>
      <div className="d-grid gap-2 mb-3" style={{ maxWidth: 300, margin: '0 auto', display: 'flex', flexDirection: 'row', gap: '1rem' }}>
        <button id="start-session-btn" className="btn btn-success" onClick={startSession} disabled={loading || !!sessionId}>
          Start New Session
        </button>
        <button id="logout-btn" className="btn btn-outline-danger" onClick={onLogout}>
          Logout
        </button>
      </div>
      {showQuestionnaire && (
        <div className="modal show d-block" tabIndex={-1}>
          <div className="modal-dialog">
            <div className="modal-content bg-dark text-light">
              <div className="modal-header">
                <h5 className="modal-title">Session Questionnaire</h5>
              </div>
              <div className="modal-body">
                <form id="questionnaire-form" onSubmit={submitQuestionnaire}>
                  <div className="mb-3">
                    <label htmlFor="customer_entry" className="form-label">Customer Entry</label>
                    <select className="form-select" id="customer_entry" required value={questionnaire.customer_entry} onChange={e => setQuestionnaire(q => ({ ...q, customer_entry: e.target.value }))}>
                      <option value="">Select...</option>
                      {CustomerEntry.map(val => <option key={val} value={val}>{val}</option>)}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="customer_segment" className="form-label">Customer Segment</label>
                    <select className="form-select" id="customer_segment" required value={questionnaire.customer_segment} onChange={e => setQuestionnaire(q => ({ ...q, customer_segment: e.target.value }))}>
                      <option value="">Select...</option>
                      {CustomerSegmentation.map(val => <option key={val} value={val}>{val}</option>)}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="nationality" className="form-label">Nationality</label>
                    <select className="form-select" id="nationality" required value={questionnaire.nationality} onChange={e => setQuestionnaire(q => ({ ...q, nationality: e.target.value }))}>
                      <option value="">Select...</option>
                      {Nationality.map(val => <option key={val} value={val}>{val}</option>)}
                    </select>
                  </div>
                  <div id="questionnaire-msg" className="form-text text-warning">{msg}</div>
                  <button type="submit" className="btn btn-primary w-100" disabled={loading}>Submit</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      <div id="session-msg" className="form-text text-info">{msg}</div>
    </div>
  );
};

export default SessionContainer;
