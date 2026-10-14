import React, { useId, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { IndicatorGroup, LayoutIndicator } from '../motion/Movimento';

/**
 * Abas e controle segmentado com indicador deslizante (layoutId). Teclado: ←/→, Home, End.
 *
 * <Tabs> — abas de conteúdo (role=tablist). Controlado:
 *   <Tabs value={aba} onChange={setAba} label="Seções" items={[
 *     { value: 'ativos', label: 'Ativos', icon: Users, badge: 3 },
 *     { value: 'pendentes', label: 'Pendentes' },
 *   ]} />
 *   Painel: <div role="tabpanel" id={Tabs.painelId(idBase, 'ativos')} aria-labelledby={Tabs.abaId(idBase, 'ativos')}>
 *   Passe `idBase` para ligar abas e painéis; sem ele os ids são gerados.
 *
 * <Tabs.Links> — abas que são rotas (módulos com várias telas: Cartões, Conciliação):
 *   <Tabs.Links label="Cartões" items={[{ to: '/cartoes/dashboard', label: 'Visão geral' }, …]} />
 *   Cada item pode ter `permissao` já filtrada pelo chamador (não renderize o que o usuário não abre).
 *
 * <SegmentedControl> — escolha curta e exclusiva (Mês/Ano, Entradas/Saídas). role=radiogroup.
 *   <SegmentedControl value={v} onChange={setV} label="Visão" items={[{ value: 'mes', label: 'Mês' }, …]} size="sm" />
 */

const tabId = (base, value) => `${base}-tab-${value}`;
const tabPanelId = (base, value) => `${base}-painel-${value}`;

function moverFoco(e, valores, atual, onChange) {
  const i = valores.indexOf(atual);
  let proximo = null;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') proximo = valores[(i + 1) % valores.length];
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') proximo = valores[(i - 1 + valores.length) % valores.length];
  else if (e.key === 'Home') proximo = valores[0];
  else if (e.key === 'End') proximo = valores[valores.length - 1];
  if (proximo == null) return;
  e.preventDefault();
  onChange(proximo);
  const lista = e.currentTarget;
  requestAnimationFrame(() => lista.querySelector(`[data-valor="${CSS.escape(String(proximo))}"]`)?.focus());
}

function Icone({ icon }) {
  if (!icon) return null;
  if (React.isValidElement(icon)) return icon;
  const Comp = icon;
  return <Comp className="w-4 h-4 shrink-0" aria-hidden="true" />;
}

function Contador({ valor, ativo }) {
  if (valor == null || valor === '') return null;
  return (
    <span className={cn(
      'min-w-5 h-5 px-1.5 grid place-items-center rounded-full text-[0.6875rem] font-semibold tabular-nums',
      ativo ? 'bg-primary/15 text-primary' : 'bg-text-primary/[0.08] text-text-primary/70'
    )}>
      {valor}
    </span>
  );
}

export default function Tabs({ items, value, onChange, label, idBase, className, fullWidth = false }) {
  const gerado = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const base = idBase ?? `c4t${gerado}`;
  const valores = items.map((i) => i.value);

  return (
    <IndicatorGroup>
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={(e) => moverFoco(e, valores, value, onChange)}
        className={cn(
          'relative flex items-center gap-1 border-b border-border overflow-x-auto no-scrollbar',
          className
        )}
      >
        {items.map((item) => {
          const ativo = item.value === value;
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              id={tabId(base, item.value)}
              aria-selected={ativo}
              aria-controls={tabPanelId(base, item.value)}
              tabIndex={ativo ? 0 : -1}
              data-valor={item.value}
              disabled={item.disabled}
              onClick={() => onChange(item.value)}
              className={cn(
                'relative isolate inline-flex items-center gap-2 min-h-11 px-3.5 text-sm font-medium whitespace-nowrap rounded-t-lg transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                fullWidth && 'flex-1 justify-center',
                ativo ? 'text-text-primary' : 'text-text-primary/60 hover:text-text-primary'
              )}
            >
              <Icone icon={item.icon} />
              {item.label}
              <Contador valor={item.badge} ativo={ativo} />
              {ativo && (
                <LayoutIndicator
                  layoutId="aba"
                  className="inset-auto left-2 right-2 -bottom-px h-0.5 rounded-full bg-primary shadow-[0_0_12px_var(--color-primary)] z-0"
                />
              )}
            </button>
          );
        })}
      </div>
    </IndicatorGroup>
  );
}

/** Abas que navegam entre rotas (indicador animado segue a rota ativa). */
function TabsLinks({ items, label, className }) {
  const { pathname } = useLocation();
  // Ativo = prefixo mais longo que casa com a rota (ex.: /cartoes/dashboard antes de /cartoes)
  const ativo = items
    .filter((i) => pathname === i.to || pathname.startsWith(`${i.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0]?.to;

  return (
    <IndicatorGroup>
      <nav aria-label={label} className={cn('relative flex items-center gap-1 border-b border-border overflow-x-auto no-scrollbar', className)}>
        {items.map((item) => {
          const eAtivo = item.to === ativo;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              aria-current={eAtivo ? 'page' : undefined}
              className={cn(
                'relative isolate inline-flex items-center gap-2 min-h-11 px-3.5 text-sm font-medium whitespace-nowrap rounded-t-lg transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
                eAtivo ? 'text-text-primary' : 'text-text-primary/60 hover:text-text-primary'
              )}
            >
              <Icone icon={item.icon} />
              {item.label}
              <Contador valor={item.badge} ativo={eAtivo} />
              {eAtivo && (
                <LayoutIndicator
                  layoutId="aba-rota"
                  className="inset-auto left-2 right-2 -bottom-px h-0.5 rounded-full bg-primary shadow-[0_0_12px_var(--color-primary)] z-0"
                />
              )}
            </NavLink>
          );
        })}
      </nav>
    </IndicatorGroup>
  );
}
Tabs.Links = TabsLinks;
Tabs.abaId = tabId;
Tabs.painelId = tabPanelId;

const TAMANHOS_SEG = {
  sm: 'min-h-9 px-3 text-xs',
  md: 'min-h-11 px-4 text-sm',
};

/** Controle segmentado (radiogroup) com "pílula" deslizante. */
export function SegmentedControl({ items, value, onChange, label, size = 'md', className, fullWidth = false }) {
  const valores = items.map((i) => i.value);
  const refLista = useRef(null);
  return (
    <IndicatorGroup>
      <div
        ref={refLista}
        role="radiogroup"
        aria-label={label}
        onKeyDown={(e) => moverFoco(e, valores, value, onChange)}
        className={cn(
          'relative inline-flex items-center gap-0.5 p-1 rounded-xl bg-surface-medium/70 border border-border',
          fullWidth && 'flex w-full',
          className
        )}
      >
        {items.map((item) => {
          const ativo = item.value === value;
          return (
            <button
              key={item.value}
              type="button"
              role="radio"
              aria-checked={ativo}
              tabIndex={ativo ? 0 : -1}
              data-valor={item.value}
              disabled={item.disabled}
              onClick={() => onChange(item.value)}
              className={cn(
                'relative isolate inline-flex items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                TAMANHOS_SEG[size] ?? TAMANHOS_SEG.md,
                fullWidth && 'flex-1',
                ativo ? 'text-text-primary' : 'text-text-primary/60 hover:text-text-primary'
              )}
            >
              {ativo && (
                <LayoutIndicator
                  layoutId="segmento"
                  className="rounded-lg bg-surface-low border border-border-strong shadow-[0_2px_10px_-4px_rgba(0,0,0,0.5)]"
                />
              )}
              <Icone icon={item.icon} />
              {item.label}
            </button>
          );
        })}
      </div>
    </IndicatorGroup>
  );
}
