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
    { id: 'dashboard', path: 'painel', label: 'Painel Geral', icon: <LayoutDashboard size={18} />, roles: ['admin', 'vendedor'], group: 'COMERCIAL', feature: 'crm' },
    { id: 'clients', path: 'clientes', label: 'Clientes', icon: <Users size={18} />, roles: ['admin', 'vendedor'], group: 'COMERCIAL', feature: 'crm' },
    { id: 'estimates', path: 'orcamentos', label: 'Orçamentos', icon: <FileText size={18} />, roles: ['admin', 'vendedor'], group: 'COMERCIAL', feature: 'orcamentos' },
    { id: 'visits', path: 'visitas', label: 'Visitas', icon: <Calendar size={18} />, roles: ['admin', 'vendedor'], group: 'COMERCIAL', feature: 'crm' },
    
    { 
      id: 'engineering', 
      label: 'Engenharia & Fábrica', 
      icon: <Settings2 size={18} />, 
      roles: ['admin', 'marceneiro'], 
      group: 'OPERAÇÕES', 
      feature: 'plano_corte',
      subItems: [
        { id: 'projects', path: 'projetos', label: 'Projetos', icon: <ClipboardList size={16} />, roles: ['admin', 'vendedor'], feature: 'crm' },
        { id: 'production', path: 'producao', label: 'Produção', icon: <Hammer size={16} />, roles: ['admin', 'marceneiro'], feature: 'plano_corte' },
        { id: 'cutting_plan', path: 'plano-de-corte', label: 'Plano de Corte', icon: <Scissors size={16} />, roles: ['admin', 'marceneiro'], feature: 'plano_corte' },
        { id: 'simulador_producao', path: 'simulador-producao', label: 'Simulador Prod.', icon: <Clock3 size={16} />, roles: ['admin', 'marceneiro'], feature: 'plano_corte' },
        { id: 'simulador_corte', path: 'simulador-corte', label: 'Simulador 3D', icon: <Cuboid size={16} />, roles: ['admin', 'marceneiro'], feature: 'simulador_cnc' },
        { id: 'skus', path: 'pecas', label: 'Catálogo de SKUs', icon: <DraftingCompass size={16} />, roles: ['admin'], feature: 'plano_corte' },
        { id: 'engineering_settings', path: 'engenharia', label: 'Setup Engenharia', icon: <Settings2 size={16} />, roles: ['admin'], feature: 'plano_corte' },
      ]
    },

    { id: 'calendar', path: 'calendario', label: 'Calendário', icon: <CalendarDays size={18} />, roles: ['admin', 'vendedor', 'marceneiro'], group: 'OPERAÇÕES', feature: 'crm' },
    { id: 'after_sales', path: 'pos-venda', label: 'Pós-venda', icon: <HeartHandshake size={18} />, roles: ['admin', 'vendedor'], group: 'OPERAÇÕES', feature: 'crm' },
    
    { 
      id: 'supply_chain', 
      label: 'Suprimentos', 
      icon: <Package size={18} />, 
      roles: ['admin', 'marceneiro'], 
      group: 'OPERAÇÕES', 
      feature: 'estoque',
      subItems: [
        { id: 'purchasing', path: 'compras', label: 'Compras', icon: <ShoppingCart size={16} />, roles: ['admin'], feature: 'estoque' },
        { id: 'inventory', path: 'estoque', label: 'Estoque Local', icon: <Package size={16} />, roles: ['admin', 'marceneiro'], feature: 'estoque' },
        { id: 'suppliers', path: 'fornecedores', label: 'Fornecedores', icon: <Truck size={16} />, roles: ['admin'], feature: 'estoque' },
      ]
    },

    { id: 'finance', path: 'financeiro', label: 'Financeiro', icon: <DollarSign size={18} />, roles: ['admin'], group: 'FINANCEIRO', feature: 'financeiro' },

    { id: 'notifications', path: 'notificacoes', label: 'Notificações', icon: <Bell size={18} />, roles: ['admin', 'vendedor', 'marceneiro'], group: 'SISTEMA', feature: 'crm' },
    { id: 'reports', path: 'relatorios', label: 'Relatórios', icon: <BarChart3 size={18} />, roles: ['admin'], group: 'SISTEMA', feature: 'crm' },
    { id: 'settings', path: 'configuracoes', label: 'Configurações', icon: <Settings size={18} />, roles: ['admin'], group: 'SISTEMA', feature: 'crm' },
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

    let visibleSubItems = [];
    if (hasSubItems) {
      visibleSubItems = item.subItems.filter((sub: any) => 
        user && sub.roles.includes(user.role) && hasFeature((user as any).planoTier || 'basic', sub.feature)
      );
      if (visibleSubItems.length === 0) return null;
    }

    if (hasSubItems) {
      return (
        <div key={item.id} className="flex flex-col">
          <button
            onClick={() => toggleMenu(item.id)}
            className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl transition-all duration-200 focus:outline-none ${isExpanded ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}
            title={item.label}
          >
            <div className="flex items-center gap-3">
              <span className={`shrink-0 ${isExpanded ? 'text-sidebar-primary' : 'text-sidebar-foreground'}`}>{item.icon}</span>
              <span className="sidebar-label flex-1 truncate text-left text-sm font-medium">{item.label}</span>
            </div>
            <span className="sidebar-label text-sidebar-foreground">
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          </button>
          
          <div className={`overflow-hidden transition-all duration-200 ease-out ${isExpanded ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
            <div className="pl-4 pr-1 flex flex-col gap-1 border-l border-sidebar-border ml-5 my-1">
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
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all duration-150 ${isSubActive ? 'bg-primary text-primary-foreground font-bold' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}
                    aria-current={isSubActive ? 'page' : undefined}
                    title={subItem.label}
                  >
                    <span className={`shrink-0 ${isSubActive ? 'text-primary-foreground' : 'text-sidebar-foreground'}`}>{subItem.icon}</span>
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
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${isActive ? 'bg-primary text-primary-foreground font-bold shadow-primary' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}
        aria-current={isActive ? 'page' : undefined}
        title={item.label}
      >
        <span className={`shrink-0 ${isActive ? 'text-primary-foreground' : 'text-sidebar-foreground'}`}>{item.icon}</span>
        <span className="sidebar-label flex-1 truncate text-sm font-medium">{item.label}</span>
        {item.id === 'notifications' && <NotificacoesBadge />}
      </Link>
    );
  };

  return (
    <aside className="w-60 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border px-3 py-4 flex flex-col sticky top-0 transition-all duration-200 z-50 overflow-y-auto hidden lg:flex select-none">
      
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8 px-3 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center font-bold text-primary-foreground text-base shadow-primary">
          F
        </div>
        <div className="flex flex-col sidebar-label">
          <span className="text-sm font-black text-sidebar-accent-foreground leading-tight tracking-wider font-display">FATTO OS</span>
          <span className="text-[0.55rem] font-bold text-sidebar-primary tracking-[0.2em] leading-tight">DESIGN & TECH</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-6 custom-scrollbar pr-1">
        {groups.map(group => {
          const groupItems = visibleMenuItems.filter(item => item.group === group);
          if (groupItems.length === 0) return null;
          
          return (
            <div key={group} className="flex flex-col gap-1.5">
              <span className="text-[0.6rem] font-bold text-sidebar-primary mb-1 px-3 tracking-[0.2em] uppercase sidebar-label font-display opacity-80">
                {group}
              </span>
              {groupItems.map(item => renderMenuItem(item))}
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="mt-4 pt-4 border-t border-sidebar-border">
         <div className="flex items-center gap-2.5 mb-3 px-3">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent text-sidebar-accent-foreground flex items-center justify-center font-bold text-xs shrink-0 font-display">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-label flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-sidebar-accent-foreground">{user?.name}</p>
              <p className="text-[0.7rem] text-sidebar-primary capitalize font-medium">{user?.role}</p>
            </div>
         </div>

         <button 
           onClick={logout}
           className="w-full flex items-center justify-center gap-2 p-2.5 bg-sidebar-accent hover:bg-primary/20 text-sidebar-foreground hover:text-sidebar-accent-foreground rounded-xl text-sm font-semibold border border-sidebar-border hover:border-primary/30 transition-all duration-150 sidebar-label"
           aria-label="Sair do sistema"
         >
           <LogOut size={15} />
           <span>Sair</span>
         </button>
      </div>
      
      <style>{`
        @media (max-width: 1024px) {
          .sidebar-label { display: none; }
          aside { width: 64px !important; padding-left: 0.5rem; padding-right: 0.5rem; }
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
