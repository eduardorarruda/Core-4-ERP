import React from 'react';
import { cn } from '../../lib/utils';
import BrandMark from './BrandMark';

/**
 * Logotipo completo do Core 4: símbolo + wordmark "Core4" (o 4 em esmeralda) e, se pedido,
 * a tagline "GESTÃO FINANCEIRA INTELIGENTE". Segue o tema automaticamente (tokens --brand-*).
 *
 * Props:
 * - size: 'sm' (sidebar/topo) | 'md' (cabeçalhos) | 'lg' (login/hero)   (padrão 'md')
 * - tagline: mostra a tagline abaixo do wordmark
 * - variant: 'auto' (segue o tema) | 'dark' (força cores do tema escuro, ex.: sobre foto/petróleo)
 * - somenteSimbolo: só o símbolo (ex.: sidebar recolhida) — o nome fica para leitores de tela
 * - as: elemento raiz ('div' padrão; use 'span' dentro de links)
 *
 * O nome em texto é "Core 4" (com espaço) para leitores de tela; o desenho é "Core4".
 */
const TAMANHOS = {
  sm: { simbolo: 30, texto: 'text-[1.2rem]', tagline: 'text-[0.5rem] tracking-[0.3em]', gap: 'gap-2.5' },
  md: { simbolo: 40, texto: 'text-2xl', tagline: 'text-[0.575rem] tracking-[0.32em]', gap: 'gap-3' },
  lg: { simbolo: 64, texto: 'text-[2.6rem]', tagline: 'text-[0.72rem] tracking-[0.35em]', gap: 'gap-4' },
};

export default function BrandLogo({
  size = 'md',
  tagline = false,
  variant = 'auto',
  somenteSimbolo = false,
  as: Comp = 'div',
  className,
}) {
  const t = TAMANHOS[size] ?? TAMANHOS.md;
  const forcarEscuro = variant === 'dark';

  return (
    <Comp
      className={cn('inline-flex items-center select-none', t.gap, forcarEscuro && 'c4-marca-escura', className)}
      role="img"
      aria-label={tagline ? 'Core 4 — Gestão financeira inteligente' : 'Core 4'}
    >
      <BrandMark size={t.simbolo} />
      {!somenteSimbolo && (
        <span className="flex flex-col min-w-0" aria-hidden="true">
          <span className={cn('font-display font-bold leading-none tracking-[-0.035em] whitespace-nowrap', t.texto)}>
            <span className="c4-text-silver">Core</span>
            <span className="c4-text-emerald">4</span>
          </span>
          {tagline && (
            <span className={cn('c4-tagline mt-1.5 leading-none whitespace-nowrap', t.tagline)}>
              Gestão financeira inteligente
            </span>
          )}
        </span>
      )}
    </Comp>
  );
}
