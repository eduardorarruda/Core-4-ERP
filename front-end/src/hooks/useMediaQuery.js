import { useEffect, useState } from 'react';

/** true enquanto a media query casar. Atualiza ao redimensionar/trocar preferência. */
export function useMediaQuery(query) {
  const [casa, setCasa] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false
  ));

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    const onChange = (e) => setCasa(e.matches);
    setCasa(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);

  return casa;
}

/** Atalho para prefers-reduced-motion: reduce. */
export function usePrefersReducedMotion() {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
