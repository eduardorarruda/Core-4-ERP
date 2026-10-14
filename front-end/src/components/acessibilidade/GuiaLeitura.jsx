import React, { useEffect, useRef } from 'react';

/**
 * Guia de leitura: faixa horizontal que acompanha o ponteiro (ou o elemento com foco, no
 * teclado) e escurece o resto da tela. Puramente visual (aria-hidden, sem eventos de clique).
 */
const ALTURA_REM = 3;

export default function GuiaLeitura() {
  const cima = useRef(null);
  const baixo = useRef(null);
  const faixa = useRef(null);

  useEffect(() => {
    let quadro = 0;
    let y = window.innerHeight / 2;
    const desenhar = () => {
      quadro = 0;
      const meia = (ALTURA_REM * parseFloat(getComputedStyle(document.documentElement).fontSize)) / 2;
      const topo = Math.max(0, y - meia);
      if (cima.current) cima.current.style.cssText = `top:0;height:${topo}px`;
      if (faixa.current) faixa.current.style.cssText = `top:${topo}px;height:${meia * 2}px`;
      if (baixo.current) baixo.current.style.cssText = `top:${y + meia}px;bottom:0`;
    };
    const mover = (novoY) => {
      y = novoY;
      if (!quadro) quadro = requestAnimationFrame(desenhar);
    };
    const onPointer = (e) => mover(e.clientY);
    const onFocus = (e) => {
      const r = e.target?.getBoundingClientRect?.();
      if (r && r.height) mover(r.top + r.height / 2);
    };
    window.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('focusin', onFocus);
    desenhar();
    return () => {
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('focusin', onFocus);
      cancelAnimationFrame(quadro);
    };
  }, []);

  return (
    <div aria-hidden="true">
      <div ref={cima} className="c4-guia-leitura" />
      <div ref={faixa} className="c4-guia-leitura__faixa" />
      <div ref={baixo} className="c4-guia-leitura" />
    </div>
  );
}
