import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen, Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { gruposVisiveis, itemDaRota } from '../../lib/navigation';
import { getFirstAccessibleRoute } from '../../lib/routeUtils';
import { IndicatorGroup, LayoutIndicator } from '../motion/Movimento';
import BrandLogo from '../ui/BrandLogo';

/**
 * Menu lateral do Core 4 — lê a navegação de lib/navigation.js (fonte única).
 *
 * Dois modos:
 *  - desktop (lg+): coluna fixa; `recolhida` vira um trilho só de ícones (o nome aparece no
 *    title e para leitores de tela). O botão do rodapé alterna e a escolha é lembrada.
 *  - drawer (mobile): aberto pelo App; rótulos sempre visíveis.
 *
 * Conta, ajuda e sair ficam SÓ no menu do avatar (TopNav) — sem duplicar aqui.
 *
 * Props: recolhida, onAlternarRecolhida, onNavigate (fecha o drawer), onBuscar (abre a busca), drawer.
 */
export default function Sidebar({ recolhida = false, onAlternarRecolhida, onNavigate, onBuscar, drawer = false }) {
  const { temPermissao, tipoConta } = useAuth();
  const { pathname } = useLocation();
  const grupos = gruposVisiveis({ temPermissao, tipoConta });
  const ativoId = itemDaRota(pathname)?.id;
  const compacta = recolhida && !drawer;
  const inicio = temPermissao('DASHBOARD_VISUALIZAR') ? '/dashboard' : getFirstAccessibleRoute(temPermissao);

  return (
    <aside
      aria-label="Menu lateral"
      className={cn(
        'h-dvh flex flex-col bg-surface-low/80 backdrop-blur-xl border-r border-border pt-safe pb-safe',
        'transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
        drawer ? 'w-[17.5rem] max-w-[85vw]' : compacta ? 'w-[4.75rem]' : 'w-64'
      )}
    >
      {/* Marca */}
      <div className={cn('flex items-center h-16 shrink-0', compacta ? 'justify-center px-2' : 'px-5')}>
        <NavLink
          to={inicio}
          onClick={onNavigate}
          className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <BrandLogo size="sm" somenteSimbolo={compacta} as="span" />
          <span className="sr-only">, ir para o início</span>
        </NavLink>
        {drawer && (
          <button
            type="button"
            onClick={onNavigate}
            aria-label="Fechar menu"
            className="ml-auto -mr-2 w-11 h-11 grid place-items-center rounded-xl text-text-primary/60 hover:text-text-primary hover:bg-text-primary/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Busca rápida (atalho visível do Ctrl+K) */}
      {onBuscar && (
        <div className={cn('shrink-0 pb-2', compacta ? 'px-3' : 'px-3.5')}>
          <button
            type="button"
            onClick={onBuscar}
            title={compacta ? 'Buscar (Ctrl+K)' : undefined}
            aria-label={compacta ? 'Buscar' : undefined}
            aria-keyshortcuts="Control+K"
            className={cn(
              'w-full flex items-center gap-2.5 min-h-10 rounded-xl text-sm text-text-primary/60',
              'bg-text-primary/[0.04] border border-border hover:border-border-strong hover:text-text-primary transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              compacta ? 'justify-center px-0' : 'px-3'
            )}
          >
            <Search className="w-4 h-4 shrink-0" aria-hidden="true" />
            {!compacta && (
              <>
                <span className="flex-1 text-left">Buscar</span>
                {!drawer && <kbd className="c4-kbd" aria-hidden="true">Ctrl K</kbd>}
              </>
            )}
          </button>
        </div>
      )}

      {/* Navegação */}
      <IndicatorGroup id={drawer ? "sidebar-drawer" : "sidebar"}>
        <nav id={drawer ? undefined : "navegacao-principal"} aria-label="Menu principal" data-navegacao-principal="" className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-3 pt-3 pb-4">
          {grupos.map((grupo, gi) => (
            <div key={grupo.id} className={cn(gi > 0 && 'mt-5')}>
              {compacta ? (
                gi > 0 && <div aria-hidden="true" className="mx-3 mb-3 h-px bg-border" />
              ) : (
                <p className="c4-eyebrow px-3 mb-1.5">{grupo.label}</p>
              )}
              <ul className="space-y-0.5">
                {grupo.itens.map((item) => {
                  const ativo = item.id === ativoId;
                  const Icone = item.icon;
                  return (
                    <li key={item.id}>
                      <NavLink
                        to={item.to}
                        onClick={onNavigate}
                        title={compacta ? item.label : undefined}
                        aria-label={compacta ? item.label : undefined}
                        aria-current={ativo ? 'page' : undefined}
                        className={cn(
                          'relative isolate group flex items-center gap-3 min-h-11 rounded-xl text-sm font-medium transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                          compacta ? 'justify-center px-0' : 'px-3',
                          ativo ? 'text-text-primary' : 'text-text-primary/65 hover:text-text-primary hover:bg-text-primary/[0.04]'
                        )}
                      >
                        {ativo && (
                          <LayoutIndicator
                            layoutId="sidebar-ativo"
                            className="rounded-xl bg-gradient-to-r from-primary/[0.16] via-primary/[0.07] to-transparent border border-primary/15"
                          />
                        )}
                        {ativo && (
                          <span aria-hidden="true" className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full bg-primary shadow-[0_0_10px_var(--color-primary)]" />
                        )}
                        <Icone
                          className={cn(
                            'w-[1.15rem] h-[1.15rem] shrink-0 transition-colors',
                            ativo ? 'text-primary' : 'text-text-primary/55 group-hover:text-text-primary/85',
                            item.destaque && !ativo && 'text-primary/80'
                          )}
                          aria-hidden="true"
                        />
                        {!compacta && <span className="truncate">{item.label}</span>}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </IndicatorGroup>

      {/* Recolher (desktop) */}
      {!drawer && onAlternarRecolhida && (
        <div className={cn('shrink-0 border-t border-border p-3', compacta && 'px-2')}>
          <button
            type="button"
            onClick={onAlternarRecolhida}
            aria-label={compacta ? 'Expandir menu' : 'Recolher menu'}
            title={compacta ? 'Expandir menu' : 'Recolher menu'}
            className={cn(
              'w-full flex items-center gap-3 min-h-10 rounded-xl text-sm text-text-primary/55 hover:text-text-primary hover:bg-text-primary/[0.04] transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              compacta ? 'justify-center' : 'px-3'
            )}
          >
            {compacta
              ? <PanelLeftOpen className="w-[1.15rem] h-[1.15rem]" aria-hidden="true" />
              : <PanelLeftClose className="w-[1.15rem] h-[1.15rem]" aria-hidden="true" />}
            {!compacta && <span>Recolher menu</span>}
          </button>
        </div>
      )}
    </aside>
  );
}
