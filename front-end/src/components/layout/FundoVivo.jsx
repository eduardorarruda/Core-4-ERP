import React from 'react';

/**
 * Fundo vivo do Core 4 (portado do Fluxo — Fundo.tsx): três manchas de luz que derivam
 * devagar, grão fino e os fios esmeralda dos cantos da logo. Só CSS (transform + opacity);
 * com "reduzir movimento" as manchas ficam paradas. Decorativo (aria-hidden).
 */
export default function FundoVivo() {
  return (
    <div className="c4-backdrop" aria-hidden="true">
      <span className="c4-backdrop__mancha c4-backdrop__mancha--a" />
      <span className="c4-backdrop__mancha c4-backdrop__mancha--b" />
      <span className="c4-backdrop__mancha c4-backdrop__mancha--c" />
      <span className="c4-backdrop__grao" />
      <svg className="c4-backdrop__fio -left-px -top-px" viewBox="0 0 200 200" fill="none">
        <path d="M200 0 L70 130 Q55 145 35 145 L0 145" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      <svg className="c4-backdrop__fio -right-px -bottom-px" viewBox="0 0 200 200" fill="none">
        <path d="M0 200 L130 70 Q145 55 165 55 L200 55" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}
