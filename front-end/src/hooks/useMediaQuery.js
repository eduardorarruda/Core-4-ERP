import { useCallback, useSyncExternalStore } from 'react';

const temMatchMedia = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function';

/**
 * true enquanto a media query casar. Atualiza ao redimensionar/trocar preferência.
 * `useSyncExternalStore`: lê o valor no render (sem efeito + setState, sem render extra).
 */
export function useMediaQuery(query) {
  const inscrever = useCallback((avisar) => {
    if (!temMatchMedia()) return () => {};
    const mq = window.matchMedia(query);
    mq.addEventListener('change', avisar);
    return () => mq.removeEventListener('change', avisar);
  }, [query]);

  const ler = () => (temMatchMedia() ? window.matchMedia(query).matches : false);

  return useSyncExternalStore(inscrever, ler, () => false);
}

/** Atalho para prefers-reduced-motion: reduce. */
export function usePrefersReducedMotion() {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
