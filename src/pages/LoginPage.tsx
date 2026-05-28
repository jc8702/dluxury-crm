import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { api, setAuthToken, hasAuthToken } from '../lib/api';

const LoginPage: React.FC = () => {
  const { setUser } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tenantInfo, setTenantInfo] = useState<{ nome: string; subdominio: string | null } | null>(null);

  useEffect(() => {
    if (hasAuthToken()) {
      api.auth.me().then(res => setUser(res.user)).catch(() => {});
      return;
    }
    // Tentar resolver tenant pelo domínio atual
    const domain = window.location.hostname;
    if (domain !== 'localhost' && domain !== '127.0.0.1') {
      fetch(`/api/resolve-dominio?host=${domain}`)
        .then(r => r.json())
        .then(data => { if (data?.tenant) setTenantInfo(data.tenant); })
        .catch(() => {});
    }
    const autoLogin = import.meta.env.VITE_AUTO_LOGIN === 'true';
    const autoLoginEmail = import.meta.env.VITE_AUTO_LOGIN_EMAIL;
    const autoLoginPassword = import.meta.env.VITE_AUTO_LOGIN_PASSWORD;
    if (autoLogin && autoLoginEmail && autoLoginPassword) {
      api.auth.login({ email: autoLoginEmail, password: autoLoginPassword })
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
      minHeight: '100vh', background: '#0F1713', // Ébano
      fontFamily: 'Outfit, Inter, sans-serif',
      padding: '1rem'
    }}>
      <div style={{
        background: '#F9F8F6', // Off-White
        padding: '3.5rem 3rem', borderRadius: '24px',
        width: '420px', border: '1px solid rgba(28,46,36,0.06)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.35)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #8B5A2B, #D4AF37)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.25rem', color: '#white', fontWeight: 900,
            fontSize: '1.5rem', boxShadow: '0 8px 16px rgba(139,90,43,0.25)'
          }}>
            F
          </div>
          <h1 style={{ color: '#1C2E24', fontSize: '1.6rem', fontWeight: 900, margin: 0, letterSpacing: '1px' }}>
            FATTO OS
          </h1>
          <p style={{ color: '#8B5A2B', fontSize: '0.75rem', fontWeight: 700, marginTop: '0.4rem', textTransform: 'uppercase', letterSpacing: '2px' }}>
            {tenantInfo ? tenantInfo.nome : 'DESIGN & TECH'}
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: '#1C2E24', fontWeight: 700, display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              E-mail corporativo
            </label>
            <input
              type="email" required value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              style={{
                width: '100%', padding: '0.85rem 1rem', borderRadius: '12px',
                background: '#white', border: '1px solid rgba(28,46,36,0.12)',
                color: '#1C2E24', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box',
                transition: 'all 0.2s ease', fontFamily: 'Inter, sans-serif'
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: '#1C2E24', fontWeight: 700, display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Senha de acesso
            </label>
            <input
              type="password" required value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="******"
              style={{
                width: '100%', padding: '0.85rem 1rem', borderRadius: '12px',
                background: '#white', border: '1px solid rgba(28,46,36,0.12)',
                color: '#1C2E24', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box',
                transition: 'all 0.2s ease', fontFamily: 'Inter, sans-serif'
              }}
            />
          </div>

          {error && (
            <div style={{
              color: '#C62828', fontSize: '0.8rem', padding: '0.75rem',
              background: 'rgba(198,40,40,0.06)', border: '1px solid rgba(198,40,40,0.15)', borderRadius: '10px',
              fontWeight: 500, lineHeight: '1.4'
            }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{
              width: '100%', padding: '1rem', borderRadius: '12px', marginTop: '0.5rem',
              background: loading ? '#A1887F' : '#8B5A2B',
              color: 'white', fontWeight: 700, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.95rem', letterSpacing: '1px', textTransform: 'uppercase',
              boxShadow: '0 4px 12px rgba(139,90,43,0.25)', transition: 'all 0.2s ease'
            }}>
            {loading ? 'Acessando...' : 'Entrar no Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;