import React from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatarNumero } from '../../lib/formatters';
import { AnimatedNumber, Stagger, StaggerItem } from '../motion/Movimento';
import Tooltip from './Tooltip';

/**
 * Cartão de indicador (KPI): rótulo com ícone → valor grande que conta até o número →
 * rodapé com variação vs. período anterior. Aura radial na cor do tom (portado do Fluxo).
 *
 *   <KpiGrid>
 *     <KpiCard label="Saldo em contas" valor={57256.47} tom="neutro" icon={Wallet} />
 *     <KpiCard label="Entradas do mês" valor={12000} anterior={10500} tom="income" />
 *     <KpiCard label="Saídas do mês" valor={9000} anterior={9800} tom="expense" inverterDelta />
 *     <KpiCard label="Resultado" valor={3000} formato="moeda" colorirSinal />
 *   </KpiGrid>
 *
 * Props:
 * - label (ou title), valor (ou value), icon (componente lucide)
 * - formato: 'moeda' | 'numero' | 'percentual' | 'compacto' | (n) => string   (padrão 'moeda')
 * - tom: 'income' | 'expense' | 'invest' | 'primary' | 'neutro'  — cor do ícone, aura e destaque
 * - anterior: valor do período anterior → mostra o Delta ("▲ 12% vs. mês anterior")
 *   | tendencia: número já calculado em % (ex.: 12.5) — alternativa ao `anterior`
 * - inverterDelta: subir é ruim (despesas)
 * - contexto: texto do rodapé (padrão "vs. mês anterior")
 * - ajuda: texto do ícone (i) com explicação do cálculo
 * - colorirSinal: valor verde se > 0 e vermelho se < 0
 * - destaque: aura mais forte e borda esmeralda (o número principal da tela)
 * - sparkline: nó opcional (mini gráfico) no rodapé à direita
 * - loading: esqueleto no lugar do valor
 * - onClick / href não são suportados — envolva num Link se precisar navegar
 */
const TONS = {
  income: { cor: 'var(--color-income)', icone: 'text-income bg-income/[0.12] border-income/20' },
  expense: { cor: 'var(--color-expense)', icone: 'text-expense bg-expense/[0.12] border-expense/20' },
  invest: { cor: 'var(--color-invest)', icone: 'text-invest bg-invest/[0.12] border-invest/20' },
  primary: { cor: 'var(--color-primary)', icone: 'text-primary bg-primary/[0.12] border-primary/20' },
  neutro: { cor: 'var(--color-silver)', icone: 'text-text-primary/80 bg-text-primary/[0.06] border-border-strong' },
};

const FORMATOS = { moeda: 'currency', numero: 'number', percentual: 'percent', compacto: 'compact' };

function IconeKpi({ icon, classe }) {
  if (!icon) return null;
  if (React.isValidElement(icon)) return <span aria-hidden="true" className={cn('grid place-items-center w-8 h-8 rounded-lg border shrink-0 [&>svg]:w-4 [&>svg]:h-4', classe)}>{icon}</span>;
  const Comp = icon;
  return (
    <span aria-hidden="true" className={cn('grid place-items-center w-8 h-8 rounded-lg border shrink-0', classe)}>
      <Comp className="w-4 h-4" />
    </span>
  );
}

/**
 * Selo de variação. `variacao` em % (12.5) ou calculada de atual/anterior.
 * Sabe se subir é bom ou ruim (`inverter` para despesas). |Δ| < 0,5% → "estável".
 */
export function Delta({ atual, anterior, variacao, inverter = false, className }) {
  let pct = variacao;
  if (pct == null) {
    if (anterior == null || Number(anterior) === 0 || atual == null) return null;
    pct = ((Number(atual) - Number(anterior)) / Math.abs(Number(anterior))) * 100;
  }
  if (!Number.isFinite(pct)) return null;
  const base = 'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums';
  if (Math.abs(pct) < 0.5) {
    return (
      <span className={cn(base, 'bg-text-primary/[0.06] text-text-primary/70', className)}>
        <Minus className="w-3 h-3" aria-hidden="true" /> estável
      </span>
    );
  }
  const subiu = pct > 0;
  const bom = inverter ? !subiu : subiu;
  const Seta = subiu ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn(base, bom ? 'bg-income/[0.12] text-income' : 'bg-expense/[0.12] text-expense', className)}>
      <Seta className="w-3.5 h-3.5" aria-hidden="true" />
      <span className="sr-only">{subiu ? 'subiu' : 'caiu'} </span>
      {formatarNumero(Math.abs(pct), 'percent', { casas: Math.abs(pct) < 10 ? 1 : 0 })}
    </span>
  );
}

export default function KpiCard({
  label,
  title,
  valor,
  value,
  icon,
  formato = 'moeda',
  tom = 'neutro',
  anterior,
  tendencia,
  inverterDelta = false,
  contexto = 'vs. mês anterior',
  ajuda,
  colorirSinal = false,
  destaque = false,
  sparkline,
  loading = false,
  className,
  children,
}) {
  const rotulo = label ?? title;
  const numero = valor ?? value;
  const t = TONS[tom] ?? TONS.neutro;
  const formatoAnim = typeof formato === 'function' ? formato : (FORMATOS[formato] ?? formato);
  const temDelta = tendencia != null || (anterior != null && Number(anterior) !== 0);

  return (
    <article
      className={cn(
        'c4-card relative overflow-hidden p-4 sm:p-5 flex flex-col gap-3 min-h-[8.5rem]',
        destaque && 'c4-card--destaque border-primary/25',
        className
      )}
    >
      {/* Aura na cor do tom, no canto inferior direito */}
      <span
        aria-hidden="true"
        className={cn('pointer-events-none absolute -right-10 -bottom-16 w-60 h-60 rounded-full', destaque ? 'opacity-25' : 'opacity-[0.14]')}
        style={{ background: t.cor, maskImage: 'radial-gradient(closest-side, #000, transparent)', WebkitMaskImage: 'radial-gradient(closest-side, #000, transparent)' }}
      />
      <header className="relative flex items-center gap-2.5 min-w-0">
        <IconeKpi icon={icon} classe={t.icone} />
        <h3 className="text-sm font-medium text-text-primary/70 font-body tracking-normal truncate">{rotulo}</h3>
        {ajuda && (
          <Tooltip conteudo={ajuda}>
            <button type="button" aria-label={`Como é calculado: ${rotulo}`} className="ml-auto -mr-1 w-7 h-7 grid place-items-center rounded-full text-text-primary/45 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <span aria-hidden="true" className="w-4 h-4 grid place-items-center rounded-full border border-current text-[0.625rem] font-bold">i</span>
            </button>
          </Tooltip>
        )}
      </header>

      <div className="relative">
        {loading ? (
          <span aria-hidden="true" className="block h-8 w-36 rounded-lg shimmer-bg" />
        ) : (
          <AnimatedNumber
            value={numero}
            format={formatoAnim}
            colorir={colorirSinal}
            className={cn('c4-kpi block text-text-primary', destaque && 'sm:text-[2.125rem]')}
          />
        )}
        {loading && <span className="sr-only">Carregando…</span>}
      </div>

      {(temDelta || sparkline || children) && (
        <footer className="relative mt-auto flex items-end justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 text-xs text-text-primary/60">
            {temDelta && (
              <>
                <Delta atual={numero} anterior={anterior} variacao={tendencia} inverter={inverterDelta} />
                <span className="truncate">{contexto}</span>
              </>
            )}
            {children}
          </div>
          {sparkline && <div className="shrink-0 w-24 h-8">{sparkline}</div>}
        </footer>
      )}
    </article>
  );
}

/**
 * Grade de KPIs responsiva com entrada escalonada: 1 coluna (≤ 380px), 2 no celular, `cols` no desktop.
 * Props: cols (2 | 3 | 4, padrão 4), className.
 */
export function KpiGrid({ children, cols = 4, className }) {
  const colunas = { 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4' }[cols] ?? 'lg:grid-cols-4';
  return (
    <Stagger className={cn('grid grid-cols-1 min-[380px]:grid-cols-2 gap-3 sm:gap-4', colunas, className)}>
      {React.Children.map(children, (filho) => (filho ? <StaggerItem className="min-w-0 [&>article]:h-full">{filho}</StaggerItem> : null))}
    </Stagger>
  );
}

export { KpiCard as StatCard };
