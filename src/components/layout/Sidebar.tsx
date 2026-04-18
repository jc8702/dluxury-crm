import React from 'react';
import { useAppContext } from '../../context/AppContext';

import { 
  LayoutDashboard, Users, FileText, ClipboardList, 
  Hammer, Scissors, Calendar, Package, 
  Truck, Settings2, DraftingCompass, BarChart3, 
  DollarSign, Settings, HeartHandshake, LogOut 
} from 'lucide-react';

type Tab = 'dashboard' | 'clients' | 'estimates' | 'projects' | 'production' | 'visits' | 'inventory' | 'suppliers' | 'finance' | 'engineering' | 'skus' | 'reports' | 'settings' | 'cutting_plan' | 'after_sales';

interface SidebarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAppContext();
  
  const menuItems: { id: Tab; label: string; icon: React.ReactNode; roles: string[] }[] = [
    { id: 'dashboard', label: 'Painel Geral', icon: <LayoutDashboard size={20} />, roles: ['admin', 'vendedor'] },
    { id: 'clients', label: 'Clientes', icon: <Users size={20} />, roles: ['admin', 'vendedor'] },
    { id: 'estimates', label: 'Orçamentos', icon: <FileText size={20} />, roles: ['admin', 'vendedor'] },
    { id: 'projects', label: 'Projetos', icon: <ClipboardList size={20} />, roles: ['admin', 'vendedor'] },
    { id: 'production', label: 'Produção', icon: <Hammer size={20} />, roles: ['admin', 'marceneiro'] },
    { id: 'cutting_plan', label: 'Plano de Corte', icon: <Scissors size={20} />, roles: ['admin', 'marceneiro'] },
    { id: 'visits', label: 'Visitas', icon: <Calendar size={20} />, roles: ['admin', 'vendedor'] },
    { id: 'after_sales', label: 'Pós-venda', icon: <HeartHandshake size={20} />, roles: ['admin', 'vendedor'] },
    { id: 'inventory', label: 'Estoque', icon: <Package size={20} />, roles: ['admin', 'marceneiro'] },
    { id: 'suppliers', label: 'Fornecedores', icon: <Truck size={20} />, roles: ['admin'] },
    { id: 'engineering', label: 'Engenharia', icon: <Settings2 size={20} />, roles: ['admin'] },
    { id: 'skus', label: 'Peças / SKUs', icon: <DraftingCompass size={20} />, roles: ['admin'] },
    { id: 'reports', label: 'Relatórios', icon: <BarChart3 size={20} />, roles: ['admin'] },
    { id: 'finance', label: 'Financeiro', icon: <DollarSign size={20} />, roles: ['admin'] },
    { id: 'settings', label: 'Configurações', icon: <Settings size={20} />, roles: ['admin'] },
  ];

  const visibleMenuItems = menuItems.filter(item => user && item.roles.includes(user.role));

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      height: '100vh',
      background: 'var(--sidebar-bg)',
      borderRight: '1px solid var(--border)',
      padding: '1.5rem 0.75rem',
      display: 'flex',
      flexDirection: 'column',
      position: 'sticky',
      top: 0,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      zIndex: 100,
      overflowY: 'auto',
      maxHeight: '100vh',
      scrollbarWidth: 'thin',
      scrollbarColor: 'var(--border-strong) transparent',
    }}>
      <div className="sidebar-header" style={{ marginBottom: '2rem', padding: '0.5rem 0.5rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/logo.png" alt="D'Luxury" style={{ width: '48px', minWidth: '48px', height: '48px', minHeight: '48px', objectFit: 'contain', flexShrink: 0, borderRadius: '10px' }} />
          <div className="sidebar-label" style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            <span style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--primary)', lineHeight: '1', letterSpacing: '0.02em' }}>D'LUXURY</span>
            <span style={{ fontSize: '0.6rem', fontWeight: '500', color: 'var(--text-muted)', letterSpacing: '0.06em', lineHeight: '1' }}>MÓVEIS SOB MEDIDA</span>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        {visibleMenuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                all: 'unset',
                padding: '0.7rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                transition: 'all 0.2s ease',
                background: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                color: isActive ? 'var(--sidebar-active-text)' : 'var(--text-muted)',
                fontWeight: isActive ? '700' : '500',
                fontSize: '0.875rem',
                overflow: 'hidden',
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover-bg)'; }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <span style={{ fontSize: '1.15rem', lineHeight: 1, flexShrink: 0 }}>{item.icon}</span>
              <span className="sidebar-label" style={{ whiteSpace: 'nowrap' }}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer" style={{ padding: '1rem 0.5rem', borderTop: '1px solid var(--border)' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%',
              background: 'var(--primary)', color: 'var(--primary-text)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 'bold', fontSize: '0.85rem', flexShrink: 0
            }}>
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-label" style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role}</p>
            </div>
         </div>
         <button 
           onClick={logout}
           className="sidebar-label"
           style={{
             width: '100%', padding: '0.5rem',
             background: 'var(--badge-bg)', color: 'var(--text-muted)',
             border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)',
             cursor: 'pointer', fontSize: '0.78rem', textAlign: 'center',
             fontFamily: 'inherit', transition: 'all 0.2s ease'
           }}
           onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--danger)'; (e.currentTarget as HTMLElement).style.color = 'var(--danger)'; }}
           onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
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

