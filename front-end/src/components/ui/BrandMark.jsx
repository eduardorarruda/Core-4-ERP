import React, { useId } from 'react';
import { cn } from '../../lib/utils';

/*
 * Símbolo do Core 4: um "C" grosso em degradê esmeralda abraçando um "4" geométrico
 * prateado (traço diagonal + travessa) com a haste vertical em esmeralda e cortes em bisel.
 * Desenho vetorial único — favicon, ícones do PWA e og-image saem deste mesmo traçado
 * (public/brand/core4-mark.svg).
 *
 * As cores vêm de tokens (--brand-*) definidos no index.css, então o símbolo se adapta ao
 * tema claro (prata vira grafite, esmeralda escurece para manter contraste de 3:1).
 */

// Traçado no espaço 20..725 × 18..660 (centralizado num quadrado de 705)
const VIEWBOX = '20 -13.5 705 705';
const PATH_C = 'M575 30H340A310 310 0 0 0 340 650H470V540H340A200 200 0 0 1 340 140H465Z';
const PATH_HASTE = 'M562 283L640 205V560L562 638Z';
const PATH_4 = 'M668 28V128L416 380H715V452H288Q252 452 270 424L668 28Z';
const PATH_FACETA = 'M668 28L270 424Q262 436 270 444L668 78Z';
const PATH_SOMBRA_TRAVESSA = 'M416 380H715V452H288Q252 452 270 424Z';

const stop = (offset, cor, opacidade) => (
  <stop offset={offset} style={{ stopColor: cor, stopOpacity: opacidade }} />
);

/**
 * Props:
 * - size: lado em px (quadrado). Padrão 32.
 * - variant: 'color' (padrão, segue o tema) | 'mono' (usa currentColor — ex.: sobre fundo esmeralda)
 * - title: texto acessível; sem título o SVG é decorativo (aria-hidden)
 */
export default function BrandMark({ size = 32, variant = 'color', title, className }) {
  const base = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const id = (nome) => `c4m-${base}-${nome}`;
  const mono = variant === 'mono';
  const acessivel = title
    ? { role: 'img', 'aria-label': title }
    : { 'aria-hidden': true, focusable: 'false' };

  if (mono) {
    return (
      <svg viewBox={VIEWBOX} width={size} height={size} className={cn('shrink-0', className)} {...acessivel}>
        <path fill="currentColor" d={PATH_C} />
        <path fill="currentColor" d={PATH_HASTE} opacity="0.85" />
        <path fill="currentColor" d={PATH_4} opacity="0.7" />
      </svg>
    );
  }

  return (
    <svg viewBox={VIEWBOX} width={size} height={size} className={cn('shrink-0', className)} {...acessivel}>
      <defs>
        <linearGradient id={id('c')} gradientUnits="userSpaceOnUse" x1="120" y1="40" x2="470" y2="660">
          {stop(0, 'var(--brand-emerald-1)')}
          {stop(0.42, 'var(--brand-emerald-2)')}
          {stop(0.68, 'var(--brand-emerald-3)')}
          {stop(0.84, 'var(--brand-silver-3)')}
          {stop(1, 'var(--brand-silver-1)')}
        </linearGradient>
        <linearGradient id={id('s')} gradientUnits="userSpaceOnUse" x1="680" y1="30" x2="280" y2="460">
          {stop(0, 'var(--brand-silver-1)')}
          {stop(0.5, 'var(--brand-silver-2)')}
          {stop(1, 'var(--brand-silver-3)')}
        </linearGradient>
        <linearGradient id={id('e')} gradientUnits="userSpaceOnUse" x1="600" y1="205" x2="600" y2="640">
          {stop(0, 'var(--brand-emerald-1)')}
          {stop(0.55, 'var(--brand-emerald-2)')}
          {stop(1, 'var(--brand-emerald-3)')}
        </linearGradient>
        <linearGradient id={id('b')} gradientUnits="userSpaceOnUse" x1="300" y1="380" x2="715" y2="452">
          {stop(0, '#000', 0)}
          {stop(1, '#000', 0.18)}
        </linearGradient>
      </defs>
      <path fill={`url(#${id('c')})`} d={PATH_C} />
      <path fill={`url(#${id('e')})`} d={PATH_HASTE} />
      <path fill={`url(#${id('s')})`} d={PATH_4} />
      {/* Bisel: face clara no traço diagonal e leve sombra na travessa */}
      <path fill="#fff" opacity="0.22" d={PATH_FACETA} />
      <path fill={`url(#${id('b')})`} d={PATH_SOMBRA_TRAVESSA} />
    </svg>
  );
}

export { BrandMark };
