import React, { useState } from 'react';

interface AuthFormProps {
  onLoginSuccess: (token: string) => void;
}

const AuthForm: React.FC<AuthFormProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Use environment variable if available, else default to relative path
  const API_BASE = process.env.REACT_APP_API_BASE || '/api';

  const handleLogin = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('jwt_token', data.token);
        onLoginSuccess(data.token);
      } else {
        setMessage(data.error || 'Login failed');
      }
    } catch (err) {
      setMessage('Network error');
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.userId) {
        setMessage('Registered! Please login.');
      } else {
        setMessage(data.error || 'Registration failed');
      }
    } catch (err) {
      setMessage('Network error');
    }
    setLoading(false);
  };

  return (
    <div className="container custom-container mt-5" id="auth-container">
      <h1>Store Pathway Tracker</h1>
      <form className="mx-auto" style={{ maxWidth: 350 }} onSubmit={e => e.preventDefault()}>
        <div className="mb-3">
          <input
            type="text"
            id="username"
            className="form-control"
            placeholder="Username"
            autoComplete="username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="mb-3">
          <input
            type="password"
            id="password"
            className="form-control"
            placeholder="Password"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="d-grid gap-2 mb-2">
          <button type="button" id="login-btn" className="btn btn-primary" onClick={handleLogin} disabled={loading}>
            Login
          </button>
          <button type="button" id="register-btn" className="btn btn-outline-light" onClick={handleRegister} disabled={loading}>
            Register
          </button>
        </div>
        <div id="auth-msg" className="form-text text-warning">{message}</div>
      </form>
    </div>
  );
};

export default AuthForm;
