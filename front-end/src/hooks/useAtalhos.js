import { useEffect, useRef, useSyncExternalStore } from 'react';

/*
 * Atalhos de teclado globais da área logada.
 *
 *   Ctrl/⌘ + K   abre a busca (CommandPalette)
 *   Alt + T      alterna tema claro/escuro
 *   Alt + P      liga/desliga o modo privacidade (valores borrados)
 *
 * Todos usam modificador (WCAG 2.1.4: nada de atalho de uma tecla só) e comparam
 * `event.code`, então funcionam em qualquer layout de teclado (no Mac, Option+T gera "†").
 * Dentro de campos de texto só o Ctrl/⌘+K responde.
 */

const CHAVE_PRIVADO = 'c4_modo_privado';
const CLASSE_PRIVADO = 'privado';

function lerPrivadoSalvo() {
  try { return localStorage.getItem(CHAVE_PRIVADO) === '1'; } catch { return false; }
}

function aplicarPrivado(ligado) {
  document.documentElement.classList.toggle(CLASSE_PRIVADO, ligado);
  try { localStorage.setItem(CHAVE_PRIVADO, ligado ? '1' : '0'); } catch { /* storage bloqueado: só não lembra */ }
  ouvintesPrivado.forEach((avisar) => avisar());
}

const ouvintesPrivado = new Set();

// Restaura a preferência assim que o módulo carrega (antes do 1º render da área logada)
if (typeof document !== 'undefined' && lerPrivadoSalvo()) {
  document.documentElement.classList.add(CLASSE_PRIVADO);
}

function inscreverPrivado(avisar) {
  ouvintesPrivado.add(avisar);
  return () => ouvintesPrivado.delete(avisar);
}

const lerPrivado = () => document.documentElement.classList.contains(CLASSE_PRIVADO);

/** Alterna o modo privacidade (valores com `.valor-privado` ficam borrados). */
export function alternarModoPrivado() {
  aplicarPrivado(!lerPrivado());
}

/** Estado do modo privacidade + alternador, para botões (ex.: TopNav). */
export function useModoPrivado() {
  const ligado = useSyncExternalStore(inscreverPrivado, lerPrivado, () => false);
  return { privado: ligado, alternarPrivado: alternarModoPrivado };
}

function emCampoDeTexto(alvo) {
  if (!alvo) return false;
  const tag = alvo.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || alvo.isContentEditable;
}

/**
 * Liga os atalhos globais. Callbacks podem mudar a cada render: ficam numa ref,
 * então o listener é registrado uma única vez.
 */
export function useAtalhosGlobais({ alternarTema, abrirBusca }) {
  const acoes = useRef({ alternarTema, abrirBusca });
  useEffect(() => {
    acoes.current = { alternarTema, abrirBusca };
  });

  useEffect(() => {
    const onKey = (e) => {
      if (e.defaultPrevented || e.repeat) return;
      const mod = e.ctrlKey || e.metaKey;

      if (mod && !e.altKey && !e.shiftKey && e.code === 'KeyK') {
        e.preventDefault();
        acoes.current.abrirBusca?.();
        return;
      }

      if (!e.altKey || mod || e.shiftKey || emCampoDeTexto(e.target)) return;
      if (e.code === 'KeyT') {
        e.preventDefault();
        acoes.current.alternarTema?.();
      } else if (e.code === 'KeyP') {
        e.preventDefault();
        alternarModoPrivado();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
}

export default useAtalhosGlobais;
