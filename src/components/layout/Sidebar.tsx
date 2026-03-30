import React from 'react';
import { useAppContext } from '../../context/AppContext';

type Tab = 'dashboard' | 'clients' | 'billing' | 'projects' | 'visits' | 'simulator' | 'settings' | 'system-health';

interface SidebarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { isAdmin, setIsAdmin } = useAppContext();
  
  const menuItems: { id: Tab; label: string; icon: string; adminOnly?: boolean }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'clients', label: 'Clientes', icon: '👥' },
    { id: 'billing', label: 'Faturamentos', icon: '💰' },
    { id: 'projects', label: 'Projetos', icon: '🚀' },
    { id: 'visits', label: 'Visitas', icon: '🚗' },
    { id: 'simulator', label: 'Consulta de Preços', icon: '🧮' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
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
        <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1rem', background: 'var(--primary)', color: 'white', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}>J</span>
          <span className="sidebar-label">JMDCORP</span>
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
              background: activeTab === item.id ? 'var(--primary)' : 'transparent',
              color: activeTab === item.id ? 'white' : 'var(--text-muted)',
              fontWeight: activeTab === item.id ? '600' : '400',
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
            <div style={{ minWidth: '32px', height: '32px', borderRadius: '50%', background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.75rem' }}>AD</div>
            <div className="sidebar-label">
              <p style={{ fontSize: '0.8rem', fontWeight: '600' }}>Admin Dev</p>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>System Specialist</p>
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
