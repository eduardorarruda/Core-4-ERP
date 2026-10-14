import React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { EyeOff, Undo2 } from 'lucide-react';
import { CartaoAviso } from '../ui/Toast';
import { variantesToast } from '../motion/presets';

/** Tempo que o "Desfazer" fica disponível (pausa com o mouse em cima ou foco dentro — WCAG 2.2.1). */
const DURACAO_MS = 10000;

/**
 * Aviso com "Desfazer" depois de ignorar itens — o mesmo cartão dos toasts (`CartaoAviso`), mas com
 * estado próprio: um único aviso que soma os itens ignorados em sequência, e o envio ao servidor
 * só acontece quando ele fecha (`onFechar`). Fica acima da navegação inferior no celular.
 *
 * Props: aviso ({ id, mensagem } | null), onDesfazer(), onFechar().
 */
export default function DesfazerAviso({ aviso, onDesfazer, onFechar }) {
  return createPortal(
    <>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {aviso ? `${aviso.mensagem} Use o botão Desfazer para voltar atrás.` : ''}
      </div>
      <div className="fixed bottom-24 lg:bottom-6 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[190] pointer-events-none">
        <AnimatePresence>
          {aviso && (
            <motion.div
              key={aviso.id}
              variants={variantesToast}
              initial="inicial"
              animate="visivel"
              exit="saida"
              className="pointer-events-auto"
            >
              <CartaoAviso
                type="info"
                titulo="Itens ignorados"
                icone={EyeOff}
                message={aviso.mensagem}
                duration={DURACAO_MS}
                onFechar={onFechar}
                action={{ label: 'Desfazer', onClick: onDesfazer, icon: Undo2 }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>,
    document.body,
  );
}
