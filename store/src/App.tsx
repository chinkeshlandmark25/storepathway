import React, { useState } from 'react';
import './App.css';
import AuthForm from './components/AuthForm';
import SessionContainer from './components/SessionContainer';
import Sidebar from './components/Sidebar';
import ConfigureMapRoute from './ConfigureMapRoute';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';

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

  // Sidebar navigation handler
  const SidebarWithNav = (props: any) => {
    const navigate = useNavigate();
    return (
      <Sidebar
        onLogout={handleLogout}
        onStartSession={startSession}
        onConfigureMap={() => navigate('/configure-map')}
      />
    );
  };

  return (
    <Router>
      <div className="App">
        {!token ? (
          <AuthForm onLoginSuccess={setToken} />
        ) : (
          <>
            <Routes>
              <Route
                path="/configure-map"
                element={<ConfigureMapRoute token={token} />}
              />
              <Route
                path="*"
                element={
                  <>
                    <SidebarWithNav />
                    <SessionContainer
                      token={token}
                      startSession={startSession}
                      sessionId={sessionId}
                      showQuestionnaire={showQuestionnaire}
                      showMap={showMap}
                      arrows={arrows}
                      setArrows={setArrows}
                      msg={msg}
                      setMsg={setMsg}
                      loading={loading}
                      setLoading={setLoading}
                      setShowQuestionnaire={setShowQuestionnaire}
                      setShowMap={setShowMap}
                      setSessionId={setSessionId}
                    />
                  </>
                }
              />
            </Routes>
          </>
        )}
      </div>
    </Router>
  );
}

export default App;
