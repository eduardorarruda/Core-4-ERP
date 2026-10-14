import React, { useContext, useEffect, useId, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, Eye, EyeOff, HelpCircle, LogOut, Moon, Search, Settings, Sun } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { useModoPrivado } from '../../hooks/useAtalhos';
import { ThemeContext } from '../../context/ThemeContext';
import { trilhaDaRota } from '../../lib/navigation';
import { PopPresence } from '../motion/Movimento';
import NotificacoesPopover from './NotificacoesPopover';
import BrandMark from '../ui/BrandMark';
import Avatar from '../ui/Avatar';
import Tooltip from '../ui/Tooltip';
import BotaoAcessibilidade from '../acessibilidade/BotaoAcessibilidade';

/**
 * Barra superior. Desktop: trilha "Grupo › Tela" (o título fica só no PageHeader), busca,
 * privacidade, tema, ajuda, notificações e menu do avatar. Mobile: menu, símbolo e ações.
 * Configurações, Ajuda e Sair ficam AQUI (menu do avatar) — o menu lateral não repete.
 */
// Ícones da barra em px (44 = alvo mínimo): com texto ampliado eles não crescem e a barra cabe em 320px
const BOTAO_ICONE = 'relative w-[44px] h-[44px] grid place-items-center rounded-xl transition-colors text-text-primary/65 hover:text-text-primary hover:bg-text-primary/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';
const ITEM_MENU = 'flex items-center gap-3 w-full px-3 min-h-11 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:bg-text-primary/[0.06]';

export default function TopNav({ onCommandPaletteOpen }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { usuario, logout, adminSistema } = useAuth();
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { privado, alternarPrivado } = useModoPrivado();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const botaoAvatarRef = useRef(null);
  const menuId = useId();
  const trilha = trilhaDaRota(pathname);

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

  const irPara = (rota) => { setOpen(false); navigate(rota); };

  return (
    <header className="sticky top-0 z-40 c4-glass border-b pt-safe">
      <div className="flex items-center gap-2 h-16 px-3 sm:px-4 lg:px-8">
        {/* Esquerda */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {/* No celular o menu abre pela barra inferior (BottomNav › Menu) — sem botão duplicado aqui */}
          <span className="lg:hidden pl-1" aria-hidden="true"><BrandMark size={30} /></span>
          {trilha.length > 0 && (
            <nav aria-label="Você está em" className="hidden lg:block min-w-0">
              <ol className="flex items-center gap-1.5 text-sm">
                {trilha.map((parte, i) => (
                  <li key={parte} className="flex items-center gap-1.5 min-w-0">
                    {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-text-primary/30 shrink-0" aria-hidden="true" />}
                    <span
                      aria-current={i === trilha.length - 1 ? 'page' : undefined}
                      className={cn('truncate', i === trilha.length - 1 ? 'text-text-primary/85 font-medium' : 'text-text-primary/65')}
                    >
                      {parte}
                    </span>
                  </li>
                ))}
              </ol>
            </nav>
          )}
        </div>

        {/* Direita */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          <button
            type="button"
            onClick={onCommandPaletteOpen}
            aria-keyshortcuts="Control+K"
            className="hidden md:flex lg:hidden items-center gap-2.5 h-10 pl-3 pr-2 mr-1 w-56 rounded-xl text-sm text-text-primary/55 bg-text-primary/[0.04] border border-border hover:border-border-strong hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Search className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="flex-1 text-left">Buscar…</span>
            <kbd className="c4-kbd" aria-hidden="true">Ctrl K</kbd>
          </button>
          <button type="button" onClick={onCommandPaletteOpen} aria-label="Buscar" className={cn(BOTAO_ICONE, 'md:hidden')}>
            <Search className="w-5 h-5" aria-hidden="true" />
          </button>

          <Tooltip conteudo={privado ? 'Mostrar valores (Alt+P)' : 'Esconder valores (Alt+P)'} lado="bottom">
            <button
              type="button"
              onClick={alternarPrivado}
              aria-pressed={privado}
              aria-label="Modo privacidade: esconder valores"
              className={cn(BOTAO_ICONE, 'hidden sm:grid', privado && 'text-primary')}
            >
              {privado ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
            </button>
          </Tooltip>

          <Tooltip conteudo={theme === 'dark' ? 'Tema claro (Alt+T)' : 'Tema escuro (Alt+T)'} lado="bottom">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
              className={cn(BOTAO_ICONE, 'hidden sm:grid')}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" aria-hidden="true" /> : <Moon className="w-5 h-5" aria-hidden="true" />}
            </button>
          </Tooltip>

          {/* Acessibilidade: visível em todos os tamanhos e sempre no mesmo lugar (Alt+A) */}
          <BotaoAcessibilidade />

          <Tooltip conteudo="Central de Ajuda" lado="bottom">
            <button type="button" onClick={() => navigate('/ajuda')} aria-label="Abrir a Central de Ajuda" className={cn(BOTAO_ICONE, 'hidden sm:grid')}>
              <HelpCircle className="w-5 h-5" aria-hidden="true" />
            </button>
          </Tooltip>

          <NotificacoesPopover />

          {/* Avatar + menu da conta */}
          <div className="relative ml-1" ref={wrapperRef}>
            <button
              ref={botaoAvatarRef}
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={open}
              aria-controls={open ? menuId : undefined}
              className="w-[44px] h-[44px] grid place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span aria-hidden="true">
                <Avatar nome={usuario?.nome} src={usuario?.fotoPerfil} size="md" className={cn('w-[36px] h-[36px] transition-shadow', open && 'ring-2 ring-primary/60')} />
              </span>
              <span className="sr-only">Menu da conta</span>
            </button>

            <PopPresence
              aberto={open}
              origem="top right"
              id={menuId}
              role="menu"
              aria-label="Opções da conta"
              className="absolute right-0 mt-2 w-64 p-1.5 rounded-2xl border border-border-strong bg-surface-low/95 backdrop-blur-xl shadow-elevated z-50"
            >
              {usuario && (
                <div className="flex items-center gap-3 px-3 py-3 mb-1 border-b border-border" role="none">
                  <Avatar nome={usuario.nome} src={usuario.fotoPerfil} size="lg" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">{usuario.nome}</p>
                    <p className="text-xs text-text-primary/60 truncate">{usuario.email}</p>
                    {adminSistema && (
                      <span className="inline-flex mt-1 px-1.5 py-0.5 rounded-md text-[0.6875rem] font-semibold bg-primary/12 text-primary">Admin do sistema</span>
                    )}
                  </div>
                </div>
              )}
              <button type="button" role="menuitem" onClick={() => irPara('/configuracoes')} className={cn(ITEM_MENU, 'text-text-primary/85 hover:bg-text-primary/[0.06]')}>
                <Settings className="w-4 h-4 text-text-primary/60" aria-hidden="true" /> Configurações
              </button>
              <button type="button" role="menuitem" onClick={() => irPara('/ajuda')} className={cn(ITEM_MENU, 'text-text-primary/85 hover:bg-text-primary/[0.06]')}>
                <HelpCircle className="w-4 h-4 text-text-primary/60" aria-hidden="true" /> Central de Ajuda
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={alternarPrivado}
                className={cn(ITEM_MENU, 'sm:hidden text-text-primary/85 hover:bg-text-primary/[0.06]')}
              >
                {privado ? <Eye className="w-4 h-4 text-text-primary/60" aria-hidden="true" /> : <EyeOff className="w-4 h-4 text-text-primary/60" aria-hidden="true" />}
                {privado ? 'Mostrar valores' : 'Esconder valores'}
              </button>
              {/* No celular o tema sai da barra (falta espaço com texto ampliado) e fica aqui */}
              <button
                type="button"
                role="menuitem"
                onClick={toggleTheme}
                className={cn(ITEM_MENU, 'sm:hidden text-text-primary/85 hover:bg-text-primary/[0.06]')}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-text-primary/60" aria-hidden="true" /> : <Moon className="w-4 h-4 text-text-primary/60" aria-hidden="true" />}
                {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
              </button>
              <div className="my-1 h-px bg-border" role="none" />
              <button type="button" role="menuitem" onClick={logout} className={cn(ITEM_MENU, 'text-error hover:bg-error/10')}>
                <LogOut className="w-4 h-4" aria-hidden="true" /> Sair
              </button>
            </PopPresence>
          </div>
        </div>
      </div>
    </header>
  );
}
