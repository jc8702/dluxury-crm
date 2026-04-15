import { useState } from 'react';
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
import Login from './features/auth/Login';

type Tab = 'dashboard' | 'clients' | 'estimates' | 'projects' | 'production' | 'visits' | 'inventory' | 'finance' | 'settings';

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

function AppContent() {
  const { user } = useAppContext();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  if (!user) {
    return <Login />;
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
        padding: '2.5rem',
        overflowY: 'auto',
        height: '100vh',
        background: 'linear-gradient(135deg, var(--background) 0%, #171e2e 100%)',
        position: 'relative'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '100%', height: '100%', overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
             <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(180, 144, 80, 0.08) 0%, transparent 70%)' }}></div>
             <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(212, 175, 55, 0.05) 0%, transparent 70%)' }}></div>
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            {renderContent()}
          </div>
        </div>
      </main>
    </>
  );
}

export default App;
