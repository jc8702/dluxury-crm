import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { NotificacoesBadge } from './NotificacoesBadge';
import { hasFeature } from '../../lib/features';

import {
  LayoutDashboard, Users, FileText, ClipboardList, 
  Hammer, Scissors, Calendar, Package, 
  Truck, Settings2, DraftingCompass, BarChart3, 
  DollarSign, Settings, HeartHandshake, LogOut, 
  ShoppingCart, CalendarDays, Bell, Cuboid, Clock3,
  ChevronDown, ChevronRight
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const { user, logout } = useAppContext();
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    'engineering': true,
  });
  
  const currentPath = location.pathname.replace('/', '') || 'painel';

  const toggleMenu = (id: string) => {
    setOpenMenus(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const menuItems = [
    { id: 'dashboard', path: 'painel', label: 'Painel Geral', icon: <LayoutDashboard size={20} />, roles: ['admin', 'vendedor'], group: 'COMERCIAL', feature: 'crm' },
    { id: 'clients', path: 'clientes', label: 'Clientes', icon: <Users size={20} />, roles: ['admin', 'vendedor'], group: 'COMERCIAL', feature: 'crm' },
    { id: 'estimates', path: 'orcamentos', label: 'Orçamentos', icon: <FileText size={20} />, roles: ['admin', 'vendedor'], group: 'COMERCIAL', feature: 'orcamentos' },
    { id: 'visits', path: 'visitas', label: 'Visitas', icon: <Calendar size={20} />, roles: ['admin', 'vendedor'], group: 'COMERCIAL', feature: 'crm' },
    
    // Engenharia & Produção (Agrupados)
    { 
      id: 'engineering', 
      label: 'Engenharia & Fábrica', 
      icon: <Settings2 size={20} />, 
      roles: ['admin', 'marceneiro'], 
      group: 'OPERAÇÕES', 
      feature: 'plano_corte',
      subItems: [
        { id: 'projects', path: 'projetos', label: 'Projetos', icon: <ClipboardList size={18} />, roles: ['admin', 'vendedor'], feature: 'crm' },
        { id: 'production', path: 'producao', label: 'Produção', icon: <Hammer size={18} />, roles: ['admin', 'marceneiro'], feature: 'plano_corte' },
        { id: 'cutting_plan', path: 'plano-de-corte', label: 'Plano de Corte', icon: <Scissors size={18} />, roles: ['admin', 'marceneiro'], feature: 'plano_corte' },
        { id: 'simulador_producao', path: 'simulador-producao', label: 'Simulador Prod.', icon: <Clock3 size={18} />, roles: ['admin', 'marceneiro'], feature: 'plano_corte' },
        { id: 'simulador_corte', path: 'simulador-corte', label: 'Simulador 3D', icon: <Cuboid size={18} />, roles: ['admin', 'marceneiro'], feature: 'simulador_cnc' },
        { id: 'engineering_settings', path: 'engenharia', label: 'Setup Engenharia', icon: <Settings2 size={18} />, roles: ['admin'], feature: 'plano_corte' },
      ]
    },

    { id: 'calendar', path: 'calendario', label: 'Calendário', icon: <CalendarDays size={20} />, roles: ['admin', 'vendedor', 'marceneiro'], group: 'OPERAÇÕES', feature: 'crm' },
    { id: 'after_sales', path: 'pos-venda', label: 'Pós-venda', icon: <HeartHandshake size={20} />, roles: ['admin', 'vendedor'], group: 'OPERAÇÕES', feature: 'crm' },
    
    { 
      id: 'supply_chain', 
      label: 'Suprimentos', 
      icon: <Package size={20} />, 
      roles: ['admin', 'marceneiro'], 
      group: 'OPERAÇÕES', 
      feature: 'estoque',
      subItems: [
        { id: 'purchasing', path: 'compras', label: 'Compras', icon: <ShoppingCart size={18} />, roles: ['admin'], feature: 'estoque' },
        { id: 'inventory', path: 'estoque', label: 'Estoque Local', icon: <Package size={18} />, roles: ['admin', 'marceneiro'], feature: 'estoque' },
        { id: 'suppliers', path: 'fornecedores', label: 'Fornecedores', icon: <Truck size={18} />, roles: ['admin'], feature: 'estoque' },
      ]
    },

    { id: 'finance', path: 'financeiro', label: 'Financeiro', icon: <DollarSign size={20} />, roles: ['admin'], group: 'FINANCEIRO', feature: 'financeiro' },

    { id: 'notifications', path: 'notificacoes', label: 'Notificações', icon: <Bell size={20} />, roles: ['admin', 'vendedor', 'marceneiro'], group: 'SISTEMA', feature: 'crm' },
    { id: 'skus', path: 'pecas', label: 'Peças / SKUs', icon: <DraftingCompass size={20} />, roles: ['admin'], group: 'SISTEMA', feature: 'crm' },
    { id: 'reports', path: 'relatorios', label: 'Relatórios', icon: <BarChart3 size={20} />, roles: ['admin'], group: 'SISTEMA', feature: 'crm' },
    { id: 'settings', path: 'configuracoes', label: 'Configurações', icon: <Settings size={20} />, roles: ['admin'], group: 'SISTEMA', feature: 'crm' },
  ];

  const visibleMenuItems = menuItems.filter(item => 
    user && 
    item.roles.includes(user.role) && 
    hasFeature((user as any).planoTier || 'basic', item.feature)
  );
  
  const groups = ['COMERCIAL', 'OPERAÇÕES', 'FINANCEIRO', 'SISTEMA'];

  const renderMenuItem = (item: any, isSubItem = false) => {
    const isActive = currentPath === item.path || (item.id === 'finance' && currentPath.startsWith('financeiro'));
    const isExpanded = openMenus[item.id];
    const hasSubItems = item.subItems && item.subItems.length > 0;

    // Filter sub items based on role/features
    let visibleSubItems = [];
    if (hasSubItems) {
      visibleSubItems = item.subItems.filter((sub: any) => 
        user && sub.roles.includes(user.role) && hasFeature((user as any).planoTier || 'basic', sub.feature)
      );
      if (visibleSubItems.length === 0) return null; // hide parent if all subitems are hidden
    }

    if (hasSubItems) {
      return (
        <div key={item.id} className="flex flex-col">
          <button
            onClick={() => toggleMenu(item.id)}
            className="menu-item flex items-center justify-between w-full focus:outline-none"
            title={item.label}
          >
            <div className="flex items-center gap-3">
              <span className="shrink-0">{item.icon}</span>
              <span className="sidebar-label flex-1 truncate text-left">{item.label}</span>
            </div>
            <span className="sidebar-label text-muted-foreground opacity-60">
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </span>
          </button>
          
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
            <div className="pl-6 pr-2 flex flex-col gap-1 border-l border-sidebar-border/50 ml-5 my-1">
              {visibleSubItems.map((subItem: any) => {
                const isSubActive = currentPath === subItem.path;
                return (
                  <Link
                    key={subItem.id}
                    to={'/' + subItem.path}
                    onClick={() => {
                        if (window.location.search) {
                            window.history.pushState({}, '', window.location.pathname + window.location.hash);
                        }
                    }}
                    className={`menu-item text-[0.8rem] py-2 ${isSubActive ? 'active' : ''}`}
                    aria-current={isSubActive ? 'page' : undefined}
                    title={subItem.label}
                  >
                    <span className="shrink-0 scale-90 opacity-70">{subItem.icon}</span>
                    <span className="sidebar-label flex-1 truncate">{subItem.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    return (
      <Link
        key={item.id}
        to={'/' + item.path}
        onClick={() => {
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
  };

  return (
    <aside className="w-64 h-screen bg-sidebar/95 backdrop-blur-md text-sidebar-foreground border-r border-sidebar-border p-4 flex flex-col sticky top-0 transition-all duration-300 z-50 overflow-y-auto hidden lg:flex shadow-2xl">
      <div className="flex items-center gap-3 mb-8 px-2 shrink-0">
        <img src="/logo.png" alt="D'Luxury" className="w-12 h-12 object-contain shrink-0 drop-shadow-md" />
        <div className="flex flex-col sidebar-label">
          <span className="text-base font-extrabold text-primary leading-tight tracking-tight">D'LUXURY</span>
          <span className="text-[0.65rem] font-medium text-muted-foreground tracking-widest leading-tight">ERP PREMIUM</span>
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-6 custom-scrollbar pr-1">
        {groups.map(group => {
          const groupItems = visibleMenuItems.filter(item => item.group === group);
          if (groupItems.length === 0) return null;
          
          return (
            <div key={group} className="flex flex-col gap-1">
              <span className="text-[0.65rem] font-bold text-muted-foreground/80 mb-2 px-3 tracking-[0.2em] uppercase sidebar-label">{group}</span>
              {groupItems.map(item => renderMenuItem(item))}
            </div>
          );
        })}
      </nav>

      <div className="mt-6 pt-4 border-t border-sidebar-border/60">
         <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 text-primary flex items-center justify-center font-bold text-sm shrink-0">
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
