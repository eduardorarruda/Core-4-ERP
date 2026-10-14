import React, { useState } from 'react';
import { SELETOR_FOCAVEIS } from '../../hooks/useFocusTrap';
import { useAcessibilidade } from '../../hooks/useAcessibilidade';

/**
 * Links "pular para…" (WCAG 2.4.1): primeiros itens do Tab em qualquer tela.
 * O alvo da navegação é o primeiro [data-navegacao-principal] visível (menu lateral no
 * desktop, barra inferior no celular). Sem navegação na tela (login), o link não aparece.
 */
const visivel = (el) => el && el.getClientRects().length > 0;
const navVisivel = () => [...document.querySelectorAll('[data-navegacao-principal]')].find(visivel);

function focar(el) {
  if (!el) return;
  if (!el.matches(SELETOR_FOCAVEIS) && !el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  el.focus();
  el.scrollIntoView?.({ block: 'nearest' });
}

export default function LinksPular() {
  const { abrirPainel } = useAcessibilidade();
  const [temNav, setTemNav] = useState(false);

  const irConteudo = (e) => {
    e.preventDefault();
    const main = document.getElementById('main-content') ?? document.querySelector('main');
    focar(main?.querySelector('h1') ?? main);
  };
  const irNavegacao = (e) => {
    e.preventDefault();
    const nav = navVisivel();
    focar(nav?.querySelector(SELETOR_FOCAVEIS) ?? nav);
  };

  return (
    <nav aria-label="Atalhos de acessibilidade" onFocus={() => setTemNav(Boolean(navVisivel()))}>
      <a href="#main-content" className="c4-pular" onClick={irConteudo}>Pular para o conteúdo</a>
      {temNav && <a href="#navegacao-principal" className="c4-pular" onClick={irNavegacao}>Pular para a navegação</a>}
      <button type="button" className="c4-pular" onClick={abrirPainel}>Abrir opções de acessibilidade</button>
    </nav>
  );
}
