import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Receipt, Sparkles, Calendar, Menu } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { getFirstAccessibleRoute } from '../../lib/routeUtils';

/**
 * BottomNav — barra de navegação inferior para o app instalado (PWA) no mobile.
 *
 * Visível somente em telas pequenas (`lg:hidden`); no desktop a navegação continua
 * sendo o rail lateral (Sidebar). Fixa no rodapé, respeita a safe-area do iOS
 * (`pb-safe`) e tem 5 slots, com a Áurea (IA) em destaque no centro.
 *
 * Regra de permissão: slots gateados por permissão que o usuário não possui são
 * substituídos pela primeira rota acessível, evitando levar o usuário a uma tela
 * que ele não pode ver.
 *
 * Props:
 *  - onAbrirMenu (fn) abre o drawer do Sidebar (mesmo estado usado no App).
 */
export default function BottomNav({ onAbrirMenu }) {
  const { temPermissao } = useAuth();
  const { pathname } = useLocation();

  // Destino do slot "Início": Dashboard quando permitido, senão a 1ª rota acessível.
  const inicioPath = temPermissao('DASHBOARD_VISUALIZAR')
    ? '/dashboard'
    : getFirstAccessibleRoute(temPermissao);

  const isAtivo = (path) =>
    pathname === path || pathname.startsWith(`${path}/`);

  return (
    <nav
      aria-label="Navegação principal"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface-low/95 backdrop-blur-md border-t border-text-primary/10 pb-safe"
    >
      <div className="flex items-end justify-around px-2 pt-1.5 pb-1">
        {/* Início (Dashboard ou 1ª rota acessível) */}
        <SlotLink
          to={inicioPath}
          icon={LayoutDashboard}
          label="Início"
          ativo={isAtivo('/dashboard') || (inicioPath !== '/dashboard' && isAtivo(inicioPath))}
        />

        {/* Lançamentos — só se puder visualizar contas; senão vira 1ª rota acessível */}
        {temPermissao('CONTA_VISUALIZAR') ? (
          <SlotLink to="/contas" icon={Receipt} label="Lançamentos" ativo={isAtivo('/contas')} />
        ) : (
          <SlotLink
            to={getFirstAccessibleRoute(temPermissao)}
            icon={Receipt}
            label="Lançamentos"
            ativo={false}
          />
        )}

        {/* Áurea — slot central destacado (a IA é protagonista) */}
        <Link
          to="/assistente"
          aria-label="Áurea, assistente de IA"
          aria-current={isAtivo('/assistente') ? 'page' : undefined}
          className="flex flex-col items-center gap-1 -mt-5 shrink-0"
        >
          <span
            className={cn(
              'grid place-items-center w-14 h-14 rounded-full bg-primary text-on-primary shadow-lg shadow-primary/30 transition-transform active:scale-95',
              isAtivo('/assistente') && 'ring-4 ring-primary/25'
            )}
          >
            <Sparkles className="w-6 h-6" />
          </span>
          <span
            className={cn(
              'text-[11px] font-semibold',
              isAtivo('/assistente') ? 'text-primary' : 'text-text-primary/60'
            )}
          >
            Áurea
          </span>
        </Link>

        {/* Calendário — só se tiver permissão; senão 1ª rota acessível */}
        {temPermissao('CALENDARIO_VISUALIZAR') ? (
          <SlotLink to="/calendario" icon={Calendar} label="Calendário" ativo={isAtivo('/calendario')} />
        ) : (
          <SlotLink
            to={getFirstAccessibleRoute(temPermissao)}
            icon={Calendar}
            label="Calendário"
            ativo={false}
          />
        )}

        {/* Menu — abre o drawer do Sidebar */}
        <button
          type="button"
          onClick={onAbrirMenu}
          aria-label="Abrir menu de navegação"
          className="flex flex-col items-center justify-center gap-1 min-h-11 min-w-11 shrink-0 text-text-primary/60 active:text-text-primary transition-colors"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[11px] font-medium">Menu</span>
        </button>
      </div>
    </nav>
  );
}

/**
 * Slot padrão da barra (ícone + rótulo). Item ativo destacado com a cor primária.
 */
function SlotLink({ to, icon: Icon, label, ativo }) {
  return (
    <Link
      to={to}
      aria-label={label}
      aria-current={ativo ? 'page' : undefined}
      className={cn(
        'flex flex-col items-center justify-center gap-1 min-h-11 min-w-11 shrink-0 transition-colors',
        ativo ? 'text-primary' : 'text-text-primary/60 active:text-text-primary'
      )}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[11px] font-medium">{label}</span>
    </Link>
  );
}
