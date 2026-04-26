import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, BarChart3, Gavel,
  Users, Landmark, FileText, CreditCard, TrendingUp, Bell,
  LogOut, Tag, Repeat, CalendarDays, Settings, GitMerge
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';

const NAV_GROUPS = [
  {
    label: 'Principal',
    items: [
      { id: 'dashboard',  icon: LayoutDashboard, label: 'Dashboard',        path: '/dashboard' },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { id: 'parceiros',        icon: Users,       label: 'Parceiros',        path: '/parceiros' },
      { id: 'categorias',       icon: Tag,         label: 'Categorias',       path: '/categorias' },
      { id: 'contas-correntes', icon: Landmark,    label: 'Contas Correntes', path: '/contas-correntes' },
      { id: 'contas',           icon: FileText,    label: 'Lançamentos',      path: '/contas' },
      { id: 'cartoes',          icon: CreditCard,  label: 'Cartões',          path: '/cartoes' },
      { id: 'investimentos',    icon: TrendingUp,  label: 'Investimentos',    path: '/investimentos' },
      { id: 'assinaturas',      icon: Repeat,      label: 'Assinaturas',      path: '/assinaturas' },
      { id: 'conciliacao',      icon: GitMerge,    label: 'Conciliação',      path: '/conciliacao' },
    ],
  },
  {
    label: 'Análises',
    items: [
      { id: 'notificacoes', icon: Bell,         label: 'Notificações', path: '/notificacoes' },
      { id: 'calendario',   icon: CalendarDays, label: 'Calendário',   path: '/calendario' },
      { id: 'reports',      icon: BarChart3,    label: 'Relatórios',   path: '/reports' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { id: 'audit', icon: Gavel, label: 'Auditoria', path: '/audit', adminOnly: true },
    ],
  },
];

function getInitials(nome) {
  if (!nome) return '?';
  return nome.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

export default function Sidebar({ onClose }) {
  const { usuario, logout } = useAuth();

  return (
    <aside className="group/sidebar h-screen sticky top-0 w-16 hover:w-56 transition-all duration-300 ease-in-out overflow-hidden bg-surface flex flex-col items-start py-6 gap-2 z-50 border-r border-text-primary/5">
      {/* Logo */}
      <NavLink
        to="/dashboard"
        className="px-4 mb-4 flex items-center gap-3 cursor-pointer w-full"
      >
        <span className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-bold text-gradient-primary font-display">
          C4
        </span>
        <span className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap text-sm font-bold text-text-primary font-display">
          Core 4 ERP
        </span>
      </NavLink>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 flex-1 w-full overflow-y-auto no-scrollbar px-2">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.adminOnly || usuario?.role === 'ROLE_ADMIN'
          );
          if (!visibleItems.length) return null;
          return (
            <React.Fragment key={group.label}>
              <div className="px-2 pt-3 pb-1 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
                <span className="text-[9px] font-bold uppercase tracking-widest text-text-primary/30">
                  {group.label}
                </span>
              </div>
              {visibleItems.map((item) => (
                <NavLink
                  key={item.id}
                  to={item.path}
                  onClick={onClose}
                  title={item.label}
                  className={({ isActive }) => cn(
                    'w-full px-3 py-2.5 flex items-center gap-3 rounded-xl transition-all duration-200 relative',
                    isActive
                      ? 'text-text-primary bg-gradient-to-r from-primary/15 to-transparent border-l-2 border-primary pl-[calc(0.75rem-2px)]'
                      : 'text-text-primary/50 hover:text-text-primary hover:bg-surface-medium'
                  )}
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className={cn('w-5 h-5 shrink-0', isActive && 'text-primary')} />
                      <span className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 text-[11px] font-bold uppercase tracking-widest whitespace-nowrap">
                        {item.label}
                      </span>
                    </>
                  )}
                </NavLink>
              ))}
            </React.Fragment>
          );
        })}
      </nav>

      {/* Separador */}
      <div className="w-full px-4 mb-1">
        <div className="h-px bg-text-primary/5" />
      </div>

      {/* User + Logout */}
      <div className="w-full px-2 space-y-1">
        <NavLink
          to="/configuracoes"
          onClick={onClose}
          title="Configurações"
          className={({ isActive }) => cn(
            'w-full px-3 py-2.5 flex items-center gap-3 rounded-xl transition-all duration-200',
            isActive ? 'text-text-primary bg-surface-medium' : 'text-text-primary/50 hover:text-text-primary hover:bg-surface-medium'
          )}
        >
          <Settings className="w-5 h-5 shrink-0" />
          <span className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 text-[11px] font-bold uppercase tracking-widest whitespace-nowrap">
            Configurações
          </span>
        </NavLink>

        <button
          onClick={logout}
          title="Sair"
          className="w-full px-3 py-2.5 flex items-center gap-3 rounded-xl text-text-primary/50 hover:text-error hover:bg-error/5 transition-all duration-200"
          aria-label="Sair do sistema"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 text-[11px] font-bold uppercase tracking-widest whitespace-nowrap">
            Sair
          </span>
        </button>

        {/* Avatar do usuário */}
        <div className="px-3 py-2 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-surface-medium border border-text-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
            {usuario?.fotoPerfil ? (
              <img src={usuario.fotoPerfil} alt="Perfil" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-text-primary select-none">
                {getInitials(usuario?.nome)}
              </span>
            )}
          </div>
          <div className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 min-w-0">
            <p className="text-[11px] font-bold text-text-primary truncate">{usuario?.nome ?? 'Usuário'}</p>
            <p className="text-[9px] text-text-primary/40 truncate">{usuario?.email ?? ''}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
