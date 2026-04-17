import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ArrowLeftRight, Wallet, BarChart3, Gavel,
  Users, Landmark, FileText, CreditCard, TrendingUp, Bell,
  LogOut
} from 'lucide-react';
import { cn } from '../../lib/utils';

const NAV = [
  { id: 'dashboard',        icon: LayoutDashboard, label: 'Dashboard',        path: '/dashboard' },
  { id: 'transactions',     icon: ArrowLeftRight,  label: 'Lançamentos',      path: '/transactions' },
  { id: 'parceiros',        icon: Users,           label: 'Parceiros',        path: '/parceiros' },
  { id: 'contas-correntes', icon: Landmark,        label: 'Contas Correntes', path: '/contas-correntes' },
  { id: 'contas',           icon: FileText,        label: 'Contas',           path: '/contas' },
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
    navigate('/login');
  };

  return (
    <aside className="h-screen sticky top-0 w-20 bg-surface flex flex-col items-center py-8 gap-4 z-50 border-r border-white/5">
      <NavLink to="/dashboard" className="text-primary font-bold text-xl tracking-tighter cursor-pointer mb-2">
        C4
      </NavLink>

      <nav className="flex flex-col items-center gap-1 flex-1 w-full overflow-y-auto no-scrollbar">
        {NAV.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) => cn(
              "relative w-full py-3 flex justify-center transition-all duration-200 group",
              isActive
                ? "text-white border-l-2 border-primary bg-gradient-to-r from-primary/10 to-transparent"
                : "text-zinc-400 hover:text-zinc-100"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn("w-5 h-5", isActive && "text-primary")} />
                <span className="absolute left-20 bg-surface-highest px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl border border-white/5 z-50">
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={handleLogout}
        className="text-zinc-400 hover:text-red-400 transition-colors pb-2"
        title="Sair"
      >
        <LogOut className="w-5 h-5" />
      </button>
    </aside>
  );
}
