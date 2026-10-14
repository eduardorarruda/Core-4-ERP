/**
 * Presets de movimento do Core 4 (motion.dev — `motion/react`).
 *
 * Regras da casa:
 * - UI comum dura no máximo 300ms; nada bloqueia clique nem atrasa dado.
 * - Com "reduzir movimento" ligado, os componentes de `Movimento.jsx` não animam
 *   (usam `useReducedMotion`); o `MotionConfig reducedMotion="user"` do main.jsx
 *   cobre qualquer `motion.*` solto.
 */

/** Curva de saída suave (a mesma de --ease-out-expo no CSS). */
export const EASE_OUT = [0.22, 1, 0.36, 1];

export const DURACAO = {
  rapida: 0.16,
  base: 0.22,
  lenta: 0.3,
};

/** Molas: `suave` para entradas, `firme` para indicadores/abas, `modal` para painéis. */
export const MOLA = {
  suave: { type: 'spring', stiffness: 320, damping: 32, mass: 0.9 },
  firme: { type: 'spring', stiffness: 520, damping: 40, mass: 0.7 },
  modal: { type: 'spring', stiffness: 420, damping: 34, mass: 0.8 },
  drawer: { type: 'spring', stiffness: 380, damping: 38, mass: 0.9 },
};

/** Intervalo entre filhos de uma lista/grade (40ms). */
export const STAGGER = 0.04;

export const TRANSICAO_BASE = { duration: DURACAO.base, ease: EASE_OUT };

/** Entrada de página: fade + 8px de subida em 220ms. */
export const variantesPagina = {
  inicial: { opacity: 0, y: 8 },
  visivel: { opacity: 1, y: 0, transition: TRANSICAO_BASE },
};

/** Item que sobe e aparece (cards, linhas). */
export const variantesSubir = {
  inicial: { opacity: 0, y: 10 },
  visivel: { opacity: 1, y: 0, transition: TRANSICAO_BASE },
};

/** Contêiner que escalona os filhos. */
export const variantesStagger = (atraso = 0) => ({
  inicial: {},
  visivel: { transition: { staggerChildren: STAGGER, delayChildren: atraso } },
});

/** Hover/press para elementos clicáveis (botões, cards interativos). */
export const pressionar = { scale: 0.98 };
export const elevar = { y: -2 };

/** Modal: fundo esmaece, painel cresce de 0.96 → 1. */
export const variantesOverlay = {
  inicial: { opacity: 0 },
  visivel: { opacity: 1, transition: { duration: 0.2 } },
  saida: { opacity: 0, transition: { duration: DURACAO.rapida } },
};

export const variantesPainel = {
  inicial: { opacity: 0, scale: 0.96, y: 10 },
  visivel: { opacity: 1, scale: 1, y: 0, transition: MOLA.modal },
  saida: { opacity: 0, scale: 0.97, y: 6, transition: { duration: 0.14 } },
};

/** Drawer lateral (direita por padrão) e bottom sheet. */
export const variantesDrawer = (lado = 'right') => {
  const fora = lado === 'left' ? '-100%' : lado === 'bottom' ? '100%' : '100%';
  const eixo = lado === 'bottom' ? 'y' : 'x';
  return {
    inicial: { [eixo]: fora },
    visivel: { [eixo]: 0, transition: MOLA.drawer },
    saida: { [eixo]: fora, transition: { duration: 0.2, ease: EASE_OUT } },
  };
};

/** Toast: entra pela direita com mola. */
export const variantesToast = {
  inicial: { opacity: 0, x: 48, scale: 0.96 },
  visivel: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring', stiffness: 460, damping: 36, mass: 0.7 } },
  saida: { opacity: 0, x: 48, scale: 0.96, transition: { duration: 0.18 } },
};
