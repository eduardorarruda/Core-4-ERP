import React, { useId } from 'react';
import { motion } from 'motion/react';
import { useMovimentoReduzido } from '../../hooks/useAcessibilidade';

/**
 * Pote com líquido (portado do Fluxo — graficos/Pote.tsx): o nível sobe com mola até `valor`
 * (fração 0–1) e a superfície ondula devagar. Sem animação com "reduzir movimento".
 * Decorativo: o número fica no texto ao lado (aria-hidden aqui).
 * Props: valor (0–1), cor (CSS, padrão --color-invest), tamanho (px de largura, 88).
 */
export default function Pote({ valor = 0, cor = 'var(--color-invest)', tamanho = 88 }) {
  const id = useId().replace(/:/g, '');
  const reduzir = useMovimentoReduzido();
  const nivel = Math.max(0.04, Math.min(1, Number(valor) || 0));
  const largura = 100;
  const altura = 120;
  // Interior do vidro: de y=18 (boca) até y=112 (fundo)
  const topo = 18;
  const fundo = 112;
  const yNivel = fundo - (fundo - topo) * nivel;
  const onda = (fase) => `M0 ${yNivel} q12.5 ${-5 + fase} 25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 V${altura} H0 Z`;

  return (
    <svg viewBox={`0 0 ${largura} ${altura}`} width={tamanho} height={(tamanho * altura) / largura} aria-hidden="true" className="shrink-0 overflow-visible">
      <defs>
        <clipPath id={`vidro-${id}`}>
          <path d="M22 14 h56 a6 6 0 0 1 6 6 v80 a14 14 0 0 1 -14 14 h-40 a14 14 0 0 1 -14 -14 v-80 a6 6 0 0 1 6 -6 Z" />
        </clipPath>
        <linearGradient id={`liquido-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cor} stopOpacity="0.95" />
          <stop offset="100%" stopColor={cor} stopOpacity="0.55" />
        </linearGradient>
      </defs>

      <g clipPath={`url(#vidro-${id})`}>
        <rect x="0" y="0" width={largura} height={altura} fill="var(--color-surface-medium)" />
        <motion.g
          initial={reduzir ? false : { y: fundo - yNivel }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', stiffness: 40, damping: 12 }}
        >
          <motion.path
            d={onda(0)}
            fill={cor}
            fillOpacity="0.35"
            animate={reduzir ? undefined : { x: [-50, 0] }}
            transition={{ duration: 5.5, ease: 'linear', repeat: Infinity }}
          />
          <motion.path
            d={onda(2)}
            fill={`url(#liquido-${id})`}
            animate={reduzir ? undefined : { x: [0, -50] }}
            transition={{ duration: 3.8, ease: 'linear', repeat: Infinity }}
          />
        </motion.g>
      </g>

      {/* Vidro, tampa e brilho */}
      <path d="M22 14 h56 a6 6 0 0 1 6 6 v80 a14 14 0 0 1 -14 14 h-40 a14 14 0 0 1 -14 -14 v-80 a6 6 0 0 1 6 -6 Z"
        fill="none" stroke="var(--color-silver, currentColor)" strokeOpacity="0.45" strokeWidth="2" />
      <rect x="18" y="6" width="64" height="9" rx="4" fill="var(--color-silver, currentColor)" fillOpacity="0.35" />
      <path d="M28 26 v58" stroke="var(--color-text-primary)" strokeOpacity="0.14" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
