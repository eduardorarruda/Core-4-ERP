import React, { useId } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '../../lib/utils';
import { formatarNumero } from '../../lib/formatters';

/*
 * Barra e anel de progresso (portados do Fluxo — ui.tsx#Barra/#Anel).
 * `valor` é uma fração: 0.42 = 42%. Acima de 1 = estourou.
 */

const COR_TOM = {
  primary: 'var(--color-primary)',
  income: 'var(--color-income)',
  expense: 'var(--color-expense)',
  invest: 'var(--color-invest)',
  warning: 'var(--color-warning)',
  info: 'var(--color-info)',
};

const corDe = (tom, cor) => cor ?? COR_TOM[tom] ?? COR_TOM.primary;

/**
 * Barra de progresso com mola. Ao passar de 100% ganha listras animadas (excesso).
 * `marca` (0–1) desenha o marcador de ritmo: "onde deveria estar hoje".
 *
 *   <ProgressBar valor={gasto / limite} tom="primary" marca={diaDoMes / diasNoMes} label="Uso do orçamento" />
 *
 * Props: valor, tom ('primary' | 'income' | 'expense' | 'invest' | 'warning' | 'info') ou cor (CSS),
 *        marca, altura (px, 8), label (rótulo acessível), mostrarValor (texto % à direita), className.
 * Dica: troque o tom para 'expense' quando valor > 1 e 'warning' quando passar do ritmo.
 */
export function ProgressBar({ valor = 0, tom = 'primary', cor, marca, altura = 8, label, mostrarValor = false, className }) {
  const reduzir = useReducedMotion();
  const fracao = Math.max(0, Number(valor) || 0);
  const largura = `${Math.min(100, fracao * 100)}%`;
  const estourou = fracao > 1;
  const c = corDe(tom, cor);

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(fracao * 100)}
        aria-valuetext={formatarNumero(fracao * 100, 'percent', { casas: 0 })}
        className="relative flex-1 rounded-full bg-text-primary/[0.08] overflow-hidden"
        style={{ height: altura }}
      >
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${c} 70%, transparent), ${c})`, boxShadow: `0 0 12px -2px ${c}` }}
          initial={reduzir ? false : { width: 0 }}
          animate={{ width: largura }}
          transition={{ type: 'spring', stiffness: 90, damping: 20, delay: 0.1 }}
        />
        {estourou && (
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 motion-safe:animate-[c4Listras_1s_linear_infinite]"
            style={{ backgroundImage: 'repeating-linear-gradient(-45deg, transparent 0 6px, rgba(255,255,255,.22) 6px 12px)', backgroundSize: '17px 17px' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: reduzir ? 0 : 0.7 }}
          />
        )}
        {marca > 0 && marca < 1 && (
          <span
            aria-hidden="true"
            title="Onde deveria estar hoje"
            className="absolute -top-0.5 -bottom-0.5 w-0.5 rounded-full bg-text-primary/70"
            style={{ left: `${marca * 100}%` }}
          />
        )}
      </div>
      {mostrarValor && (
        <span className={cn('text-xs font-semibold tabular-nums w-10 text-right', estourou ? 'text-expense' : 'text-text-primary/70')}>
          {formatarNumero(fracao * 100, 'percent', { casas: 0 })}
        </span>
      )}
    </div>
  );
}

/**
 * Anel de progresso com degradê e mola. O centro recebe `children` (ex.: "72%").
 *
 *   <ProgressRing valor={0.72} tom="invest" tamanho={72} label="Limite usado">72%</ProgressRing>
 *
 * Props: valor (0–1), tom ou cor, tamanho (px, 64), espessura (px, 7), label, children, className.
 */
export function ProgressRing({ valor = 0, tom = 'primary', cor, tamanho = 64, espessura = 7, label, children, className }) {
  const reduzir = useReducedMotion();
  const id = `anel-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const r = (tamanho - espessura) / 2;
  const circ = 2 * Math.PI * r;
  const fracao = Math.min(1, Math.max(0, Number(valor) || 0));
  const c = corDe(tom, cor);
  const meio = tamanho / 2;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round((Number(valor) || 0) * 100)}
      className={cn('relative inline-grid place-items-center shrink-0', className)}
      style={{ width: tamanho, height: tamanho }}
    >
      <svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`} aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={c} stopOpacity={0.6} />
            <stop offset="1" stopColor={c} />
          </linearGradient>
        </defs>
        <circle cx={meio} cy={meio} r={r} fill="none" stroke="color-mix(in srgb, var(--color-text-primary) 9%, transparent)" strokeWidth={espessura} />
        <motion.circle
          cx={meio}
          cy={meio}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={espessura}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={reduzir ? false : { strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - fracao) }}
          transition={{ type: 'spring', stiffness: 60, damping: 18, delay: 0.15 }}
          transform={`rotate(-90 ${meio} ${meio})`}
        />
      </svg>
      {children != null && (
        <span className="absolute inset-0 grid place-items-center text-xs font-semibold tabular-nums">{children}</span>
      )}
    </div>
  );
}

export default ProgressBar;
