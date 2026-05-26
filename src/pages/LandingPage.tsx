import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { 
  Shield, DollarSign, Hammer, Cpu, Users, 
  Layers, Ruler, Pin, FileText, CheckCircle, 
  TrendingUp, Box, Calendar, ShoppingCart, 
  HelpCircle, Activity, FileCheck, Phone
} from 'lucide-react';

const LandingPage: React.FC = () => {
  const { user } = useAppContext();
  const navigate = useNavigate();

  // Redirecionar usuário se ele já estiver logado
  useEffect(() => {
    if (user) {
      navigate('/painel');
    }
  }, [user, navigate]);

  const modulos = [
    { nome: 'CRM & Clientes', desc: 'Funil de vendas, cadastro e histórico completo do cliente.', icon: Users },
    { nome: 'Orçamentos PRO', desc: 'Geração técnica de orçamentos com margens e custos detalhados.', icon: DollarSign },
    { nome: 'Projetos 3D', desc: 'Acompanhamento de visitas, medições e status do projeto.', icon: Layers },
    { nome: 'Plano de Corte', desc: 'Algoritmo industrial Guillotine e MaxRects para chapas.', icon: Ruler },
    { nome: 'Simulador 3D CNC', desc: 'Verificação tridimensional de percursos e spindle CNC.', icon: Cpu },
    { nome: 'Controle de Produção', desc: 'Fases de corte, furação, colagem de borda e montagem.', icon: Hammer },
    { nome: 'Gestão de Sobras', desc: 'Aproveitamento e herança automática de retalhos MDF.', icon: Box },
    { nome: 'Estoque Avançado', desc: 'Conversão automática de chapas para m² e alertas críticos.', icon: Pin },
    { nome: 'Compras & NF', desc: 'Cotação de fornecedores, recebimento de materiais e notas.', icon: ShoppingCart },
    { nome: 'Fluxo de Caixa', desc: 'DRE, plano de contas e conciliação bancária.', icon: TrendingUp },
    { nome: 'Contas a Pagar/Receber', desc: 'Gestão de vencimentos e régua de cobrança automática.', icon: FileText },
    { nome: 'Agenda Industrial', desc: 'Calendário sincronizado de montagens e visitas.', icon: Calendar },
    { nome: 'Pós-Venda & Garantia', desc: 'Chamados técnicos, fotos e custos sob garantia.', icon: Shield },
    { nome: 'Análise de Margens', desc: 'Cálculo automatizado do markup por comodo.', icon: Activity },
    { nome: 'Etiquetas QR Code', desc: 'Geração de etiquetas industriais para peças e retalhos.', icon: FileCheck },
    { nome: 'Assistente IA (Dlux)', desc: 'IA especialista integrada para engenharia e marcenaria.', icon: Cpu },
    { nome: 'Notificações', desc: 'Alertas automáticos de prazos, estoque e cobranças.', icon: FileText },
    { nome: 'Relatórios DRE', desc: 'Visão executiva de rentabilidade, faturamento e custos.', icon: TrendingUp },
  ];

  return (
    <div style={{
      background: '#0D1117',
      color: '#F0F6FC',
      fontFamily: 'Inter, sans-serif',
      minHeight: '100vh',
      boxSizing: 'border-box',
      overflowX: 'hidden'
    }}>
      
      {/* ── NAVBAR ── */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '1.5rem 2rem', maxWidth: '1200px', margin: '0 auto',
        borderBottom: '1px solid rgba(240, 246, 252, 0.08)'
      }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#E2AC00', letterSpacing: '1px' }}>
          D'LUXURY CRM
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <a href="#modulos" style={navLinkStyle}>Módulos</a>
          <a href="#precos" style={navLinkStyle}>Preços</a>
          <a href="#faq" style={navLinkStyle}>FAQ</a>
          <button 
            onClick={() => navigate('/login')}
            style={{
              background: 'transparent', border: '1px solid rgba(240, 246, 252, 0.2)',
              color: '#F0F6FC', padding: '0.5rem 1.2rem', borderRadius: '8px',
              fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease'
            }}
          >
            Entrar
          </button>
          <button 
            onClick={() => navigate('/signup')}
            style={{
              background: 'linear-gradient(135deg, #E2AC00, #b49050)', border: 'none',
              color: '#0D1117', padding: '0.5rem 1.2rem', borderRadius: '8px',
              fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(226, 172, 0, 0.2)'
            }}
          >
            Teste Grátis
          </button>
        </div>
      </nav>

      {/* ── HERO SECTION ── */}
      <header style={{
        textAlign: 'center', padding: '5rem 1rem 4rem', maxWidth: '800px', margin: '0 auto'
      }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, color: '#F0F6FC', lineHeight: '1.2', margin: 0 }}>
          O ERP de Gestão Completa para <span style={{ color: '#E2AC00' }}>Marcenarias de Alto Padrão</span>
        </h1>
        <p style={{ color: '#8B949E', fontSize: '1.2rem', marginTop: '1.5rem', lineHeight: '1.6' }}>
          Do CRM e projeto 3D ao Plano de Corte Industrial e Simulador CNC. Controle o seu financeiro, compre materiais de forma inteligente e aumente a produtividade com IA integrada.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2.5rem' }}>
          <button 
            onClick={() => navigate('/signup')}
            style={{
              background: 'linear-gradient(135deg, #E2AC00, #b49050)', border: 'none',
              color: '#0D1117', padding: '1rem 2rem', borderRadius: '8px',
              fontWeight: 700, cursor: 'pointer', fontSize: '1.1rem',
              boxShadow: '0 4px 16px rgba(226, 172, 0, 0.3)', transition: 'all 0.2s ease'
            }}
          >
            INICIAR TESTE GRÁTIS DE 14 DIAS
          </button>
          <a 
            href="#modulos"
            style={{
              background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(240, 246, 252, 0.15)',
              color: '#F0F6FC', padding: '1rem 2rem', borderRadius: '8px',
              fontWeight: 600, textDecoration: 'none', fontSize: '1.1rem',
              display: 'inline-flex', alignItems: 'center', transition: 'all 0.2s ease'
            }}
          >
            Ver Módulos
          </a>
        </div>
      </header>

      {/* Mockup do Dashboard */}
      <div style={{
        maxWidth: '1000px', margin: '0 auto 5rem', padding: '0 1rem',
        boxSizing: 'border-box'
      }}>
        <div style={{
          background: '#161B22', border: '4px solid #30363D', borderRadius: '16px',
          padding: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          minHeight: '300px', display: 'flex', flexDirection: 'column', gap: '1rem'
        }}>
          {/* Top Bar do mockup */}
          <div style={{ display: 'flex', gap: '6px', paddingBottom: '1rem', borderBottom: '1px solid #30363D' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#FF5F56' }} />
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#FFBD2E' }} />
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#27C93F' }} />
            <span style={{ color: '#8B949E', fontSize: '0.8rem', marginLeft: '1rem', fontFamily: 'monospace' }}>
              https://artemadeira.dluxury-crm.vercel.app/painel
            </span>
          </div>
          {/* Conteúdo do dashboard fictício */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '1rem', flex: 1 }}>
            <div style={{ borderRight: '1px solid #30363D', paddingRight: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ height: '16px', background: '#30363D', borderRadius: '4px', width: '80%' }} />
              <div style={{ height: '16px', background: '#30363D', borderRadius: '4px', width: '60%' }} />
              <div style={{ height: '16px', background: '#30363D', borderRadius: '4px', width: '90%' }} />
              <div style={{ height: '16px', background: '#30363D', borderRadius: '4px', width: '70%' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div style={{ background: '#21262D', padding: '1rem', borderRadius: '8px', border: '1px solid #30363D' }}>
                  <span style={{ color: '#8B949E', fontSize: '0.75rem' }}>ORÇAMENTOS APROVADOS</span>
                  <p style={{ margin: '0.5rem 0 0', fontSize: '1.5rem', fontWeight: 800, color: '#E2AC00' }}>R$ 148.500</p>
                </div>
                <div style={{ background: '#21262D', padding: '1rem', borderRadius: '8px', border: '1px solid #30363D' }}>
                  <span style={{ color: '#8B949E', fontSize: '0.75rem' }}>PROJETOS EM MONTAGEM</span>
                  <p style={{ margin: '0.5rem 0 0', fontSize: '1.5rem', fontWeight: 800 }}>8 ATIVOS</p>
                </div>
                <div style={{ background: '#21262D', padding: '1rem', borderRadius: '8px', border: '1px solid #30363D' }}>
                  <span style={{ color: '#8B949E', fontSize: '0.75rem' }}>APROVEITAMENTO MDF</span>
                  <p style={{ margin: '0.5rem 0 0', fontSize: '1.5rem', fontWeight: 800, color: '#3FB950' }}>87.4%</p>
                </div>
              </div>
              <div style={{ background: '#21262D', height: '150px', borderRadius: '8px', border: '1px solid #30363D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#8B949E', fontSize: '0.85rem' }}>Gráficos interativos e mapas de corte 3D CNC</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MÓDULOS SECTION (BENTO GRID) ── */}
      <section id="modulos" style={{
        padding: '5rem 1rem', maxWidth: '1200px', margin: '0 auto'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#E2AC00', margin: 0 }}>
            Uma Solução Total com 18 Módulos Integrados
          </h2>
          <p style={{ color: '#8B949E', fontSize: '1.1rem', marginTop: '0.75rem' }}>
            Esqueça planilhas e sistemas parciais. Gerencie 100% da sua marcenaria em uma única plataforma.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '1.5rem'
        }}>
          {modulos.map((m, index) => {
            const Icon = m.icon;
            return (
              <div key={index} style={{
                background: 'rgba(22, 27, 34, 0.7)',
                border: '1px solid rgba(240, 246, 252, 0.08)',
                borderRadius: '12px',
                padding: '1.5rem',
                transition: 'all 0.25s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                cursor: 'default'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(226, 172, 0, 0.4)';
                e.currentTarget.style.transform = 'translateY(-3px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(240, 246, 252, 0.08)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              >
                <div style={{
                  background: 'rgba(226, 172, 0, 0.1)',
                  borderRadius: '8px',
                  padding: '0.5rem',
                  width: 'fit-content',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#E2AC00'
                }}>
                  <Icon size={24} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{m.nome}</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#8B949E', lineHeight: '1.4' }}>{m.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── PLANOS & PREÇOS ── */}
      <section id="precos" style={{
        padding: '5rem 1rem', background: '#161B22', borderTop: '1px solid rgba(240,246,252,0.05)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#E2AC00', margin: 0 }}>
              Planos Transparentes e sem Contrato
            </h2>
            <p style={{ color: '#8B949E', fontSize: '1.1rem', marginTop: '0.75rem' }}>
              Escolha o plano ideal para a sua marcenaria. Cancele quando quiser.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem',
            alignItems: 'start'
          }}>
            
            {/* PLANO BASIC */}
            <div style={priceCardStyle}>
              <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>BASIC</h3>
              <p style={{ fontSize: '0.85rem', color: '#8B949E', margin: '0.5rem 0' }}>Para marceneiros autônomos</p>
              <div style={{ margin: '1.5rem 0' }}>
                <span style={{ fontSize: '2.2rem', fontWeight: 800, color: '#E2AC00' }}>R$ 97</span>
                <span style={{ color: '#8B949E', fontSize: '0.9rem' }}>/mês</span>
              </div>
              <button onClick={() => navigate('/signup')} style={priceCardButtonStyle}>
                COMEÇAR TESTE GRÁTIS
              </button>
              <ul style={priceCardListStyle}>
                <li>✓ Módulos CRM + Clientes</li>
                <li>✓ Orçamentos Básicos</li>
                <li>✓ Agenda de Visitas</li>
                <li>✓ Até 2 usuários simultâneos</li>
                <li style={{ color: '#8B949E', textDecoration: 'line-through' }}>✗ Módulo Financeiro Completo</li>
                <li style={{ color: '#8B949E', textDecoration: 'line-through' }}>✗ Assistente IA (Dlux)</li>
              </ul>
            </div>

            {/* PLANO PRO */}
            <div style={{
              ...priceCardStyle,
              border: '2px solid #E2AC00',
              background: 'rgba(226, 172, 0, 0.04)',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute', top: '-12px', right: '24px',
                background: '#E2AC00', color: '#0D1117',
                fontSize: '0.75rem', fontWeight: 800,
                padding: '0.25rem 0.75rem', borderRadius: '20px'
              }}>
                MAIS POPULAR
              </div>
              <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#E2AC00' }}>PRO</h3>
              <p style={{ fontSize: '0.85rem', color: '#8B949E', margin: '0.5rem 0' }}>Gestão integrada e IA</p>
              <div style={{ margin: '1.5rem 0' }}>
                <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#E2AC00' }}>R$ 197</span>
                <span style={{ color: '#8B949E', fontSize: '0.9rem' }}>/mês</span>
              </div>
              <button 
                onClick={() => navigate('/signup')}
                style={{
                  ...priceCardButtonStyle,
                  background: 'linear-gradient(135deg, #E2AC00, #b49050)',
                  color: '#0D1117'
                }}
              >
                COMEÇAR TESTE GRÁTIS
              </button>
              <ul style={priceCardListStyle}>
                <li>✓ Tudo do Plano Basic</li>
                <li>✓ Módulo Financeiro, DRE e Contas</li>
                <li>✓ **Assistente IA (Dlux)** no chat</li>
                <li>✓ Plano de Corte Industrial</li>
                <li>✓ Até 5 usuários simultâneos</li>
              </ul>
            </div>

            {/* PLANO ENTERPRISE */}
            <div style={priceCardStyle}>
              <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>ENTERPRISE</h3>
              <p style={{ fontSize: '0.85rem', color: '#8B949E', margin: '0.5rem 0' }}>Escala industrial e CNC</p>
              <div style={{ margin: '1.5rem 0' }}>
                <span style={{ fontSize: '2.2rem', fontWeight: 800, color: '#E2AC00' }}>R$ 397</span>
                <span style={{ color: '#8B949E', fontSize: '0.9rem' }}>/mês</span>
              </div>
              <button onClick={() => navigate('/signup')} style={priceCardButtonStyle}>
                COMEÇAR TESTE GRÁTIS
              </button>
              <ul style={priceCardListStyle}>
                <li>✓ Tudo do Plano PRO</li>
                <li>✓ **Simulador 3D CNC** e Percursos</li>
                <li>✓ Gestão de Ordens de Produção</li>
                <li>✓ Usuários ilimitados</li>
                <li>✓ Suporte VIP dedicado</li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* ── FAQ SECTION ── */}
      <section id="faq" style={{
        padding: '5rem 1rem', maxWidth: '800px', margin: '0 auto'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#E2AC00', margin: 0 }}>
            Perguntas Frequentes
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#E2AC00' }}>
              Como funciona o período de testes grátis?
            </h4>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#8B949E', lineHeight: '1.5' }}>
              Ao se cadastrar, você ganha 14 dias de acesso completo sem custos. Não é necessário cartão de crédito para testar. Após o período, você pode optar por assinar qualquer um dos planos.
            </p>
          </div>
          <div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#E2AC00' }}>
              Como funciona o assistente de IA Dlux?
            </h4>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#8B949E', lineHeight: '1.5' }}>
              O Dlux é uma IA especialista treinada nas normas físicas e de engenharia de móveis sob medida. Ele é integrado ao chat e pode responder dúvidas, calcular folgas, analisar SKUs de engenharia e dar sugestões de marcenaria em tempo real.
            </p>
          </div>
          <div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#E2AC00' }}>
              Posso cancelar a qualquer momento?
            </h4>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#8B949E', lineHeight: '1.5' }}>
              Sim, o serviço funciona no modelo de assinatura mensal. Você pode cancelar sua assinatura diretamente no painel de configurações a qualquer momento, sem taxas ou multas de rescisão.
            </p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        background: '#090D13', padding: '3rem 2rem',
        borderTop: '1px solid rgba(240, 246, 252, 0.08)',
        textAlign: 'center'
      }}>
        <p style={{ margin: 0, color: '#8B949E', fontSize: '0.9rem' }}>
          &copy; {new Date().getFullYear()} D'Luxury CRM. Todos os direitos reservados.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1rem', fontSize: '0.85rem' }}>
          <a href="/termos" style={{ color: '#58A6FF', textDecoration: 'none' }}>Termos de Uso</a>
          <a href="/privacidade" style={{ color: '#58A6FF', textDecoration: 'none' }}>Política de Privacidade</a>
          <span style={{ color: '#8B949E' }}>Suporte: comercial@dluxury-crm.vercel.app</span>
        </div>
      </footer>

      {/* Botão de WhatsApp Flutuante */}
      <a 
        href="https://wa.me/5511999999999?text=Olá,%20gostaria%20de%20saber%20mais%20sobre%20o%20D'Luxury%20CRM"
        target="_blank" rel="noopener noreferrer"
        style={{
          position: 'fixed', bottom: '24px', right: '24px',
          background: '#25D366', color: 'white', borderRadius: '50%',
          width: '56px', height: '56px', display: 'flex', alignItems: 'center',
          justifyContent: 'center', boxShadow: '0 4px 16px rgba(37,211,102,0.4)',
          transition: 'transform 0.2s ease', zIndex: 1000
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1.0)'}
      >
        <Phone size={24} />
      </a>

    </div>
  );
};

const navLinkStyle: React.CSSProperties = {
  color: '#8B949E',
  textDecoration: 'none',
  fontSize: '0.95rem',
  fontWeight: 600,
  transition: 'color 0.2s ease',
  cursor: 'pointer'
};

const priceCardStyle: React.CSSProperties = {
  background: '#1D2128',
  border: '1px solid rgba(240, 246, 252, 0.1)',
  borderRadius: '16px',
  padding: '2.5rem 2rem',
  textAlign: 'center',
  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
  display: 'flex',
  flexDirection: 'column',
  boxSizing: 'border-box'
};

const priceCardButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.85rem',
  borderRadius: '8px',
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(240, 246, 252, 0.2)',
  color: '#F0F6FC',
  fontWeight: 700,
  fontSize: '0.95rem',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  marginBottom: '2rem'
};

const priceCardListStyle: React.CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  textAlign: 'left',
  fontSize: '0.9rem',
  color: '#C9D1D9'
};

export default LandingPage;
