import React, { useState } from 'react';
import styles from '../landing.module.css';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data?.token) {
          localStorage.setItem('dluxury_token', data.data.token);
          // Usar a rota hash da SPA para evitar 404 e funcionar com HashRouter
          window.location.hash = '#/painel';
          // Recarregar para o AuthProvider ler o novo token da sessão
          window.location.reload();
        } else {
          setError(data.error || 'Email ou senha inválidos');
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Email ou senha inválidos');
      }
    } catch {
      setError('Erro ao conectar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={styles.modalOverlay}
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative', // Garante posicionamento absoluto correto do botão fechar
          background: '#1a1a1a',
          borderRadius: '16px',
          border: '1px solid #333333',
          padding: '40px',
          width: '90%',
          maxWidth: '400px',
        }}
      >
        <button
          className={styles.modalClose}
          onClick={onClose}
          aria-label="Fechar modal"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: '#b8b8b8',
            fontSize: '24px',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>

        <h2 style={{ marginBottom: '24px' }}>Entrar no D'Luxury CRM</h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #333333',
                background: '#0a0a0a',
                color: '#ffffff',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #333333',
                background: '#0a0a0a',
                color: '#ffffff',
                fontSize: '14px',
              }}
            />
          </div>

          {error && (
            <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '16px' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: '#FF9500',
              color: '#000000',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#b8b8b8' }}>
          Não tem conta?{' '}
          <a href="/signup" style={{ color: '#FF9500', textDecoration: 'none' }}>
            Começar teste grátis
          </a>
        </p>
      </div>
    </div>
  );
};

export default LoginModal;
