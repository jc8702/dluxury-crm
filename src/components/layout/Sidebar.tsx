import React from 'react';
import { useAppContext } from '../../context/AppContext';

type Tab = 'dashboard' | 'clients' | 'estimates' | 'projects' | 'production' | 'visits' | 'inventory' | 'suppliers' | 'finance' | 'settings';

interface SidebarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAppContext();
  
  const menuItems: { id: Tab; label: string; icon: string; roles: string[] }[] = [
    { id: 'dashboard', label: 'Painel Geral', icon: '📊', roles: ['admin', 'vendedor'] },
    { id: 'clients', label: 'Clientes', icon: '👤', roles: ['admin', 'vendedor'] },
    { id: 'estimates', label: 'Orçamentos', icon: '📄', roles: ['admin', 'vendedor'] },
    { id: 'projects', label: 'Projetos', icon: '📋', roles: ['admin', 'vendedor'] },
    { id: 'production', label: 'Produção', icon: '🔨', roles: ['admin', 'marceneiro'] },
    { id: 'visits', label: 'Visitas', icon: '🗓️', roles: ['admin', 'vendedor'] },
    { id: 'inventory', label: 'Estoque', icon: '📦', roles: ['admin', 'marceneiro'] },
    { id: 'suppliers', label: 'Fornecedores', icon: '🚚', roles: ['admin'] },
    { id: 'finance', label: 'Financeiro', icon: '💰', roles: ['admin'] },
    { id: 'settings', label: 'Configurações', icon: '⚙️', roles: ['admin'] },
  ];

  const visibleMenuItems = menuItems.filter(item => user && item.roles.includes(user.role));

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
      <div className="sidebar-header" style={{ marginBottom: '2rem', padding: '0.5rem 0.5rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/logo.png" alt="D'Luxury" style={{ width: '56px', minWidth: '56px', height: '56px', minHeight: '56px', objectFit: 'contain', flexShrink: 0, borderRadius: '8px' }} />
          <div className="sidebar-label" style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <span style={{ fontSize: '1rem', fontWeight: '900', color: '#d4af37', lineHeight: '1', letterSpacing: '0.02em' }}>D'LUXURY</span>
            <span style={{ fontSize: '0.65rem', fontWeight: '600', color: 'var(--text-muted)', letterSpacing: '0.05em', lineHeight: '1' }}>MÓVEIS SOB MEDIDA</span>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {visibleMenuItems.map((item) => (
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

      <div className="sidebar-footer" style={{ padding: '1rem 0.5rem', borderTop: '1px solid var(--border)' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#d4af37', color: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-label" style={{ flex: 1 }}>
              <p style={{ fontSize: '0.8rem', fontWeight: '600' }}>{user?.name}</p>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role}</p>
            </div>
         </div>
         <button 
           onClick={logout}
           className="sidebar-label"
           style={{ width: '100%', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', textAlign: 'center' }}
         >
           Sair
         </button>
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
