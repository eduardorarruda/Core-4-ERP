import { useEffect, useRef, useState } from 'react';

export default function AnimatedKPI({ to, prefix = 'R$ ', suffix = '' }) {
  const [v, setV] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    let start;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / 1400);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(eased * to);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [to]);
  return <span>{prefix}{v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{suffix}</span>;
}
