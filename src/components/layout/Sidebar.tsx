import React from 'react';
import { useAppContext } from '../../context/AppContext';

type Tab = 'dashboard' | 'clients' | 'estimates' | 'projects' | 'production' | 'visits' | 'inventory' | 'finance' | 'settings' | 'system-health';

interface SidebarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { isAdmin, setIsAdmin } = useAppContext();
  
  const menuItems: { id: Tab; label: string; icon: string; adminOnly?: boolean }[] = [
    { id: 'dashboard', label: 'Painel Geral', icon: '📊' },
    { id: 'clients', label: 'Clientes', icon: '👤' },
    { id: 'estimates', label: 'Orçamentos', icon: '📐' },
    { id: 'projects', label: 'Projetos', icon: '📋' },
    { id: 'production', label: 'Produção', icon: '🔨' },
    { id: 'visits', label: 'Visitas', icon: '🗓️' },
    { id: 'inventory', label: 'Estoque', icon: '🪵' },
    { id: 'finance', label: 'Financeiro', icon: '💰' },
    { id: 'settings', label: 'Configurações', icon: '⚙️' },
    { id: 'system-health', label: 'System Health', icon: '🏥', adminOnly: true },
  ];

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      height: '100vh',
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      padding: '1.5rem 0.75rem',
      display: 'flex',
      flexDirection: 'column',
      position: 'sticky',
      top: 0,
      transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      zIndex: 100,
    }}>
      <div style={{ marginBottom: '2rem', padding: '0 0.75rem', overflow: 'hidden' }}>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#d4af37', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/logo.png" alt="D'Luxury Logo" style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'contain' }} />
          <span className="sidebar-label" style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '800', letterSpacing: '0.05em' }}>D'LUXURY</span>
            <span style={{ fontSize: '0.6rem', fontWeight: '500', color: 'var(--text-muted)', letterSpacing: '0.15em' }}>AMBIENTES</span>
          </span>
        </h1>
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {menuItems.filter(i => !i.adminOnly || isAdmin).map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            style={{
              all: 'unset',
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              transition: 'all 0.2s ease',
              background: activeTab === item.id ? 'linear-gradient(135deg, #d4af37, #b49050)' : 'transparent',
              color: activeTab === item.id ? '#1a1a2e' : 'var(--text-muted)',
              fontWeight: activeTab === item.id ? '700' : '400',
              overflow: 'hidden'
            }}
          >
            <span>{item.icon}</span>
            <span className="sidebar-label" style={{ whiteSpace: 'nowrap' }}>{item.label}</span>
          </button>
        ))}
      </nav>

      <div style={{ padding: '1rem 0.5rem', borderTop: '1px solid var(--border)' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ADMIN MODE</span>
            <input type="checkbox" checked={isAdmin} onChange={e => setIsAdmin(e.target.checked)} />
         </div>
         <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
            <img src="/logo.png" alt="Admin" style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'contain' }} />
            <div className="sidebar-label">
              <p style={{ fontSize: '0.8rem', fontWeight: '600' }}>Admin</p>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>D'Luxury Ambientes</p>
            </div>
         </div>
      </div>
      
      <style>{`
        @media (max-width: 1024px) {
          .sidebar-label { display: none; }
          aside { width: var(--sidebar-collapsed-width) !important; }
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
