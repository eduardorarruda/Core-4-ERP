import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { EyeOff, Undo2, X } from 'lucide-react';
import Button from '../ui/Button';
import { variantesToast } from '../motion/presets';

/** Tempo que o "Desfazer" fica disponível (pausa com o mouse em cima ou foco dentro — WCAG 2.2.1). */
const DURACAO_MS = 10000;

function Aviso({ aviso, onDesfazer, onFechar }) {
  const [pausado, setPausado] = useState(false);
  const restante = useRef(DURACAO_MS);
  const inicio = useRef(0);

  useEffect(() => {
    if (pausado) return undefined;
    inicio.current = Date.now();
    const t = setTimeout(onFechar, restante.current);
    return () => {
      clearTimeout(t);
      restante.current = Math.max(0, restante.current - (Date.now() - inicio.current));
    };
  }, [pausado, onFechar]);

  return (
    <div
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
      className="flex items-center gap-2 pl-4 pr-1.5 py-1.5 rounded-2xl border border-border-strong bg-surface-low/95 backdrop-blur-xl shadow-[var(--shadow-elevated)] text-text-primary"
    >
      <EyeOff className="w-4 h-4 shrink-0 text-text-primary/70" aria-hidden="true" />
      <p className="text-sm flex-1 min-w-0">{aviso.mensagem}</p>
      <Button variant="secondary" size="sm" className="min-h-11" onClick={onDesfazer} leftIcon={<Undo2 className="w-4 h-4" aria-hidden="true" />}>
        Desfazer
      </Button>
      <Button variant="ghost" size="icon" aria-label="Fechar aviso" onClick={onFechar}>
        <X className="w-4 h-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

/**
 * Aviso com "Desfazer" depois de ignorar itens. Fica acima da navegação inferior no celular.
 * O anúncio para leitor de tela é feito por uma região viva fixa (só o texto, sem o botão).
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
              className="pointer-events-auto sm:min-w-[22rem]"
            >
              <Aviso aviso={aviso} onDesfazer={onDesfazer} onFechar={onFechar} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>,
    document.body,
  );
}
