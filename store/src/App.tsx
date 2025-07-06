import React, { useState } from 'react';
import './App.css';
import AuthForm from './components/AuthForm';
import SessionContainer from './components/SessionContainer';
import MapCanvas from './components/MapCanvas';
import Sidebar from './components/Sidebar';

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('jwt_token'));
  const [arrows, setArrows] = useState<Array<{ start_x: number; start_y: number; end_x: number; end_y: number }>>([]);

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    setToken(null);
  };

  const handleArrowDraw = (arrow: { start_x: number; start_y: number; end_x: number; end_y: number }) => {
    setArrows(prev => [...prev, arrow]);
  };

  return (
    <div className="App">
      <Sidebar onLogout={handleLogout} />
      {!token ? (
        <AuthForm onLoginSuccess={setToken} />
      ) : (
        <>
          <SessionContainer token={token} onLogout={handleLogout} />
          <div style={{ marginTop: 32 }}>
            <MapCanvas
              arrows={arrows}
              onArrowDraw={handleArrowDraw}
              backgroundImage={process.env.PUBLIC_URL + '/store.jpg'}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default App;
