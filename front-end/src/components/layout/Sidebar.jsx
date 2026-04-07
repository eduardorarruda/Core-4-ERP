import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, Wallet, BarChart3, Gavel, Settings, HelpCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function Sidebar({ onClose }) {
  const navigate = useNavigate();
  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { id: 'transactions', icon: ArrowLeftRight, label: 'Lançamentos', path: '/transactions' },
    { id: 'reconciliation', icon: Wallet, label: 'Conciliação', path: '/reconciliation' },
    { id: 'reports', icon: BarChart3, label: 'Relatórios', path: '/reports' },
    { id: 'audit-log', icon: Gavel, label: 'Auditoria', path: '/audit' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    navigate('/login');
  };

  return (
    <aside className="h-screen sticky top-0 w-20 bg-surface flex flex-col items-center py-8 gap-8 z-50 border-r border-white/5">
      <div className="mb-4 flex flex-col items-center gap-4">
        <NavLink to="/dashboard" className="text-primary font-bold text-xl tracking-tighter cursor-pointer">
          C4
        </NavLink>
      </div>

      <nav className="flex flex-col items-center gap-6 flex-1 w-full">
        {navItems.map((item) => {
          return (
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
                  <item.icon className={cn("w-6 h-6", isActive && "text-primary")} />
                  <span className="absolute left-20 bg-surface-highest px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl border border-white/5 z-50">
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="flex flex-col items-center gap-6 pb-4">
        <button className="text-zinc-400 hover:text-zinc-100 transition-colors">
          <Settings className="w-6 h-6" />
        </button>
        <button className="text-zinc-400 hover:text-zinc-100 transition-colors">
          <HelpCircle className="w-6 h-6" />
        </button>
      </div>
    </aside>
  );
}
