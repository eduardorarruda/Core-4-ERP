import React, { useRef, useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Settings, LogOut, Sun, Moon, Search } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ThemeContext } from '../../context/ThemeContext';

const ROUTE_NAMES = {
  '/dashboard': 'Dashboard',
  '/parceiros': 'Parceiros',
  '/categorias': 'Categorias',
  '/contas-correntes': 'Contas Correntes',
  '/contas': 'Lançamentos',
  '/cartoes': 'Cartões',
  '/investimentos': 'Investimentos',
  '/assinaturas': 'Assinaturas',
  '/notificacoes': 'Notificações',
  '/calendario': 'Calendário',
  '/reports': 'Relatórios',
  '/audit': 'Auditoria',
  '/configuracoes': 'Configurações',
};

function getInitials(nome) {
  if (!nome) return '?';
  return nome.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

export default function TopNav({ onMenuClick, onCommandPaletteOpen }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario, logout } = useAuth();
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const pageName = ROUTE_NAMES[location.pathname] ?? 'Core 4 ERP';

  useEffect(() => {
    document.title = `${pageName} | Core 4 ERP`;
  }, [pageName]);

  const handleKbShortcut = useCallback((e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      onCommandPaletteOpen?.();
    }
  }, [onCommandPaletteOpen]);

  useEffect(() => {
    document.addEventListener('keydown', handleKbShortcut);
    return () => document.removeEventListener('keydown', handleKbShortcut);
  }, [handleKbShortcut]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 w-full z-40 bg-surface/80 backdrop-blur-xl flex justify-between items-center h-16 px-4 lg:px-8 border-b border-text-primary/5">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Abrir menu"
          className="lg:hidden hover:bg-surface-medium p-2 rounded-lg transition-colors text-text-primary/60 hover:text-text-primary"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-sm font-bold text-text-primary/80 font-display hidden sm:block">{pageName}</span>
      </div>

      {/* Center: search trigger */}
      <button
        onClick={onCommandPaletteOpen}
        className="hidden md:flex items-center gap-3 px-4 py-2 rounded-xl bg-surface-medium border border-text-primary/5 text-text-primary/40 text-sm hover:border-text-primary/10 hover:text-text-primary/60 transition-all w-64"
        aria-label="Abrir busca global (Ctrl+K)"
      >
        <Search className="w-4 h-4 shrink-0" />
        <span className="flex-1 text-left">Buscar...</span>
        <kbd className="hidden lg:inline-flex text-[10px] font-bold bg-surface-highest px-1.5 py-0.5 rounded border border-text-primary/10 text-text-primary/40">
          ⌘K
        </kbd>
      </button>

      {/* Right */}
      <div className="flex items-center gap-1 lg:gap-2">
        {/* Mobile search */}
        <button
          onClick={onCommandPaletteOpen}
          aria-label="Buscar"
          className="md:hidden hover:bg-surface-medium p-2 rounded-lg transition-colors text-text-primary/60 hover:text-text-primary"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
          title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
          className="hover:bg-surface-medium p-2 rounded-lg transition-colors text-text-primary/60 hover:text-text-primary"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Avatar */}
        <div className="relative" ref={wrapperRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu do usuário"
            className="w-8 h-8 lg:w-9 lg:h-9 rounded-full overflow-hidden border border-text-primary/10 cursor-pointer hover:border-primary/50 transition-colors flex items-center justify-center bg-surface-medium"
          >
            {usuario?.fotoPerfil ? (
              <img src={usuario.fotoPerfil} alt="Perfil" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-text-primary select-none">
                {getInitials(usuario?.nome)}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-52 rounded-xl bg-surface-medium border border-text-primary/10 shadow-elevated overflow-hidden z-50 animate-scale-in">
              {usuario && (
                <div className="px-4 py-3 border-b border-text-primary/10">
                  <p className="text-xs font-bold text-text-primary truncate">{usuario.nome}</p>
                  <p className="text-[10px] text-text-primary/50 truncate">{usuario.email}</p>
                  {usuario.role && (
                    <p className="text-[10px] text-primary/70 uppercase tracking-wider font-bold mt-0.5">
                      {usuario.role === 'ROLE_ADMIN' ? 'Administrador' : 'Usuário'}
                    </p>
                  )}
                </div>
              )}
              <button
                onClick={() => { setOpen(false); navigate('/configuracoes'); }}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-text-primary/80 hover:bg-surface-highest hover:text-text-primary transition-colors"
              >
                <Settings className="w-4 h-4" />
                Configurações da Conta
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-error hover:bg-surface-highest transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
