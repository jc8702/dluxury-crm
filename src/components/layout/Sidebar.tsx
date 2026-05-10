import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { NotificacoesBadge } from './NotificacoesBadge';

import { 
  LayoutDashboard, Users, FileText, ClipboardList, 
  Hammer, Scissors, Calendar, Package, 
  Truck, Settings2, DraftingCompass, BarChart3, 
  DollarSign, Settings, HeartHandshake, LogOut, 
  ShoppingCart, CalendarDays, Bell, Calculator
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const { user, logout } = useAppContext();
  const location = useLocation();
  
  const currentPath = location.pathname.replace('/', '') || 'painel';

  const menuItems = [
    { id: 'dashboard', path: 'painel', label: 'Painel Geral', icon: <LayoutDashboard size={20} />, roles: ['admin', 'vendedor'], group: 'COMERCIAL' },
    { id: 'clients', path: 'clientes', label: 'Clientes', icon: <Users size={20} />, roles: ['admin', 'vendedor'], group: 'COMERCIAL' },
    { id: 'estimates', path: 'orcamentos', label: 'Orçamentos', icon: <FileText size={20} />, roles: ['admin', 'vendedor'], group: 'COMERCIAL' },
    { id: 'projects', path: 'projetos', label: 'Projetos', icon: <ClipboardList size={20} />, roles: ['admin', 'vendedor'], group: 'COMERCIAL' },
    { id: 'visits', path: 'visitas', label: 'Visitas', icon: <Calendar size={20} />, roles: ['admin', 'vendedor'], group: 'COMERCIAL' },
    
    { id: 'production', path: 'producao', label: 'Produção', icon: <Hammer size={20} />, roles: ['admin', 'marceneiro'], group: 'PRODUÇÃO' },
    { id: 'cutting_plan', path: 'plano-de-corte', label: 'Plano de Corte', icon: <Scissors size={20} />, roles: ['admin', 'marceneiro'], group: 'PRODUÇÃO' },
    { id: 'engineering', path: 'engenharia', label: 'Engenharia', icon: <Settings2 size={20} />, roles: ['admin'], group: 'PRODUÇÃO' },

    { id: 'calendar', path: 'calendario', label: 'Calendário', icon: <CalendarDays size={20} />, roles: ['admin', 'vendedor', 'marceneiro'], group: 'OPERACIONAL' },
    { id: 'after_sales', path: 'pos-venda', label: 'Pós-venda', icon: <HeartHandshake size={20} />, roles: ['admin', 'vendedor'], group: 'OPERACIONAL' },
    { id: 'purchasing', path: 'compras', label: 'Compras', icon: <ShoppingCart size={20} />, roles: ['admin'], group: 'OPERACIONAL' },
    { id: 'inventory', path: 'estoque', label: 'Estoque', icon: <Package size={20} />, roles: ['admin', 'marceneiro'], group: 'OPERACIONAL' },
    { id: 'suppliers', path: 'fornecedores', label: 'Fornecedores', icon: <Truck size={20} />, roles: ['admin'], group: 'OPERACIONAL' },

    { id: 'finance', path: 'financeiro', label: 'Financeiro', icon: <DollarSign size={20} />, roles: ['admin'], group: 'FINANCEIRO' },

    { id: 'notifications', path: 'notificacoes', label: 'Notificações', icon: <Bell size={20} />, roles: ['admin', 'vendedor', 'marceneiro'], group: 'SISTEMA' },
    { id: 'skus', path: 'pecas', label: 'Peças / SKUs', icon: <DraftingCompass size={20} />, roles: ['admin'], group: 'SISTEMA' },
    { id: 'reports', path: 'relatorios', label: 'Relatórios', icon: <BarChart3 size={20} />, roles: ['admin'], group: 'SISTEMA' },
    { id: 'settings', path: 'configuracoes', label: 'Configurações', icon: <Settings size={20} />, roles: ['admin'], group: 'SISTEMA' },
  ];

  const visibleMenuItems = menuItems.filter(item => user && item.roles.includes(user.role));
  
  const groups = ['COMERCIAL', 'PRODUÇÃO', 'OPERACIONAL', 'FINANCEIRO', 'SISTEMA'];

  return (
    <aside className="w-64 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border p-4 flex flex-col sticky top-0 transition-all duration-300 z-50 overflow-y-auto hidden lg:flex">
      <div className="flex items-center gap-3 mb-8 px-2 shrink-0">
        <img src="/logo.png" alt="D'Luxury" className="w-12 h-12 object-contain shrink-0" />
        <div className="flex flex-col sidebar-label">
          <span className="text-base font-extrabold text-primary leading-tight tracking-tight">D'LUXURY</span>
          <span className="text-[0.65rem] font-medium text-muted-foreground tracking-widest leading-tight">MÓVEIS SOB MEDIDA</span>
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-6">
        {groups.map(group => {
          const groupItems = visibleMenuItems.filter(item => item.group === group);
          if (groupItems.length === 0) return null;
          
          return (
            <div key={group} className="flex flex-col gap-1">
              <span className="text-xs font-bold text-muted-foreground mb-2 px-3 tracking-wider sidebar-label">{group}</span>
              {groupItems.map((item) => {
                const isActive = currentPath === item.path || (item.id === 'finance' && currentPath.startsWith('financeiro'));
                return (
                  <Link
                    key={item.id}
                    to={'/' + item.path}
                    onClick={() => {
                        // Limpar query params ao navegar pelo menu principal
                        if (window.location.search) {
                            window.history.pushState({}, '', window.location.pathname + window.location.hash);
                        }
                    }}
                    className={`menu-item ${isActive ? 'active' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                    title={item.label}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    <span className="sidebar-label flex-1 truncate">{item.label}</span>
                    {item.id === 'notifications' && <NotificacoesBadge />}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="mt-6 pt-4 border-t border-sidebar-border">
         <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-label flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-foreground">{user?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
         </div>
         <button 
           onClick={logout}
           className="w-full flex items-center justify-center gap-2 p-2 bg-sidebar-accent/50 hover:bg-destructive/10 text-muted-foreground hover:text-destructive border border-sidebar-border hover:border-destructive/30 rounded-lg text-sm font-medium transition-all duration-200 sidebar-label"
           aria-label="Sair do sistema"
         >
           <LogOut size={16} />
           <span>Sair</span>
         </button>
      </div>
      
      <style>{`
        @media (max-width: 1024px) {
          .sidebar-label { display: none; }
          aside { width: 80px !important; }
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
