import React from 'react';
import { cn } from '../../lib/utils';
import { formatarNumero } from '../../lib/formatters';

/**
 * Balão de tooltip dos gráficos (Recharts): vidro escuro/claro, bolinha da cor da série,
 * valores tabulares formatados em pt-BR.
 *
 *   <Tooltip {...tooltipProps} content={<ChartTooltip formato="currency" />} />
 *
 * Props:
 * - formato: 'currency' | 'percent' | 'number' | (valor, item) => string
 * - rotuloFormatter: (label) => string — formata o título (ex.: mês)
 * - nomes: { [dataKey]: 'Nome exibido' } — renomeia séries
 * (active, payload, label são injetados pelo Recharts)
 */
export default function ChartTooltip({ active, payload, label, formato = 'currency', rotuloFormatter, nomes }) {
  if (!active || !payload?.length) return null;
  const formatar = typeof formato === 'function' ? formato : (v) => formatarNumero(v, formato);
  const titulo = rotuloFormatter ? rotuloFormatter(label) : label;

  return (
    <div className="min-w-40 rounded-xl border border-border-strong bg-surface-low/90 backdrop-blur-xl shadow-elevated px-3 py-2.5 text-xs text-text-primary">
      {titulo != null && titulo !== '' && (
        <p className="mb-1.5 font-semibold text-text-primary/80">{titulo}</p>
      )}
      <ul className="space-y-1">
        {payload.map((item, i) => {
          const cor = item.color || item.payload?.fill || item.fill;
          const nome = nomes?.[item.dataKey] ?? item.name ?? item.dataKey;
          return (
            <li key={`${item.dataKey ?? nome}-${i}`} className="flex items-center gap-2">
              <span aria-hidden="true" className="w-2 h-2 rounded-full shrink-0" style={{ background: cor }} />
              <span className="text-text-primary/70 flex-1 truncate">{nome}</span>
              <span className={cn('font-semibold tabular-nums valor-privado')}>{formatar(item.value, item)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Degradê vertical para preencher áreas (cor da série → transparente).
 * Use dentro de <defs> do gráfico:
 *   <defs><GradienteArea id={idGrad} cor={CORES_GRAFICO.entrada} /></defs>
 *   <Area fill={`url(#${idGrad})`} ... />
 */
export function GradienteArea({ id, cor, opacidade = 0.28 }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={cor} stopOpacity={opacidade} />
      <stop offset="100%" stopColor={cor} stopOpacity={0} />
    </linearGradient>
  );
}

/**
 * Filtro de brilho para a linha principal (feGaussianBlur + feMerge). Use dentro de <defs>:
 *   <defs><BrilhoLinha id={idBrilho} /></defs>
 *   <Area ... filter={`url(#${idBrilho})`} animationDuration={1300} />
 */
export function BrilhoLinha({ id, intensidade = 5 }) {
  return (
    <filter id={id} x="-10%" y="-30%" width="120%" height="160%">
      <feGaussianBlur stdDeviation={intensidade} result="brilho" />
      <feMerge>
        <feMergeNode in="brilho" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  );
}

/**
 * Ponto final que "pulsa" depois que a linha termina de se desenhar. Passe como `dot` da série:
 *   <Area dataKey="saldo" dot={<PontoFinal total={dados.length} cor={CORES_GRAFICO.primaria} />} />
 * O Recharts injeta cx, cy e index; só o último ponto aparece. Some com "reduzir movimento"
 * (a animação é CSS e o index.css a desliga).
 */
export function PontoFinal({ cx, cy, index, total, cor = 'var(--color-primary)', atraso = 1.3 }) {
  if (cx == null || cy == null || index !== total - 1) return null;
  return (
    <g aria-hidden="true">
      <circle cx={cx} cy={cy} r={9} fill={cor} opacity={0} className="c4-pulso" style={{ animationDelay: `${atraso}s`, transformOrigin: `${cx}px ${cy}px` }} />
      <circle cx={cx} cy={cy} r={4} fill={cor} stroke="var(--color-surface-low)" strokeWidth={2} />
    </g>
  );
}
