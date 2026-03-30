import { useState } from 'react';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './features/dashboard/Dashboard';
import Clients from './features/clients/Clients';
import BillingForm from './features/billing/BillingForm';
import ProjectKanban from './features/projects/ProjectKanban';
import VisitKanban from './features/visits/VisitKanban';
import PriceSimulator from './features/simulator/PriceSimulator';
import Settings from './features/settings/Settings';
import SystemHealth from './features/admin/SystemHealth';
import { AppProvider } from './context/AppContext';
import Gatekeeper from './components/admin/Gatekeeper';

type Tab = 'dashboard' | 'clients' | 'billing' | 'projects' | 'visits' | 'simulator' | 'settings' | 'system-health';

function App() {
  return (
    <AppProvider>
      <Gatekeeper />
      <AppContent />
    </AppProvider>
  );
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'clients':
        return <Clients />;
      case 'billing':
        return <BillingForm />;
      case 'projects':
        return <ProjectKanban />;
      case 'visits':
        return <VisitKanban />;
      case 'simulator':
        return <PriceSimulator />;
      case 'settings':
        return <Settings />;
      case 'system-health':
        return <SystemHealth />;
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
             <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(37, 99, 235, 0.05) 0%, transparent 70%)' }}></div>
             <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(99, 102, 241, 0.05) 0%, transparent 70%)' }}></div>
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
