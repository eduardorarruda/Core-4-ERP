import { useEffect, useRef } from 'react';

/*
 * Armadilha de foco para diálogos (Modal, Drawer, menu mobile):
 * - foco entra no painel ao abrir (initialFocusRef → 1º campo do corpo → 1º focável → painel)
 * - Tab/Shift+Tab circulam dentro do painel
 * - Esc fecha (só o diálogo do topo da pilha responde — modal sobre modal)
 * - scroll do body travado enquanto aberto
 * - ao fechar, o foco volta para quem abriu
 */

export const SELETOR_FOCAVEIS =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const pilha = [];

export function useFocusTrap(ativo, painelRef, { onClose, closeOnEsc = true, initialFocusRef, travarScroll = true } = {}) {
  // Em refs: o efeito depende só de `ativo`. Se dependesse de onClose (inline no pai, muda a
  // cada render) ele re-executaria e roubaria o foco do campo em digitação.
  const opcoes = useRef({ onClose, closeOnEsc, initialFocusRef });
  useEffect(() => {
    opcoes.current = { onClose, closeOnEsc, initialFocusRef };
  });

  useEffect(() => {
    if (!ativo) return undefined;
    const quemTinhaFoco = document.activeElement;
    const overflowAnterior = document.body.style.overflow;
    if (travarScroll) document.body.style.overflow = 'hidden';

    const painel = painelRef.current;
    const focavel = opcoes.current.initialFocusRef?.current
      ?? painel?.querySelector(`[data-modal-corpo] :is(${SELETOR_FOCAVEIS})`)
      ?? painel?.querySelector(SELETOR_FOCAVEIS);
    const marcador = {};
    pilha.push(marcador);
    (focavel || painel)?.focus({ preventScroll: true });

    const handleKey = (e) => {
      if (pilha[pilha.length - 1] !== marcador) return;
      if (e.key === 'Escape' && opcoes.current.closeOnEsc) {
        e.stopPropagation();
        opcoes.current.onClose?.();
        return;
      }
      if (e.key !== 'Tab') return;
      const focaveis = Array.from(painel?.querySelectorAll(SELETOR_FOCAVEIS) || []).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
      if (focaveis.length === 0) {
        e.preventDefault();
        painel?.focus();
        return;
      }
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      const atual = document.activeElement;
      if (e.shiftKey) {
        if (atual === primeiro || !painel?.contains(atual)) { e.preventDefault(); ultimo.focus(); }
      } else if (atual === ultimo || !painel?.contains(atual)) {
        e.preventDefault();
        primeiro.focus();
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      pilha.splice(pilha.indexOf(marcador), 1);
      if (travarScroll) document.body.style.overflow = overflowAnterior;
      quemTinhaFoco?.focus?.({ preventScroll: true });
    };
  }, [ativo, painelRef, travarScroll]);
}

export default useFocusTrap;
