import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Wallet, BarChart3, Gavel,
  Users, Landmark, FileText, CreditCard, TrendingUp, Bell,
  LogOut, Tag
} from 'lucide-react';
import { cn } from '../../lib/utils';

const NAV = [
  { id: 'dashboard',        icon: LayoutDashboard, label: 'Dashboard',        path: '/dashboard' },
  { id: 'parceiros',        icon: Users,           label: 'Parceiros',        path: '/parceiros' },
  { id: 'categorias',       icon: Tag,             label: 'Categorias',       path: '/categorias' },
  { id: 'contas-correntes', icon: Landmark,        label: 'Contas Correntes', path: '/contas-correntes' },
  { id: 'contas',           icon: FileText,        label: 'Lançamentos',      path: '/contas' },
  { id: 'cartoes',          icon: CreditCard,      label: 'Cartões',          path: '/cartoes' },
  { id: 'investimentos',    icon: TrendingUp,      label: 'Investimentos',    path: '/investimentos' },
  { id: 'notificacoes',     icon: Bell,            label: 'Notificações',     path: '/notificacoes' },
  { id: 'reconciliation',   icon: Wallet,          label: 'Conciliação',      path: '/reconciliation' },
  { id: 'reports',          icon: BarChart3,       label: 'Relatórios',       path: '/reports' },
  { id: 'audit',            icon: Gavel,           label: 'Auditoria',        path: '/audit' },
];

export default function Sidebar({ onClose }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  return (
    <aside className="group/sidebar h-screen sticky top-0 w-16 hover:w-56 transition-all duration-300 ease-in-out overflow-hidden bg-surface flex flex-col items-start py-8 gap-4 z-50 border-r border-white/5">
      <NavLink
        to="/dashboard"
        className="px-4 mb-2 flex items-center gap-3 text-primary font-bold text-xl tracking-tighter cursor-pointer w-full"
      >
        <span className="shrink-0">C4</span>
        <span className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap text-sm">
          Core 4 ERP
        </span>
      </NavLink>

      <nav className="flex flex-col gap-1 flex-1 w-full overflow-y-auto no-scrollbar">
        {NAV.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) => cn(
              'w-full px-4 py-3 flex items-center gap-3 transition-all duration-200',
              isActive
                ? 'text-white border-l-2 border-primary bg-gradient-to-r from-primary/10 to-transparent'
                : 'text-zinc-400 hover:text-zinc-100'
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
      </nav>

      <button
        onClick={handleLogout}
        className="px-4 py-2 flex items-center gap-3 text-zinc-400 hover:text-red-400 transition-colors w-full"
        title="Sair"
      >
        <LogOut className="w-5 h-5 shrink-0" />
        <span className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 text-[11px] font-bold uppercase tracking-widest whitespace-nowrap">
          Sair
        </span>
      </button>
    </aside>
  );
}
