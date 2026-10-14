import { createElement as h, useId, useMemo } from 'react';
import { useAcessibilidade } from '../../hooks/useAcessibilidade';

/*
 * Padrões (texturas) para séries de gráfico — WCAG 1.4.1 "uso de cor": com o modo daltonismo
 * ou "padrões nos gráficos" ligado, cada série ganha uma textura própria além da cor.
 *
 *   const padroes = usePadroesGrafico();            // paleta padrão (--color-chart-1..6)
 *   <BarChart>
 *     <defs>{padroes.defs}</defs>
 *     <Bar dataKey="a" fill={padroes.preencher(0)} />
 *     <Bar dataKey="b" fill={padroes.preencher(1)} />
 *   </BarChart>
 *   // séries com cor de significado: usePadroesGrafico([CORES_GRAFICO.entrada, CORES_GRAFICO.saida])
 *   // legenda HTML: <span style={padroes.estiloAmostra(0)} />
 *
 * Desligado, `preencher(i)` devolve a própria cor e `defs` é null — nada muda na tela.
 */

const PALETA = [
  'var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)',
  'var(--color-chart-4)', 'var(--color-chart-5)', 'var(--color-chart-6)',
];

/** Ordem das texturas: série 0 = listras diagonais, 1 = pontos, 2 = horizontais, … */
export const TIPOS_PADRAO = ['diagonal', 'pontos', 'horizontal', 'xadrez', 'vertical', 'diagonal-inversa'];

const TAM = 8;
const TINTA = 'var(--color-surface)';

function marcas(tipo) {
  const linha = (d) => h('path', { d, style: { stroke: TINTA, strokeWidth: 2, strokeOpacity: 0.75 }, fill: 'none' });
  switch (tipo) {
    case 'pontos':
      return h('circle', { cx: TAM / 2, cy: TAM / 2, r: 1.6, style: { fill: TINTA, fillOpacity: 0.8 } });
    case 'horizontal':
      return linha(`M0 ${TAM / 2} H${TAM}`);
    case 'vertical':
      return linha(`M${TAM / 2} 0 V${TAM}`);
    case 'xadrez':
      return linha(`M0 ${TAM / 2} H${TAM} M${TAM / 2} 0 V${TAM}`);
    case 'diagonal-inversa':
      return linha(`M0 0 L${TAM} ${TAM} M-2 ${TAM - 2} L2 ${TAM + 2} M${TAM - 2} -2 L${TAM + 2} 2`);
    case 'diagonal':
    default:
      return linha(`M0 ${TAM} L${TAM} 0 M-2 2 L2 -2 M${TAM - 2} ${TAM + 2} L${TAM + 2} ${TAM - 2}`);
  }
}

/** Um <pattern> SVG (para usar dentro de <defs>). */
export function PadraoSvg({ id, cor, tipo = 'diagonal' }) {
  return h(
    'pattern',
    { id, width: TAM, height: TAM, patternUnits: 'userSpaceOnUse' },
    h('rect', { width: TAM, height: TAM, style: { fill: cor } }),
    marcas(tipo),
  );
}

/** Fundo CSS equivalente (amostras de legenda em HTML). */
export function estiloAmostraPadrao(cor, tipo = 'diagonal') {
  const t = 'color-mix(in srgb, var(--color-surface) 75%, transparent)';
  const fundos = {
    diagonal: `repeating-linear-gradient(-45deg, ${t} 0 2px, transparent 2px 6px)`,
    'diagonal-inversa': `repeating-linear-gradient(45deg, ${t} 0 2px, transparent 2px 6px)`,
    horizontal: `repeating-linear-gradient(0deg, ${t} 0 2px, transparent 2px 6px)`,
    vertical: `repeating-linear-gradient(90deg, ${t} 0 2px, transparent 2px 6px)`,
    xadrez: `repeating-linear-gradient(0deg, ${t} 0 2px, transparent 2px 6px), repeating-linear-gradient(90deg, ${t} 0 2px, transparent 2px 6px)`,
    pontos: `radial-gradient(${t} 1.4px, transparent 1.6px) 0 0 / 6px 6px`,
  };
  return { background: `${fundos[tipo] ?? fundos.diagonal}, ${cor}` };
}

/**
 * Hook dos padrões. `cores`: lista de cores das séries (padrão: --color-chart-1..6).
 * Retorna { ativo, defs, preencher(i, cor?), estiloAmostra(i, cor?), tipo(i) }.
 */
export function usePadroesGrafico(cores = PALETA) {
  const { padroesAtivos } = useAcessibilidade();
  const base = `c4p${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const chaveCores = cores.join('|');

  return useMemo(() => {
    const lista = chaveCores.split('|');
    const tipo = (i) => TIPOS_PADRAO[i % TIPOS_PADRAO.length];
    const cor = (i) => lista[i % lista.length];
    const id = (i) => `${base}-${i}`;
    return {
      ativo: padroesAtivos,
      tipo,
      defs: padroesAtivos ? lista.map((c, i) => h(PadraoSvg, { key: id(i), id: id(i), cor: c, tipo: tipo(i) })) : null,
      /** Valor para `fill`/`stroke`: a textura (modo ligado) ou a cor pura. */
      preencher: (i, corPropria) => {
        if (!padroesAtivos) return corPropria ?? cor(i);
        return corPropria && corPropria !== cor(i) ? corPropria : `url(#${id(i)})`;
      },
      estiloAmostra: (i, corPropria) => (padroesAtivos
        ? estiloAmostraPadrao(corPropria ?? cor(i), tipo(i))
        : { background: corPropria ?? cor(i) }),
    };
  }, [padroesAtivos, base, chaveCores]);
}
