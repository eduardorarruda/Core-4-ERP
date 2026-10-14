import React, { useId, useLayoutEffect, useMemo, useRef } from 'react';
import { AnimatePresence, LayoutGroup, animate, motion, useInView, useReducedMotion } from 'motion/react';
import { cn } from '../../lib/utils';
import { formatarNumero } from '../../lib/formatters';
import {
  EASE_OUT, MOLA, TRANSICAO_BASE,
  variantesPagina, variantesStagger, variantesSubir,
} from './presets';

/**
 * Componentes de movimento do Core 4 (motion/react). Todos respeitam
 * "reduzir movimento": com a preferência ligada, aparecem já no estado final.
 * Presets (durações, molas, variantes) ficam em ./presets.js.
 */

/** Entrada de página: fade + 8px, 220ms. Use com `key={pathname}` para reanimar por rota. */
export function PageTransition({ children, className, as = 'div' }) {
  const reduzir = useReducedMotion();
  const Comp = motion[as] ?? motion.div;
  return (
    <Comp
      className={className}
      variants={variantesPagina}
      initial={reduzir ? false : 'inicial'}
      animate="visivel"
    >
      {children}
    </Comp>
  );
}

/** Aparece com fade + leve subida. `delay` em segundos; `y` em px (0 = só fade). */
export function FadeIn({ children, className, delay = 0, y = 8, as = 'div', ...rest }) {
  const reduzir = useReducedMotion();
  const Comp = motion[as] ?? motion.div;
  return (
    <Comp
      className={className}
      initial={reduzir ? false : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...TRANSICAO_BASE, delay }}
      {...rest}
    >
      {children}
    </Comp>
  );
}

/**
 * Lista/grade com entrada escalonada (40ms entre filhos). Os filhos diretos que devem
 * animar são <StaggerItem>. `aoRolar` anima só quando entra na tela.
 */
export function Stagger({ children, className, delay = 0, aoRolar = false, as = 'div', ...rest }) {
  const reduzir = useReducedMotion();
  const Comp = motion[as] ?? motion.div;
  const gatilho = aoRolar
    ? { whileInView: 'visivel', viewport: { once: true, amount: 0.15 } }
    : { animate: 'visivel' };
  return (
    <Comp
      className={className}
      variants={variantesStagger(delay)}
      initial={reduzir ? false : 'inicial'}
      {...gatilho}
      {...rest}
    >
      {children}
    </Comp>
  );
}

export function StaggerItem({ children, className, as = 'div', ...rest }) {
  const Comp = motion[as] ?? motion.div;
  return (
    <Comp className={className} variants={variantesSubir} {...rest}>
      {children}
    </Comp>
  );
}

/** Ícone/ilustração que "brota" (escala com mola). Usado no EmptyState. */
export function Brotar({ children, className, delay = 0.05 }) {
  const reduzir = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduzir ? false : { opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...MOLA.suave, delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Conteúdo que abre/fecha com altura animada (acordeões, painéis de filtro).
 * Mantém o conteúdo fora do DOM quando fechado.
 */
export function Revelar({ aberto, children, className, id }) {
  const reduzir = useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {aberto && (
        <motion.div
          id={id}
          key="revelar"
          className={cn('overflow-hidden', className)}
          initial={reduzir ? false : { height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={reduzir ? { opacity: 0, transition: { duration: 0 } } : { height: 0, opacity: 0 }}
          transition={TRANSICAO_BASE}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Presença genérica com fade/escala — para popovers, menus e balões.
 * `origem` define o transform-origin (ex.: 'top right' para menus no canto).
 */
export function PopPresence({ aberto, children, className, origem = 'top', ...rest }) {
  const reduzir = useReducedMotion();
  return (
    <AnimatePresence>
      {aberto && (
        <motion.div
          key="pop"
          className={className}
          style={{ transformOrigin: origem }}
          initial={reduzir ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={reduzir ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -2, transition: { duration: 0.12 } }}
          transition={{ duration: 0.16, ease: EASE_OUT }}
          {...rest}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Indicador deslizante para abas/segmentos/itens de menu ativos.
 * Coloque <LayoutIndicator /> DENTRO do item ativo (position: relative) e envolva o grupo
 * em <IndicatorGroup> para que cada instância tenha o seu próprio layoutId.
 */
export function IndicatorGroup({ children, id }) {
  const gerado = useId();
  return <LayoutGroup id={id ?? gerado}>{children}</LayoutGroup>;
}

export function LayoutIndicator({ className, layoutId = 'c4-indicador', ...rest }) {
  const reduzir = useReducedMotion();
  return (
    <motion.span
      aria-hidden="true"
      layoutId={layoutId}
      className={cn('absolute inset-0 -z-[1]', className)}
      transition={reduzir ? { duration: 0 } : MOLA.firme}
      {...rest}
    />
  );
}

/**
 * Número que conta até o valor (KPIs). Formata em pt-BR via Intl.
 * Só começa a contar quando aparece na tela (useInView) — de zero na 1ª vez e do valor
 * anterior quando muda (trocar o período anima a diferença). Portado do Fluxo (Valor.tsx).
 *
 * Props:
 * - value: número
 * - format: 'currency' | 'percent' (recebe 12.5 → 12,5%) | 'number' | 'compact' | (n) => string
 * - decimals: casas decimais (padrão do formato)
 * - duration: segundos (0.9)
 * - colorir: true → verde se > 0, vermelho se < 0 (tokens income/expense)
 * - privado: aplica `valor-privado` (borrado no modo privacidade, Alt+P). Padrão true.
 *
 * Leitores de tela recebem só o valor final (o texto animado é aria-hidden).
 */
export function AnimatedNumber({
  value,
  format = 'currency',
  decimals,
  duration = 0.9,
  className,
  colorir = false,
  privado = true,
}) {
  const reduzir = useReducedMotion();
  const raizRef = useRef(null);
  const spanRef = useRef(null);
  const atual = useRef(null);
  const visivel = useInView(raizRef, { once: true, margin: '-40px' });
  const formatar = useMemo(
    () => (typeof format === 'function' ? format : (n) => formatarNumero(n, format, { casas: decimals })),
    [format, decimals],
  );
  const alvo = Number(value) || 0;

  useLayoutEffect(() => {
    const el = spanRef.current;
    if (!el) return undefined;
    const de = atual.current ?? 0;
    if (reduzir || de === alvo) {
      el.textContent = formatar(alvo);
      atual.current = alvo;
      return undefined;
    }
    el.textContent = formatar(de);
    if (!visivel) return undefined;
    const controles = animate(de, alvo, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        atual.current = v;
        el.textContent = formatar(v);
      },
      onComplete: () => { atual.current = alvo; },
    });
    return () => controles.stop();
  }, [alvo, reduzir, formatar, duration, visivel]);

  return (
    <span
      ref={raizRef}
      className={cn(
        'tabular-nums',
        privado && 'valor-privado',
        colorir && alvo > 0 && 'text-income',
        colorir && alvo < 0 && 'text-expense',
        className,
      )}
    >
      <span ref={spanRef} aria-hidden="true" />
      <span className="sr-only">{formatar(alvo)}</span>
    </span>
  );
}
