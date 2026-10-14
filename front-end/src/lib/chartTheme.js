import { formatarNumero } from './formatters';
import { movimentoReduzidoAgora } from '../components/acessibilidade/preferencias';

// Padrões/texturas por série (modo daltonismo) — veja components/acessibilidade/padroesGrafico.js
export { usePadroesGrafico, estiloAmostraPadrao, TIPOS_PADRAO } from '../components/acessibilidade/padroesGrafico';

/**
 * Tema único dos gráficos Recharts do Core 4.
 *
 * As cores são `var(--color-chart-*)` direto nos atributos SVG: o gráfico acompanha o
 * tema claro/escuro sem re-render e sem literais hex espalhados pelas telas.
 *
 * Uso típico:
 *   <CartesianGrid {...gradeProps} />
 *   <XAxis dataKey="mes" {...eixoXProps} />
 *   <YAxis {...eixoYProps} tickFormatter={formatarEixoMoeda} />
 *   <Tooltip {...tooltipProps} content={<ChartTooltip formato="currency" />} />
 *   <Area stroke={CORES_GRAFICO.entrada} fill={`url(#${idGradiente})`} {...areaProps} />
 */

/** Paleta categórica (ordem de uso para séries sem significado fixo). */
export const PALETA_GRAFICO = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
  'var(--color-chart-6)',
];

/** Cores de significado fixo — as mesmas dos números e selos. */
export const CORES_GRAFICO = {
  entrada: 'var(--color-income)',
  saida: 'var(--color-expense)',
  investido: 'var(--color-invest)',
  primaria: 'var(--color-primary)',
  neutra: 'var(--color-chart-6)',
  grade: 'var(--color-chart-grid)',
  eixo: 'var(--color-chart-axis)',
  cursor: 'var(--color-chart-cursor)',
};

/** Cor da série `i` (cicla a paleta). */
export const corSerie = (i) => PALETA_GRAFICO[((i % PALETA_GRAFICO.length) + PALETA_GRAFICO.length) % PALETA_GRAFICO.length];

const TICK = { fill: 'var(--color-chart-axis)', fontSize: 12, fontFamily: 'var(--font-body)' };

export const gradeProps = {
  stroke: 'var(--color-chart-grid)',
  strokeDasharray: '3 4',
  vertical: false,
};

export const eixoXProps = {
  tick: TICK,
  tickLine: false,
  axisLine: false,
  tickMargin: 10,
  minTickGap: 12,
};

export const eixoYProps = {
  tick: TICK,
  tickLine: false,
  axisLine: false,
  tickMargin: 8,
  width: 72,
};

/** Props do <Tooltip>: cursor suave e sem animação de deslize (fica mais firme). */
export const tooltipProps = {
  cursor: { fill: 'var(--color-chart-cursor)', stroke: 'var(--color-chart-axis)', strokeOpacity: 0.25 },
  isAnimationActive: false,
  wrapperStyle: { outline: 'none', zIndex: 20 },
};

/** Linhas/áreas: traço de 2px, pontas redondas, ponto ativo com anel. */
export const areaProps = {
  type: 'monotone',
  strokeWidth: 2,
  strokeLinecap: 'round',
  dot: false,
  activeDot: { r: 4, strokeWidth: 2, stroke: 'var(--color-surface-low)' },
  animationDuration: 700,
  animationEasing: 'ease-out',
  // Getter: lido a cada `{...areaProps}` — com "reduzir movimento" (sistema ou painel) não anima
  get isAnimationActive() { return !movimentoReduzidoAgora(); },
};

/** Barras: cantos de 6px no topo e largura máxima confortável. */
export const barraProps = {
  radius: [6, 6, 0, 0],
  maxBarSize: 36,
  animationDuration: 600,
  animationEasing: 'ease-out',
  get isAnimationActive() { return !movimentoReduzidoAgora(); },
};

/** Rosca/pizza: fatias com respiro entre si. */
export const pizzaProps = {
  innerRadius: '62%',
  outerRadius: '92%',
  paddingAngle: 2,
  cornerRadius: 4,
  stroke: 'none',
  animationDuration: 700,
  get isAnimationActive() { return !movimentoReduzidoAgora(); },
};

/** Rótulos de eixo em moeda compacta: R$ 1,2 mil. */
export const formatarEixoMoeda = (v) => formatarNumero(v, 'compact');

/** Valor completo para tooltips: R$ 1.234,56. */
export const formatarValorGrafico = (v, formato = 'currency') => formatarNumero(v, formato);

/** Lê uma CSS custom property do :root (para bibliotecas que exigem cor literal, ex.: PDF). */
export function readCssVar(name, fallback = '') {
  if (typeof window === 'undefined' || typeof document === 'undefined') return fallback;
  const valor = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return valor || fallback;
}

/**
 * Compatibilidade com o antigo `components/dashboard/chartTheme`: devolve cores resolvidas
 * e o estilo de tooltip padrão. Prefira os props acima em código novo.
 */
export function chartTheme() {
  return {
    gridColor: 'var(--color-chart-grid)',
    axisColor: 'var(--color-chart-axis)',
    tooltipBg: 'var(--color-surface-low)',
    tooltipTextColor: 'var(--color-text-primary)',
    tooltipStyle: {
      backgroundColor: 'color-mix(in srgb, var(--color-surface-low) 92%, transparent)',
      border: '1px solid var(--color-border-strong)',
      borderRadius: '12px',
      boxShadow: 'var(--shadow-elevated)',
      fontSize: '12px',
      color: 'var(--color-text-primary)',
      backdropFilter: 'blur(12px)',
    },
  };
}
