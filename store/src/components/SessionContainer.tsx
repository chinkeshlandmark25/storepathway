import React, { useState, useMemo, useEffect } from 'react';
import MapCanvas from './MapCanvas';

interface Questionnaire {
  customer_entry: string;
  customer_segment: string;
  nationality: string;
}

const CustomerEntry = ["Royal rest", "HomeBox", "Lift"];
const CustomerSegmentation = ["Single - Male", "Single - Female", "Couple", "Couple with Children", "Large Family"];
const Nationality = ["National", "Arab Expats", "ISC", "SEAC", "Africans", "Western"];

interface ArrowGrid {
  start_x: number;
  start_y: number;
  end_x: number;
  end_y: number
}

interface SessionContainerProps {
  token: string;
  startSession: () => Promise<void>;
  sessionId: string | null;
  showQuestionnaire: boolean;
  showMap: boolean;
  arrows: ArrowGrid[];

  setArrows: React.Dispatch<React.SetStateAction<ArrowGrid[]>>;
  msg: string;
  setMsg: React.Dispatch<React.SetStateAction<string>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setShowQuestionnaire: React.Dispatch<React.SetStateAction<boolean>>;
  setShowMap: React.Dispatch<React.SetStateAction<boolean>>;
  setSessionId: React.Dispatch<React.SetStateAction<string | null>>;
}

// Helper to decode JWT and extract name
function getNameFromToken(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded.name || decoded.username || null;
  } catch {
    return null;
  }
}

const CellType = Object.freeze({
  TURNING_POINT: 'TURNING_POINT',
  FIXTURE: 'FIXTURE',
  ENTRY_GATE: 'ENTRY_GATE',
  EXIT_GATE: 'EXIT_GATE',
});

const SessionContainer: React.FC<SessionContainerProps> = ({ token, startSession, sessionId, showQuestionnaire, showMap, arrows, setArrows, msg, setMsg, loading, setLoading, setShowQuestionnaire, setShowMap, setSessionId }) => {
  const [questionnaire, setQuestionnaire] = useState<Questionnaire>({
    customer_entry: '',
    customer_segment: '',
    nationality: ''
  });
  const [fabOpen, setFabOpen] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const userName = useMemo(() => getNameFromToken(token), [token]);
  // Update points type to include config_type
  const [points, setPoints] = useState<Array<{ x: number; y: number; config_type: string }>>([]);

  useEffect(() => {
    if (!showMap) return;
    // Fetch points from /map-configurations
    (async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_BASE || '/api'}/map-configurations`, {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        let data = await res.json();
        if (!Array.isArray(data) || data.length === 0) {
            setMsg('No map configuration found. Please configure the map first.');
            setShowMap(false);
            return;
        }
        setPoints((data as Array<any>).map((pt: any) => ({
          x: (pt.cell_x ?? pt.x) * 10,
          y: (pt.cell_y ?? pt.y) * 10,
          config_type: pt.config_type
        })));
      } catch {
        setPoints([
          { x: 100, y: 100, config_type: CellType.TURNING_POINT },
          { x: 300, y: 150, config_type: CellType.FIXTURE },
          { x: 500, y: 400, config_type: CellType.ENTRY_GATE },
          { x: 700, y: 200, config_type: CellType.EXIT_GATE },
          { x: 800, y: 500, config_type: CellType.FIXTURE }
        ]);
      }
    })();
  }, [showMap, token]);

  const submitQuestionnaire = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId) return;
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE || '/api'}/sessions/${sessionId}/questionnaire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify(questionnaire)
      });
      if (res.ok) {
        setShowQuestionnaire(false);
        setShowMap(true);
        setMsg('');
      } else {
        const err = await res.json();
        setMsg(err.error || 'Invalid input.');
      }
    } catch (err) {
      setMsg('Network error');
    }
    setLoading(false);
  };

  const handleArrowDraw = (arrow: ArrowGrid) => {
    setArrows(prev => [...prev, arrow]);
  };

  const handleFinishSession = async () => {
    if (!sessionId) return;
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE || '/api'}/sessions/${sessionId}/arrows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ arrows })
      });
      if (res.ok) {
        setMsg('Session finished!');
        setSessionId(null);
        setShowMap(false);
        setShowQuestionnaire(false);
        setArrows([]);
      } else {
        const err = await res.json();
        console.log(err);
        setMsg(err.error || 'Could not finish session.');
      }
    } catch (err) {
      setMsg('Network error');
    }
    setLoading(false);
  };

  return (
    <div id="session-container" style={{ width: '100vw', height: '100vh', background: '#181818', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
      {/* Bootstrap Toast Container */}
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 1080, minWidth: 320 }}
      >
        {msg && (
          <div className="toast show align-items-center text-bg-info border-0 mb-2" role="alert" aria-live="assertive" aria-atomic="true" style={{ minWidth: 320 }}>
            <div className="d-flex">
              <div className="toast-body">
                {msg}
              </div>
              <button type="button" className="btn-close btn-close-white me-2 m-auto" aria-label="Close" onClick={() => setMsg('')}></button>
            </div>
          </div>
        )}
      </div>
      {showQuestionnaire && (
        <div className="modal show d-block" tabIndex={-1} style={{ zIndex: 10 }}>
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
      {showMap && (
        <>
          {/* Floating Action Button (FAB) */}
          <div style={{ position: 'absolute', bottom: 32, right: 32, zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 16 }}>
            {fabOpen && (
              <>
                <button
                  className="btn btn-outline-secondary btn-lg"
                  style={{ marginBottom: 8, minWidth: 160, borderRadius: 24, boxShadow: '0 2px 8px #0008' }}
                  onClick={() => { setFabOpen(false); startSession(); }}
                  disabled={loading || !!sessionId}
                >
                  Restart
                </button>
                <button
                  className="btn btn-primary btn-lg"
                  style={{ marginBottom: 8, minWidth: 160, borderRadius: 24, boxShadow: '0 2px 8px #0008' }}
                  onClick={() => { setFabOpen(false); handleFinishSession(); }}
                  disabled={loading || arrows.length === 0}
                >
                  Finish Session
                </button>
                <button
                  className="btn btn-warning btn-lg"
                  style={{ marginBottom: 8, minWidth: 160, borderRadius: 24, boxShadow: '0 2px 8px #0008' }}
                  onClick={() => setArrows(prev => prev.slice(0, -1))}
                  disabled={arrows.length === 0}
                >
                  Undo
                </button>
                <button
                  className="btn btn-info btn-lg"
                  style={{ marginBottom: 8, minWidth: 160, borderRadius: 24, boxShadow: '0 2px 8px #0008' }}
                  onClick={() => setShowGrid(g => !g)}
                >
                  {showGrid ? 'Hide Grid' : 'Show Grid'}
                </button>
              </>
            )}
            <button
              className="btn btn-light btn-lg"
              style={{ borderRadius: '50%', width: 64, height: 64, boxShadow: '0 2px 8px #0008', fontSize: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => setFabOpen(fab => !fab)}
              aria-label="Actions"
            >
              {fabOpen ? <span>&times;</span> : <span>&#43;</span>}
            </button>
          </div>
          <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MapCanvas
              arrows={arrows}
              onArrowDraw={handleArrowDraw}
              backgroundImage={process.env.PUBLIC_URL + '/store.jpg'}
              points={points}
              showGrid={showGrid}
            />
          </div>
        </>
      )}
      {!showQuestionnaire && !showMap && (
        <div className="d-flex flex-column align-items-center justify-content-center h-100">
          <h1 className="text-light">
            Hi, {userName ? `${userName}` : ''}
          </h1>
          <button className="btn btn-primary mt-3" onClick={startSession} disabled={loading || !!sessionId}>
            {loading ? 'Starting...' : 'Start New Session'}
          </button>
          {sessionId && (
            <p className="text-light mt-3">Session ID: {sessionId}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default SessionContainer;
