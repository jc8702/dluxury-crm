import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, setAuthToken, hasAuthToken } from '../lib/api';

const LoginPage: React.FC = () => {
  const { setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tenantInfo, setTenantInfo] = useState<{ nome: string; subdominio: string | null } | null>(
    null,
  );

  useEffect(() => {
    if (hasAuthToken()) {
      api.auth
        .me()
        .then((res) => setUser(res.user))
        .catch(() => {});
      return;
    }
    // Tentar resolver tenant pelo domínio atual
    const domain = window.location.hostname;
    if (domain !== 'localhost' && domain !== '127.0.0.1') {
      fetch(`/api/resolve-dominio?host=${domain}`)
        .then((r) => r.json())
        .then((data) => {
          if (data?.tenant) setTenantInfo(data.tenant);
        })
        .catch(() => {});
    }
    const autoLogin = import.meta.env.VITE_AUTO_LOGIN === 'true';
    const autoLoginEmail = import.meta.env.VITE_AUTO_LOGIN_EMAIL;
    const autoLoginPassword = import.meta.env.VITE_AUTO_LOGIN_PASSWORD;
    if (autoLogin && autoLoginEmail && autoLoginPassword) {
      api.auth
        .login({ email: autoLoginEmail, password: autoLoginPassword })
        .then((res) => {
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
    <div className="flex items-center justify-center min-h-screen bg-background font-sans p-4 relative">
      <div className="bg-card p-[3.5rem_3rem] rounded-3xl w-[420px] border border-border/30 shadow-lg">
        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-5 text-primary-foreground font-black text-2xl shadow-primary">
            F
          </div>
          <h1 className="text-foreground text-[1.6rem] font-black m-0 tracking-wider">FATTO OS</h1>
          <p className="text-primary text-xs font-bold mt-1.5 uppercase tracking-[2px]">
            {tenantInfo ? tenantInfo.nome : 'DESIGN & TECH'}
          </p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div>
            <label className="text-xs text-foreground font-bold block mb-1.5 uppercase tracking-wide">
              E-mail corporativo
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full py-3.5 px-4 rounded-xl bg-background border border-border/30 text-foreground outline-none text-sm transition-all duration-200 focus:border-primary focus:ring-1 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs text-foreground font-bold block mb-1.5 uppercase tracking-wide">
              Senha de acesso
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="******"
              className="w-full py-3.5 px-4 rounded-xl bg-background border border-border/30 text-foreground outline-none text-sm transition-all duration-200 focus:border-primary focus:ring-1 focus:ring-primary/30"
            />
          </div>

          {error && (
            <div className="text-destructive text-sm p-3 bg-destructive/5 border border-destructive/15 rounded-lg font-medium leading-snug">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl mt-2 bg-primary text-primary-foreground font-bold border-none cursor-pointer text-base tracking-wider uppercase shadow-primary transition-all duration-200 hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Acessando...' : 'Entrar no Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
