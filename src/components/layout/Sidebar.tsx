import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { NotificacoesBadge } from './NotificacoesBadge';
import { hasFeature } from '../../lib/features';

import {
  LayoutDashboard,
  Users,
  FileText,
  ClipboardList,
  Hammer,
  Scissors,
  Calendar,
  Package,
  Truck,
  Settings2,
  DraftingCompass,
  BarChart3,
  DollarSign,
  Settings,
  HeartHandshake,
  LogOut,
  ShoppingCart,
  CalendarDays,
  Bell,
  Cuboid,
  Clock3,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Target,
} from 'lucide-react';

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onCloseMobile: _onCloseMobile }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    engineering: true,
  });
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });
  const [isHovered, setIsHovered] = useState(false);

  const isSidebarExpanded = !isCollapsed || isHovered;

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const newVal = !prev;
      localStorage.setItem('sidebar-collapsed', String(newVal));
      return newVal;
    });
  };

  const currentPath = location.pathname.replace('/', '') || 'painel';

  const toggleMenu = (id: string) => {
    setOpenMenus((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const menuItems = [
    {
      id: 'dashboard',
      path: 'painel',
      label: 'Painel Geral',
      icon: <LayoutDashboard size={18} />,
      roles: ['admin', 'vendedor'],
      group: 'COMERCIAL',
      feature: 'crm',
    },
    {
      id: 'clients',
      path: 'clientes',
      label: 'Clientes',
      icon: <Users size={18} />,
      roles: ['admin', 'vendedor'],
      group: 'COMERCIAL',
      feature: 'crm',
    },
    {
      id: 'estimates',
      path: 'orcamentos',
      label: 'Orçamentos',
      icon: <FileText size={18} />,
      roles: ['admin', 'vendedor'],
      group: 'COMERCIAL',
      feature: 'orcamentos',
    },
    {
      id: 'prospeccao',
      path: 'prospeccao',
      label: 'Prospecção',
      icon: <Target size={18} />,
      roles: ['admin', 'vendedor'],
      group: 'COMERCIAL',
      feature: 'crm',
    },
    {
      id: 'visits',
      path: 'visitas',
      label: 'Visitas',
      icon: <Calendar size={18} />,
      roles: ['admin', 'vendedor'],
      group: 'COMERCIAL',
      feature: 'crm',
    },

    {
      id: 'engineering',
      label: 'Engenharia & Fábrica',
      icon: <Settings2 size={18} />,
      roles: ['admin', 'marceneiro'],
      group: 'OPERAÇÕES',
      feature: 'plano_corte',
      subItems: [
        {
          id: 'projects',
          path: 'projetos',
          label: 'Projetos',
          icon: <ClipboardList size={16} />,
          roles: ['admin', 'vendedor'],
          feature: 'crm',
        },
        {
          id: 'production',
          path: 'producao',
          label: 'Produção',
          icon: <Hammer size={16} />,
          roles: ['admin', 'marceneiro'],
          feature: 'plano_corte',
        },
        {
          id: 'cutting_plan',
          path: 'plano-de-corte',
          label: 'Plano de Corte',
          icon: <Scissors size={16} />,
          roles: ['admin', 'marceneiro'],
          feature: 'plano_corte',
        },
        {
          id: 'simulador_producao',
          path: 'simulador-producao',
          label: 'Simulador Prod.',
          icon: <Clock3 size={16} />,
          roles: ['admin', 'marceneiro'],
          feature: 'plano_corte',
        },
        {
          id: 'simulador_corte',
          path: 'simulador-corte',
          label: 'Simulador 3D',
          icon: <Cuboid size={16} />,
          roles: ['admin', 'marceneiro'],
          feature: 'simulador_cnc',
        },
        {
          id: 'skus',
          path: 'pecas',
          label: 'Catálogo de SKUs',
          icon: <DraftingCompass size={16} />,
          roles: ['admin'],
          feature: 'plano_corte',
        },
        {
          id: 'engineering_settings',
          path: 'engenharia',
          label: 'Setup Engenharia',
          icon: <Settings2 size={16} />,
          roles: ['admin'],
          feature: 'plano_corte',
        },
      ],
    },

    {
      id: 'calendar',
      path: 'calendario',
      label: 'Calendário',
      icon: <CalendarDays size={18} />,
      roles: ['admin', 'vendedor', 'marceneiro'],
      group: 'OPERAÇÕES',
      feature: 'crm',
    },
    {
      id: 'after_sales',
      path: 'pos-venda',
      label: 'Pós-venda',
      icon: <HeartHandshake size={18} />,
      roles: ['admin', 'vendedor'],
      group: 'OPERAÇÕES',
      feature: 'crm',
    },

    {
      id: 'supply_chain',
      label: 'Suprimentos',
      icon: <Package size={18} />,
      roles: ['admin', 'marceneiro'],
      group: 'OPERAÇÕES',
      feature: 'estoque',
      subItems: [
        {
          id: 'purchasing',
          path: 'compras',
          label: 'Compras',
          icon: <ShoppingCart size={16} />,
          roles: ['admin'],
          feature: 'estoque',
        },
        {
          id: 'inventory',
          path: 'estoque',
          label: 'Estoque Local',
          icon: <Package size={16} />,
          roles: ['admin', 'marceneiro'],
          feature: 'estoque',
        },
        {
          id: 'suppliers',
          path: 'fornecedores',
          label: 'Fornecedores',
          icon: <Truck size={16} />,
          roles: ['admin'],
          feature: 'estoque',
        },
      ],
    },

    {
      id: 'finance',
      path: 'financeiro',
      label: 'Financeiro',
      icon: <DollarSign size={18} />,
      roles: ['admin'],
      group: 'FINANCEIRO',
      feature: 'financeiro',
    },

    {
      id: 'notifications',
      path: 'notificacoes',
      label: 'Notificações',
      icon: <Bell size={18} />,
      roles: ['admin', 'vendedor', 'marceneiro'],
      group: 'SISTEMA',
      feature: 'crm',
    },
    {
      id: 'reports',
      path: 'relatorios',
      label: 'Relatórios',
      icon: <BarChart3 size={18} />,
      roles: ['admin'],
      group: 'SISTEMA',
      feature: 'crm',
    },
    {
      id: 'settings',
      path: 'configuracoes',
      label: 'Configurações',
      icon: <Settings size={18} />,
      roles: ['admin'],
      group: 'SISTEMA',
      feature: 'crm',
    },
  ];

  const isMasterAdmin =
    user &&
    ((user as any).email === 'admin@dluxury.com' ||
      (user as any).tenantId === '00000000-0000-0000-0000-000000000000');
  if (isMasterAdmin) {
    menuItems.push({
      id: 'saas_admin',
      path: 'saas-admin',
      label: 'SaaS Admin',
      icon: <Settings2 size={18} />,
      roles: ['admin'],
      group: 'SISTEMA',
      feature: 'crm',
    });
  }

  const visibleMenuItems = menuItems.filter(
    (item) =>
      user &&
      item.roles.includes(user.role) &&
      hasFeature((user as any).planoTier || 'basic', item.feature),
  );

  const groups = ['COMERCIAL', 'OPERAÇÕES', 'FINANCEIRO', 'SISTEMA'];

  const renderMenuItem = (item: any, _isSubItem = false) => {
    const isActive =
      currentPath === item.path || (item.id === 'finance' && currentPath.startsWith('financeiro'));
    const isExpanded = openMenus[item.id];
    const hasSubItems = item.subItems && item.subItems.length > 0;

    let visibleSubItems = [];
    if (hasSubItems) {
      visibleSubItems = item.subItems.filter(
        (sub: any) =>
          user &&
          sub.roles.includes(user.role) &&
          hasFeature((user as any).planoTier || 'basic', sub.feature),
      );
      if (visibleSubItems.length === 0) return null;
    }

    if (hasSubItems) {
      return (
        <div key={item.id} className="flex flex-col">
          <button
            onClick={() => toggleMenu(item.id)}
            className={`flex items-center justify-between w-full px-3 py-2.5 rounded-[var(--ui-radius-lg)] transition-all duration-200 focus:outline-none outline-none ${isExpanded ? 'bg-[var(--ui-bg-subtle)] text-[var(--ui-text-primary)]' : 'text-[var(--ui-text-secondary)] hover:bg-[var(--ui-color-teal-500)]/10 hover:text-[var(--ui-text-primary)]'}`}
            title={item.label}
          >
            <div className="flex items-center gap-3">
              <span
                className={`shrink-0 ${isExpanded ? 'text-sidebar-primary' : 'text-sidebar-foreground'}`}
              >
                {item.icon}
              </span>
              <span
                className={`sidebar-label flex-1 truncate text-left text-sm font-medium transition-opacity duration-200 ${isSidebarExpanded ? 'opacity-100' : 'opacity-0 w-0 h-0 overflow-hidden'}`}
              >
                {item.label}
              </span>
            </div>
            <span
              className={`sidebar-label text-sidebar-foreground transition-opacity duration-200 ${isSidebarExpanded ? 'opacity-100' : 'opacity-0 w-0 h-0 overflow-hidden'}`}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          </button>

          <div
            className={`overflow-hidden transition-all duration-200 ease-out ${isExpanded && isSidebarExpanded ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}
          >
            <div className="pl-4 pr-1 flex flex-col gap-1 border-l border-sidebar-border ml-5 my-1">
              {visibleSubItems.map((subItem: any) => {
                const isSubActive = currentPath === subItem.path;
                return (
                  <Link
                    key={subItem.id}
                    to={'/' + subItem.path}
                    onClick={() => {
                      if (window.location.search) {
                        window.history.pushState(
                          {},
                          '',
                          window.location.pathname + window.location.hash,
                        );
                      }
                    }}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all duration-150 outline-none focus:outline-none ${isSubActive ? 'bg-[var(--ui-color-gold-500)]/15 text-[var(--ui-color-gold-400)] font-bold border border-[var(--ui-color-gold-500)]/20 shadow-[var(--ui-shadow-glow-gold)]' : 'text-[var(--ui-text-secondary)] hover:bg-[var(--ui-color-teal-500)]/10 hover:text-[var(--ui-text-primary)]'}`}
                    aria-current={isSubActive ? 'page' : undefined}
                    title={subItem.label}
                  >
                    <span
                      className={`shrink-0 ${isSubActive ? 'text-[var(--ui-color-gold-400)]' : 'text-[var(--ui-text-secondary)]'}`}
                    >
                      {subItem.icon}
                    </span>
                    <span
                      className={`sidebar-label flex-1 truncate transition-opacity duration-200 ${isSidebarExpanded ? 'opacity-100' : 'opacity-0 w-0 h-0 overflow-hidden'}`}
                    >
                      {subItem.label}
                    </span>
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
        className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--ui-radius-lg)] transition-all duration-200 outline-none focus:outline-none ${isActive ? 'bg-[var(--ui-color-gold-500)]/15 text-[var(--ui-color-gold-400)] font-bold shadow-[var(--ui-shadow-glow-gold)] border border-[var(--ui-color-gold-500)]/20' : 'text-[var(--ui-text-secondary)] hover:bg-[var(--ui-color-teal-500)]/10 hover:text-[var(--ui-text-primary)]'}`}
        aria-current={isActive ? 'page' : undefined}
        title={item.label}
      >
        <span
          className={`shrink-0 ${isActive ? 'text-[var(--ui-color-gold-400)]' : 'text-inherit'}`}
        >
          {item.icon}
        </span>
        <span
          className={`sidebar-label flex-1 truncate text-sm font-medium transition-opacity duration-200 ${isSidebarExpanded ? 'opacity-100' : 'opacity-0 w-0 h-0 overflow-hidden'}`}
        >
          {item.label}
        </span>
        {item.id === 'notifications' && <NotificacoesBadge />}
      </Link>
    );
  };

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`h-screen bg-[var(--ui-surface)]/95 backdrop-blur-md text-[var(--ui-text-primary)] border-r border-[var(--ui-border)] px-3 py-4 flex flex-col fixed lg:sticky top-0 transition-all duration-300 z-50 overflow-y-auto ${isSidebarExpanded ? 'w-60' : 'w-[72px]'} ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} select-none outline-none`}
    >
      {/* Botão de Toggle Manual de Colapso (Desktop apenas) */}
      <button
        type="button"
        onClick={toggleCollapse}
        className="hidden lg:flex absolute right-[-12px] top-6 w-6 h-6 rounded-full bg-[var(--ui-bg-app)] border border-[var(--ui-border)] items-center justify-center text-[var(--ui-text-secondary)] hover:text-[var(--ui-color-gold-400)] shadow-[var(--ui-shadow-2)] z-[60] hover:scale-110 transition-all outline-none focus:outline-none"
        title={isCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
      >
        {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Logo */}
      <div className="flex items-center gap-3 mb-8 px-3 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center font-bold text-primary-foreground text-base shadow-primary shrink-0">
          DL
        </div>
        <div
          className={`flex flex-col sidebar-label transition-opacity duration-200 ${isSidebarExpanded ? 'opacity-100' : 'opacity-0 w-0 h-0 overflow-hidden'}`}
        >
          <span className="text-sm font-black text-sidebar-accent-foreground leading-tight tracking-wider font-display">
            D'LUXURY CRM
          </span>
          <span className="text-[0.55rem] font-bold text-sidebar-primary tracking-[0.2em] leading-tight">
            DESIGN & TECH
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-6 custom-scrollbar pr-1">
        {groups.map((group) => {
          const groupItems = visibleMenuItems.filter((item) => item.group === group);
          if (groupItems.length === 0) return null;

          return (
            <div key={group} className="flex flex-col gap-1.5">
              <span
                className={`text-[0.65rem] font-bold text-[var(--ui-color-gold-500)]/70 mb-1 px-3 tracking-[0.25em] uppercase sidebar-label font-display transition-opacity duration-200 ${isSidebarExpanded ? 'opacity-100' : 'opacity-0 w-0 h-0 overflow-hidden'}`}
              >
                {group}
              </span>
              {groupItems.map((item) => renderMenuItem(item))}
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="mt-4 pt-4 border-t border-sidebar-border flex flex-col gap-2 shrink-0">
        {user?.subdominio && isSidebarExpanded && (
          <div className="px-3 mb-1">
            <div className="text-[0.65rem] font-bold text-sidebar-primary tracking-wider uppercase mb-0.5">
              Seu Workspace
            </div>
            <a
              href={`https://${user.subdominio}.dluxury-crm.vercel.app`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--ui-text-secondary)] hover:text-[var(--ui-color-teal-500)] transition-colors flex items-center gap-1 bg-[var(--ui-bg-subtle)] px-2 py-1.5 rounded-[var(--ui-radius-md)] border border-[var(--ui-border)] outline-none focus:outline-none"
              title="Acessar URL exclusiva"
            >
              <span className="truncate">{user.subdominio}.dluxury-crm.vercel.app</span>
            </a>
          </div>
        )}

        <div className="flex items-center gap-2.5 px-3">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent text-sidebar-accent-foreground flex items-center justify-center font-bold text-xs shrink-0 font-display">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div
            className={`sidebar-label flex-1 min-w-0 transition-opacity duration-200 ${isSidebarExpanded ? 'opacity-100' : 'opacity-0 w-0 h-0 overflow-hidden'}`}
          >
            <p className="text-sm font-semibold truncate text-sidebar-accent-foreground">
              {user?.name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[0.65rem] text-sidebar-primary capitalize font-medium">
                {user?.role}
              </span>
              <span className="w-1 h-1 rounded-full bg-sidebar-border"></span>
              <span className="text-[0.65rem] bg-accent/20 text-accent px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                {user?.planoTier || 'BASIC'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className={`flex items-center justify-center bg-[var(--ui-surface)] hover:bg-[var(--ui-color-danger-soft)] text-[var(--ui-text-primary)] hover:text-[var(--ui-color-danger)] rounded-[var(--ui-radius-lg)] border border-[var(--ui-border)] hover:border-[var(--ui-color-danger)]/30 transition-all duration-150 outline-none focus:outline-none ${isSidebarExpanded ? 'w-full gap-2 p-2.5 text-sm font-semibold' : 'w-10 h-10 p-0 mx-auto'}`}
          aria-label="Sair do sistema"
          title="Sair"
        >
          <LogOut size={15} />
          {isSidebarExpanded && <span>Sair</span>}
        </button>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          /* Do not hide labels when expanded on mobile */
          /* .sidebar-label { display: none; } */
          /* aside { width: 64px !important; padding-left: 0.5rem; padding-right: 0.5rem; } */
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
