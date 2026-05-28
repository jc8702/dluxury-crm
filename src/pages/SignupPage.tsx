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
      background: '#0F1713', // Ébano
      color: '#F9F8F6', // Off-White
      fontFamily: 'Outfit, Inter, sans-serif',
      padding: '3rem 1.5rem',
      boxSizing: 'border-box'
    }}>
      {/* Header / Brand */}
      <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '18px',
          background: 'linear-gradient(135deg, #8B5A2B, #D4AF37)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem', color: 'white', fontWeight: 900,
          fontSize: '1.8rem', boxShadow: '0 8px 20px rgba(139,90,43,0.3)'
        }}>
          F
        </div>
        <h1 id="signup-title" style={{ color: 'white', fontSize: '2.4rem', fontWeight: 900, margin: 0, letterSpacing: '1px' }}>
          FATTO OS
        </h1>
        <p style={{ color: '#D4AF37', fontSize: '0.85rem', fontWeight: 700, marginTop: '0.5rem', textTransform: 'uppercase', letterSpacing: '3px' }}>
          Plataforma de Gestão Moveleira Premium
        </p>
      </div>

      {/* Main Container */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '3rem',
        maxWidth: '1200px',
        width: '100%',
        margin: '0 auto',
        flex: 1,
        alignItems: 'start'
      }}>
        
        {/* Formulário de Cadastro */}
        <section style={{
          background: '#F9F8F6', // Off-White
          border: '1px solid rgba(28, 46, 36, 0.06)',
          borderRadius: '24px',
          padding: '2.5rem',
          color: '#1C2E24', // Laca Musgo
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.35)'
        }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1.5rem', color: '#1C2E24', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Informações da Conta
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Nome da Marcenaria */}
            <div>
              <label style={{ fontSize: '0.75rem', color: '#1C2E24', display: 'block', marginBottom: '0.4rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
              <label style={{ fontSize: '0.75rem', color: '#1C2E24', display: 'block', marginBottom: '0.4rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
                  color: '#8B5A2B',
                  fontSize: '0.85rem',
                  fontWeight: 700
                }}>
                  .fatto-os
                </span>
              </div>
              <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {subdomainStatus === 'checking' && <span style={{ color: '#8B949E' }}>Verificando disponibilidade...</span>}
                {subdomainStatus === 'available' && <span style={{ color: '#2E7D32', fontWeight: 700 }}>✓ Subdomínio disponível</span>}
                {subdomainStatus === 'unavailable' && <span style={{ color: '#C62828', fontWeight: 700 }}>✗ Subdomínio em uso ou inválido</span>}
                {subdomainStatus === 'idle' && <span style={{ color: '#704822', fontWeight: 500 }}>Exemplo: suamarcenaria.fatto-os.vercel.app</span>}
              </div>
            </div>

            {/* Nome Completo Admin */}
            <div>
              <label style={{ fontSize: '0.75rem', color: '#1C2E24', display: 'block', marginBottom: '0.4rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
              <label style={{ fontSize: '0.75rem', color: '#1C2E24', display: 'block', marginBottom: '0.4rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
              <label style={{ fontSize: '0.75rem', color: '#1C2E24', display: 'block', marginBottom: '0.4rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
              <label style={{ fontSize: '0.75rem', color: '#1C2E24', display: 'block', marginBottom: '0.4rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
              <label htmlFor="checkbox-termos" style={{ fontSize: '0.75rem', color: '#555', lineHeight: '1.4', cursor: 'pointer', fontWeight: 500 }}>
                Eu concordo com os <a href="/termos" target="_blank" rel="noopener noreferrer" style={{ color: '#8B5A2B', textDecoration: 'none', fontWeight: 700 }}>Termos de Uso</a> e com a <a href="/privacidade" target="_blank" rel="noopener noreferrer" style={{ color: '#8B5A2B', textDecoration: 'none', fontWeight: 700 }}>Política de Privacidade</a> de acordo com as normas da LGPD.
              </label>
            </div>

            {error && (
              <div style={{
                color: '#C62828',
                fontSize: '0.8rem',
                padding: '0.75rem',
                background: 'rgba(198, 40, 40, 0.05)',
                border: '1px solid rgba(198, 40, 40, 0.15)',
                borderRadius: '10px',
                fontWeight: 500
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
                borderRadius: '12px',
                background: loading || subdomainStatus !== 'available' ? '#A1887F' : '#8B5A2B',
                color: 'white',
                fontWeight: 700,
                border: 'none',
                cursor: loading || subdomainStatus !== 'available' ? 'not-allowed' : 'pointer',
                fontSize: '0.95rem',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(139, 90, 43, 0.25)'
              }}
            >
              {loading ? 'Provisionando Conta...' : 'Iniciar Teste de 14 Dias'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.85rem', fontWeight: 500 }}>
              <span style={{ color: '#555' }}>Já possui uma conta? </span>
              <Link to="/login" style={{ color: '#8B5A2B', textDecoration: 'none', fontWeight: 700 }}>Entrar</Link>
            </div>

          </form>
        </section>

        {/* Seleção de Planos */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#D4AF37', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Selecione seu Plano Comercial
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: 0, lineHeight: 1.6 }}>
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
                border: plano === 'basic' ? '2px solid #D4AF37' : '1px solid rgba(255, 255, 255, 0.08)',
                background: plano === 'basic' ? 'rgba(212, 175, 55, 0.06)' : 'rgba(28, 46, 36, 0.4)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>BASIC</h3>
                <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#D4AF37' }}>R$ 97<span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>/mês</span></span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', margin: '0.5rem 0 1rem' }}>
                Ideal para marceneiros autônomos organizando orçamentos e clientes.
              </p>
              <ul style={{ ...planListStyle }}>
                <li>✓ Módulos CRM + Orçamentos Básicos</li>
                <li>✓ Cadastro de Clientes e Visitas</li>
                <li>✓ Até 2 usuários simultâneos</li>
                <li style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'line-through' }}>✗ Módulo Financeiro e DRE</li>
                <li style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'line-through' }}>✗ Assistente IA (Dlux)</li>
              </ul>
            </div>

            {/* PLANO PRO (RECOMENDADO) */}
            <div 
              id="plan-pro"
              onClick={() => setPlano('pro')}
              style={{
                ...planCardStyle,
                border: plano === 'pro' ? '2px solid #D4AF37' : '1px solid rgba(212, 175, 55, 0.3)',
                background: plano === 'pro' ? 'rgba(212, 175, 55, 0.09)' : 'rgba(28, 46, 36, 0.6)',
                position: 'relative'
              }}
            >
              <div style={{
                position: 'absolute',
                top: '-12px',
                right: '24px',
                background: '#D4AF37',
                color: '#0F1713',
                fontSize: '0.7rem',
                fontWeight: 900,
                padding: '0.3rem 0.85rem',
                borderRadius: '20px',
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}>
                RECOMENDADO / POPULAR
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#D4AF37' }}>PRO</h3>
                <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#D4AF37' }}>R$ 197<span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>/mês</span></span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', margin: '0.5rem 0 1rem' }}>
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
                border: plano === 'enterprise' ? '2px solid #D4AF37' : '1px solid rgba(255, 255, 255, 0.08)',
                background: plano === 'enterprise' ? 'rgba(212, 175, 55, 0.06)' : 'rgba(28, 46, 36, 0.4)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>ENTERPRISE</h3>
                <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#D4AF37' }}>R$ 397<span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>/mês</span></span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', margin: '0.5rem 0 1rem' }}>
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
  padding: '0.85rem 1rem',
  borderRadius: '12px',
  background: 'white',
  border: '1px solid rgba(28, 46, 36, 0.12)',
  color: '#1C2E24',
  outline: 'none',
  fontSize: '0.95rem',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s ease',
  fontFamily: 'Inter, sans-serif'
};

const planCardStyle: React.CSSProperties = {
  padding: '1.5rem',
  borderRadius: '16px',
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
