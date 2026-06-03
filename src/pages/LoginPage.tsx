import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, setAuthToken, hasAuthToken } from '../lib/api';
import { ChevronRight, Shield, Activity } from 'lucide-react';

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
      setError(err.message || 'Credenciais inválidas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background font-sans overflow-hidden">
      {/* Esquerda - Formulário */}
      <div className="flex flex-col justify-center w-full lg:w-1/2 p-8 lg:p-24 relative z-10">
        <div className="max-w-[420px] w-full mx-auto">
          {/* Logo e Header */}
          <div className="mb-10 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center mb-6 shadow-[0_8px_30px_rgb(245,158,11,0.3)]">
              <span className="text-primary-foreground font-black text-2xl tracking-tighter">
                DL
              </span>
            </div>
            <h1 className="text-4xl font-black text-foreground tracking-tight mb-2">
              Bem-vindo de volta.
            </h1>
            <p className="text-muted-foreground font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
              {tenantInfo ? tenantInfo.nome : "D'Luxury ERP - Design & Tech"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-6 animate-slide-in">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                E-mail Profissional
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@empresa.com.br"
                className="w-full h-14 px-4 rounded-xl bg-card border border-border/50 text-foreground outline-none transition-all duration-300 focus:border-primary focus:ring-4 focus:ring-primary/10 shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Senha de Acesso
                </label>
                <a
                  href="#"
                  className="text-xs font-bold text-primary hover:text-primary-hover transition-colors"
                >
                  Esqueceu a senha?
                </a>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-14 px-4 rounded-xl bg-card border border-border/50 text-foreground outline-none transition-all duration-300 focus:border-primary focus:ring-4 focus:ring-primary/10 shadow-sm"
              />
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-semibold animate-in zoom-in-95">
                <Activity className="w-5 h-5" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group relative flex items-center justify-center gap-2 w-full h-14 mt-4 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-base transition-all duration-300 disabled:opacity-70 shadow-[0_8px_20px_rgb(245,158,11,0.2)] hover:shadow-[0_12px_25px_rgb(245,158,11,0.3)] hover:-translate-y-0.5 overflow-hidden"
            >
              <span className="relative z-10">
                {loading ? 'Autenticando...' : 'Entrar no Sistema'}
              </span>
              {!loading && (
                <ChevronRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
              )}
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
            </button>
          </form>

          {/* Footer Sec */}
          <div
            className="mt-12 pt-8 border-t border-border/40 text-center flex flex-col items-center gap-4 animate-fade-in"
            style={{ animationDelay: '0.2s' }}
          >
            <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
              <Shield className="w-4 h-4 text-emerald-500" />
              Conexão Segura e Criptografada
            </div>
            <p className="text-xs text-muted-foreground">
              Não tem uma conta?{' '}
              <a href="/signup" className="text-primary font-bold hover:underline">
                Solicite acesso
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Direita - Branding / Visual */}
      <div className="hidden lg:flex w-1/2 bg-sidebar relative items-center justify-center p-12">
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px]"></div>
          <div className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[100px]"></div>
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        </div>

        {/* Hero Visual Card */}
        <div className="relative z-10 max-w-lg w-full">
          <div className="glass-elevated p-10 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-2xl">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-8 border border-white/10">
              <Activity className="w-6 h-6 text-accent" />
            </div>
            <h2 className="text-3xl font-black text-white mb-4 leading-tight">
              A revolução na gestão de marcenarias.
            </h2>
            <p className="text-sidebar-foreground text-lg leading-relaxed mb-8">
              Controle sua produção, fluxo de caixa e plano de corte em uma única plataforma
              industrial potencializada por IA.
            </p>

            {/* Trust Badges */}
            <div className="flex items-center gap-4 pt-8 border-t border-white/10">
              <div className="flex -space-x-3">
                <div className="w-10 h-10 rounded-full border-2 border-sidebar-background bg-slate-800"></div>
                <div className="w-10 h-10 rounded-full border-2 border-sidebar-background bg-slate-700"></div>
                <div className="w-10 h-10 rounded-full border-2 border-sidebar-background bg-slate-600 flex items-center justify-center text-xs text-white font-bold">
                  +2k
                </div>
              </div>
              <div className="text-sm font-semibold text-white/80">
                Líderes do setor
                <br />
                <span className="text-white/50 font-normal">já utilizam nossa tecnologia</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
