import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';

// Lazy loading das páginas (Mapeamento Cirúrgico)
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ClientsPage = lazy(() => import('./pages/ClientsPage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const ProductionPage = lazy(() => import('./pages/ProductionPage'));
const CuttingPlanPage = lazy(() => import('./modules/plano-corte/ui/pages/PlanoCorteIndustrialPage'));
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
const FinanceContasPage = lazy(() => import('./pages/FinanceiroContasPage'));
const FinanceFormasPage = lazy(() => import('./pages/FinanceiroFormasPage'));
const FinanceCondicoesPage = lazy(() => import('./pages/FinanceiroCondicoesPage'));
const FinanceTitulosReceberPage = lazy(() => import('./pages/FinanceiroTitulosReceberPage'));
const FinanceTitulosReceberWizard = lazy(() => import('./pages/FinanceiroTitulosReceberWizard'));
const FinanceTitulosPagarPage = lazy(() => import('./pages/FinanceiroTitulosPagarPage'));
const FinanceTitulosPagarWizard = lazy(() => import('./pages/FinanceiroTitulosPagarWizard'));
const FinanceDREPage = lazy(() => import('./pages/FinanceiroDREPage'));
const FinanceAgingPage = lazy(() => import('./pages/FinanceiroAgingPage'));
const FinanceFluxoCaixaPage = lazy(() => import('./pages/FinanceiroFluxoCaixaPage'));
const FinanceRecorrentesPage = lazy(() => import('./pages/FinanceiroRecorrentesPage'));
const FinanceConciliacaoPage = lazy(() => import('./pages/FinanceiroConciliacaoPage'));
const FinanceRentabilidadePage = lazy(() => import('./pages/FinanceiroRentabilidadePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const NotificacoesPage = lazy(() => import('./pages/NotificacoesPage'));
const ComprasPage = lazy(() => import('./pages/ComprasPage'));
const AprovacaoPage = lazy(() => import('./pages/AprovacaoPage'));
const PlanoCorteDemoPage = lazy(() => import('./pages/PlanoCorteDemo'));
const RetalhosPage = lazy(() => import('./pages/RetalhosPage'));
const SimuladorCortePage = lazy(() => import('./modules/simulador-corte/ui/pages/SimuladorCortePage'));
const SimuladorProducaoPage = lazy(() => import('./modules/simulador-producao/ui/pages/SimuladorProducaoPage'));
const TermosUsoPage = lazy(() => import('./pages/TermosUsoPage'));
const PoliticaPrivacidadePage = lazy(() => import('./pages/PoliticaPrivacidadePage'));

// Layout e Componentes
const Layout = lazy(() => import('./components/layout/Layout'));

// Tela de loading segura
function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-background flex-col gap-4">
      <div className="w-9 h-9 border-3 border-border border-t-primary rounded-full animate-spin" />
      <span className="text-foreground text-[13px] font-semibold tracking-widest font-display">
        FATTO OS
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
        <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground gap-4 p-8 font-display text-center">
          <h2 className="m-0 font-bold text-xl tracking-tight">Algo deu errado</h2>
          <p className="text-muted-foreground max-w-[400px] text-sm leading-relaxed">
            {this.state.error?.message ?? 'Ocorreu um erro inesperado na interface.'}
          </p>
          <button onClick={() => window.location.reload()} className="btn btn-primary text-sm">
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

import { hasFeature } from './lib/features';

function AuthGuard() {
  const { user, authLoading } = useAppContext();

  if (authLoading) return <LoadingScreen />;
  if (!user) return <LoginPage />;
  return <Outlet />;
}

function FeatureGuard({ feature }: { feature: string }) {
  const { user, authLoading } = useAppContext();

  if (authLoading) return <LoadingScreen />;
  if (!user) return <LoginPage />;
  
  const hasAccess = hasFeature((user as any).planoTier || 'basic', feature);
  if (!hasAccess) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#FAFAFA',
        color: '#3E2723',
        gap: '16px',
        padding: '32px',
        fontFamily: "'DM Sans', sans-serif",
        textAlign: 'center'
      }}>
        <h2 style={{ margin: 0, fontWeight: '700', fontSize: '1.25rem', letterSpacing: '-0.02em' }}>Recurso exclusivo</h2>
        <p style={{ color: '#3E2723', opacity: 0.6, maxWidth: '450px', fontSize: '14px', lineHeight: '1.6' }}>
          Esta funcionalidade pertence a um plano superior. Faça o upgrade para liberar o acesso.
        </p>
        <button 
          onClick={() => window.location.hash = '#/configuracoes'} 
          style={{ 
            background: '#4A6B5E', 
            color: '#fff', 
            border: 'none', 
            padding: '10px 24px', 
            borderRadius: '8px', 
            cursor: 'pointer', 
            fontWeight: '600',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '14px'
          }}
        >
          Gerenciar Assinatura
        </button>
      </div>
    );
  }
  
  return <Outlet />;
}

import OrcamentoForm from './modules/orcamentos/pages/OrcamentoForm';

export default function App() {
  return (
    <ToastProvider>
      <AppProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <HashRouter>
              <Suspense fallback={<LoadingScreen />}>
                <Routes>
                  {/* Rotas Públicas */}
                  <Route path="/" element={<Suspense fallback={<LoadingScreen />}><LandingPage /></Suspense>} />
                  <Route path="login" element={<Navigate to="/painel" replace />} />
                  <Route path="signup" element={<Suspense fallback={<LoadingScreen />}><SignupPage /></Suspense>} />
                  <Route path="checkout" element={<Suspense fallback={<LoadingScreen />}><CheckoutPage /></Suspense>} />
                  <Route path="scan/:numero" element={<Suspense fallback={<LoadingScreen />}><AprovacaoPage token="" /></Suspense>} />
                  <Route path="aprovar/:token" element={<Suspense fallback={<LoadingScreen />}><AprovacaoPage token="" /></Suspense>} />
                  <Route path="termos" element={<Suspense fallback={<LoadingScreen />}><TermosUsoPage /></Suspense>} />
                  <Route path="privacidade" element={<Suspense fallback={<LoadingScreen />}><PoliticaPrivacidadePage /></Suspense>} />
                  
                  {/* Rotas Autenticadas */}
                  <Route element={<AuthGuard />}>
                    <Route element={<Layout />}>
                      {/* Rotas Comuns do Plano Basic (e superiores) */}
                      <Route path="painel" element={<DashboardPage />} />
                      <Route path="clientes" element={<ClientsPage />} />
                      <Route path="orcamentos" element={<OrcamentoForm />} />
                      <Route path="projetos" element={<ProjectsPage />} />
                      <Route path="visitas" element={<VisitsPage />} />
                      <Route path="calendario" element={<CalendarioPage />} />
                      <Route path="pos-venda" element={<PosVendaPage />} />
                      <Route path="relatorios" element={<ReportsPage />} />
                      <Route path="configuracoes" element={<SettingsPage />} />
                      <Route path="notificacoes" element={<NotificacoesPage />} />

                      {/* Rotas de Produção / Plano de Corte (Pro e Enterprise) */}
                      <Route element={<FeatureGuard feature="plano_corte" />}>
                        <Route path="producao" element={<ProductionPage />} />
                        <Route path="plano-de-corte" element={<CuttingPlanPage />} />
                        <Route path="plano-de-corte-demo" element={<PlanoCorteDemoPage />} />
                        <Route path="simulador-producao" element={<SimuladorProducaoPage />} />
                        <Route path="retalhos" element={<RetalhosPage />} />
                        <Route path="engenharia" element={<EngineeringPage />} />
                        <Route path="pecas" element={<SKUsPage />} />
                      </Route>

                      {/* Rotas de Estoque e Compras (Pro e Enterprise) */}
                      <Route element={<FeatureGuard feature="estoque" />}>
                        <Route path="estoque" element={<InventoryPage />} />
                        <Route path="fornecedores" element={<SuppliersPage />} />
                        <Route path="compras" element={<ComprasPage />} />
                      </Route>

                      {/* Rotas de Financeiro (Pro e Enterprise) */}
                      <Route element={<FeatureGuard feature="financeiro" />}>
                        <Route path="financeiro" element={<FinancePage />} />
                        <Route path="financeiro/classes" element={<FinanceClassesPage />} />
                        <Route path="financeiro/contas" element={<FinanceContasPage />} />
                        <Route path="financeiro/formas" element={<FinanceFormasPage />} />
                        <Route path="financeiro/condicoes" element={<FinanceCondicoesPage />} />
                        <Route path="financeiro/titulos-receber" element={<FinanceTitulosReceberPage />} />
                        <Route path="financeiro/titulos-receber/wizard" element={<FinanceTitulosReceberWizard />} />
                        <Route path="financeiro/titulos-pagar" element={<FinanceTitulosPagarPage />} />
                        <Route path="financeiro/titulos-pagar/wizard" element={<FinanceTitulosPagarWizard />} />
                        <Route path="financeiro/dre" element={<FinanceDREPage />} />
                        <Route path="financeiro/aging" element={<FinanceAgingPage />} />
                        <Route path="financeiro/fluxo-caixa" element={<FinanceFluxoCaixaPage />} />
                        <Route path="financeiro/recorrentes" element={<FinanceRecorrentesPage />} />
                        <Route path="financeiro/conciliacao" element={<FinanceConciliacaoPage />} />
                        <Route path="financeiro/rentabilidade" element={<FinanceRentabilidadePage />} />
                      </Route>

                      {/* Rotas de Simulador CNC 3D (Enterprise) */}
                      <Route element={<FeatureGuard feature="simulador_cnc" />}>
                        <Route path="simulador-corte" element={<SimuladorCortePage />} />
                      </Route>
                    </Route>
                  </Route>

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </HashRouter>
          </ErrorBoundary>
        </ThemeProvider>
      </AppProvider>
    </ToastProvider>
  );
}
