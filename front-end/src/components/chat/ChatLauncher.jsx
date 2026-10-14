import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import AureaAvatar from './AureaAvatar';
import LimiteErroAurea from './LimiteErroAurea';
import { useMovimentoReduzido } from '../../hooks/useAcessibilidade';
import { MOLA, pressionar, variantesDrawer, variantesOverlay } from '../motion/presets';
import { cn } from '../../lib/utils';

// O painel (markdown, conversa) só baixa quando o usuário abre a Áurea.
const ChatSidebar = lazy(() => import('./ChatSidebar'));

const FOCAVEIS = 'textarea:not([disabled]), input:not([disabled]), button:not([disabled]), a[href]';

/**
 * Botão flutuante (desktop) + painel lateral da Áurea. Esc fecha, o foco vai para o campo de
 * mensagem ao abrir e volta para o botão ao fechar. No celular a Áurea fica no centro da
 * barra inferior; na própria tela /assistente o botão some (seria redundante).
 */
export default function ChatLauncher() {
  const [aberto, setAberto] = useState(false);
  const { pathname } = useLocation();
  const botaoRef = useRef(null);
  const painelRef = useRef(null);
  const reduzir = useMovimentoReduzido();

  const fechar = useCallback(() => setAberto(false), []);

  useEffect(() => {
    if (!aberto) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('keydown', onKey);
    // O painel carrega sob demanda: espera o campo de mensagem aparecer para focar
    const painel = painelRef.current;
    const focar = () => {
      const alvo = painel?.querySelector('textarea') ?? painel?.querySelector(FOCAVEIS);
      if (alvo) { alvo.focus(); return true; }
      return false;
    };
    let observer = null;
    if (!focar() && painel) {
      observer = new MutationObserver(() => { if (painel.querySelector('textarea') && focar()) observer.disconnect(); });
      observer.observe(painel, { childList: true, subtree: true });
    }
    const botao = botaoRef.current;
    return () => {
      document.removeEventListener('keydown', onKey);
      observer?.disconnect();
      botao?.focus();
    };
  }, [aberto]);

  // Ao trocar de tela pelo próprio painel (ex.: "tela cheia"), ele fecha
  const [rotaAnterior, setRotaAnterior] = useState(pathname);
  if (rotaAnterior !== pathname) {
    setRotaAnterior(pathname);
    if (aberto) setAberto(false);
  }

  if (pathname === '/assistente') return null;

  return (
    <>
      <motion.button
        ref={botaoRef}
        type="button"
        onClick={() => setAberto(true)}
        aria-label="Abrir a Áurea, assistente financeira"
        aria-expanded={aberto}
        aria-haspopup="dialog"
        inert={aberto ? true : undefined}
        initial={reduzir ? false : { opacity: 0, scale: 0.8 }}
        animate={aberto ? { opacity: 0, scale: 0.85 } : { opacity: 1, scale: 1 }}
        whileHover={reduzir || aberto ? undefined : { y: -2 }}
        whileTap={pressionar}
        transition={reduzir ? { duration: 0 } : MOLA.suave}
        className={cn(
          'fixed right-6 z-50 hidden lg:flex items-center gap-2.5 pl-1.5 pr-4 h-14 rounded-full',
          'c4-glass border border-primary/30 text-text-primary shadow-[var(--shadow-primary)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
          aberto && 'pointer-events-none',
        )}
        style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        <AureaAvatar size="md" className="rounded-full" />
        <span className="text-sm font-semibold font-display">Áurea</span>
      </motion.button>

      <AnimatePresence>
        {aberto && (
          <motion.div key="painel-aurea" initial="inicial" animate="visivel" exit="saida">
            <motion.div
              aria-hidden="true"
              variants={variantesOverlay}
              className="fixed inset-0 bg-surface-overlay backdrop-blur-sm z-[60] lg:hidden"
              onClick={fechar}
            />
            <motion.div
              ref={painelRef}
              role="dialog"
              aria-label="Áurea, assistente financeira"
              variants={reduzir ? variantesOverlay : variantesDrawer('right')}
              className="fixed right-0 top-0 bottom-0 z-[70] w-full sm:w-[440px] bg-surface-low border-l border-border-strong shadow-[var(--shadow-elevated)]"
            >
              <LimiteErroAurea onClose={fechar}>
              <Suspense
                fallback={(
                  <div className="h-full grid place-items-center text-sm text-text-primary/70" role="status">
                    Abrindo a Áurea…
                  </div>
                )}
              >
                <ChatSidebar onClose={fechar} />
              </Suspense>
              </LimiteErroAurea>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
