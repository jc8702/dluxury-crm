import React, { Suspense, lazy, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';

// Lazy loading das páginas (Mapeamento Cirúrgico)
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ClientsPage = lazy(() => import('./pages/ClientsPage'));
const OrcamentosPage = lazy(() => import('./pages/OrcamentosPage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const ProductionPage = lazy(() => import('./pages/ProductionPage'));
const CuttingPlanPage = lazy(() => import('./modules/plano-de-corte/ui/pages/PlanoDeCorte'));
const VisitsPage = lazy(() => import('./pages/VisitsPage'));
const CalendarioPage = lazy(() => import('./pages/CalendarioPage'));
const PosVendaPage = lazy(() => import('./pages/PosVendaPage'));
const InventoryPage = lazy(() => import('./pages/InventoryPage'));
const SuppliersPage = lazy(() => import('./pages/SuppliersPage'));
const EngineeringPage = lazy(() => import('./pages/EngineeringPage'));
const SKUsPage = lazy(() => import('./pages/SKUsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const FinancePage = lazy(() => import('./pages/FinancePage'));
const FinanceClassesPage = lazy(() => import('./pages/FinanceiroClassesPage'));
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

// ErrorBoundary como class component
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
          <button onClick={() => window.location.reload()} style={{ background: '#E2AC00', color: '#000', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: '900' }}>
            RECARREGAR
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Componente para garantir que o usuário admin esteja sempre logado
function AuthBypass({ children }: { children: React.ReactNode }) {
  const { setUser, user } = useAppContext();

  useEffect(() => {
    if (!user) {
      setUser({
        id: 'bypass-id',
        name: 'Administrador',
        email: 'admin@dluxury.com',
        role: 'admin'
      });
    }
  }, [user, setUser]);

  return <>{children}</>;
}

export default function App() {
  return (
    <AppProvider>
      <ErrorBoundary>
        <HashRouter>
          <Suspense fallback={<LoadingScreen />}>
            <AuthBypass>
              <Routes>
                {/* Rotas Públicas */}
                <Route path="scan/:numero" element={<Suspense fallback={<LoadingScreen />}><AprovacaoPage /></Suspense>} />
                <Route path="aprovar/:token" element={<Suspense fallback={<LoadingScreen />}><AprovacaoPage /></Suspense>} />
                
                {/* Rotas Principais */}
                <Route path="/" element={<Layout />}>
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
                  <Route path="financeiro/classes" element={<FinanceClassesPage />} />
                  <Route path="configuracoes" element={<SettingsPage />} />
                  <Route path="notificacoes" element={<NotificacoesPage />} />
                  <Route path="compras" element={<ComprasPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AuthBypass>
          </Suspense>
        </HashRouter>
      </ErrorBoundary>
    </AppProvider>
  );
}
