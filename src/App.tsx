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
import Login from './features/auth/Login';

type Tab = 'dashboard' | 'clients' | 'estimates' | 'projects' | 'production' | 'visits' | 'inventory' | 'suppliers' | 'finance' | 'settings';

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
  const { user } = useAppContext();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  if (!user) {
    return (
      <>
        <Login />
        <ThemeToggle />
      </>
    );
  }

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
        return <Inventory />;
      case 'suppliers':
        return <FornecedoresPage />;
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
      <ThemeToggle />
    </>
  );
}

export default App;
