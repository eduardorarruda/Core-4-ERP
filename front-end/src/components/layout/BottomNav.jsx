import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { NAV, itemDaRota, podeVerItem, destinoDoItem } from '../../lib/navigation';
import { IndicatorGroup, LayoutIndicator } from '../motion/Movimento';

/**
 * Barra de navegação inferior (celular / PWA). Slots vêm de lib/navigation.js (`mobile: true`):
 * Início · Contas · [Áurea no centro] · Calendário · Menu. Slot sem permissão SOME (a barra
 * redistribui) — nunca um rótulo apontando para outra tela.
 *
 * Props: onAbrirMenu (abre o drawer do menu lateral).
 */
export default function BottomNav({ onAbrirMenu }) {
  const { temPermissao, tipoConta } = useAuth();
  const { pathname } = useLocation();
  const ctx = { temPermissao, tipoConta };
  const ativoId = itemDaRota(pathname)?.id;
  const slots = NAV.filter((i) => i.mobile && podeVerItem(i, ctx)).sort((a, b) => a.mobile - b.mobile);
  const meio = Math.ceil(slots.length / 2);
  const esquerda = slots.slice(0, meio);
  const direita = slots.slice(meio);
  const aureaAtiva = ativoId === 'aurea';

  const renderSlot = (item) => (
    <SlotLink
      key={item.id}
      to={destinoDoItem(item, temPermissao)}
      icon={item.icon}
      label={item.labelCurto ?? item.label}
      ativo={item.id === ativoId}
    />
  );

  return (
    <nav
      aria-label="Navegação principal"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 c4-glass border-t pb-safe"
    >
      <IndicatorGroup id="bottomnav">
        <div className="grid grid-cols-5 items-end px-1.5 pt-1.5 pb-1">
          {esquerda.map(renderSlot)}
          {Array.from({ length: 2 - esquerda.length }).map((_, i) => <span key={`e${i}`} aria-hidden="true" />)}

          {/* Áurea — slot central em destaque */}
          <Link
            to="/assistente"
            aria-label="Áurea, assistente"
            aria-current={aureaAtiva ? 'page' : undefined}
            className="flex flex-col items-center gap-1 -mt-6 focus-visible:outline-none group"
          >
            <span
              className={cn(
                'relative grid place-items-center w-14 h-14 rounded-2xl bg-gradient-primary text-on-primary',
                'shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_10px_28px_-8px_var(--color-primary)]',
                'transition-transform active:scale-95 group-focus-visible:ring-2 group-focus-visible:ring-primary group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-surface',
                aureaAtiva && 'ring-4 ring-primary/25'
              )}
            >
              <Sparkles className="w-6 h-6" aria-hidden="true" />
            </span>
            <span className={cn('text-[0.6875rem] font-semibold', aureaAtiva ? 'text-primary' : 'text-text-primary/65')}>Áurea</span>
          </Link>

          {direita.map(renderSlot)}
          {Array.from({ length: Math.max(0, 1 - direita.length) }).map((_, i) => <span key={`d${i}`} aria-hidden="true" />)}

          <button
            type="button"
            onClick={onAbrirMenu}
            aria-label="Abrir menu de navegação"
            className="flex flex-col items-center justify-center gap-1 min-h-12 rounded-xl text-text-primary/60 active:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
            <span className="text-[0.6875rem] font-medium">Menu</span>
          </button>
        </div>
      </IndicatorGroup>
    </nav>
  );
}

function SlotLink({ to, icon: Icon, label, ativo }) {
  return (
    <Link
      to={to}
      aria-current={ativo ? 'page' : undefined}
      className={cn(
        'relative isolate flex flex-col items-center justify-center gap-1 min-h-12 rounded-xl transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        ativo ? 'text-primary' : 'text-text-primary/60 active:text-text-primary'
      )}
    >
      {ativo && <LayoutIndicator layoutId="slot-ativo" className="inset-x-2 inset-y-0.5 rounded-xl bg-primary/[0.1]" />}
      <Icon className="w-5 h-5" aria-hidden="true" />
      <span className="text-[0.6875rem] font-medium truncate max-w-full px-1">{label}</span>
    </Link>
  );
}
