import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/layout/Sidebar';
import { AppProvider, useAppContext } from './context/AppContext';
import CopilotAssistant from './components/ai/CopilotAssistant';
import Login from './components/auth/Login';
import ErrorBoundary from './components/ErrorBoundaries';

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
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import CuttingPlanPage from './pages/CuttingPlanPage';
import PosVendaPage from './pages/PosVendaPage';

type Tab = 'dashboard' | 'clients' | 'estimates' | 'projects' | 'production' | 'visits' | 'inventory' | 'suppliers' | 'finance' | 'engineering' | 'skus' | 'reports' | 'settings' | 'cutting_plan' | 'after_sales';

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

  // Bypass temporário de Login para acesso direto
  useEffect(() => {
    if (!user) {
      setUser({
        id: 'bypass-id',
        name: 'Acesso Direto (Admin)',
        email: 'admin@dluxury.com',
        role: 'admin'
      });
    }
  }, [user, setUser]);

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
      case 'settings':
        return <SettingsPage />;
      default:
        return null;
    }
  };

  if (!user) {
    return <Login />;
  }

  return (
    <>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main style={{
        flex: 1,
        padding: '2rem 2.5rem',
        overflowY: 'auto',
        height: '100vh',
        background: 'var(--background-gradient)',
        position: 'relative'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            {renderContent()}
          </div>
        </div>
      </main>
      <CopilotAssistant />
      <ThemeToggle />
    </>
  );
}

export default App;

