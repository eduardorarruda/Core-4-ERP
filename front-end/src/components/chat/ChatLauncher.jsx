import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

// O painel (assistant-ui + markdown) é pesado: só baixa quando o usuário abre a Áurea.
const ChatSidebar = lazy(() => import('./ChatSidebar'));

const FOCAVEIS = 'textarea:not([disabled]), input:not([disabled]), button:not([disabled]), a[href]';

/**
 * Botão flutuante + gaveta da Áurea. Esc fecha, o foco vai para o campo de mensagem ao
 * abrir e volta para o botão ao fechar.
 */
export default function ChatLauncher() {
  const [isOpen, setIsOpen] = useState(false);
  const { pathname } = useLocation();
  const botaoRef = useRef(null);
  const painelRef = useRef(null);

  const fechar = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('keydown', onKey);
    // O painel é carregado sob demanda: espera os campos aparecerem para focar
    const painel = painelRef.current;
    const focar = () => {
      const alvo = painel?.querySelector('textarea') ?? painel?.querySelector(FOCAVEIS);
      if (alvo) { alvo.focus(); return true; }
      return false;
    };
    let observer = null;
    if (!focar() && painel) {
      observer = new MutationObserver(() => { if (focar()) observer.disconnect(); });
      observer.observe(painel, { childList: true, subtree: true });
    }
    const botao = botaoRef.current;
    return () => {
      document.removeEventListener('keydown', onKey);
      observer?.disconnect();
      botao?.focus();
    };
  }, [isOpen]);

  // Na tela do Assistente o usuário já está conversando com a IA em tela cheia —
  // o balão flutuante seria redundante, então não o exibimos ali.
  if (pathname === '/assistente') return null;

  return (
    <>
      <button
        ref={botaoRef}
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Abrir a Áurea, assistente financeira"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title="Áurea"
        className={cn(
          'fixed right-6 z-50 w-14 h-14 bg-primary text-on-primary rounded-full items-center justify-center hover:scale-105 active:scale-95 transition-transform',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
          // No mobile a Áurea já está no slot central da barra inferior
          'hidden lg:flex',
          isOpen && 'lg:hidden'
        )}
        style={{ boxShadow: 'var(--shadow-primary)', bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        <MessageCircle className="w-6 h-6" aria-hidden="true" />
      </button>

      {isOpen && (
        <>
          <div
            aria-hidden="true"
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] lg:hidden"
            onClick={fechar}
          />
          <div
            ref={painelRef}
            role="dialog"
            aria-label="Áurea, assistente financeira"
            className={cn(
              'fixed right-0 top-0 bottom-0 z-[70] w-full sm:w-[420px]',
              'bg-surface-low border-l border-text-primary/5 shadow-2xl',
              'animate-slide-in-right'
            )}
          >
            <Suspense
              fallback={(
                <div className="h-full flex items-center justify-center text-sm text-text-primary/70" role="status">
                  Carregando a Áurea…
                </div>
              )}
            >
              <ChatSidebar onClose={fechar} />
            </Suspense>
          </div>
        </>
      )}
    </>
  );
}
