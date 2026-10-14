/**
 * Helpers de tema para os gráficos Recharts do dashboard.
 *
 * Em vez de fixar cores hex por tema em cada componente, lemos os tokens de
 * cor definidos em `index.css` (`--color-*`). Assim os gráficos acompanham
 * automaticamente o tema claro/escuro e qualquer ajuste de paleta feito nos
 * tokens, sem duplicação de literais hex.
 */

/** Lê uma CSS custom property do :root, com fallback seguro. */
export function readCssVar(name, fallback = '') {
  if (typeof window === 'undefined' || typeof document === 'undefined') return fallback;
  const valor = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return valor || fallback;
}

/**
 * Retorna as cores de grade, eixos e tooltip derivadas dos tokens do tema.
 * @param {boolean} isDark - se o tema atual é escuro (usado apenas para fallback).
 */
export function chartTheme(isDark) {
  const gridColor = readCssVar('--color-surface-high', isDark ? '#2A2A2A' : '#D4D4D8');
  const axisColor = readCssVar('--color-surface-highest', isDark ? '#52525b' : '#71717a');
  const tooltipBg = readCssVar('--color-surface-medium', isDark ? '#1C1B1B' : '#FFFFFF');
  const tooltipTextColor = readCssVar('--color-text-primary', isDark ? '#FAFAFA' : '#18181B');

  return {
    gridColor,
    axisColor,
    tooltipBg,
    tooltipTextColor,
    tooltipStyle: {
      backgroundColor: tooltipBg,
      border: 'none',
      borderRadius: '8px',
      fontSize: '12px',
      color: tooltipTextColor,
    },
  };
}
