import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Troca de rota acessível (SPA): anuncia "Página X carregada" e leva o foco ao <h1> da tela
 * nova — como num carregamento de página comum. Não rouba o foco se ele continua num
 * elemento dentro do conteúdo que segue na tela (ex.: abas que trocam a rota).
 */
const ESPERA_MAX_MS = 5000;
const ESTAVEL_MS = 150;

const h1Atual = () => {
  const main = document.getElementById('main-content') ?? document.querySelector('main');
  return { main, h1: main?.querySelector('h1') ?? document.querySelector('h1') };
};

export default function AnunciadorRota() {
  const { pathname } = useLocation();
  const [mensagem, setMensagem] = useState('');
  const primeira = useRef(true);
  const ultimoH1 = useRef(null);

  useEffect(() => {
    if (primeira.current) {
      primeira.current = false;
      ultimoH1.current = h1Atual().h1;
      return undefined;
    }
    const focoAntes = document.activeElement;
    const anterior = ultimoH1.current;
    let cancelado = false;
    const inicio = Date.now();
    let candidato = null;
    let desde = 0;
    let timer = 0;

    const concluir = (main, h1) => {
      ultimoH1.current = h1;
      const titulo = (h1?.textContent || document.title.replace(/\s*\|\s*Core 4$/, '')).trim();
      setMensagem(`Página ${titulo} carregada`);
      const focoAtual = document.activeElement;
      const focoContinua = focoAtual && focoAtual !== document.body && focoAtual === focoAntes
        && focoAtual.isConnected && main?.contains(focoAtual);
      if (h1 && !focoContinua && !document.querySelector('[aria-modal="true"]')) {
        if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1');
        h1.focus({ preventScroll: true });
      }
    };

    // Espera o <h1> da tela NOVA aparecer e ficar estável (rotas carregam sob demanda e
    // a transição troca o conteúdo) — senão o foco ia para o título que está saindo.
    const tentar = () => {
      if (cancelado) return;
      const { main, h1 } = h1Atual();
      const novo = h1 && h1.isConnected && (h1 !== anterior || !anterior?.isConnected);
      if (novo && h1 === candidato && Date.now() - desde >= ESTAVEL_MS) {
        concluir(main, h1);
        return;
      }
      if (novo && h1 !== candidato) { candidato = h1; desde = Date.now(); }
      if (Date.now() - inicio > ESPERA_MAX_MS) {
        concluir(main, novo ? h1 : null);
        return;
      }
      timer = setTimeout(tentar, 50);
    };
    timer = setTimeout(tentar, 50);
    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [pathname]);

  return <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{mensagem}</div>;
}
