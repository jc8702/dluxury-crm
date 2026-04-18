import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/layout/Sidebar';
import { AppProvider, useAppContext } from './context/AppContext';
import CopilotAssistant from './components/ai/CopilotAssistant';
import Login from './components/auth/Login';
import ErrorBoundary from './components/ErrorBoundaries';
import NotificationBell from './components/ui/NotificationBell';
import { api } from './lib/api';

// Importando da nova camada de Pages
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import OrcamentosPage from './pages/OrcamentosPage';
import ProjectsPage from './pages/ProjectsPage';
import ProductionPage from './pages/ProductionPage';
import VisitsPage from './pages/VisitsPage';
import InventoryPage from './pages/InventoryPage';
import SuppliersPage from './pages/SuppliersPage';
import FinancePage from './pages/FinancePage';
import EngineeringPage from './pages/EngineeringPage';
import SKUsPage from './pages/SKUsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import CuttingPlanPage from './pages/CuttingPlanPage';
import PosVendaPage from './pages/PosVendaPage';
import ComprasPage from './pages/ComprasPage';
import CalendarioPage from './pages/CalendarioPage';
import NotificacoesPage from './pages/NotificacoesPage';
import AprovacaoPage from './pages/AprovacaoPage';

type Tab = 'dashboard' | 'clients' | 'estimates' | 'projects' | 'production' | 'visits' | 'inventory' | 'suppliers' | 'finance' | 'engineering' | 'skus' | 'reports' | 'settings' | 'cutting_plan' | 'after_sales' | 'purchasing' | 'calendar' | 'notifications';

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('dluxury_theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('dluxury_theme', theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
      aria-label="Alternar tema"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}

function AppContent() {
  const { user, setUser } = useAppContext();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isPublicRoute, setIsPublicRoute] = useState(false);

  useEffect(() => {
    if (window.location.pathname.startsWith('/aprovar/')) {
      setIsPublicRoute(true);
    }
  }, []);

  // Bypass temporário de Login para acesso direto
  useEffect(() => {
    if (!user && !isPublicRoute) {
      setUser({
        id: 'bypass-id',
        name: 'Acesso Direto (Admin)',
        email: 'admin@dluxury.com',
        role: 'admin'
      });
    }
  }, [user, setUser, isPublicRoute]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '');
      if (hash && hash !== activeTab) {
        setActiveTab(hash as any);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    // Initial check
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab) {
      window.location.hash = `#/${activeTab}`;
    }
  }, [activeTab]);

  useEffect(() => {
    if (user) {
      api.notificacoes.generate().catch(console.error);
    }
  }, [user]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'clients':
        return <ClientsPage />;
      case 'estimates':
        return <OrcamentosPage />;
      case 'projects':
        return <ProjectsPage />;
      case 'production':
        return <ProductionPage />;
      case 'visits':
        return <VisitsPage />;
      case 'inventory':
        return (
          <ErrorBoundary moduleName="Estoque">
            <InventoryPage />
          </ErrorBoundary>
        );
      case 'suppliers':
        return <SuppliersPage />;
      case 'engineering':
        return <EngineeringPage />;
      case 'skus':
        return <SKUsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'finance':
        return <FinancePage />;
      case 'cutting_plan':
        return <CuttingPlanPage />;
      case 'after_sales':
        return <PosVendaPage />;
      case 'purchasing':
        return <ComprasPage />;
      case 'calendar':
        return <CalendarioPage />;
      case 'notifications':
        return <NotificacoesPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return null;
    }
  };

  if (isPublicRoute) {
    const token = window.location.pathname.split('/aprovar/')[1];
    return <AprovacaoPage token={token} />;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main style={{
        flex: 1,
        height: '100vh',
        overflowY: 'auto',
        background: 'var(--background-gradient)',
        position: 'relative'
      }}>
        {/* Topbar with NotificationBell */}
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '1rem 2.5rem 0',
          pointerEvents: 'none',
          height: '60px',
          alignItems: 'center'
        }}>
          <div style={{ pointerEvents: 'auto' }}>
            <NotificationBell />
          </div>
        </div>

        <div style={{ 
          maxWidth: '1400px', 
          margin: '0 auto', 
          padding: '0 2.5rem 2rem',
          minHeight: 'calc(100% - 60px)'
        }}>
          {renderContent()}
        </div>
      </main>
      <CopilotAssistant />
      <ThemeToggle />
    </div>
  );
}

export default App;

