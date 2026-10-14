import React, { useRef, useState, useEffect, useCallback, useContext, useId } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Settings, LogOut, Sun, Moon, Search, HelpCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ThemeContext } from '../../context/ThemeContext';
import NotificacoesPopover from './NotificacoesPopover';
import Button from '../ui/Button';

const ROUTE_NAMES = {
  '/dashboard': 'Dashboard',
  '/parceiros': 'Parceiros',
  '/categorias': 'Categorias',
  '/contas-correntes': 'Contas Correntes',
  '/contas': 'Lançamentos',
  '/cartoes': 'Cartões',
  '/investimentos': 'Investimentos',
  '/assinaturas': 'Assinaturas',
  '/calendario': 'Calendário',
  '/reports': 'Relatórios',
  '/audit': 'Auditoria',
  '/configuracoes': 'Configurações',
  '/ajuda': 'Central de Ajuda',
};

const BOTAO_ICONE = 'min-w-11 min-h-11 grid place-items-center rounded-lg transition-colors text-text-primary/70 hover:text-text-primary hover:bg-surface-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

function getInitials(nome) {
  if (!nome) return '?';
  return nome.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

export default function TopNav({ onMenuClick, onCommandPaletteOpen }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario, logout, adminSistema } = useAuth();
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const botaoAvatarRef = useRef(null);
  const menuId = useId();

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

  // Menu do usuário: fecha ao clicar fora e com Esc (devolvendo o foco ao avatar)
  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    const handleEsc = (e) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      botaoAvatarRef.current?.focus();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  return (
    <div className="sticky top-0 z-40">
      {/* Altura mínima + safe area: no iPhone com notch o conteúdo não fica espremido */}
      <header className="w-full bg-surface-low/90 backdrop-blur-xl flex justify-between items-center min-h-[calc(3.5rem+env(safe-area-inset-top))] px-4 lg:px-8 border-b border-text-primary/5 pt-safe">
        {/* Left */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Abrir menu"
            className={`lg:hidden ${BOTAO_ICONE}`}
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-bold text-text-primary/80 font-display truncate">{pageName}</span>
          </div>
        </div>

        {/* Center: search trigger */}
        <button
          type="button"
          onClick={onCommandPaletteOpen}
          className="hidden md:flex items-center gap-3 px-4 min-h-11 rounded-xl bg-surface-medium border border-text-primary/5 text-text-primary/70 text-sm hover:border-primary/20 hover:text-text-primary transition-all w-64 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Abrir busca global (Ctrl+K)"
        >
          <Search className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="flex-1 text-left text-xs">Buscar...</span>
          <kbd className="hidden lg:inline-flex text-xs font-bold bg-surface-high px-1.5 py-0.5 rounded border border-text-primary/10 text-text-primary/70 font-mono">
            ⌘K
          </kbd>
        </button>

        {/* Right */}
        <div className="flex items-center gap-0.5 lg:gap-1">
          {/* Mobile search */}
          <button
            type="button"
            onClick={onCommandPaletteOpen}
            aria-label="Buscar"
            className={`md:hidden ${BOTAO_ICONE}`}
          >
            <Search className="w-5 h-5" aria-hidden="true" />
          </button>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
            title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
            className={BOTAO_ICONE}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" aria-hidden="true" /> : <Moon className="w-5 h-5" aria-hidden="true" />}
          </button>

          {/* Ajuda */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/ajuda')}
            aria-label="Abrir a Central de Ajuda"
            title="Central de Ajuda"
            className="text-text-primary/70 hover:text-text-primary"
          >
            <HelpCircle className="w-5 h-5" aria-hidden="true" />
          </Button>

          {/* Notificações (sino) */}
          <NotificacoesPopover />

          {/* Avatar — área de toque de 44px com o círculo visual menor dentro */}
          <div className="relative" ref={wrapperRef}>
            <button
              ref={botaoAvatarRef}
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label="Menu do usuário"
              aria-haspopup="menu"
              aria-expanded={open}
              aria-controls={open ? menuId : undefined}
              className="min-w-11 min-h-11 grid place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="w-8 h-8 lg:w-9 lg:h-9 rounded-full overflow-hidden flex items-center justify-center bg-primary/15 border border-primary/25">
                {usuario?.fotoPerfil ? (
                  <img src={usuario.fotoPerfil} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-primary select-none font-display" aria-hidden="true">
                    {getInitials(usuario?.nome)}
                  </span>
                )}
              </span>
            </button>

            {open && (
              <div
                id={menuId}
                role="menu"
                aria-label="Opções da conta"
                className="absolute right-0 mt-2 w-56 rounded-xl border border-text-primary/10 shadow-elevated overflow-hidden z-50 animate-scale-in bg-surface-low/95 backdrop-blur-md"
              >
                {usuario && (
                  <div className="px-4 py-3 border-b border-text-primary/10" role="none">
                    <p className="text-xs font-bold text-text-primary truncate">{usuario.nome}</p>
                    <p className="text-xs text-text-primary/70 truncate font-mono">{usuario.email}</p>
                    {adminSistema && (
                      <p className="text-xs text-primary uppercase tracking-wider font-bold mt-0.5 font-mono">
                        Admin do sistema
                      </p>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setOpen(false); navigate('/configuracoes'); }}
                  className="flex items-center gap-3 w-full px-4 min-h-11 text-sm text-text-primary/80 hover:bg-surface-high hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:bg-surface-high"
                >
                  <Settings className="w-4 h-4" aria-hidden="true" />
                  Configurações da conta
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={logout}
                  className="flex items-center gap-3 w-full px-4 min-h-11 text-sm text-error hover:bg-surface-high transition-colors focus-visible:outline-none focus-visible:bg-surface-high"
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    </div>
  );
}
