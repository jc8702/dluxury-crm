import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { api, setAuthToken } from '../lib/api';
import { Link, useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ui/ThemeToggle';

const SignupPage: React.FC = () => {
  const { setUser } = useAppContext();
  const navigate = useNavigate();

  // Estados do formulário
  const [empresa, setEmpresa] = useState('');
  const [subdominio, setSubdominio] = useState('');
  const [nomeAdmin, setNomeAdmin] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  
  // Seleção de planos (default: pro)
  const [plano, setPlano] = useState<'basic' | 'pro' | 'enterprise'>('pro');
  const [aceitouTermos, setAceitouTermos] = useState(false);

  // Estados de UI/Feedback
  const [subdomainStatus, setSubdomainStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable'>('idle');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Ref para debounce da checagem do subdomínio
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Monitorar digitação do subdomínio para verificação em tempo real
  useEffect(() => {
    if (!subdominio.trim()) {
      setSubdomainStatus('idle');
      return;
    }

    const subClean = subdominio.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (subClean !== subdominio) {
      setSubdominio(subClean);
    }

    if (subClean.length < 3) {
      setSubdomainStatus('unavailable');
      return;
    }

    setSubdomainStatus('checking');

    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    checkTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await api.signup.checkSubdomain(subClean);
        if (res.disponivel) {
          setSubdomainStatus('available');
        } else {
          setSubdomainStatus('unavailable');
        }
      } catch {
        setSubdomainStatus('idle');
      }
    }, 500);

    return () => {
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    };
  }, [subdominio]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (subdomainStatus !== 'available') {
      setError('Por favor, escolha um subdomínio válido e disponível.');
      return;
    }
    if (senha !== confirmarSenha) {
      setError('As senhas não coincidem.');
      return;
    }
    if (senha.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (!aceitouTermos) {
      setError('Você deve aceitar os Termos de Uso e a Política de Privacidade.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.signup.register({
        empresa,
        subdominio,
        email,
        senha,
        nomeAdmin,
        plano
      });

      if (res.token) setAuthToken(res.token);
      if (res.user) setUser(res.user);
      
      // Redireciona para o painel
      navigate('/painel');
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar cadastro.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full py-3.5 px-4 rounded-xl bg-card border border-border/30 text-card-foreground outline-none text-sm transition-all duration-200 focus:border-primary focus:ring-1 focus:ring-primary/30";

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans p-12 box-border relative">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      {/* Header / Brand */}
      <div className="text-center mb-14">
        <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-6 text-primary-foreground font-black text-3xl shadow-primary">
          F
        </div>
        <h1 id="signup-title" className="text-[2.4rem] font-black m-0 tracking-wider">
          FATTO OS
        </h1>
        <p className="text-accent text-sm font-bold mt-2 uppercase tracking-[3px]">
          Plataforma de Gestão Moveleira Premium
        </p>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-[1200px] w-full mx-auto flex-1 items-start">
        
        {/* Formulário de Cadastro */}
        <section className="bg-card border border-border/30 rounded-3xl p-10 text-card-foreground shadow-lg">
          <h2 className="text-xl font-extrabold mb-6 uppercase tracking-wide">
            Informações da Conta
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            
            {/* Nome da Marcenaria */}
            <div>
              <label className="text-xs font-bold block mb-1.5 uppercase tracking-wide">
                Nome da Marcenaria / Empresa
              </label>
              <input
                id="input-empresa"
                type="text" required value={empresa}
                onChange={e => setEmpresa(e.target.value)}
                placeholder="Marcenaria de Luxo S/A"
                className={inputClass}
              />
            </div>

            {/* Subdomínio com Validação */}
            <div>
              <label className="text-xs font-bold block mb-1.5 uppercase tracking-wide">
                Subdomínio de Acesso
              </label>
              <div className="flex items-center relative">
                <input
                  id="input-subdominio"
                  type="text" required value={subdominio}
                  onChange={e => setSubdominio(e.target.value)}
                  placeholder="suamarcenaria"
                  className={`${inputClass} pr-[120px]`}
                />
                <span className="absolute right-3 text-primary text-sm font-bold">
                  .fatto-os
                </span>
              </div>
              <div className="mt-1.5 text-xs flex items-center gap-2">
                {subdomainStatus === 'checking' && <span className="text-muted-foreground">Verificando disponibilidade...</span>}
                {subdomainStatus === 'available' && <span className="text-success font-bold">✓ Subdomínio disponível</span>}
                {subdomainStatus === 'unavailable' && <span className="text-destructive font-bold">✗ Subdomínio em uso ou inválido</span>}
                {subdomainStatus === 'idle' && <span className="text-muted-foreground font-medium">Exemplo: suamarcenaria.fatto-os.vercel.app</span>}
              </div>
            </div>

            {/* Nome Completo Admin */}
            <div>
              <label className="text-xs font-bold block mb-1.5 uppercase tracking-wide">
                Nome Completo do Administrador
              </label>
              <input
                id="input-nome-admin"
                type="text" required value={nomeAdmin}
                onChange={e => setNomeAdmin(e.target.value)}
                placeholder="Nome do Gestor"
                className={inputClass}
              />
            </div>

            {/* E-mail */}
            <div>
              <label className="text-xs font-bold block mb-1.5 uppercase tracking-wide">
                E-mail Corporativo
              </label>
              <input
                id="input-email"
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="exemplo@marcenaria.com"
                className={inputClass}
              />
            </div>

            {/* Senha */}
            <div>
              <label className="text-xs font-bold block mb-1.5 uppercase tracking-wide">
                Senha de Acesso (Mín. 8 caracteres)
              </label>
              <input
                id="input-senha"
                type="password" required value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="******"
                className={inputClass}
              />
            </div>

            {/* Confirmar Senha */}
            <div>
              <label className="text-xs font-bold block mb-1.5 uppercase tracking-wide">
                Confirmar Senha
              </label>
              <input
                id="input-confirmar-senha"
                type="password" required value={confirmarSenha}
                onChange={e => setConfirmarSenha(e.target.value)}
                placeholder="******"
                className={inputClass}
              />
            </div>

            {/* Aceitar Termos Checkbox */}
            <div className="flex items-start gap-2 mt-2">
              <input
                id="checkbox-termos"
                type="checkbox"
                checked={aceitouTermos}
                onChange={e => setAceitouTermos(e.target.checked)}
                className="mt-0.5 cursor-pointer accent-primary"
              />
              <label htmlFor="checkbox-termos" className="text-xs text-muted-foreground leading-snug cursor-pointer font-medium">
                Eu concordo com os <a href="/termos" target="_blank" rel="noopener noreferrer" className="text-primary no-underline font-bold hover:underline">Termos de Uso</a> e com a <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="text-primary no-underline font-bold hover:underline">Política de Privacidade</a> de acordo com as normas da LGPD.
              </label>
            </div>

            {error && (
              <div className="text-destructive text-sm p-3 bg-destructive/5 border border-destructive/15 rounded-lg font-medium">
                {error}
              </div>
            )}

            {/* Botão de Envio */}
            <button
              id="btn-signup-submit"
              type="submit"
              disabled={loading || subdomainStatus !== 'available'}
              className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold border-none cursor-pointer text-base tracking-wider uppercase shadow-primary transition-all duration-200 hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Provisionando Conta...' : 'Iniciar Teste de 14 Dias'}
            </button>

            <div className="text-center mt-2 text-sm font-medium">
              <span className="text-muted-foreground">Já possui uma conta? </span>
              <Link to="/login" className="text-primary no-underline font-bold hover:underline">Entrar</Link>
            </div>

          </form>
        </section>

        {/* Seleção de Planos */}
        <section className="flex flex-col gap-6">
          <h2 className="text-xl font-extrabold text-accent mb-2 uppercase tracking-wide">
            Selecione seu Plano Comercial
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Qualquer plano selecionado inicia em modo <strong>Trial gratuito de 14 dias</strong>, dando acesso total a todos os módulos do ERP (equivalente ao plano Pro) durante o período de testes.
          </p>

          {/* Grid de Planos */}
          <div className="flex flex-col gap-5">
            
            {/* PLANO BASIC */}
            <div 
              id="plan-basic"
              onClick={() => setPlano('basic')}
              className={`p-6 rounded-2xl cursor-pointer transition-all duration-200 shadow-md ${
                plano === 'basic' 
                  ? 'border-2 border-accent bg-accent/5' 
                  : 'border border-border/20 bg-card/40 hover:bg-card/60'
              }`}
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-extrabold">BASIC</h3>
                <span className="text-xl font-black text-accent">R$ 97<span className="text-sm font-medium text-muted-foreground">/mês</span></span>
              </div>
              <p className="text-sm text-muted-foreground mt-2 mb-4">
                Ideal para marceneiros autônomos organizando orçamentos e clientes.
              </p>
              <ul className="list-none p-0 m-0 flex flex-col gap-1.5 text-sm text-muted-foreground">
                <li>✓ Módulos CRM + Orçamentos Básicos</li>
                <li>✓ Cadastro de Clientes e Visitas</li>
                <li>✓ Até 2 usuários simultâneos</li>
                <li className="opacity-30 line-through">✗ Módulo Financeiro e DRE</li>
                <li className="opacity-30 line-through">✗ Assistente IA (Dlux)</li>
              </ul>
            </div>

            {/* PLANO PRO (RECOMENDADO) */}
            <div 
              id="plan-pro"
              onClick={() => setPlano('pro')}
              className={`p-6 rounded-2xl cursor-pointer transition-all duration-200 shadow-md relative ${
                plano === 'pro' 
                  ? 'border-2 border-accent bg-accent/8' 
                  : 'border border-accent/30 bg-card/60 hover:bg-card/80'
              }`}
            >
              <div className="absolute -top-3 right-6 bg-accent text-accent-foreground text-[0.7rem] font-black py-1 px-3.5 rounded-full tracking-wider uppercase">
                RECOMENDADO / POPULAR
              </div>
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black text-accent">PRO</h3>
                <span className="text-2xl font-black text-accent">R$ 197<span className="text-sm font-medium text-muted-foreground">/mês</span></span>
              </div>
              <p className="text-sm text-muted-foreground mt-2 mb-4">
                Gestão completa, controle financeiro integrado e IA inteligente de marcenaria.
              </p>
              <ul className="list-none p-0 m-0 flex flex-col gap-1.5 text-sm text-muted-foreground">
                <li>✓ Módulos CRM + Orçamentos Completos</li>
                <li>✓ Módulo Financeiro, Caixa e Relatórios DRE</li>
                <li>✓ <strong>Assistente IA (Dlux)</strong> integrado no chat</li>
                <li>✓ Plano de Corte Industrial e Sobras</li>
                <li>✓ Até 5 usuários simultâneos</li>
              </ul>
            </div>

            {/* PLANO ENTERPRISE */}
            <div 
              id="plan-enterprise"
              onClick={() => setPlano('enterprise')}
              className={`p-6 rounded-2xl cursor-pointer transition-all duration-200 shadow-md ${
                plano === 'enterprise' 
                  ? 'border-2 border-accent bg-accent/5' 
                  : 'border border-border/20 bg-card/40 hover:bg-card/60'
              }`}
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-extrabold">ENTERPRISE</h3>
                <span className="text-xl font-black text-accent">R$ 397<span className="text-sm font-medium text-muted-foreground">/mês</span></span>
              </div>
              <p className="text-sm text-muted-foreground mt-2 mb-4">
                Operação industrial em larga escala, controle CNC e suporte corporativo.
              </p>
              <ul className="list-none p-0 m-0 flex flex-col gap-1.5 text-sm text-muted-foreground">
                <li>✓ Tudo do plano PRO</li>
                <li>✓ <strong>Simulador 3D CNC</strong> e percursos G-Code</li>
                <li>✓ Controle de Ordens de Produção Gantry</li>
                <li>✓ Usuários ilimitados e suporte VIP dedicado</li>
              </ul>
            </div>

          </div>
        </section>

      </div>
    </div>
  );
};

export default SignupPage;
