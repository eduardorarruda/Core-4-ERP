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

const TICKER_ITEMS = [
  { sym: 'USD/BRL', val: '5,1284', dir: 'up',   pct: '+0.42%' },
  { sym: 'IBOV',    val: '129.482', dir: 'up',   pct: '+1.18%' },
  { sym: 'SELIC',   val: '10.75%',  dir: 'down', pct: '-0.25' },
  { sym: 'CDI',     val: '10.65%',  dir: 'up',   pct: '+0.01' },
  { sym: 'BTC',     val: '$67.420', dir: 'up',   pct: '+2.3%' },
  { sym: 'IPCA',    val: '0.32%',   dir: 'down', pct: '-0.04' },
  { sym: 'EUR/BRL', val: '5,5821',  dir: 'down', pct: '-0.18%' },
  { sym: 'NASDAQ',  val: '17.842',  dir: 'up',   pct: '+0.87%' },
];

function getInitials(nome) {
  if (!nome) return '?';
  return nome.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

function TickerBar() {
  const all = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="hidden md:flex items-center overflow-hidden h-7 bg-surface-low border-b border-text-primary/5 select-none">
      {/* LIVE badge */}
      <div className="flex-shrink-0 flex items-center gap-1.5 px-3 h-full border-r border-text-primary/5 bg-primary/5">
        <span className="live-dot" style={{ width: 5, height: 5 }} />
        <span className="text-[9px] font-bold tracking-widest uppercase text-primary font-mono">LIVE</span>
      </div>
      {/* Scroll track */}
      <div className="flex-1 overflow-hidden" style={{ WebkitMaskImage: 'linear-gradient(to right,transparent,#000 3%,#000 97%,transparent)', maskImage: 'linear-gradient(to right,transparent,#000 3%,#000 97%,transparent)' }}>
        <div className="ticker-scroll flex items-center gap-8 h-7 whitespace-nowrap font-mono text-[10px] pl-6">
          {all.map((t, i) => (
            <span key={i} className="text-text-primary/50">
              <b className="text-text-primary/75">{t.sym}</b> {t.val}{' '}
              <span style={{ color: t.dir === 'up' ? 'var(--color-primary)' : 'var(--color-error)' }}>
                {t.dir === 'up' ? '▲' : '▼'} {t.pct}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
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
    <div className="sticky top-0 z-40">
      {/* Ticker bar */}
      <TickerBar />

      {/* Main header */}
      <header className="w-full bg-surface-low/90 backdrop-blur-xl flex justify-between items-center h-14 px-4 lg:px-8 border-b border-text-primary/5">
        {/* Left */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            aria-label="Abrir menu"
            className="lg:hidden hover:bg-surface-medium p-2 rounded-lg transition-colors text-text-primary/60 hover:text-text-primary"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-text-primary/80 font-display hidden sm:block">{pageName}</span>
          </div>
        </div>

        {/* Center: search trigger */}
        <button
          onClick={onCommandPaletteOpen}
          className="hidden md:flex items-center gap-3 px-4 py-2 rounded-xl bg-surface-medium border border-text-primary/5 text-text-primary/40 text-sm hover:border-primary/20 hover:text-text-primary/60 transition-all w-64"
          aria-label="Abrir busca global (Ctrl+K)"
        >
          <Search className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-left text-xs">Buscar...</span>
          <kbd className="hidden lg:inline-flex text-[9px] font-bold bg-surface-high px-1.5 py-0.5 rounded border border-text-primary/10 text-text-primary/40 font-mono">
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
              className="w-8 h-8 lg:w-9 lg:h-9 rounded-full overflow-hidden cursor-pointer transition-all flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,rgba(110,255,192,.3),rgba(110,255,192,.1))', border: '1px solid rgba(110,255,192,.25)' }}
            >
              {usuario?.fotoPerfil ? (
                <img src={usuario.fotoPerfil} alt="Perfil" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-primary select-none font-display">
                  {getInitials(usuario?.nome)}
                </span>
              )}
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl border border-text-primary/10 shadow-elevated overflow-hidden z-50 animate-scale-in" style={{ background: 'rgba(28,27,27,.95)', backdropFilter: 'blur(12px)' }}>
                {usuario && (
                  <div className="px-4 py-3 border-b border-text-primary/10">
                    <p className="text-xs font-bold text-text-primary truncate">{usuario.nome}</p>
                    <p className="text-[10px] text-text-primary/50 truncate font-mono">{usuario.email}</p>
                    {usuario.role && (
                      <p className="text-[10px] text-primary/70 uppercase tracking-wider font-bold mt-0.5 font-mono">
                        {usuario.role === 'ROLE_ADMIN' ? 'Administrador' : 'Usuário'}
                      </p>
                    )}
                  </div>
                )}
                <button
                  onClick={() => { setOpen(false); navigate('/configuracoes'); }}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-text-primary/80 hover:bg-surface-high hover:text-text-primary transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Configurações da Conta
                </button>
                <button
                  onClick={logout}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-error hover:bg-surface-high transition-colors"
                >
                  <LogOut className="w-4 h-4" />
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
