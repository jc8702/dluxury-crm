import React, { useState } from 'react';
import { api, setAuthToken } from '../../lib/api';
import { useAppContext } from '../../context/AppContext';

const Login: React.FC = () => {
  const { setUser } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await api.auth.login({ email: normalizedEmail, password });
      setAuthToken(response.token);
      setUser(response.user);
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: 'var(--background)', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/logo.png" alt="D'Luxury" style={{ width: '80px', height: '80px', borderRadius: '12px', marginBottom: '1rem', objectFit: 'contain' }} />
          <h1 style={{ color: 'var(--primary)', fontSize: '1.5rem', fontWeight: 'bold' }}>D'LUXURY</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', letterSpacing: '0.1em' }}>MÓVEIS SOB MEDIDA</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'center', border: '1px solid var(--danger)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>E-mail</label>
            <input 
              type="email" 
              className="input" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required 
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Senha</label>
            <input 
              type="password" 
              className="input" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required 
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '0.5rem', width: '100%' }}>
            {loading ? 'Entrando...' : 'Acessar Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;

