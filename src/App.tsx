import React, { Suspense, lazy, useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';

// Lazy loading das páginas (Mapeamento Cirúrgico)
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ClientsPage = lazy(() => import('./pages/ClientsPage'));
const OrcamentosPage = lazy(() => import('./pages/OrcamentosPage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const ProductionPage = lazy(() => import('./pages/ProductionPage'));
const CuttingPlanPage = lazy(() => import('./pages/CuttingPlanPage'));
const VisitsPage = lazy(() => import('./pages/VisitsPage'));
const CalendarioPage = lazy(() => import('./pages/CalendarioPage'));
const PosVendaPage = lazy(() => import('./pages/PosVendaPage'));
const InventoryPage = lazy(() => import('./pages/InventoryPage'));
const SuppliersPage = lazy(() => import('./pages/SuppliersPage'));
const EngineeringPage = lazy(() => import('./pages/EngineeringPage'));
const SKUsPage = lazy(() => import('./pages/SKUsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const FinancePage = lazy(() => import('./pages/FinancePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const NotificacoesPage = lazy(() => import('./pages/NotificacoesPage'));
const ComprasPage = lazy(() => import('./pages/ComprasPage'));
const AprovacaoPage = lazy(() => import('./pages/AprovacaoPage'));

// Layout e Componentes
const Layout = lazy(() => import('./components/layout/Layout'));

// Tela de loading segura
function LoadingScreen() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#0D1117',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid #1F2937',
        borderTop: '3px solid #E2AC00',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
      <span style={{ color: '#6B7280', fontSize: '14px', fontWeight: '500', letterSpacing: '0.05em' }}>
        CARREGANDO D'LUXURY...
      </span>
    </div>
  );
}

// ErrorBoundary como class component (conforme solicitado)
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary Core]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: '#0D1117',
          color: '#E2AC00',
          gap: '16px',
          padding: '32px',
          fontFamily: 'sans-serif',
          textAlign: 'center'
        }}>
          <h2 style={{ margin: 0, fontWeight: '800' }}>ALGO DEU ERRADO</h2>
          <p style={{ color: '#9CA3AF', maxWidth: '400px', fontSize: '14px' }}>
            {this.state.error?.message ?? 'Ocorreu um erro inesperado na interface.'}
          </p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#E2AC00', color: '#000',
                border: 'none', padding: '12px 24px',
                borderRadius: '8px', cursor: 'pointer',
                fontWeight: '900', textTransform: 'uppercase', fontSize: '12px'
              }}
            >
              Recarregar Sistema
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '/';
              }}
              style={{
                background: 'transparent',
                color: '#9CA3AF',
                border: '1px solid #374151',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '700', textTransform: 'uppercase', fontSize: '12px'
              }}
            >
              Reset Total
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Componente de autenticação por PIN
function PinGate({ children }: { children: React.ReactNode }) {
  const { setUser } = useAppContext();
  const [autenticado, setAutenticado] = useState<boolean | null>(null);
  const [pin, setPin] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const auth = sessionStorage.getItem('dluxury_auth');
    if (auth === 'ok') {
      setAutenticado(true);
      // Restaurar usuário bypass para o contexto
      setUser({
        id: 'bypass-id',
        name: 'Administrador',
        email: 'admin@dluxury.com',
        role: 'admin'
      });
    } else {
      setAutenticado(false);
    }
  }, [setUser]);

  const verificarPin = async () => {
    setLoading(true);
    setErro('');
    
    // Fallback de emergência imediato (1234) para agilizar acesso administrativo
    // e permitir testes locais sem backend.
    if (pin === '1234') {
      sessionStorage.setItem('dluxury_auth', 'ok');
      setUser({
        id: 'bypass-id',
        name: 'Administrador',
        email: 'admin@dluxury.com',
        role: 'admin'
      });
      setAutenticado(true);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api?action=verificar_pin&pin=${pin}`);
      const data = await res.json();
      
      if (data.ok) {
        sessionStorage.setItem('dluxury_auth', 'ok');
        setUser({
          id: 'bypass-id',
          name: 'Administrador',
          email: 'admin@dluxury.com',
          role: 'admin'
        });
        setAutenticado(true);
      } else {
        setErro('PIN INCORRETO');
        setPin('');
      }
    } catch (err) {
      setErro('ERRO DE CONEXÃO. TENTE NOVAMENTE.');
    } finally {
      setLoading(false);
    }
  };

  if (autenticado === null) return <LoadingScreen />;

  if (!autenticado) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#0D1117'
      }}>
        <div className="glass" style={{
          background: '#111827',
          border: '1px solid #1F2937',
          borderRadius: '24px',
          padding: '48px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          alignItems: 'center',
          minWidth: '350px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}>
          <img
            src="/logo.png"
            alt="D'Luxury"
            style={{ width: '100px', borderRadius: '16px', marginBottom: '8px' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ color: '#E2AC00', margin: 0, fontSize: '24px', fontWeight: '900', letterSpacing: '0.05em' }}>
              D'LUXURY ERP
            </h2>
            <p style={{ color: '#6B7280', fontSize: '12px', marginTop: '4px', fontWeight: '600' }}>ACESSO RESTRITO</p>
          </div>
          
          <input
            type="password"
            placeholder="••••"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && verificarPin()}
            style={{
              background: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '12px',
              color: '#F9FAFB',
              padding: '16px',
              fontSize: '24px',
              width: '100%',
              outline: 'none',
              textAlign: 'center',
              letterSpacing: '0.5em',
              transition: 'border-color 0.2s'
            }}
            autoFocus
          />
          
          {erro && (
            <p style={{ color: '#EF4444', fontSize: '12px', margin: 0, fontWeight: '800' }}>
              {erro}
            </p>
          )}
          
          <button
            onClick={verificarPin}
            disabled={!pin || loading}
            style={{
              background: pin ? '#E2AC00' : '#374151',
              color: pin ? '#000' : '#6B7280',
              border: 'none',
              borderRadius: '12px',
              padding: '16px',
              fontWeight: '900',
              cursor: pin ? 'pointer' : 'not-allowed',
              width: '100%',
              fontSize: '14px',
              textTransform: 'uppercase',
              transition: 'all 0.2s ease'
            }}
          >
            {loading ? 'VERIFICANDO...' : 'ENTRAR NO SISTEMA'}
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  // Verificação de rotas públicas antes do PinGate
  const hash = window.location.hash;
  const isPublicRoute = hash.startsWith('#/scan/') || hash.startsWith('#/aprovar/');

  return (
    <AppProvider>
      <ErrorBoundary>
        <HashRouter>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              {/* Rotas Públicas */}
              <Route path="scan/:numero" element={<Suspense fallback={<LoadingScreen />}><AprovacaoPage /></Suspense>} />
              <Route path="aprovar/:token" element={<Suspense fallback={<LoadingScreen />}><AprovacaoPage /></Suspense>} />
              
              {/* Rotas Protegidas */}
              <Route path="/" element={<PinGate><Layout /></PinGate>}>
                <Route index element={<Navigate to="/painel" replace />} />
                <Route path="painel" element={<DashboardPage />} />
                <Route path="clientes" element={<ClientsPage />} />
                <Route path="orcamentos" element={<OrcamentosPage />} />
                <Route path="projetos" element={<ProjectsPage />} />
                <Route path="producao" element={<ProductionPage />} />
                <Route path="plano-de-corte" element={<CuttingPlanPage />} />
                <Route path="visitas" element={<VisitsPage />} />
                <Route path="calendario" element={<CalendarioPage />} />
                <Route path="pos-venda" element={<PosVendaPage />} />
                <Route path="estoque" element={<InventoryPage />} />
                <Route path="fornecedores" element={<SuppliersPage />} />
                <Route path="engenharia" element={<EngineeringPage />} />
                <Route path="pecas" element={<SKUsPage />} />
                <Route path="relatorios" element={<ReportsPage />} />
                <Route path="financeiro" element={<FinancePage />} />
                <Route path="configuracoes" element={<SettingsPage />} />
                <Route path="notificacoes" element={<NotificacoesPage />} />
                <Route path="compras" element={<ComprasPage />} />
              </Route>

              {/* Redirecionamento 404 */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </HashRouter>
      </ErrorBoundary>
    </AppProvider>
  );
}
