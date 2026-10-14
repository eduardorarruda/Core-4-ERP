import React from 'react';
import { motion, useReducedMotionConfig } from 'motion/react';
import { usePadroesGrafico } from '../acessibilidade/padroesGrafico';
import { formatarMoeda, formatarNumero } from '../../lib/formatters';
import { cn } from '../../lib/utils';

/*
 * Barra empilhada "para onde foi a fatura": um segmento por categoria (cores --color-chart-*,
 * com textura no modo "padrões nos gráficos") + legenda com nome, valor e %.
 * Nunca depende só da cor: a legenda traz o rótulo e a lista é lida pelo leitor de tela.
 *
 * Props: itens [{ nome, valor }] (já ordenados, maior primeiro), total, titulo (rótulo acessível), className.
 */
export default function BarraCategorias({ itens = [], total, titulo = 'Gastos por categoria', className }) {
  const reduzir = useReducedMotionConfig();
  const padroes = usePadroesGrafico();
  const soma = total ?? itens.reduce((s, i) => s + i.valor, 0);
  if (!itens.length || soma <= 0) return null;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-text-primary/[0.08] gap-0.5" aria-hidden="true">
        {itens.map((item, i) => (
          <motion.span
            key={item.nome}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ ...padroes.estiloAmostra(i), transformOrigin: 'left', flex: `${item.valor} 1 0%` }}
            initial={reduzir ? false : { scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 120, damping: 22, delay: reduzir ? 0 : 0.06 * i }}
          />
        ))}
      </div>
      <ul aria-label={titulo} className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
        {itens.map((item, i) => (
          <li key={item.nome} className="flex items-center gap-2.5 text-sm min-w-0">
            <span aria-hidden="true" className="w-2.5 h-2.5 rounded-sm shrink-0" style={padroes.estiloAmostra(i)} />
            <span className="truncate text-text-primary/80">{item.nome}</span>
            <span className="ml-auto tabular-nums font-medium text-text-primary valor-privado">{formatarMoeda(item.valor)}</span>
            <span className="w-11 text-right tabular-nums text-xs text-text-primary/60">
              {formatarNumero((item.valor / soma) * 100, 'percent', { casas: 0 })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
