import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { api, setAuthToken } from '../lib/api';
import { Link, useNavigate } from 'react-router-dom';

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

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: '#0D1117',
      color: '#F0F6FC',
      fontFamily: 'Inter, sans-serif',
      padding: '2rem 1rem',
      boxSizing: 'border-box'
    }}>
      {/* Header / Brand */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 id="signup-title" style={{ color: '#E2AC00', fontSize: '2.2rem', fontWeight: 800, margin: 0, letterSpacing: '2px' }}>
          D'LUXURY CRM
        </h1>
        <p style={{ color: '#8B949E', fontSize: '1rem', marginTop: '0.5rem' }}>
          Crie sua conta SaaS e profissionalize a gestão da sua marcenaria de alto padrão.
        </p>
      </div>

      {/* Main Container */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '2.5rem',
        maxWidth: '1200px',
        width: '100%',
        margin: '0 auto',
        flex: 1,
        alignItems: 'start'
      }}>
        
        {/* Formulário de Cadastro */}
        <section style={{
          background: 'rgba(22, 27, 34, 0.8)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(240, 246, 252, 0.1)',
          borderRadius: '16px',
          padding: '2.5rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
        }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1.5rem', color: '#E2AC00' }}>
            Informações da Conta
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Nome da Marcenaria */}
            <div>
              <label style={{ fontSize: '0.8rem', color: '#8B949E', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>
                Nome da Marcenaria / Empresa
              </label>
              <input
                id="input-empresa"
                type="text" required value={empresa}
                onChange={e => setEmpresa(e.target.value)}
                placeholder="Marcenaria de Luxo S/A"
                style={inputStyle}
              />
            </div>

            {/* Subdomínio com Validação */}
            <div>
              <label style={{ fontSize: '0.8rem', color: '#8B949E', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>
                Subdomínio de Acesso
              </label>
              <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                <input
                  id="input-subdominio"
                  type="text" required value={subdominio}
                  onChange={e => setSubdominio(e.target.value)}
                  placeholder="suamarcenaria"
                  style={{ ...inputStyle, paddingRight: '120px' }}
                />
                <span style={{
                  position: 'absolute',
                  right: '12px',
                  color: '#58A6FF',
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}>
                  .dluxury-crm
                </span>
              </div>
              <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {subdomainStatus === 'checking' && <span style={{ color: '#8B949E' }}>Verificando disponibilidade...</span>}
                {subdomainStatus === 'available' && <span style={{ color: '#3FB950', fontWeight: 600 }}>✓ Subdomínio disponível</span>}
                {subdomainStatus === 'unavailable' && <span style={{ color: '#F85149', fontWeight: 600 }}>✗ Subdomínio em uso ou inválido</span>}
                {subdomainStatus === 'idle' && <span style={{ color: '#8B949E' }}>Exemplo: suamarcenaria.dluxury-crm.vercel.app</span>}
              </div>
            </div>

            {/* Nome Completo Admin */}
            <div>
              <label style={{ fontSize: '0.8rem', color: '#8B949E', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>
                Nome Completo do Administrador
              </label>
              <input
                id="input-nome-admin"
                type="text" required value={nomeAdmin}
                onChange={e => setNomeAdmin(e.target.value)}
                placeholder="Nome do Gestor"
                style={inputStyle}
              />
            </div>

            {/* E-mail */}
            <div>
              <label style={{ fontSize: '0.8rem', color: '#8B949E', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>
                E-mail Corporativo
              </label>
              <input
                id="input-email"
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="exemplo@marcenaria.com"
                style={inputStyle}
              />
            </div>

            {/* Senha */}
            <div>
              <label style={{ fontSize: '0.8rem', color: '#8B949E', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>
                Senha de Acesso (Mín. 8 caracteres)
              </label>
              <input
                id="input-senha"
                type="password" required value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="******"
                style={inputStyle}
              />
            </div>

            {/* Confirmar Senha */}
            <div>
              <label style={{ fontSize: '0.8rem', color: '#8B949E', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>
                Confirmar Senha
              </label>
              <input
                id="input-confirmar-senha"
                type="password" required value={confirmarSenha}
                onChange={e => setConfirmarSenha(e.target.value)}
                placeholder="******"
                style={inputStyle}
              />
            </div>

            {/* Aceitar Termos Checkbox */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input
                id="checkbox-termos"
                type="checkbox"
                checked={aceitouTermos}
                onChange={e => setAceitouTermos(e.target.checked)}
                style={{ marginTop: '0.2rem', cursor: 'pointer' }}
              />
              <label htmlFor="checkbox-termos" style={{ fontSize: '0.8rem', color: '#8B949E', lineHeight: '1.4', cursor: 'pointer' }}>
                Eu concordo com os <a href="/termos" target="_blank" rel="noopener noreferrer" style={{ color: '#58A6FF', textDecoration: 'none' }}>Termos de Uso</a> e com a <a href="/privacidade" target="_blank" rel="noopener noreferrer" style={{ color: '#58A6FF', textDecoration: 'none' }}>Política de Privacidade</a> de acordo com as normas da LGPD.
              </label>
            </div>

            {error && (
              <div style={{
                color: '#F85149',
                fontSize: '0.85rem',
                padding: '0.75rem',
                background: 'rgba(248, 81, 73, 0.1)',
                border: '1px solid rgba(248, 81, 73, 0.2)',
                borderRadius: '8px'
              }}>
                {error}
              </div>
            )}

            {/* Botão de Envio */}
            <button
              id="btn-signup-submit"
              type="submit"
              disabled={loading || subdomainStatus !== 'available'}
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: '8px',
                background: loading || subdomainStatus !== 'available' ? '#30363D' : 'linear-gradient(135deg, #E2AC00, #b49050)',
                color: loading || subdomainStatus !== 'available' ? '#8B949E' : '#0D1117',
                fontWeight: 700,
                border: 'none',
                cursor: loading || subdomainStatus !== 'available' ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(226, 172, 0, 0.15)'
              }}
            >
              {loading ? 'PROVISIONANDO CONTA...' : 'INICIAR TESTE GRÁTIS DE 14 DIAS'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.9rem' }}>
              <span style={{ color: '#8B949E' }}>Já possui uma conta? </span>
              <Link to="/login" style={{ color: '#58A6FF', textDecoration: 'none', fontWeight: 600 }}>Entrar</Link>
            </div>

          </form>
        </section>

        {/* Seleção de Planos */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#E2AC00', marginBottom: '0.5rem' }}>
            Selecione seu Plano Comercial
          </h2>
          <p style={{ color: '#8B949E', fontSize: '0.9rem', margin: 0 }}>
            Qualquer plano selecionado inicia em modo **Trial gratuito de 14 dias**, dando acesso total a todos os módulos do ERP (equivalente ao plano Pro) durante o período de testes.
          </p>

          {/* Grid de Planos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* PLANO BASIC */}
            <div 
              id="plan-basic"
              onClick={() => setPlano('basic')}
              style={{
                ...planCardStyle,
                border: plano === 'basic' ? '2px solid #E2AC00' : '1px solid rgba(240, 246, 252, 0.1)',
                background: plano === 'basic' ? 'rgba(226, 172, 0, 0.05)' : 'rgba(22, 27, 34, 0.6)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>BASIC</h3>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#E2AC00' }}>R$ 97<span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#8B949E' }}>/mês</span></span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#8B949E', margin: '0.5rem 0 1rem' }}>
                Ideal para marceneiros autônomos organizando orçamentos e clientes.
              </p>
              <ul style={{ ...planListStyle }}>
                <li>✓ Módulos CRM + Orçamentos Básicos</li>
                <li>✓ Cadastro de Clientes e Visitas</li>
                <li>✓ Até 2 usuários simultâneos</li>
                <li style={{ color: '#8B949E', textDecoration: 'line-through' }}>✗ Módulo Financeiro e DRE</li>
                <li style={{ color: '#8B949E', textDecoration: 'line-through' }}>✗ Assistente IA (Dlux)</li>
              </ul>
            </div>

            {/* PLANO PRO (RECOMENDADO) */}
            <div 
              id="plan-pro"
              onClick={() => setPlano('pro')}
              style={{
                ...planCardStyle,
                border: plano === 'pro' ? '2px solid #E2AC00' : '1px solid rgba(226, 172, 0, 0.3)',
                background: plano === 'pro' ? 'rgba(226, 172, 0, 0.08)' : 'rgba(22, 27, 34, 0.8)',
                position: 'relative'
              }}
            >
              <div style={{
                position: 'absolute',
                top: '-12px',
                right: '24px',
                background: '#E2AC00',
                color: '#0D1117',
                fontSize: '0.75rem',
                fontWeight: 800,
                padding: '0.25rem 0.75rem',
                borderRadius: '20px',
                letterSpacing: '0.5px'
              }}>
                RECOMENDADO / POPULAR
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#E2AC00' }}>PRO</h3>
                <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#E2AC00' }}>R$ 197<span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#8B949E' }}>/mês</span></span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#8B949E', margin: '0.5rem 0 1rem' }}>
                Gestão completa, controle financeiro integrado e IA inteligente de marcenaria.
              </p>
              <ul style={{ ...planListStyle }}>
                <li>✓ Módulos CRM + Orçamentos Completos</li>
                <li>✓ Módulo Financeiro, Caixa e Relatórios DRE</li>
                <li>✓ **Assistente IA (Dlux)** integrado no chat</li>
                <li>✓ Plano de Corte Industrial e Sobras</li>
                <li>✓ Até 5 usuários simultâneos</li>
              </ul>
            </div>

            {/* PLANO ENTERPRISE */}
            <div 
              id="plan-enterprise"
              onClick={() => setPlano('enterprise')}
              style={{
                ...planCardStyle,
                border: plano === 'enterprise' ? '2px solid #E2AC00' : '1px solid rgba(240, 246, 252, 0.1)',
                background: plano === 'enterprise' ? 'rgba(226, 172, 0, 0.05)' : 'rgba(22, 27, 34, 0.6)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>ENTERPRISE</h3>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#E2AC00' }}>R$ 397<span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#8B949E' }}>/mês</span></span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#8B949E', margin: '0.5rem 0 1rem' }}>
                Operação industrial em larga escala, controle CNC e suporte corporativo.
              </p>
              <ul style={{ ...planListStyle }}>
                <li>✓ Tudo do plano PRO</li>
                <li>✓ **Simulador 3D CNC** e percursos G-Code</li>
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

// Estilos Reutilizáveis
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.8rem 1rem',
  borderRadius: '8px',
  background: '#0D1117',
  border: '1px solid rgba(240, 246, 252, 0.15)',
  color: 'white',
  outline: 'none',
  fontSize: '0.95rem',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s ease'
};

const planCardStyle: React.CSSProperties = {
  padding: '1.5rem',
  borderRadius: '12px',
  cursor: 'pointer',
  transition: 'all 0.25s ease',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
};

const planListStyle: React.CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
  fontSize: '0.85rem',
  color: '#C9D1D9'
};

export default SignupPage;
