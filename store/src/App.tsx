import React, { useState } from 'react';
import './App.css';
import AuthForm from './components/AuthForm';
import SessionContainer from './components/SessionContainer';
import Sidebar from './components/Sidebar';

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('jwt_token'));
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [arrows, setArrows] = useState<Array<{ start_x: number; start_y: number; end_x: number; end_y: number }>>([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const API_BASE = process.env.REACT_APP_API_BASE || '/api';

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
        setShowMap(false);
        setArrows([]); // reset arrows for new session
      } else {
        setMsg('Could not start session.');
      }
    } catch (err) {
      setMsg('Network error');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    setToken(null);
  };

  return (
    <div className="App">
      {!token ? (
        <AuthForm onLoginSuccess={setToken} />
      ) : (
        <>
          <Sidebar onLogout={handleLogout} onStartSession={startSession} />
          <SessionContainer token={token} startSession={startSession} sessionId={sessionId} showQuestionnaire={showQuestionnaire} showMap={showMap} arrows={arrows} setArrows={setArrows} msg={msg} setMsg={setMsg} loading={loading} setLoading={setLoading} setShowQuestionnaire={setShowQuestionnaire} setShowMap={setShowMap} setSessionId={setSessionId} />
        </>
      )}
    </div>
  );
}

export default App;
