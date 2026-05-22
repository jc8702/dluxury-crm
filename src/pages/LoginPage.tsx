import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { api, setAuthToken, hasAuthToken } from '../lib/api';

const LoginPage: React.FC = () => {
  const { setUser } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hasAuthToken()) {
      api.auth.me().then(res => setUser(res.user)).catch(() => {});
      return;
    }
    const isDev = (import.meta as any).env?.DEV;
    if (isDev) {
      api.auth.login({ email: 'admin@dluxury.com', password: 'admin123' })
        .then(res => {
          if (res.token) setAuthToken(res.token);
          if (res.user) setUser(res.user);
        })
        .catch(() => {});
    }
  }, [setUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.auth.login({ email, password });
      if (res.token) setAuthToken(res.token);
      if (res.user) setUser(res.user);
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#0D1117',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        background: '#1a1a2e', padding: '3rem', borderRadius: '16px',
        width: '400px', border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ color: '#E2AC00', fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>
            D'LUXURY
          </h1>
          <p style={{ color: '#6B7280', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            AMBIENTES — CRM
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: '#9CA3AF', display: 'block', marginBottom: '0.3rem' }}>
              E-mail
            </label>
            <input
              type="email" required value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              style={{
                width: '100%', padding: '0.75rem', borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'white', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box'
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: '#9CA3AF', display: 'block', marginBottom: '0.3rem' }}>
              Senha
            </label>
            <input
              type="password" required value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="******"
              style={{
                width: '100%', padding: '0.75rem', borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'white', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box'
              }}
            />
          </div>

          {error && (
            <div style={{
              color: '#ef4444', fontSize: '0.8rem', padding: '0.5rem',
              background: 'rgba(239,68,68,0.1)', borderRadius: '6px'
            }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{
              width: '100%', padding: '0.85rem', borderRadius: '8px', marginTop: '0.5rem',
              background: loading ? '#666' : 'linear-gradient(135deg, #E2AC00, #b49050)',
              color: '#1a1a2e', fontWeight: 700, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '1rem'
            }}>
            {loading ? 'ENTRANDO...' : 'ENTRAR'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;