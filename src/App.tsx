import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './features/dashboard/Dashboard';
import Clients from './features/clients/Clients';
import OrcamentosPage from './features/orcamentos/OrcamentosPage';
import ProjectKanban from './features/projects/ProjectKanban';
import Production from './features/production/Production';
import VisitKanban from './features/visits/VisitKanban';
import Inventory from './features/inventory/Inventory';
import Settings from './features/settings/Settings';
import { AppProvider, useAppContext } from './context/AppContext';
import BillingForm from './features/billing/BillingForm';
import FornecedoresPage from './features/suppliers/FornecedoresPage';
import EngineeringPage from './features/engineering/EngineeringPage';
import SKUPage from './features/skus/SKUPage';
import ReportsPage from './features/reports/ReportsPage';
import CopilotAssistant from './components/ai/CopilotAssistant';
import Login from './features/auth/Login';
import ErrorBoundary from './components/ErrorBoundaries';

type Tab = 'dashboard' | 'clients' | 'estimates' | 'projects' | 'production' | 'visits' | 'inventory' | 'suppliers' | 'finance' | 'engineering' | 'skus' | 'reports' | 'settings';

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
        return <Dashboard />;
      case 'clients':
        return <Clients />;
      case 'estimates':
        return <OrcamentosPage />;
      case 'projects':
        return <ProjectKanban />;
      case 'production':
        return <Production />;
      case 'visits':
        return <VisitKanban />;
      case 'inventory':
        return (
          <ErrorBoundary moduleName="Estoque">
            <Inventory />
          </ErrorBoundary>
        );
      case 'suppliers':
        return <FornecedoresPage />;
      case 'engineering':
        return <EngineeringPage />;
      case 'skus':
        return <SKUPage />;
      case 'reports':
        return <ReportsPage />;
      case 'finance':
        return <BillingForm />;
      case 'settings':
        return <Settings />;
      default:
        return null;
    }
  };

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
